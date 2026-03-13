import { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/db'
import { verifyTotpCode } from '@/lib/totp'
import { rateLimit } from '@/lib/rate-limit'

export const authOptions: NextAuthOptions = {
  session: {
    strategy: 'jwt',
    maxAge: 7 * 24 * 60 * 60, // 7 days
  },
  pages: {
    signIn: '/login',
  },
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email:    { label: 'Email',    type: 'email' },
        password: { label: 'Password', type: 'password' },
        totpCode: { label: 'TOTP',     type: 'text' },
        ip:       { label: 'IP',       type: 'text' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null

        const ip = credentials.ip ?? 'unknown'

        // Rate limiting: 10 attempts per 15 min per IP
        const rl = rateLimit(`login:${ip}`, 10, 15 * 60 * 1000)
        if (!rl.success) {
          throw new Error('RATE_LIMITED')
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email.toLowerCase().trim() },
        })

        if (!user) {
          // Timing-safe: still hash to prevent user enumeration
          await bcrypt.compare(credentials.password, '$2b$10$invalid.hash.for.timing')
          throw new Error('INVALID_CREDENTIALS')
        }

        const isValid = await bcrypt.compare(credentials.password, user.password)
        if (!isValid) {
          await prisma.loginAttempt.create({
            data: { userId: user.id, email: user.email, ip, success: false },
          }).catch(() => {})
          throw new Error('INVALID_CREDENTIALS')
        }

        // 2FA check
        if (user.twoFactorEnabled && user.twoFactorSecret) {
          if (!credentials.totpCode) {
            throw new Error('TOTP_REQUIRED')
          }
          const isValidTotp = verifyTotpCode(credentials.totpCode, user.twoFactorSecret)
          if (!isValidTotp) {
            throw new Error('INVALID_TOTP')
          }
        }

        await prisma.loginAttempt.create({
          data: { userId: user.id, email: user.email, ip, success: true },
        }).catch(() => {})

        return { id: user.id, email: user.email, name: user.name }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) token.id = user.id
      return token
    },
    async session({ session, token }) {
      if (token && session.user) {
        (session.user as any).id = token.id as string
      }
      return session
    },
  },
}
