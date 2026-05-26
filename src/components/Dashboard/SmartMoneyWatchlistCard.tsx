import { Card, ErrorState, LoadingSpinner } from '@/components'
import { useMarketDetector } from '@/hooks/use-queries'
import { analyzeBandarmology, parseMarketDetector } from '@/utils/broker-activity'
import { formatCurrency } from '@/utils/formatters'

const WATCHLIST_SYMBOLS = ['BBCA', 'BBRI', 'TLKM', 'ASII', 'BMRI'] as const

function sumBy<T>(items: T[], mapper: (item: T) => number): number {
 return items.reduce((sum, item) => sum + mapper(item), 0)
}

type TrackerTone = 'bullish' | 'bearish' | 'neutral'

function classifyTrackerRow(score: number): { label: string; tone: TrackerTone } {
 if (score >= 3) return { label: 'Silent accumulation', tone: 'bullish' }
 if (score <= -1) return { label: 'Distribusi dominan', tone: 'bearish' }
 return { label: 'Wait & see', tone: 'neutral' }
}

function toneClass(tone: TrackerTone): string {
 if (tone === 'bullish') return 'text-accent-green'
 if (tone === 'bearish') return 'text-accent-red'
 return 'text-dark-300'
}

export default function SmartMoneyWatchlistCard() {
 const bbcaQuery = useMarketDetector('BBCA')
 const bbriQuery = useMarketDetector('BBRI')
 const tlkmQuery = useMarketDetector('TLKM')
 const asiiQuery = useMarketDetector('ASII')
 const bmriQuery = useMarketDetector('BMRI')

 const queries = [bbcaQuery, bbriQuery, tlkmQuery, asiiQuery, bmriQuery]

 if (queries.some((query) => query.isLoading)) return <LoadingSpinner />

 const firstError = queries.find((query) => query.error)?.error as Error | undefined
 if (firstError) {
 return (
 <ErrorState
 title="Error"
 message="Failed to load smart money watchlist"
 onRetry={() => queries.forEach((query) => query.refetch())}
 />
 )
 }

 const rows = queries
 .map((query, index) => {
 const symbol = WATCHLIST_SYMBOLS[index]
 const parsed = parseMarketDetector(query.data ?? {})
 const buyValue = sumBy(parsed.buyers, (item) => item.value)
 const sellValue = sumBy(parsed.sellers, (item) => item.value)
 const netValue = buyValue - sellValue
 const insight = analyzeBandarmology(parsed.buyers, parsed.sellers)
 const hasAccumulation = insight.signals.some((signal) => signal.key === 'accumulation')
 const hasDistribution = insight.signals.some((signal) => signal.key === 'distribution')
 const hasCrossing = insight.signals.some((signal) => signal.key === 'crossing')

 let score = 0
 if (hasAccumulation) score += 2
 if (insight.netFlowRatio >= 0.05) score += 1
 if (insight.buyerConcentration >= 0.45) score += 1
 if (insight.sellRetailShare >= 0.45) score += 1
 if (hasDistribution) score -= 2
 if (hasCrossing) score -= 1

 const { label, tone } = classifyTrackerRow(score)

 return {
 symbol,
 netValue,
 score,
 label,
 tone,
 }
 })
 .sort((a, b) => b.score - a.score || b.netValue - a.netValue)

 if (rows.length === 0) {
 return (
 <Card className="p-5">
 <p className="text-sm text-dark-400">Smart Money Watchlist tidak tersedia.</p>
 </Card>
 )
 }

 const leader = rows[0]

 return (
 <Card className="p-5">
 <div className="flex items-start justify-between gap-4">
 <div>
 <p className="text-sm text-dark-400">Silent Accumulation Tracker</p>
 <p className="text-2xl font-bold text-dark-100 mt-1">{leader.symbol}</p>
 <p className={`text-xs mt-1 ${toneClass(leader.tone)}`}>{leader.label}</p>
 </div>

 <div className="text-right">
 <p className="text-xs text-dark-500">Score</p>
 <p className={`text-sm font-semibold ${toneClass(leader.tone)}`}>
 {leader.score > 0 ? '+' : ''}
 {leader.score}
 </p>
 </div>
 </div>

 <div className="space-y-2 mt-4 text-xs">
 {rows.map((row, index) => (
 <div key={row.symbol} className="flex items-center justify-between rounded bg-dark-800 px-2 py-2">
 <p className="text-dark-200">
 #{index + 1} {row.symbol}
 </p>
 <p className={`font-semibold ${toneClass(row.tone)}`}>{row.label}</p>
 </div>
 ))}
 </div>

 <div className="space-y-2 mt-3 text-xs">
 {rows.map((row) => (
 <div key={`${row.symbol}-flow`} className="flex items-center justify-between rounded bg-dark-900/70 px-2 py-2">
 <p className="text-dark-400 tabular-nums">Score {row.score > 0 ? '+' : ''}{row.score}</p>
 <p className={`font-semibold ${row.netValue >= 0 ? 'text-accent-green' : 'text-accent-red'}`}>
 {row.netValue >= 0 ? '+' : ''}
 {formatCurrency(row.netValue)}
 </p>
 </div>
 ))}
 </div>

 <p className="text-[11px] text-dark-500 mt-3">
 Skor dibentuk dari kombinasi net flow, konsentrasi buyer, dominasi seller ritel, dan penalti crossing/distribusi.
 </p>
 </Card>
 )
}