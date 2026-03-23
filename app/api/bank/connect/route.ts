import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { createRequisition, getInstitution } from '@/lib/nordigen'

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const userId = (session.user as any).id

  const { institutionId } = await req.json()
  if (!institutionId) return NextResponse.json({ error: 'institutionId requis' }, { status: 400 })

  try {
    const institution = await getInstitution(institutionId)
    const appUrl = process.env.NEXTAUTH_URL ?? 'http://localhost:3000'
    const redirectUri = `${appUrl}/settings?bank=linked`
    const reference = `financy-${userId}-${Date.now()}`

    const requisition = await createRequisition(institutionId, redirectUri, reference)

    // Save pending connection
    await prisma.bankConnection.create({
      data: {
        userId,
        institutionId,
        institutionName: institution.name,
        requisitionId: requisition.id,
        status: 'PENDING',
      },
    })

    return NextResponse.json({ link: requisition.link, requisitionId: requisition.id })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
