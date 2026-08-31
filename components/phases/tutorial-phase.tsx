"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ArrowRight, Package, Coins, Weight, HelpCircle, Target, CheckCircle, AlertCircle, XCircle } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import KnapsackQuestion from "@/components/knapsack-question"

interface TutorialPhaseProps {
  onNext: () => void
  participantData: any
  updateParticipantData: (data: any) => void
}

const sampleQuestions = [
  {
    id: 1,
    capacity: 12,
    balls: [
      { id: 1, weight: 2, reward: 10, color: "bg-red-500" },
      { id: 2, weight: 3, reward: 12, color: "bg-blue-500" },
      { id: 3, weight: 3, reward: 11, color: "bg-green-500" },
      { id: 4, weight: 4, reward: 13, color: "bg-yellow-500" },
      { id: 5, weight: 7, reward: 6, color: "bg-purple-500" },
      { id: 6, weight: 9, reward: 4, color: "bg-pink-500" }
    ],
    solution: [1, 2, 3, 4],
    explanation: "Select balls 1, 2, 3 and 4 for a total weight of 12 (= capacity) and maximum points of 46.",
  },
  {
    id: 2,
    capacity: 16,
    balls: [
      { id: 1, weight: 2, reward: 9, color: "bg-red-500" },
      { id: 2, weight: 3, reward: 11, color: "bg-blue-500" },
      { id: 3, weight: 4, reward: 13, color: "bg-green-500" },
      { id: 4, weight: 7, reward: 15, color: "bg-yellow-500" },
      { id: 5, weight: 8, reward: 5, color: "bg-purple-500" },
      { id: 6, weight: 11, reward: 3, color: "bg-pink-500" }
    ],
    solution: [1, 2, 3, 4],
    explanation: "Select balls 1, 2, 3 and 4 for a total weight of 16 (= capacity) and maximum points of 48.",
  },
]

// Interactive example questions for tutorial
// Optimal solutions fill the capacity exactly to reinforce the concept
const exampleQuestions = [
  {
    id: "tutorial1",
    capacity: 14,
    balls: [
      { id: 1, weight: 2, reward: 8, color: "bg-red-500" },
      { id: 2, weight: 3, reward: 10, color: "bg-blue-500" },
      { id: 3, weight: 4, reward: 12, color: "bg-green-500" },
      { id: 4, weight: 5, reward: 14, color: "bg-yellow-500" },
      { id: 5, weight: 7, reward: 6, color: "bg-purple-500" },
      { id: 6, weight: 9, reward: 4, color: "bg-pink-500" }
    ],
    solution: [1, 2, 3, 4], // weight=14 (=capacity), reward=44
    title: "Example 1"
  },
  {
    id: "tutorial2",
    capacity: 18,
    balls: [
      { id: 1, weight: 3, reward: 12, color: "bg-red-500" },
      { id: 2, weight: 4, reward: 14, color: "bg-blue-500" },
      { id: 3, weight: 5, reward: 16, color: "bg-green-500" },
      { id: 4, weight: 6, reward: 18, color: "bg-yellow-500" },
      { id: 5, weight: 8, reward: 7, color: "bg-purple-500" },
      { id: 6, weight: 10, reward: 5, color: "bg-pink-500" }
    ],
    solution: [1, 2, 3, 4], // weight=18 (=capacity), reward=60
    title: "Example 2"
  }
]

function DynamicExample() {
  const [currentExampleIndex, setCurrentExampleIndex] = useState(0)
  const [selectedBalls, setSelectedBalls] = useState<number[]>([])
  const [feedback, setFeedback] = useState<{
    type: "none" | "success" | "too_heavy" | "suboptimal"
    message: string
  }>({ type: "none", message: "" })

  const currentExample = exampleQuestions[currentExampleIndex]

  const currentWeight = selectedBalls.reduce(
    (sum, ballId) => sum + currentExample.balls.find(b => b.id === ballId)!.weight,
    0
  )
  const currentReward = selectedBalls.reduce(
    (sum, ballId) => sum + currentExample.balls.find(b => b.id === ballId)!.reward,
    0
  )

  const resetExample = () => {
    setSelectedBalls([])
    setFeedback({ type: "none", message: "" })
  }

  const nextExample = () => {
    if (currentExampleIndex < exampleQuestions.length - 1) {
      setCurrentExampleIndex(currentExampleIndex + 1)
      resetExample()
    }
  }

  const prevExample = () => {
    if (currentExampleIndex > 0) {
      setCurrentExampleIndex(currentExampleIndex - 1)
      resetExample()
    }
  }

  const toggleBall = (ballId: number) => {
    const newSelection = selectedBalls.includes(ballId)
      ? selectedBalls.filter(id => id !== ballId)
      : [...selectedBalls, ballId]

    setSelectedBalls(newSelection)

    // Calculate feedback
    const newWeight = newSelection.reduce(
      (sum, id) => sum + currentExample.balls.find(b => b.id === id)!.weight,
      0
    )
    const newReward = newSelection.reduce(
      (sum, id) => sum + currentExample.balls.find(b => b.id === id)!.reward,
      0
    )

    // Check if weight exceeds capacity
    if (newWeight > currentExample.capacity) {
      setFeedback({
        type: "too_heavy",
        message: "Oops, the balls are too heavy! Try a different combination."
      })
      return
    }

    // Calculate optimal reward from known solution
    const optimalReward = currentExample.solution.reduce(
      (sum, id) => sum + currentExample.balls.find(b => b.id === id)!.reward,
      0
    )

    // Check optimality by comparing REWARD values (not exact IDs)
    // This correctly handles alternative optimal combinations
    if (newReward >= optimalReward) {
      setFeedback({
        type: "success",
        message: "Nice! This is just right! You found the optimal solution."
      })
    } else if (newSelection.length > 0) {
      setFeedback({
        type: "suboptimal",
        message: "Oops, some other combination will give you more points!"
      })
    } else {
      setFeedback({ type: "none", message: "" })
    }
  }

  return (
    <div className="space-y-4">
      {/* Example navigation */}
      <div className="flex items-center justify-between">
        <h4 className="text-lg font-semibold">{currentExample.title}</h4>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={prevExample}
            disabled={currentExampleIndex === 0}
          >
            Previous
          </Button>
          <span className="text-sm text-gray-600">
            {currentExampleIndex + 1} of {exampleQuestions.length}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={nextExample}
            disabled={currentExampleIndex === exampleQuestions.length - 1}
          >
            Next
          </Button>
        </div>
      </div>

      <Card className="border-2 border-gray-300">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center">
              <Package className="h-5 w-5 mr-2" />
              Capacity: {currentExample.capacity}
            </span>
            <Badge variant="secondary">
              Weight: {currentWeight}/{currentExample.capacity}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Balls display */}
          <div className="grid grid-cols-3 gap-3">
            {currentExample.balls.map((ball) => (
              <motion.div
                key={ball.id}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => toggleBall(ball.id)}
                className={`
                  relative cursor-pointer rounded-lg p-3 border-2 transition-all
                  ${selectedBalls.includes(ball.id)
                    ? "border-gray-800 shadow-lg ring-2 ring-blue-500"
                    : "border-gray-300 hover:border-gray-400"
                  }
                `}
              >
                <div
                  className={`w-8 h-8 rounded-full ${ball.color} mx-auto mb-2 flex items-center justify-center text-white font-bold text-xs`}
                >
                  {ball.id}
                </div>
                <div className="text-center">
                  <div className="font-bold text-sm">W: {ball.weight}</div>
                  <div className="text-yellow-600 font-bold text-sm">P: {ball.reward}</div>
                </div>
                {selectedBalls.includes(ball.id) && (
                  <div className="absolute -top-1 -right-1 w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                    <CheckCircle className="w-3 h-3 text-white" />
                  </div>
                )}
              </motion.div>
            ))}
          </div>

          {/* Current selection summary */}
          <div className="bg-gray-100 p-3 rounded-lg text-sm">
            <div className="flex justify-between items-center">
              <span className="font-medium">Selected:</span>
              <span className="text-gray-600">
                {selectedBalls.length > 0 ? selectedBalls.join(", ") : "None"}
              </span>
            </div>
            <div className="flex justify-between items-center mt-1">
              <span className="font-medium">Points:</span>
              <span className="text-yellow-600 font-bold">{currentReward} points</span>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={resetExample}
              disabled={selectedBalls.length === 0}
            >
              Reset
            </Button>
          </div>

          {/* Feedback */}
          <AnimatePresence mode="wait">
            {feedback.type !== "none" && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className={`p-3 rounded-lg border-2 text-sm ${feedback.type === "success"
                  ? "bg-green-50 border-green-200 text-green-800"
                  : feedback.type === "too_heavy"
                    ? "bg-red-50 border-red-200 text-red-800"
                    : "bg-orange-50 border-orange-200 text-orange-800"
                  }`}
              >
                <div className="flex items-center">
                  {feedback.type === "success" && (
                    <CheckCircle className="h-4 w-4 mr-2 text-green-600" />
                  )}
                  {feedback.type === "too_heavy" && (
                    <XCircle className="h-4 w-4 mr-2 text-red-600" />
                  )}
                  {feedback.type === "suboptimal" && (
                    <AlertCircle className="h-4 w-4 mr-2 text-orange-600" />
                  )}
                  <span className="font-medium">{feedback.message}</span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </CardContent>
      </Card>
    </div>
  )
}

export default function TutorialPhase({ onNext }: TutorialPhaseProps) {
  const [currentStep, setCurrentStep] = useState(0)
  const [showSamples, setShowSamples] = useState(false)
  const [currentSample, setCurrentSample] = useState(0)

  const steps = [
    {
      title: "Welcome to the Knapsack Experiment",
      content: (
        <div className="max-w-4xl mx-auto space-y-8">
          {/* Introduction Section */}
          <div className="text-center space-y-6">
            <div className="bg-gradient-to-r from-blue-50 to-green-50 p-8 rounded-xl border-2 border-blue-200">
              <div className="space-y-6">
                <div className="flex items-center justify-center space-x-3">
                  <Package className="h-8 w-8 text-blue-600" />
                  <h2 className="text-3xl font-bold text-gray-900">The Knapsack Problem</h2>
                </div>

                <p className="text-xl text-gray-700 max-w-3xl mx-auto leading-relaxed">
                  You will be answering a series of questions, each presenting what's called a "knapsack problem."
                  These are classic optimization puzzles where you need to make strategic choices to maximize your score.
                </p>
              </div>
            </div>
            </div>
        </div>
      ),
    },
    {
      title: "What is a knapsack problem?",
      content: (
        <div className="grid lg:grid-cols-2 gap-8">
          {/* Left Column - Instructions */}
          <div className="space-y-6">

            {/* How the problem works */}
            <div>
              <h3 className="text-lg font-semibold mb-4">In every question, you will see:</h3>
              <div className="space-y-4">
                <Card className="border-2 border-blue-200">
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center text-base">
                      <Package className="h-4 w-4 mr-2 text-blue-600" />A Knapsack
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <p className="text-gray-600 text-sm">
                      Has a <strong>capacity (C)</strong> - the maximum weight it can hold
                    </p>
                    <div className="mt-2 p-2 bg-blue-50 rounded-lg">
                      <span className="text-xs font-medium">Example: Capacity = 10</span>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-2 border-green-200">
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center text-base">
                      <Coins className="h-4 w-4 mr-2 text-green-600" />
                      Colored Balls
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <p className="text-gray-600 mb-2 text-sm">Each ball has two properties:</p>
                    <div className="space-y-1">
                      <div className="flex items-center">
                        <Weight className="h-3 w-3 mr-2 text-gray-500" />
                        <span className="text-xs">
                          <strong>Weight (W):</strong> How heavy it is
                        </span>
                      </div>
                      <div className="flex items-center">
                        <Coins className="h-3 w-3 mr-2 text-yellow-500" />
                        <span className="text-xs">
                          <strong>Points (P):</strong> Points you earn
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Goal explanation */}
                <div className="bg-yellow-50 border-2 border-yellow-300 rounded-lg p-4 mt-4">
                  <p className="text-base sm:text-lg font-extrabold text-yellow-900 mb-2">
                    Your goal
                  </p>
                  <ul className="list-disc list-inside text-sm sm:text-base text-yellow-900 space-y-1">
                    <li>Select balls to be placed in the knapsack.</li>
                    <li>Maximize the combined points.</li>
                    <li>Keep the total weight below the knapsack’s capacity.</li>
                  </ul>
                </div>
              </div>
            </div>

          </div>

          {/* Right Column - Dynamic Interactive Example */}
          <div className="bg-gray-50 p-6 rounded-xl border-2 border-gray-200">
            <h3 className="text-xl font-bold text-gray-900 mb-4 text-center">Try it yourself!</h3>
            <p className="text-center text-gray-700 mb-6">
              Here's what a question will look like. Click on the balls to select them and see what happens:
            </p>
            <DynamicExample />
          </div>
        </div>
      ),
    },
    {
      title: "Your Goals and Scoring",
      content: (
        <div className="max-w-4xl mx-auto space-y-8">
          <div className="bg-gradient-to-r from-yellow-50 to-orange-50 p-8 rounded-xl border-2 border-yellow-200">
            <h3 className="text-2xl font-bold text-gray-900 mb-6">Before showing you more knapsack problems, somethings to note:</h3>
            <ol className="text-lg text-gray-700 space-y-4 list-decimal list-inside ml-4">
              <li><strong>No partial credit:</strong> you must achieve the highest possible points while keeping combined weight under capacity for your answer to be considered correct</li>
              <li>There is a weight/points counter on every question to help you.</li>
            </ol>
          </div>
        </div>
      ),
    },
  ]

  const nextStep = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1)
    } else {
      setShowSamples(true)
    }
  }

  const nextSample = () => {
    if (currentSample < sampleQuestions.length - 1) {
      setCurrentSample(currentSample + 1)
    } else {
      onNext()
    }
  }

  if (showSamples) {
    const question = sampleQuestions[currentSample]

    return (
      <div className="max-w-7xl mx-auto">
        <Card className="shadow-lg">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center text-2xl">
                <HelpCircle className="h-8 w-8 mr-3 text-blue-600" />
                Sample Question {currentSample + 1} of {sampleQuestions.length}
              </CardTitle>
              <Badge variant="outline" className="text-lg px-4 py-2">Tutorial</Badge>
            </div>
          </CardHeader>

          <CardContent className="space-y-8 p-8">
            <KnapsackQuestion question={question} showSolution={true} isInteractive={false} />

            <div className="flex justify-between">
              <Button
                variant="outline"
                onClick={() => setCurrentSample(Math.max(0, currentSample - 1))}
                disabled={currentSample === 0}
              >
                Previous Example
              </Button>

              <Button onClick={nextSample}>
                {currentSample === sampleQuestions.length - 1 ? "Start Practice" : "Next Example"}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto">
      <Card className="shadow-lg">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-3xl font-bold">{steps[currentStep].title}</CardTitle>
            <Badge variant="outline" className="text-lg px-4 py-2">
              Step {currentStep + 1} of {steps.length}
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="p-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              {steps[currentStep].content}
            </motion.div>
          </AnimatePresence>

          <div className="flex justify-between mt-8">
            <Button
              variant="outline"
              onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
              disabled={currentStep === 0}
            >
              Previous
            </Button>

            <Button onClick={nextStep}>
              {currentStep === steps.length - 1 ? "See Examples" : "Next"}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
