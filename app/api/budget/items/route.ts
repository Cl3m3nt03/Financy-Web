import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { z } from 'zod'

const schema = z.object({
  label:      z.string().min(1).max(100),
  amount:     z.number().min(0),
  category:   z.enum(['needs', 'wants', 'savings']),
  dayOfMonth: z.number().min(1).max(31).optional(),
  recurring:  z.boolean().default(true),
})

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const userId = (session.user as any).id

  const [items, income] = await Promise.all([
    prisma.budgetItem.findMany({ where: { userId }, orderBy: { createdAt: 'asc' } }),
    prisma.budgetIncome.findUnique({ where: { userId } }),
  ])

  return NextResponse.json({ items, income: income?.amount ?? null })
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const userId = (session.user as any).id

  const body = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const item = await prisma.budgetItem.create({
    data: { userId, ...parsed.data },
  })
  return NextResponse.json(item, { status: 201 })
}
