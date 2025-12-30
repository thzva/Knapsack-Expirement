"use client"

import { useState, useMemo, useEffect } from "react"
import { useTimeTracker } from "@/lib/time-tracker"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { MessageSquare, Clock, Target, CheckCircle } from "lucide-react"
import { motion } from "framer-motion"

interface StrategyPhaseProps {
  onNext: () => void
  updateParticipantData: (data: any) => void
  benchmarkData: any
}

const strategyQuestions = [
  {
    id: 1,
    question: "How did you approach solving the knapsack problems? Describe your general strategy.",
    placeholder: "Describe your problem-solving approach, any patterns you noticed, or strategies you developed..."
  },
  {
    id: 2,
    question: "What factors did you consider when deciding which items to include in the knapsack?",
    placeholder: "Consider weight, value, ratios, combinations, time constraints, etc..."
  },
  {
    id: 3,
    question: "How did you manage your time during the test? Did you change your approach as time ran out?",
    placeholder: "Describe your time management strategy, how you prioritized questions, etc..."
  },
  {
    id: 4,
    question: "What was the most challenging aspect of the knapsack problems for you?",
    placeholder: "Consider computational complexity, time pressure, decision-making, etc..."
  },
  {
    id: 5,
    question: "How confident are you in your performance? What do you think your score might be?",
    placeholder: "Reflect on your confidence level and estimate your performance..."
  }
]

export default function StrategyPhase({ onNext, updateParticipantData, benchmarkData }: StrategyPhaseProps) {
  const [currentQuestion, setCurrentQuestion] = useState(0)
  const [answers, setAnswers] = useState<{ [key: number]: { text: string; timeSpent?: number } }>({})
  const [showInstructions, setShowInstructions] = useState(true)
  const [isComplete, setIsComplete] = useState(false)
  const timeTracker = useTimeTracker()
  const [questionTimes, setQuestionTimes] = useState<{[key: number]: {startTime: number, endTime?: number, timeSpent?: number}}>({})
  const [currentQuestionStartTime, setCurrentQuestionStartTime] = useState<number | null>(null)

  // API base (configure in .env.local as NEXT_PUBLIC_API_BASE=http://localhost:8787)
  const API_BASE = useMemo(() => process.env.NEXT_PUBLIC_API_BASE || "https://knapsack-expirement-03kg.onrender.com", [])

  // Start section timing when phase begins
  useEffect(() => {
    if (!showInstructions) {
      timeTracker.startSection('strategy')
    }
    
    return () => {
      timeTracker.endSection()
    }
  }, [showInstructions, timeTracker])

  // Track question timing when current question changes
  useEffect(() => {
    if (!showInstructions && strategyQuestions[currentQuestion]) {
      // End timing for previous question
      if (currentQuestionStartTime !== null && currentQuestion > 0) {
        const prevQuestionId = currentQuestion
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
      
      // Start timing for current question
      const startTime = Date.now()
      setCurrentQuestionStartTime(startTime)
      setQuestionTimes(prev => ({
        ...prev,
        [currentQuestion + 1]: {
          startTime,
          endTime: undefined,
          timeSpent: undefined
        }
      }))
      
      timeTracker.startQuestion(currentQuestion + 1, 'strategy')
    }
  }, [currentQuestion, showInstructions, timeTracker])

  const handleAnswerChange = (questionId: number, answer: string) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: { 
        text: answer,
        timeSpent: prev[questionId]?.timeSpent // Keep existing timeSpent if any
      }
    }))
  }

  const nextQuestion = () => {
    // Record timing for current question before moving
    if (currentQuestionStartTime !== null) {
      const endTime = Date.now()
      const timeSpent = endTime - currentQuestionStartTime
      const questionId = currentQuestion + 1
      
      // Update the answer with timeSpent
      setAnswers(prev => ({
        ...prev,
        [questionId]: {
          text: prev[questionId]?.text || '',
          timeSpent
        }
      }))
    }
    
    if (currentQuestion < strategyQuestions.length - 1) {
      setCurrentQuestion(currentQuestion + 1)
    } else {
      setIsComplete(true)
    }
  }

  const previousQuestion = () => {
    // Record timing for current question before moving
    if (currentQuestionStartTime !== null) {
      const endTime = Date.now()
      const timeSpent = endTime - currentQuestionStartTime
      const questionId = currentQuestion + 1
      
      // Update the answer with timeSpent
      setAnswers(prev => ({
        ...prev,
        [questionId]: {
          text: prev[questionId]?.text || '',
          timeSpent
        }
      }))
    }
    
    if (currentQuestion > 0) {
      setCurrentQuestion(currentQuestion - 1)
    }
  }

  const completePhase = async () => {
    let finalAnswers = { ...answers }
    if (currentQuestionStartTime !== null) {
      const endTime = Date.now()
      const timeSpent = endTime - currentQuestionStartTime
      const questionId = currentQuestion + 1
      
      finalAnswers = {
        ...finalAnswers,
        [questionId]: {
          text: finalAnswers[questionId]?.text || '',
          timeSpent
        }
      }
    }

    const participantId = localStorage.getItem("participantId")
    if (!participantId) {
      console.error("[Strategy] No participant ID found")
      alert("Participant not registered. Please refresh the page.")
      return
    }

    const payload = {
      phase: "strategy",
      participantId,
      data: {
        completed: true,
        answers: finalAnswers,
        questionsAnswered: Object.keys(finalAnswers).length,
        totalQuestions: strategyQuestions.length,
        timeUsed: timeTracker.getCurrentTime()?.elapsed || 0,
        questionTimes: Object.entries(finalAnswers).map(([questionId, answer]) => ({
          questionId: Number(questionId),
          timeSpent: answer.timeSpent || 0
        }))
      }
    }
  
    try {
      const res = await fetch(`${API_BASE}/api/v1/ingest-phase`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      })
  
      if (!res.ok) throw new Error("Failed to submit strategy phase")
  
      updateParticipantData({ strategy: payload.data })
      onNext()
    } catch (err) {
      console.error("[Strategy] Submission failed:", err)
      updateParticipantData({ strategy: payload.data })
      onNext()
    }
  }
  

  const wordCount = (text: string) => {
    return text.trim().split(/\s+/).filter(word => word.length > 0).length
  }

  if (showInstructions) {
    return (
      <div className="max-w-7xl mx-auto">
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center">
              <MessageSquare className="h-6 w-6 mr-2 text-blue-600" />
              Strategy Questions
            </CardTitle>
          </CardHeader>

          <CardContent className="space-y-6">
            <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-8 rounded-xl">
              <h3 className="text-2xl font-bold text-gray-900 mb-6">Before revealing your final score...</h3>
              
              <div className="text-left space-y-4 text-gray-700 mb-6">
                <p className="text-lg">
                  Before revealing your final score, we ask you to complete in words, as best as you can, a list of questions around your self-evaluation and your thought process during the test.
                </p>
                
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <p className="text-yellow-800 font-medium">
                    <strong>Prize Opportunity:</strong> For every text response you give, we will evaluate (by both humans and an AI) how insightful your solutions are. We will randomly pick 3 fellow test takers in the top quarter of insightfulness of answers.
                  </p>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h4 className="font-semibold text-blue-900 mb-2">Writing Guidelines:</h4>
                  <ul className="text-blue-800 space-y-1">
                    <li>• Confine your responses to 150-200 words per question</li>
                    <li>• Shorter answers are perfectly acceptable - no penalty for brevity</li>
                    <li>• Focus on being insightful about your thought process</li>
                    <li>• Be honest about your strategies and challenges</li>
                  </ul>
                </div>
              </div>

              <Button onClick={() => setShowInstructions(false)} size="lg" className="bg-blue-600 hover:bg-blue-700">
                Begin Strategy Questions
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (isComplete) {
    const answeredQuestions = Object.keys(answers).length
    const totalWords = Object.values(answers).reduce((sum, answer) => sum + wordCount(answer.text || ''), 0)

    return (
      <div className="max-w-7xl mx-auto">
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center">
              <CheckCircle className="h-6 w-6 mr-2 text-green-600" />
              Strategy Questions Complete
            </CardTitle>
          </CardHeader>

          <CardContent className="space-y-6">
            <div className="text-center">
              <div className="bg-gradient-to-r from-green-50 to-blue-50 p-8 rounded-xl">
                <h3 className="text-2xl font-bold text-gray-900 mb-6">Thank you for your insights!</h3>

                <div className="grid md:grid-cols-3 gap-6 mb-6">
                  <div className="bg-white p-4 rounded-lg shadow-sm">
                    <div className="text-3xl font-bold text-green-600">{answeredQuestions}</div>
                    <div className="text-sm text-gray-600">Questions Answered</div>
                  </div>

                  <div className="bg-white p-4 rounded-lg shadow-sm">
                    <div className="text-3xl font-bold text-blue-600">{totalWords}</div>
                    <div className="text-sm text-gray-600">Total Words</div>
                  </div>

                  <div className="bg-white p-4 rounded-lg shadow-sm">
                    <div className="text-3xl font-bold text-purple-600">{Math.round(totalWords / Math.max(answeredQuestions, 1))}</div>
                    <div className="text-sm text-gray-600">Avg Words/Question</div>
                  </div>
                </div>

                <div className="bg-green-100 border border-green-300 rounded-lg p-4 mb-6">
                  <p className="text-green-800 font-medium">
                    Your responses have been recorded and will be evaluated for insightfulness. 
                    
                  </p>
                </div>

                <Button onClick={completePhase} size="lg" className="bg-blue-600 hover:bg-blue-700">
                  Continue to Final Test
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  const question = strategyQuestions[currentQuestion]
  const currentAnswer = answers[question.id]?.text || ""
  const currentWordCount = wordCount(currentAnswer)
  const progress = ((currentQuestion + 1) / strategyQuestions.length) * 100

  return (
    <div className="max-w-7xl mx-auto">
      {/* Progress indicator */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-medium text-gray-700">Question {currentQuestion + 1} of {strategyQuestions.length}</span>
          <span className="text-sm text-gray-500">{currentWordCount} words</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <motion.div 
            className="bg-blue-600 h-2 rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
      </div>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Target className="h-6 w-6 mr-2 text-blue-600" />
            Strategy Question {currentQuestion + 1}
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-6">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">{question.question}</h3>
            
            <Textarea
              value={currentAnswer}
              onChange={(e) => handleAnswerChange(question.id, e.target.value)}
              placeholder={question.placeholder}
              className="min-h-[200px] text-base"
            />
            
            <div className="flex justify-between items-center mt-3">
              <span className={`text-sm ${currentWordCount > 200 ? 'text-red-600' : currentWordCount > 150 ? 'text-yellow-600' : 'text-gray-500'}`}>
                {currentWordCount} words {currentWordCount > 200 && '(over 200 word limit)'}
              </span>
              <span className="text-xs text-gray-400">Target: 150-200 words</span>
            </div>
          </div>

          <div className="flex justify-between items-center">
            <Button
              variant="outline"
              onClick={previousQuestion}
              disabled={currentQuestion === 0}
            >
              Previous
            </Button>

            <div className="text-sm text-gray-500">
              Question {currentQuestion + 1} of {strategyQuestions.length}
            </div>

            <Button
              onClick={nextQuestion}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {currentQuestion === strategyQuestions.length - 1 ? 'Finish' : 'Next'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
