// URL de l'API Next.js déployée sur Vercel
// En dev local: pointez vers votre machine avec l'IP LAN
// Ex: http://192.168.1.x:3000
const DEV_API = 'http://localhost:3000'
const PROD_API = process.env.EXPO_PUBLIC_API_URL ?? 'https://financy-web.vercel.app'

export const API_BASE = __DEV__ ? DEV_API : PROD_API
