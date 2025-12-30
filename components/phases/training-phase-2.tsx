"use client"

import { useState, useEffect, useRef } from "react"
import { useTimeTracker } from "@/lib/time-tracker"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Clock, Zap, Trophy, AlertTriangle } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import KnapsackQuestion from "@/components/knapsack-question"

interface TrainingPhase2Props {
  onNext: () => void
  participantData: any
  updateParticipantData: (data: any) => void
}

const skillsQuestions = [
  // Easy questions (1-3)
  {
    id: 1,
    capacity: 10,
    balls: [
      { id: 1, weight: 6, reward: 18, color: "bg-red-500" },
      { id: 2, weight: 4, reward: 12, color: "bg-blue-500" },
      { id: 3, weight: 3, reward: 9, color: "bg-green-500" },
    ],
    solution: [1, 2],
    difficulty: "easy",
  },
  {
    id: 2,
    capacity: 12,
    balls: [
      { id: 1, weight: 5, reward: 15, color: "bg-purple-500" },
      { id: 2, weight: 7, reward: 21, color: "bg-yellow-500" },
      { id: 3, weight: 4, reward: 12, color: "bg-pink-500" },
      { id: 4, weight: 3, reward: 9, color: "bg-indigo-500" },
    ],
    solution: [2, 3],
    difficulty: "easy",
  },
  {
    id: 3,
    capacity: 15,
    balls: [
      { id: 1, weight: 8, reward: 24, color: "bg-red-500" },
      { id: 2, weight: 6, reward: 18, color: "bg-blue-500" },
      { id: 3, weight: 5, reward: 15, color: "bg-green-500" },
      { id: 4, weight: 4, reward: 12, color: "bg-yellow-500" },
    ],
    solution: [1, 2],
    difficulty: "easy",
  },
  // Medium questions (4-7)
  {
    id: 4,
    capacity: 18,
    balls: [
      { id: 1, weight: 9, reward: 27, color: "bg-orange-500" },
      { id: 2, weight: 7, reward: 21, color: "bg-teal-500" },
      { id: 3, weight: 6, reward: 18, color: "bg-rose-500" },
      { id: 4, weight: 5, reward: 15, color: "bg-cyan-500" },
      { id: 5, weight: 4, reward: 12, color: "bg-lime-500" },
    ],
    solution: [1, 2],
    difficulty: "medium",
  },
  {
    id: 5,
    capacity: 20,
    balls: [
      { id: 1, weight: 10, reward: 30, color: "bg-red-500" },
      { id: 2, weight: 8, reward: 24, color: "bg-blue-500" },
      { id: 3, weight: 6, reward: 18, color: "bg-green-500" },
      { id: 4, weight: 5, reward: 15, color: "bg-yellow-500" },
      { id: 5, weight: 4, reward: 12, color: "bg-purple-500" },
    ],
    solution: [1, 2],
    difficulty: "medium",
  },
  {
    id: 6,
    capacity: 22,
    balls: [
      { id: 1, weight: 12, reward: 36, color: "bg-indigo-500" },
      { id: 2, weight: 10, reward: 30, color: "bg-pink-500" },
      { id: 3, weight: 8, reward: 24, color: "bg-orange-500" },
      { id: 4, weight: 6, reward: 18, color: "bg-teal-500" },
      { id: 5, weight: 5, reward: 15, color: "bg-rose-500" },
    ],
    solution: [1, 2],
    difficulty: "medium",
  },
  {
    id: 7,
    capacity: 25,
    balls: [
      { id: 1, weight: 15, reward: 45, color: "bg-cyan-500" },
      { id: 2, weight: 12, reward: 36, color: "bg-lime-500" },
      { id: 3, weight: 10, reward: 30, color: "bg-amber-500" },
      { id: 4, weight: 8, reward: 24, color: "bg-emerald-500" },
      { id: 5, weight: 6, reward: 18, color: "bg-violet-500" },
    ],
    solution: [1, 4],
    difficulty: "medium",
  },
  // Hard questions (8-10)
  {
    id: 8,
    capacity: 30,
    balls: [
      { id: 1, weight: 18, reward: 54, color: "bg-red-500" },
      { id: 2, weight: 15, reward: 45, color: "bg-blue-500" },
      { id: 3, weight: 12, reward: 36, color: "bg-green-500" },
      { id: 4, weight: 10, reward: 30, color: "bg-yellow-500" },
      { id: 5, weight: 8, reward: 24, color: "bg-purple-500" },
      { id: 6, weight: 6, reward: 18, color: "bg-pink-500" },
    ],
    solution: [1, 3],
    difficulty: "hard",
  },
  {
    id: 9,
    capacity: 35,
    balls: [
      { id: 1, weight: 20, reward: 60, color: "bg-indigo-500" },
      { id: 2, weight: 18, reward: 54, color: "bg-orange-500" },
      { id: 3, weight: 15, reward: 45, color: "bg-teal-500" },
      { id: 4, weight: 12, reward: 36, color: "bg-rose-500" },
      { id: 5, weight: 10, reward: 30, color: "bg-cyan-500" },
      { id: 6, weight: 8, reward: 24, color: "bg-lime-500" },
    ],
    solution: [1, 3],
    difficulty: "hard",
  },
  {
    id: 10,
    capacity: 40,
    balls: [
      { id: 1, weight: 25, reward: 75, color: "bg-amber-500" },
      { id: 2, weight: 20, reward: 60, color: "bg-emerald-500" },
      { id: 3, weight: 18, reward: 54, color: "bg-violet-500" },
      { id: 4, weight: 15, reward: 45, color: "bg-sky-500" },
      { id: 5, weight: 12, reward: 36, color: "bg-stone-500" },
      { id: 6, weight: 10, reward: 30, color: "bg-red-500" },
    ],
    solution: [1, 4],
    difficulty: "hard",
  },
]

export default function TrainingPhase2({ onNext, updateParticipantData }: TrainingPhase2Props) {
  const [currentQuestion, setCurrentQuestion] = useState(0)
  const [answers, setAnswers] = useState<
    Array<{ questionId: number; selected: number[]; correct: boolean; confirmed: boolean; timeSpent: number }>
  >([])
  const [showInstructions, setShowInstructions] = useState(true)
  const timeTracker = useTimeTracker()
  const [startTime, setStartTime] = useState<number>(0)
  const [totalTimeLeft, setTotalTimeLeft] = useState(15 * 60)
  const [questionStartTime, setQuestionStartTime] = useState<number>(0)
  const [isComplete, setIsComplete] = useState(false)
  const hasCompleted = useRef(false)

  // Total timer
  useEffect(() => {
    if (!showInstructions && totalTimeLeft > 0 && !isComplete) {
      const timer = setInterval(() => {
        setTotalTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(timer)
            handleTimeUp()
            return 0
          }
          return prev - 1
        })
      }, 1000)
      return () => clearInterval(timer)
    }
  }, [showInstructions, totalTimeLeft, isComplete])

  const nextQuestion = () => {
    if (currentQuestion < skillsQuestions.length - 1) {
      setCurrentQuestion((prev) => prev + 1)
      setQuestionStartTime(Date.now())
    } else {
      completePhase()
    }
  }

  const handleAnswer = (selectedBalls: number[], isCorrect: boolean) => {
    if (hasCompleted.current) return

    const endTime = Date.now()
    const timeSpent = endTime - questionStartTime
    const questionId = skillsQuestions[currentQuestion].id
    
    // Log interaction
    timeTracker.logInteraction('answer_confirmed', {
      questionId,
      selectedBalls,
      isCorrect,
      timeSpent,
      timestamp: new Date().toISOString()
    })

    const newAnswer = {
      questionId,
      selected: selectedBalls,
      correct: isCorrect,
      confirmed: true, // User actively confirmed this answer
      timeSpent,
    }

    setAnswers((prev) => [...prev, newAnswer])
    nextQuestion()
  }

  const skipQuestion = () => {
    if (hasCompleted.current) return

    const timeSpent = Date.now() - questionStartTime
    const newAnswer = {
      questionId: skillsQuestions[currentQuestion].id,
      selected: [],
      correct: false,
      confirmed: false, // User skipped this question
      timeSpent: Math.round(timeSpent / 1000),
    }

    setAnswers((prev) => [...prev, newAnswer])
    nextQuestion()
  }

  const handleTimeUp = () => {
    if (hasCompleted.current) return

    const remaining = skillsQuestions.slice(currentQuestion).map((q) => ({
      questionId: q.id,
      selected: [],
      correct: false,
      confirmed: false, // Time ran out, no confirmation
      timeSpent: 0,
    }))
    setAnswers((prev) => [...prev, ...remaining])
    completePhase()
  }

  const completePhase = async () => {
    if (hasCompleted.current) return
    hasCompleted.current = true
    setIsComplete(true)

    // Calculate points using new scheme: 2 points for correct, 1 for unanswered, 0 for incorrect
    const correctCount = answers.filter((a) => a.correct).length
    const incorrectCount = answers.filter((a) => a.selected.length > 0 && !a.correct).length
    const unansweredCount = skillsQuestions.length - correctCount - incorrectCount
    
    // Calculate total points: 2 points per correct, 1 point per unanswered, 0 per incorrect
    const totalPoints = (correctCount * 2) + (unansweredCount * 1) + (incorrectCount * 0)
    const maxPoints = skillsQuestions.length * 2 // 10 questions × 2 = 20 max points

    const payload = {
      phase: "skill",
      participantId: localStorage.getItem("participantId"),
      data: {
        completed: true,
        correctAnswers: correctCount,
        incorrectAnswers: incorrectCount,
        unansweredQuestions: unansweredCount,
        totalPoints,
        maxPoints,
        totalQuestions: skillsQuestions.length,
        accuracy: correctCount / skillsQuestions.length,
        timeUsed: 15 * 60 - totalTimeLeft,
        answers,
        questionTimes: answers.map(answer => ({
          questionId: answer.questionId,
          startTime: 0, // Will be populated by actual timing
          endTime: 0,
          timeSpent: answer.timeSpent
        }))
      },
    }

     try {
       const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "https://knapsack-expirement-03kg.onrender.com"
       
       // Add timeout to prevent hanging
       const controller = new AbortController()
       const timeoutId = setTimeout(() => controller.abort(), 5000) // 5 second timeout

       const res = await fetch(`${API_BASE}/api/v1/ingest-phase`, {
         method: "POST",
         headers: { "Content-Type": "application/json" },
         body: JSON.stringify(payload),
         signal: controller.signal
       })

       clearTimeout(timeoutId)

      if (!res.ok) {
        const text = await res.text()
        console.error("[Test 1] Server error:", res.status, text)
        throw new Error(`Failed to submit test data (status ${res.status})`)
      }
      
      updateParticipantData({ training2: payload.data, totalScore: totalPoints })
      onNext()
    } catch (err) {
      console.error("[Test 1] Failed to submit:", err)
      // Proceed with local data if backend unavailable
      updateParticipantData({ training2: payload.data, totalScore: totalPoints })
      onNext()
    }
  }

  const startPhase = () => {
    setShowInstructions(false)
    setStartTime(Date.now())
    setQuestionStartTime(Date.now())
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, "0")}`
  }

  const question = skillsQuestions[currentQuestion]
  const progress = ((currentQuestion + 1) / skillsQuestions.length) * 100
  const difficultyColor = {
    easy: "bg-green-500",
    medium: "bg-yellow-500",
    hard: "bg-red-500",
  }[question.difficulty]
  if (showInstructions) {
    return (
      <div className="max-w-7xl mx-auto">
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Zap className="h-6 w-6 mr-2 text-orange-600" />
              Test 1 - Instructions
            </CardTitle>
          </CardHeader>

          <CardContent className="space-y-8">
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-8">
              <h3 className="text-2xl font-semibold text-orange-800 mb-6">Test 1</h3>

              <div className="space-y-6 text-orange-700">
                <p className="text-xl">
                  In this section, you will complete <strong>10 questions</strong> in Test 1.
                  Once you start, you will have <strong>90 seconds on each question</strong>.
                </p>

                <div className="grid md:grid-cols-2 gap-6">
                  <div className="bg-white p-6 rounded-lg">
                    <h4 className="text-xl font-semibold mb-4 flex items-center">
                      <Clock className="h-5 w-5 mr-2" />
                      Rules
                    </h4>
                    <ul className="text-lg space-y-3">
                      <li>• You have 90 seconds to complete each question.</li>
                      <li>• <strong>You cannot come back to previous questions after seeing later questions</strong>, so answer questions you wish before moving on.</li>
                      <li>• <strong>Guessing is penalized!</strong> Please only answer questions you wish to answer.</li>
                      <li>• Only questions confirmed are considered answered, unconfirmed questions are considered unanswered!</li>
                      <li>• Auto-submit when time runs out.</li>
                    </ul>
                  </div>

                  <div className="bg-white p-6 rounded-lg">
                    <h4 className="text-xl font-semibold mb-4 flex items-center">
                      <Trophy className="h-5 w-5 mr-2" />
                      Scoring
                    </h4>
                    <ul className="text-lg space-y-3">
                      <li>
                        • <strong>Correct answers</strong>: You are rewarded 2 <strong>probability points</strong>
                      </li>
                      <li>
                        • <strong>Incorrect answers</strong>: You are NOT rewarded <strong>probability points</strong>
                      </li>
                      <li>
                        • <strong>Unanswered questions</strong>: You are rewarded 1 <strong>probability point</strong>
                      </li>
                    </ul>
                  </div>
                </div>

                <div className="bg-red-100 border border-red-300 rounded-lg p-6">
                  <div className="flex items-center mb-4">
                    <AlertTriangle className="h-5 w-5 text-red-600 mr-2" />
                    <h4 className="text-xl font-semibold text-red-800">Important Reminders</h4>
                  </div>
                  <ul className="text-lg text-red-700 space-y-3">
                    <li>• If you attempted a question but do not wish to answer it, no need to deselect the balls, just leave the question unconfirmed.</li>
                    <li>• Focus on accuracy over speed.</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="text-center">
              <Button onClick={startPhase} size="lg" className="bg-orange-600 hover:bg-orange-700">
                <Clock className="h-5 w-5 mr-2" />
                Start Test 1
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (isComplete) {
    const correctAnswers = answers.filter((a) => a.correct).length
    const unansweredQuestions = answers.filter((a) => a.selected.length === 0).length
    const incorrectAnswers = answers.filter((a) => a.selected.length > 0 && !a.correct).length
    
    // Calculate points: 2 points per correct, 1 point per unanswered, 0 per incorrect
    const totalPoints = (correctAnswers * 2) + (unansweredQuestions * 1) + (incorrectAnswers * 0)
    const maxPoints = skillsQuestions.length * 2 // 20 max points

    return (
      <div className="max-w-7xl mx-auto">
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Trophy className="h-6 w-6 mr-2 text-green-600" />
              Test 1 Complete!
            </CardTitle>
          </CardHeader>

          <CardContent className="space-y-6">
            <div className="text-center">
              <div className="bg-gradient-to-r from-green-50 to-blue-50 p-8 rounded-xl">
                <h3 className="text-2xl font-bold text-gray-900 mb-6">Your Performance Summary</h3>

                <div className="grid md:grid-cols-4 gap-4 mb-6">
                  <div className="bg-white p-4 rounded-lg shadow-sm">
                    <div className="text-3xl font-bold text-green-600">{correctAnswers}</div>
                    <div className="text-sm text-gray-600">Correct</div>
                  </div>

                  <div className="bg-white p-4 rounded-lg shadow-sm">
                    <div className="text-3xl font-bold text-yellow-600">{unansweredQuestions}</div>
                    <div className="text-sm text-gray-600">Unanswered</div>
                  </div>

                  <div className="bg-white p-4 rounded-lg shadow-sm">
                    <div className="text-3xl font-bold text-red-600">{incorrectAnswers}</div>
                    <div className="text-sm text-gray-600">Incorrect</div>
                  </div>

                  <div className="bg-white p-4 rounded-lg shadow-sm border-2 border-blue-500">
                    <div className="text-3xl font-bold text-blue-600">{totalPoints}/{maxPoints}</div>
                    <div className="text-sm text-gray-600">Points Earned</div>
                  </div>
                </div>

                <div className="bg-blue-100 border border-blue-300 rounded-lg p-4 mb-6">
                  <p className="text-blue-800 font-medium">
                    You earned <strong>{totalPoints} out of {maxPoints}</strong> points!
                  </p>
                  <p className="text-blue-700 text-sm mt-2">
                    Scoring: 2 points per correct answer, 1 point per unanswered question, 0 points per incorrect answer.
                  </p>
                </div>

                <Button onClick={onNext} size="lg">
                  Continue to Test 2
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

 

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-4">
              <span className="text-sm font-medium">
                Question {currentQuestion + 1} of {skillsQuestions.length}
              </span>
              <Badge className={`text-white ${difficultyColor}`}>{question.difficulty.toUpperCase()}</Badge>
            </div>
            
          </div>
          <Progress value={progress} className="h-2" />
        </CardContent>
      </Card>

      <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-center">
        <p className="text-red-700 font-medium text-sm">
          🚨 Confirm answers or they will be considered unanswered!
        </p>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={`question-${currentQuestion}`}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
        >
          <KnapsackQuestion
            question={question}
            onAnswer={handleAnswer}
            onSkip={skipQuestion}
            isInteractive={true}
            isTestMode={true}
            timeLimit={90}
            onTimeUp={() => {
              const timeSpent = Date.now() - questionStartTime
              const newAnswer = {
                questionId: question.id,
                selected: [],
                correct: false,
                confirmed: false, // Per-question timer expired
                timeSpent: Math.round(timeSpent / 1000),
              }
              setAnswers((prev) => [...prev, newAnswer])
              nextQuestion()
            }}
          />
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
