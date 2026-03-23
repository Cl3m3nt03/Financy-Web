const RESEND_API_KEY = process.env.RESEND_API_KEY
const EMAIL_FROM = process.env.EMAIL_FROM ?? 'Financy <onboarding@resend.dev>'

export function generateOtpCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

export async function sendOtpEmail(to: string, code: string): Promise<boolean> {
  if (!RESEND_API_KEY) {
    console.warn(`[FINANCY EMAIL] RESEND_API_KEY manquant — code OTP pour ${to} : ${code}`)
    return false
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
        subject: 'Votre code de vérification — Financy',
        html: `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#09090B;font-family:Inter,-apple-system,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="min-height:100vh;background:#09090B;">
    <tr><td align="center" style="padding:40px 16px;">
      <table width="480" cellpadding="0" cellspacing="0" style="max-width:480px;width:100%;background:#18181B;border:1px solid #27272A;border-radius:16px;overflow:hidden;">
        <!-- Header -->
        <tr>
          <td style="padding:28px 32px 20px;border-bottom:1px solid #27272A;">
            <table cellpadding="0" cellspacing="0">
              <tr>
                <td style="width:36px;height:36px;background:#C9A84C;border-radius:10px;text-align:center;vertical-align:middle;">
                  <span style="color:#09090B;font-weight:800;font-size:18px;line-height:36px;">F</span>
                </td>
                <td style="padding-left:12px;">
                  <span style="color:#FAFAFA;font-weight:700;font-size:18px;">Financy</span>
                </td>
              </tr>
            </table>
          </td>
        </tr>
        <!-- Body -->
        <tr>
          <td style="padding:32px;">
            <p style="color:#A1A1AA;font-size:15px;margin:0 0 6px;line-height:1.5;">Bonjour,</p>
            <p style="color:#FAFAFA;font-size:15px;margin:0 0 28px;line-height:1.6;">
              Voici votre code de vérification pour accéder à Financy :
            </p>
            <div style="background:#09090B;border:1px solid #3F3F46;border-radius:12px;padding:28px 24px;text-align:center;margin-bottom:28px;">
              <span style="font-size:42px;font-weight:800;letter-spacing:16px;color:#C9A84C;font-family:monospace;">${code}</span>
            </div>
            <p style="color:#71717A;font-size:13px;margin:0 0 8px;line-height:1.6;">
              Ce code est valable <strong style="color:#A1A1AA;">10 minutes</strong>.
            </p>
            <p style="color:#71717A;font-size:13px;margin:0;line-height:1.6;">
              Si vous n'avez pas demandé ce code, vous pouvez ignorer cet email en toute sécurité.
            </p>
          </td>
        </tr>
        <!-- Footer -->
        <tr>
          <td style="padding:16px 32px;border-top:1px solid #27272A;text-align:center;">
            <p style="color:#52525B;font-size:12px;margin:0;">Financy · Votre tableau de bord patrimonial</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`,
      }),
    })

    if (!res.ok) {
      const err = await res.text()
      console.error(`[FINANCY EMAIL] Resend error ${res.status}: ${err}`)
    }
    return res.ok
  } catch (e) {
    console.error('[FINANCY EMAIL] Network error:', e)
    return false
  }
}
