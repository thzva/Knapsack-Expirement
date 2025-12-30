import express from 'express'
import z from 'zod'
import crypto from 'crypto'
import { prisma } from '../db'

// Type definition for Participant (will be auto-generated after running prisma generate)
interface Participant {
  id: string
  participantId: string
  createdAt: Date
  prolificPid: string | null
  studyId: string | null
  sessionId: string | null
  registeredAt: Date | null
  completedAt: Date | null
  testPractice: any
  testSkill: any
  testBenchmark: any
  testStrategy: any
  testFinal: any
  timeTracking: any
}

export const router = express.Router()

// Zod schemas
const TestPhase = z.enum(['practice', 'skill', 'benchmark', 'strategy', 'final'])

// REGISTER a new participant
router.post('/api/v1/register', async (req, res) => {
  const id = crypto.randomUUID()

  const newDoc = await prisma.participant.create({
    data: {
      participantId: id,
      createdAt: new Date(),
    }
  })

  return res.status(201).json({ participantId: newDoc.participantId })
})

// CHECK if participant exists and completion status
router.get('/api/v1/check-participant/:prolificPid', async (req, res) => {
  const { prolificPid } = req.params
  
  if (!prolificPid) {
    return res.status(400).json({ error: 'Missing prolificPid parameter' })
  }

  try {
    const participant = await prisma.participant.findFirst({ 
      where: { prolificPid }
    })
    
    if (!participant) {
      return res.status(200).json({ 
        exists: false, 
        completed: false 
      })
    }
    
    // Check if participant has completed all required phases
    const requiredPhases = ['practice', 'skill', 'benchmark', 'strategy', 'final'] as const
    const tests: any = {
      practice: participant.testPractice,
      skill: participant.testSkill,
      benchmark: participant.testBenchmark,
      strategy: participant.testStrategy,
      final: participant.testFinal
    }
    
    const completedPhases = requiredPhases.filter(phase => 
      tests[phase]?.completed === true
    )
    
    const isFullyCompleted = completedPhases.length === requiredPhases.length
    
    // Also check for explicit completion flag
    const isMarkedCompleted = !!participant.completedAt
    
    // Participant is considered completed if they've finished all phases OR been explicitly marked
    const isCompleted = isFullyCompleted || isMarkedCompleted
    
    return res.status(200).json({ 
      exists: true, 
      completed: isCompleted,
      participantId: participant.participantId,
      completedPhases: completedPhases.length,
      totalPhases: requiredPhases.length,
      allPhasesComplete: isFullyCompleted,
      markedComplete: isMarkedCompleted
    })
    
  } catch (err) {
    console.error('[CHECK PARTICIPANT ERROR]', err)
    return res.status(500).json({ error: 'Failed to check participant' })
  }
})

// MARK participant as completed
router.post('/api/v1/complete-participant', async (req, res) => {
  const { participantId, prolificPid, completedAt } = req.body
  
  if (!participantId) {
    return res.status(400).json({ 
      error: 'Missing required field: participantId' 
    })
  }

  try {
    // Build where clause - use prolificPid if provided, otherwise just use participantId
    const whereClause: any = { participantId }
    if (prolificPid) {
      whereClause.prolificPid = prolificPid
    }

    const updated = await prisma.participant.updateMany({
      where: whereClause,
      data: { 
        completedAt: completedAt ? new Date(completedAt) : new Date()
      }
    })
    
    if (updated.count === 0) {
      return res.status(404).json({ error: 'Participant not found' })
    }
    
    const participant = await prisma.participant.findFirst({
      where: { participantId }
    })
    
    console.log(`[Backend] Marked participant as completed: ${participantId}${prolificPid ? ` (prolificPid: ${prolificPid})` : ''}`)
    return res.status(200).json({ 
      success: true, 
      completedAt: participant?.completedAt 
    })
    
  } catch (err) {
    console.error('[COMPLETE PARTICIPANT ERROR]', err)
    return res.status(500).json({ error: 'Failed to mark participant as completed' })
  }
})

// REGISTER a Prolific participant
router.post('/api/v1/register-prolific', async (req, res) => {
  const { prolificPid, studyId, sessionId } = req.body
  
  // Validate required parameters
  if (!prolificPid || !studyId || !sessionId) {
    return res.status(400).json({ 
      error: 'Missing required Prolific parameters: prolificPid, studyId, sessionId' 
    })
  }

  // Validate Prolific ID format (should be a valid UUID-like string)
  const prolificIdPattern = /^[a-zA-Z0-9]{8,}$/
  
  if (!prolificIdPattern.test(prolificPid)) {
    return res.status(400).json({ 
      error: 'Invalid Prolific participant ID format' 
    })
  }

  // TEMPORARILY DISABLED FOR TESTING: Check if this Prolific participant already exists
  // TODO: Re-enable this before production launch
  /*
  const existingParticipant = await prisma.participant.findFirst({ 
    where: { prolificPid }
  })
  
  if (existingParticipant) {
    // Check if participant has already completed the study
    if (existingParticipant.completedAt) {
      console.log(`[Backend] Participant already completed study: ${prolificPid}`)
      return res.status(403).json({ 
        error: 'Participant has already completed the study',
        completed: true
      })
    }
    
    console.log(`[Backend] Returning existing participant for Prolific ID: ${prolificPid}`)
    return res.status(200).json({ 
      participantId: existingParticipant.participantId,
      message: 'Returning existing participant',
      isExisting: true
    })
  }
  */
  console.log(`[Backend] TEST MODE: Allowing new participant creation (duplicate check disabled)`)

  // Create new participant with Prolific data
  try {
    const id = crypto.randomUUID()
    
    // TEST MODE: Append timestamp to prolificPid to allow duplicates
    const uniqueProlificPid = `${prolificPid}_${Date.now()}`
    console.log(`[Backend] TEST MODE: Using unique prolificPid: ${uniqueProlificPid}`)
    
    const newDoc = await prisma.participant.create({
      data: {
        participantId: id,
        prolificPid: uniqueProlificPid,
        studyId,
        sessionId,
        registeredAt: new Date(),
        createdAt: new Date(),
      }
    })

    console.log(`[Backend] Created new participant for Prolific ID: ${prolificPid}, Participant ID: ${id}`)
    return res.status(201).json({ 
      participantId: newDoc.participantId,
      message: 'New participant created',
      isExisting: false
    })
  } catch (createError: any) {
    // Handle duplicate key error (race condition)
    if (createError.code === 'P2002') { // Prisma unique constraint violation
      console.log(`[Backend] Race condition detected for Prolific ID: ${prolificPid}. Checking for existing participant...`)
      
      // Try to find the participant that was just created
      const raceConditionParticipant = await prisma.participant.findFirst({ 
        where: { prolificPid }
      })
      
      if (raceConditionParticipant) {
        console.log(`[Backend] Found existing participant from race condition: ${raceConditionParticipant.participantId}`)
        return res.status(200).json({ 
          participantId: raceConditionParticipant.participantId,
          message: 'Returning existing participant (race condition handled)',
          isExisting: true
        })
      }
    }
    
    // Re-throw if it's not a duplicate key error
    console.error(`[Backend] Error creating participant for Prolific ID: ${prolificPid}`, createError)
    throw createError
  }
})

// INGEST phase data (practice, skill, etc)
router.post('/api/v1/ingest-phase', async (req, res) => {
  const { participantId, phase, data } = req.body

  if (!participantId || !phase || !data) {
    console.error('[INGEST ERROR] Missing required fields', { participantId, phase, hasData: !!data })
    return res.status(400).json({ error: 'Missing required fields' })
  }

  try {
    // First verify participant exists
    const participant = await prisma.participant.findFirst({ 
      where: { participantId }
    })
    if (!participant) {
      console.error(`[INGEST ERROR] Participant not found: ${participantId}`)
      return res.status(404).json({ error: "Participant not found" })
    }

    console.log(`[INGEST] Storing data for participant ${participantId}, phase: ${phase}`)

    // Map phase to the correct field
    const phaseFieldMap: { [key: string]: string } = {
      practice: 'testPractice',
      skill: 'testSkill',
      benchmark: 'testBenchmark',
      strategy: 'testStrategy',
      final: 'testFinal'
    }

    const fieldName = phaseFieldMap[phase]
    if (!fieldName) {
      return res.status(400).json({ error: 'Invalid phase name' })
    }

    const updateData: any = {}
    updateData[fieldName] = {
      completed: data.completed,
      correctAnswers: data.correctAnswers,
      totalQuestions: data.totalQuestions,
      accuracy: data.accuracy,
      answers: data.answers,
      timeUsed: data.timeUsed,
      questionTimes: data.questionTimes || [],
      totalPoints: data.totalPoints,
      maxPoints: data.maxPoints,
      incorrectAnswers: data.incorrectAnswers,
      unansweredQuestions: data.unansweredQuestions
    }

    const updated = await prisma.participant.update({
      where: { participantId },
      data: updateData
    })
    
    if (!updated) {
      console.error(`[INGEST ERROR] Failed to update participant: ${participantId}`)
      return res.status(404).json({ error: "Participant not found" })
    }
    
    console.log(`[INGEST SUCCESS] Data stored for participant ${participantId}, phase: ${phase}`)
    return res.status(200).json({ success: true, updated })
    
  } catch (err) {
    console.error('[INGEST ERROR]', err)
    return res.status(500).json({ error: 'Failed to ingest phase data' })
  }
})

// EXPORT Prolific data for researchers
router.get('/api/v1/export-prolific-data', async (req, res) => {
  try {
    const participants = await prisma.participant.findMany({ 
      where: { 
        prolificPid: { not: null } 
      } 
    })
    
    const exportData = participants.map((p: Participant) => ({
      participantId: p.participantId,
      prolificPid: p.prolificPid,
      studyId: p.studyId,
      sessionId: p.sessionId,
      registeredAt: p.registeredAt,
      completedAt: p.completedAt,
      createdAt: p.createdAt,
      tests: {
        practice: p.testPractice,
        skill: p.testSkill,
        benchmark: p.testBenchmark,
        strategy: p.testStrategy,
        final: p.testFinal
      }
    }))
    
    res.setHeader('Content-Type', 'application/json')
    res.setHeader('Content-Disposition', 'attachment; filename=prolific-study-data.json')
    res.status(200).json(exportData)
    
  } catch (err) {
    console.error('[EXPORT ERROR]', err)
    return res.status(500).json({ error: 'Failed to export data' })
  }
})

// LOG time tracking data
router.post('/api/v1/log-time', async (req, res) => {
  const { participantId, sectionName, questionId, timeData, interactionType } = req.body
  
  if (!participantId || !timeData) {
    return res.status(400).json({ error: 'Missing required fields: participantId, timeData' })
  }

  try {
    const participant = await prisma.participant.findFirst({ 
      where: { participantId }
    })
    
    if (!participant) {
      return res.status(404).json({ error: 'Participant not found' })
    }

    // Get existing time tracking or initialize
    let timeTracking: any = participant.timeTracking || {
      totalStudyTime: 0,
      sections: [],
      sessionStart: new Date().toISOString(),
      sessionEnd: null
    }

    // Handle different types of time logging
    if (sectionName && !questionId) {
      // Section-level time tracking
      const existingSection = timeTracking.sections.find((s: any) => s.sectionName === sectionName)
      
      if (existingSection) {
        if (timeData.endTime) {
          existingSection.endTime = timeData.endTime
          existingSection.timeSpent = new Date(timeData.endTime).getTime() - new Date(existingSection.startTime).getTime()
        }
      } else {
        timeTracking.sections.push({
          sectionName,
          startTime: timeData.startTime,
          endTime: timeData.endTime || null,
          timeSpent: timeData.timeSpent || 0,
          questionTimes: []
        })
      }
    } else if (sectionName && questionId) {
      // Question-level time tracking
      let section = timeTracking.sections.find((s: any) => s.sectionName === sectionName)
      
      if (!section) {
        const newSection = {
          sectionName,
          startTime: new Date().toISOString(),
          endTime: null,
          timeSpent: 0,
          questionTimes: []
        }
        timeTracking.sections.push(newSection)
        section = timeTracking.sections[timeTracking.sections.length - 1]
      }

      const existingQuestion = section.questionTimes.find((q: any) => q.questionId === questionId)
      
      if (existingQuestion) {
        if (timeData.endTime) {
          existingQuestion.endTime = timeData.endTime
          existingQuestion.timeSpent = new Date(timeData.endTime).getTime() - new Date(existingQuestion.startTime).getTime()
        }
        
        // Add interaction if provided
        if (interactionType) {
          if (!existingQuestion.interactions) {
            existingQuestion.interactions = []
          }
          existingQuestion.interactions.push({
            type: interactionType,
            timestamp: new Date().toISOString(),
            data: timeData.interactionData || {}
          })
        }
      } else {
        section.questionTimes.push({
          questionId,
          startTime: timeData.startTime,
          endTime: timeData.endTime || null,
          timeSpent: timeData.timeSpent || 0,
          interactions: interactionType ? [{
            type: interactionType,
            timestamp: new Date().toISOString(),
            data: timeData.interactionData || {}
          }] : []
        })
      }
    }

    // Update total study time
    if (timeData.totalStudyTime) {
      timeTracking.totalStudyTime = timeData.totalStudyTime
    }

    await prisma.participant.update({
      where: { participantId },
      data: { timeTracking }
    })
    
    return res.status(200).json({ 
      success: true, 
      message: 'Time data logged successfully' 
    })
    
  } catch (err) {
    console.error('[LOG TIME ERROR]', err)
    return res.status(500).json({ error: 'Failed to log time data' })
  }
})

// GET time analytics for a participant
router.get('/api/v1/participant-analytics/:participantId', async (req, res) => {
  const { participantId } = req.params
  
  try {
    const participant = await prisma.participant.findFirst({ 
      where: { participantId }
    })
    
    if (!participant) {
      return res.status(404).json({ error: 'Participant not found' })
    }

    const timeTracking: any = participant.timeTracking || {}

    // Calculate analytics
    const analytics = {
      participantId,
      prolificPid: participant.prolificPid,
      totalStudyTime: timeTracking.totalStudyTime || 0,
      sessionDuration: timeTracking.sessionStart && timeTracking.sessionEnd 
        ? new Date(timeTracking.sessionEnd).getTime() - new Date(timeTracking.sessionStart).getTime()
        : null,
      sections: (timeTracking.sections || []).map((section: any) => ({
        sectionName: section.sectionName,
        timeSpent: section.timeSpent,
        questionCount: section.questionTimes?.length || 0,
        avgTimePerQuestion: section.questionTimes?.length > 0 
          ? section.questionTimes.reduce((sum: number, q: any) => sum + (q.timeSpent || 0), 0) / section.questionTimes.length
          : 0,
        questions: (section.questionTimes || []).map((q: any) => ({
          questionId: q.questionId,
          timeSpent: q.timeSpent,
          interactionCount: q.interactions?.length || 0,
          interactions: q.interactions || []
        }))
      })),
      testResults: {
        practice: participant.testPractice,
        skill: participant.testSkill,
        benchmark: participant.testBenchmark,
        strategy: participant.testStrategy,
        final: participant.testFinal
      }
    }
    
    return res.status(200).json(analytics)
    
  } catch (err) {
    console.error('[PARTICIPANT ANALYTICS ERROR]', err)
    return res.status(500).json({ error: 'Failed to get participant analytics' })
  }
})

// GET study statistics
router.get('/api/v1/study-stats', async (req, res) => {
  try {
    const totalParticipants = await prisma.participant.count({ 
      where: { 
        prolificPid: { not: null } 
      } 
    })
    
    const completedParticipants = await prisma.participant.count({ 
      where: { 
        prolificPid: { not: null },
        completedAt: { not: null }
      } 
    })
    
    // Get all participants for phase stats
    const participants = await prisma.participant.findMany({
      where: { prolificPid: { not: null } },
      select: {
        testPractice: true,
        testSkill: true,
        testBenchmark: true,
        testStrategy: true,
        testFinal: true
      }
    })

    let practiceCount = 0, skillCount = 0, benchmarkCount = 0, strategyCount = 0, finalCount = 0

    participants.forEach((p: any) => {
      if ((p.testPractice as any)?.completed) practiceCount++
      if ((p.testSkill as any)?.completed) skillCount++
      if ((p.testBenchmark as any)?.completed) benchmarkCount++
      if ((p.testStrategy as any)?.completed) strategyCount++
      if ((p.testFinal as any)?.completed) finalCount++
    })
    
    res.status(200).json({
      totalParticipants,
      completedParticipants,
      phaseCompletionStats: {
        practice: practiceCount,
        skill: skillCount,
        benchmark: benchmarkCount,
        strategy: strategyCount,
        final: finalCount
      },
      completionRate: totalParticipants > 0 ? (completedParticipants / totalParticipants * 100).toFixed(1) : 0
    })
    
  } catch (err) {
    console.error('[STATS ERROR]', err)
    return res.status(500).json({ error: 'Failed to get stats' })
  }
})

// ADMIN AUTHENTICATION MIDDLEWARE
const adminAuth = (req: any, res: any, next: any) => {
  const adminKey = req.headers['x-admin-key'] || req.query.adminKey
  const validAdminKey = process.env.ADMIN_KEY || 'knapsack-admin-2024-secure'
  
  if (!adminKey || adminKey !== validAdminKey) {
    return res.status(401).json({ 
      error: 'Unauthorized. Admin access required.',
      hint: 'Provide valid admin key in x-admin-key header or adminKey query parameter'
    })
  }
  
  next()
}

// ADMIN ANALYTICS DASHBOARD - Protected Route
router.get('/api/v1/admin/analytics', adminAuth, async (req, res) => {
  try {
    const participants = await prisma.participant.findMany({ 
      where: { 
        prolificPid: { not: null } 
      } 
    })
    
    // Calculate comprehensive analytics
    const requiredPhases = ['practice', 'skill', 'benchmark', 'strategy', 'final']
    
    const completedParticipants = participants.filter((p: Participant) => {
      const tests: any = {
        practice: p.testPractice,
        skill: p.testSkill,
        benchmark: p.testBenchmark,
        strategy: p.testStrategy,
        final: p.testFinal
      }
      const completedPhases = requiredPhases.filter(phase => 
        tests[phase]?.completed === true
      )
      return completedPhases.length === requiredPhases.length
    })

    const analytics = {
      overview: {
        totalParticipants: participants.length,
        completedParticipants: completedParticipants.length,
        avgStudyTime: 0,
        totalStudyTime: 0
      },
      timeAnalytics: {
        avgTimePerSection: {},
        avgTimePerQuestion: {},
        participantTimeDistribution: [],
        sectionCompletionRates: {}
      },
      participantDetails: participants.map((p: Participant) => {
        const timeTracking: any = p.timeTracking || {}
        return {
          participantId: p.participantId,
          prolificPid: p.prolificPid,
          registeredAt: p.registeredAt,
          completedAt: p.completedAt,
          totalStudyTime: timeTracking.totalStudyTime || 0,
          sectionsCompleted: timeTracking.sections?.length || 0,
          testResults: {
            practice: p.testPractice ? {
              completed: (p.testPractice as any).completed,
              accuracy: (p.testPractice as any).accuracy,
              correctAnswers: (p.testPractice as any).correctAnswers,
              totalQuestions: (p.testPractice as any).totalQuestions
            } : null,
            skill: p.testSkill ? {
              completed: (p.testSkill as any).completed,
              accuracy: (p.testSkill as any).accuracy,
              correctAnswers: (p.testSkill as any).correctAnswers,
              totalQuestions: (p.testSkill as any).totalQuestions
            } : null,
            benchmark: p.testBenchmark ? {
              completed: (p.testBenchmark as any).completed,
              accuracy: (p.testBenchmark as any).accuracy,
              correctAnswers: (p.testBenchmark as any).correctAnswers,
              totalQuestions: (p.testBenchmark as any).totalQuestions
            } : null,
            strategy: p.testStrategy ? {
              completed: (p.testStrategy as any).completed,
              answers: (p.testStrategy as any).answers,
              questionsAnswered: (p.testStrategy as any).questionsAnswered,
              totalQuestions: (p.testStrategy as any).totalQuestions,
              timeUsed: (p.testStrategy as any).timeUsed,
              questionTimes: (p.testStrategy as any).questionTimes
            } : null,
            final: p.testFinal ? {
              completed: (p.testFinal as any).completed,
              accuracy: (p.testFinal as any).accuracy,
              correctAnswers: (p.testFinal as any).correctAnswers,
              totalQuestions: (p.testFinal as any).totalQuestions
            } : null
          },
          timeBreakdown: (timeTracking.sections || [])
            .filter((section: any) => (section.timeSpent || 0) > 0)
            .map((section: any) => ({
              sectionName: section.sectionName,
              timeSpent: section.timeSpent || 0,
              questionCount: section.questionTimes?.length || 0,
              avgTimePerQuestion: section.questionTimes?.length > 0 
                ? section.questionTimes.reduce((sum: number, q: any) => sum + (q.timeSpent || 0), 0) / section.questionTimes.length
                : 0
            }))
        }
      })
    }
    
    // Calculate aggregate time analytics
    const validTimeData = participants.filter((p: Participant) => (p.timeTracking as any)?.totalStudyTime)
    if (validTimeData.length > 0) {
      analytics.overview.totalStudyTime = validTimeData.reduce((sum: number, p: Participant) => sum + ((p.timeTracking as any)?.totalStudyTime || 0), 0)
      analytics.overview.avgStudyTime = analytics.overview.totalStudyTime / validTimeData.length
    }
    
    // Section time analytics
    const sectionTimes: { [key: string]: number[] } = {}
    participants.forEach((p: any) => {
      const timeTracking: any = p.timeTracking || {}
      ;(timeTracking.sections || []).forEach((section: any) => {
        if (!sectionTimes[section.sectionName]) {
          sectionTimes[section.sectionName] = []
        }
        if (section.timeSpent) {
          sectionTimes[section.sectionName].push(section.timeSpent)
        }
      })
    })
    
    Object.keys(sectionTimes).forEach(sectionName => {
      const times = sectionTimes[sectionName]
      ;(analytics.timeAnalytics.avgTimePerSection as any)[sectionName] = times.length > 0 
        ? times.reduce((sum, time) => sum + time, 0) / times.length 
        : 0
    })
    
    return res.status(200).json(analytics)
    
  } catch (err) {
    console.error('[ADMIN ANALYTICS ERROR]', err)
    return res.status(500).json({ error: 'Failed to get admin analytics' })
  }
})

// ADMIN PARTICIPANT DETAIL - Protected Route
router.get('/api/v1/admin/participant/:participantId', adminAuth, async (req, res) => {
  const { participantId } = req.params
  
  try {
    const participant = await prisma.participant.findFirst({ 
      where: { participantId }
    })
    
    if (!participant) {
      return res.status(404).json({ error: 'Participant not found' })
    }

    const timeTracking: any = participant.timeTracking || {}

    const detailedAnalytics = {
      participantInfo: {
        participantId: participant.participantId,
        prolificPid: participant.prolificPid,
        studyId: participant.studyId,
        sessionId: participant.sessionId,
        registeredAt: participant.registeredAt,
        completedAt: participant.completedAt,
        createdAt: participant.createdAt
      },
      timeTracking: participant.timeTracking,
      testResults: {
        practice: participant.testPractice,
        skill: participant.testSkill,
        benchmark: participant.testBenchmark,
        strategy: participant.testStrategy,
        final: participant.testFinal
      },
      detailedTimeAnalysis: {
        totalTimeSpent: timeTracking.totalStudyTime || 0,
        sessionDuration: timeTracking.sessionStart && timeTracking.sessionEnd 
          ? new Date(timeTracking.sessionEnd).getTime() - new Date(timeTracking.sessionStart).getTime()
          : null,
        sectionBreakdown: (timeTracking.sections || []).map((section: any) => ({
          sectionName: section.sectionName,
          startTime: section.startTime,
          endTime: section.endTime,
          timeSpent: section.timeSpent,
          questionAnalysis: (section.questionTimes || []).map((q: any) => ({
            questionId: q.questionId,
            timeSpent: q.timeSpent,
            startTime: q.startTime,
            endTime: q.endTime,
            interactionCount: q.interactions?.length || 0,
            interactions: (q.interactions || []).map((interaction: any) => ({
              type: interaction.type,
              timestamp: interaction.timestamp,
              data: interaction.data
            }))
          }))
        }))
      }
    }
    
    return res.status(200).json(detailedAnalytics)
    
  } catch (err) {
    console.error('[ADMIN PARTICIPANT DETAIL ERROR]', err)
    return res.status(500).json({ error: 'Failed to get participant details' })
  }
})
