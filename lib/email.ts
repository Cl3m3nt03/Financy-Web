const RESEND_API_KEY = process.env.RESEND_API_KEY
const EMAIL_FROM = process.env.EMAIL_FROM ?? 'Wealth Tracker <onboarding@resend.dev>'

export function generateOtpCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

export async function sendOtpEmail(to: string, code: string): Promise<boolean> {
  if (!RESEND_API_KEY) {
    // Mode dev : affiche le code dans les logs Vercel / terminal
    console.log(`[EMAIL OTP] Code pour ${to} : ${code}`)
    return true
  }

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: EMAIL_FROM,
        to: [to],
        subject: 'Votre code de vérification — Wealth Tracker',
        html: `
          <div style="font-family:Inter,sans-serif;max-width:480px;margin:0 auto;background:#09090B;padding:32px;border-radius:16px;border:1px solid #3F3F46;">
            <div style="display:flex;align-items:center;gap:12px;margin-bottom:24px;">
              <div style="width:36px;height:36px;background:#C9A84C;border-radius:10px;display:flex;align-items:center;justify-content:center;">
                <span style="color:#09090B;font-weight:bold;font-size:18px;">W</span>
              </div>
              <span style="color:#FAFAFA;font-weight:700;font-size:18px;">Wealth Tracker</span>
            </div>
            <p style="color:#A1A1AA;font-size:14px;margin:0 0 8px;">Voici votre code de vérification :</p>
            <div style="background:#18181B;border:1px solid #3F3F46;border-radius:12px;padding:28px;text-align:center;margin:20px 0;">
              <span style="font-size:40px;font-weight:700;letter-spacing:14px;color:#C9A84C;font-family:monospace;">${code}</span>
            </div>
            <p style="color:#71717A;font-size:13px;margin:0;">Ce code expire dans <strong style="color:#A1A1AA;">10 minutes</strong>.</p>
            <p style="color:#71717A;font-size:13px;margin:8px 0 0;">Si vous n'avez pas demandé ce code, ignorez cet email.</p>
          </div>
        `,
      }),
    })
    return res.ok
  } catch {
    return false
  }
}
