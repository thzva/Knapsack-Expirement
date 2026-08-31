# Data Verification: Answers & Admin Logs

This document describes how **answers** and **time/logs** are saved and how to verify they appear correctly in the admin dashboard and exports.

---

## 1. How answers are saved

| Phase | Frontend phase name | Backend DB field | When saved |
|-------|--------------------|------------------|------------|
| Practice (Training 1) | `practice` | `testPractice` | On "Complete" at end of 6 questions |
| Test 1 (Skill) | `skill` | `testSkill` | On completion of 10 questions |
| Benchmark (Test 2) | `benchmark` | `testBenchmark` | On "Submit" at end of 30 questions |
| Strategy (text reflection) | `strategy` | `testStrategy` | On "Submit" after strategy questions |
| Test 3 (Final / Prediction) | `final` | `testFinal` | On "Submit" at end of 30 questions |

**Flow:** Each phase component calls `POST /api/v1/ingest-phase` with `{ participantId, phase, data }`. The backend maps `phase` to the Prisma field and stores `data` (completed, correctAnswers, answers, questionTimes, timeUsed, etc.) in that participant’s record.

**Payload fields stored:**  
`completed`, `correctAnswers`, `totalQuestions`, `accuracy`, `answers`, `timeUsed`, `questionTimes`, `totalPoints`, `maxPoints`, `incorrectAnswers`, `unansweredQuestions` (when sent).

---

## 2. How time / logs are saved

- **TimeTracker** (used in Benchmark, Prediction, Strategy, and Training 2) sends:
  - Section start/end → `POST /api/v1/log-time` with `sectionName`, `timeData.startTime` / `endTime`, `timeSpent`
  - Per-question timing → same endpoint with `questionId`, `timeData.startTime`, `endTime`, `timeSpent`
  - Interactions (e.g. answer confirmed, question navigation) → same endpoint with `interactionType` and `timeData.interactionData`

- **Participant ID for time logs:** The tracker now reads `participantId` from **sessionStorage** first, then localStorage, so Prolific and email-auth sessions both log time under the correct participant.

- **Storage:** All of this is written into the participant’s `timeTracking` JSON field (e.g. `sections[]`, `questionTimes[]`, `totalStudyTime`).

---

## 3. Verifying in the admin dashboard

1. **Log in:** Open `/admin`, enter the admin key (see backend `ADMIN_KEY` or default in code).
2. **Overview:** Total participants and completed count come from the backend; completion uses all five phases (practice, skill, benchmark, strategy, final).
3. **Participant list:** Each row is one participant; "Completed" means they finished all required phases (or were marked complete).
4. **View details:** Click **View** on a participant to see:
   - **Results Summary:** Practice, Test 1 (Skill), Test 2 (Benchmark), Test 3 (Final) cards with scores/accuracy; Strategy is in the detailed table below.
   - **Detailed Test Results & Answers:** For each phase (practice, skill, benchmark, strategy, final): status, correct/total, accuracy, and a table of **individual answers** (Q#, selected, correct, confirmed, time spent).
5. **Time data:** The detailed view and the backend participant-detail API return `timeTracking` (sections, question times). The dashboard shows time spent where available (e.g. in the answers table and in phase summaries).

If a phase was completed but doesn’t show:
- Confirm the phase name sent in `ingest-phase` matches the backend `phaseFieldMap` (see table above).
- Check browser Network tab for `ingest-phase` and `log-time` responses (200 = stored).

---

## 4. Verifying via export

- **Export Data (CSV):** Uses `GET /api/v1/admin/export-csv`. Columns include:
  - Participant ID, Prolific PID, Study ID, Session ID, Registered At, Completed At, Total Study Time (min)
  - For each of Practice, Skill, Benchmark, Strategy, Final: completed flag, accuracy, score (and strategy-specific fields).
- The **Benchmark Completed** column now correctly uses `benchmark.completed` (previously it incorrectly used `skill.completed`).

---

## 5. Quick checklist

- [ ] Run through one full experiment (Practice → … → Results) with backend running.
- [ ] In Network tab: confirm `POST /api/v1/ingest-phase` returns 200 for each completed phase.
- [ ] In Network tab: confirm `POST /api/v1/log-time` is called and returns 200 when moving between questions/sections (Benchmark, Final, Strategy).
- [ ] In Admin: open a participant who completed and confirm Practice, Skill, Benchmark, Strategy, Final all show data and individual answers.
- [ ] Export CSV and confirm Benchmark Completed and other columns match the dashboard.

---

## 6. Backend reference

- **Ingest:** `backend/src/routes/participantRoutes.ts` → `POST /api/v1/ingest-phase`
- **Time log:** same file → `POST /api/v1/log-time`
- **Admin analytics:** `GET /api/v1/admin/analytics`, `GET /api/v1/admin/participant/:id`, `GET /api/v1/admin/export-csv`
- **Schema:** `backend/prisma/schema.prisma` → `Participant.testPractice`, `testSkill`, `testBenchmark`, `testStrategy`, `testFinal`, `timeTracking`
