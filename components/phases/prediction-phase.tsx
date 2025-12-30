"use client"

import { useState, useEffect } from "react"
import { useTimeTracker } from "@/lib/time-tracker"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Clock, Target, Star, ChevronLeft, ChevronRight, Zap } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import KnapsackQuestion from "@/components/knapsack-question"
import { getPredictionPhaseQuestions, type Question } from "@/lib/participant-loader"
import { useMemo } from "react"

interface PredictionPhaseProps {
  onNext: () => void
  participantData: any
  updateParticipantData: (data: any) => void
}

// Questions will be loaded dynamically from the backend/generator

export default function PredictionPhase({ onNext, updateParticipantData }: PredictionPhaseProps) {
  const [questions, setQuestions] = useState<Question[]>([])
  const [currentQuestion, setCurrentQuestion] = useState(0)
  const [answers, setAnswers] = useState<{
    [key: number]: { selected: number[]; confirmed: boolean; correct: boolean; timeSpent?: number }
  }>({})
  const [starredQuestions, setStarredQuestions] = useState<Set<number>>(new Set())
  const [showInstructions, setShowInstructions] = useState(true)
  const [timeLeft, setTimeLeft] = useState(20 * 60) // 20 minutes
  const [isComplete, setIsComplete] = useState(false)
  const [showFinishWarning, setShowFinishWarning] = useState(false)
  const [isLoadingQuestions, setIsLoadingQuestions] = useState(true)
  const [questionLoadError, setQuestionLoadError] = useState<string | null>(null)
  const [participantId, setParticipantId] = useState<string | null>(null)
  const timeTracker = useTimeTracker()
  const [questionTimes, setQuestionTimes] = useState<{[key: number]: {startTime: number, endTime?: number, timeSpent?: number}}>({})
  const [currentQuestionStartTime, setCurrentQuestionStartTime] = useState<number | null>(null)

  // API base (configure in .env.local as NEXT_PUBLIC_API_BASE=http://localhost:8787)
  const API_BASE = useMemo(() => process.env.NEXT_PUBLIC_API_BASE || "https://knapsack-expirement-03kg.onrender.com", [])

  // Start section timing when phase begins
  useEffect(() => {
    if (!showInstructions && questions.length > 0) {
      timeTracker.startSection('final')
      
      // Start timing for first question
      const questionId = questions[currentQuestion]?.id
      if (questionId) {
        const startTime = Date.now()
        setCurrentQuestionStartTime(startTime)
        setQuestionTimes(prev => ({
          ...prev,
          [questionId]: {
            startTime,
            endTime: undefined,
            timeSpent: undefined
          }
        }))
        timeTracker.startQuestion(questionId, 'final')
      }
    }
    
    return () => {
      timeTracker.endSection()
    }
  }, [showInstructions, questions, timeTracker, currentQuestion])

  // Track question timing when current question changes
  useEffect(() => {
    if (!showInstructions && questions.length > 0 && !isComplete) {
      const questionId = questions[currentQuestion]?.id
      if (questionId) {
        // End timing for previous question
        if (currentQuestionStartTime !== null) {
          const prevQuestionId = questions[currentQuestion - 1]?.id
          if (prevQuestionId) {
            const endTime = Date.now()
            const timeSpent = endTime - currentQuestionStartTime
            setQuestionTimes(prev => ({
              ...prev,
              [prevQuestionId]: {
                ...prev[prevQuestionId],
                endTime,
                timeSpent
              }
            }))
          }
        }
        
        // Start timing for current question
        const startTime = Date.now()
        setCurrentQuestionStartTime(startTime)
        setQuestionTimes(prev => ({
          ...prev,
          [questionId]: {
            startTime,
            endTime: undefined,
            timeSpent: undefined
          }
        }))
        
        timeTracker.startQuestion(questionId, 'final')
      }
    }
  }, [currentQuestion, showInstructions, questions, isComplete, timeTracker])

  // Load participant ID
  useEffect(() => {
    const stored = localStorage.getItem("participantId")
    setParticipantId(stored)
    if (!stored) {
      console.warn("[Final Test] No participantId in localStorage")
    }
  }, [])

  // Load questions from static JSON
  useEffect(() => {
    if (!participantId) return

    const loadQuestions = () => {
      try {
        setIsLoadingQuestions(true)
        setQuestionLoadError(null)
        
        const generatedQuestions = getPredictionPhaseQuestions()
        setQuestions(generatedQuestions)
        
      } catch (error) {
        console.error("[Final Test] Failed to load questions:", error)
        setQuestionLoadError(error instanceof Error ? error.message : 'Failed to load questions')
      } finally {
        setIsLoadingQuestions(false)
      }
    }

    loadQuestions()
  }, [participantId])

  // 20-minute countdown timer
  useEffect(() => {
    if (!showInstructions && timeLeft > 0 && !isComplete) {
      const timer = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            completeTest()
            return 0
          }
          return prev - 1
        })
      }, 1000)

      return () => clearInterval(timer)
    }
  }, [showInstructions, timeLeft, isComplete])

  const handleAnswer = (selectedBalls: number[], isCorrect: boolean) => {
    const questionId = questions[currentQuestion].id
    const endTime = Date.now()
    const timeSpent = currentQuestionStartTime ? endTime - currentQuestionStartTime : 0
    
    // Log interaction
    timeTracker.logInteraction('answer_confirmed', {
      questionId,
      selectedBalls,
      isCorrect,
      timeSpent,
      timestamp: new Date().toISOString()
    })
    
    setAnswers((prev) => ({
      ...prev,
      [questionId]: {
        selected: selectedBalls,
        confirmed: true,
        correct: isCorrect,
        timeSpent, // Add timeSpent directly to answer like skills test
      },
    }))
  }

  const completeTest = async () => {
    setIsComplete(true)
  
    const correctAnswers = Object.values(answers).filter((a) => a.confirmed && a.correct).length
    const incorrectAnswers = Object.values(answers).filter((a) => a.confirmed && !a.correct).length
    const confirmedAnswers = Object.values(answers).filter((a) => a.confirmed).length
    const unansweredQuestions = questions.length - confirmedAnswers
    
    // Calculate points: 2 points per correct, 1 point per unanswered, 0 per incorrect
    const totalPoints = (correctAnswers * 2) + (unansweredQuestions * 1) + (incorrectAnswers * 0)
    const maxPoints = questions.length * 2 // 30 questions × 2 = 60 max points
  
    const payload = {
      participantId,
      phase: "final",
      data: {
        completed: true,
        correctAnswers,
        incorrectAnswers,
        unansweredQuestions,
        totalPoints,
        maxPoints,
        totalQuestions: questions.length,
        timeUsed: 20 * 60 - timeLeft,
        answers: Object.entries(answers).map(([questionId, value]) => ({
          questionId: Number(questionId),
          selected: value.selected,
          confirmed: value.confirmed,
          correct: value.correct,
          timeSpent: value.timeSpent || questionTimes[Number(questionId)]?.timeSpent || 0
        })),
        questionTimes: Object.entries(questionTimes).map(([questionId, timing]) => ({
          questionId: Number(questionId),
          startTime: timing.startTime,
          endTime: timing.endTime,
          timeSpent: timing.timeSpent || 0
        }))
      },
    }
  
    try {
      const res = await fetch(`${API_BASE}/api/v1/ingest-phase`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      })
  
      if (!res.ok) throw new Error("Failed to submit final test")
  
      console.log("[Final Test] Submission successful ✅")
      updateParticipantData({ final: payload.data })
      onNext()
    } catch (err) {
      console.error("[Final Test] Submission failed ❌", err)
      alert("There was an error submitting your final test responses.")
    }
  }
  

  const toggleStar = (questionIndex: number) => {
    setStarredQuestions((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(questionIndex)) {
        newSet.delete(questionIndex)
      } else {
        newSet.add(questionIndex)
      }
      return newSet
    })
  }

  const navigateToQuestion = (index: number) => {
    // Record time for current question before navigating
    if (currentQuestionStartTime !== null && questions[currentQuestion]) {
      const currentQuestionId = questions[currentQuestion].id
      const endTime = Date.now()
      const timeSpent = endTime - currentQuestionStartTime
      setQuestionTimes(prev => ({
        ...prev,
        [currentQuestionId]: {
          ...prev[currentQuestionId],
          endTime,
          timeSpent
        }
      }))
    }
    
    // Log navigation interaction
    timeTracker.logInteraction('question_navigation', {
      fromQuestion: currentQuestion,
      toQuestion: index,
      timeSpent: currentQuestionStartTime ? Date.now() - currentQuestionStartTime : 0,
      timestamp: new Date().toISOString()
    })
    
    setCurrentQuestion(index)
  }

  const startPhase = () => {
    setShowInstructions(false)
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, "0")}`
  }

  // Loading state while questions are being generated/loaded
  if (isLoadingQuestions) {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <Card className="shadow-lg">
          <CardContent className="p-8 text-center">
            <div className="space-y-4">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-red-500 to-orange-600 rounded-2xl mb-4">
                <Zap className="h-8 w-8 text-white animate-pulse" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900">Generating Final Test Questions</h2>
              <p className="text-gray-600 max-w-md mx-auto">
                Creating your final assessment with descending difficulty progression using our most sophisticated algorithms...
              </p>
              <div className="flex items-center justify-center space-x-2 text-sm text-gray-500">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-500"></div>
                <span>Generating 30 questions with academic rigor</span>
              </div>
              {questionLoadError && (
                <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                  Error: {questionLoadError}
                  <br />
                  <span className="text-xs">Falling back to backup questions...</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (showInstructions) {
    return (
      <div className="max-w-7xl mx-auto">
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Target className="h-6 w-6 mr-2 text-red-600" />
              Final Test - Instructions
            </CardTitle>
          </CardHeader>

          <CardContent className="space-y-8">
            <div className="bg-red-50 border border-red-200 rounded-lg p-8">
              <h3 className="text-2xl font-semibold text-red-800 mb-6">Final Test</h3>

              <div className="space-y-6 text-red-700">
                <p className="text-lg">
                  Welcome to the final test! You will see <strong>{questions.length} dynamically generated knapsack questions</strong> with 
                  descending difficulty order. As usual, we do NOT expect you 
                  to finish every question in the time given, so plan your time accordingly.
                </p>

                {questionLoadError && (
                  <div className="bg-yellow-100 border border-yellow-300 rounded-lg p-4 mb-4">
                    <p className="text-yellow-800 text-sm">
                      <strong>Note:</strong> We encountered an issue generating questions dynamically, so we're using backup questions for this session.
                    </p>
                  </div>
                )}

                <div className="bg-white p-6 rounded-lg border-2 border-red-200">
                                <h4 className="text-lg font-semibold mb-4 flex items-center">
                <Clock className="h-5 w-5 mr-2" />
                Assessment
              </h4>
              <ul className="text-base space-y-2">
                <li>• <strong>Correct answers</strong>: Contribute to your performance assessment</li>
                <li>• <strong>Incorrect answers</strong>: Do not contribute to your assessment</li>
                <li>• <strong>Unanswered questions</strong>: Considered neutral</li>
                <li>• Must confirm answers to count</li>
              </ul>
                </div>

                <div className="bg-yellow-100 border border-yellow-300 rounded-lg p-6">
                  <p className="text-lg text-yellow-800 font-medium">
                    💡 <strong>Strategy Note:</strong> The test is long, and you are NOT expected to finish every question. Plan your time
                    accordingly and focus on questions you can solve accurately.
                  </p>
                </div>
              </div>
            </div>

            <div className="text-center">
              <Button 
                onClick={startPhase} 
                size="lg" 
                className="bg-red-600 hover:bg-red-700"
                disabled={questions.length === 0}
              >
                <Target className="h-5 w-5 mr-2" />
                Start Final Test ({questions.length} Questions)
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (isComplete) {
    const correctAnswers = Object.values(answers).filter((a) => a.confirmed && a.correct).length
    const confirmedAnswers = Object.values(answers).filter((a) => a.confirmed).length
    const unansweredQuestions = questions.length - confirmedAnswers
    const incorrectAnswers = Object.values(answers).filter((a) => a.confirmed && !a.correct).length
    
    // Calculate points: 2 points per correct, 1 point per unanswered, 0 per incorrect
    const totalPoints = (correctAnswers * 2) + (unansweredQuestions * 1) + (incorrectAnswers * 0)
    const maxPoints = questions.length * 2 // 60 max points

    return (
      <div className="max-w-7xl mx-auto">
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Target className="h-6 w-6 mr-2 text-green-600" />
              Final Test Complete!
            </CardTitle>
          </CardHeader>

          <CardContent className="space-y-6">
            <div className="text-center">
              <div className="bg-gradient-to-r from-emerald-50 to-teal-50 p-8 rounded-xl">
                <h3 className="text-2xl font-bold text-gray-900 mb-6">Your Final Performance</h3>

                <div className="grid md:grid-cols-4 gap-4 mb-6">
                  <div className="bg-white p-4 rounded-lg shadow-sm">
                    <div className="text-3xl font-bold text-emerald-600">{correctAnswers}</div>
                    <div className="text-sm text-gray-600">Correct</div>
                  </div>

                  <div className="bg-white p-4 rounded-lg shadow-sm">
                    <div className="text-3xl font-bold text-amber-600">{unansweredQuestions}</div>
                    <div className="text-sm text-gray-600">Unanswered</div>
                  </div>

                  <div className="bg-white p-4 rounded-lg shadow-sm">
                    <div className="text-3xl font-bold text-rose-600">{incorrectAnswers}</div>
                    <div className="text-sm text-gray-600">Incorrect</div>
                  </div>

                  <div className="bg-white p-4 rounded-lg shadow-sm border-2 border-teal-500">
                    <div className="text-3xl font-bold text-teal-600">{totalPoints}/{maxPoints}</div>
                    <div className="text-sm text-gray-600">Points Earned</div>
                  </div>
                </div>

                <div className="bg-teal-100 border border-teal-300 rounded-lg p-4 mb-6">
                  <p className="text-teal-800 font-medium">
                    You completed the test with <strong>{totalPoints} out of {maxPoints}</strong> points!
                  </p>
                  <p className="text-teal-700 text-sm mt-2">
                    Scoring: 2 points per correct answer, 1 point per unanswered question, 0 points per incorrect answer.
                  </p>
                  <p className="text-teal-700 text-sm mt-1">
                    Thank you for participating in this study.
                  </p>
                </div>

                <Button onClick={onNext} size="lg">
                  Continue to Question Analysis
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Guard: Don't render if no questions loaded
  if (!questions.length) {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <Card className="shadow-lg">
          <CardContent className="p-8 text-center">
            <div className="text-gray-500">No questions available</div>
          </CardContent>
        </Card>
      </div>
    )
  }

  const question = questions[currentQuestion]
  const currentAnswer = answers[question.id]
  const progress =
    (Object.keys(answers).filter((k) => answers[Number.parseInt(k)].confirmed).length / questions.length) * 100

  return (
    <div className="max-w-7xl mx-auto">
      {/* Top Section with Timer and Finish Button */}
      <Card className="mb-6 bg-gradient-to-r from-blue-50 to-purple-50 border-2 border-blue-200">
        <CardContent className="p-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-4">
              <h2 className="text-2xl font-bold text-gray-900">Final Test</h2>
              <div className={`px-4 py-3 rounded-xl text-xl font-mono font-bold shadow-lg flex items-center space-x-2 ${
                timeLeft <= 300 ? "bg-red-500 text-white animate-pulse" : timeLeft <= 600 ? "bg-orange-500 text-white" : "bg-blue-500 text-white"
              }`}>
                <Clock className="h-5 w-5" />
                <span>{formatTime(timeLeft)}</span>
              </div>
            </div>
            <Button onClick={() => setShowFinishWarning(true)} variant="outline" className="bg-red-50 hover:bg-red-100 border-red-200">
              Finish Test Early
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Top Navigation Panel */}
      <Card className="mb-6">
        <CardHeader className="pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h3 className="text-xl font-semibold">Question Navigation</h3>
              <div className="flex items-center space-x-4 mt-2">
                <span className="text-sm text-gray-600">
                  {Object.keys(answers).filter((k) => answers[Number.parseInt(k)].confirmed).length} / {questions.length} completed
                </span>
                <Progress value={progress} className="h-2 w-32" />
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-4">
          {/* Horizontal Scrollable Question Numbers */}
          <div className="relative">
            <div className="flex space-x-3 overflow-x-auto pb-3 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
              {questions.map((q, index) => {
                const isActive = index === currentQuestion
                const isAnswered = answers[q.id]?.confirmed
                const isStarred = starredQuestions.has(index)

                return (
                  <div key={q.id} className="relative flex-shrink-0">
                    <button
                      onClick={() => navigateToQuestion(index)}
                      className={`
                        relative w-14 h-14 flex items-center justify-center font-bold text-lg rounded-xl transition-all duration-200 border-2
                        ${
                          isActive
                            ? "bg-blue-500 text-white shadow-lg scale-110 border-blue-600"
                            : isAnswered
                              ? "bg-green-100 text-green-800 hover:bg-green-200 border-green-300"
                              : "bg-gray-100 text-gray-600 hover:bg-gray-200 border-gray-300"
                        }
                      `}
                    >
                      {index + 1}
                    </button>
                    
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        toggleStar(index)
                      }}
                      className={`absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center ${
                        isStarred ? "bg-yellow-500 text-white" : "bg-gray-200 text-gray-400 hover:bg-gray-300"
                      }`}
                    >
                      <Star className="h-3 w-3" fill={isStarred ? "currentColor" : "none"} />
                    </button>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Legend */}
          <div className="mt-4 pt-4 border-t">
            <div className="flex flex-wrap items-center gap-6 text-sm">
              <span className="font-medium text-gray-700">Legend:</span>
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-blue-500 rounded border-2 border-blue-600"></div>
                <span>Current</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-green-100 border-2 border-green-300 rounded"></div>
                <span>Completed</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-gray-100 border-2 border-gray-300 rounded"></div>
                <span>Not answered</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-yellow-500 rounded-full flex items-center justify-center">
                  <Star className="w-2 h-2 text-white fill-current" />
                </div>
                <span>Starred</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Question Area */}
      <div className="space-y-6">
          <Card>
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <h3 className="text-2xl font-bold">
                  Question {currentQuestion + 1} of {questions.length}
                </h3>
                {currentAnswer?.confirmed && <Badge variant="secondary" className="bg-green-100 text-green-800">✓ Confirmed</Badge>}
              </div>
            </div>
          </CardHeader>

          <CardContent>
            {/* Warning for unconfirmed answers */}
            {!currentAnswer?.confirmed && (
              <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-yellow-800 font-medium">
                  ⚠️ Remember to confirm your answer if you wish to submit it! Unconfirmed answers are considered unanswered.
                </p>
              </div>
            )}

            <KnapsackQuestion
              key={`final-q-${question.id}`}
              question={question}
              onAnswer={handleAnswer}
              isInteractive={!currentAnswer?.confirmed}
              isTestMode={true}
              initialSelection={currentAnswer?.selected || []}
              isConfirmed={currentAnswer?.confirmed || false}
            />

            {currentAnswer?.confirmed && (
              <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-green-800 font-medium">
                  ✓ Answer confirmed. You can still view this question but cannot change your answer.
                </p>
              </div>
            )}

            {/* Navigation buttons at bottom */}
            <div className="flex justify-between items-center mt-8 pt-6 border-t">
              <Button
                variant="outline"
                size="lg"
                onClick={() => navigateToQuestion(Math.max(0, currentQuestion - 1))}
                disabled={currentQuestion === 0}
                className="flex items-center space-x-2"
              >
                <ChevronLeft className="h-5 w-5" />
                <span>Previous</span>
              </Button>
              <div className="text-sm text-gray-500 bg-gray-50 px-3 py-1 rounded-full">
                Question {currentQuestion + 1} of {questions.length}
              </div>
              <Button
                variant="outline"
                size="lg"
                onClick={() => navigateToQuestion(Math.min(questions.length - 1, currentQuestion + 1))}
                disabled={currentQuestion === questions.length - 1}
                className="flex items-center space-x-2"
              >
                <span>Next</span>
                <ChevronRight className="h-5 w-5" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Finish Early Warning Dialog */}
      {showFinishWarning && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="max-w-md mx-4">
            <CardHeader>
              <CardTitle className="text-center text-red-600">Finish Test Early?</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-center space-y-3">
                <p className="text-gray-700">
                  <strong>There is still time remaining!</strong> Please confirm that you would like to end the test early.
                </p>
                <p className="text-sm text-gray-600">
                  Please remember to confirm all questions you wish to answer!
                </p>
              </div>
              <div className="flex space-x-3">
                <Button 
                  variant="outline" 
                  onClick={() => setShowFinishWarning(false)}
                  className="flex-1"
                >
                  Continue Test
                </Button>
                <Button 
                  onClick={() => {
                    setShowFinishWarning(false)
                    completeTest()
                  }}
                  className="flex-1 bg-red-600 hover:bg-red-700"
                >
                  End Early
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
