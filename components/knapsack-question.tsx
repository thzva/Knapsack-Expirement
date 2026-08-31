"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Package, Coins, Weight, CheckCircle, Zap, Star, Target, ShoppingBag } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { timeTracker } from "@/lib/time-tracker"

interface Ball {
  id: number
  weight: number
  reward: number
  color: string
}

interface Question {
  id: number
  capacity: number
  balls: Ball[]
  solution?: number[]
  explanation?: string
}

interface KnapsackQuestionProps {
  question: Question
  onAnswer?: (selectedBalls: number[], isCorrect: boolean) => void
  onSkip?: () => void
  showSolution?: boolean
  isInteractive?: boolean
  isTestMode?: boolean
  timeLimit?: number
  onTimeUp?: () => void
  initialSelection?: number[]
  isConfirmed?: boolean
  // Fires on every toggle (pre-confirm). Parent uses this to keep the draft
  // selection alive across question navigations.
  onSelectionChange?: (selectedBalls: number[]) => void
}

export default function KnapsackQuestion({
  question,
  onAnswer,
  onSkip,
  showSolution = false,
  isInteractive = true,
  onSelectionChange,
  isTestMode = false,
  timeLimit,
  onTimeUp,
  initialSelection = [],
  isConfirmed = false,
}: KnapsackQuestionProps) {
  const [selectedBalls, setSelectedBalls] = useState<number[]>(initialSelection)
  const [submitted, setSubmitted] = useState(isConfirmed)
  const [timeLeft, setTimeLeft] = useState(timeLimit || 0)
  const [showWarning, setShowWarning] = useState(false)

  // Reset selection when question changes
  useEffect(() => {
    setSelectedBalls(initialSelection)
    setSubmitted(isConfirmed)
  }, [question.id]) // Only depend on question.id, not the arrays

  // Update the timer useEffect to be more stable
  useEffect(() => {
    if (timeLimit && timeLeft > 0 && !submitted) {
      const timer = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 16 && prev > 15) {
            setShowWarning(true)
          }
          if (prev <= 1) {
            onTimeUp?.()
            return 0
          }
          return prev - 1
        })
      }, 1000)

      return () => clearInterval(timer)
    }
  }, [timeLimit, submitted]) // Remove timeLeft from dependencies to prevent loops

  // Add a separate useEffect to initialize timer
  useEffect(() => {
    if (timeLimit) {
      setTimeLeft(timeLimit)
    }
  }, [timeLimit])

  const toggleBall = (ballId: number) => {
    if (!isInteractive || submitted) {
      console.log("Cannot toggle - not interactive or already submitted")
      return
    }

    setSelectedBalls((prev) => {
      const wasSelected = prev.includes(ballId)
      const newSelection = wasSelected ? prev.filter((id) => id !== ballId) : [...prev, ballId]
      // Record the click for later analysis (final selection ≠ click history).
      // Buffered in-memory; phase-end handler ships it via ingest-phase to avoid per-click HTTP.
      timeTracker.logInteraction('ball_toggle', {
        questionId: question.id,
        ballId,
        action: wasSelected ? 'deselect' : 'select',
        selectionAfter: newSelection,
        clickIndex: prev.length,
      })
      // Bubble draft selection up so parent can persist it across navigations.
      onSelectionChange?.(newSelection)
      return newSelection
    })
  }

  const calculateTotals = (ballIds: number[]) => {
    return ballIds.reduce(
      (acc, id) => {
        const ball = question.balls.find((b) => b.id === id)
        if (ball) {
          acc.weight += ball.weight
          acc.reward += ball.reward
        }
        return acc
      },
      { weight: 0, reward: 0 },
    )
  }

  const currentTotals = calculateTotals(selectedBalls)
  const solutionTotals = question.solution ? calculateTotals(question.solution) : null
  const isOverCapacity = currentTotals.weight > question.capacity

  const handleSubmit = () => {
    setSubmitted(true)
    
    let isCorrect = false
    if (question.solution && !isOverCapacity) {
      // Calculate optimal reward from the known solution
      const optimalReward = question.solution.reduce((sum, ballId) => {
        const ball = question.balls.find(b => b.id === ballId)
        return sum + (ball?.reward || 0)
      }, 0)
      
      // Calculate reward from selected balls
      const selectedReward = selectedBalls.reduce((sum, ballId) => {
        const ball = question.balls.find(b => b.id === ballId)
        return sum + (ball?.reward || 0)
      }, 0)
      
      // Accept any selection that achieves optimal reward and stays within capacity
      isCorrect = selectedReward === optimalReward
    }

    onAnswer?.(selectedBalls, isCorrect)
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, "0")}`
  }

  return (
    <div className="space-y-6">
      {/* Timer */}
      {timeLimit && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex justify-center"
        >
          <div className={`px-4 py-2 rounded-xl border-2 shadow-lg ${
            timeLeft <= 15 ? "border-red-500 bg-red-50" : "border-blue-500 bg-blue-50"
          }`}>
            <div className="flex items-center space-x-3">
              <motion.div
                animate={{ scale: timeLeft <= 15 ? [1, 1.2, 1] : 1 }}
                transition={{ repeat: timeLeft <= 15 ? Infinity : 0, duration: 1 }}
                className={`w-3 h-3 rounded-full ${timeLeft <= 15 ? "bg-red-500" : "bg-blue-500"}`}
              />
              <span className={`font-mono text-lg font-bold ${timeLeft <= 15 ? "text-red-700" : "text-blue-700"}`}>
                {formatTime(timeLeft)}
              </span>
            </div>
          </div>
        </motion.div>
      )}

      {/* Warning */}
      <AnimatePresence>
        {showWarning && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-xl text-center"
          >
            ⚠️ 15 seconds remaining! Remember to confirm your answer!
          </motion.div>
        )}
      </AnimatePresence>

      {/* Question Display */}
      <div className="bg-gradient-to-br from-slate-50 to-gray-100 rounded-2xl p-6 border border-gray-200 shadow-lg">
        {/* Header Section */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center space-x-2 bg-white rounded-xl px-4 py-2 shadow-md border">
            <span className="text-sm font-medium text-gray-600">Capacity:</span>
            <span className="text-2xl font-bold text-gray-900">{question.capacity}</span>
          </div>
        </div>

        {/* Statistics Dashboard */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <motion.div
            whileHover={{ scale: 1.02 }}
            className={`p-4 rounded-xl border-2 transition-all duration-200 ${
              isTestMode || !isOverCapacity 
                ? "bg-blue-50 border-blue-200 text-blue-800" 
                : "bg-red-50 border-red-200 text-red-800"
            }`}
          >
            <div className="flex items-center space-x-3">
              <div className={`p-2 rounded-lg ${
                isTestMode || !isOverCapacity ? "bg-blue-100" : "bg-red-100"
              }`}>
                <Weight className="h-5 w-5" />
              </div>
              <div>
                <div className="text-xs font-medium opacity-80">Total Weight</div>
                <div className="text-2xl font-bold">
                  {currentTotals.weight} / {question.capacity}
                </div>
              </div>
            </div>
          </motion.div>

          <motion.div
            whileHover={{ scale: 1.02 }}
            className="p-4 rounded-xl bg-emerald-50 border-2 border-emerald-200 text-emerald-800"
          >
            <div className="flex items-center space-x-3">
              <div className="p-2 rounded-lg bg-emerald-100">
                <Coins className="h-5 w-5" />
              </div>
              <div>
                <div className="text-xs font-medium opacity-80">Total Points</div>
                <div className="text-2xl font-bold">{currentTotals.reward}</div>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Selection Instructions */}
        <div className="text-center mb-6">
          <p className="text-sm text-gray-600 bg-white/60 rounded-full px-4 py-2 inline-block">
            Click items to select • Selected: {selectedBalls.length} items
          </p>
        </div>

        {/* Items Grid */}
        <div className={`grid gap-4 mb-6 ${
          question.balls.length === 4 ? 'grid-cols-4' : 
          question.balls.length === 5 ? 'grid-cols-3' : 
          question.balls.length === 6 ? 'grid-cols-3' :
          'grid-cols-2 md:grid-cols-3'
        }`}>
          {question.balls.map((ball, index) => {
            const isSelected = selectedBalls.includes(ball.id)
            const isSolution = showSolution && question.solution?.includes(ball.id)

            return (
              <motion.div
                key={ball.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                whileHover={isInteractive && !submitted ? { 
                  scale: 1.05
                } : {}}
                whileTap={isInteractive && !submitted ? { scale: 0.95 } : {}}
                className="relative"
              >
                <div
                  className={`
                    relative p-4 rounded-2xl border-2 transition-all duration-300 cursor-pointer
                    ${isSelected
                      ? "bg-white border-blue-400 shadow-xl ring-4 ring-blue-200 ring-opacity-50"
                      : isSolution
                        ? "bg-white border-green-400 shadow-xl ring-4 ring-green-200 ring-opacity-50"
                        : "bg-white border-gray-200 shadow-md hover:shadow-lg hover:border-gray-300"
                    }
                    ${!isInteractive || submitted ? "cursor-default" : ""}
                  `}
                  onClick={() => toggleBall(ball.id)}
                >
                  {/* Item Circle */}
                  <div className="flex justify-center mb-2">
                    <div
                      className={`
                        w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-lg
                        ${ball.color}
                        ${isSelected ? "ring-4 ring-white ring-opacity-50" : ""}
                      `}
                    >
                      {ball.id}
                    </div>
                  </div>

                  {/* Item Stats */}
                  <div className="space-y-3">
                    <div className="text-center">
                      <div className="flex items-center justify-center space-x-2 mb-1">
                        <Weight className="h-5 w-5 text-gray-600" />
                        <span className="text-sm font-medium text-gray-600">Weight</span>
                      </div>
                      <div className="text-2xl font-bold text-gray-700">
                        {ball.weight}
                      </div>
                    </div>
                    
                    <div className="text-center">
                      <div className="flex items-center justify-center space-x-2 mb-1">
                        <Coins className="h-5 w-5 text-amber-600" />
                        <span className="text-sm font-medium text-amber-600">Points</span>
                      </div>
                      <div className="text-2xl font-bold text-amber-600">
                        {ball.reward}
                      </div>
                    </div>
                  </div>

                  {/* Selection Indicator */}
                  {isSelected && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="absolute -top-2 -right-2 w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center shadow-lg"
                    >
                      <CheckCircle className="w-4 h-4 text-white" />
                    </motion.div>
                  )}

                  {/* Solution Badge */}
                  {isSolution && !isSelected && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="absolute -top-2 -right-2"
                    >
                      <Badge className="bg-green-500 text-white text-xs">
                        Solution
                      </Badge>
                    </motion.div>
                  )}
                </div>
              </motion.div>
            )
          })}
        </div>

        {/* Action Buttons */}
        {isInteractive && !submitted && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex justify-center space-x-4"
          >
            <Button
              onClick={handleSubmit}
              disabled={selectedBalls.length === 0 || isOverCapacity}
              size="lg"
              title={isOverCapacity ? "Your selection exceeds the knapsack capacity. Remove items to confirm." : undefined}
              className={`
                px-8 py-3 rounded-xl font-semibold shadow-lg transition-all duration-200
                ${isOverCapacity
                  ? "bg-red-500 hover:bg-red-600"
                  : "bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
                }
                disabled:opacity-50 disabled:cursor-not-allowed
              `}
            >
              {isOverCapacity ? "Over capacity — remove items to confirm" : "Confirm Answer"}
            </Button>
            
            {onSkip && (
              <Button
                onClick={onSkip}
                variant="outline"
                size="lg"
                className="px-8 py-3 rounded-xl font-semibold border-2 hover:bg-gray-50 transition-all duration-200"
              >
                Skip Question
              </Button>
            )}
          </motion.div>
        )}

        {/* Confirmed Status */}
        {submitted && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center"
          >
            <div className="inline-flex items-center space-x-2 bg-green-500 text-white px-6 py-3 rounded-xl shadow-lg">
              <CheckCircle className="h-5 w-5" />
              <span className="font-semibold">Answer Confirmed</span>
            </div>
          </motion.div>
        )}

        {/* Solution Display */}
        {showSolution && question.solution && solutionTotals && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-6 p-6 bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-200 rounded-2xl"
          >
            <h4 className="font-bold text-green-800 mb-4 flex items-center text-lg">
              <CheckCircle className="h-6 w-6 mr-2" />
              Optimal Solution
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div className="bg-white rounded-xl p-3 text-center">
                <div className="text-sm text-green-600 font-medium">Selected Items</div>
                <div className="text-lg font-bold text-green-800">{question.solution.join(", ")}</div>
              </div>
              <div className="bg-white rounded-xl p-3 text-center">
                <div className="text-sm text-green-600 font-medium">Total Weight</div>
                <div className="text-lg font-bold text-green-800">{solutionTotals.weight}/{question.capacity}</div>
              </div>
              <div className="bg-white rounded-xl p-3 text-center">
                <div className="text-sm text-green-600 font-medium">Total Points</div>
                <div className="text-lg font-bold text-green-800">{solutionTotals.reward}</div>
              </div>
            </div>
            {question.explanation && (
              <p className="text-green-700 text-center bg-white rounded-xl p-4 italic">
                {question.explanation}
              </p>
            )}
          </motion.div>
        )}
      </div>
    </div>
  )
}
