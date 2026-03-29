import {
  View, Text, ScrollView, StyleSheet,
  RefreshControl, ActivityIndicator,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useQuery } from '@tanstack/react-query'
import { colors, fontSize, radius, spacing } from '@/constants/theme'
import { apiFetch, formatCurrency } from '@/lib/api'
import { Card } from '@/components/ui/Card'

interface BudgetItem {
  id:         string
  label:      string
  amount:     number
  category:   'needs' | 'wants' | 'savings'
  dayOfMonth: number | null
}
interface BudgetData {
  items:  BudgetItem[]
  income: number | null
}

const CAT_CFG = {
  needs:   { label: 'Besoins',  color: colors.accent,  emoji: '🏠', target: 50 },
  wants:   { label: 'Envies',   color: colors.purple,  emoji: '🛍️', target: 30 },
  savings: { label: 'Épargne',  color: colors.success, emoji: '🏦', target: 20 },
} as const

export default function BudgetScreen() {
  const { data, isLoading, refetch, isRefetching } = useQuery<BudgetData>({
    queryKey: ['budget'],
    queryFn:  () => apiFetch('/api/budget/items'),
  })

  const income   = data?.income ?? 0
  const items    = data?.items  ?? []

  const totals = { needs: 0, wants: 0, savings: 0 } as Record<string, number>
  for (const item of items) totals[item.category] = (totals[item.category] ?? 0) + item.amount

  const totalExpenses = totals.needs + totals.wants + totals.savings
  const remaining     = income - totalExpenses
  const savingsRate   = income > 0 ? (totals.savings / income) * 100 : 0

  return (
    <SafeAreaView style={s.safe}>
      <ScrollView
        contentContainerStyle={s.scroll}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.accent} />}
      >
        <Text style={s.pageTitle}>Budget</Text>

        {isLoading && <ActivityIndicator color={colors.accent} style={{ marginTop: 40 }} />}

        {/* Income + savings rate */}
        {data && (
          <Card style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <View>
              <Text style={s.cardLabel}>Revenu mensuel</Text>
              <Text style={s.incomeValue}>{formatCurrency(income)}</Text>
            </View>
            <View style={s.rateBox}>
              <Text style={[s.rateValue, { color: savingsRate >= 20 ? colors.success : savingsRate >= 10 ? colors.accent : colors.danger }]}>
                {savingsRate.toFixed(1)}%
              </Text>
              <Text style={s.rateLabel}>épargne</Text>
            </View>
          </Card>
        )}

        {/* 50/30/20 cards */}
        {data && (['needs', 'wants', 'savings'] as const).map(cat => {
          const cfg    = CAT_CFG[cat]
          const actual = totals[cat] ?? 0
          const target = (income * cfg.target) / 100
          const pct    = income > 0 ? (actual / income) * 100 : 0
          const ok     = Math.abs(actual - target) < target * 0.15

          return (
            <Card key={cat} style={{ borderColor: ok ? colors.border : colors.danger + '40' }}>
              <View style={s.catHeader}>
                <View style={[s.catIcon, { backgroundColor: cfg.color + '20' }]}>
                  <Text style={{ fontSize: 18 }}>{cfg.emoji}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.catTitle}>
                    {cfg.label} <Text style={s.catTarget}>· cible {cfg.target}%</Text>
                  </Text>
                  <Text style={s.catSub}>
                    {formatCurrency(actual)} / {formatCurrency(target)}
                  </Text>
                </View>
                <Text style={[s.catPct, { color: cfg.color }]}>{pct.toFixed(1)}%</Text>
              </View>

              {/* Progress bar */}
              <View style={s.barBg}>
                <View style={[s.barFill, {
                  width: `${Math.min(pct / cfg.target * 100, 100)}%` as any,
                  backgroundColor: cfg.color,
                }]} />
              </View>

              {/* Items list */}
              <View style={{ gap: 4, marginTop: 10 }}>
                {items.filter(i => i.category === cat).map(item => (
                  <View key={item.id} style={s.itemRow}>
                    <Text style={s.itemLabel}>{item.label}</Text>
                    {item.dayOfMonth && (
                      <Text style={s.itemDay}>J-{item.dayOfMonth}</Text>
                    )}
                    <Text style={s.itemAmount}>{formatCurrency(item.amount)}</Text>
                  </View>
                ))}
              </View>
            </Card>
          )
        })}

        {/* Remaining */}
        {data && remaining !== 0 && (
          <Card style={{ borderColor: remaining > 0 ? colors.success + '40' : colors.danger + '40' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Text style={{ fontSize: 24 }}>{remaining > 0 ? '✅' : '⚠️'}</Text>
              <View style={{ flex: 1 }}>
                <Text style={{ color: remaining > 0 ? colors.success : colors.danger, fontWeight: '700', fontSize: fontSize.md }}>
                  {remaining > 0 ? `+${formatCurrency(remaining)} non alloués` : `Déficit de ${formatCurrency(Math.abs(remaining))}`}
                </Text>
                {remaining > 0 && (
                  <Text style={{ color: colors.textMuted, fontSize: fontSize.xs, marginTop: 2 }}>
                    Sur 20 ans à 8% → {formatCurrency(Math.round(remaining * ((Math.pow(1 + 0.08/12, 240) - 1) / (0.08/12))))}
                  </Text>
                )}
              </View>
            </View>
          </Card>
        )}

      </ScrollView>
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: colors.background },
  scroll: { padding: spacing.md, gap: spacing.md, paddingBottom: spacing.xl },

  pageTitle: { color: colors.textPrimary, fontSize: fontSize['2xl'], fontWeight: '700', marginBottom: spacing.sm },

  cardLabel:   { color: colors.textMuted,    fontSize: fontSize.xs },
  incomeValue: { color: colors.textPrimary,  fontSize: fontSize.xl, fontWeight: '700', marginTop: 2 },
  rateBox:     { alignItems: 'center' },
  rateValue:   { fontSize: fontSize['2xl'], fontWeight: '700' },
  rateLabel:   { color: colors.textMuted, fontSize: fontSize.xs },

  catHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  catIcon:   { width: 40, height: 40, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  catTitle:  { color: colors.textPrimary, fontSize: fontSize.md, fontWeight: '600' },
  catTarget: { color: colors.textMuted, fontWeight: '400', fontSize: fontSize.sm },
  catSub:    { color: colors.textMuted, fontSize: fontSize.xs, marginTop: 1 },
  catPct:    { fontSize: fontSize.xl, fontWeight: '700' },

  barBg:   { height: 6, backgroundColor: colors.surface2, borderRadius: radius.full, overflow: 'hidden' },
  barFill: { height: 6, borderRadius: radius.full },

  itemRow:    { flexDirection: 'row', alignItems: 'center', paddingVertical: 3 },
  itemLabel:  { flex: 1, color: colors.textSecondary, fontSize: fontSize.sm },
  itemDay:    { color: colors.textMuted, fontSize: fontSize.xs, marginRight: 8, backgroundColor: colors.surface2, paddingHorizontal: 6, paddingVertical: 2, borderRadius: radius.sm },
  itemAmount: { color: colors.textPrimary, fontSize: fontSize.sm, fontWeight: '500', minWidth: 80, textAlign: 'right' },
})
