import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getUser } from '@/lib/mobile-auth'
import { sendAlertEmail } from '@/lib/email'

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const alert = await prisma.priceAlert.findUnique({ where: { id: params.id } })
  if (!alert || alert.userId !== user.id) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const body = await req.json().catch(() => ({}))
  const wasTriggered = alert.triggered
  const updated = await prisma.priceAlert.update({
    where: { id: params.id },
    data: { triggered: body.triggered ?? true },
  })

  if (!wasTriggered && updated.triggered && body.price) {
    const dbUser = await prisma.user.findUnique({ where: { id: user.id }, select: { email: true } })
    if (dbUser?.email) {
      sendAlertEmail(dbUser.email, {
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

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const alert = await prisma.priceAlert.findUnique({ where: { id: params.id } })
  if (!alert || alert.userId !== user.id) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  await prisma.priceAlert.delete({ where: { id: params.id } })
  return NextResponse.json({ success: true })
}
