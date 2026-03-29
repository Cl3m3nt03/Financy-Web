import {
  View, Text, ScrollView, StyleSheet,
  RefreshControl, ActivityIndicator,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useQuery } from '@tanstack/react-query'
import { colors, fontSize, radius, spacing } from '@/constants/theme'
import { apiFetch, formatCurrency } from '@/lib/api'
import { Card } from '@/components/ui/Card'

interface Transaction {
  id:        string
  type:      'BUY' | 'SELL' | 'DIVIDEND' | 'DEPOSIT' | 'WITHDRAWAL'
  symbol:    string | null
  name:      string | null
  quantity:  number | null
  price:     number | null
  fees:      number | null
  total:     number
  currency:  string
  date:      string
  notes:     string | null
}

const TYPE_CFG: Record<string, { label: string; color: string; emoji: string; sign: string }> = {
  BUY:        { label: 'Achat',     color: colors.success, emoji: '📈', sign: '-' },
  SELL:       { label: 'Vente',     color: colors.danger,  emoji: '📉', sign: '+' },
  DIVIDEND:   { label: 'Dividende', color: colors.accent,  emoji: '💰', sign: '+' },
  DEPOSIT:    { label: 'Dépôt',     color: colors.success, emoji: '⬆️', sign: '+' },
  WITHDRAWAL: { label: 'Retrait',   color: colors.danger,  emoji: '⬇️', sign: '-' },
}

export default function TransactionsScreen() {
  const { data, isLoading, refetch, isRefetching } = useQuery<{ transactions: Transaction[] }>({
    queryKey: ['transactions'],
    queryFn:  () => apiFetch('/api/transactions?limit=50'),
  })

  const transactions = data?.transactions ?? []

  return (
    <SafeAreaView style={s.safe}>
      <ScrollView
        contentContainerStyle={s.scroll}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.accent} />}
      >
        <Text style={s.pageTitle}>Transactions</Text>

        {isLoading && <ActivityIndicator color={colors.accent} style={{ marginTop: 40 }} />}

        {transactions.length === 0 && !isLoading && (
          <Card style={{ alignItems: 'center', paddingVertical: 40 }}>
            <Text style={{ fontSize: 40, marginBottom: 12 }}>🔄</Text>
            <Text style={{ color: colors.textSecondary, fontSize: fontSize.md, fontWeight: '600' }}>
              Aucune transaction
            </Text>
          </Card>
        )}

        {transactions.map(tx => {
          const cfg  = TYPE_CFG[tx.type] ?? TYPE_CFG.BUY
          const date = new Date(tx.date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
          return (
            <View key={tx.id} style={s.txRow}>
              <View style={[s.txIcon, { backgroundColor: cfg.color + '20' }]}>
                <Text style={{ fontSize: 18 }}>{cfg.emoji}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.txName} numberOfLines={1}>
                  {tx.symbol ? `${tx.symbol} — ` : ''}{tx.name ?? cfg.label}
                </Text>
                <Text style={s.txMeta}>
                  {cfg.label}{tx.quantity ? ` · ${tx.quantity} parts` : ''} · {date}
                </Text>
              </View>
              <Text style={[s.txAmount, { color: cfg.color }]}>
                {cfg.sign}{formatCurrency(tx.total, tx.currency)}
              </Text>
            </View>
          )
        })}
      </ScrollView>
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: colors.background },
  scroll: { padding: spacing.md, gap: spacing.sm, paddingBottom: spacing.xl },

  pageTitle: { color: colors.textPrimary, fontSize: fontSize['2xl'], fontWeight: '700', marginBottom: spacing.sm },

  txRow: {
    flexDirection:   'row',
    alignItems:      'center',
    gap:             12,
    paddingVertical: 12,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.surface,
    borderRadius:    radius.lg,
    borderWidth:     1,
    borderColor:     colors.border,
  },
  txIcon: {
    width: 44, height: 44, borderRadius: radius.md,
    alignItems: 'center', justifyContent: 'center',
  },
  txName:   { color: colors.textPrimary,   fontSize: fontSize.sm, fontWeight: '500' },
  txMeta:   { color: colors.textMuted,     fontSize: fontSize.xs, marginTop: 2 },
  txAmount: { fontSize: fontSize.sm, fontWeight: '700' },
})
