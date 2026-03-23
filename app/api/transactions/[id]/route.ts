import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const userId = (session.user as any).id

  const tx = await prisma.transaction.findUnique({ where: { id: params.id } })
  if (!tx || tx.userId !== userId)
    return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const body = await req.json()
  const { tags, notes } = body

  const updated = await prisma.transaction.update({
    where: { id: params.id },
    data: {
      ...(tags  !== undefined ? { tags }  : {}),
      ...(notes !== undefined ? { notes } : {}),
    },
  })
  return NextResponse.json(updated)
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const userId = (session.user as any).id

  const tx = await prisma.transaction.findUnique({ where: { id: params.id } })
  if (!tx || tx.userId !== userId)
    return NextResponse.json({ error: 'Not found' }, { status: 404 })

  await prisma.transaction.delete({ where: { id: params.id } })
  return NextResponse.json({ success: true })
}
