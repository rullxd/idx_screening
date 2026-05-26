import { useEffect, useRef, useState, useMemo } from 'react'

interface AnimatedCounterProps {
 value: number
 duration?: number
 decimals?: number
 prefix?: string
 suffix?: string
 className?: string
 formatFn?: (val: number) => string
}

export default function AnimatedCounter({
 value,
 duration = 1200,
 decimals = 0,
 prefix = '',
 suffix = '',
 className = '',
 formatFn,
}: AnimatedCounterProps) {
 const [displayValue, setDisplayValue] = useState(value)
 const prevValue = useRef(value)
 const rafRef = useRef<number>(0)

 useEffect(() => {
  const from = prevValue.current
  const to = value
  prevValue.current = to // Always update ref so it stays in sync

  if (from === to) return

  const diff = to - from
  let startTs = 0

  const animate = (timestamp: number) => {
   if (!startTs) startTs = timestamp
   const progress = Math.min((timestamp - startTs) / duration, 1)
   // Ease-out cubic for smooth deceleration
   const eased = 1 - (1 - progress) ** 3
   setDisplayValue(from + diff * eased)

   if (progress < 1) {
    rafRef.current = requestAnimationFrame(animate)
   }
  }

  cancelAnimationFrame(rafRef.current)
  rafRef.current = requestAnimationFrame(animate)

  return () => cancelAnimationFrame(rafRef.current)
 }, [value, duration])

 const formatted = useMemo(() => {
  if (formatFn) return formatFn(displayValue)
  return decimals > 0
   ? displayValue.toFixed(decimals)
   : Math.round(displayValue).toLocaleString('id-ID')
 }, [displayValue, formatFn, decimals])

 return (
  <span className={className}>
   {prefix}{formatted}{suffix}
  </span>
 )
}
