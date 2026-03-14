import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { z } from 'zod'

const schema = z.object({ amount: z.number().min(0) })

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const userId = (session.user as any).id

  const body = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Invalide' }, { status: 400 })

  const income = await prisma.budgetIncome.upsert({
    where:  { userId },
    update: { amount: parsed.data.amount },
    create: { userId, amount: parsed.data.amount },
  })
  return NextResponse.json(income)
}
