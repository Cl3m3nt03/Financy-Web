import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const userId = (session.user as any).id
  const assets = await prisma.asset.findMany({
    where: { userId },
    include: { holdings: true },
    orderBy: { updatedAt: 'desc' },
  })

  return NextResponse.json(assets)
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const userId = (session.user as any).id
  const body = await req.json()

  const asset = await prisma.asset.create({
    data: {
      userId,
      name: body.name,
      type: body.type,
      institution: body.institution ?? null,
      value: parseFloat(body.value),
      currency: body.currency ?? 'EUR',
      notes: body.notes ?? null,
    },
  })

  return NextResponse.json(asset, { status: 201 })
}
