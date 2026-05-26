import { useEffect, useRef, useState, useMemo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'

interface CommandItem {
 id: string
 label: string
 description?: string
 category: 'navigation' | 'stock'
 action: () => void
}

const NAV_ITEMS = [
 { path: '/dashboard', label: 'Dashboard', desc: 'Overview & IHSG' },
 { path: '/market', label: 'Market', desc: 'Chart, Orderbook, Running Trade' },
 { path: '/broker-activity', label: 'Broker Activity', desc: 'Bandarmology & Detector' },
 { path: '/signals', label: 'Signal Scanner', desc: 'Technical & smart signals' },
 { path: '/alerts', label: 'Alert & Signals', desc: 'Monitoring & alerts' },
 { path: '/heatmap', label: 'Heatmap Bandar', desc: 'Visual flow mapping' },
] as const

const POPULAR_STOCKS = [
 'BBRI', 'BBCA', 'BMRI', 'TLKM', 'ASII', 'UNVR', 'GOTO', 'BREN',
 'AMMN', 'MDKA', 'ANTM', 'INCO', 'ADRO', 'PTBA', 'MEDC', 'ESSA',
 'ARTO', 'BRIS', 'BBNI', 'EMTK', 'SMGR', 'INDF', 'ICBP', 'KLBF',
] as const

// Pre-compute lowercase for filtering (avoids repeated .toLowerCase() on each keystroke)
const POPULAR_STOCKS_LOWER = POPULAR_STOCKS.map((s) => s.toLowerCase())

export default function CommandPalette() {
 const [open, setOpen] = useState(false)
 const [query, setQuery] = useState('')
 const [selectedIndex, setSelectedIndex] = useState(0)
 const inputRef = useRef<HTMLInputElement>(null)
 const listRef = useRef<HTMLDivElement>(null)
 const navigate = useNavigate()
 const itemsRef = useRef<CommandItem[]>([])

 // Toggle with Ctrl+K / Cmd+K  &  Escape (single global listener, never re-attached)
 useEffect(() => {
  const handler = (e: KeyboardEvent) => {
   if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
    e.preventDefault()
    setOpen((prev) => !prev)
   }
   if (e.key === 'Escape') {
    setOpen(false)
   }
  }
  window.addEventListener('keydown', handler)
  return () => window.removeEventListener('keydown', handler)
 }, [])

 // Focus input when opened
 useEffect(() => {
  if (open) {
   setQuery('')
   setSelectedIndex(0)
   // Use rAF instead of arbitrary setTimeout for more reliable focus
   requestAnimationFrame(() => inputRef.current?.focus())
  }
 }, [open])

 const goToStock = useCallback((symbol: string) => {
  localStorage.setItem('market:lastSymbol', symbol)
  navigate('/market')
  setOpen(false)
 }, [navigate])

 const items = useMemo<CommandItem[]>(() => {
  const q = query.trim().toLowerCase()

  const navItems: CommandItem[] = NAV_ITEMS
   .filter((n) => !q || n.label.toLowerCase().includes(q) || n.desc.toLowerCase().includes(q))
   .map((n) => ({
    id: `nav-${n.path}`,
    label: n.label,
    description: n.desc,
    category: 'navigation' as const,
    action: () => { navigate(n.path); setOpen(false) },
   }))

  const stockItems: CommandItem[] = q.length >= 1
   ? POPULAR_STOCKS
    .filter((_, i) => POPULAR_STOCKS_LOWER[i].includes(q))
    .slice(0, 8)
    .map((s) => ({
     id: `stock-${s}`,
     label: s,
     description: 'Buka di Market',
     category: 'stock' as const,
     action: () => goToStock(s),
    }))
   : []

  // If query looks like a stock code (all uppercase letters, 3-5 chars)
  const isStockQuery = /^[A-Za-z]{3,5}$/.test(q)
  if (isStockQuery && !stockItems.find((s) => s.label.toLowerCase() === q)) {
   stockItems.unshift({
    id: `stock-custom-${q}`,
    label: q.toUpperCase(),
    description: 'Cari saham ini di Market',
    category: 'stock',
    action: () => goToStock(q.toUpperCase()),
   })
  }

  return [...navItems, ...stockItems]
 }, [query, navigate, goToStock])

 // Keep ref in sync so keyboard handler doesn't need items in deps
 itemsRef.current = items

 // Keyboard navigation — single stable listener while open (no re-attach on items/selectedIndex change)
 useEffect(() => {
  if (!open) return

  const handler = (e: KeyboardEvent) => {
   const currentItems = itemsRef.current
   if (e.key === 'ArrowDown') {
    e.preventDefault()
    setSelectedIndex((prev) => Math.min(prev + 1, currentItems.length - 1))
   } else if (e.key === 'ArrowUp') {
    e.preventDefault()
    setSelectedIndex((prev) => Math.max(prev - 1, 0))
   } else if (e.key === 'Enter') {
    e.preventDefault()
    setSelectedIndex((prev) => {
     currentItems[prev]?.action()
     return prev
    })
   }
  }

  window.addEventListener('keydown', handler)
  return () => window.removeEventListener('keydown', handler)
 }, [open])

 // Scroll selected item into view + reset on query change (consolidated)
 useEffect(() => {
  const el = listRef.current?.children[selectedIndex] as HTMLElement | undefined
  el?.scrollIntoView({ block: 'nearest' })
 }, [selectedIndex])

 useEffect(() => {
  setSelectedIndex(0)
 }, [query])

 if (!open) return null

 return (
  <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh]">
   {/* Backdrop */}
   <div
    className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in"
    onClick={() => setOpen(false)}
   />

   {/* Palette */}
   <div className="relative w-full max-w-lg mx-4 bg-dark-900 border border-dark-700 rounded-xl shadow-2xl overflow-hidden animate-scale-in">
    {/* Search input */}
    <div className="flex items-center gap-3 px-4 py-3 border-b border-dark-700">
     <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-dark-400 flex-shrink-0">
      <circle cx="11" cy="11" r="8"/>
      <line x1="21" y1="21" x2="16.65" y2="16.65"/>
     </svg>
     <input
      ref={inputRef}
      type="text"
      value={query}
      onChange={(e) => setQuery(e.target.value)}
      placeholder="Cari halaman atau kode saham..."
      className="flex-1 bg-transparent text-dark-100 placeholder-dark-500 outline-none text-sm"
     />
     <kbd className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono text-dark-500 bg-dark-800 border border-dark-700">
      ESC
     </kbd>
    </div>

    {/* Results */}
    <div ref={listRef} className="max-h-[320px] overflow-y-auto py-2">
     {items.length === 0 && (
      <div className="px-4 py-8 text-center text-dark-500 text-sm">
       Tidak ditemukan hasil untuk "{query}"
      </div>
     )}

     {items.map((item, idx) => (
      <button
       key={item.id}
       onClick={item.action}
       onMouseEnter={() => setSelectedIndex(idx)}
       className={`w-full text-left px-4 py-2.5 flex items-center gap-3 transition-colors ${
        idx === selectedIndex ? 'bg-dark-800' : 'hover:bg-dark-800/50'
       }`}
      >
       <span className="flex-shrink-0 w-5 h-5 flex items-center justify-center text-dark-400">
        {item.category === 'navigation' ? (
         <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="9,18 15,12 9,6"/>
         </svg>
        ) : (
         <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <line x1="18" y1="20" x2="18" y2="10"/>
          <line x1="12" y1="20" x2="12" y2="4"/>
          <line x1="6" y1="20" x2="6" y2="14"/>
         </svg>
        )}
       </span>
       <div className="flex-1 min-w-0">
        <span className="text-sm font-medium text-dark-100">{item.label}</span>
        {item.description && (
         <span className="ml-2 text-xs text-dark-500">{item.description}</span>
        )}
       </div>
       {idx === selectedIndex && (
        <kbd className="text-[10px] text-dark-500 font-mono">↵</kbd>
       )}
      </button>
     ))}
    </div>

    {/* Footer hint */}
    <div className="px-4 py-2 border-t border-dark-700 flex items-center gap-4 text-[10px] text-dark-500">
     <span className="flex items-center gap-1">
      <kbd className="px-1.5 py-0.5 rounded bg-dark-800 border border-dark-700 font-mono">↑↓</kbd>
      navigasi
     </span>
     <span className="flex items-center gap-1">
      <kbd className="px-1.5 py-0.5 rounded bg-dark-800 border border-dark-700 font-mono">↵</kbd>
      pilih
     </span>
     <span className="flex items-center gap-1">
      <kbd className="px-1.5 py-0.5 rounded bg-dark-800 border border-dark-700 font-mono">esc</kbd>
      tutup
     </span>
    </div>
   </div>
  </div>
 )
}