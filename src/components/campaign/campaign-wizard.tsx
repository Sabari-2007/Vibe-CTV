'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { StepOne } from './step-one'
import { StepTwo } from './step-two'
import { StepThree } from './step-three'
import { StepPayment } from './step-payment'
import { Button } from '@/components/ui/button'

const TOTAL_STEPS = 4
const STEP_LABELS = ['Details', 'Targeting', 'Creative', 'Billing']

interface FormData {
  name: string
  dailyBudget: string
  totalBudget: string
  genres: string[]
  locations: string[]
  videoUrl: string
}

export function CampaignWizard() {
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [submitting, setSubmitting] = useState(false)
  const [paid, setPaid] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const [form, setForm] = useState<FormData>({
    name: '',
    dailyBudget: '',
    totalBudget: '',
    genres: [],
    locations: [],
    videoUrl: '',
  })

  const updateField = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }))
    setErrors((prev) => ({ ...prev, [field]: '' }))
  }

  const toggleGenre = (g: string) => {
    setForm((prev) => ({
      ...prev,
      genres: prev.genres.includes(g)
        ? prev.genres.filter((x) => x !== g)
        : [...prev.genres, g],
    }))
  }

  const toggleLocation = (l: string) => {
    setForm((prev) => ({
      ...prev,
      locations: prev.locations.includes(l)
        ? prev.locations.filter((x) => x !== l)
        : [...prev.locations, l],
    }))
  }

  const validateStep = (s: number): boolean => {
    const newErrors: Record<string, string> = {}

    if (s === 0) {
      if (!form.name.trim()) newErrors.name = 'Campaign name is required'
      const daily = Number(form.dailyBudget)
      if (!form.dailyBudget || isNaN(daily) || daily < 50) {
        newErrors.dailyBudget = 'Minimum daily budget is $50'
      }
      const total = Number(form.totalBudget)
      if (!form.totalBudget || isNaN(total) || total < daily) {
        newErrors.totalBudget = 'Total budget must be at least the daily budget'
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const nextStep = () => {
    if (validateStep(step)) {
      setStep((s) => Math.min(s + 1, TOTAL_STEPS - 1))
    }
  }

  const prevStep = () => {
    setStep((s) => Math.max(s - 1, 0))
  }

  const handlePaid = () => {
    setPaid(true)
    handleSubmit()
  }

  const handleSubmit = async () => {
    setSubmitting(true)
    try {
      const res = await fetch('/api/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          dailyBudget: Number(form.dailyBudget),
          totalBudget: Number(form.totalBudget),
          genres: form.genres,
          locations: form.locations,
          videoUrl: form.videoUrl,
        }),
      })

      if (res.ok) {
        router.push('/dashboard')
      } else {
        const err = await res.json()
        setErrors({ form: err.error || 'Failed to create campaign' })
      }
    } catch {
      setErrors({ form: 'Network error' })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center gap-2 mb-8">
        {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
          <div key={i} className="flex items-center gap-2 flex-1">
            <div className="flex items-center gap-2">
              <div
                className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold transition-all duration-300 ${
                  i <= step
                    ? 'bg-accent text-white'
                    : 'bg-muted text-ink-light'
                }`}
              >
                {i === 3 ? '$' : i + 1}
              </div>
              <span className={`text-xs font-medium hidden sm:inline ${
                i <= step ? 'text-accent' : 'text-ink-light/60'
              }`}>
                {STEP_LABELS[i]}
              </span>
            </div>
            {i < TOTAL_STEPS - 1 && (
              <div
                className={`flex-1 h-0.5 transition-all duration-300 ${
                  i < step ? 'bg-accent' : 'bg-muted'
                }`}
              />
            )}
          </div>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.2 }}
        >
          <div className="card p-6 md:p-8">
            {step === 0 && (
              <StepOne
                data={{
                  name: form.name,
                  dailyBudget: form.dailyBudget,
                  totalBudget: form.totalBudget,
                }}
                errors={errors}
                onChange={updateField}
              />
            )}
            {step === 1 && (
              <StepTwo
                genres={form.genres}
                locations={form.locations}
                onToggleGenre={toggleGenre}
                onToggleLocation={toggleLocation}
              />
            )}
            {step === 2 && (
              <StepThree
                videoUrl={form.videoUrl}
                onChange={(url) => updateField('videoUrl', url)}
                summary={{
                  name: form.name,
                  dailyBudget: form.dailyBudget,
                  totalBudget: form.totalBudget,
                  genres: form.genres,
                  locations: form.locations,
                }}
              />
            )}
            {step === 3 && (
              <StepPayment
                totalBudget={Number(form.totalBudget)}
                onPaid={handlePaid}
                disabled={submitting}
              />
            )}
          </div>
        </motion.div>
      </AnimatePresence>

      {errors.form && (
        <p className="text-sm text-red-500 mt-4">{errors.form}</p>
      )}

      <div className="flex items-center justify-between mt-6">
        <Button
          variant="ghost"
          onClick={prevStep}
          disabled={step === 0 || submitting || paid}
        >
          Back
        </Button>

        {step < TOTAL_STEPS - 1 ? (
          <Button onClick={nextStep}>
            {step === 2 ? 'Continue to Billing' : 'Continue'}
          </Button>
        ) : null}
      </div>
    </div>
  )
}
