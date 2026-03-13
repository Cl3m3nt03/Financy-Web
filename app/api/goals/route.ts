import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { goalSchema } from '@/lib/validations'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const userId = (session.user as any).id

  const goals = await prisma.goal.findMany({
    where: { userId },
    orderBy: { targetDate: 'asc' },
  })

  return NextResponse.json(goals)
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const userId = (session.user as any).id

  const body = await req.json()
  const parsed = goalSchema.safeParse(body)
  if (!parsed.success) {
    const msg = parsed.error.issues.map(i => i.message).join(', ')
    return NextResponse.json({ error: msg }, { status: 400 })
  }

  const goal = await prisma.goal.create({
    data: {
      userId,
      name: parsed.data.name,
      targetValue: parsed.data.targetValue,
      currency: parsed.data.currency,
      targetDate: parsed.data.targetDate ? new Date(parsed.data.targetDate) : null,
      notes: parsed.data.notes ?? null,
    },
  })

  return NextResponse.json(goal, { status: 201 })
}
