import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { createRequisition } from '@/lib/gocardless'

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const userId = (session.user as any).id

  try {
    const { institutionId } = await req.json()
    if (!institutionId) return NextResponse.json({ error: 'institutionId required' }, { status: 400 })

    const appUrl      = process.env.NEXTAUTH_URL ?? 'http://localhost:3000'
    const redirectUri = `${appUrl}/api/bank/callback`

    // Create DB record first to get a reference ID
    const connection = await prisma.bankConnection.create({
      data: { userId, institutionId, status: 'PENDING' },
    })

    const requisition = await createRequisition(institutionId, redirectUri, connection.id)

    // Store the requisition ID (reusing tinkUserId column)
    await prisma.bankConnection.update({
      where: { id: connection.id },
      data:  { tinkUserId: requisition.id },
    })

    return NextResponse.json({ link: requisition.link, connectionId: connection.id })
  } catch (e: any) {
    console.error('[GC CONNECT]', e)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
