/**
 * Reliable phase upload helper.
 *
 * Replaces the ad-hoc `fetch + AbortController + try/catch` pattern that lived
 * (slightly differently) in every phase file. Three guarantees:
 *
 *  1. **localStorage durability**: every phase payload is staged to localStorage
 *     BEFORE the upload attempt. If the upload fails (network, proxy 504, tab
 *     freeze), the payload survives a refresh and can be replayed.
 *
 *  2. **Retry with exponential backoff**: a single tryUpload call tries up to
 *     `maxAttempts` times (default 4) with 1s / 2s / 4s / 8s delays between
 *     attempts. Each attempt has its own AbortController + timeout.
 *
 *  3. **flushPending replay**: before /complete-participant fires, the results
 *     screen calls `flushPendingPhases(participantId)` which re-attempts every
 *     phase still in localStorage for that participant. Anything that still
 *     can't upload is reported back so the UI can warn the student instead of
 *     silently committing 0-score phases.
 */

export type PhaseName = 'practice' | 'skill' | 'benchmark' | 'strategy' | 'final'

export interface PhasePayload {
  participantId: string
  phase: PhaseName
  data: any
}

export interface UploadResult {
  success: boolean
  status?: number
  error?: string
  attempts: number
}

export interface UploadOptions {
  maxAttempts?: number
  perAttemptTimeoutMs?: number
}

interface PendingRecord {
  key: string  // `${participantId}:${phase}`
  participantId: string
  phase: PhaseName
  payload: PhasePayload
  firstFailedAt: number
  attempts: number
}

const STORAGE_KEY = 'knapsack:pending-phases'

function getApiBase(): string {
  if (typeof window === 'undefined') return ''
  return process.env.NEXT_PUBLIC_API_BASE || (window.location.origin + '/colab/api/knapsack-exp')
}

function readPending(): PendingRecord[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function writePending(list: PendingRecord[]) {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(list))
  } catch (e) {
    // QuotaExceeded etc — the upload still gets attempted; just no durability
    console.warn('[uploader] failed to persist pending phases:', e)
  }
}

function upsertPending(rec: PendingRecord) {
  const list = readPending().filter(p => p.key !== rec.key)
  list.push(rec)
  writePending(list)
}

function removePending(_participantId: string, phase: PhaseName) {
  // Clear ALL entries for this phase regardless of participantId.
  //
  // Rationale: if an earlier abandoned session left a stale pending entry for
  // "final" with an old participantId, and the user comes back, redoes the
  // test, and successfully uploads "final" with a NEW participantId, the old
  // entry would otherwise sit forever in localStorage. The results-phase warning
  // never disappears even though the server has the data — exactly Britt
  // Stevens' case (2026-05-03). One success = phase is done; cleanup all stale
  // entries for that phase. Same browser ⇒ same student, so this is safe.
  const list = readPending().filter(p => p.phase !== phase)
  writePending(list)
}

/**
 * Single upload attempt with abortable timeout.
 */
async function attemptOnce(payload: PhasePayload, timeoutMs: number): Promise<{ ok: boolean; status?: number; error?: string }> {
  const controller = new AbortController()
  const tid = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const res = await fetch(`${getApiBase()}/api/v1/ingest-phase`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal
    })
    clearTimeout(tid)
    if (!res.ok) {
      let body = ''
      try { body = (await res.text()).slice(0, 200) } catch {}
      return { ok: false, status: res.status, error: `HTTP ${res.status} ${body}` }
    }
    return { ok: true, status: res.status }
  } catch (err: any) {
    clearTimeout(tid)
    return { ok: false, error: err?.name === 'AbortError' ? 'timeout' : String(err?.message || err) }
  }
}

/**
 * Try uploading a phase with retry + backoff.
 * Stages the payload to localStorage first; clears it on success.
 *
 * Always returns — never throws.
 */
export async function uploadPhase(payload: PhasePayload, opts: UploadOptions = {}): Promise<UploadResult> {
  const maxAttempts = opts.maxAttempts ?? 4
  const timeoutMs = opts.perAttemptTimeoutMs ?? 30000
  const key = `${payload.participantId}:${payload.phase}`

  // Stage first so a tab close mid-upload doesn't lose data
  upsertPending({
    key,
    participantId: payload.participantId,
    phase: payload.phase,
    payload,
    firstFailedAt: Date.now(),
    attempts: 0
  })

  let attempts = 0
  let lastErr: string | undefined
  let lastStatus: number | undefined

  for (let i = 0; i < maxAttempts; i++) {
    attempts++
    const r = await attemptOnce(payload, timeoutMs)
    if (r.ok) {
      removePending(payload.participantId, payload.phase)
      return { success: true, attempts, status: r.status }
    }
    lastErr = r.error
    lastStatus = r.status
    if (i < maxAttempts - 1) {
      const delay = Math.min(1000 * Math.pow(2, i), 10000)  // 1s, 2s, 4s, 8s, capped at 10s
      await new Promise(r => setTimeout(r, delay))
    }
  }

  // Update attempts count on the persisted record (still pending)
  const list = readPending()
  const existing = list.find(p => p.key === key)
  if (existing) {
    existing.attempts += attempts
    writePending(list)
  }
  return { success: false, attempts, status: lastStatus, error: lastErr || 'unknown' }
}

/**
 * Replay every pending phase for this participant.
 *
 * Step 1: ask the server which phases it already has. Anything the server
 * already received gets cleared from localStorage immediately (no need to
 * re-upload — the data is safe). This is what dismisses false-positive
 * "still pending" warnings caused by stale localStorage from earlier sessions.
 *
 * Step 2: re-upload anything still genuinely pending.
 *
 * Returns the list of phases STILL pending after both steps.
 */
export async function flushPendingPhases(participantId: string, opts: UploadOptions = {}): Promise<PhaseName[]> {
  const pending = readPending().filter(p => p.participantId === participantId)
  if (pending.length === 0) return []

  // Step 1 — reconcile against server. Use the prolificPid (email) we cached
  // during registration. If unavailable, skip reconciliation and go straight to retry.
  const prolificPid = (typeof window !== 'undefined') ? sessionStorage.getItem('prolificPid') : null
  if (prolificPid) {
    try {
      const res = await fetch(`${getApiBase()}/api/v1/check-participant/${encodeURIComponent(prolificPid)}`)
      if (res.ok) {
        const status = await res.json()
        const completedPhases = Number(status.completedPhases || 0)
        // completedPhases counts (in order): practice, skill, benchmark, strategy, final
        const phaseOrder: PhaseName[] = ['practice', 'skill', 'benchmark', 'strategy', 'final']
        const serverHas = new Set(phaseOrder.slice(0, completedPhases))
        for (const rec of pending) {
          if (serverHas.has(rec.phase)) {
            // Server already has it → just clear localStorage, no upload needed.
            removePending(participantId, rec.phase)
          }
        }
      }
    } catch (_) {
      // Best-effort; if the check call fails, fall through to re-upload below.
    }
  }

  // Step 2 — actually re-upload anything still pending after reconciliation.
  const stillPending = readPending().filter(p => p.participantId === participantId)
  for (const rec of stillPending) {
    const r = await attemptOnce(rec.payload, opts.perAttemptTimeoutMs ?? 30000)
    if (r.ok) {
      removePending(participantId, rec.phase)
    }
  }

  return readPending().filter(p => p.participantId === participantId).map(p => p.phase)
}

/** Inspect what's still pending without attempting upload. */
export function listPendingPhases(participantId: string): PhaseName[] {
  return readPending().filter(p => p.participantId === participantId).map(p => p.phase)
}

/** Clear all pending uploads for a participant — only for admin/debug use. */
export function clearPendingPhases(participantId: string) {
  writePending(readPending().filter(p => p.participantId !== participantId))
}
