'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

const QUICK_REPLIES = [
  'How do I create a campaign?',
  'What is the minimum budget?',
  'How does targeting work?',
  'Can I see my analytics?',
]

const RESPONSES: Record<string, string> = {
  'How do I create a campaign?': 'Head to the Campaign section and click "New Campaign". Our 4-step wizard will guide you through budget, targeting, creative, and billing.',
  'What is the minimum budget?': 'The minimum daily budget is $50. You can set your total campaign budget to any amount above that.',
  'How does targeting work?': 'You can target by location (city-level) and content genre (Sports, News, Movies, etc.). Our system matches your campaign to relevant ad inventory.',
  'Can I see my analytics?': 'Absolutely! The Dashboard shows real-time impressions, VTR, channel breakdowns, and campaign performance. Data refreshes every 5 seconds.',
}

export function BuddyWidget() {
  const [open, setOpen] = useState(false)
  const [chat, setChat] = useState<{ type: 'bot' | 'user'; text: string }[]>([
    { type: 'bot', text: 'Hi! I\'m your Vibe assistant. How can I help you today?' },
  ])
  const [input, setInput] = useState('')

  const handleQuickReply = (q: string) => {
    setChat((prev) => [...prev, { type: 'user', text: q }])
    const response = RESPONSES[q] || 'Thanks for your question! Our team will get back to you shortly.'
    setTimeout(() => {
      setChat((prev) => [...prev, { type: 'bot', text: response }])
    }, 500)
  }

  const handleSend = () => {
    if (!input.trim()) return
    handleQuickReply(input.trim())
    setInput('')
  }

  return (
    <>
      <button
        onClick={() => setOpen(!open)}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-accent text-white flex items-center justify-center shadow-elevated hover:scale-105 active:scale-95 transition-all duration-200"
        style={{ boxShadow: '0 8px 32px rgba(37, 99, 235, 0.3)' }}
      >
        {open ? (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        ) : (
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
          </svg>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="fixed bottom-24 right-6 z-50 w-[360px] max-w-[calc(100vw-48px)] card overflow-hidden"
            style={{ boxShadow: '0 20px 60px rgba(0,0,0,0.1)' }}
          >
            <div className="bg-accent px-4 py-3 flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
              <span className="text-white text-sm font-semibold">Vibe Assistant</span>
              <span className="text-white/70 text-xs ml-auto">Online</span>
            </div>

            <div className="h-80 overflow-y-auto p-4 space-y-3 bg-canvas">
              {chat.map((msg, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[85%] px-3.5 py-2.5 rounded-xl text-sm ${
                      msg.type === 'user'
                        ? 'bg-accent text-white rounded-tr-sm'
                        : 'bg-white text-ink border border-muted rounded-tl-sm'
                    }`}
                  >
                    {msg.text}
                  </div>
                </motion.div>
              ))}
            </div>

            {chat.length <= 2 && (
              <div className="px-4 pb-3 pt-1 bg-canvas">
                <p className="text-[11px] text-ink-light/60 mb-2">Quick replies</p>
                <div className="flex flex-wrap gap-1.5">
                  {QUICK_REPLIES.map((q) => (
                    <button
                      key={q}
                      onClick={() => handleQuickReply(q)}
                      className="text-xs px-2.5 py-1.5 rounded-lg bg-white border border-muted text-ink-light hover:border-accent/30 hover:text-accent transition-all"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="p-3 border-t border-muted bg-white">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                  placeholder="Type a message..."
                  className="flex-1 px-3 py-2 text-sm bg-canvas border border-muted rounded-lg text-ink placeholder:text-ink-light/40 focus:outline-none focus:border-accent/30"
                />
                <button
                  onClick={handleSend}
                  disabled={!input.trim()}
                  className="px-3 py-2 rounded-lg bg-accent text-white disabled:opacity-40 transition-all"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
