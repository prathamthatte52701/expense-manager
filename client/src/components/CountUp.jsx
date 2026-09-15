import { animate, motion, useMotionValue, useTransform } from 'framer-motion'
import { useEffect } from 'react'
import { rupee } from '../lib/api'

export default function CountUp({ value }) {
  const amount = useMotionValue(0)
  const rounded = useTransform(amount, (latest) => rupee.format(Math.round(latest)))
  useEffect(() => {
    const controls = animate(amount, Number(value || 0), { duration: 0.7, ease: 'easeOut' })
    return controls.stop
  }, [amount, value])
  return <motion.span>{rounded}</motion.span>
}
