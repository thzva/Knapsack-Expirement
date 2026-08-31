"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Gift, ArrowRight, Trophy, Target } from "lucide-react"
import { motion } from "framer-motion"

interface IntroPhaseProps {
  onNext: () => void
  participantData: any
  updateParticipantData: (data: any) => void
}

export default function IntroPhase({ onNext }: IntroPhaseProps) {
  const [showSecondDisplay, setShowSecondDisplay] = useState(false)

  if (!showSecondDisplay) {
    // Display 1 from MVP
    return (
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5 }}
        >
          <Card className="text-center shadow-lg border-0 bg-gradient-to-br from-blue-50 to-indigo-50">
            <CardHeader className="pb-4">
              <div className="mx-auto w-20 h-20 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center mb-4">
                <Gift className="h-10 w-10 text-white" />
              </div>
              <CardTitle className="text-3xl font-bold text-gray-900 mb-2">Welcome to Our Experiment</CardTitle>
            </CardHeader>

            <CardContent className="space-y-6">
              <div className="bg-white rounded-lg p-8 shadow-sm">
                <div className="text-lg text-gray-700 mb-6 space-y-4">
                  <p className="font-semibold">In this experiment you can earn prizes (max dollar amount) by:</p>
                  <ol className="list-decimal list-inside space-y-2 ml-4">
                    <li>Doing a number of short quizzes containing optimization problems called <strong>Knapsack Problems</strong>.</li>
                    <li>More correct answers means higher prize.</li>
                  </ol>
                  <p className="mt-4">You may click the button below to begin the experiment!</p>
                </div>

                <Button
                  onClick={() => setShowSecondDisplay(true)}
                  size="lg"
                  className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-8 py-3 text-lg"
                >
                  Next
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    )
  }

  // Display 2 from MVP
  return (
    <div className="max-w-7xl mx-auto">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        <Card className="shadow-lg border-0 bg-gradient-to-br from-blue-50 to-indigo-50">
          <CardHeader className="pb-4">
            <div className="mx-auto w-20 h-20 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center mb-4">
              <Trophy className="h-10 w-10 text-white" />
            </div>
            <CardTitle className="text-3xl font-bold text-gray-900 mb-2">The Knapsack Challenge</CardTitle>
          </CardHeader>

          <CardContent className="space-y-6">
            <div className="bg-white rounded-lg p-8 shadow-sm">
              <p className="text-lg text-gray-700 mb-6">
                To win the prize, you will be asked to complete quizzes containing algorithm puzzles that are canonically called the 0-1 knapsack puzzle. Your performance on the quizzes will determine the chances you win the prizes. In the next section, we will explain what the knapsack questions is and give you opportunities to familiarize with sample questions you might see in the quizzes after.
              </p>

              <Button
                onClick={onNext}
                size="lg"
                className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-8 py-3 text-lg"
              >
                Continue to Instructions
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}
