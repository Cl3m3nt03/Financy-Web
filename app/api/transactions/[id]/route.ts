import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getUser } from '@/lib/mobile-auth'

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const tx = await prisma.transaction.findUnique({ where: { id: params.id } })
  if (!tx || tx.userId !== user.id) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const body = await req.json()
  const updated = await prisma.transaction.update({
    where: { id: params.id },
    data: {
      ...(body.tags  !== undefined ? { tags: body.tags }   : {}),
      ...(body.notes !== undefined ? { notes: body.notes } : {}),
    },
  })
  return NextResponse.json(updated)
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const tx = await prisma.transaction.findUnique({ where: { id: params.id } })
  if (!tx || tx.userId !== user.id) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  await prisma.transaction.delete({ where: { id: params.id } })
  return NextResponse.json({ success: true })
}
