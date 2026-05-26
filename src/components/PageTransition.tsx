import { ReactNode } from 'react'
import { useLocation } from 'react-router-dom'

interface PageTransitionProps {
 children: ReactNode
}

export default function PageTransition({ children }: PageTransitionProps) {
 const location = useLocation()

 // key={pathname} forces React to unmount/remount the div on route change,
 // which re-triggers the CSS animation class without needing state or timers.
 return (
  <div key={location.pathname} className="w-full animate-fade-in-up">
   {children}
  </div>
 )
}
