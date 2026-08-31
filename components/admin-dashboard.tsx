"use client"

import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import {
  BarChart3,
  Clock,
  Users,
  TrendingUp,
  Eye,
  Lock,
  Unlock,
  RefreshCw,
  Download
} from 'lucide-react'
import { api, getApiBase } from '@/lib/api-client'

interface AdminDashboardProps {
  onClose?: () => void
}

interface TestResult {
  correctAnswers?: number
  incorrectAnswers?: number
  unansweredQuestions?: number
  totalPoints?: number
  maxPoints?: number
  totalQuestions?: number
  accuracy?: number
  timeUsed?: number
  completed?: boolean
}

interface AnalyticsData {
  overview: {
    totalParticipants: number
    completedParticipants: number
    avgStudyTime: number
    totalStudyTime: number
  }
  timeAnalytics: {
    avgTimePerSection: { [key: string]: number }
    avgTimePerQuestion: { [key: string]: number }
    participantTimeDistribution: number[]
    sectionCompletionRates: { [key: string]: number }
  }
  participantDetails: Array<{
    participantId: string
    prolificPid: string
    email?: string
    registeredAt: string
    completedAt?: string
    totalStudyTime: number
    sectionsCompleted: number
    testResults: {
      practice?: TestResult
      skill?: TestResult
      benchmark?: TestResult
      strategy?: any
      final?: TestResult
    }
    timeBreakdown: Array<{
      sectionName: string
      timeSpent: number
      questionCount: number
      avgTimePerQuestion: number
    }>
  }>
}

export default function AdminDashboard({ onClose }: AdminDashboardProps) {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [adminKey, setAdminKey] = useState('')
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedParticipant, setSelectedParticipant] = useState<string | null>(null)
  const [participantDetails, setParticipantDetails] = useState<any>(null)
  const [loadingDetails, setLoadingDetails] = useState(false)

  // Memoized utility functions
  const formatTime = useCallback((milliseconds: number) => {
    if (!milliseconds || milliseconds === 0) return '0m 0s'
    const seconds = Math.floor(milliseconds / 1000)
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}m ${remainingSeconds}s`
  }, [])

  const formatDate = useCallback((dateString: string | number) => {
    if (!dateString) return 'N/A'
    const date = new Date(dateString)
    return date.toLocaleTimeString()
  }, [])

  // Memoize API base
  const API_BASE = useMemo(() => getApiBase(), [])

  const authenticate = useCallback(async () => {
    if (!adminKey.trim()) {
      setError('Please enter admin key')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const data = await api.get<AnalyticsData>(
        `/api/v1/admin/analytics?adminKey=${encodeURIComponent(adminKey)}`,
        false // Don't cache admin data
      )
      setAnalytics(data)
      setIsAuthenticated(true)
    } catch (err: any) {
      if (err.status === 401 || err.message?.includes('401') || err.message?.includes('Invalid')) {
        setError('Invalid admin key')
      } else {
        setError('Authentication failed. Please check your connection.')
      }
      console.error('Auth error:', err)
    } finally {
      setLoading(false)
    }
  }, [adminKey])

  const refreshData = useCallback(async () => {
    if (!isAuthenticated || !adminKey) return

    setLoading(true)
    try {
      const data = await api.get<AnalyticsData>(
        `/api/v1/admin/analytics?adminKey=${encodeURIComponent(adminKey)}`,
        false
      )
      setAnalytics(data)
    } catch (err) {
      console.error('Refresh error:', err)
    } finally {
      setLoading(false)
    }
  }, [isAuthenticated, adminKey])

  const exportData = useCallback(async () => {
    if (!adminKey) return

    try {
      const response = await fetch(`${API_BASE}/api/v1/admin/export-csv?adminKey=${encodeURIComponent(adminKey)}`)
      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `knapsack-study-data-${new Date().toISOString().split('T')[0]}.csv`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
      }
    } catch (err) {
      console.error('Export error:', err)
    }
  }, [adminKey, API_BASE])

  const viewParticipantDetails = useCallback(async (participantId: string) => {
    if (!adminKey) return

    setLoadingDetails(true)
    setSelectedParticipant(participantId)

    try {
      const data = await api.get<any>(
        `/api/v1/admin/participant/${participantId}?adminKey=${encodeURIComponent(adminKey)}`,
        false
      )
      setParticipantDetails(data)
    } catch (err) {
      console.error('Error fetching participant details:', err)
    } finally {
      setLoadingDetails(false)
    }
  }, [adminKey])


  // Authentication Screen
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center p-4">
        <Card className="w-full max-w-md shadow-2xl">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
              <Lock className="h-8 w-8 text-blue-600" />
            </div>
            <CardTitle className="text-2xl font-bold text-gray-900">Admin Access</CardTitle>
            <p className="text-gray-600">Enter admin key to access analytics dashboard</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Input
                type="password"
                placeholder="Admin Key"
                value={adminKey}
                onChange={(e) => setAdminKey(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && authenticate()}
                className="text-center"
              />
            </div>
            {error && (
              <div className="text-red-600 text-sm text-center bg-red-50 p-2 rounded">
                {error}
              </div>
            )}
            <Button
              onClick={authenticate}
              disabled={loading}
              className="w-full"
            >
              {loading ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Authenticating...
                </>
              ) : (
                <>
                  <Unlock className="h-4 w-4 mr-2" />
                  Access Dashboard
                </>
              )}
            </Button>
            {onClose && (
              <Button variant="outline" onClick={onClose} className="w-full">
                Cancel
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    )
  }

  // Main Dashboard
  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Knapsack Study Analytics</h1>
            <p className="text-gray-600">Real-time participant performance and time tracking</p>
          </div>
          <div className="flex space-x-3">
            <Button onClick={refreshData} disabled={loading} variant="outline">
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button onClick={exportData} variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Export Data
            </Button>
            {onClose && (
              <Button onClick={onClose} variant="outline">
                Close
              </Button>
            )}
          </div>
        </div>

        {analytics && (
          <>
            {/* Overview Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center">
                    <Users className="h-8 w-8 text-blue-600" />
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600">Total Participants</p>
                      <p className="text-2xl font-bold text-gray-900">{analytics.overview.totalParticipants}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center">
                    <TrendingUp className="h-8 w-8 text-green-600" />
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600">Completed</p>
                      <p className="text-2xl font-bold text-gray-900">{analytics.overview.completedParticipants}</p>
                      <p className="text-xs text-gray-500">
                        {((analytics.overview.completedParticipants / analytics.overview.totalParticipants) * 100).toFixed(1)}% completion rate
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

            </div>


            {/* Participant Details */}
            <Card>
              <CardHeader>
                <CardTitle>Participant Details</CardTitle>
                <p className="text-sm text-gray-600">Click on a participant to view detailed analytics</p>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-2">ID / Email</th>
                        <th className="text-left p-2">Registered</th>
                        <th className="text-left p-2">Status</th>

                        <th className="text-left p-2">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {analytics.participantDetails.map((participant) => (
                        <tr key={participant.participantId} className="border-b hover:bg-gray-50">
                          <td className="p-2 font-mono text-xs">
                            {participant.prolificPid || participant.email || participant.participantId.substring(0, 8)}
                          </td>
                          <td className="p-2">{formatDate(participant.registeredAt)}</td>
                          <td className="p-2">
                            <Badge variant={participant.completedAt ? "default" : "secondary"}>
                              {participant.completedAt ? "Completed" : "In Progress"}
                            </Badge>
                          </td>

                          <td className="p-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => viewParticipantDetails(participant.participantId)}
                              disabled={loadingDetails}
                            >
                              {loadingDetails && selectedParticipant === participant.participantId ? (
                                <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                              ) : (
                                <Eye className="h-3 w-3 mr-1" />
                              )}
                              View
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            {/* Detailed Participant View */}
            {participantDetails && (
              <Card className="mt-8">
                <CardHeader>
                  <div className="flex justify-between items-center">
                    <CardTitle>Detailed Participant Analysis</CardTitle>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setParticipantDetails(null)
                        setSelectedParticipant(null)
                      }}
                    >
                      Close Details
                    </Button>
                  </div>
                  <p className="text-sm text-gray-600">
                    ID: <code className="bg-gray-100 px-1 rounded">
                      {participantDetails.participantInfo?.prolificPid || participantDetails.participantInfo?.email || participantDetails.participantInfo?.participantId}
                    </code>
                  </p>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">

                    {/* Participant Info */}
                    <div>
                      <h3 className="text-lg font-semibold mb-3">Participant Information</h3>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <span className="font-medium text-gray-600">Participant ID:</span>
                          <p className="font-mono text-xs">{participantDetails.participantInfo?.participantId}</p>
                        </div>
                        <div>
                          <span className="font-medium text-gray-600">Study ID:</span>
                          <p className="font-mono text-xs">{participantDetails.participantInfo?.studyId}</p>
                        </div>
                        <div>
                          <span className="font-medium text-gray-600">Registered:</span>
                          <p>{formatDate(participantDetails.participantInfo?.registeredAt)}</p>
                        </div>
                        <div>
                          <span className="font-medium text-gray-600">Completed:</span>
                          <p>{participantDetails.participantInfo?.completedAt ? formatDate(participantDetails.participantInfo.completedAt) : 'In Progress'}</p>
                        </div>
                      </div>
                    </div>

                    {/* Results Summary - All Sections */}
                    <div>
                      <h3 className="text-lg font-semibold mb-3">Results Summary - All Sections</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">

                        {/* Practice */}
                        {participantDetails.testResults?.practice && (
                          <Card>
                            <CardHeader className="pb-3">
                              <CardTitle className="text-sm font-medium text-gray-600">Practice</CardTitle>
                            </CardHeader>
                            <CardContent>
                              <div className="space-y-2 text-sm">
                                {participantDetails.testResults.practice.completed ? (
                                  <>
                                    <div className="flex justify-between">
                                      <span className="text-gray-600">Correct:</span>
                                      <span className="font-bold text-blue-600">
                                        {participantDetails.testResults.practice.correctAnswers}/{participantDetails.testResults.practice.totalQuestions}
                                      </span>
                                    </div>
                                    {participantDetails.testResults.practice.accuracy != null && (
                                      <div className="flex justify-between text-xs">
                                        <span className="text-gray-500">Accuracy:</span>
                                        <span>{(participantDetails.testResults.practice.accuracy * 100).toFixed(1)}%</span>
                                      </div>
                                    )}
                                  </>
                                ) : (
                                  <span className="text-gray-400 text-xs">Not completed</span>
                                )}
                              </div>
                            </CardContent>
                          </Card>
                        )}

                        {/* Skill Test */}
                        {participantDetails.testResults?.skill && (
                          <Card>
                            <CardHeader className="pb-3">
                              <CardTitle className="text-sm font-medium text-gray-600">Test 1 (Skill)</CardTitle>
                            </CardHeader>
                            <CardContent>
                              <div className="space-y-2 text-sm">
                                {participantDetails.testResults.skill.totalPoints !== undefined ? (
                                  <>
                                    <div className="flex justify-between">
                                      <span className="text-gray-600">Score:</span>
                                      <span className="font-bold text-orange-600">
                                        {participantDetails.testResults.skill.totalPoints}/{participantDetails.testResults.skill.maxPoints}
                                      </span>
                                    </div>
                                    <Progress
                                      value={(participantDetails.testResults.skill.totalPoints / participantDetails.testResults.skill.maxPoints) * 100}
                                      className="h-2"
                                    />
                                    <div className="flex justify-between text-xs">
                                      <span className="text-green-600">✓ {participantDetails.testResults.skill.correctAnswers}</span>
                                      <span className="text-gray-500">− {participantDetails.testResults.skill.unansweredQuestions}</span>
                                      <span className="text-red-600">✗ {participantDetails.testResults.skill.incorrectAnswers}</span>
                                    </div>
                                  </>
                                ) : (
                                  <span className="text-gray-400 text-xs">Not completed</span>
                                )}
                              </div>
                            </CardContent>
                          </Card>
                        )}

                        {/* Benchmark Test */}
                        {participantDetails.testResults?.benchmark && (
                          <Card>
                            <CardHeader className="pb-3">
                              <CardTitle className="text-sm font-medium text-gray-600">Test 2 (Benchmark)</CardTitle>
                            </CardHeader>
                            <CardContent>
                              <div className="space-y-2 text-sm">
                                {participantDetails.testResults.benchmark.totalPoints !== undefined ? (
                                  <>
                                    <div className="flex justify-between">
                                      <span className="text-gray-600">Score:</span>
                                      <span className="font-bold text-purple-600">
                                        {participantDetails.testResults.benchmark.totalPoints}/{participantDetails.testResults.benchmark.maxPoints}
                                      </span>
                                    </div>
                                    <Progress
                                      value={(participantDetails.testResults.benchmark.totalPoints / participantDetails.testResults.benchmark.maxPoints) * 100}
                                      className="h-2"
                                    />
                                    <div className="flex justify-between text-xs">
                                      <span className="text-green-600">✓ {participantDetails.testResults.benchmark.correctAnswers}</span>
                                      <span className="text-gray-500">− {participantDetails.testResults.benchmark.unansweredQuestions}</span>
                                      <span className="text-red-600">✗ {participantDetails.testResults.benchmark.incorrectAnswers}</span>
                                    </div>
                                    <div className="text-xs text-gray-500 mt-1">
                                      Time: {Math.floor((participantDetails.testResults.benchmark.timeUsed || 0) / 60)}:{String((participantDetails.testResults.benchmark.timeUsed || 0) % 60).padStart(2, '0')}
                                    </div>
                                  </>
                                ) : (
                                  <span className="text-gray-400 text-xs">Not completed</span>
                                )}
                              </div>
                            </CardContent>
                          </Card>
                        )}

                        {/* Final Test */}
                        {participantDetails.testResults?.final && (
                          <Card>
                            <CardHeader className="pb-3">
                              <CardTitle className="text-sm font-medium text-gray-600">Test 3 (Final)</CardTitle>
                            </CardHeader>
                            <CardContent>
                              <div className="space-y-2 text-sm">
                                {participantDetails.testResults.final.totalPoints !== undefined ? (
                                  <>
                                    <div className="flex justify-between">
                                      <span className="text-gray-600">Score:</span>
                                      <span className="font-bold text-teal-600">
                                        {participantDetails.testResults.final.totalPoints}/{participantDetails.testResults.final.maxPoints}
                                      </span>
                                    </div>
                                    <Progress
                                      value={(participantDetails.testResults.final.totalPoints / participantDetails.testResults.final.maxPoints) * 100}
                                      className="h-2"
                                    />
                                    <div className="flex justify-between text-xs">
                                      <span className="text-green-600">✓ {participantDetails.testResults.final.correctAnswers}</span>
                                      <span className="text-gray-500">− {participantDetails.testResults.final.unansweredQuestions}</span>
                                      <span className="text-red-600">✗ {participantDetails.testResults.final.incorrectAnswers}</span>
                                    </div>
                                    <div className="text-xs text-gray-500 mt-1">
                                      Time: {Math.floor((participantDetails.testResults.final.timeUsed || 0) / 60)}:{String((participantDetails.testResults.final.timeUsed || 0) % 60).padStart(2, '0')}
                                    </div>
                                  </>
                                ) : (
                                  <span className="text-gray-400 text-xs">Not completed</span>
                                )}
                              </div>
                            </CardContent>
                          </Card>
                        )}

                      </div>

                      {/* Scoring System Explanation */}
                      <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                        <p className="text-sm text-blue-800">
                          <strong>Scoring System:</strong> Correct answer = 2 points, Unanswered = 1 point, Incorrect = 0 points
                        </p>
                      </div>
                    </div>

                    {/* Test Results */}
                    <div>
                      <h3 className="text-lg font-semibold mb-3">Detailed Test Results & Answers</h3>
                      <div className="space-y-4">
                        {Object.entries(participantDetails.testResults || {}).map(([testName, testData]: [string, any]) => (
                          testData && (
                            <Card key={testName}>
                              <CardHeader className="pb-3">
                                <CardTitle className="text-base capitalize">{testName} Test</CardTitle>
                              </CardHeader>
                              <CardContent>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4 text-sm">
                                  <div>
                                    <span className="font-medium text-gray-600">Status:</span>
                                    <Badge variant={testData.completed ? "default" : "secondary"} className="ml-2">
                                      {testData.completed ? "Completed" : "Incomplete"}
                                    </Badge>
                                  </div>
                                  {testData.correctAnswers !== undefined && (
                                    <div>
                                      <span className="font-medium text-gray-600">Correct:</span>
                                      <p className="font-semibold">{testData.correctAnswers}/{testData.totalQuestions}</p>
                                    </div>
                                  )}
                                  {testData.accuracy !== undefined && (
                                    <div>
                                      <span className="font-medium text-gray-600">Accuracy:</span>
                                      <p className="font-semibold">{(testData.accuracy * 100).toFixed(1)}%</p>
                                    </div>
                                  )}
                                </div>

                                {/* Individual Answers */}
                                {((testData.answers && Array.isArray(testData.answers) && testData.answers.length > 0) || (testData.answers && typeof testData.answers === 'object' && !Array.isArray(testData.answers) && Object.keys(testData.answers).length > 0)) && (
                                  <div>
                                    <h4 className="font-medium mb-2">Individual Answers:</h4>
                                    <div className="overflow-x-auto">
                                      <table className="w-full text-xs">
                                        <thead>
                                          <tr className="border-b">
                                            <th className="text-left p-1">Q#</th>
                                            <th className="text-left p-1">Selected</th>
                                            <th className="text-left p-1">Correct</th>
                                            <th className="text-left p-1">Confirmed</th>
                                            <th className="text-left p-1">Time Spent</th>
                                          </tr>
                                        </thead>
                                        <tbody>
                                          {(() => {
                                            // Debug logging for strategy answers
                                            if (testName === 'strategy') {
                                              console.log('Strategy answers debug:', {
                                                testName,
                                                answers: testData.answers,
                                                answersType: typeof testData.answers,
                                                isArray: Array.isArray(testData.answers)
                                              })
                                            }

                                            // Handle strategy phase answers (new format: object with text and timeSpent)
                                            if (testName === 'strategy' && testData.answers && typeof testData.answers === 'object' && !Array.isArray(testData.answers)) {
                                              return Object.entries(testData.answers).map(([questionId, answerData]: [string, any]) => {
                                                // Handle both old format (string) and new format (object with text and timeSpent)
                                                let answerText = ''
                                                let timeSpent = 0

                                                if (typeof answerData === 'string') {
                                                  answerText = answerData
                                                } else if (answerData && typeof answerData === 'object') {
                                                  answerText = answerData.text || ''
                                                  timeSpent = answerData.timeSpent || 0
                                                }

                                                return {
                                                  questionId: Number(questionId),
                                                  selected: answerText,
                                                  correct: false,
                                                  confirmed: true,
                                                  timeSpent
                                                }
                                              })
                                            }
                                            // Handle strategy phase answers (old format: stored as array containing object)
                                            else if (testName === 'strategy' && Array.isArray(testData.answers) && testData.answers.length > 0 && typeof testData.answers[0] === 'object') {
                                              const answersObj = testData.answers[0]
                                              return Object.entries(answersObj).map(([questionId, answerText]) => {
                                                const questionTime = testData.questionTimes?.find((qt: any) => qt.questionId === Number(questionId))
                                                return {
                                                  questionId: Number(questionId),
                                                  selected: answerText,
                                                  correct: false,
                                                  confirmed: true,
                                                  timeSpent: questionTime?.timeSpent || 0
                                                }
                                              })
                                            }
                                            // Handle regular array answers
                                            else if (Array.isArray(testData.answers)) {
                                              return testData.answers
                                            }
                                            // Handle object answers
                                            else if (testData.answers && typeof testData.answers === 'object') {
                                              return Object.entries(testData.answers).map(([questionId, answerText]) => {
                                                const questionTime = testData.questionTimes?.find((qt: any) => qt.questionId === Number(questionId))
                                                return {
                                                  questionId: Number(questionId),
                                                  selected: answerText,
                                                  correct: false,
                                                  confirmed: true,
                                                  timeSpent: questionTime?.timeSpent || 0
                                                }
                                              })
                                            }
                                            return []
                                          })().map((answer: any, idx: number) => (
                                            <tr key={idx} className="border-b">
                                              <td className="p-1">{answer.questionId || idx + 1}</td>
                                              <td className="p-1">
                                                {Array.isArray(answer.selected)
                                                  ? `[${answer.selected.join(', ')}]`
                                                  : typeof answer.selected === 'string'
                                                    ? (answer.selected.length > 50 ? `${answer.selected.substring(0, 50)}...` : answer.selected)
                                                    : typeof answer.selected === 'object' && answer.selected?.text
                                                      ? (answer.selected.text.length > 50 ? `${answer.selected.text.substring(0, 50)}...` : answer.selected.text)
                                                      : String(answer.selected || 'N/A')
                                                }
                                              </td>
                                              <td className="p-1">
                                                <Badge variant={answer.correct ? "default" : "destructive"} className="text-xs">
                                                  {answer.correct ? "✓" : "✗"}
                                                </Badge>
                                              </td>
                                              <td className="p-1">
                                                <Badge variant={answer.confirmed ? "default" : "secondary"} className="text-xs">
                                                  {answer.confirmed ? "Yes" : "No"}
                                                </Badge>
                                              </td>
                                              <td className="p-1">
                                                {(() => {
                                                  // First try to get timeSpent from the answer itself (most reliable)
                                                  if (answer.timeSpent && answer.timeSpent > 0) {
                                                    return formatTime(answer.timeSpent)
                                                  }

                                                  // Then try to find exact match in questionTimes array by questionId
                                                  const questionTime = testData.questionTimes?.find((qt: any) =>
                                                    qt.questionId === answer.questionId
                                                  )

                                                  if (questionTime && questionTime.timeSpent && questionTime.timeSpent > 0) {
                                                    return formatTime(questionTime.timeSpent)
                                                  }

                                                  // If no timing data exists, show N/A (don't estimate)
                                                  return 'N/A'
                                                })()}
                                              </td>
                                            </tr>
                                          ))}
                                        </tbody>
                                      </table>
                                    </div>
                                  </div>
                                )}

                              </CardContent>
                            </Card>
                          )
                        ))}
                      </div>
                    </div>


                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </div>
  )
}
