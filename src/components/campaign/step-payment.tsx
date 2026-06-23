'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'

interface StepPaymentProps {
  totalBudget: number
  onPaid: () => void
  disabled?: boolean
}

const CARD_TYPES = [
  { label: 'Visa', color: 'text-blue-600' },
  { label: 'Mastercard', color: 'text-orange-500' },
  { label: 'Amex', color: 'text-indigo-500' },
]

export function StepPayment({ totalBudget, onPaid, disabled }: StepPaymentProps) {
  const [cardNumber, setCardNumber] = useState('')
  const [expiry, setExpiry] = useState('')
  const [cvc, setCvc] = useState('')
  const [processing, setProcessing] = useState(false)
  const [paid, setPaid] = useState(false)

  const formatCard = (v: string) => {
    const digits = v.replace(/\D/g, '').slice(0, 16)
    return digits.replace(/(\d{4})(?=\d)/g, '$1 ')
  }

  const formatExpiry = (v: string) => {
    const digits = v.replace(/\D/g, '').slice(0, 4)
    if (digits.length > 2) return digits.slice(0, 2) + '/' + digits.slice(2)
    return digits
  }

  const handlePay = async () => {
    setProcessing(true)
    await new Promise((r) => setTimeout(r, 2000))
    setProcessing(false)
    setPaid(true)
    onPaid()
  }

  if (paid) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="text-center space-y-4 py-8"
      >
        <div className="w-16 h-16 rounded-full bg-success/10 border border-success/30 flex items-center justify-center mx-auto">
          <svg className="w-8 h-8 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-ink">Payment Successful</h3>
        <p className="text-sm text-ink-light">
          ${totalBudget.toFixed(2)} has been charged. Your campaign will launch immediately.
        </p>
      </motion.div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-ink mb-1">Billing & Payment</h2>
        <p className="text-ink-light text-sm">Secure payment to launch your campaign.</p>
      </div>

      <div className="card p-5 space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-ink-light">Total Campaign Budget</span>
          <span className="text-ink font-bold">${totalBudget.toFixed(2)}</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-ink-light">Platform Fee (5%)</span>
          <span className="text-ink">${(totalBudget * 0.05).toFixed(2)}</span>
        </div>
        <div className="border-t border-muted pt-2 flex items-center justify-between">
          <span className="text-sm font-medium text-ink">Total Due</span>
          <span className="text-lg font-bold text-accent">${(totalBudget * 1.05).toFixed(2)}</span>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center gap-2">
          {CARD_TYPES.map((card) => (
            <span key={card.label} className={`text-[10px] font-bold ${card.color} bg-canvas px-2 py-1 rounded`}>
              {card.label}
            </span>
          ))}
          <span className="text-[10px] text-ink-light/60 ml-auto flex items-center gap-1">
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            Secured
          </span>
        </div>

        <div>
          <label className="block text-xs font-medium text-ink-light mb-1">Card Number</label>
          <input
            type="text"
            value={cardNumber}
            onChange={(e) => setCardNumber(formatCard(e.target.value))}
            placeholder="4242 4242 4242 4242"
            className="w-full px-4 py-3 bg-white border border-muted rounded-xl text-ink placeholder:text-ink-light/40 focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/20 transition-all font-mono"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-ink-light mb-1">Expiry</label>
            <input
              type="text"
              value={expiry}
              onChange={(e) => setExpiry(formatExpiry(e.target.value))}
              placeholder="MM/YY"
              className="w-full px-4 py-3 bg-white border border-muted rounded-xl text-ink placeholder:text-ink-light/40 focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/20 transition-all font-mono"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-ink-light mb-1">CVC</label>
            <input
              type="text"
              value={cvc}
              onChange={(e) => setCvc(e.target.value.replace(/\D/g, '').slice(0, 3))}
              placeholder="123"
              className="w-full px-4 py-3 bg-white border border-muted rounded-xl text-ink placeholder:text-ink-light/40 focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/20 transition-all font-mono"
            />
          </div>
        </div>
      </div>

      <button
        onClick={handlePay}
        disabled={processing || disabled || cardNumber.length < 19}
        className="w-full py-3.5 rounded-xl bg-accent text-white font-semibold text-sm hover:brightness-110 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        style={{ boxShadow: '0 4px 14px rgba(37, 99, 235, 0.25)' }}
      >
        {processing ? (
          <>
            <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            Processing Payment...
          </>
        ) : (
          <>Pay ${(totalBudget * 1.05).toFixed(2)} & Launch Campaign</>
        )}
      </button>
    </div>
  )
}
