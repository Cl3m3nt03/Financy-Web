const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')

const prisma = new PrismaClient()

async function main() {
  const hashedPassword = await bcrypt.hash('password123', 10)

  const user = await prisma.user.upsert({
    where: { email: 'demo@wealthtracker.app' },
    update: { password: hashedPassword, name: 'Demo User' },
    create: {
      email: 'demo@wealthtracker.app',
      password: hashedPassword,
      name: 'Demo User',
    },
  })

  console.log('✓ Utilisateur créé :', user.email)
}

main()
  .catch(e => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
