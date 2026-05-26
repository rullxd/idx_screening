import { useEffect, useRef, useState } from 'react'

type FlashDirection = 'up' | 'down' | null

/**
 * Hook that detects value changes and returns a flash direction.
 * When value increases → 'up' (green flash)
 * When value decreases → 'down' (red flash)
 * Flash auto-clears after `duration` ms.
 */
export function useFlash(value: number | string | undefined, duration = 600): FlashDirection {
 const [flash, setFlash] = useState<FlashDirection>(null)
 const prevRef = useRef<number | string | undefined>(undefined)
 const timeoutRef = useRef<ReturnType<typeof setTimeout>>()

 useEffect(() => {
  if (prevRef.current === undefined) {
   prevRef.current = value
   return
  }

  if (value === prevRef.current) return

  const prev = typeof prevRef.current === 'string' ? parseFloat(prevRef.current) : prevRef.current
  const curr = typeof value === 'string' ? parseFloat(value as string) : (value as number)

  if (!isNaN(prev) && !isNaN(curr) && prev !== curr) {
   setFlash(curr > prev ? 'up' : 'down')

   clearTimeout(timeoutRef.current)
   timeoutRef.current = setTimeout(() => setFlash(null), duration)
  }

  prevRef.current = value

  return () => clearTimeout(timeoutRef.current)
 }, [value, duration])

 return flash
}

/**
 * Returns CSS class name based on flash direction.
 */
export function getFlashClass(flash: FlashDirection): string {
 if (flash === 'up') return 'flash-green'
 if (flash === 'down') return 'flash-red'
 return ''
}