import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: 'class',
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // ── Surfaces ────────────────────────────────────────────────────────
        background:       'var(--color-bg)',
        surface:          'var(--color-surface)',
        'surface-2':      'var(--color-surface-2)',
        border:           'var(--color-border)',

        // ── Typographie ─────────────────────────────────────────────────────
        'text-primary':   'var(--color-text-primary)',
        'text-secondary': 'var(--color-text-secondary)',
        'text-muted':     'var(--color-text-muted)',

        // ── Accent & Sémantiques (Obsidian Diamond) ─────────────────────────
        accent:           '#BDEFFF',   // Diamond Blue
        'accent-dim':     '#7BC8E8',   // Diamond Blue atténué
        positive:         '#3D5A80',   // Sapphire Blue (remplace vert)
        'positive-light': '#4F7AA8',   // Sapphire clair
        negative:         '#E55C5C',   // Ruby Red
        'negative-light': '#EA7F7F',   // Ruby Red clair

        // ── Palette fixe pour le code hérité ───────────────────────────────
        'obsidian':       '#08090A',
        'titanium':       '#141619',
        'graphite':       '#2C2F36',
        'pearl':          '#F4F4F6',
        'steel':          '#8E939F',
        'diamond':        '#BDEFFF',
        'sapphire':       '#3D5A80',
        'ruby':           '#E55C5C',

        // ── Compatibilité ascendante (à migrer progressivement) ─────────────
        success:          '#3D5A80',
        danger:           '#E55C5C',
        warning:          '#D4963A',
      },
      fontFamily: {
        sans: ['var(--font-geologica)', 'Geologica', 'system-ui', 'sans-serif'],
        mono: ['var(--font-mono)', 'Roboto Mono', 'monospace'],
      },
      fontSize: {
        'display': ['48px', { lineHeight: '1.1',  fontWeight: '700', letterSpacing: '-0.02em' }],
        'h1':      ['24px', { lineHeight: '1.2',  fontWeight: '600', letterSpacing: '-0.01em' }],
        'h2':      ['18px', { lineHeight: '1.3',  fontWeight: '500', letterSpacing: '-0.005em' }],
      },
      borderRadius: {
        'card':   '12px',   // Cartes d'actifs / sections
        'btn':    '8px',    // Boutons / inputs
        'pill':   '999px',  // Tags / badges
      },
      boxShadow: {
        'glow-accent': '0 0 16px rgba(189,239,255,0.18), 0 0 4px rgba(189,239,255,0.10)',
        'glow-sm':     '0 0 8px rgba(189,239,255,0.12)',
        'card':        'inset 0 1px 0 rgba(255,255,255,0.04)',
      },
      keyframes: {
        'slide-in-right': {
          from: { opacity: '0', transform: 'translateX(12px)' },
          to:   { opacity: '1', transform: 'translateX(0)' },
        },
        'fade-up': {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        'slide-in-right': 'slide-in-right 0.2s ease-out',
        'fade-up':        'fade-up 0.3s ease-out',
      },
    },
  },
  plugins: [],
}
export default config
