import { ReactNode } from 'react'
import clsx from 'clsx'

export interface CardProps {
 children: ReactNode
 className?: string
 hoverable?: boolean
 glow?: boolean
 onClick?: () => void
}

export default function Card({ children, className, hoverable, glow, onClick }: CardProps) {
 return (
  <div
   className={clsx(
    'bg-dark-900 border border-dark-800 rounded-lg p-4 transition-all duration-300',
    hoverable && 'hover:bg-dark-800 hover:border-dark-700 hover:shadow-lg hover:-translate-y-1 cursor-pointer',
    glow && 'hover:shadow-[0_0_20px_rgba(0,229,160,0.08)] hover:border-accent-green/15',
    onClick && 'cursor-pointer',
    className
   )}
   onClick={onClick}
  >
   {children}
  </div>
 )
}