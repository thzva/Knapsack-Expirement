"use client"

import { Suspense, lazy } from 'react'

const QuestionManager = lazy(() => import('@/components/question-manager'))

const ManagerLoader = () => (
  <div className="min-h-screen bg-gradient-to-br from-slate-50 to-gray-100 flex items-center justify-center">
    <div className="text-center">
      <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-r-transparent mb-4"></div>
      <p className="text-gray-700">Loading Question Bank Manager...</p>
    </div>
  </div>
)

export default function QuestionsPage() {
  return (
    <Suspense fallback={<ManagerLoader />}>
      <QuestionManager />
    </Suspense>
  )
}
