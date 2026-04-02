import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getUser } from '@/lib/mobile-auth'
import { z } from 'zod'

const schema = z.object({
  symbol:    z.string().min(1).max(20),
  name:      z.string().optional(),
  condition: z.enum(['above', 'below']),
  target:    z.number().positive(),
  currency:  z.string().default('EUR'),
})

export async function GET(req: NextRequest) {
  const user = await getUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const alerts = await prisma.priceAlert.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: 'desc' },
  })
  return NextResponse.json(alerts)
}

export async function POST(req: NextRequest) {
  const user = await getUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const alert = await prisma.priceAlert.create({
    data: { userId: user.id, ...parsed.data },
  })
  return NextResponse.json(alert, { status: 201 })
}
