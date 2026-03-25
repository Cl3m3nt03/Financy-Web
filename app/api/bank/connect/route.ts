import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { buildTinkLinkUrl } from '@/lib/tink'

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const userId = (session.user as any).id

  const appUrl      = (process.env.NEXTAUTH_URL ?? 'http://localhost:3000').trim()
  const redirectUri = `${appUrl}/api/bank/callback`

  try {
    const connection = await prisma.bankConnection.create({
      data: { userId, institutionId: 'tink', institutionName: null, status: 'PENDING' },
    })

    const link = buildTinkLinkUrl(redirectUri, connection.id)

    return NextResponse.json({ link, connectionId: connection.id })
  } catch (e: any) {
    console.error('[TINK CONNECT]', e)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
