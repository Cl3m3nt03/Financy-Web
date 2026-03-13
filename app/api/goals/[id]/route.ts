import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const userId = (session.user as any).id

  const goal = await prisma.goal.findFirst({ where: { id: params.id, userId } })
  if (!goal) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  await prisma.goal.delete({ where: { id: params.id } })
  return NextResponse.json({ success: true })
}
