"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import staticQuestions from "@/lib/static-questions.json"
import type { Question } from "@/lib/static-loader"
import { analyzeQuestion, rebuildQuestion, type Ball } from "@/lib/question-editing"
import KnapsackQuestion from "@/components/knapsack-question"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import {
  ArrowLeft,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Download,
  Eye,
  EyeOff,
  Package,
  Pencil,
  RotateCcw,
  Search,
  Trash2,
} from "lucide-react"

const OVERRIDES_KEY = "knapsack-question-overrides-v1"

interface StaticData {
  metadata: {
    generatedAt: string
    totalQuestions: number
    numBalls: number
    statistics: Record<string, Record<string, number>>
    version: string
  }
  questions: Question[]
}

const data = staticQuestions as unknown as StaticData

type Phase = "training" | "benchmark" | "prediction"
type Difficulty = "easy" | "medium" | "hard"

const PHASES: Phase[] = ["training", "benchmark", "prediction"]
const DIFFICULTIES: Difficulty[] = ["easy", "medium", "hard"]

const difficultyStyles: Record<string, string> = {
  easy: "bg-emerald-100 text-emerald-800 border-emerald-300",
  medium: "bg-amber-100 text-amber-800 border-amber-300",
  hard: "bg-rose-100 text-rose-800 border-rose-300",
  invalid: "bg-gray-200 text-gray-700 border-gray-300",
}

const phaseStyles: Record<string, string> = {
  training: "bg-blue-100 text-blue-800 border-blue-300",
  benchmark: "bg-violet-100 text-violet-800 border-violet-300",
  prediction: "bg-cyan-100 text-cyan-800 border-cyan-300",
}

function loadOverrides(): Record<number, Question> {
  try {
    const raw = localStorage.getItem(OVERRIDES_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw)
    return parsed && typeof parsed === "object" ? parsed : {}
  } catch {
    return {}
  }
}

function saveOverrides(overrides: Record<number, Question>) {
  try {
    localStorage.setItem(OVERRIDES_KEY, JSON.stringify(overrides))
  } catch {
    // Storage full or unavailable — edits still live in memory for this session.
  }
}

export default function QuestionManager() {
  const [overrides, setOverrides] = useState<Record<number, Question>>({})
  const [loaded, setLoaded] = useState(false)

  // Filters
  const [phaseFilter, setPhaseFilter] = useState<Phase | "all">("all")
  const [difficultyFilter, setDifficultyFilter] = useState<Difficulty | "all">("all")
  const [editedOnly, setEditedOnly] = useState(false)
  const [search, setSearch] = useState("")
  const [page, setPage] = useState(0)
  const [pageSize, setPageSize] = useState(20)
  const [sortKey, setSortKey] = useState<"id" | "capacity" | "optimal" | "difficulty">("id")
  const [sortDir, setSortDir] = useState<1 | -1>(1)

  // Editor
  const [selectedId, setSelectedId] = useState<number | null>(null)

  useEffect(() => {
    setOverrides(loadOverrides())
    setLoaded(true)
  }, [])

  const questions = useMemo(
    () => data.questions.map((q) => overrides[q.id] ?? q),
    [overrides],
  )

  const filtered = useMemo(() => {
    let list = questions
    if (phaseFilter !== "all") list = list.filter((q) => q.phase === phaseFilter)
    if (difficultyFilter !== "all") list = list.filter((q) => q.difficulty === difficultyFilter)
    if (editedOnly) list = list.filter((q) => overrides[q.id])
    const term = search.trim()
    if (term) list = list.filter((q) => String(q.id).includes(term))
    return list
  }, [questions, phaseFilter, difficultyFilter, editedOnly, search, overrides])

  const sorted = useMemo(() => {
    const rank: Record<string, number> = { easy: 0, medium: 1, hard: 2 }
    const val = (q: Question) =>
      sortKey === "id" ? q.id :
      sortKey === "capacity" ? q.capacity :
      sortKey === "optimal" ? optimalPoints(q) :
      rank[q.difficulty ?? ""] ?? 3
    return [...filtered].sort((a, b) => (val(a) - val(b)) * sortDir || a.id - b.id)
  }, [filtered, sortKey, sortDir])

  const pageCount = Math.max(1, Math.ceil(sorted.length / pageSize))
  const safePage = Math.min(page, pageCount - 1)
  const pageItems = sorted.slice(safePage * pageSize, (safePage + 1) * pageSize)
  const editedCount = Object.keys(overrides).length

  const toggleSort = (key: typeof sortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 1 ? -1 : 1))
    } else {
      setSortKey(key)
      setSortDir(1)
    }
    setPage(0)
  }

  const updateOverride = (q: Question) => {
    const next = { ...overrides, [q.id]: q }
    setOverrides(next)
    saveOverrides(next)
  }

  const removeOverride = (id: number) => {
    const next = { ...overrides }
    delete next[id]
    setOverrides(next)
    saveOverrides(next)
  }

  const resetAll = () => {
    if (!window.confirm("Discard ALL local edits and restore every question to its original version?")) return
    setOverrides({})
    saveOverrides({})
  }

  const exportJson = () => {
    const merged = data.questions.map((q) => overrides[q.id] ?? q)
    const statistics: Record<string, Record<string, number>> = {}
    for (const phase of PHASES) {
      statistics[phase] = {}
      for (const diff of DIFFICULTIES) {
        statistics[phase][diff] = merged.filter(
          (q) => q.phase === phase && q.difficulty === diff,
        ).length
      }
    }
    const out = {
      metadata: {
        ...data.metadata,
        statistics,
        editedAt: new Date().toISOString(),
        editedQuestions: Object.keys(overrides).map(Number).sort((a, b) => a - b),
      },
      questions: merged,
    }
    const blob = new Blob([JSON.stringify(out, null, 2)], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "static-questions.json"
    a.click()
    URL.revokeObjectURL(url)
  }

  if (!loaded) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-r-transparent" />
      </div>
    )
  }

  if (selectedId !== null) {
    const original = data.questions.find((q) => q.id === selectedId)
    const current = questions.find((q) => q.id === selectedId)
    if (original && current) {
      const idx = sorted.findIndex((q) => q.id === selectedId)
      return (
        <QuestionEditor
          key={selectedId}
          original={original}
          current={current}
          isEdited={Boolean(overrides[selectedId])}
          onBack={() => setSelectedId(null)}
          onSave={updateOverride}
          onRevert={() => removeOverride(selectedId)}
          onPrev={idx > 0 ? () => setSelectedId(sorted[idx - 1].id) : undefined}
          onNext={
            idx >= 0 && idx < sorted.length - 1
              ? () => setSelectedId(sorted[idx + 1].id)
              : undefined
          }
        />
      )
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <Package className="h-8 w-8 text-blue-700" />
              Question Bank Manager
            </h1>
            <p className="text-gray-600 mt-1">
              Browse and adjust the knapsack questions. The live preview shows each question
              exactly as participants see it in the experiment.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" asChild className="gap-2">
              <Link href="/">
                <ArrowLeft className="h-4 w-4" /> Home
              </Link>
            </Button>
            <Button variant="outline" onClick={exportJson} className="gap-2">
              <Download className="h-4 w-4" /> Export JSON
            </Button>
            <Button
              variant="outline"
              onClick={resetAll}
              disabled={editedCount === 0}
              className="gap-2 text-rose-600 border-rose-200 hover:bg-rose-50"
            >
              <Trash2 className="h-4 w-4" /> Reset All Edits
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <StatCard label="Total Questions" value={data.questions.length} />
          <StatCard label="Edited Locally" value={editedCount} highlight={editedCount > 0} />
          <StatCard label="Matching Filters" value={filtered.length} />
          <StatCard label="Items per Question" value={data.metadata.numBalls} />
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="p-4 flex flex-wrap items-center gap-4">
            <div className="relative">
              <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <Input
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value)
                  setPage(0)
                }}
                placeholder="Search by ID…"
                className="pl-9 w-40"
              />
            </div>
            <FilterGroup
              label="Phase"
              value={phaseFilter}
              options={["all", ...PHASES]}
              onChange={(v) => {
                setPhaseFilter(v as Phase | "all")
                setPage(0)
              }}
            />
            <FilterGroup
              label="Difficulty"
              value={difficultyFilter}
              options={["all", ...DIFFICULTIES]}
              onChange={(v) => {
                setDifficultyFilter(v as Difficulty | "all")
                setPage(0)
              }}
            />
            <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={editedOnly}
                onChange={(e) => {
                  setEditedOnly(e.target.checked)
                  setPage(0)
                }}
                className="h-4 w-4 accent-blue-600"
              />
              Edited only
            </label>
          </CardContent>
        </Card>

        {/* Question table */}
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50 text-left text-gray-500">
                  <SortHeader label="ID" active={sortKey === "id"} dir={sortDir} onClick={() => toggleSort("id")} />
                  <th className="px-4 py-3 font-medium">Phase</th>
                  <SortHeader label="Difficulty" active={sortKey === "difficulty"} dir={sortDir} onClick={() => toggleSort("difficulty")} />
                  <SortHeader label="Capacity" active={sortKey === "capacity"} dir={sortDir} onClick={() => toggleSort("capacity")} />
                  <th className="px-4 py-3 font-medium">Items (weight / points)</th>
                  <SortHeader label="Optimal" active={sortKey === "optimal"} dir={sortDir} onClick={() => toggleSort("optimal")} />
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {pageItems.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-16 text-center text-gray-500">
                      No questions match the current filters.
                    </td>
                  </tr>
                ) : (
                  pageItems.map((q) => (
                    <tr
                      key={q.id}
                      className="border-b border-gray-100 hover:bg-blue-50/40 cursor-pointer"
                      onClick={() => setSelectedId(q.id)}
                    >
                      <td className="px-4 py-3 font-semibold text-gray-900">#{q.id}</td>
                      <td className="px-4 py-3">
                        <Badge variant="outline" className={`capitalize ${phaseStyles[q.phase ?? ""] ?? ""}`}>
                          {q.phase}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="outline" className={`capitalize ${difficultyStyles[q.difficulty ?? ""] ?? ""}`}>
                          {q.difficulty}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-gray-900">{q.capacity}</td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1">
                          {q.balls.map((ball) => (
                            <span
                              key={ball.id}
                              className={`inline-flex items-center justify-center rounded px-1.5 py-0.5 text-[10px] font-medium text-white ${ball.color}`}
                              title={`Item ${ball.id}: weight ${ball.weight}, points ${ball.reward}`}
                            >
                              {ball.weight}/{ball.reward}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-3 font-medium text-gray-900">{optimalPoints(q)} pts</td>
                      <td className="px-4 py-3">
                        {overrides[q.id] ? (
                          <Badge className="bg-blue-700 text-white">edited</Badge>
                        ) : (
                          <span className="text-gray-400">original</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-1.5"
                          onClick={(e) => {
                            e.stopPropagation()
                            setSelectedId(q.id)
                          }}
                        >
                          <Pencil className="h-3.5 w-3.5" /> Edit
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Table footer: range info, page size, pagination */}
          <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-t border-gray-200">
            <span className="text-sm text-gray-500">
              Showing {sorted.length === 0 ? 0 : safePage * pageSize + 1}–
              {Math.min((safePage + 1) * pageSize, sorted.length)} of {sorted.length}
            </span>
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 text-sm text-gray-600">
                Rows per page:
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value))
                    setPage(0)
                  }}
                  className="border border-gray-200 rounded-md px-2 py-1 text-sm bg-white"
                >
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </label>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={safePage === 0}
                  onClick={() => setPage(safePage - 1)}
                >
                  <ChevronLeft className="h-4 w-4" /> Prev
                </Button>
                <span className="text-sm text-gray-600 whitespace-nowrap">
                  Page {safePage + 1} / {pageCount}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={safePage >= pageCount - 1}
                  onClick={() => setPage(safePage + 1)}
                >
                  Next <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}

function StatCard({ label, value, highlight }: { label: string; value: number; highlight?: boolean }) {
  return (
    <Card className={highlight ? "border-blue-300 bg-blue-50" : ""}>
      <CardContent className="p-4">
        <div className="text-xs font-medium text-gray-500">{label}</div>
        <div className={`text-2xl font-bold ${highlight ? "text-blue-700" : "text-gray-900"}`}>
          {value}
        </div>
      </CardContent>
    </Card>
  )
}

function FilterGroup({
  label,
  value,
  options,
  onChange,
}: {
  label: string
  value: string
  options: string[]
  onChange: (v: string) => void
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-sm font-medium text-gray-600">{label}:</span>
      <div className="flex rounded-lg border border-gray-200 overflow-hidden">
        {options.map((opt) => (
          <button
            key={opt}
            onClick={() => onChange(opt)}
            className={`px-3 py-1.5 text-sm capitalize transition-colors ${
              value === opt ? "bg-blue-600 text-white" : "bg-white text-gray-700 hover:bg-gray-50"
            }`}
          >
            {opt}
          </button>
        ))}
      </div>
    </div>
  )
}

function optimalPoints(q: Question): number {
  return (q.solution ?? []).reduce(
    (sum, id) => sum + (q.balls.find((b) => b.id === id)?.reward ?? 0),
    0,
  )
}

function SortHeader({
  label,
  active,
  dir,
  onClick,
}: {
  label: string
  active: boolean
  dir: 1 | -1
  onClick: () => void
}) {
  return (
    <th
      className="px-4 py-3 font-medium cursor-pointer select-none hover:text-gray-900"
      onClick={onClick}
    >
      <span className={`inline-flex items-center gap-1 ${active ? "text-blue-700" : ""}`}>
        {label}
        {active ? (
          <span className="text-[10px]">{dir === 1 ? "▲" : "▼"}</span>
        ) : (
          <ArrowUpDown className="h-3 w-3 opacity-40" />
        )}
      </span>
    </th>
  )
}

function QuestionEditor({
  original,
  current,
  isEdited,
  onBack,
  onSave,
  onRevert,
  onPrev,
  onNext,
}: {
  original: Question
  current: Question
  isEdited: boolean
  onBack: () => void
  onSave: (q: Question) => void
  onRevert: () => void
  onPrev?: () => void
  onNext?: () => void
}) {
  const [capacity, setCapacity] = useState(current.capacity)
  const [balls, setBalls] = useState<Ball[]>(current.balls.map((b) => ({ ...b })))
  const [showSolution, setShowSolution] = useState(false)
  const [previewKey, setPreviewKey] = useState(0)
  const [savedFlash, setSavedFlash] = useState(false)

  const analysis = useMemo(() => analyzeQuestion(balls, capacity), [balls, capacity])
  const draft = useMemo(
    () => rebuildQuestion(current, balls, capacity),
    [current, balls, capacity],
  )

  const dirty =
    capacity !== current.capacity ||
    JSON.stringify(balls) !== JSON.stringify(current.balls)

  const setBallField = (id: number, field: "weight" | "reward", value: number) => {
    setBalls((prev) =>
      prev.map((b) => (b.id === id ? { ...b, [field]: Math.max(1, Math.round(value) || 1) } : b)),
    )
  }

  const handleSave = () => {
    onSave(draft)
    setSavedFlash(true)
    setTimeout(() => setSavedFlash(false), 1500)
  }

  const handleRevert = () => {
    onRevert()
    setCapacity(original.capacity)
    setBalls(original.balls.map((b) => ({ ...b })))
    setPreviewKey((k) => k + 1)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
          <div className="flex items-center gap-3">
            <Button variant="outline" onClick={onBack} className="gap-2">
              <ArrowLeft className="h-4 w-4" /> Back to list
            </Button>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Pencil className="h-5 w-5 text-blue-600" /> Question #{current.id}
            </h1>
            <Badge variant="outline" className={`capitalize ${phaseStyles[current.phase ?? ""] ?? ""}`}>
              {current.phase}
            </Badge>
            <Badge variant="outline" className={`capitalize ${difficultyStyles[draft.difficulty ?? ""] ?? ""}`}>
              {draft.difficulty}
            </Badge>
            {isEdited && <Badge className="bg-blue-600 text-white">edited</Badge>}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" disabled={!onPrev} onClick={onPrev}>
              <ChevronLeft className="h-4 w-4" /> Prev
            </Button>
            <Button variant="outline" size="sm" disabled={!onNext} onClick={onNext}>
              Next <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Edit panel */}
          <div className="space-y-4">
            <Card>
              <CardContent className="p-5">
                <h2 className="font-semibold text-gray-900 mb-4">Edit Parameters</h2>

                <div className="mb-5">
                  <label className="text-sm font-medium text-gray-600 block mb-1">
                    Knapsack Capacity
                  </label>
                  <Input
                    type="number"
                    min={1}
                    value={capacity}
                    onChange={(e) => setCapacity(Math.max(1, Math.round(Number(e.target.value)) || 1))}
                    className="w-32 text-lg font-bold"
                  />
                </div>

                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-gray-500">
                      <th className="pb-2 font-medium">Item</th>
                      <th className="pb-2 font-medium">Weight</th>
                      <th className="pb-2 font-medium">Points</th>
                      <th className="pb-2 font-medium">Density</th>
                      <th className="pb-2 font-medium">In Optimal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {balls.map((ball) => (
                      <tr key={ball.id} className="border-t border-gray-100">
                        <td className="py-2">
                          <div
                            className={`w-8 h-8 rounded-full ${ball.color} text-white flex items-center justify-center font-bold text-sm`}
                          >
                            {ball.id}
                          </div>
                        </td>
                        <td className="py-2 pr-3">
                          <Input
                            type="number"
                            min={1}
                            value={ball.weight}
                            onChange={(e) => setBallField(ball.id, "weight", Number(e.target.value))}
                            className="w-20"
                          />
                        </td>
                        <td className="py-2 pr-3">
                          <Input
                            type="number"
                            min={1}
                            value={ball.reward}
                            onChange={(e) => setBallField(ball.id, "reward", Number(e.target.value))}
                            className="w-20"
                          />
                        </td>
                        <td className="py-2 text-gray-600">
                          {(ball.reward / ball.weight).toFixed(2)}
                        </td>
                        <td className="py-2">
                          {analysis.solution.includes(ball.id) ? (
                            <Badge className="bg-emerald-500 text-white">yes</Badge>
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                <div className="flex items-center gap-2 mt-5">
                  <Button
                    onClick={handleSave}
                    disabled={!dirty}
                    className="bg-blue-700 hover:bg-blue-800"
                  >
                    {savedFlash ? "Saved ✓" : "Save Changes"}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleRevert}
                    disabled={!isEdited && !dirty}
                    className="gap-2"
                  >
                    <RotateCcw className="h-4 w-4" /> Revert to Original
                  </Button>
                </div>
                <p className="text-xs text-gray-500 mt-3">
                  Edits are stored locally in your browser. Use “Export JSON” on the list page to
                  download the full adjusted question bank.
                </p>
              </CardContent>
            </Card>

            {/* Analysis */}
            <Card>
              <CardContent className="p-5">
                <h2 className="font-semibold text-gray-900 mb-4">Automatic Analysis</h2>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <AnalysisRow label="Optimal Solution" value={analysis.solution.join(", ") || "∅"} />
                  <AnalysisRow
                    label="Optimal Points / Weight"
                    value={`${analysis.maxReward} pts · ${analysis.solutionWeight}/${capacity}`}
                  />
                  <AnalysisRow
                    label="Computed Difficulty"
                    value={analysis.computedDifficulty}
                    badgeClass={difficultyStyles[analysis.computedDifficulty]}
                  />
                  <AnalysisRow
                    label="Unique Optimum"
                    value={analysis.uniqueOptimal ? "yes" : "no"}
                    badgeClass={
                      analysis.uniqueOptimal
                        ? "bg-emerald-100 text-emerald-800 border-emerald-300"
                        : "bg-rose-100 text-rose-800 border-rose-300"
                    }
                  />
                  <AnalysisRow label="Dominated Items" value={String(analysis.metadata.dominanceCount)} />
                  <AnalysisRow label="Slack Ratio" value={analysis.metadata.slackRatio.toFixed(3)} />
                  <AnalysisRow label="Optimality Gap" value={String(analysis.metadata.optimalityGap)} />
                  <AnalysisRow label="Density Variance" value={analysis.metadata.densityVariance.toFixed(3)} />
                </div>
                {!analysis.uniqueOptimal && (
                  <p className="text-xs text-rose-600 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2 mt-4">
                    Warning: multiple selections reach the optimal score. The original design
                    requires a unique optimal solution for all-or-nothing scoring.
                  </p>
                )}
                {analysis.computedDifficulty === "invalid" && (
                  <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mt-4">
                    Warning: the dominance structure does not match any difficulty class
                    (easy / medium / hard). The previous difficulty label will be kept on save.
                  </p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Live preview */}
          <div>
            <Card className="sticky top-6">
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="font-semibold text-gray-900">Live Preview</h2>
                    <p className="text-xs text-gray-500">
                      Exactly how participants see this question in the experiment.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowSolution((s) => !s)}
                      className="gap-1.5"
                    >
                      {showSolution ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      {showSolution ? "Hide Solution" : "Show Solution"}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPreviewKey((k) => k + 1)}
                      className="gap-1.5"
                    >
                      <RotateCcw className="h-4 w-4" /> Reset
                    </Button>
                  </div>
                </div>
                <KnapsackQuestion
                  key={`${current.id}-${previewKey}`}
                  question={draft}
                  showSolution={showSolution}
                  isInteractive
                />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}

function AnalysisRow({
  label,
  value,
  badgeClass,
}: {
  label: string
  value: string
  badgeClass?: string
}) {
  return (
    <div className="bg-gray-50 rounded-lg px-3 py-2">
      <div className="text-xs text-gray-500">{label}</div>
      {badgeClass ? (
        <Badge variant="outline" className={`capitalize mt-0.5 ${badgeClass}`}>
          {value}
        </Badge>
      ) : (
        <div className="font-semibold text-gray-900 break-words">{value}</div>
      )}
    </div>
  )
}
