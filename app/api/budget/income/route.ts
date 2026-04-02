import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getUser } from '@/lib/mobile-auth'
import { z } from 'zod'

const schema = z.object({ amount: z.number().min(0) })

export async function POST(req: NextRequest) {
  const user = await getUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Invalide' }, { status: 400 })

  const income = await prisma.budgetIncome.upsert({
    where:  { userId: user.id },
    update: { amount: parsed.data.amount },
    create: { userId: user.id, amount: parsed.data.amount },
  })
  return NextResponse.json(income)
}
