"use client"

import { useEffect } from "react"
import Link from "next/link"
import { ArrowRight, ClipboardList, Database, Layers } from "lucide-react"

export default function HomePage() {
  // Wake the Render backend (free tier sleeps when idle, cold start can take
  // up to a minute) while the visitor is still choosing where to go.
  useEffect(() => {
    const base = process.env.NEXT_PUBLIC_API_BASE
    if (base) fetch(`${base}/`, { mode: "no-cors" }).catch(() => {})
  }, [])

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Top navigation */}
      <header className="border-b border-gray-200 bg-white">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded bg-blue-700 text-white flex items-center justify-center font-bold text-sm">
              K
            </div>
            <span className="font-semibold text-gray-900">Knapsack Study</span>
          </div>
          <nav className="flex items-center gap-8 text-sm">
            <Link href="/experiment" className="text-gray-600 hover:text-gray-900">
              Experiment
            </Link>
            <Link href="/questions" className="text-gray-600 hover:text-gray-900">
              Question Bank
            </Link>
            <a href="/tol/" className="text-gray-600 hover:text-gray-900">
              Tower of London
            </a>
          </nav>
        </div>
      </header>

      {/* Main */}
      <main className="flex-1">
        <div className="max-w-6xl mx-auto px-6 py-20">
          <div className="max-w-2xl mb-14">
            <h1 className="text-3xl font-semibold text-gray-900 mb-4">
              Behavioral study platform for the 0–1 knapsack problem
            </h1>
            <p className="text-gray-600 leading-relaxed">
              This platform hosts a multi-phase problem-solving experiment and the tools to
              maintain its question bank. Select an area below to continue.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Link
              href="/experiment"
              className="group border border-gray-200 rounded-lg p-8 hover:border-blue-600 hover:shadow-sm transition-colors bg-white"
            >
              <div className="w-10 h-10 rounded bg-blue-50 text-blue-700 flex items-center justify-center mb-5">
                <ClipboardList className="h-5 w-5" />
              </div>
              <h2 className="text-lg font-semibold text-gray-900 mb-2">Take the Experiment</h2>
              <p className="text-sm text-gray-600 leading-relaxed mb-6">
                Complete the full study: tutorial, practice set, and three timed tests.
                Progress is saved automatically and responses are recorded for analysis.
              </p>
              <span className="inline-flex items-center gap-1.5 text-sm font-medium text-blue-700">
                Start experiment
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </span>
            </Link>

            <Link
              href="/questions"
              className="group border border-gray-200 rounded-lg p-8 hover:border-blue-600 hover:shadow-sm transition-colors bg-white"
            >
              <div className="w-10 h-10 rounded bg-blue-50 text-blue-700 flex items-center justify-center mb-5">
                <Database className="h-5 w-5" />
              </div>
              <h2 className="text-lg font-semibold text-gray-900 mb-2">Manage Questions</h2>
              <p className="text-sm text-gray-600 leading-relaxed mb-6">
                Review the question bank, adjust capacities, weights and points, and preview
                each item exactly as participants see it. Changes can be exported as JSON.
              </p>
              <span className="inline-flex items-center gap-1.5 text-sm font-medium text-blue-700">
                Open question manager
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </span>
            </Link>

            <a
              href="/tol/"
              className="group border border-gray-200 rounded-lg p-8 hover:border-blue-600 hover:shadow-sm transition-colors bg-white"
            >
              <div className="w-10 h-10 rounded bg-blue-50 text-blue-700 flex items-center justify-center mb-5">
                <Layers className="h-5 w-5" />
              </div>
              <h2 className="text-lg font-semibold text-gray-900 mb-2">Tower of London</h2>
              <p className="text-sm text-gray-600 leading-relaxed mb-6">
                A separate planning experiment: rearrange colored balls across three pegs to
                match a target arrangement in the minimum number of moves.
              </p>
              <span className="inline-flex items-center gap-1.5 text-sm font-medium text-blue-700">
                Start Tower of London
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </span>
            </a>
          </div>

          {/* Facts */}
          <div className="mt-14 pt-8 border-t border-gray-100 grid grid-cols-2 md:grid-cols-4 gap-6 max-w-3xl">
            <div>
              <div className="text-2xl font-semibold text-gray-900">897</div>
              <div className="text-sm text-gray-500 mt-1">Calibrated questions</div>
            </div>
            <div>
              <div className="text-2xl font-semibold text-gray-900">3</div>
              <div className="text-sm text-gray-500 mt-1">Test phases</div>
            </div>
            <div>
              <div className="text-2xl font-semibold text-gray-900">6</div>
              <div className="text-sm text-gray-500 mt-1">Items per question</div>
            </div>
            <div>
              <div className="text-2xl font-semibold text-gray-900">3</div>
              <div className="text-sm text-gray-500 mt-1">Difficulty levels</div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-200">
        <div className="max-w-6xl mx-auto px-6 py-6 flex items-center justify-between text-sm text-gray-500">
          <span>© 2026 Knapsack Study</span>
          <span>Research use only</span>
        </div>
      </footer>
    </div>
  )
}
