import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getUser } from '@/lib/mobile-auth'
import { z } from 'zod'

const schema = z.object({
  label:      z.string().min(1).max(100).optional(),
  amount:     z.number().min(0).optional(),
  category:   z.enum(['needs', 'wants', 'savings']).optional(),
  dayOfMonth: z.number().min(1).max(31).nullable().optional(),
  recurring:  z.boolean().optional(),
})

async function update(req: NextRequest, id: string) {
  const user = await getUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const item = await prisma.budgetItem.findUnique({ where: { id } })
  if (!item || item.userId !== user.id) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const body = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const updated = await prisma.budgetItem.update({ where: { id }, data: parsed.data })
  return NextResponse.json(updated)
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  return update(req, params.id)
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  return update(req, params.id)
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const item = await prisma.budgetItem.findUnique({ where: { id: params.id } })
  if (!item || item.userId !== user.id) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  await prisma.budgetItem.delete({ where: { id: params.id } })
  return NextResponse.json({ success: true })
}
