import { useState } from 'react'
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native'
import { router } from 'expo-router'
import { colors, fontSize, radius, spacing } from '@/constants/theme'
import { API_BASE } from '@/constants/api'

export default function ForgotPasswordScreen() {
  const [email,   setEmail]   = useState('')
  const [loading, setLoading] = useState(false)
  const [sent,    setSent]    = useState(false)
  const [error,   setError]   = useState('')

  async function handleSubmit() {
    if (!email.trim()) return
    setLoading(true)
    setError('')
    try {
      await fetch(`${API_BASE}/api/auth/forgot-password`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ email: email.trim().toLowerCase() }),
      })
      setSent(true)
    } catch {
      setError('Impossible de joindre le serveur.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <KeyboardAvoidingView
      style={s.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Logo */}
      <View style={s.logo}>
        <View style={s.logoIcon}>
          <Text style={s.logoSymbol}>F</Text>
        </View>
        <Text style={s.title}>Mot de passe oublié</Text>
        <Text style={s.subtitle}>
          {sent ? 'Email envoyé !' : 'Entrez votre email pour recevoir un lien de réinitialisation'}
        </Text>
      </View>

      {sent ? (
        <View style={s.card}>
          <Text style={{ fontSize: 48, textAlign: 'center', marginBottom: 16 }}>📬</Text>
          <Text style={s.successTitle}>Vérifiez votre boîte mail</Text>
          <Text style={s.successText}>
            Si un compte existe pour {email}, vous recevrez un email avec un lien valable 1 heure.{'\n\n'}
            Pensez à vérifier vos spams.
          </Text>
          <TouchableOpacity style={s.btn} onPress={() => router.replace('/login')} activeOpacity={0.8}>
            <Text style={s.btnText}>Retour à la connexion</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={s.card}>
          <Text style={s.label}>Adresse email</Text>
          <TextInput
            style={s.input}
            value={email}
            onChangeText={setEmail}
            placeholder="votre@email.com"
            placeholderTextColor={colors.textMuted}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
          />

          {error ? <Text style={s.error}>{error}</Text> : null}

          <TouchableOpacity
            style={[s.btn, (!email.trim() || loading) && { opacity: 0.5 }]}
            onPress={handleSubmit}
            disabled={!email.trim() || loading}
            activeOpacity={0.8}
          >
            {loading
              ? <ActivityIndicator color={colors.background} />
              : <Text style={s.btnText}>Envoyer le lien</Text>
            }
          </TouchableOpacity>

          <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
            <Text style={s.backText}>← Retour à la connexion</Text>
          </TouchableOpacity>
        </View>
      )}
    </KeyboardAvoidingView>
  )
}

const s = StyleSheet.create({
  container: {
    flex: 1, backgroundColor: colors.background,
    justifyContent: 'center', paddingHorizontal: spacing.xl,
  },
  logo: { alignItems: 'center', marginBottom: spacing['2xl'] },
  logoIcon: {
    width: 56, height: 56, borderRadius: radius.xl,
    backgroundColor: colors.accent + '20',
    borderWidth: 1, borderColor: colors.accent + '40',
    alignItems: 'center', justifyContent: 'center', marginBottom: spacing.md,
  },
  logoSymbol: { color: colors.accent, fontSize: 28, fontWeight: '700' },
  title:      { color: colors.textPrimary,   fontSize: fontSize['2xl'], fontWeight: '700' },
  subtitle:   { color: colors.textMuted,     fontSize: fontSize.sm, marginTop: 6, textAlign: 'center' },

  card: {
    backgroundColor: colors.surface,
    borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.xl, padding: spacing.lg, gap: 12,
  },
  label:  { color: colors.textSecondary, fontSize: fontSize.sm, fontWeight: '500' },
  input: {
    backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: 14,
    color: colors.textPrimary, fontSize: fontSize.md,
  },
  error: { color: colors.danger, fontSize: fontSize.xs },
  btn: {
    backgroundColor: colors.accent, borderRadius: radius.md,
    paddingVertical: 16, alignItems: 'center', marginTop: 4,
  },
  btnText:  { color: colors.background, fontSize: fontSize.md, fontWeight: '700' },
  backBtn:  { alignItems: 'center', paddingVertical: 8 },
  backText: { color: colors.textMuted, fontSize: fontSize.sm },

  successTitle: { color: colors.textPrimary, fontSize: fontSize.lg, fontWeight: '700', textAlign: 'center' },
  successText:  { color: colors.textMuted, fontSize: fontSize.sm, textAlign: 'center', lineHeight: 20 },
})
