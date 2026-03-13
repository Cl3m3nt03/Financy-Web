export { default } from 'next-auth/middleware'

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/assets/:path*',
    '/portfolio/:path*',
    '/goals/:path*',
    '/settings/:path*',
  ],
}
