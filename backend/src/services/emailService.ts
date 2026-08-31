import sgMail from '@sendgrid/mail';

// Email configuration
if (process.env.SENDGRID_API_KEY) {
    sgMail.setApiKey(process.env.SENDGRID_API_KEY);
}

export const sendVerificationEmail = async (email: string, code: string) => {
    // Check credentials
    if (!process.env.SENDGRID_API_KEY) {
        console.log('[EMAIL DEV MODE] No SENDGRID_API_KEY provided.');
        console.log(`[EMAIL DEV MODE] 📨 To: ${email} | Code: ${code}`);
        return true;
    }

    // Log masked key for debugging
    const key = process.env.SENDGRID_API_KEY;
    console.log(`[EMAIL DEBUG] Using SendGrid Key: ${key.substring(0, 4)}...${key.substring(key.length - 4)}`);

    const msg = {
        to: email,
        from: 'knapsack.exp@gmail.com', // MUST MATCH Verified Sender in SendGrid
        subject: 'Your Knapsack Experiment Verification Code',
        text: `Your verification code is: ${code}. It expires in 10 minutes.`,
        html: `<p>Your verification code is: <strong>${code}</strong></p><p>It expires in 10 minutes.</p>`,
    };

    try {
        console.log(`[EMAIL] Attempting to send to ${email}...`);

        // No timeout - allow cold starts
        await sgMail.send(msg);

        console.log(`[EMAIL SENT] 📨 To: ${email} via SendGrid`);
        return true;
    } catch (error: any) {
        console.error('[EMAIL ERROR] SendGrid failed:', error.message);
        if (error.response) {
            console.error('[EMAIL ERROR BODY]', JSON.stringify(error.response.body, null, 2));
        }

        // Fallback for dev mode continuity
        console.log(`[EMAIL FALLBACK] 📨 To: ${email} | Code: ${code}`);
        return false;
    }
};
