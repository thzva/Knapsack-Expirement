import express from 'express';
import { prisma } from '../db';
import { sendVerificationEmail } from '../services/emailService';
import crypto from 'crypto';

export const router = express.Router();

// Generate a 6-digit code
const generateCode = () => {
    return crypto.randomInt(100000, 999999).toString();
};

// POST /auth/send-code
router.post('/auth/send-code', async (req, res) => {
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
        await prisma.emailVerification.upsert({
            where: { email },
            update: { code, expiresAt },
            create: { email, code, expiresAt },
        });
        console.timeEnd('[PERF] DB Upsert');

        // Send email
        console.time('[PERF] Email Send');
        await sendVerificationEmail(email, code);
        console.timeEnd('[PERF] Email Send');

        return res.status(200).json({ success: true, message: 'Verification code sent' });
    } catch (error) {
        console.error('[AUTH ERROR] send-code:', error);
        return res.status(500).json({ error: 'Failed to send verification code' });
    }
});

// POST /auth/verify-code
router.post('/auth/verify-code', async (req, res) => {
    const { email, code } = req.body;

    if (!email || !code) {
        return res.status(400).json({ error: 'Email and code are required' });
    }

    try {
        const verification = await prisma.emailVerification.findUnique({
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
        await prisma.emailVerification.delete({ where: { email } });

        // Create or retrieve participant
        // We use a deterministic method to generate participantId from email if we want to retrieve the same user
        // OR we just find by email.
        // Schema update added `email` to Participant.

        let participant = await prisma.participant.findUnique({
            where: { email },
        });

        if (!participant) {
            // Create new participant
            participant = await prisma.participant.create({
                data: {
                    participantId: crypto.randomUUID(),
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

    } catch (error) {
        console.error('[AUTH ERROR] verify-code:', error);
        return res.status(500).json({ error: 'Verification failed' });
    }
});
