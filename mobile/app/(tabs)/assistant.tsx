import { useState, useRef } from 'react'
import {
  View, Text, TextInput, TouchableOpacity, FlatList,
  StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { colors, fontSize, radius, spacing } from '@/constants/theme'
import { getToken } from '@/lib/auth'
import { API_BASE } from '@/constants/api'

interface Message { role: 'user' | 'assistant'; content: string }

const SUGGESTIONS = [
  'Analyse mon portefeuille',
  'Optimiser ma fiscalité PEA',
  'Règle des 50/30/20',
  'DCA sur ETF MSCI World',
]

export default function AssistantScreen() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input,    setInput]    = useState('')
  const [loading,  setLoading]  = useState(false)
  const listRef = useRef<FlatList>(null)

  async function send(text?: string) {
    const content = (text ?? input).trim()
    if (!content || loading) return
    setInput('')
    const userMsg: Message = { role: 'user', content }
    const updated = [...messages, userMsg]
    setMessages(updated)
    setLoading(true)

    try {
      const token = await getToken()
      const res = await fetch(`${API_BASE}/api/assistant`, {
        method:  'POST',
        headers: {
          'Content-Type':  'application/json',
          'Authorization': token ? `Bearer ${token}` : '',
        },
        body: JSON.stringify({ messages: updated }),
      })

      if (!res.ok || !res.body) {
        setMessages(m => [...m, { role: 'assistant', content: 'Erreur lors de la réponse.' }])
        return
      }

      // Stream
      const reader  = res.body.getReader()
      const decoder = new TextDecoder()
      let assistantContent = ''

      setMessages(m => [...m, { role: 'assistant', content: '' }])

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        assistantContent += decoder.decode(value, { stream: true })
        setMessages(m => {
          const copy = [...m]
          copy[copy.length - 1] = { role: 'assistant', content: assistantContent }
          return copy
        })
        listRef.current?.scrollToEnd({ animated: true })
      }
    } catch {
      setMessages(m => [...m, { role: 'assistant', content: 'Impossible de joindre l\'assistant.' }])
    } finally {
      setLoading(false)
    }
  }

  return (
    <SafeAreaView style={s.safe}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}
      >
        {/* Header */}
        <View style={s.header}>
          <View style={s.headerIcon}>
            <Text style={{ fontSize: 22 }}>🤖</Text>
          </View>
          <View>
            <Text style={s.headerTitle}>Financy Assistant</Text>
            <Text style={s.headerSub}>Propulsé par Gemini</Text>
          </View>
        </View>

        {/* Messages */}
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(_, i) => String(i)}
          contentContainerStyle={s.messageList}
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
          ListEmptyComponent={
            <View style={s.emptyState}>
              <Text style={{ fontSize: 48, marginBottom: 16 }}>💬</Text>
              <Text style={s.emptyTitle}>Comment puis-je vous aider ?</Text>
              <View style={s.suggestions}>
                {SUGGESTIONS.map(s => (
                  <TouchableOpacity key={s} onPress={() => send(s)} style={sug.btn} activeOpacity={0.7}>
                    <Text style={sug.text}>{s}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          }
          renderItem={({ item }) => (
            <View style={[
              s.bubble,
              item.role === 'user' ? s.userBubble : s.aiBubble,
            ]}>
              <Text style={[
                s.bubbleText,
                { color: item.role === 'user' ? colors.background : colors.textPrimary },
              ]}>
                {item.content}
              </Text>
            </View>
          )}
        />

        {/* Input */}
        <View style={s.inputRow}>
          <TextInput
            style={s.input}
            value={input}
            onChangeText={setInput}
            placeholder="Posez une question..."
            placeholderTextColor={colors.textMuted}
            multiline
            onSubmitEditing={() => send()}
          />
          <TouchableOpacity
            style={[s.sendBtn, (!input.trim() || loading) && { opacity: 0.4 }]}
            onPress={() => send()}
            disabled={!input.trim() || loading}
            activeOpacity={0.8}
          >
            {loading
              ? <ActivityIndicator color={colors.background} size="small" />
              : <Text style={{ fontSize: 18 }}>↑</Text>
            }
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },

  header: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    padding: spacing.md,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  headerIcon: {
    width: 44, height: 44, borderRadius: radius.md,
    backgroundColor: colors.accent + '20',
    alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { color: colors.textPrimary, fontSize: fontSize.md, fontWeight: '700' },
  headerSub:   { color: colors.textMuted,   fontSize: fontSize.xs },

  messageList: { padding: spacing.md, gap: 10, flexGrow: 1 },

  emptyState:  { flex: 1, alignItems: 'center', paddingTop: 40 },
  emptyTitle:  { color: colors.textSecondary, fontSize: fontSize.lg, fontWeight: '600', marginBottom: 20 },
  suggestions: { gap: 8, width: '100%' },

  bubble:     { maxWidth: '85%', borderRadius: radius.lg, padding: 12 },
  userBubble: { backgroundColor: colors.accent, alignSelf: 'flex-end' },
  aiBubble:   { backgroundColor: colors.surface, alignSelf: 'flex-start', borderWidth: 1, borderColor: colors.border },
  bubbleText: { fontSize: fontSize.sm, lineHeight: 20 },

  inputRow: {
    flexDirection:   'row',
    gap:             8,
    padding:         spacing.md,
    paddingTop:      8,
    borderTopWidth:  1,
    borderTopColor:  colors.border,
    alignItems:      'flex-end',
  },
  input: {
    flex:            1,
    backgroundColor: colors.surface,
    borderWidth:     1,
    borderColor:     colors.border,
    borderRadius:    radius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    color:           colors.textPrimary,
    fontSize:        fontSize.sm,
    maxHeight:       100,
  },
  sendBtn: {
    width:           44,
    height:          44,
    borderRadius:    radius.full,
    backgroundColor: colors.accent,
    alignItems:      'center',
    justifyContent:  'center',
  },
})

const sug = StyleSheet.create({
  btn: {
    backgroundColor: colors.surface,
    borderWidth:     1,
    borderColor:     colors.border,
    borderRadius:    radius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
  },
  text: { color: colors.textSecondary, fontSize: fontSize.sm },
})
