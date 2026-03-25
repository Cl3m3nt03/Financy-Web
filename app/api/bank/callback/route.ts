import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { exchangeCode } from '@/lib/tink'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const appUrl = (process.env.NEXTAUTH_URL ?? 'https://finexa.vercel.app').trim()
  console.log('[CALLBACK] start', req.url.slice(0, 100))

  try {
    const { searchParams } = new URL(req.url)
    const code  = searchParams.get('code')
    const state = searchParams.get('state')
    const error = searchParams.get('error')

    if (error || !code || !state) {
      return NextResponse.redirect(`${appUrl}/settings?bank=error&reason=${error ?? 'missing_params'}`)
    }
    // Look up by state (connectionId) — session may not be available in redirect callback
    const connection = await prisma.bankConnection.findFirst({
      where: { id: state, status: 'PENDING' },
    })

    if (!connection) {
      return NextResponse.redirect(`${appUrl}/settings?bank=error&reason=no_connection`)
    }

    // Exchange code for tokens and store — account sync happens in /api/bank/sync
    const tokens = await exchangeCode(code)

    await prisma.bankConnection.update({
      where: { id: connection.id },
      data:  {
        status:       'LINKED',
        accessToken:  tokens.access_token,
        refreshToken: tokens.refresh_token,
        lastSyncAt:   new Date(),
      },
    })

    return NextResponse.redirect(`${appUrl}/settings?bank=linked`)
  } catch (e: any) {
    console.error('[TINK CALLBACK]', e)
    return NextResponse.redirect(`${appUrl}/settings?bank=error&reason=callback_failed`)
  }
}
