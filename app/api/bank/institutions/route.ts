import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { listInstitutions } from '@/lib/gocardless'

// GET /api/bank/institutions?country=FR&q=revolut
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const country = searchParams.get('country') ?? 'FR'
  const q       = searchParams.get('q')?.toLowerCase() ?? ''

  try {
    const institutions = await listInstitutions(country)
    const filtered = q
      ? institutions.filter(i => i.name.toLowerCase().includes(q))
      : institutions
    return NextResponse.json(filtered.slice(0, 20))
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
