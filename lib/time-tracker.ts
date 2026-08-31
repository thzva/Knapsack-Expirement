// Time tracking utility for questions and sections
type InteractionRecord = {
  type: string
  timestamp: Date
  sectionName: string | null
  questionId: number | null
  data?: any
}

export class TimeTracker {
  private startTime: Date | null = null
  private endTime: Date | null = null
  private participantId: string | null = null
  private sectionName: string | null = null
  private questionId: number | null = null
  private interactions: Array<{ type: string, timestamp: Date, data?: any }> = []
  // Session-wide buffer — survives startQuestion/reset so phase-end handlers can
  // ship the full click history with the ingest-phase payload (no per-click HTTP calls).
  private allInteractions: InteractionRecord[] = []

  constructor(participantId?: string) {
    // Prefer sessionStorage (used by Prolific/auth flow), then localStorage
    if (typeof window !== 'undefined') {
      this.participantId = participantId
        || sessionStorage.getItem('participantId')
        || localStorage.getItem('participantId')
    } else {
      this.participantId = participantId || null
    }
  }

  // Start timing for a section
  startSection(sectionName: string) {
    this.sectionName = sectionName
    this.questionId = null
    this.startTime = new Date()
    this.endTime = null
    this.interactions = []

    console.log(`[TimeTracker] Started section: ${sectionName}`)

    // Log section start to backend
    this.logTimeData({
      sectionName,
      timeData: {
        startTime: this.startTime.toISOString()
      }
    })
  }

  // Start timing for a specific question
  startQuestion(questionId: number, sectionName?: string) {
    if (sectionName) this.sectionName = sectionName
    this.questionId = questionId
    this.startTime = new Date()
    this.endTime = null
    this.interactions = []

    console.log(`[TimeTracker] Started question ${questionId} in section ${this.sectionName}`)
  }

  // End timing and log to backend
  endQuestion() {
    if (!this.startTime || !this.questionId || !this.sectionName) {
      console.warn('[TimeTracker] Cannot end question - missing start time, question ID, or section')
      return
    }

    this.endTime = new Date()
    const timeSpent = this.endTime.getTime() - this.startTime.getTime()

    console.log(`[TimeTracker] Question ${this.questionId} completed in ${timeSpent}ms`)

    // Log question time to backend
    this.logTimeData({
      sectionName: this.sectionName,
      questionId: this.questionId,
      timeData: {
        startTime: this.startTime.toISOString(),
        endTime: this.endTime.toISOString(),
        timeSpent
      }
    })
  }

  // End section timing
  endSection() {
    if (!this.startTime || !this.sectionName) {
      console.warn('[TimeTracker] Cannot end section - missing start time or section name')
      return
    }

    this.endTime = new Date()
    const timeSpent = this.endTime.getTime() - this.startTime.getTime()

    console.log(`[TimeTracker] Section ${this.sectionName} completed in ${timeSpent}ms`)

    // Log section completion to backend
    this.logTimeData({
      sectionName: this.sectionName,
      timeData: {
        endTime: this.endTime.toISOString(),
        timeSpent
      }
    })
  }

  // Log interaction (answer change, focus, blur, etc.)
  logInteraction(type: string, data?: any) {
    const ts = new Date()
    const interaction = { type, timestamp: ts, data }

    this.interactions.push(interaction)
    this.allInteractions.push({
      type,
      timestamp: ts,
      sectionName: this.sectionName,
      questionId: this.questionId,
      data
    })

    // If we're tracking a question, log the interaction
    if (this.questionId && this.sectionName) {
      this.logTimeData({
        sectionName: this.sectionName,
        questionId: this.questionId,
        interactionType: type,
        timeData: {
          interactionData: data
        }
      })
    }
  }

  // Private method to send time data to backend
  // NOTE: We intentionally do NOT fire a network request per interaction.
  // That would fire hundreds of requests per session (one per ball toggle),
  // causing CORS errors and server overload on Render's free tier.
  // Time tracking data is bundled into the ingest-phase payload at phase completion instead.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private logTimeData(_payload: {
    sectionName?: string
    questionId?: number
    timeData: any
    interactionType?: string
  }) {
    // intentional no-op
  }

  // Snapshot of all interactions logged this session.
  // Phase completion handlers should pass this along in the ingest-phase payload.
  getAllInteractions(): InteractionRecord[] {
    return this.allInteractions.slice()
  }

  // Drop interactions for a specific section after they've been shipped to backend,
  // so re-uploading later phases doesn't ship duplicates.
  clearInteractionsForSection(sectionName: string) {
    this.allInteractions = this.allInteractions.filter(i => i.sectionName !== sectionName)
  }

  // Get current timing info
  getCurrentTime() {
    if (!this.startTime) return null

    const now = new Date()
    return {
      startTime: this.startTime,
      currentTime: now,
      elapsed: now.getTime() - this.startTime.getTime(),
      sectionName: this.sectionName,
      questionId: this.questionId,
      interactionCount: this.interactions.length
    }
  }

  // Reset per-question state. Does NOT clear the session-wide allInteractions
  // buffer (call clearInteractionsForSection or recreate the tracker for that).
  reset() {
    this.startTime = null
    this.endTime = null
    this.sectionName = null
    this.questionId = null
    this.interactions = []
  }
}

// Global time tracker instance
export const timeTracker = new TimeTracker()

// Hook for React components
export const useTimeTracker = () => {
  return timeTracker
}
