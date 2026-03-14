import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { GoogleGenerativeAI } from '@google/generative-ai'

const SYSTEM_PROMPT = `Tu es Financy, un assistant financier personnel intelligent intégré dans l'application de gestion de patrimoine de l'utilisateur.

Tu aides avec :
- Analyse et conseils sur le portefeuille (actions, ETF, crypto, immobilier, épargne)
- Stratégies d'investissement adaptées au profil (PEA, CTO, assurance-vie, diversification)
- Fiscalité française (PFU 30%, exonérations PEA, IFI, abattements)
- Notions financières (intérêts composés, DCA, allocation d'actifs, ratio de Sharpe)
- Objectifs patrimoniaux (retraite, achat immobilier, épargne de précaution)
- Actualité économique et impact sur les marchés

Règles :
- Réponses concises et directes, en français
- Toujours préciser quand une décision financière majeure nécessite un conseiller agréé (CGP)
- Ne jamais promettre de rendements garantis
- Si tu as des données du portefeuille de l'utilisateur, utilise-les pour personnaliser tes conseils
- Utilise des emojis avec parcimonie pour structurer l'information`

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) return NextResponse.json({ error: 'Assistant non configuré.' }, { status: 503 })

  const { messages } = await req.json()
  if (!Array.isArray(messages) || messages.length === 0) {
    return NextResponse.json({ error: 'Messages requis.' }, { status: 400 })
  }

  // Fetch portfolio context
  const userId = (session.user as any).id
  let portfolioContext = ''
  try {
    const assets = await prisma.asset.findMany({ where: { userId } })
    if (assets.length > 0) {
      const total = assets.reduce((s, a) => s + a.value, 0)
      const byType: Record<string, number> = {}
      for (const a of assets) {
        byType[a.type] = (byType[a.type] ?? 0) + a.value
      }
      const typeLabels: Record<string, string> = {
        BANK_ACCOUNT: 'Comptes bancaires', SAVINGS: 'Épargne', REAL_ESTATE: 'Immobilier',
        STOCK: 'Bourse', CRYPTO: 'Crypto', PEA: 'PEA', CTO: 'CTO', OTHER: 'Autre',
      }
      const breakdown = Object.entries(byType)
        .map(([t, v]) => `${typeLabels[t] ?? t}: ${v.toLocaleString('fr-FR')} €`)
        .join(', ')
      portfolioContext = `\n\n[Portefeuille de l'utilisateur — total: ${total.toLocaleString('fr-FR')} € | ${breakdown}]`
    }
  } catch { /* ignore */ }

  const genAI = new GoogleGenerativeAI(apiKey)
  const model = genAI.getGenerativeModel({
    model: 'gemini-2.0-flash',
    systemInstruction: SYSTEM_PROMPT + portfolioContext,
  })

  // Convert messages to Gemini history format (all except last)
  const history = messages.slice(0, -1).map((m: any) => ({
    role: m.role === 'user' ? 'user' : 'model',
    parts: [{ text: m.content }],
  }))
  const lastMessage = messages[messages.length - 1].content

  const chat = model.startChat({ history })

  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    async start(controller) {
      try {
        const result = await chat.sendMessageStream(lastMessage)
        for await (const chunk of result.stream) {
          const text = chunk.text()
          if (text) controller.enqueue(encoder.encode(text))
        }
      } catch (err: any) {
        controller.enqueue(encoder.encode(`\n\n[Erreur : ${err.message ?? 'Réessayez.'}]`))
      } finally {
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Transfer-Encoding': 'chunked',
    },
  })
}
