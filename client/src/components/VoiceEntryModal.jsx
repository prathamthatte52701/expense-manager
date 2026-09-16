import { motion } from 'framer-motion'
import { CalendarDays, IndianRupee, ListChecks, Mic, MessageCircle, Square, X } from 'lucide-react'
import { useRef, useState } from 'react'
import { toast } from 'sonner'
import { CATEGORIES, api, todayInput } from '../lib/api'

export function confidenceTier(confidence) {
  if (confidence === null || confidence === undefined) return null
  if (confidence >= 85) return { label: 'Green', color: 'bg-emerald-400' }
  if (confidence >= 65) return { label: 'Yellow', color: 'bg-yellow-400' }
  if (confidence >= 40) return { label: 'Orange', color: 'bg-orange-400' }
  return { label: 'Red', color: 'bg-rose-500' }
}

export default function VoiceEntryModal({ open, onClose, onSaved }) {
  const [phase, setPhase] = useState('idle') // idle | recording | processing | confirm | answer
  const [transcript, setTranscript] = useState('')
  const [category, setCategory] = useState('')
  const [amount, setAmount] = useState('')
  const [date, setDate] = useState(todayInput())
  const [confidence, setConfidence] = useState(null)
  const [answer, setAnswer] = useState('')
  const [error, setError] = useState('')
  const mediaRecorder = useRef(null)
  const chunks = useRef([])

  if (!open) return null

  function reset() {
    setPhase('idle'); setTranscript(''); setCategory(''); setAmount(''); setDate(todayInput()); setConfidence(null); setAnswer(''); setError('')
  }

  function close() {
    reset()
    onClose()
  }

  async function startRecording() {
    setError('')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      chunks.current = []
      const recorder = new MediaRecorder(stream)
      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.current.push(e.data) }
      recorder.onstop = () => {
        stream.getTracks().forEach((track) => track.stop())
        submitAudio(new Blob(chunks.current, { type: 'audio/webm' }))
      }
      mediaRecorder.current = recorder
      recorder.start()
      setPhase('recording')
    } catch {
      setError('Microphone permission denied. Enable mic access in your browser settings, or add this expense manually.')
    }
  }

  function stopRecording() {
    mediaRecorder.current?.stop()
    setPhase('processing')
  }

  async function submitAudio(blob) {
    const form = new FormData()
    form.append('audio', blob, 'entry.webm')
    try {
      const { data } = await api.post('/budget/voice', form, { headers: { 'Content-Type': 'multipart/form-data' } })
      if (!data.transcript) {
        setError('No speech detected. Try again, or fill this in manually below.')
        setPhase('confirm')
        return
      }
      setTranscript(data.transcript || '')
      if (data.intent === 'query') {
        setAnswer(data.answer || '')
        setPhase('answer')
      } else {
        setCategory(data.category || '')
        setAmount(data.amount ? String(data.amount) : '')
        setConfidence(data.confidence ?? null)
        setPhase('confirm')
      }
    } catch {
      setError('Voice processing failed. Try again, or add this expense manually.')
      setPhase('confirm')
    }
  }

  async function save() {
    if (!category || !amount) {
      toast.error('Pick a category and amount before saving.')
      return
    }
    try {
      await api.post('/budget/transactions', { category, amount, date, source: 'voice', rawTranscript: transcript, confidence })
      toast.success('Expense saved from voice entry')
      onSaved?.()
      window.dispatchEvent(new Event('expense:changed'))
      close()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Unable to save entry')
    }
  }

  const tier = confidenceTier(confidence)

  return (
    <div className="fixed inset-0 z-50 grid place-items-end bg-black/50 p-3 backdrop-blur-sm sm:place-items-center">
      <motion.div initial={{ opacity: 0, y: 24, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} className="glass w-full max-w-md space-y-4 p-5">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Voice Entry</h2>
          <button type="button" onClick={close} className="icon-btn"><X className="size-4" /></button>
        </div>

        {error && <div className="alert-banner alert-danger"><p>{error}</p></div>}

        {(phase === 'idle' || phase === 'recording') && (
          <div className="flex flex-col items-center gap-4 py-6">
            <button
              type="button"
              onClick={phase === 'recording' ? stopRecording : startRecording}
              className={`grid size-20 place-items-center rounded-full transition ${phase === 'recording' ? 'bg-rose-500 animate-pulse' : 'bg-teal-500'}`}
            >
              {phase === 'recording' ? <Square className="size-8 text-white" /> : <Mic className="size-8 text-white" />}
            </button>
            <p className="text-sm text-muted">{phase === 'recording' ? 'Recording... tap to stop' : 'Tap to start speaking (Hindi, Hinglish, or English)'}</p>
          </div>
        )}

        {phase === 'processing' && <p className="py-8 text-center text-sm text-muted">Transcribing and extracting...</p>}

        {phase === 'confirm' && (
          <div className="space-y-4">
            {transcript && <div className="rounded-md bg-white/5 p-3 text-sm text-muted">"{transcript}"</div>}
            {tier && (
              <div className={`flex items-center gap-2 rounded-md p-2 text-xs ${tier.label === 'Orange' || tier.label === 'Red' ? 'bg-orange-400/10 text-orange-200' : 'bg-white/5 text-muted'}`}>
                <span className={`size-2 rounded-full ${tier.color}`} />
                <span>{tier.label} confidence{(tier.label === 'Orange' || tier.label === 'Red') && ' — double-check the values below'}</span>
              </div>
            )}
            <label className="field">
              <span className="inline-flex items-center gap-2"><ListChecks className="size-4" /> Category</span>
              <select value={category} onChange={(e) => setCategory(e.target.value)}>
                <option value="">Select category</option>
                {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
              </select>
            </label>
            <label className="field">
              <span className="inline-flex items-center gap-2"><IndianRupee className="size-4" /> Amount</span>
              <input type="number" min="1" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} />
            </label>
            <label className="field">
              <span className="inline-flex items-center gap-2"><CalendarDays className="size-4" /> Date</span>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </label>
            <button className="premium-btn w-full justify-center" type="button" onClick={save}>Confirm & Save</button>
          </div>
        )}

        {phase === 'answer' && (
          <div className="space-y-4">
            {transcript && <div className="rounded-md bg-white/5 p-3 text-sm text-muted">"{transcript}"</div>}
            <div className="flex items-start gap-3 rounded-xl bg-teal-400/10 p-4 text-sm">
              <MessageCircle className="mt-0.5 size-5 shrink-0 text-teal-300" />
              <p>{answer}</p>
            </div>
            <button className="soft-btn w-full justify-center" type="button" onClick={close}>Done</button>
          </div>
        )}
      </motion.div>
    </div>
  )
}
