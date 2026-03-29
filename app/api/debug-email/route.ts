import { NextRequest, NextResponse } from 'next/server'

// Route temporaire de diagnostic — à supprimer après vérification
export async function GET(req: NextRequest) {
  const key    = process.env.RESEND_API_KEY
  const from   = process.env.EMAIL_FROM ?? 'Financy <onboarding@resend.dev>'
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? process.env.VERCEL_URL ?? process.env.NEXTAUTH_URL ?? 'non défini'

  if (!key) {
    return NextResponse.json({
      status: 'error',
      message: 'RESEND_API_KEY manquant dans les variables Vercel',
      fix: 'Allez dans Vercel → Settings → Environment Variables → ajouter RESEND_API_KEY',
    }, { status: 500 })
  }

  // Test Resend
  const { searchParams } = new URL(req.url)
  const to = searchParams.get('to')
  if (!to) {
    return NextResponse.json({
      status: 'config_ok',
      resend_key_present: true,
      from,
      app_url: appUrl,
      usage: 'Ajoutez ?to=votre@email.com pour envoyer un email de test',
    })
  }

  const res = await fetch('https://api.resend.com/emails', {
    method:  'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from,
      to:      [to],
      subject: 'Test Financy — Resend fonctionne ✅',
      html:    '<p>Si vous recevez cet email, <strong>Resend est correctement configuré</strong> sur Financy.</p>',
    }),
  })

  const body = await res.json()
  return NextResponse.json({
    status:      res.ok ? 'email_sent' : 'resend_error',
    http_status: res.status,
    response:    body,
  }, { status: res.ok ? 200 : 400 })
}
