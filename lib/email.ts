const RESEND_API_KEY = process.env.RESEND_API_KEY
const EMAIL_FROM = process.env.EMAIL_FROM ?? 'Finexa <onboarding@resend.dev>'

async function sendEmail(to: string, subject: string, html: string): Promise<boolean> {
  if (!RESEND_API_KEY) {
    console.warn(`[FINANCY EMAIL] RESEND_API_KEY manquant — email pour ${to} non envoyé`)
    return false
  }
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: EMAIL_FROM, to: [to], subject, html }),
    })
    if (!res.ok) console.error(`[FINANCY EMAIL] Resend error ${res.status}: ${await res.text()}`)
    return res.ok
  } catch (e) {
    console.error('[FINANCY EMAIL] Network error:', e)
    return false
  }
}

export async function sendPasswordResetEmail(to: string, name: string | undefined, resetUrl: string): Promise<boolean> {
  const firstName = name ? name.split(' ')[0] : 'là'
  const html = `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#09090B;font-family:Inter,-apple-system,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="min-height:100vh;background:#09090B;">
    <tr><td align="center" style="padding:40px 16px;">
      <table width="480" cellpadding="0" cellspacing="0" style="max-width:480px;width:100%;background:#18181B;border:1px solid #27272A;border-radius:16px;overflow:hidden;">
        <tr>
          <td style="padding:28px 32px 20px;border-bottom:1px solid #27272A;">
            <table cellpadding="0" cellspacing="0"><tr>
              <td style="width:36px;height:36px;background:#C9A84C;border-radius:10px;text-align:center;vertical-align:middle;">
                <span style="color:#09090B;font-weight:800;font-size:18px;line-height:36px;">F</span>
              </td>
              <td style="padding-left:12px;"><span style="color:#FAFAFA;font-weight:700;font-size:18px;">Financy</span></td>
            </tr></table>
          </td>
        </tr>
        <tr><td style="padding:32px;">
          <p style="color:#A1A1AA;font-size:15px;margin:0 0 6px;">Bonjour ${firstName},</p>
          <p style="color:#FAFAFA;font-size:15px;margin:0 0 24px;line-height:1.6;">
            Vous avez demandé à réinitialiser votre mot de passe. Cliquez sur le bouton ci-dessous pour en choisir un nouveau.
          </p>
          <div style="text-align:center;margin-bottom:28px;">
            <a href="${resetUrl}" style="display:inline-block;background:#C9A84C;color:#09090B;font-weight:700;font-size:15px;padding:14px 32px;border-radius:12px;text-decoration:none;">
              Réinitialiser mon mot de passe
            </a>
          </div>
          <p style="color:#71717A;font-size:13px;margin:0 0 8px;line-height:1.6;">
            Ce lien expire dans <strong style="color:#A1A1AA;">1 heure</strong>.
          </p>
          <p style="color:#71717A;font-size:13px;margin:0;line-height:1.6;">
            Si vous n'avez pas demandé cette réinitialisation, ignorez cet email.
          </p>
          <div style="margin-top:20px;padding:12px 16px;background:#09090B;border-radius:8px;border:1px solid #3F3F46;">
            <p style="color:#52525B;font-size:11px;margin:0;word-break:break-all;">Lien : ${resetUrl}</p>
          </div>
        </td></tr>
        <tr><td style="padding:16px 32px;border-top:1px solid #27272A;text-align:center;">
          <p style="color:#52525B;font-size:12px;margin:0;">Financy · Votre tableau de bord patrimonial</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
  return sendEmail(to, '🔑 Réinitialisation de votre mot de passe — Financy', html)
}

export function generateOtpCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

export async function sendAlertEmail(
  to: string,
  opts: { symbol: string; name?: string | null; condition: 'above' | 'below'; target: number; price: number; currency: string }
): Promise<boolean> {
  const condLabel = opts.condition === 'above' ? 'au-dessus de' : 'en dessous de'
  const arrow     = opts.condition === 'above' ? '↑' : '↓'
  const color     = opts.condition === 'above' ? '#10B981' : '#EF4444'
  const html = `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#09090B;font-family:Inter,-apple-system,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#09090B;">
    <tr><td align="center" style="padding:40px 16px;">
      <table width="480" cellpadding="0" cellspacing="0" style="max-width:480px;width:100%;background:#18181B;border:1px solid #27272A;border-radius:16px;overflow:hidden;">
        <tr>
          <td style="padding:24px 32px 20px;border-bottom:1px solid #27272A;">
            <table cellpadding="0" cellspacing="0"><tr>
              <td style="width:36px;height:36px;background:#C9A84C;border-radius:10px;text-align:center;vertical-align:middle;">
                <span style="color:#09090B;font-weight:800;font-size:18px;">F</span>
              </td>
              <td style="padding-left:12px;"><span style="color:#FAFAFA;font-weight:700;font-size:18px;">Finexa</span></td>
            </tr></table>
          </td>
        </tr>
        <tr><td style="padding:32px;">
          <div style="background:${color}15;border:1px solid ${color}40;border-radius:12px;padding:20px 24px;text-align:center;margin-bottom:24px;">
            <p style="color:${color};font-size:32px;font-weight:800;margin:0;font-family:monospace;">${arrow} ${opts.symbol}</p>
            ${opts.name && opts.name !== opts.symbol ? `<p style="color:#A1A1AA;font-size:13px;margin:4px 0 0;">${opts.name}</p>` : ''}
          </div>
          <p style="color:#FAFAFA;font-size:15px;margin:0 0 12px;">
            Votre alerte a été déclenchée : <strong>${opts.symbol}</strong> est passé ${condLabel}
            <strong style="color:${color};font-family:monospace;"> ${opts.target.toLocaleString('fr-FR')} ${opts.currency}</strong>.
          </p>
          <p style="color:#A1A1AA;font-size:14px;margin:0 0 8px;">
            Cours actuel : <strong style="color:#FAFAFA;font-family:monospace;">${opts.price.toLocaleString('fr-FR', { maximumFractionDigits: 2 })} ${opts.currency}</strong>
          </p>
          <p style="color:#71717A;font-size:12px;margin:0;">Cette alerte a été automatiquement marquée comme déclenchée dans Finexa.</p>
        </td></tr>
        <tr><td style="padding:16px 32px;border-top:1px solid #27272A;text-align:center;">
          <p style="color:#52525B;font-size:12px;margin:0;">Finexa · Votre tableau de bord patrimonial</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
  return sendEmail(to, `🔔 Alerte ${opts.symbol} déclenchée — Finexa`, html)
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
        subject: 'Votre code de vérification — Finexa',
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
                  <span style="color:#FAFAFA;font-weight:700;font-size:18px;">Finexa</span>
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
              Voici votre code de vérification pour accéder à Finexa :
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
            <p style="color:#52525B;font-size:12px;margin:0;">Finexa · Votre tableau de bord patrimonial</p>
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
