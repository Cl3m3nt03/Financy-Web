'use client'

import { useState, useRef, useEffect } from 'react'
import { Bot, X, Send, Loader2, ChevronDown, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

const SUGGESTIONS = [
  'Comment diversifier mon portefeuille ?',
  'Avantages du PEA vs CTO ?',
  'C\'est quoi la règle des 50/30/20 ?',
  'Comment optimiser ma fiscalité ?',
]

export function FinanceAssistant() {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [streamingText, setStreamingText] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, streamingText])

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [open])

  async function send(text?: string) {
    const content = (text ?? input).trim()
    if (!content || loading) return

    const userMsg: Message = { role: 'user', content }
    const nextMessages = [...messages, userMsg]
    setMessages(nextMessages)
    setInput('')
    setLoading(true)
    setStreamingText('')

    try {
      const res = await fetch('/api/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: nextMessages }),
      })

      if (!res.ok) {
        const err = await res.json()
        setMessages(m => [...m, { role: 'assistant', content: err.error ?? 'Une erreur est survenue.' }])
        return
      }

      const reader = res.body?.getReader()
      const decoder = new TextDecoder()
      let full = ''

      if (reader) {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          const chunk = decoder.decode(value, { stream: true })
          full += chunk
          setStreamingText(full)
        }
      }

      setMessages(m => [...m, { role: 'assistant', content: full }])
      setStreamingText('')
    } catch {
      setMessages(m => [...m, { role: 'assistant', content: 'Impossible de contacter l\'assistant.' }])
    } finally {
      setLoading(false)
    }
  }

  function handleKey(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      send()
    }
  }

  const showWelcome = messages.length === 0 && !loading

  return (
    <>
      {/* ── Floating button ──────────────────────────────────────── */}
      <button
        onClick={() => setOpen(o => !o)}
        className={cn(
          'fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full shadow-2xl flex items-center justify-center transition-all duration-300',
          'bg-accent hover:bg-accent-dark text-background',
          open && 'rotate-12 scale-95',
        )}
        aria-label="Assistant financier"
      >
        {open
          ? <X className="w-5 h-5" />
          : <Bot className="w-6 h-6" />
        }
      </button>

      {/* ── Chat panel ───────────────────────────────────────────── */}
      <div className={cn(
        'fixed bottom-24 right-6 z-50 w-[380px] max-w-[calc(100vw-3rem)] flex flex-col',
        'bg-surface border border-border rounded-2xl shadow-2xl',
        'transition-all duration-300 origin-bottom-right',
        open ? 'opacity-100 scale-100 pointer-events-auto' : 'opacity-0 scale-95 pointer-events-none',
      )}>

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-accent/10 border border-accent/30 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-accent" />
            </div>
            <div>
              <p className="text-sm font-semibold text-text-primary">Financy AI</p>
              <p className="text-xs text-text-muted">Assistant financier</p>
            </div>
          </div>
          <button onClick={() => setOpen(false)} className="text-text-muted hover:text-text-secondary p-1 rounded-lg">
            <ChevronDown className="w-4 h-4" />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 max-h-[400px] min-h-[200px]">
          {showWelcome && (
            <div className="space-y-3">
              <div className="flex items-start gap-2.5">
                <div className="w-6 h-6 rounded-full bg-accent/10 border border-accent/30 flex items-center justify-center shrink-0 mt-0.5">
                  <Sparkles className="w-3 h-3 text-accent" />
                </div>
                <div className="bg-surface-2 rounded-2xl rounded-tl-sm px-3.5 py-2.5 text-sm text-text-secondary max-w-[85%]">
                  Bonjour ! Je suis votre assistant financier. Je connais votre portefeuille et peux vous aider à prendre les meilleures décisions.
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 pt-1">
                {SUGGESTIONS.map(s => (
                  <button key={s} onClick={() => send(s)}
                    className="text-left text-xs text-text-muted border border-border hover:border-accent/50 hover:text-accent bg-surface-2 hover:bg-accent/5 rounded-xl px-3 py-2 transition-colors leading-tight">
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((m, i) => (
            <div key={i} className={cn('flex items-start gap-2.5', m.role === 'user' && 'flex-row-reverse')}>
              {m.role === 'assistant' && (
                <div className="w-6 h-6 rounded-full bg-accent/10 border border-accent/30 flex items-center justify-center shrink-0 mt-0.5">
                  <Sparkles className="w-3 h-3 text-accent" />
                </div>
              )}
              <div className={cn(
                'rounded-2xl px-3.5 py-2.5 text-sm max-w-[85%] whitespace-pre-wrap leading-relaxed',
                m.role === 'user'
                  ? 'bg-accent text-background rounded-tr-sm font-medium'
                  : 'bg-surface-2 text-text-secondary rounded-tl-sm',
              )}>
                {m.content}
              </div>
            </div>
          ))}

          {/* Streaming */}
          {streamingText && (
            <div className="flex items-start gap-2.5">
              <div className="w-6 h-6 rounded-full bg-accent/10 border border-accent/30 flex items-center justify-center shrink-0 mt-0.5">
                <Sparkles className="w-3 h-3 text-accent" />
              </div>
              <div className="bg-surface-2 rounded-2xl rounded-tl-sm px-3.5 py-2.5 text-sm text-text-secondary max-w-[85%] whitespace-pre-wrap leading-relaxed">
                {streamingText}
                <span className="inline-block w-0.5 h-3.5 bg-accent ml-0.5 animate-pulse align-middle" />
              </div>
            </div>
          )}

          {loading && !streamingText && (
            <div className="flex items-start gap-2.5">
              <div className="w-6 h-6 rounded-full bg-accent/10 border border-accent/30 flex items-center justify-center shrink-0 mt-0.5">
                <Sparkles className="w-3 h-3 text-accent" />
              </div>
              <div className="bg-surface-2 rounded-2xl rounded-tl-sm px-3.5 py-2.5">
                <div className="flex gap-1 items-center h-4">
                  <span className="w-1.5 h-1.5 rounded-full bg-accent/60 animate-bounce [animation-delay:0ms]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-accent/60 animate-bounce [animation-delay:150ms]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-accent/60 animate-bounce [animation-delay:300ms]" />
                </div>
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="p-3 border-t border-border">
          <div className="flex items-end gap-2 bg-surface-2 border border-border rounded-xl px-3 py-2 focus-within:border-accent transition-colors">
            <textarea
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKey}
              placeholder="Posez votre question..."
              rows={1}
              className="flex-1 bg-transparent text-sm text-text-primary placeholder:text-text-muted resize-none outline-none max-h-24"
              style={{ minHeight: '24px' }}
            />
            <button
              onClick={() => send()}
              disabled={!input.trim() || loading}
              className="w-7 h-7 rounded-lg bg-accent hover:bg-accent-dark disabled:opacity-30 text-background flex items-center justify-center shrink-0 transition-colors mb-0.5"
            >
              {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
            </button>
          </div>
          <p className="text-[10px] text-text-muted text-center mt-2">
            Alimenté par Claude · Pas un conseil financier agréé
          </p>
        </div>
      </div>
    </>
  )
}
