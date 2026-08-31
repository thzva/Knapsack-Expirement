"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.router = void 0;
const express_1 = __importDefault(require("express"));
const db_1 = require("../db");
const emailService_1 = require("../services/emailService");
const crypto_1 = __importDefault(require("crypto"));
exports.router = express_1.default.Router();
// Generate a 6-digit code
const generateCode = () => {
    return crypto_1.default.randomInt(100000, 999999).toString();
};
// POST /auth/send-code
exports.router.post('/auth/send-code', async (req, res) => {
    console.log('[AUTH] Received send-code request body:', req.body);
    const { email } = req.body;
    if (!email || typeof email !== 'string') {
        return res.status(400).json({ error: 'Valid email is required' });
    }
    try {
        const code = generateCode();
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
        // Upsert verification record
        console.time('[PERF] DB Upsert');
        await db_1.prisma.emailVerification.upsert({
            where: { email },
            update: { code, expiresAt },
            create: { email, code, expiresAt },
        });
        console.timeEnd('[PERF] DB Upsert');
        // Send email
        console.time('[PERF] Email Send');
        await (0, emailService_1.sendVerificationEmail)(email, code);
        console.timeEnd('[PERF] Email Send');
        return res.status(200).json({ success: true, message: 'Verification code sent' });
    }
    catch (error) {
        console.error('[AUTH ERROR] send-code:', error);
        return res.status(500).json({ error: 'Failed to send verification code' });
    }
});
// POST /auth/verify-code
exports.router.post('/auth/verify-code', async (req, res) => {
    const { email, code } = req.body;
    if (!email || !code) {
        return res.status(400).json({ error: 'Email and code are required' });
    }
    try {
        const verification = await db_1.prisma.emailVerification.findUnique({
            where: { email },
        });
        if (!verification) {
            return res.status(400).json({ error: 'Invalid or expired code' });
        }
        if (verification.code !== code) {
            return res.status(400).json({ error: 'Invalid code' });
        }
        if (new Date() > verification.expiresAt) {
            return res.status(400).json({ error: 'Code expired. Please request a new one.' });
        }
        // Code is valid. Clean up verification record.
        await db_1.prisma.emailVerification.delete({ where: { email } });
        // Create or retrieve participant
        // We use a deterministic method to generate participantId from email if we want to retrieve the same user
        // OR we just find by email.
        // Schema update added `email` to Participant.
        let participant = await db_1.prisma.participant.findUnique({
            where: { email },
        });
        if (!participant) {
            // Create new participant
            participant = await db_1.prisma.participant.create({
                data: {
                    participantId: crypto_1.default.randomUUID(),
                    email,
                    prolificPid: email,
                    createdAt: new Date(),
                    registeredAt: new Date(),
                }
            });
        }
        return res.status(200).json({
            success: true,
            participantId: participant.participantId,
            email: participant.email
        });
    }
    catch (error) {
        console.error('[AUTH ERROR] verify-code:', error);
        return res.status(500).json({ error: 'Verification failed' });
    }
});
