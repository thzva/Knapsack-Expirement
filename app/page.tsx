"use client"

import { useEffect, useState, useMemo, useCallback, Suspense, lazy } from "react"
import { Progress } from "@/components/ui/progress"
import { Gift, Trophy, Clock, Target, Brain } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { api } from "@/lib/api-client"

// Lazy load phase components for code splitting
const IntroPhase = lazy(() => import("@/components/phases/intro-phase"))
const TutorialPhase = lazy(() => import("@/components/phases/tutorial-phase"))
const TrainingPhase1 = lazy(() => import("@/components/phases/training-phase-1"))
const TrainingPhase2 = lazy(() => import("@/components/phases/training-phase-2"))
const BenchmarkPhase = lazy(() => import("@/components/phases/benchmark-phase"))
const StrategyPhase = lazy(() => import("@/components/phases/strategy-phase"))
const PredictionPhase = lazy(() => import("@/components/phases/prediction-phase"))
const ResultsPhase = lazy(() => import("@/components/phases/results-phase"))

// Loading component for lazy loaded phases
const PhaseLoader = () => (
  <div className="flex items-center justify-center min-h-[400px]">
    <div className="text-center">
      <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-r-transparent mb-4"></div>
      <p className="text-gray-600">Loading...</p>
    </div>
  </div>
)

const phases = [
  { id: "intro", name: "Welcome", icon: Gift, color: "bg-blue-500" },
  { id: "tutorial", name: "Tutorial", icon: Brain, color: "bg-green-500" },
  { id: "training1", name: "Practice", icon: Target, color: "bg-yellow-500" },
  { id: "training2", name: "Skills Test", icon: Clock, color: "bg-orange-500" },
  { id: "benchmark", name: "Benchmark", icon: Trophy, color: "bg-purple-500" },
  { id: "strategy", name: "Strategy", icon: Brain, color: "bg-indigo-500" },
  { id: "prediction", name: "Final Test", icon: Target, color: "bg-red-500" },
  { id: "results", name: "Results", icon: Gift, color: "bg-emerald-500" },
]

export default function KnapsackExperiment() {
  const [currentPhase, setCurrentPhase] = useState("intro")
  const [participantId, setParticipantId] = useState<string | null>(null)
  const [participantData, setParticipantData] = useState({
    totalScore: 0,
    completedPhases: [],
    performance: {},
    benchmark: null,
  })
  const [prolificParams, setProlificParams] = useState<{
    prolificPid: string | null;
    studyId: string | null;
    sessionId: string | null;
  }>({
    prolificPid: null,
    studyId: null,
    sessionId: null,
  })
  const [accessAllowed, setAccessAllowed] = useState(false)
  const [showCompletedMessage, setShowCompletedMessage] = useState(false)
  const [isCheckingAccess, setIsCheckingAccess] = useState(true)

  useEffect(() => {
    let cancelled = false

    // Check for Prolific parameters - REQUIRED for access
    const urlParams = new URLSearchParams(window.location.search)
    const prolificPid = urlParams.get('PROLIFIC_PID')
    const studyId = urlParams.get('STUDY_ID') 
    const sessionId = urlParams.get('SESSION_ID')
    
    // DEBUG: Log parameters to help troubleshoot
    console.log('[Access Check] Prolific Parameters:', {
      prolificPid,
      studyId,
      sessionId,
      fullURL: window.location.href,
      searchParams: window.location.search
    })
    
    // Set Prolific parameters
    setProlificParams({
      prolificPid,
      studyId, 
      sessionId,
    })

    // TEMPORARILY DISABLED FOR TESTING: Access restriction removed
    // TODO: Re-enable before production launch
    /*
    // SECURITY: Only allow access with valid Prolific parameters
    // Check if parameters are template variables (not replaced by Prolific)
    const hasTemplateVariables = prolificPid?.includes('{{') || studyId?.includes('{{') || sessionId?.includes('{{')
    
    if (!prolificPid || !studyId || !sessionId || hasTemplateVariables) {
      console.error('[Access Denied] Invalid or missing parameters:', {
        hasTemplateVariables,
        prolificPid: prolificPid || 'MISSING',
        studyId: studyId || 'MISSING',
        sessionId: sessionId || 'MISSING'
      })
      setAccessAllowed(false)
      setIsCheckingAccess(false)
      return
    }
    */
    
    // TEST MODE: Allow access without Prolific parameters
    console.log('[TEST MODE] Access allowed for everyone')
    
    // If no Prolific params, create a test participant
    if (!prolificPid || !studyId || !sessionId) {
      console.log('[TEST MODE] No Prolific params, registering test participant with backend')
      // Register with backend to get a valid participantId
      api.register()
        .then((data) => {
          if (cancelled) return
          const id = data.participantId
          console.log('[TEST MODE] Test participant registered:', id)
          setParticipantId(id)
          localStorage.setItem('participantId', id)
          localStorage.setItem('prolificPid', `test-${id}`)
          setAccessAllowed(true)
          setIsCheckingAccess(false)
        })
        .catch((error) => {
          if (cancelled) return
          console.error('[TEST MODE] Failed to register test participant:', error)
          // Fallback: create local ID but warn user
          const testId = window.crypto.randomUUID()
          setParticipantId(testId)
          localStorage.setItem('participantId', testId)
          localStorage.setItem('prolificPid', `test-${testId}`)
          setAccessAllowed(true)
          setIsCheckingAccess(false)
          console.warn('[TEST MODE] Using local participant ID - backend registration failed')
        })
      return
    }
    
    console.log('[Access Check] Parameters valid, proceeding with registration...')

    // TEMPORARILY DISABLED FOR TESTING: Always verify with backend first to prevent duplicate participants
    // TODO: Re-enable before production launch
    // Check participant status (with caching)
    api.checkParticipant(prolificPid)
      .then((participantStatus) => {
        if (cancelled) return

        // TEST MODE: Allow re-entry even if completed
        /*
        if (participantStatus.exists && participantStatus.completed) {
          // Clear localStorage if participant completed
          localStorage.removeItem('participantId')
          localStorage.removeItem('prolificPid')
          setAccessAllowed(false)
          setShowCompletedMessage(true)
          setIsCheckingAccess(false)
          return
        }
        */

        if (participantStatus.exists && !participantStatus.completed && participantStatus.participantId) {
          // Use backend's participantId (always authoritative)
          const backendParticipantId = participantStatus.participantId
          
          // Check if cached participantId matches backend
          const cachedParticipantId = localStorage.getItem('participantId')
          if (cachedParticipantId !== backendParticipantId) {
            // Mismatch: clear cache and use backend's ID
            console.warn(`[Participant Mismatch] Cached: ${cachedParticipantId}, Backend: ${backendParticipantId}. Using backend ID.`)
            localStorage.removeItem('participantId')
            localStorage.removeItem('prolificPid')
          }
          
          setParticipantId(backendParticipantId)
          localStorage.setItem('participantId', backendParticipantId)
          localStorage.setItem('prolificPid', prolificPid)
          setAccessAllowed(true)
          setIsCheckingAccess(false)
          return
        }

        // Register new participant if doesn't exist
        if (!participantStatus.exists && studyId && sessionId) {
          return api.registerProlific(prolificPid, studyId, sessionId)
            .then((data) => {
              if (cancelled) return
              const id = data.participantId
              
              // Clear any old cached data before setting new
              localStorage.removeItem('participantId')
              localStorage.removeItem('prolificPid')
              
              setParticipantId(id)
              localStorage.setItem('participantId', id)
              localStorage.setItem('prolificPid', prolificPid)
              setAccessAllowed(true)
              setIsCheckingAccess(false)
            })
            .catch((registerError: any) => {
              if (cancelled) return
              console.error('[Registration Error]', registerError)
              
              // If registration fails, try checking again (might have been created by another request)
              return api.checkParticipant(prolificPid)
                .then((retryStatus) => {
                  if (cancelled) return
                  if (retryStatus.exists && retryStatus.participantId) {
                    setParticipantId(retryStatus.participantId)
                    localStorage.setItem('participantId', retryStatus.participantId)
                    localStorage.setItem('prolificPid', prolificPid)
                    setAccessAllowed(true)
                    setIsCheckingAccess(false)
                  } else {
                    setAccessAllowed(false)
                    setIsCheckingAccess(false)
                  }
                })
            })
        }

        setAccessAllowed(false)
        setIsCheckingAccess(false)
      })
      .catch((error) => {
        if (cancelled) return
        
        console.error('[Check Participant Error]', error)
        
        if (error.message?.includes('already completed')) {
          setShowCompletedMessage(true)
        }
        setAccessAllowed(false)
        setIsCheckingAccess(false)
      })

    return () => {
      cancelled = true
    }
  }, [])
  

  // Memoize expensive calculations
  const currentPhaseIndex = useMemo(
    () => phases.findIndex((p) => p.id === currentPhase),
    [currentPhase]
  )
  
  const progress = useMemo(
    () => ((currentPhaseIndex + 1) / phases.length) * 100,
    [currentPhaseIndex]
  )

  const nextPhase = useCallback(() => {
    const nextIndex = currentPhaseIndex + 1
    if (nextIndex < phases.length) {
      setCurrentPhase(phases[nextIndex].id)
    }
  }, [currentPhaseIndex])

  const completeProlificStudy = useCallback(async () => {
    if (prolificParams.prolificPid && participantId) {
      try {
        await api.post('/api/v1/complete-participant', {
          participantId,
          prolificPid: prolificParams.prolificPid,
          completedAt: new Date().toISOString()
        })
      } catch (error) {
        console.error("[Completion] Failed to mark participant as completed:", error)
      }
      
      localStorage.removeItem('participantId')
      localStorage.removeItem('prolificPid')
      
      window.location.href = `https://app.prolific.co/submissions/complete?cc=KNAPSACK2024`
    }
  }, [prolificParams.prolificPid, participantId])

  const updateParticipantData = useCallback((data: any) => {
    setParticipantData((prev) => ({
      ...prev,
      ...data,
    }))
  }, [])

  // Memoize phase props to prevent unnecessary re-renders
  const phaseProps = useMemo(() => ({
    onNext: nextPhase,
    participantData,
    updateParticipantData,
  }), [nextPhase, participantData, updateParticipantData])

  const renderPhase = useMemo(() => {
    switch (currentPhase) {
      case "intro":
        return <IntroPhase {...phaseProps} />
      case "tutorial":
        return <TutorialPhase {...phaseProps} />
      case "training1":
        return <TrainingPhase1 {...phaseProps} />
      case "training2":
        return <TrainingPhase2 {...phaseProps} />
      case "benchmark":
        return <BenchmarkPhase {...phaseProps} />
      case "strategy":
        return <StrategyPhase {...phaseProps} benchmarkData={participantData.benchmark || {}} />
      case "prediction":
        return <PredictionPhase {...phaseProps} />
      case "results":
        return <ResultsPhase {...phaseProps} />
      default:
        return <IntroPhase {...phaseProps} />
    }
  }, [currentPhase, phaseProps, participantData.benchmark])

  // Show loading state while checking access
  if (isCheckingAccess) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center">
        <div className="max-w-md mx-auto p-8">
          <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-r-transparent"></div>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Verifying Access</h1>
            <p className="text-gray-600">
              Checking your Prolific credentials and study status...
            </p>
          </div>
        </div>
      </div>
    )
  }

  // Show completed message if participant already finished
  if (showCompletedMessage) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center">
        <div className="max-w-2xl mx-auto p-8">
          <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-4">Response Already Submitted</h1>
            <p className="text-lg text-gray-600 mb-6">
              You have already submitted your response for this study. You are not allowed to submit again.
            </p>
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <p className="text-red-800 text-sm font-medium">
                🚫 Multiple submissions are not permitted. Your original response has been recorded.
              </p>
            </div>
            <p className="text-sm text-gray-500">
              Thank you for your participation! If you have any questions, please contact the researcher.
            </p>
          </div>
        </div>
      </div>
    )
  }

  // Access restriction check
  if (!accessAllowed) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-red-100 flex items-center justify-center">
        <div className="max-w-2xl mx-auto p-8">
          <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.464 0L4.35 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-4">Access Restricted</h1>
            <p className="text-lg text-gray-600 mb-6">
              This study can only be accessed through Prolific. Please use the link provided in your Prolific study invitation.
            </p>
            <p className="text-sm text-gray-500">
              If you believe this is an error, please contact the researcher.
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-gray-100">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-xl shadow-lg border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            <div className="flex items-center space-x-6">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                  <Trophy className="h-7 w-7 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">Knapsack Study</h1>
                  <p className="text-sm text-gray-600">Interactive Problem Solving</p>
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-6">
              <div className="text-center">
                <div className="text-sm text-gray-600">Progress</div>
                <div className="text-lg font-bold text-gray-900">
                  {currentPhaseIndex + 1} / {phases.length}
                </div>
              </div>
              <div className="text-center">
                <div className="text-sm text-gray-600">Score</div>
                <div className="text-lg font-bold text-blue-600">{participantData.totalScore}</div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Progress Section */}
      <div className="bg-white/60 backdrop-blur-xl border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between mb-3">
            <span className="text-lg font-semibold text-gray-900">{phases[currentPhaseIndex]?.name}</span>
            <span className="text-sm text-gray-600 bg-gray-100 px-3 py-1 rounded-full">
              {Math.round(progress)}% Complete
            </span>
          </div>
          <div className="relative">
            <Progress value={progress} className="h-3 bg-gray-200" />
          </div>

          {/* Phase indicators */}
          <div className="flex justify-between mt-6">
            {phases.map((phase, index) => {
              const Icon = phase.icon
              const isActive = index === currentPhaseIndex
              const isCompleted = index < currentPhaseIndex

              return (
                <motion.div 
                  key={phase.id} 
                  className="flex flex-col items-center"
                  whileHover={{ scale: 1.05 }}
                  transition={{ duration: 0.2 }}
                >
                  <div
                    className={`
                    w-12 h-12 rounded-xl flex items-center justify-center text-white shadow-lg transition-all duration-300
                    ${isActive 
                      ? "bg-gradient-to-br from-blue-500 to-purple-600 ring-4 ring-blue-200" 
                      : isCompleted 
                        ? "bg-gradient-to-br from-green-500 to-emerald-600" 
                        : "bg-gray-300"
                    }
                  `}
                  >
                    {isCompleted ? <Trophy className="h-6 w-6" /> : <Icon className="h-6 w-6" />}
                  </div>
                  <span
                    className={`
                    text-xs mt-2 text-center font-medium px-2 py-1 rounded-full
                    ${isActive 
                      ? "text-blue-900 bg-blue-100" 
                      : isCompleted 
                        ? "text-green-900 bg-green-100"
                        : "text-gray-600"
                    }
                  `}
                  >
                    {phase.name}
                  </span>
                </motion.div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentPhase}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -30 }}
            transition={{ duration: 0.4, ease: "easeInOut" }}
          >
            <Suspense fallback={<PhaseLoader />}>
              {renderPhase}
            </Suspense>
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  )
}