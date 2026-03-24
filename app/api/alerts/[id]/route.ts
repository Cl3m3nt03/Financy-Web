import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { sendAlertEmail } from '@/lib/email'

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const userId = (session.user as any).id

  const alert = await prisma.priceAlert.findUnique({ where: { id: params.id } })
  if (!alert || alert.userId !== userId)
    return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const body = await req.json().catch(() => ({}))
  const wasTriggered = alert.triggered
  const updated = await prisma.priceAlert.update({
    where: { id: params.id },
    data: { triggered: body.triggered ?? true },
  })

  // Envoyer un email si l'alerte vient d'être déclenchée
  if (!wasTriggered && updated.triggered && body.price) {
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { email: true } })
    if (user?.email) {
      sendAlertEmail(user.email, {
        symbol:    alert.symbol,
        name:      alert.name,
        condition: alert.condition as 'above' | 'below',
        target:    alert.target,
        price:     body.price,
        currency:  alert.currency,
      }).catch(() => {})
    }
  }

  return NextResponse.json(updated)
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const userId = (session.user as any).id

  const alert = await prisma.priceAlert.findUnique({ where: { id: params.id } })
  if (!alert || alert.userId !== userId)
    return NextResponse.json({ error: 'Not found' }, { status: 404 })

  await prisma.priceAlert.delete({ where: { id: params.id } })
  return NextResponse.json({ success: true })
}
