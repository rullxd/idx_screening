import { ReactNode, useEffect, useRef, useState, useMemo } from 'react'
import clsx from 'clsx'

interface AnimatedSectionProps {
 children: ReactNode
 animation?: 'fade-in-up' | 'fade-in-down' | 'scale-in' | 'fade-in-left' | 'fade-in-right'
 delay?: number
 duration?: number
 className?: string
 /** If true, animate only when scrolled into view (default: true) */
 scrollTriggered?: boolean
 /** Threshold for intersection observer (0-1, default 0.1) */
 threshold?: number
}

const TRANSFORM_MAP: Record<string, string> = {
 'fade-in-up': 'translateY(24px)',
 'fade-in-down': 'translateY(-24px)',
 'fade-in-left': 'translateX(-24px)',
 'fade-in-right': 'translateX(24px)',
 'scale-in': 'scale(0.95)',
}

const IDENTITY_TRANSFORM = 'translateY(0) translateX(0) scale(1)'

export default function AnimatedSection({
 children,
 animation = 'fade-in-up',
 delay = 0,
 duration = 500,
 className = '',
 scrollTriggered = true,
 threshold = 0.1,
}: AnimatedSectionProps) {
 const [isVisible, setIsVisible] = useState(!scrollTriggered)
 const ref = useRef<HTMLDivElement>(null)
 const delayTimerRef = useRef<ReturnType<typeof setTimeout>>()

 useEffect(() => {
  if (!scrollTriggered) {
   delayTimerRef.current = setTimeout(() => setIsVisible(true), delay)
   return () => clearTimeout(delayTimerRef.current)
  }

  const el = ref.current
  if (!el) return

  const observer = new IntersectionObserver(
   ([entry]) => {
    if (entry.isIntersecting) {
     delayTimerRef.current = setTimeout(() => setIsVisible(true), delay)
     observer.unobserve(el)
    }
   },
   { threshold, rootMargin: '0px 0px -40px 0px' }
  )

  observer.observe(el)

  return () => {
   observer.disconnect()
   clearTimeout(delayTimerRef.current)
  }
 }, [scrollTriggered, delay, threshold])

 const style = useMemo(() => ({
  opacity: isVisible ? 1 : 0,
  transform: isVisible ? IDENTITY_TRANSFORM : (TRANSFORM_MAP[animation] || TRANSFORM_MAP['fade-in-up']),
  transition: `opacity ${duration}ms cubic-bezier(0.16, 1, 0.3, 1), transform ${duration}ms cubic-bezier(0.16, 1, 0.3, 1)`,
 }), [isVisible, animation, duration])

 return (
  <div ref={ref} className={clsx(className)} style={style}>
   {children}
  </div>
 )
}
