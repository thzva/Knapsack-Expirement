"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Trophy, Gift, Sparkles, Target, BrainCircuit, Activity, AlertTriangle, Loader2, RefreshCw } from "lucide-react"
import { flushPendingPhases, listPendingPhases } from "@/lib/phase-uploader"

interface ResultsPhaseProps {
  onNext?: () => void
  participantData: any
  updateParticipantData: (data: any) => void
}

export default function ResultsPhase({ onNext, participantData }: ResultsPhaseProps) {
  const [isCompleting, setIsCompleting] = useState(false)
  const [finished, setFinished] = useState(false)
  // Pending-phase replay state. Keeps the user from clicking "Complete" until
  // every phase that failed to upload during the test has been retried at
  // least once on this screen.
  const [pendingReplay, setPendingReplay] = useState<{ status: 'checking' | 'replaying' | 'done' | 'still-failing'; phases: string[] }>({ status: 'checking', phases: [] })

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const pid = typeof window !== 'undefined' ? (sessionStorage.getItem('participantId') || localStorage.getItem('participantId')) : null
      if (!pid) { if (!cancelled) setPendingReplay({ status: 'done', phases: [] }); return }
      const initial = listPendingPhases(pid)
      if (initial.length === 0) { if (!cancelled) setPendingReplay({ status: 'done', phases: [] }); return }
      if (!cancelled) setPendingReplay({ status: 'replaying', phases: initial })
      const stillPending = await flushPendingPhases(pid)
      if (cancelled) return
      setPendingReplay({
        status: stillPending.length === 0 ? 'done' : 'still-failing',
        phases: stillPending
      })
    })()
    return () => { cancelled = true }
  }, [])

  const retryFlush = async () => {
    const pid = sessionStorage.getItem('participantId') || localStorage.getItem('participantId')
    if (!pid) return
    setPendingReplay({ status: 'replaying', phases: pendingReplay.phases })
    const stillPending = await flushPendingPhases(pid)
    setPendingReplay({
      status: stillPending.length === 0 ? 'done' : 'still-failing',
      phases: stillPending
    })
  }

  // Calculate scores
  const training2 = participantData.training2 || { totalPoints: 0, maxPoints: 20 }
  const benchmark = participantData.benchmark || { totalPoints: 0, maxPoints: 60 }
  const prediction = participantData.prediction || participantData.final || { totalPoints: 0, maxPoints: 60 }

  const test1Points = training2.totalPoints || 0
  const test2Points = benchmark.totalPoints || 0
  const test3Points = prediction.totalPoints || 0
  
  const totalEarnedPoints = test1Points + test2Points + test3Points
  const totalPossiblePoints = training2.maxPoints + benchmark.maxPoints + prediction.maxPoints

  const completeProlificStudy = async () => {
    setIsCompleting(true)

    // One last replay attempt right before finalize, to catch network blips
    // that happened between mount and the user clicking "Complete".
    const pid = sessionStorage.getItem('participantId') || localStorage.getItem('participantId')
    if (pid) {
      const stillPending = await flushPendingPhases(pid)
      if (stillPending.length > 0) {
        setPendingReplay({ status: 'still-failing', phases: stillPending })
        setIsCompleting(false)
        return  // Block finalize so we don't silently commit incomplete data
      }
    }

    try {
      const participantId = sessionStorage.getItem('participantId')
      const prolificPid = sessionStorage.getItem('prolificPid')
      
      if (participantId && prolificPid) {
        const API_BASE = process.env.NEXT_PUBLIC_API_BASE || (window.location.origin + '/colab/api/knapsack-exp')

        for (let attempt = 1; attempt <= 3; attempt++) {
          try {
            const controller = new AbortController()
            const timeoutId = setTimeout(() => controller.abort(), 15000)
            
            const res = await fetch(`${API_BASE}/api/v1/complete-participant`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json"
              },
              body: JSON.stringify({
                participantId,
                prolificPid,
                completedAt: new Date().toISOString()
              }),
              signal: controller.signal
            })
            
            clearTimeout(timeoutId)
            if (res.ok) break
          } catch (e) {
            if (attempt < 3) await new Promise(r => setTimeout(r, 2000))
          }
        }
      }
    } catch (error) {
      console.error("[Completion] Failed to log outcome:", error)
    } finally {
      sessionStorage.removeItem('participantId')
      sessionStorage.removeItem('prolificPid')
      setIsCompleting(false)
      setFinished(true)
    }
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <Card className="text-center shadow-lg bg-gray-50">
        <CardHeader>
          <div className="mx-auto w-20 h-20 bg-blue-700 rounded-full flex items-center justify-center mb-4">
            <Trophy className="h-10 w-10 text-white" />
          </div>
          <CardTitle className="text-3xl font-bold text-gray-900">Experiment Complete</CardTitle>
          <p className="text-lg text-gray-600 mt-2">Thank you for participating in the Knapsack Challenge</p>
        </CardHeader>
      </Card>

      {/* Performance Summary */}
      <Card className="shadow-lg border-t-4 border-t-blue-500">
        <CardHeader className="bg-blue-50 border-b border-blue-100 pb-4">
          <CardTitle className="flex items-center text-2xl text-blue-900">
            <Activity className="h-7 w-7 mr-3 text-blue-600" />
            Your Performance Summary
          </CardTitle>
        </CardHeader>

        <CardContent className="pt-6">
          <div className="grid md:grid-cols-3 gap-6 mb-8">
            <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm transition-all hover:shadow-md">
              <div className="flex items-center space-x-3 mb-4">
                <div className="p-3 bg-orange-100 rounded-lg">
                  <Target className="h-6 w-6 text-orange-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900">Test 1</h3>
              </div>
              <div className="flex items-end justify-between">
                <div>
                  <span className="text-4xl font-bold text-gray-900">{test1Points}</span>
                  <span className="text-gray-500 font-medium ml-1">/ {training2.maxPoints} pts</span>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm transition-all hover:shadow-md">
              <div className="flex items-center space-x-3 mb-4">
                <div className="p-3 bg-purple-100 rounded-lg">
                  <BrainCircuit className="h-6 w-6 text-purple-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900">Test 2</h3>
              </div>
              <div className="flex items-end justify-between">
                <div>
                  <span className="text-4xl font-bold text-gray-900">{test2Points}</span>
                  <span className="text-gray-500 font-medium ml-1">/ {benchmark.maxPoints} pts</span>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm transition-all hover:shadow-md">
              <div className="flex items-center space-x-3 mb-4">
                <div className="p-3 bg-red-100 rounded-lg">
                  <Sparkles className="h-6 w-6 text-red-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900">Test 3</h3>
              </div>
              <div className="flex items-end justify-between">
                <div>
                  <span className="text-4xl font-bold text-gray-900">{test3Points}</span>
                  <span className="text-gray-500 font-medium ml-1">/ {prediction.maxPoints} pts</span>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-blue-700 rounded-2xl p-8 text-white shadow-lg text-center">
            <h3 className="text-xl font-medium text-blue-100 mb-2">Total Points Earned</h3>
            <div className="text-6xl font-black tabular-nums tracking-tight">
              {totalEarnedPoints} <span className="text-3xl text-blue-200 font-medium">/ {totalPossiblePoints}</span>
            </div>
            <p className="mt-4 text-blue-100 max-w-2xl mx-auto">
              This score evaluates your ability to make optimal tradeoffs and maximize rewards within the given capacity constraint across all phases of the study.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Pending-upload banners — surface upload state instead of letting it silently 0/60 */}
      {pendingReplay.status === 'replaying' && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-center gap-3 text-blue-800">
          <Loader2 className="w-5 h-5 animate-spin" />
          <div>
            <div className="font-semibold">Saving your results to our servers…</div>
            <div className="text-sm">Phases pending: {pendingReplay.phases.join(', ')}. Please don't close this tab.</div>
          </div>
        </div>
      )}
      {pendingReplay.status === 'still-failing' && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3 text-amber-900">
          <AlertTriangle className="w-5 h-5 mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <div className="font-semibold">Some test data hasn't reached our server yet</div>
            <div className="text-sm mt-1">Phases still pending: <strong>{pendingReplay.phases.join(', ')}</strong>. Your answers are saved locally — please retry, or refresh this page if the problem persists.</div>
            <Button onClick={retryFlush} size="sm" variant="outline" className="mt-3 gap-2 border-amber-400 text-amber-900 hover:bg-amber-100">
              <RefreshCw className="w-4 h-4" /> Retry upload
            </Button>
          </div>
        </div>
      )}

      {/* Complete Study Section */}
      <div className="text-center pt-8 border-t border-gray-200">
        {finished ? (
          <div className="max-w-lg mx-auto bg-emerald-50 border-2 border-emerald-200 rounded-2xl p-6">
            <div className="flex items-center justify-center gap-2 text-emerald-700 text-xl font-bold mb-2">
              <Sparkles className="h-6 w-6" /> All done!
            </div>
            <p className="text-emerald-800">
              Your results have been saved. Thank you for participating — you may now close this page.
            </p>
          </div>
        ) : (
          <>
            <Button
              onClick={completeProlificStudy}
              disabled={isCompleting || pendingReplay.status === 'replaying' || pendingReplay.status === 'still-failing'}
              size="lg"
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-5 rounded-2xl font-bold shadow-xl text-xl w-full max-w-lg transform hover:scale-[1.02] transition-all disabled:opacity-50"
            >
              {isCompleting ? "Saving results..."
                : pendingReplay.status === 'replaying' ? "Uploading pending data…"
                : pendingReplay.status === 'still-failing' ? "Resolve pending uploads to continue"
                : "Complete Experiment"}
            </Button>
            <p className="text-sm text-gray-500 mt-4">
              Clicking this will save your results and finish the experiment.
            </p>
          </>
        )}
      </div>
    </div>
  )
}

