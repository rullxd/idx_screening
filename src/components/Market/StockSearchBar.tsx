import { useMemo, useState, useRef, useEffect } from 'react'
import { useTrendingStocks } from '@/hooks/use-queries'
import { Card } from '@/components'
import clsx from 'clsx'

interface StockSearchBarProps {
 selectedSymbol: string
 onSelect: (symbol: string) => void
}

export default function StockSearchBar({ selectedSymbol, onSelect }: StockSearchBarProps) {
 const [query, setQuery] = useState(selectedSymbol)
 const [open, setOpen] = useState(false)
 const containerRef = useRef<HTMLDivElement>(null)
 const { data: trendingData } = useTrendingStocks()

 useEffect(() => {
 setQuery(selectedSymbol)
 }, [selectedSymbol])

 const trending = useMemo(() => {
 const raw = Array.isArray(trendingData)
 ? trendingData
 : trendingData?.data?.trending || trendingData?.trending || trendingData?.data || []

 return (raw as any[]).map((stock) => ({
 code: (stock.symbol || stock.code || '').toUpperCase(),
 name: stock.name || stock.company_name,
 })).filter((s) => s.code)
 }, [trendingData])

 const suggestions = useMemo(() => {
 const q = query.trim().toUpperCase()
 if (!q) return trending.slice(0, 8)

 return trending
 .filter(
 (s) =>
 s.code.includes(q) ||
 (s.name && s.name.toLowerCase().includes(q.toLowerCase()))
 )
 .slice(0, 8)
 }, [query, trending])

 useEffect(() => {
 const handleClickOutside = (e: MouseEvent) => {
 if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
 setOpen(false)
 }
 }
 document.addEventListener('mousedown', handleClickOutside)
 return () => document.removeEventListener('mousedown', handleClickOutside)
 }, [])

 const submit = (symbol?: string) => {
 const code = (symbol || query).trim().toUpperCase()
 if (!code || code.length < 3) return
 onSelect(code)
 setQuery(code)
 setOpen(false)
 }

 return (
 <Card className="p-4">
 <label className="text-sm font-medium text-dark-300 mb-2 block">Cari Saham</label>
 <div ref={containerRef} className="relative flex gap-3">
 <input
 type="text"
 value={query}
 onChange={(e) => {
 setQuery(e.target.value.toUpperCase())
 setOpen(true)
 }}
 onFocus={() => setOpen(true)}
 onKeyDown={(e) => {
 if (e.key === 'Enter') {
 e.preventDefault()
 submit()
 }
 if (e.key === 'Escape') setOpen(false)
 }}
 placeholder="Contoh: BBRI, BBCA, TLKM..."
 className="flex-1 px-4 py-2.5 bg-dark-800 border border-dark-700 rounded-lg text-dark-100 placeholder-dark-500 focus:outline-none focus:border-accent-green"
 autoComplete="off"
 />
 <button
 type="button"
 onClick={() => submit()}
 className="px-6 py-2.5 bg-accent-green text-dark-950 font-semibold rounded-lg hover:bg-opacity-90 transition"
 >
 Buka Chart
 </button>

 {open && suggestions.length > 0 && (
 <ul className="absolute left-0 right-0 top-full mt-1 z-50 bg-dark-900 border border-dark-700 rounded-lg shadow-xl overflow-hidden max-h-64 overflow-y-auto">
 {suggestions.map((s) => (
 <li key={s.code}>
 <button
 type="button"
 onClick={() => submit(s.code)}
 className="w-full text-left px-4 py-2.5 hover:bg-dark-800 flex items-center justify-between gap-2"
 >
 <span className="font-semibold text-dark-100">{s.code}</span>
 {s.name && (
 <span className="text-sm text-dark-400 truncate">{s.name}</span>
 )}
 </button>
 </li>
 ))}
 </ul>
 )}
 </div>
 {trending.length > 0 && (
 <div className="mt-3 flex flex-wrap gap-2">
 <span className="text-xs text-dark-500 w-full">Populer:</span>
 {trending.slice(0, 6).map((s) => (
 <button
 key={s.code}
 type="button"
 onClick={() => submit(s.code)}
 className={clsx(
 'px-3 py-1 rounded-full text-xs font-medium border transition',
 selectedSymbol === s.code
 ? 'border-accent-green text-accent-green bg-accent-green/10'
 : 'border-dark-700 text-dark-300 hover:border-dark-500'
 )}
 >
 {s.code}
 </button>
 ))}
 </div>
 )}
 </Card>
 )
}
