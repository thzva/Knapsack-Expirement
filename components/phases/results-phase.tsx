"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Trophy, Gift, Star, BarChart3, Target, Sparkles } from "lucide-react"
import { motion } from "framer-motion"

interface ResultsPhaseProps {
  onNext?: () => void
  participantData: any
  updateParticipantData: (data: any) => void
}

export default function ResultsPhase({ onNext, participantData }: ResultsPhaseProps) {
  const [hasMarkedComplete, setHasMarkedComplete] = useState(false)

  // Auto-complete the study when Results phase loads
  useEffect(() => {
    if (!hasMarkedComplete) {
      setHasMarkedComplete(true)
      
      // Mark participant as completed in the backend
      const markStudyComplete = async () => {
        try {
          const participantId = localStorage.getItem('participantId')
          const prolificPid = localStorage.getItem('prolificPid')
          
          if (participantId && prolificPid) {
            const API_BASE = process.env.NODE_ENV === 'production' 
              ? (process.env.NEXT_PUBLIC_API_BASE || "https://knapsack-expirement-03kg.onrender.com")
              : "http://localhost:8787"
              
            await fetch(`${API_BASE}/api/v1/complete-participant`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json"
              },
              body: JSON.stringify({
                participantId,
                prolificPid,
                completedAt: new Date().toISOString()
              })
            })
            
            console.log("[Results] Marked participant as completed")
          }
        } catch (error) {
          console.error("[Results] Failed to mark participant as completed:", error)
        }
      }
      
      markStudyComplete()
    }
  }, [hasMarkedComplete])

  // Calculate total performance
  const training1 = participantData.training1 || { correctAnswers: 0, totalQuestions: 6, accuracy: 0 }
  const training2 = participantData.training2 || { correctAnswers: 0, totalQuestions: 10, totalPoints: 0, maxPoints: 20 }
  const benchmark = participantData.benchmark || { correctAnswers: 0, totalQuestions: 30, totalPoints: 0, maxPoints: 60 }
  // Handle both 'prediction' and 'final' phase names
  const prediction = participantData.prediction || participantData.final || { correctAnswers: 0, totalQuestions: 30, totalPoints: 0, maxPoints: 60 }

  // Calculate overall performance using only ONE of benchmark OR final test
  // Use whichever test has the BETTER score
  const benchmarkPoints = benchmark.totalPoints || 0
  const finalPoints = prediction.totalPoints || 0
  
  // Determine which test to use for overall performance (better score)
  const useBenchmark = benchmarkPoints >= finalPoints
  const testForOverall = useBenchmark ? benchmark : prediction
  const testNameForOverall = useBenchmark ? "Test 2 (Benchmark)" : "Test 3 (Final)"
  const notUsedTestName = useBenchmark ? "Test 3 (Final)" : "Test 2 (Benchmark)"
  const notUsedTestPoints = useBenchmark ? finalPoints : benchmarkPoints
  
  // Overall performance = Skills Assessment + (Better of Benchmark OR Final Test)
  const totalPoints = (training2.totalPoints || 0) + (testForOverall.totalPoints || 0)
  const maxTotalPoints = (training2.maxPoints || 20) + (testForOverall.maxPoints || 60)
  const overallPercentage = maxTotalPoints > 0 ? (totalPoints / maxTotalPoints) * 100 : 0



  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <Card className="text-center shadow-lg bg-gradient-to-br from-purple-50 to-blue-50">
        <CardHeader>
          <div className="mx-auto w-20 h-20 bg-gradient-to-br from-purple-500 to-blue-600 rounded-full flex items-center justify-center mb-4">
            <Trophy className="h-10 w-10 text-white" />
          </div>
          <CardTitle className="text-3xl font-bold text-gray-900">Experiment Complete!</CardTitle>
          <p className="text-lg text-gray-600 mt-2">Thank you for participating in the Knapsack Challenge</p>
        </CardHeader>
      </Card>

      {/* Performance Summary */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Training Phase 1 */}
        <Card className="border-2 border-green-200">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center text-lg">
              <Target className="h-5 w-5 mr-2 text-green-600" />
              Practice Round
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Correct Answers:</span>
                <span className="font-semibold">
                  {training1.correctAnswers}/{training1.totalQuestions}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Accuracy:</span>
                <span className="font-semibold">{(training1.accuracy * 100).toFixed(0)}%</span>
              </div>
              <Progress value={training1.accuracy * 100} className="h-2" />
            </div>
          </CardContent>
        </Card>

        {/* Training Phase 2 */}
        <Card className="border-2 border-orange-200">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center text-lg">
              <BarChart3 className="h-5 w-5 mr-2 text-orange-600" />
              Skills Assessment
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Correct Answers:</span>
                <span className="font-semibold">
                  {training2.correctAnswers}/{training2.totalQuestions}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Points Earned:</span>
                <span className="font-semibold text-orange-600">
                  {training2.totalPoints || 0}/{training2.maxPoints || 20}
                </span>
              </div>
              <Progress value={((training2.totalPoints || 0) / (training2.maxPoints || 20)) * 100} className="h-2" />
            </div>
          </CardContent>
        </Card>

        {/* Benchmark Test */}
        <Card className="border-2 border-purple-200">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center text-lg">
              <Trophy className="h-5 w-5 mr-2 text-purple-600" />
              Benchmark Test
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Correct Answers:</span>
                <span className="font-semibold">
                  {benchmark.correctAnswers}/{benchmark.totalQuestions}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Points Earned:</span>
                <span className="font-semibold text-purple-600">
                  {benchmark.totalPoints || 0}/{benchmark.maxPoints || 60}
                </span>
              </div>
              <Progress value={((benchmark.totalPoints || 0) / (benchmark.maxPoints || 60)) * 100} className="h-2" />
            </div>
          </CardContent>
        </Card>

        {/* Final Test */}
        <Card className="border-2 border-red-200">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center text-lg">
              <Target className="h-5 w-5 mr-2 text-red-600" />
              Final Test
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Correct Answers:</span>
                <span className="font-semibold">
                  {prediction.correctAnswers}/{prediction.totalQuestions}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Points Earned:</span>
                <span className="font-semibold text-red-600">
                  {prediction.totalPoints || 0}/{prediction.maxPoints || 60}
                </span>
              </div>
              <Progress value={((prediction.totalPoints || 0) / (prediction.maxPoints || 60)) * 100} className="h-2" />
            </div>
          </CardContent>
        </Card>

        {/* Overall Performance */}
        <Card className="border-2 border-blue-200 bg-blue-50 md:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center text-lg">
              <Star className="h-5 w-5 mr-2 text-blue-600" />
              Overall Performance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Total Points:</span>
                <span className="font-bold text-2xl text-blue-600">{totalPoints}/{maxTotalPoints}</span>
              </div>
              <Progress value={overallPercentage} className="h-3" />
              <div className="text-center">
                <Badge className="bg-blue-600 text-white">
                  {overallPercentage >= 80 ? "Excellent Performance!" : 
                   overallPercentage >= 60 ? "Good Performance!" : 
                   overallPercentage >= 40 ? "Fair Performance" : "Keep Practicing!"}
                </Badge>
              </div>
              
              {/* Written Explanation */}
              <div className="mt-4 pt-4 border-t border-blue-200">
                <div className="bg-white rounded-lg p-4 space-y-2">
                  <h4 className="font-semibold text-sm text-gray-800 mb-2">How Overall Performance is Calculated:</h4>
                  <p className="text-xs text-gray-700 leading-relaxed">
                    Your overall performance score is calculated by combining your <strong>Test 1 (Skills Assessment)</strong> points 
                    ({training2.totalPoints || 0} out of {training2.maxPoints || 20} points) with your <strong>{testNameForOverall}</strong> points 
                    ({testForOverall.totalPoints || 0} out of {testForOverall.maxPoints || 60} points). 
                    This gives you a total of <strong>{totalPoints} out of {maxTotalPoints} points</strong>, 
                    representing <strong>{overallPercentage.toFixed(1)}%</strong> of the maximum possible score.
                  </p>
                  <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded">
                    <p className="text-xs text-yellow-800">
                      <strong>Which test was counted:</strong> {testNameForOverall} was used in your final score because it had 
                      {useBenchmark ? " a higher or equal" : " a higher"} score ({testForOverall.totalPoints || 0} points) 
                      compared to {notUsedTestName} ({notUsedTestPoints} points).
                    </p>
                  </div>
                  <p className="text-xs text-gray-600 mt-2 italic">
                    Note: Your final score uses Test 1 (Skills) + the better score between Test 2 (Benchmark) and Test 3 (Final), 
                    ensuring you receive credit for your best performance.
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Study Completion */}
      <Card className="shadow-lg bg-gradient-to-br from-green-50 to-blue-50">
        <CardHeader>
          <CardTitle className="flex items-center justify-center text-2xl">
            <Sparkles className="h-8 w-8 mr-3 text-green-600" />
            Study Complete
          </CardTitle>
        </CardHeader>

        <CardContent className="text-center space-y-6">
          <div className="bg-white p-6 rounded-lg border-2 border-green-200">
            <h3 className="text-lg font-semibold mb-4 text-green-800">
              Thank you for your valuable contribution to our research!
            </h3>
            <p className="text-green-700">
              Your participation helps us understand how people approach complex problem-solving tasks.
              All data collected will be used to advance research in cognitive science and algorithm design.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Study Information */}
      <Card className="bg-gray-50">
        <CardHeader>
          <CardTitle className="text-xl">About This Study</CardTitle>
        </CardHeader>

        <CardContent className="space-y-4">
          <p className="text-gray-700">
            This experiment investigated how people approach optimization problems under different conditions. The
            knapsack problem is a classic algorithmic challenge used in computer science and operations research.
          </p>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="bg-white p-4 rounded-lg">
              <h4 className="font-semibold mb-2">What we studied:</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Problem-solving strategies under time pressure</li>
                <li>• How question ordering affects performance</li>
                <li>• Strategic decision-making in optimization tasks</li>
                <li>• Cognitive approaches to complex problems</li>
              </ul>
            </div>

            <div className="bg-white p-4 rounded-lg">
              <h4 className="font-semibold mb-2">Your contribution:</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Provided valuable data on human problem-solving</li>
                <li>• Helped understand cognitive strategies</li>
                <li>• Contributed to algorithm design research</li>
                <li>• Advanced our knowledge of decision-making</li>
              </ul>
            </div>
          </div>

          <div className="text-center pt-6">
            <Button 
              onClick={() => {
                // Clear localStorage to prevent re-access
                localStorage.removeItem('participantId')
                localStorage.removeItem('prolificPid')
                
                // Redirect to Prolific completion page
                const completionUrl = `https://app.prolific.co/submissions/complete?cc=KNAPSACK2024`
                window.location.href = completionUrl
              }}
              size="lg"
              className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white px-8 py-3 rounded-xl font-semibold shadow-lg transition-all duration-200"
            >
              <Gift className="h-5 w-5 mr-2" />
              Complete Study & Return to Prolific
            </Button>
          </div>

          <div className="text-center pt-4">
            <p className="text-sm text-gray-500">
              All data collected is anonymized and will be used solely for research purposes. Thank you for your
              valuable participation!
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
