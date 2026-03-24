'use client'

import { useEffect, useState } from 'react'
import { Sun, Moon } from 'lucide-react'

export function ThemeToggle() {
  const [theme, setTheme] = useState<'dark' | 'light'>('dark')

  useEffect(() => {
    const saved = localStorage.getItem('financy-theme') as 'dark' | 'light' | null
    if (saved) {
      setTheme(saved)
      document.documentElement.classList.toggle('light', saved === 'light')
    }
  }, [])

  function toggle() {
    const next = theme === 'dark' ? 'light' : 'dark'
    setTheme(next)
    localStorage.setItem('financy-theme', next)
    document.documentElement.classList.toggle('light', next === 'light')
  }

  return (
    <button
      onClick={toggle}
      title={theme === 'dark' ? 'Passer en mode clair' : 'Passer en mode sombre'}
      className="flex items-center gap-3 px-3 py-2.5 w-full rounded-xl text-sm font-medium text-text-secondary hover:text-text-primary hover:bg-surface-2 transition-colors"
    >
      {theme === 'dark'
        ? <Sun className="w-4 h-4 shrink-0" />
        : <Moon className="w-4 h-4 shrink-0" />
      }
      {theme === 'dark' ? 'Mode clair' : 'Mode sombre'}
    </button>
  )
}
