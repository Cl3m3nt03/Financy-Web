import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getUser } from '@/lib/mobile-auth'
import { goalSchema } from '@/lib/validations'

export async function GET(req: NextRequest) {
  const user = await getUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const goals = await prisma.goal.findMany({
    where: { userId: user.id },
    orderBy: { targetDate: 'asc' },
  })

  return NextResponse.json(goals)
}

export async function POST(req: NextRequest) {
  const user = await getUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const parsed = goalSchema.safeParse(body)
  if (!parsed.success) {
    const msg = parsed.error.issues.map(i => i.message).join(', ')
    return NextResponse.json({ error: msg }, { status: 400 })
  }

  const goal = await prisma.goal.create({
    data: {
      userId:      user.id,
      name:        parsed.data.name,
      targetValue: parsed.data.targetValue,
      currency:    parsed.data.currency,
      targetDate:  parsed.data.targetDate ? new Date(parsed.data.targetDate) : null,
      notes:       parsed.data.notes ?? null,
    },
  })

  return NextResponse.json(goal, { status: 201 })
}
