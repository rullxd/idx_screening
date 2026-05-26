import { useUIStore } from '@/stores/ui-store'
import { useEffect, useRef } from 'react'

export default function Header() {
 const sidebarOpen = useUIStore((state) => state.sidebarOpen)
 const setSidebarOpen = useUIStore((state) => state.setSidebarOpen)
 const headerRef = useRef<HTMLElement | null>(null)

 useEffect(() => {
 function setHeaderHeightVar() {
 const el = headerRef.current
 const h = el ? Math.ceil(el.getBoundingClientRect().height) : 64
 document.documentElement.style.setProperty('--header-height', `${h}px`)
 }

 setHeaderHeightVar()
 window.addEventListener('resize', setHeaderHeightVar)
 // update on font/load changes
 window.addEventListener('load', setHeaderHeightVar)

 return () => {
 window.removeEventListener('resize', setHeaderHeightVar)
 window.removeEventListener('load', setHeaderHeightVar)
 }
 }, [])

  return (
  <header ref={headerRef} className="bg-dark-900 border-b border-dark-800 sticky top-0 z-40 animate-fade-in-down">
   <div className="px-4 md:px-6 py-4 flex items-center justify-between">
    <div className="flex items-center gap-3">
  <button
  onClick={() => setSidebarOpen(!sidebarOpen)}
  className="p-2 hover:bg-dark-800 rounded-lg transition-colors flex items-center justify-center text-dark-400 hover:text-dark-100"
  aria-label="Toggle sidebar"
  >
 <svg
 width="24"
 height="24"
 viewBox="0 0 24 24"
 fill="none"
 stroke="currentColor"
 strokeWidth="2"
 >
 <line x1="4" y1="6" x2="20" y2="6" />
 <line x1="4" y1="12" x2="20" y2="12" />
 <line x1="4" y1="18" x2="20" y2="18" />
 </svg>
 </button>

     <div className="flex items-baseline gap-1">
      <span className="text-lg font-bold text-gradient-green animate-glow-pulse rounded px-1">BandarScope</span>
      <span className="text-sm text-dark-500">/</span>
      <span className="text-sm text-dark-400">IDX Bandarmology</span>
     </div>
 </div>

 <div className="flex items-center gap-4">
  <button
  onClick={() => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true }))}
  className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg border border-dark-700 bg-dark-800/50 hover:bg-dark-800 transition-colors text-dark-500 hover:text-dark-300 cursor-pointer"
  title="Quick search (Ctrl+K)"
  >
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
   <circle cx="11" cy="11" r="8"/>
   <line x1="21" y1="21" x2="16.65" y2="16.65"/>
  </svg>
  <span className="text-xs">Search...</span>
  <kbd className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-dark-900 border border-dark-700">Ctrl+K</kbd>
  </button>

  <div className="hidden sm:flex items-center gap-2">
  <div className="w-2 h-2 bg-accent-green rounded-full animate-pulse" />
  <span className="text-sm text-dark-400">LIVE</span>
  </div>

 <div className="text-sm text-dark-500">
 {new Date().toLocaleDateString('id-ID', {
 weekday: 'short',
 day: 'numeric',
 month: 'short',
 year: 'numeric',
 })}
 </div>
 </div>
 </div>
 </header>
 )
}
