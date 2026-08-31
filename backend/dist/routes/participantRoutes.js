"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.router = void 0;
const express_1 = __importDefault(require("express"));
const zod_1 = __importDefault(require("zod"));
const crypto_1 = __importDefault(require("crypto"));
const db_1 = require("../db");
exports.router = express_1.default.Router();
// Zod schemas
const TestPhase = zod_1.default.enum(['practice', 'skill', 'benchmark', 'strategy', 'final']);
// REGISTER a new participant
exports.router.post('/api/v1/register', async (req, res) => {
    const id = crypto_1.default.randomUUID();
    const newDoc = await db_1.prisma.participant.create({
        data: {
            participantId: id,
            createdAt: new Date(),
        }
    });
    return res.status(201).json({ participantId: newDoc.participantId });
});
// CHECK if participant exists and completion status
exports.router.get('/api/v1/check-participant/:prolificPid', async (req, res) => {
    const { prolificPid } = req.params;
    if (!prolificPid) {
        return res.status(400).json({ error: 'Missing prolificPid parameter' });
    }
    try {
        const participant = await db_1.prisma.participant.findFirst({
            where: { prolificPid }
        });
        if (!participant) {
            return res.status(200).json({
                exists: false,
                completed: false
            });
        }
        // Check if participant has completed all required phases
        const requiredPhases = ['practice', 'skill', 'benchmark', 'strategy', 'final'];
        const tests = {
            practice: participant.testPractice,
            skill: participant.testSkill,
            benchmark: participant.testBenchmark,
            strategy: participant.testStrategy,
            final: participant.testFinal
        };
        const completedPhases = requiredPhases.filter(phase => tests[phase]?.completed === true);
        const isFullyCompleted = completedPhases.length === requiredPhases.length;
        // Also check for explicit completion flag
        const isMarkedCompleted = !!participant.completedAt;
        // Participant is considered completed if they've finished all phases OR been explicitly marked
        const isCompleted = isFullyCompleted || isMarkedCompleted;
        return res.status(200).json({
            exists: true,
            completed: isCompleted,
            participantId: participant.participantId,
            completedPhases: completedPhases.length,
            totalPhases: requiredPhases.length,
            allPhasesComplete: isFullyCompleted,
            markedComplete: isMarkedCompleted
        });
    }
    catch (err) {
        console.error('[CHECK PARTICIPANT ERROR]', err);
        return res.status(500).json({ error: 'Failed to check participant' });
    }
});
// MARK participant as completed
exports.router.post('/api/v1/complete-participant', async (req, res) => {
    const { participantId, prolificPid, completedAt } = req.body;
    if (!participantId || !prolificPid) {
        return res.status(400).json({
            error: 'Missing required fields: participantId, prolificPid'
        });
    }
    try {
        const updated = await db_1.prisma.participant.updateMany({
            where: {
                participantId,
                prolificPid
            },
            data: {
                completedAt: completedAt ? new Date(completedAt) : new Date()
            }
        });
        if (updated.count === 0) {
            return res.status(404).json({ error: 'Participant not found' });
        }
        const participant = await db_1.prisma.participant.findFirst({
            where: { participantId, prolificPid }
        });
        console.log(`[Backend] Marked participant as completed: ${prolificPid}`);
        return res.status(200).json({
            success: true,
            completedAt: participant?.completedAt
        });
    }
    catch (err) {
        console.error('[COMPLETE PARTICIPANT ERROR]', err);
        return res.status(500).json({ error: 'Failed to mark participant as completed' });
    }
});
// REGISTER a Prolific participant
exports.router.post('/api/v1/register-prolific', async (req, res) => {
    const { prolificPid, studyId, sessionId } = req.body;
    // Validate required parameters
    if (!prolificPid || !studyId || !sessionId) {
        return res.status(400).json({
            error: 'Missing required Prolific parameters: prolificPid, studyId, sessionId'
        });
    }
    // Validate Prolific ID format (should be a valid UUID-like string)
    const prolificIdPattern = /^[a-zA-Z0-9]{8,}$/;
    if (!prolificIdPattern.test(prolificPid)) {
        return res.status(400).json({
            error: 'Invalid Prolific participant ID format'
        });
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
    console.log(`[Backend] TEST MODE: Allowing new participant creation (duplicate check disabled)`);
    // Create new participant with Prolific data
    try {
        const id = crypto_1.default.randomUUID();
        // TEST MODE: Append timestamp to prolificPid to allow duplicates
        const uniqueProlificPid = `${prolificPid}_${Date.now()}`;
        console.log(`[Backend] TEST MODE: Using unique prolificPid: ${uniqueProlificPid}`);
        const newDoc = await db_1.prisma.participant.create({
            data: {
                participantId: id,
                prolificPid: uniqueProlificPid,
                studyId,
                sessionId,
                registeredAt: new Date(),
                createdAt: new Date(),
            }
        });
        console.log(`[Backend] Created new participant for Prolific ID: ${prolificPid}, Participant ID: ${id}`);
        return res.status(201).json({
            participantId: newDoc.participantId,
            message: 'New participant created',
            isExisting: false
        });
    }
    catch (createError) {
        // Handle duplicate key error (race condition)
        if (createError.code === 'P2002') { // Prisma unique constraint violation
            console.log(`[Backend] Race condition detected for Prolific ID: ${prolificPid}. Checking for existing participant...`);
            // Try to find the participant that was just created
            const raceConditionParticipant = await db_1.prisma.participant.findFirst({
                where: { prolificPid }
            });
            if (raceConditionParticipant) {
                console.log(`[Backend] Found existing participant from race condition: ${raceConditionParticipant.participantId}`);
                return res.status(200).json({
                    participantId: raceConditionParticipant.participantId,
                    message: 'Returning existing participant (race condition handled)',
                    isExisting: true
                });
            }
        }
        // Re-throw if it's not a duplicate key error
        console.error(`[Backend] Error creating participant for Prolific ID: ${prolificPid}`, createError);
        throw createError;
    }
});
// INGEST phase data (practice, skill, etc)
exports.router.post('/api/v1/ingest-phase', async (req, res) => {
    const { participantId, phase, data } = req.body;
    if (!participantId || !phase || !data) {
        console.error('[INGEST ERROR] Missing required fields', { participantId, phase, hasData: !!data });
        return res.status(400).json({ error: 'Missing required fields' });
    }
    try {
        console.log(`[INGEST] Storing data for participant ${participantId}, phase: ${phase}`);
        // Map phase to the correct field
        const phaseFieldMap = {
            practice: 'testPractice',
            skill: 'testSkill',
            benchmark: 'testBenchmark',
            strategy: 'testStrategy',
            final: 'testFinal'
        };
        const fieldName = phaseFieldMap[phase];
        if (!fieldName) {
            return res.status(400).json({ error: 'Invalid phase name' });
        }
        const updateData = {};
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
        };
        const updated = await db_1.prisma.participant.update({
            where: { participantId },
            data: updateData,
            select: { participantId: true } // Only select ID to prevent pulling huge JSON columns into memory
        });
        console.log(`[INGEST SUCCESS] Data stored for participant ${participantId}, phase: ${phase}`);
        return res.status(200).json({ success: true });
    }
    catch (err) {
        // Handle Prisma "Record to update not found" error efficiently
        if (err.code === 'P2025') {
            console.error(`[INGEST ERROR] Participant not found for update: ${participantId}`);
            return res.status(404).json({ error: "Participant not found" });
        }
        console.error('[INGEST ERROR]', err);
        return res.status(500).json({ error: 'Failed to ingest phase data' });
    }
});
// EXPORT Prolific data for researchers
exports.router.get('/api/v1/export-prolific-data', async (req, res) => {
    try {
        const participants = await db_1.prisma.participant.findMany({
            where: {
                prolificPid: { not: null }
            }
        });
        const exportData = participants.map((p) => ({
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
        }));
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', 'attachment; filename=prolific-study-data.json');
        res.status(200).json(exportData);
    }
    catch (err) {
        console.error('[EXPORT ERROR]', err);
        return res.status(500).json({ error: 'Failed to export data' });
    }
});
// LOG time tracking data
exports.router.post('/api/v1/log-time', async (req, res) => {
    const { participantId, sectionName, questionId, timeData, interactionType } = req.body;
    if (!participantId || !timeData) {
        return res.status(400).json({ error: 'Missing required fields: participantId, timeData' });
    }
    try {
        const participant = await db_1.prisma.participant.findFirst({
            where: { participantId }
        });
        if (!participant) {
            return res.status(404).json({ error: 'Participant not found' });
        }
        // Get existing time tracking or initialize
        let timeTracking = participant.timeTracking || {
            totalStudyTime: 0,
            sections: [],
            sessionStart: new Date().toISOString(),
            sessionEnd: null
        };
        // Handle different types of time logging
        if (sectionName && !questionId) {
            // Section-level time tracking
            const existingSection = timeTracking.sections.find((s) => s.sectionName === sectionName);
            if (existingSection) {
                if (timeData.endTime) {
                    existingSection.endTime = timeData.endTime;
                    existingSection.timeSpent = new Date(timeData.endTime).getTime() - new Date(existingSection.startTime).getTime();
                }
            }
            else {
                timeTracking.sections.push({
                    sectionName,
                    startTime: timeData.startTime,
                    endTime: timeData.endTime || null,
                    timeSpent: timeData.timeSpent || 0,
                    questionTimes: []
                });
            }
        }
        else if (sectionName && questionId) {
            // Question-level time tracking
            let section = timeTracking.sections.find((s) => s.sectionName === sectionName);
            if (!section) {
                const newSection = {
                    sectionName,
                    startTime: new Date().toISOString(),
                    endTime: null,
                    timeSpent: 0,
                    questionTimes: []
                };
                timeTracking.sections.push(newSection);
                section = timeTracking.sections[timeTracking.sections.length - 1];
            }
            const existingQuestion = section.questionTimes.find((q) => q.questionId === questionId);
            if (existingQuestion) {
                if (timeData.endTime) {
                    existingQuestion.endTime = timeData.endTime;
                    existingQuestion.timeSpent = new Date(timeData.endTime).getTime() - new Date(existingQuestion.startTime).getTime();
                }
                // Add interaction if provided
                if (interactionType) {
                    if (!existingQuestion.interactions) {
                        existingQuestion.interactions = [];
                    }
                    existingQuestion.interactions.push({
                        type: interactionType,
                        timestamp: new Date().toISOString(),
                        data: timeData.interactionData || {}
                    });
                }
            }
            else {
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
                });
            }
        }
        // Update total study time
        if (timeData.totalStudyTime) {
            timeTracking.totalStudyTime = timeData.totalStudyTime;
        }
        await db_1.prisma.participant.update({
            where: { participantId },
            data: { timeTracking }
        });
        return res.status(200).json({
            success: true,
            message: 'Time data logged successfully'
        });
    }
    catch (err) {
        console.error('[LOG TIME ERROR]', err);
        return res.status(500).json({ error: 'Failed to log time data' });
    }
});
// GET time analytics for a participant
exports.router.get('/api/v1/participant-analytics/:participantId', async (req, res) => {
    const { participantId } = req.params;
    try {
        const participant = await db_1.prisma.participant.findFirst({
            where: { participantId }
        });
        if (!participant) {
            return res.status(404).json({ error: 'Participant not found' });
        }
        const timeTracking = participant.timeTracking || {};
        // Calculate analytics
        const analytics = {
            participantId,
            prolificPid: participant.prolificPid,
            totalStudyTime: timeTracking.totalStudyTime || 0,
            sessionDuration: timeTracking.sessionStart && timeTracking.sessionEnd
                ? new Date(timeTracking.sessionEnd).getTime() - new Date(timeTracking.sessionStart).getTime()
                : null,
            sections: (timeTracking.sections || []).map((section) => ({
                sectionName: section.sectionName,
                timeSpent: section.timeSpent,
                questionCount: section.questionTimes?.length || 0,
                avgTimePerQuestion: section.questionTimes?.length > 0
                    ? section.questionTimes.reduce((sum, q) => sum + (q.timeSpent || 0), 0) / section.questionTimes.length
                    : 0,
                questions: (section.questionTimes || []).map((q) => ({
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
        };
        return res.status(200).json(analytics);
    }
    catch (err) {
        console.error('[PARTICIPANT ANALYTICS ERROR]', err);
        return res.status(500).json({ error: 'Failed to get participant analytics' });
    }
});
// GET study statistics
exports.router.get('/api/v1/study-stats', async (req, res) => {
    try {
        const totalParticipants = await db_1.prisma.participant.count({
            where: {
                prolificPid: { not: null }
            }
        });
        const completedParticipants = await db_1.prisma.participant.count({
            where: {
                prolificPid: { not: null },
                completedAt: { not: null }
            }
        });
        // Get all participants for phase stats
        const participants = await db_1.prisma.participant.findMany({
            where: { prolificPid: { not: null } },
            select: {
                testPractice: true,
                testSkill: true,
                testBenchmark: true,
                testStrategy: true,
                testFinal: true
            }
        });
        let practiceCount = 0, skillCount = 0, benchmarkCount = 0, strategyCount = 0, finalCount = 0;
        participants.forEach((p) => {
            if (p.testPractice?.completed)
                practiceCount++;
            if (p.testSkill?.completed)
                skillCount++;
            if (p.testBenchmark?.completed)
                benchmarkCount++;
            if (p.testStrategy?.completed)
                strategyCount++;
            if (p.testFinal?.completed)
                finalCount++;
        });
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
        });
    }
    catch (err) {
        console.error('[STATS ERROR]', err);
        return res.status(500).json({ error: 'Failed to get stats' });
    }
});
// ADMIN AUTHENTICATION MIDDLEWARE
const adminAuth = (req, res, next) => {
    const adminKey = req.headers['x-admin-key'] || req.query.adminKey;
    const validAdminKey = process.env.ADMIN_KEY || 'knapsack-admin-2024-secure';
    if (!adminKey || adminKey !== validAdminKey) {
        return res.status(401).json({
            error: 'Unauthorized. Admin access required.',
            hint: 'Provide valid admin key in x-admin-key header or adminKey query parameter'
        });
    }
    next();
};
// ADMIN EXPORT CSV - Protected Route
exports.router.get('/api/v1/admin/export-csv', adminAuth, async (req, res) => {
    try {
        const participants = await db_1.prisma.participant.findMany({
            where: {},
            orderBy: {
                createdAt: 'desc'
            }
        });
        // Define CSV Headers
        const headers = [
            'Participant ID',
            'Prolific PID',
            'Study ID',
            'Session ID',
            'Registered At',
            'Completed At',
            'Total Study Time (min)',
            // Practice
            'Practice Completed',
            'Practice Accuracy',
            'Practice Score',
            // Skill
            'Skill Completed',
            'Skill Accuracy',
            'Skill Score',
            // Benchmark
            'Benchmark Completed',
            'Benchmark Accuracy',
            'Benchmark Score',
            // Strategy
            'Strategy Completed',
            'Strategy Questions Answered',
            'Strategy Time Used',
            // Final
            'Final Completed',
            'Final Accuracy',
            'Final Score'
        ].join(',');
        // Transform data to CSV rows
        const rows = participants.map((p) => {
            const timeTracking = p.timeTracking || {};
            const practice = p.testPractice || {};
            const skill = p.testSkill || {};
            const benchmark = p.testBenchmark || {};
            const strategy = p.testStrategy || {};
            const final = p.testFinal || {};
            const formatDate = (d) => d ? new Date(d).toISOString() : '';
            const safeNum = (n) => n !== undefined && n !== null ? n : 0;
            const safeBool = (b) => b ? 'Yes' : 'No';
            return [
                p.participantId,
                p.prolificPid,
                p.studyId,
                p.sessionId,
                formatDate(p.registeredAt),
                formatDate(p.completedAt),
                safeNum(timeTracking.totalStudyTime) / 60000, // Convert ms to min
                // Practice
                safeBool(practice.completed),
                safeNum(practice.accuracy),
                safeNum(practice.totalPoints),
                // Skill
                safeBool(skill.completed),
                safeNum(skill.accuracy),
                safeNum(skill.totalPoints),
                // Benchmark
                safeBool(benchmark.completed),
                safeNum(benchmark.accuracy),
                safeNum(benchmark.totalPoints),
                // Strategy
                safeBool(strategy.completed),
                safeNum(strategy.questionsAnswered),
                safeNum(strategy.timeUsed) / 1000, // Seconds
                // Final
                safeBool(final.completed),
                safeNum(final.accuracy),
                safeNum(final.totalPoints)
            ].map(val => `"${val}"`).join(','); // Quote all values to handle commas safely
        });
        const csvContent = [headers, ...rows].join('\n');
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename=knapsack_activities_${new Date().toISOString().split('T')[0]}.csv`);
        return res.status(200).send(csvContent);
    }
    catch (err) {
        console.error('[ADMIN EXPORT CSV ERROR]', err);
        return res.status(500).json({ error: 'Failed to export CSV' });
    }
});
// ADMIN ANALYTICS DASHBOARD - Protected Route
exports.router.get('/api/v1/admin/analytics', adminAuth, async (req, res) => {
    try {
        const participants = await db_1.prisma.participant.findMany({
            orderBy: {
                createdAt: 'desc'
            }
        });
        // Calculate comprehensive analytics
        const requiredPhases = ['practice', 'skill', 'benchmark', 'strategy', 'final'];
        const completedParticipants = participants.filter((p) => {
            const tests = {
                practice: p.testPractice,
                skill: p.testSkill,
                benchmark: p.testBenchmark,
                strategy: p.testStrategy,
                final: p.testFinal
            };
            const completedPhases = requiredPhases.filter(phase => tests[phase]?.completed === true);
            return completedPhases.length === requiredPhases.length;
        });
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
            participantDetails: participants.map((p) => {
                const timeTracking = p.timeTracking || {};
                return {
                    participantId: p.participantId,
                    prolificPid: p.prolificPid,
                    email: p.email,
                    registeredAt: p.registeredAt,
                    completedAt: p.completedAt,
                    totalStudyTime: timeTracking.totalStudyTime || 0,
                    sectionsCompleted: timeTracking.sections?.length || 0,
                    testResults: {
                        practice: p.testPractice ? {
                            completed: p.testPractice.completed,
                            accuracy: p.testPractice.accuracy,
                            correctAnswers: p.testPractice.correctAnswers,
                            totalQuestions: p.testPractice.totalQuestions
                        } : null,
                        skill: p.testSkill ? {
                            completed: p.testSkill.completed,
                            accuracy: p.testSkill.accuracy,
                            correctAnswers: p.testSkill.correctAnswers,
                            totalQuestions: p.testSkill.totalQuestions
                        } : null,
                        benchmark: p.testBenchmark ? {
                            completed: p.testBenchmark.completed,
                            accuracy: p.testBenchmark.accuracy,
                            correctAnswers: p.testBenchmark.correctAnswers,
                            totalQuestions: p.testBenchmark.totalQuestions
                        } : null,
                        strategy: p.testStrategy ? {
                            completed: p.testStrategy.completed,
                            answers: p.testStrategy.answers,
                            questionsAnswered: p.testStrategy.questionsAnswered,
                            totalQuestions: p.testStrategy.totalQuestions,
                            timeUsed: p.testStrategy.timeUsed,
                            questionTimes: p.testStrategy.questionTimes
                        } : null,
                        final: p.testFinal ? {
                            completed: p.testFinal.completed,
                            accuracy: p.testFinal.accuracy,
                            correctAnswers: p.testFinal.correctAnswers,
                            totalQuestions: p.testFinal.totalQuestions
                        } : null
                    },
                    timeBreakdown: (timeTracking.sections || [])
                        .filter((section) => (section.timeSpent || 0) > 0)
                        .map((section) => ({
                        sectionName: section.sectionName,
                        timeSpent: section.timeSpent || 0,
                        questionCount: section.questionTimes?.length || 0,
                        avgTimePerQuestion: section.questionTimes?.length > 0
                            ? section.questionTimes.reduce((sum, q) => sum + (q.timeSpent || 0), 0) / section.questionTimes.length
                            : 0
                    }))
                };
            })
        };
        // Calculate aggregate time analytics
        const validTimeData = participants.filter((p) => p.timeTracking?.totalStudyTime);
        if (validTimeData.length > 0) {
            analytics.overview.totalStudyTime = validTimeData.reduce((sum, p) => sum + (p.timeTracking?.totalStudyTime || 0), 0);
            analytics.overview.avgStudyTime = analytics.overview.totalStudyTime / validTimeData.length;
        }
        // Section time analytics
        const sectionTimes = {};
        participants.forEach((p) => {
            const timeTracking = p.timeTracking || {};
            (timeTracking.sections || []).forEach((section) => {
                if (!sectionTimes[section.sectionName]) {
                    sectionTimes[section.sectionName] = [];
                }
                if (section.timeSpent) {
                    sectionTimes[section.sectionName].push(section.timeSpent);
                }
            });
        });
        Object.keys(sectionTimes).forEach(sectionName => {
            const times = sectionTimes[sectionName];
            analytics.timeAnalytics.avgTimePerSection[sectionName] = times.length > 0
                ? times.reduce((sum, time) => sum + time, 0) / times.length
                : 0;
        });
        return res.status(200).json(analytics);
    }
    catch (err) {
        console.error('[ADMIN ANALYTICS ERROR]', err);
        return res.status(500).json({ error: 'Failed to get admin analytics' });
    }
});
// ADMIN PARTICIPANT DETAIL - Protected Route
exports.router.get('/api/v1/admin/participant/:participantId', adminAuth, async (req, res) => {
    const { participantId } = req.params;
    try {
        const participant = await db_1.prisma.participant.findFirst({
            where: { participantId }
        });
        if (!participant) {
            return res.status(404).json({ error: 'Participant not found' });
        }
        const timeTracking = participant.timeTracking || {};
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
                sectionBreakdown: (timeTracking.sections || []).map((section) => ({
                    sectionName: section.sectionName,
                    startTime: section.startTime,
                    endTime: section.endTime,
                    timeSpent: section.timeSpent,
                    questionAnalysis: (section.questionTimes || []).map((q) => ({
                        questionId: q.questionId,
                        timeSpent: q.timeSpent,
                        startTime: q.startTime,
                        endTime: q.endTime,
                        interactionCount: q.interactions?.length || 0,
                        interactions: (q.interactions || []).map((interaction) => ({
                            type: interaction.type,
                            timestamp: interaction.timestamp,
                            data: interaction.data
                        }))
                    }))
                }))
            }
        };
        return res.status(200).json(detailedAnalytics);
    }
    catch (err) {
        console.error('[ADMIN PARTICIPANT DETAIL ERROR]', err);
        return res.status(500).json({ error: 'Failed to get participant details' });
    }
});
