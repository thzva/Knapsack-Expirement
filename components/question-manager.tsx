"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import staticQuestions from "@/lib/static-questions.json"
import type { Question } from "@/lib/static-loader"
import { analyzeQuestion, rebuildQuestion, type Ball } from "@/lib/question-editing"
import { ballColorClass } from "@/lib/ball-colors"
import {
  emptyExclusions,
  loadExclusions,
  saveExclusions,
  TEST_KEYS,
  TEST_LABELS,
  type Exclusions,
  type TestKey,
} from "@/lib/experiment-selection"
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

// Each test draws from one phase pool by default; the bank opens there.
const DEFAULT_PHASE_FOR_TASK: Record<TestKey, Phase> = {
  practice: "training",
  training2: "training",
  benchmark: "benchmark",
  prediction: "prediction",
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

function optimalPoints(q: Question): number {
  return (q.solution ?? []).reduce(
    (sum, id) => sum + (q.balls.find((b) => b.id === id)?.reward ?? 0),
    0,
  )
}

export default function QuestionManager() {
  const [overrides, setOverrides] = useState<Record<number, Question>>({})
  const [exclusions, setExclusions] = useState<Exclusions>(emptyExclusions())
  const [loaded, setLoaded] = useState(false)

  // Selection flow: pick a scope (whole bank or one test), then difficulty,
  // then the question table.
  const [task, setTask] = useState<TestKey | "all">("practice")
  const [difficulty, setDifficulty] = useState<Difficulty | "all">("all")

  // Bank browsing state
  const [phaseFilter, setPhaseFilter] = useState<Phase | "all">("training")
  const [search, setSearch] = useState("")
  const [page, setPage] = useState(0)
  const [pageSize, setPageSize] = useState(20)
  const [sortKey, setSortKey] = useState<"id" | "capacity" | "optimal" | "difficulty">("id")
  const [sortDir, setSortDir] = useState<1 | -1>(1)

  // Editor
  const [selectedId, setSelectedId] = useState<number | null>(null)

  // Bulk row selection
  const [checked, setChecked] = useState<Set<number>>(new Set())

  // Transient "Saved" indicator — everything persists automatically.
  const [savedFlash, setSavedFlash] = useState(false)
  const flashSaved = () => {
    setSavedFlash(true)
    window.setTimeout(() => setSavedFlash(false), 1200)
  }

  useEffect(() => {
    setOverrides(loadOverrides())
    setExclusions(loadExclusions())
    setLoaded(true)
  }, [])

  const questions = useMemo(
    () => data.questions.map((q) => overrides[q.id] ?? q),
    [overrides],
  )
  const questionById = useMemo(() => new Map(questions.map((q) => [q.id, q])), [questions])

  const switchTask = (t: TestKey | "all") => {
    setTask(t)
    setPhaseFilter(t === "all" ? "all" : DEFAULT_PHASE_FOR_TASK[t])
    setPage(0)
  }

  const currentTask: TestKey | null = task === "all" ? null : task

  const excludedSet = useMemo(
    () => new Set(currentTask ? exclusions[currentTask] : []),
    [exclusions, currentTask],
  )

  // The full bank stays visible; excluded questions are only marked, not
  // hidden — exclusion affects the experiment's random draw, nothing else.
  const bankList = useMemo(() => {
    let list = questions
    if (phaseFilter !== "all") list = list.filter((q) => q.phase === phaseFilter)
    if (difficulty !== "all") list = list.filter((q) => q.difficulty === difficulty)
    const term = search.trim()
    if (term) list = list.filter((q) => String(q.id).includes(term))
    const rank: Record<string, number> = { easy: 0, medium: 1, hard: 2 }
    const val = (q: Question) =>
      sortKey === "id" ? q.id :
      sortKey === "capacity" ? q.capacity :
      sortKey === "optimal" ? optimalPoints(q) :
      rank[q.difficulty ?? ""] ?? 3
    // Edited questions float to the top of their difficulty category.
    return [...list].sort((a, b) => {
      const editedFirst = (overrides[a.id] ? 0 : 1) - (overrides[b.id] ? 0 : 1)
      if (editedFirst !== 0) return editedFirst
      return (val(a) - val(b)) * sortDir || a.id - b.id
    })
  }, [questions, phaseFilter, difficulty, search, sortKey, sortDir, overrides])

  const pageCount = Math.max(1, Math.ceil(bankList.length / pageSize))
  const safePage = Math.min(page, pageCount - 1)
  const pageItems = bankList.slice(safePage * pageSize, (safePage + 1) * pageSize)

  const editedCount = Object.keys(overrides).length

  const toggleSort = (key: typeof sortKey) => {
    if (sortKey === key) setSortDir((d) => (d === 1 ? -1 : 1))
    else {
      setSortKey(key)
      setSortDir(1)
    }
    setPage(0)
  }

  const updateExclusions = (next: Exclusions) => {
    setExclusions(next)
    saveExclusions(next)
    flashSaved()
  }

  const excludeFromTask = (id: number) => {
    if (!currentTask || excludedSet.has(id)) return
    updateExclusions({ ...exclusions, [currentTask]: [...exclusions[currentTask], id] })
  }

  const restoreToTask = (id: number) => {
    if (!currentTask) return
    updateExclusions({ ...exclusions, [currentTask]: exclusions[currentTask].filter((x) => x !== id) })
  }

  const restoreAll = () => {
    if (!currentTask || exclusions[currentTask].length === 0) return
    if (!window.confirm(`Restore all ${exclusions[currentTask].length} excluded questions to the ${TEST_LABELS[currentTask]} pool?`)) return
    updateExclusions({ ...exclusions, [currentTask]: [] })
  }

  // ----- Bulk selection -----

  const toggleChecked = (id: number) => {
    setChecked((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const allPageChecked = pageItems.length > 0 && pageItems.every((q) => checked.has(q.id))
  const togglePageChecked = () => {
    setChecked((prev) => {
      const next = new Set(prev)
      if (allPageChecked) pageItems.forEach((q) => next.delete(q.id))
      else pageItems.forEach((q) => next.add(q.id))
      return next
    })
  }

  // Apply a partial edit (difficulty / question set) to every checked question.
  const bulkPatch = (patch: Partial<Question>) => {
    const next = { ...overrides }
    checked.forEach((id) => {
      const base = questionById.get(id)
      if (base) next[id] = { ...base, ...patch }
    })
    setOverrides(next)
    saveOverrides(next)
    flashSaved()
  }

  const bulkSetPool = (inPool: boolean) => {
    if (!currentTask) return
    const cur = new Set(exclusions[currentTask])
    checked.forEach((id) => (inPool ? cur.delete(id) : cur.add(id)))
    updateExclusions({ ...exclusions, [currentTask]: [...cur] })
  }

  const updateOverride = (q: Question) => {
    const next = { ...overrides, [q.id]: q }
    setOverrides(next)
    saveOverrides(next)
    flashSaved()
  }

  const removeOverride = (id: number) => {
    const next = { ...overrides }
    delete next[id]
    setOverrides(next)
    saveOverrides(next)
  }

  const resetAllEdits = () => {
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
        testExclusions: exclusions,
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
        <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-blue-700 border-r-transparent" />
      </div>
    )
  }

  if (selectedId !== null) {
    const original = data.questions.find((q) => q.id === selectedId)
    const current = questionById.get(selectedId)
    if (original && current) {
      const navList = bankList
      const idx = navList.findIndex((q) => q.id === selectedId)
      return (
        <QuestionEditor
          key={selectedId}
          original={original}
          current={current}
          isEdited={Boolean(overrides[selectedId])}
          onBack={() => setSelectedId(null)}
          onSave={updateOverride}
          onRevert={() => removeOverride(selectedId)}
          onPrev={idx > 0 ? () => setSelectedId(navList[idx - 1].id) : undefined}
          onNext={
            idx >= 0 && idx < navList.length - 1
              ? () => setSelectedId(navList[idx + 1].id)
              : undefined
          }
        />
      )
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Question Bank Manager</h1>
            <p className="text-sm text-gray-500 mt-1">
              Pick a test, then review or change the questions it uses.
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
              onClick={resetAllEdits}
              disabled={editedCount === 0}
              className="gap-2 text-rose-600 border-rose-200 hover:bg-rose-50"
            >
              <Trash2 className="h-4 w-4" /> Reset All Edits
            </Button>
          </div>
        </div>

        {/* Step 1: scope */}
        <div className="mb-4">
          <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Scope</div>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
            {TEST_KEYS.map((t) => (
              <button
                key={t}
                onClick={() => switchTask(t)}
                className={`rounded-lg border px-4 py-3 text-left transition-colors ${
                  task === t
                    ? "border-blue-700 bg-blue-700 text-white"
                    : "border-gray-200 bg-white text-gray-900 hover:border-gray-300"
                }`}
              >
                <div className="text-sm font-semibold">{TEST_LABELS[t]}</div>
                <div className={`text-xs mt-0.5 ${task === t ? "text-blue-100" : "text-gray-500"}`}>
                  {exclusions[t].length > 0
                    ? `${exclusions[t].length} excluded`
                    : "Full pool"}
                </div>
              </button>
            ))}
            <button
              onClick={() => switchTask("all")}
              className={`rounded-lg border px-4 py-3 text-left transition-colors ${
                task === "all"
                  ? "border-blue-700 bg-blue-700 text-white"
                  : "border-gray-200 bg-white text-gray-900 hover:border-gray-300"
              }`}
            >
              <div className="text-sm font-semibold">All Questions</div>
              <div className={`text-xs mt-0.5 ${task === "all" ? "text-blue-100" : "text-gray-500"}`}>
                {data.questions.length} in total
              </div>
            </button>
          </div>
        </div>

        {/* Step 2: difficulty */}
        <div className="mb-6">
          <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Difficulty</div>
          <div className="inline-flex rounded-lg border border-gray-200 bg-white overflow-hidden">
            {(["all", ...DIFFICULTIES] as const).map((d) => (
              <button
                key={d}
                onClick={() => {
                  setDifficulty(d)
                  setPage(0)
                }}
                className={`px-5 py-2 text-sm capitalize transition-colors ${
                  difficulty === d
                    ? "bg-blue-700 text-white"
                    : "text-gray-700 hover:bg-gray-50"
                }`}
              >
                {d}
              </button>
            ))}
          </div>
        </div>

        {/* Step 3: question panel */}
        <Card>
          {/* Panel toolbar */}
          <div className="border-b border-gray-200 px-4 py-3 flex flex-wrap items-center justify-between gap-3">
            <div className="text-sm font-medium text-gray-900">
              {currentTask
                ? `Question bank for ${TEST_LABELS[currentTask]} (${bankList.length})`
                : `Full question bank (${bankList.length})`}
              {currentTask && exclusions[currentTask].length > 0 && (
                <span className="ml-2 font-normal text-gray-500">
                  · {exclusions[currentTask].length} excluded from the random draw
                </span>
              )}
              <span
                className={`ml-2 text-xs font-medium text-emerald-600 transition-opacity duration-300 ${
                  savedFlash ? "opacity-100" : "opacity-0"
                }`}
              >
                Saved ✓
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex rounded-md border border-gray-200 overflow-hidden">
                {(["all", ...PHASES] as const).map((p) => (
                  <button
                    key={p}
                    onClick={() => {
                      setPhaseFilter(p)
                      setPage(0)
                    }}
                    className={`px-3 py-1.5 text-xs capitalize transition-colors ${
                      phaseFilter === p
                        ? "bg-gray-800 text-white"
                        : "bg-white text-gray-600 hover:bg-gray-50"
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
              <div className="relative">
                <Search className="h-3.5 w-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <Input
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value)
                    setPage(0)
                  }}
                  placeholder="Search ID…"
                  className="pl-8 h-8 w-32 text-sm"
                />
              </div>
              {currentTask && exclusions[currentTask].length > 0 && (
                <button onClick={restoreAll} className="text-sm text-blue-700 hover:underline">
                  Restore all
                </button>
              )}
            </div>
          </div>

          {checked.size > 0 && (
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-2.5 bg-blue-50 border-b border-blue-200 text-sm">
              <span className="font-medium text-blue-900">{checked.size} selected</span>
              <span className="flex items-center gap-1.5">
                <span className="text-gray-500">Difficulty:</span>
                {DIFFICULTIES.map((d) => (
                  <Button
                    key={d}
                    variant="outline"
                    size="sm"
                    className="h-7 px-2 capitalize bg-white"
                    onClick={() => bulkPatch({ difficulty: d })}
                  >
                    {d}
                  </Button>
                ))}
              </span>
              <span className="flex items-center gap-1.5">
                <span className="text-gray-500">Question set:</span>
                {PHASES.map((p) => (
                  <Button
                    key={p}
                    variant="outline"
                    size="sm"
                    className="h-7 px-2 capitalize bg-white"
                    onClick={() => bulkPatch({ phase: p })}
                  >
                    {p}
                  </Button>
                ))}
              </span>
              {currentTask && (
                <span className="flex items-center gap-1.5">
                  <span className="text-gray-500">Pool:</span>
                  <Button variant="outline" size="sm" className="h-7 px-2 bg-white" onClick={() => bulkSetPool(true)}>
                    Include
                  </Button>
                  <Button variant="outline" size="sm" className="h-7 px-2 bg-white" onClick={() => bulkSetPool(false)}>
                    Exclude
                  </Button>
                </span>
              )}
              <button onClick={() => setChecked(new Set())} className="ml-auto text-gray-500 hover:underline">
                Clear selection
              </button>
            </div>
          )}

          <QuestionTable
            rows={pageItems}
            overrides={overrides}
            sortKey={sortKey}
            sortDir={sortDir}
            onSort={toggleSort}
            onEdit={(id) => setSelectedId(id)}
            checkedIds={checked}
            onCheckToggle={toggleChecked}
            allChecked={allPageChecked}
            onCheckAll={togglePageChecked}
            excludedIds={currentTask ? excludedSet : undefined}
            onPoolToggle={
              currentTask
                ? (id, inPool) => (inPool ? restoreToTask(id) : excludeFromTask(id))
                : undefined
            }
          />
              <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-t border-gray-200">
                <span className="text-sm text-gray-500">
                  Showing {bankList.length === 0 ? 0 : safePage * pageSize + 1}–
                  {Math.min((safePage + 1) * pageSize, bankList.length)} of {bankList.length}
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

        <p className="text-xs text-gray-400 mt-4">
          Every question starts as a candidate for its test. Questions removed from the pool are
          never drawn for that test; each test samples randomly from what remains. Exclusions and
          edits are saved automatically in this browser and included in Export JSON.
        </p>
      </div>
    </div>
  )
}

/** Shared plain table for both the selected list and the bank. */
function QuestionTable({
  rows,
  overrides,
  showOrder,
  sortKey,
  sortDir,
  onSort,
  onEdit,
  excludedIds,
  onPoolToggle,
  checkedIds,
  onCheckToggle,
  allChecked,
  onCheckAll,
}: {
  rows: Question[]
  overrides: Record<number, Question>
  showOrder?: boolean
  sortKey?: "id" | "capacity" | "optimal" | "difficulty"
  sortDir?: 1 | -1
  onSort?: (k: "id" | "capacity" | "optimal" | "difficulty") => void
  onEdit: (id: number) => void
  excludedIds?: Set<number>
  onPoolToggle?: (id: number, inPool: boolean) => void
  checkedIds?: Set<number>
  onCheckToggle?: (id: number) => void
  allChecked?: boolean
  onCheckAll?: () => void
}) {
  const showPool = Boolean(onPoolToggle)
  const showCheck = Boolean(onCheckToggle)
  const colCount = 8 + (showOrder ? 1 : 0) + (showPool ? 1 : 0) + (showCheck ? 1 : 0)
  const sortable = Boolean(onSort)
  const header = (label: string, key?: "id" | "capacity" | "optimal" | "difficulty") =>
    sortable && key ? (
      <th
        className="px-4 py-3 font-medium cursor-pointer select-none hover:text-gray-900"
        onClick={() => onSort!(key)}
      >
        <span className={`inline-flex items-center gap-1 ${sortKey === key ? "text-blue-700" : ""}`}>
          {label}
          {sortKey === key ? (
            <span className="text-[10px]">{sortDir === 1 ? "▲" : "▼"}</span>
          ) : (
            <ArrowUpDown className="h-3 w-3 opacity-40" />
          )}
        </span>
      </th>
    ) : (
      <th className="px-4 py-3 font-medium">{label}</th>
    )

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200 bg-gray-50 text-left text-gray-500">
            {showCheck && (
              <th className="pl-4 pr-1 py-3 w-8">
                <input
                  type="checkbox"
                  checked={Boolean(allChecked)}
                  onChange={onCheckAll}
                  className="h-4 w-4 accent-blue-700 align-middle cursor-pointer"
                  title="Select all on this page"
                />
              </th>
            )}
            {showOrder && <th className="px-4 py-3 font-medium w-10">#</th>}
            {header("ID", "id")}
            <th className="px-4 py-3 font-medium">Phase</th>
            {header("Difficulty", "difficulty")}
            {header("Capacity", "capacity")}
            <th className="px-4 py-3 font-medium">Items (weight / points)</th>
            {header("Optimal", "optimal")}
            {showPool && <th className="px-4 py-3 font-medium">In Pool</th>}
            <th className="px-4 py-3 font-medium">Status</th>
            <th className="px-4 py-3 font-medium text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={colCount} className="px-4 py-16 text-center text-gray-500">
                No questions to show.
              </td>
            </tr>
          ) : (
            rows.map((q, i) => (
              <tr
                key={q.id}
                className={`border-b border-gray-100 cursor-pointer ${
                  overrides[q.id]
                    ? "bg-slate-100 hover:bg-slate-200"
                    : "hover:bg-gray-50"
                } ${excludedIds?.has(q.id) ? "opacity-50" : ""}`}
                onClick={() => onEdit(q.id)}
              >
                {showCheck && (
                  <td className="pl-4 pr-1 py-3" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={Boolean(checkedIds?.has(q.id))}
                      onChange={() => onCheckToggle?.(q.id)}
                      className="h-4 w-4 accent-blue-700 align-middle cursor-pointer"
                    />
                  </td>
                )}
                {showOrder && <td className="px-4 py-3 text-gray-400">{i + 1}</td>}
                <td className="px-4 py-3 font-medium text-gray-900">#{q.id}</td>
                <td className="px-4 py-3 text-gray-500 capitalize">{q.phase}</td>
                <td className="px-4 py-3 text-gray-700 capitalize">{q.difficulty}</td>
                <td className="px-4 py-3 text-gray-900">{q.capacity}</td>
                <td className="px-4 py-3">
                  <span className="font-mono text-xs text-gray-600">
                    {q.balls.map((b) => `${b.weight}/${b.reward}`).join("  ")}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-900">{optimalPoints(q)}</td>
                {showPool && (
                  <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={!excludedIds?.has(q.id)}
                      onChange={(e) => onPoolToggle?.(q.id, e.target.checked)}
                      className="h-4 w-4 accent-blue-700 align-middle cursor-pointer"
                      title={
                        excludedIds?.has(q.id)
                          ? "Excluded from this test's random draw — tick to put it back"
                          : "In this test's random draw — untick to exclude it"
                      }
                    />
                  </td>
                )}
                <td className="px-4 py-3">
                  <span className="inline-flex items-center gap-2">
                    {overrides[q.id] ? (
                      <span className="text-blue-700 font-medium">edited</span>
                    ) : (
                      <span className="text-gray-400">original</span>
                    )}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="inline-flex items-center" onClick={(e) => e.stopPropagation()}>
                    <Button variant="outline" size="sm" className="gap-1.5" onClick={() => onEdit(q.id)}>
                      <Pencil className="h-3.5 w-3.5" /> Edit
                    </Button>
                  </div>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
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
  const [difficulty, setDifficulty] = useState<Difficulty>(
    (current.difficulty as Difficulty) ?? "easy",
  )
  const [phase, setPhase] = useState<Phase>((current.phase as Phase) ?? "training")
  // Answer key override: null = follow the computed optimum; an array = the
  // manually chosen answer key.
  const [manualSolution, setManualSolution] = useState<number[] | null>(() => {
    const auto = analyzeQuestion(current.balls, current.capacity).solution
    const stored = current.solution ?? []
    const same = stored.length === auto.length && stored.every((id) => auto.includes(id))
    return same ? null : [...stored]
  })
  const [showSolution, setShowSolution] = useState(false)
  const [previewKey, setPreviewKey] = useState(0)
  const [savedFlash, setSavedFlash] = useState(false)

  const analysis = useMemo(() => analyzeQuestion(balls, capacity), [balls, capacity])

  const effectiveSolution = manualSolution ?? analysis.solution
  const keyTotals = useMemo(() => {
    return balls.reduce(
      (acc, b) => {
        if (effectiveSolution.includes(b.id)) {
          acc.weight += b.weight
          acc.reward += b.reward
        }
        return acc
      },
      { weight: 0, reward: 0 },
    )
  }, [balls, effectiveSolution])
  const keyOverCapacity = keyTotals.weight > capacity

  const toggleSolutionItem = (id: number) => {
    const chosen = new Set(effectiveSolution)
    if (chosen.has(id)) chosen.delete(id)
    else chosen.add(id)
    const next = balls.map((b) => b.id).filter((bid) => chosen.has(bid))
    const auto = analysis.solution
    const same = next.length === auto.length && next.every((x) => auto.includes(x))
    setManualSolution(same ? null : next)
  }

  // The difficulty/set selectors and manual answer key win over the auto-computed values.
  const draft = useMemo(() => {
    const base = { ...rebuildQuestion(current, balls, capacity), difficulty, phase }
    if (manualSolution) {
      return {
        ...base,
        solution: [...manualSolution],
        explanation: `The target selection earns ${keyTotals.reward} points while staying within capacity (${keyTotals.weight}/${capacity}).`,
      }
    }
    return base
  }, [current, balls, capacity, difficulty, phase, manualSolution, keyTotals])

  const sortedIds = (ids?: number[]) => [...(ids ?? [])].sort((a, b) => a - b).join(",")
  const dirty =
    capacity !== current.capacity ||
    difficulty !== current.difficulty ||
    phase !== current.phase ||
    JSON.stringify(balls) !== JSON.stringify(current.balls) ||
    sortedIds(draft.solution) !== sortedIds(current.solution)

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
    setDifficulty((original.difficulty as Difficulty) ?? "easy")
    setPhase((original.phase as Phase) ?? "training")
    const auto = analyzeQuestion(original.balls, original.capacity).solution
    const stored = original.solution ?? []
    const same = stored.length === auto.length && stored.every((id) => auto.includes(id))
    setManualSolution(same ? null : [...stored])
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
            <h1 className="text-2xl font-semibold text-gray-900">Question #{current.id}</h1>
            <span className="text-sm text-gray-500 capitalize">{draft.phase}</span>
            <span className="text-sm text-gray-500 capitalize">{draft.difficulty}</span>
            {isEdited && <Badge className="bg-blue-700 text-white">edited</Badge>}
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

                <div className="flex flex-wrap gap-6 mb-5">
                  <div>
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
                  <div>
                    <label className="text-sm font-medium text-gray-600 block mb-1">
                      Difficulty
                    </label>
                    <select
                      value={difficulty}
                      onChange={(e) => setDifficulty(e.target.value as Difficulty)}
                      className="border border-gray-200 rounded-md px-3 h-10 text-sm bg-white capitalize"
                    >
                      <option value="easy">Easy</option>
                      <option value="medium">Medium</option>
                      <option value="hard">Hard</option>
                    </select>
                    {analysis.computedDifficulty !== "invalid" &&
                      analysis.computedDifficulty !== difficulty && (
                        <button
                          className="block text-xs text-blue-700 hover:underline mt-1 capitalize"
                          onClick={() => setDifficulty(analysis.computedDifficulty as Difficulty)}
                        >
                          Use computed: {analysis.computedDifficulty}
                        </button>
                      )}
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600 block mb-1">
                      Question Set
                    </label>
                    <select
                      value={phase}
                      onChange={(e) => setPhase(e.target.value as Phase)}
                      className="border border-gray-200 rounded-md px-3 h-10 text-sm bg-white capitalize"
                    >
                      <option value="training">Training</option>
                      <option value="benchmark">Benchmark</option>
                      <option value="prediction">Prediction</option>
                    </select>
                  </div>
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
                            className={`w-8 h-8 rounded-full ${ballColorClass(ball.color)} text-white flex items-center justify-center font-bold text-sm`}
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
                          <input
                            type="checkbox"
                            checked={effectiveSolution.includes(ball.id)}
                            onChange={() => toggleSolutionItem(ball.id)}
                            className="h-4 w-4 accent-emerald-600 cursor-pointer align-middle"
                            title="Tick the items that form the answer key"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {manualSolution && !keyOverCapacity && (
                  <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mt-4">
                    Custom answer key: {keyTotals.reward} pts · {keyTotals.weight}/{capacity}
                    {keyTotals.reward !== analysis.maxReward && (
                      <> — the true optimum is {analysis.maxReward} pts, so a participant who finds
                      it would be scored incorrect.</>
                    )}{" "}
                    <button
                      className="text-blue-700 hover:underline"
                      onClick={() => setManualSolution(null)}
                    >
                      Use computed optimal
                    </button>
                  </p>
                )}
                {keyOverCapacity && (
                  <p className="text-xs text-rose-600 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2 mt-4">
                    The answer key weighs {keyTotals.weight}, which exceeds the capacity ({capacity}).
                    Untick items or raise the capacity before saving.
                  </p>
                )}

                <div className="flex items-center gap-2 mt-5">
                  <Button
                    onClick={handleSave}
                    disabled={!dirty || keyOverCapacity}
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
                  <AnalysisRow label="Computed Difficulty" value={analysis.computedDifficulty} />
                  <AnalysisRow label="Unique Optimum" value={analysis.uniqueOptimal ? "yes" : "no"} />
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

function AnalysisRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-gray-50 rounded-lg px-3 py-2">
      <div className="text-xs text-gray-500">{label}</div>
      <div className="font-medium text-gray-900 break-words capitalize">{value}</div>
    </div>
  )
}
