import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { searchInstitutions } from '@/lib/nordigen'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const q = new URL(req.url).searchParams.get('q') ?? ''
  const country = new URL(req.url).searchParams.get('country') ?? 'FR'

  try {
    const institutions = await searchInstitutions(q, country)
    return NextResponse.json(institutions.slice(0, 20))
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
