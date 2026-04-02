import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getUser } from '@/lib/mobile-auth'

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const goal = await prisma.goal.findFirst({ where: { id: params.id, userId: user.id } })
  if (!goal) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const body = await req.json()
  const updated = await prisma.goal.update({
    where: { id: params.id },
    data: {
      name:        body.name        ?? goal.name,
      targetValue: body.targetValue ?? goal.targetValue,
      currency:    body.currency    ?? goal.currency,
      targetDate:  body.targetDate  ? new Date(body.targetDate) : goal.targetDate,
      notes:       body.notes       ?? goal.notes,
    },
  })
  return NextResponse.json(updated)
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const goal = await prisma.goal.findFirst({ where: { id: params.id, userId: user.id } })
  if (!goal) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  await prisma.goal.delete({ where: { id: params.id } })
  return NextResponse.json({ success: true })
}
