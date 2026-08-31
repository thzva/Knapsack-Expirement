"use client"

import { useEffect, useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Target, CheckCircle, XCircle, Zap, ArrowRight } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import KnapsackQuestion from "@/components/knapsack-question"
import { getTrainingPhase1Questions, getPracticeQuestions, type Question } from "@/lib/participant-loader"
import { timeTracker } from "@/lib/time-tracker"
import { uploadPhase } from "@/lib/phase-uploader"

interface TrainingPhase1Props {
  onNext: () => void
  participantData: any
  updateParticipantData: (data: any) => void
  participantId: string | null
}

// Questions will be loaded dynamically from the backend/generator

export default function TrainingPhase1({ onNext, updateParticipantData, participantId }: TrainingPhase1Props) {
  const [currentQuestion, setCurrentQuestion] = useState(0)
  const [answers, setAnswers] = useState<Array<{ questionId: number; selected: number[]; correct: boolean; confirmed: boolean }>>([])
  const [showFeedback, setShowFeedback] = useState(false)
  const [lastAnswer, setLastAnswer] = useState<{ selected: number[]; correct: boolean } | null>(null)
  const [showInstructions, setShowInstructions] = useState(true)
  const [wantMorePractice, setWantMorePractice] = useState<boolean | null>(null)
  const [isExtraPractice, setIsExtraPractice] = useState(false)
  const [showTestsInfo, setShowTestsInfo] = useState(false)
  const [allQuestions, setAllQuestions] = useState<Question[]>([])
  const [isLoadingQuestions, setIsLoadingQuestions] = useState(true)
  const [questionLoadError, setQuestionLoadError] = useState<string | null>(null)

  // Use the prop directly
  const pid = participantId

  // 🔄 Load questions dynamically when participant ID is available
  useEffect(() => {
    console.log("[Practice] useEffect triggered, pid:", pid)
    if (!pid) {
      console.log("[Practice] No participant ID available, skipping question loading")
      return
    }

    const loadQuestions = () => {
      console.log("[Practice] Loading questions from static JSON")

      try {
        setIsLoadingQuestions(true)
        setQuestionLoadError(null)

        // Load practice questions from static JSON (instant, no API calls)
        const questions = getPracticeQuestions()

        console.log("[Practice] Loaded static questions:", questions.length)
        setAllQuestions(questions)

      } catch (error) {
        console.error("[Practice] Failed to load questions:", error)
        setQuestionLoadError(error instanceof Error ? error.message : 'Failed to load questions')
      } finally {
        setIsLoadingQuestions(false)
      }
    }

    loadQuestions()
  }, [pid])

  // API base - uses local CoLab backend
  const API_BASE = useMemo(() => process.env.NEXT_PUBLIC_API_BASE || (window.location.origin + '/colab/api/knapsack-exp'), [])

  const handleAnswer = (selectedBalls: number[], isCorrect: boolean) => {
    const newAnswer = {
      questionId: allQuestions[currentQuestion].id,
      selected: selectedBalls,
      correct: isCorrect,
      confirmed: true, // User confirmed this answer in practice
    }
    setAnswers((prev) => [...prev, newAnswer])
    setLastAnswer({ selected: selectedBalls, correct: isCorrect })
    setShowFeedback(true)
  }

  const nextQuestion = () => {
    setShowFeedback(false)
    setLastAnswer(null)

    if (currentQuestion < allQuestions.length - 1) {
      setCurrentQuestion(currentQuestion + 1)
    } else {
      // End of the current set => show completion screen
      setWantMorePractice(false)
    }
  }

  const startExtraPractice = () => {
    if (!pid) return

    try {
      setIsLoadingQuestions(true)
      setWantMorePractice(true)
      setIsExtraPractice(true)

      // Load additional practice questions from static JSON
      const extraQuestions = getPracticeQuestions()

      // Combine original questions with extra ones
      const combinedQuestions = [...allQuestions, ...extraQuestions]
      setAllQuestions(combinedQuestions)
      setCurrentQuestion(allQuestions.length) // Start from first extra question
      setWantMorePractice(null) // Back to questions

    } catch (error) {
      console.error("[Practice] Failed to load extra questions:", error)
      // If extra question generation fails, just continue with existing questions
      setWantMorePractice(null)
    } finally {
      setIsLoadingQuestions(false)
    }
  }

  const handleComplete = async () => {
    console.log("[Practice] handleComplete called")

    if (!pid) {
      alert("Participant not registered yet. Please refresh the page so we can register your session.")
      console.error("[Practice] handleComplete aborted: no participantId")
      return
    }

    const correctAnswers = answers.filter((a) => a.correct).length
    const payload = {
      phase: "practice",
      participantId: pid,
      data: {
        completed: true,
        correctAnswers,
        totalQuestions: answers.length,
        accuracy: answers.length ? correctAnswers / answers.length : 0,
        answers,
        interactions: timeTracker.getAllInteractions(),
      },
    }

    const result = await uploadPhase(payload as any)
    if (!result.success) console.warn("[Practice] Upload failed — stashed for replay", result)
    updateParticipantData({ training1: payload.data })
    onNext()
  }

  // UI

  // Loading state while questions are being generated/loaded
  if (isLoadingQuestions) {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <Card className="shadow-lg">
          <CardContent className="p-8 text-center">
            <div className="space-y-4">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl mb-4">
                <Zap className="h-8 w-8 text-white animate-pulse" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900">Loading Questions</h2>
              <p className="text-gray-600 max-w-md mx-auto">
                Loading practice questions...
              </p>
              <div className="flex items-center justify-center space-x-2 text-sm text-gray-500">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
                <span>This may take a few moments</span>
              </div>
              {questionLoadError && (
                <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                  Error: {questionLoadError}
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
              <Target className="h-6 w-6 mr-2 text-green-600" />
              Practice Round - Instructions
            </CardTitle>
          </CardHeader>

          <CardContent className="space-y-8">
            <div className="bg-green-50 border border-green-200 rounded-lg p-8">
              <h3 className="text-2xl font-semibold text-green-800 mb-6">Welcome to the Practice Section!</h3>

              <div className="space-y-6 text-green-700">
                <ul className="text-lg sm:text-xl leading-relaxed space-y-3 list-disc list-inside ml-4">
                  <li>
                    Your answers in this section <strong>does not count</strong> towards your score. Do not worry about mistakes.
                  </li>
                  <li>
                    Questions are <strong>not timed (yet)</strong>, so take your time to learn.
                  </li>
                  <li>
                    <strong>Solutions will be revealed</strong> to you after you complete a question.
                  </li>
                </ul>
              </div>
            </div>

            <div className="text-center">
              <Button onClick={() => setShowInstructions(false)} size="lg" className="bg-green-600 hover:bg-green-700">
                Start Practice Questions
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (showTestsInfo) {
    return (
      <div className="max-w-7xl mx-auto">
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Target className="h-6 w-6 mr-2 text-blue-600" />
              Important Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-8">
              <h3 className="text-2xl font-semibold text-blue-800 mb-6">From now on till end of the experiment:</h3>
              <ol className="text-lg text-blue-700 space-y-4 list-decimal list-inside ml-4">
                <li>You will see total of <strong>3 knapsack tests</strong> in different formats.</li>
                <li><strong>Please read instructions on each test carefully.</strong> It contains information <strong>very</strong> relevant for your performance.</li>
              </ol>
              <div className="mt-6 text-center">
                <Button onClick={handleComplete} size="lg" className="bg-blue-600 hover:bg-blue-700">
                  Next
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (wantMorePractice !== null) {
    const correctAnswers = answers.filter((a) => a.correct).length
    const accuracy = (answers.length ? (correctAnswers / answers.length) : 0) * 100

    return (
      <div className="max-w-7xl mx-auto">
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center">
              <CheckCircle className="h-6 w-6 mr-2 text-green-600" />
              Practice Complete!
            </CardTitle>
          </CardHeader>

          <CardContent className="space-y-6">
            <div className="text-center">
              <div className="bg-gradient-to-r from-blue-50 to-green-50 p-8 rounded-xl">
                <h3 className="text-2xl font-bold text-gray-900 mb-6">Congratulations! You have completed the training.</h3>

                <div className="grid md:grid-cols-3 gap-6 mb-6">
                  <div className="bg-white p-4 rounded-lg shadow-sm">
                    <div className="text-3xl font-bold text-blue-600">{correctAnswers}</div>
                    <div className="text-sm text-gray-600">Correct Answers</div>
                  </div>

                  <div className="bg-white p-4 rounded-lg shadow-sm">
                    <div className="text-3xl font-bold text-green-600">{answers.length}</div>
                    <div className="text-sm text-gray-600">Total Questions</div>
                  </div>

                  <div className="bg-white p-4 rounded-lg shadow-sm">
                    <div className="text-3xl font-bold text-purple-600">{accuracy.toFixed(0)}%</div>
                    <div className="text-sm text-gray-600">Accuracy</div>
                  </div>
                </div>

                <div className="bg-white p-6 rounded-lg border-2 border-blue-200 mb-6">
                  <p className="text-lg text-gray-800 mb-4">
                    You should now know how to complete knapsack problems effectively.
                  </p>
                  <p className="text-base text-gray-700">
                    From this point on, you will be faced with different tests that are all on completing knapsack problems.
                  </p>
                </div>

                <div className="text-center">
                  <Button onClick={() => setShowTestsInfo(true)} size="lg" className="bg-blue-600 hover:bg-blue-700">
                    Next
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Guard: Don't render if no questions loaded
  if (!allQuestions.length) {
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

  const question = allQuestions[currentQuestion]
  const progress = ((currentQuestion + 1) / allQuestions.length) * 100

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Progress */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">
              Practice Question {currentQuestion + 1} of {allQuestions.length}
              {isExtraPractice && currentQuestion >= 6 && " (Extra Practice)"}
            </span>
            <div className="flex items-center gap-2">
              <Badge variant="outline">No Time Limit</Badge>
            </div>
          </div>
          <Progress value={progress} className="h-2" />
        </CardContent>
      </Card>

      {/* Question */}
      <AnimatePresence mode="wait">
        {!showFeedback ? (
          <motion.div
            key={`question-${currentQuestion}`}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            <KnapsackQuestion question={question} onAnswer={handleAnswer} isInteractive={true} />
          </motion.div>
        ) : (
          <motion.div
            key={`feedback-${currentQuestion}`}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="space-y-6"
          >
            {/* Feedback */}
            <Card
              className={`border-2 ${lastAnswer?.correct ? "border-green-500 bg-green-50" : "border-red-500 bg-red-50"}`}
            >
              <CardContent className="p-6 text-center">
                {lastAnswer?.correct ? (
                  <div className="space-y-3">
                    <CheckCircle className="h-12 w-12 text-green-600 mx-auto" />
                    <h3 className="text-xl font-bold text-green-800">Correct!</h3>
                    <p className="text-green-700">You found the optimal solution. Great job!</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <XCircle className="h-12 w-12 text-red-600 mx-auto" />
                    <h3 className="text-xl font-bold text-red-800">Not Quite Right</h3>
                    <p className="text-red-700">Don't worry! Let's see the optimal solution below.</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Solution */}
            <KnapsackQuestion question={question} showSolution={true} isInteractive={false} />

            <div className="text-center space-y-3">
              <Button onClick={nextQuestion} size="lg">
                {currentQuestion === allQuestions.length - 1 ? "Complete Practice" : "Next Question"}
              </Button>

              {isExtraPractice && currentQuestion >= 6 && (
                <div>
                  <Button onClick={handleComplete} variant="outline" size="lg" className="ml-4">
                    End Extra Practice & Continue to Test 1
                  </Button>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
