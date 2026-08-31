"use client"

import { useState, useEffect, useRef, useMemo } from "react"
import { useTimeTracker, timeTracker } from "@/lib/time-tracker"
import { uploadPhase } from "@/lib/phase-uploader"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Clock, Zap, Trophy, AlertTriangle } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import KnapsackQuestion from "@/components/knapsack-question"
import { getSkillTestQuestions, type Question } from "@/lib/participant-loader"

interface TrainingPhase2Props {
  onNext: () => void
  participantData: any
  updateParticipantData: (data: any) => void
  participantId: string | null
}

// Questions loaded dynamically from static-questions.json via participant-loader

export default function TrainingPhase2({ onNext, updateParticipantData, participantId }: TrainingPhase2Props) {
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
  const [isSaving, setIsSaving] = useState(false)
  const hasCompleted = useRef(false)

  // Load questions dynamically from the question bank (all 6-ball)
  const [skillsQuestions, setSkillsQuestions] = useState<Question[]>([])
  useEffect(() => {
    const questions = getSkillTestQuestions()
    setSkillsQuestions(questions)
  }, [])

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
      participantId: participantId,
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
        answers: answers.map(answer => ({
          ...answer,
          difficulty: skillsQuestions.find(q => q.id === answer.questionId)?.difficulty || 'unknown'
        })),
        questionTimes: answers.map(answer => ({
          questionId: answer.questionId,
          startTime: 0,
          endTime: 0,
          timeSpent: answer.timeSpent,
          difficulty: skillsQuestions.find(q => q.id === answer.questionId)?.difficulty || 'unknown'
        })),
        interactions: timeTracker.getAllInteractions()
      },
    }

    setIsSaving(true)
    const result = await uploadPhase(payload as any)
    if (!result.success) console.warn("[Test 1] Upload failed — stashed for replay", result)
    updateParticipantData({ training2: payload.data, totalScore: totalPoints })
    setIsSaving(false)
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

  const shuffledQuestion = useMemo(() => {
    if (!question) return question;

    // Create a shallow copy of the question
    const qCopy = { ...question };

    // Create a shallow copy of the balls array and shuffle it
    // Using Fisher-Yates logic
    const shuffledBalls = [...qCopy.balls];
    for (let i = shuffledBalls.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffledBalls[i], shuffledBalls[j]] = [shuffledBalls[j], shuffledBalls[i]];
    }

    qCopy.balls = shuffledBalls;
    return qCopy;
  }, [question]);

  // Guard: Don't render question UI if questions haven't loaded yet
  if (skillsQuestions.length === 0) {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <Card className="shadow-lg">
          <CardContent className="p-8 text-center">
            <div className="space-y-4">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-orange-500 to-red-600 rounded-2xl mb-4">
                <Zap className="h-8 w-8 text-white animate-pulse" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900">Loading Test 1 Questions</h2>
              <p className="text-gray-600">Preparing your questions...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  const progress = ((currentQuestion + 1) / skillsQuestions.length) * 100
  const difficultyColor = {
    easy: "bg-green-500",
    medium: "bg-yellow-500",
    hard: "bg-red-500",
  }[question?.difficulty ?? "easy"]
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
                </p>

                <div className="grid md:grid-cols-2 gap-6">
                  <div className="bg-white p-6 rounded-lg">
                    <h4 className="text-xl font-semibold mb-4 flex items-center">
                      <Clock className="h-5 w-5 mr-2" />
                      Rules
                    </h4>
                    <ul className="text-lg space-y-3">
                      <li>• <strong>You cannot come back to previous questions after seeing later questions</strong>, so answer questions you wish before moving on.</li>
                      <li>• <strong>Guessing is penalized!</strong> Skip questions you do not want to answer.</li>
                      <li>• Auto-skip when timed out.</li>
                    </ul>
                  </div>
                  
                  <div className="bg-white p-6 rounded-lg">
                    <h4 className="text-xl font-semibold mb-4 flex items-center">
                      <Trophy className="h-5 w-5 mr-2" />
                      Scoring
                    </h4>
                    <ul className="text-lg space-y-3">
                      <li>• <strong>Correct answers</strong>: 2 points</li>
                      <li>• <strong>Incorrect answers</strong>: 0 points</li>
                      <li>• <strong>Unanswered/Skipped</strong>: 1 point</li>
                    </ul>
                  </div>
                </div>

                <div className="bg-red-100 border border-red-300 rounded-lg p-6">
                  <div className="flex items-center mb-4">
                    <AlertTriangle className="h-5 w-5 text-red-600 mr-2" />
                    <h4 className="text-xl font-semibold text-red-800">Important Reminder</h4>
                  </div>
                  <ul className="text-lg text-red-700 space-y-3">
                    <li>• If you attempted a question but do not wish to answer it, no need to deselect the balls, just leave the question unconfirmed.</li>
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
                <h3 className="text-2xl font-bold text-gray-900 mb-4">Thank you for completing Test 1!</h3>
                <p className="text-lg text-gray-600 mb-6">Click below to continue to the next test.</p>
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

  if (isSaving) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-orange-600 border-r-transparent mb-4"></div>
          <p className="text-gray-600">Saving your results...</p>
        </div>
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
            </div>

          </div>
          <Progress value={progress} className="h-2" />
        </CardContent>
      </Card>

      <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-center">
        <p className="text-red-700 font-medium text-sm">
          🚨 Confirm answers or they will be considered unanswered! Or skip if you do not wish to answer.
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
            question={shuffledQuestion}
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
