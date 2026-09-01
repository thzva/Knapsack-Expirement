"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Brain } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import KnapsackQuestion from "@/components/knapsack-question"

interface MetaAnalysisPhaseProps {
  onNext: () => void
  participantData: any
  updateParticipantData: (data: any) => void
}

// Sample questions for difficulty classification
const classificationQuestions = [
  {
    id: 1,
    capacity: 15,
    balls: [
      { id: 1, weight: 8, reward: 24, color: "bg-red-500" },
      { id: 2, weight: 6, reward: 18, color: "bg-blue-500" },
      { id: 3, weight: 5, reward: 15, color: "bg-green-500" },
    ],
    correctDifficulty: "easy",
    difficulty: "easy",
  },
  {
    id: 2,
    capacity: 25,
    balls: [
      { id: 1, weight: 15, reward: 45, color: "bg-purple-500" },
      { id: 2, weight: 12, reward: 36, color: "bg-yellow-500" },
      { id: 3, weight: 10, reward: 30, color: "bg-pink-500" },
      { id: 4, weight: 8, reward: 24, color: "bg-indigo-500" },
      { id: 5, weight: 6, reward: 18, color: "bg-orange-500" },
    ],
    correctDifficulty: "medium",
    difficulty: "medium",
  },
  {
    id: 3,
    capacity: 40,
    balls: [
      { id: 1, weight: 25, reward: 75, color: "bg-red-500" },
      { id: 2, weight: 20, reward: 60, color: "bg-blue-500" },
      { id: 3, weight: 18, reward: 54, color: "bg-green-500" },
      { id: 4, weight: 15, reward: 45, color: "bg-yellow-500" },
      { id: 5, weight: 12, reward: 36, color: "bg-purple-500" },
      { id: 6, weight: 10, reward: 30, color: "bg-pink-500" },
    ],
    correctDifficulty: "hard",
    difficulty: "hard",
  },
  {
    id: 4,
    capacity: 12,
    balls: [
      { id: 1, weight: 6, reward: 18, color: "bg-teal-500" },
      { id: 2, weight: 4, reward: 12, color: "bg-rose-500" },
      { id: 3, weight: 3, reward: 9, color: "bg-cyan-500" },
    ],
    correctDifficulty: "easy",
    difficulty: "easy",
  },
  {
    id: 5,
    capacity: 35,
    balls: [
      { id: 1, weight: 20, reward: 60, color: "bg-amber-500" },
      { id: 2, weight: 18, reward: 54, color: "bg-emerald-500" },
      { id: 3, weight: 15, reward: 45, color: "bg-violet-500" },
      { id: 4, weight: 12, reward: 36, color: "bg-sky-500" },
      { id: 5, weight: 10, reward: 30, color: "bg-stone-500" },
    ],
    correctDifficulty: "hard",
    difficulty: "hard",
  },
  {
    id: 6,
    capacity: 20,
    balls: [
      { id: 1, weight: 10, reward: 30, color: "bg-red-500" },
      { id: 2, weight: 8, reward: 24, color: "bg-blue-500" },
      { id: 3, weight: 6, reward: 18, color: "bg-green-500" },
      { id: 4, weight: 5, reward: 15, color: "bg-yellow-500" },
    ],
    correctDifficulty: "medium",
    difficulty: "medium",
  },
  {
    id: 7,
    capacity: 18,
    balls: [
      { id: 1, weight: 9, reward: 27, color: "bg-purple-500" },
      { id: 2, weight: 7, reward: 21, color: "bg-pink-500" },
      { id: 3, weight: 6, reward: 18, color: "bg-indigo-500" },
      { id: 4, weight: 5, reward: 15, color: "bg-orange-500" },
    ],
    correctDifficulty: "medium",
    difficulty: "medium",
  },
  {
    id: 8,
    capacity: 10,
    balls: [
      { id: 1, weight: 5, reward: 15, color: "bg-teal-500" },
      { id: 2, weight: 4, reward: 12, color: "bg-rose-500" },
      { id: 3, weight: 3, reward: 9, color: "bg-cyan-500" },
    ],
    correctDifficulty: "easy",
    difficulty: "easy",
  },
  {
    id: 9,
    capacity: 30,
    balls: [
      { id: 1, weight: 18, reward: 54, color: "bg-amber-500" },
      { id: 2, weight: 15, reward: 45, color: "bg-emerald-500" },
      { id: 3, weight: 12, reward: 36, color: "bg-violet-500" },
      { id: 4, weight: 10, reward: 30, color: "bg-sky-500" },
      { id: 5, weight: 8, reward: 24, color: "bg-stone-500" },
    ],
    correctDifficulty: "hard",
    difficulty: "hard",
  },
  {
    id: 10,
    capacity: 22,
    balls: [
      { id: 1, weight: 12, reward: 36, color: "bg-red-500" },
      { id: 2, weight: 10, reward: 30, color: "bg-blue-500" },
      { id: 3, weight: 8, reward: 24, color: "bg-green-500" },
      { id: 4, weight: 6, reward: 18, color: "bg-yellow-500" },
    ],
    correctDifficulty: "medium",
    difficulty: "medium",
  },
]

export default function MetaAnalysisPhase({ onNext, updateParticipantData }: MetaAnalysisPhaseProps) {
  const [currentQuestion, setCurrentQuestion] = useState(0)
  const [classifications, setClassifications] = useState<{ [key: number]: string }>({})
  const [showInstructions, setShowInstructions] = useState(true)
  const [isComplete, setIsComplete] = useState(false)

  const handleClassification = (difficulty: string) => {
    const questionId = classificationQuestions[currentQuestion].id
    setClassifications((prev) => ({
      ...prev,
      [questionId]: difficulty,
    }))

    if (currentQuestion < classificationQuestions.length - 1) {
      setCurrentQuestion(currentQuestion + 1)
    } else {
      completePhase()
    }
  }

  const completePhase = () => {
    setIsComplete(true)
    const correctClassifications = Object.entries(classifications).filter(([id, classification]) => {
      const question = classificationQuestions.find((q) => q.id === Number.parseInt(id))
      return question && question.correctDifficulty === classification
    }).length

    const totalPoints =
      correctClassifications * 2 + (classificationQuestions.length - Object.keys(classifications).length) * 1

    updateParticipantData({
      metaAnalysis: {
        completed: true,
        correctClassifications,
        totalQuestions: classificationQuestions.length,
        totalPoints,
        classifications,
      },
    })
  }

  if (showInstructions) {
    return (
      <div className="max-w-7xl mx-auto">
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Brain className="h-6 w-6 mr-2 text-indigo-600" />
              Question Analysis - Instructions
            </CardTitle>
          </CardHeader>

          <CardContent className="space-y-6">
            <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-indigo-800 mb-4">Difficulty Classification Task</h3>

              <div className="space-y-4 text-indigo-700">
                <p>
                  Now we'll reveal that the questions were specially designed in{" "}
                  <strong>three levels of difficulty</strong>: Easy, Medium, and Hard.
                </p>

                <p>
                  You will see <strong>10 knapsack questions</strong> and classify each one as Easy, Medium, or Hard
                  based on your perception of their difficulty.
                </p>

                <div className="grid md:grid-cols-3 gap-4">
                  <div className="bg-white p-4 rounded-lg">
                    <h4 className="font-semibold mb-2 text-green-700">🟢 Easy</h4>
                    <ul className="text-sm space-y-1">
                      <li>• Few balls (3-4)</li>
                      <li>• Small capacity</li>
                      <li>• Clear optimal choices</li>
                      <li>• Quick to solve</li>
                    </ul>
                  </div>

                  <div className="bg-white p-4 rounded-lg">
                    <h4 className="font-semibold mb-2 text-yellow-700">🟡 Medium</h4>
                    <ul className="text-sm space-y-1">
                      <li>• Moderate balls (4-5)</li>
                      <li>• Medium capacity</li>
                      <li>• Some trade-offs</li>
                      <li>• Requires thinking</li>
                    </ul>
                  </div>

                  <div className="bg-white p-4 rounded-lg">
                    <h4 className="font-semibold mb-2 text-red-700">🔴 Hard</h4>
                    <ul className="text-sm space-y-1">
                      <li>• Many balls (5-6)</li>
                      <li>• Large capacity</li>
                      <li>• Complex trade-offs</li>
                      <li>• Time-consuming</li>
                    </ul>
                  </div>
                </div>

                <div className="bg-green-100 border border-green-300 rounded-lg p-4">
                  <p className="text-green-800 font-medium">
                    🎯 <strong>Scoring:</strong> 2 points for correct classification, 1 point for no answer, 0 points
                    for incorrect.
                  </p>
                </div>
              </div>
            </div>

            <div className="text-center">
              <Button
                onClick={() => setShowInstructions(false)}
                size="lg"
                className="bg-indigo-600 hover:bg-indigo-700"
              >
                <Brain className="h-5 w-5 mr-2" />
                Start Classification Task
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (isComplete) {
    const correctClassifications = Object.entries(classifications).filter(([id, classification]) => {
      const question = classificationQuestions.find((q) => q.id === Number.parseInt(id))
      return question && question.correctDifficulty === classification
    }).length

    const totalPoints =
      correctClassifications * 2 + (classificationQuestions.length - Object.keys(classifications).length) * 1

    return (
      <div className="max-w-7xl mx-auto">
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Brain className="h-6 w-6 mr-2 text-green-600" />
              Classification Complete!
            </CardTitle>
          </CardHeader>

          <CardContent className="space-y-6">
            <div className="text-center">
              <div className="bg-gray-50 p-8 rounded-xl">
                <h3 className="text-2xl font-bold text-gray-900 mb-6">Classification Results</h3>

                <div className="grid md:grid-cols-3 gap-4 mb-6">
                  <div className="bg-white p-4 rounded-lg shadow-sm">
                    <div className="text-3xl font-bold text-green-600">{correctClassifications}</div>
                    <div className="text-sm text-gray-600">Correct Classifications</div>
                  </div>

                  <div className="bg-white p-4 rounded-lg shadow-sm">
                    <div className="text-3xl font-bold text-blue-600">{classificationQuestions.length}</div>
                    <div className="text-sm text-gray-600">Total Questions</div>
                  </div>

                  <div className="bg-white p-4 rounded-lg shadow-sm border-2 border-indigo-500">
                    <div className="text-3xl font-bold text-indigo-600">{totalPoints}</div>
                    <div className="text-sm text-gray-600">Points Earned</div>
                  </div>
                </div>

                <div className="bg-indigo-100 border border-indigo-300 rounded-lg p-4 mb-6">
                  <p className="text-indigo-800 font-medium">
                    You correctly classified{" "}
                    <strong>
                      {correctClassifications} out of {classificationQuestions.length}
                    </strong>{" "}
                    questions!
                  </p>
                  <p className="text-indigo-700 text-sm mt-1">
                    Accuracy: {((correctClassifications / classificationQuestions.length) * 100).toFixed(1)}%
                  </p>
                </div>

                <Button onClick={onNext} size="lg">
                  View Final Results
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  const question = classificationQuestions[currentQuestion]
  const progress = ((currentQuestion + 1) / classificationQuestions.length) * 100

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Progress */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">
              Question {currentQuestion + 1} of {classificationQuestions.length}
            </span>
            <Badge variant="outline">No Time Limit</Badge>
          </div>
          <Progress value={progress} className="h-2" />
        </CardContent>
      </Card>

      {/* Instructions */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
        <p className="text-blue-800 font-medium">
          Look at this knapsack question and classify it as <strong>Easy</strong>, <strong>Medium</strong>, or{" "}
          <strong>Hard</strong>
        </p>
      </div>

      {/* Question Display */}
      <AnimatePresence mode="wait">
        <motion.div
          key={`question-${currentQuestion}`}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
        >
          <KnapsackQuestion question={question} isInteractive={false} showSolution={false} />
        </motion.div>
      </AnimatePresence>

      {/* Classification Buttons */}
      <Card>
        <CardContent className="p-6">
          <h3 className="text-lg font-semibold text-center mb-6">How would you classify this question's difficulty?</h3>

          <div className="grid md:grid-cols-3 gap-4">
            <Button
              onClick={() => handleClassification("easy")}
              size="lg"
              className="h-20 bg-green-600 hover:bg-green-700 text-white flex flex-col"
            >
              <span className="text-2xl mb-1">🟢</span>
              <span className="text-lg font-bold">Easy</span>
            </Button>

            <Button
              onClick={() => handleClassification("medium")}
              size="lg"
              className="h-20 bg-yellow-600 hover:bg-yellow-700 text-white flex flex-col"
            >
              <span className="text-2xl mb-1">🟡</span>
              <span className="text-lg font-bold">Medium</span>
            </Button>

            <Button
              onClick={() => handleClassification("hard")}
              size="lg"
              className="h-20 bg-red-600 hover:bg-red-700 text-white flex flex-col"
            >
              <span className="text-2xl mb-1">🔴</span>
              <span className="text-lg font-bold">Hard</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
