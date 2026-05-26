import { useEffect, useMemo, useState } from 'react'
import clsx from 'clsx'
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Line, LineChart, PolarAngleAxis, PolarGrid, Radar, RadarChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import Card from '@/components/Card'
import { useIHSGChart, useMataDewaDashboard, useOrderbook, useRetailSellAnomaly, useRunningTrade, useStockChart } from '@/hooks/use-queries'
import { useAlertStore } from '@/stores/alert-store'
import { formatCurrency } from '@/utils/formatters'
import { MataDewaAnalysis, RetailSellAnomalyResult } from '@/utils/mata-dewa'
import { analyzeStock, parseChartToCandles } from '@/utils/technical-signals'

const DEFAULT_SYMBOL = 'BBCA'
const LAST_SYMBOL_STORAGE_KEY = 'market:lastSymbol'

function getLastSearchedSymbol(): string {
 if (typeof window === 'undefined') return DEFAULT_SYMBOL

 const saved = window.localStorage.getItem(LAST_SYMBOL_STORAGE_KEY)?.trim().toUpperCase()
 if (!saved || saved.length < 3) return DEFAULT_SYMBOL
 return saved
}

function compact(value: number): string {
 return formatCurrency(value).replace('Rp', '').trim()
}

function percent(value: number): string {
 return `${Math.round(value * 100)}%`
}

function score(value: number): string {
 return `${Math.round(value * 100)}`
}

function clamp(value: number, min = 0, max = 100): number {
 return Math.max(min, Math.min(max, value))
}

function parseNumber(value: unknown): number {
 const parsed = typeof value === 'string' ? Number.parseFloat(value.replace(/,/g, '')) : Number(value)
 return Number.isFinite(parsed) ? parsed : 0
}

function todayDate(): string {
 return new Date().toISOString().split('T')[0]
}

interface AdvancedIndicators {
 followThrough: Array<{ horizon: string; returnPct: number; score: number }>
 distribution: Array<{ horizon: string; downProbability: number; risk: number }>
 breakout: { score: number; label: 'Valid Breakout' | 'Suspicious Breakout' | 'Bull Trap'; reasons: string[] }
 regime: { ihsgReturn: number; multiplier: number; adjustedScore: number; label: string }
 technical: { rsi: number; volumeRatio: number; momentum5D: number }
}

function getChartItems(payload: any): any[] {
 const data = payload?.data || payload
 if (Array.isArray(data)) return data
 if (Array.isArray(data?.data)) return data.data
 if (Array.isArray(data?.prices)) return data.prices
 if (Array.isArray(data?.chart_data)) return data.chart_data
 return []
}

function buildAdvancedIndicators(analysis: MataDewaAnalysis, stockPayload: any, ihsgPayload: any, orderbookPayload: any, runningPayload: any): AdvancedIndicators {
 const candles = parseChartToCandles(stockPayload)
 const tech = analyzeStock(candles)
 const last = candles.length - 1
 const closeNow = candles[last]?.close || analysis.currentPrice || 0
 const closeAgo = (daysAgo: number) => candles[Math.max(0, last - daysAgo)]?.close || closeNow
 const returnFromPast = (daysAgo: number) => closeAgo(daysAgo) > 0 ? ((closeNow - closeAgo(daysAgo)) / closeAgo(daysAgo)) * 100 : 0
 const volumeRatio = tech?.avgVolume ? tech.volume / tech.avgVolume : 0
 const momentum5D = returnFromPast(5)

 const baseEdge = (analysis.accumulationQualityScore * 45) + (analysis.markupReadinessScore * 30) + (Math.max(0, analysis.smartMoneyFlowScore) * 25) - (analysis.distributionRiskScore * 35)
 const followThrough = [1, 3, 5, 10].map((day) => {
 const trendBoost = returnFromPast(Math.min(day * 2, Math.max(1, last))) * 0.8
 return { horizon: `${day}D`, returnPct: trendBoost, score: clamp(baseEdge + trendBoost, 0, 100) }
 })

 const trapBase = (analysis.distributionRiskScore * 55) + (analysis.netSmartMoney < 0 && analysis.netRetail > 0 ? 25 : 0) + (analysis.crossingShare * 15) + (momentum5D > 8 ? 10 : 0)
 const distribution = [1, 3, 5, 10].map((day) => ({ horizon: `${day}D`, downProbability: clamp(trapBase + day * 1.5, 0, 100), risk: clamp(trapBase, 0, 100) }))

 const ob = orderbookPayload?.data || orderbookPayload || {}
 const bidLot = parseNumber(ob.total_bid_offer?.bid?.lot) || (ob.bid || []).slice(0, 5).reduce((sum: number, row: any) => sum + parseNumber(row.volume), 0)
 const offerLot = parseNumber(ob.total_bid_offer?.offer?.lot) || (ob.offer || []).slice(0, 5).reduce((sum: number, row: any) => sum + parseNumber(row.volume), 0)
 const bidPressure = offerLot > 0 ? bidLot / offerLot : bidLot > 0 ? 2 : 1
 const rtRows = runningPayload?.running_trade || runningPayload?.data?.running_trade || []
 const whaleTrades = Array.isArray(rtRows) ? rtRows.filter((row: any) => parseNumber(row.price) * parseNumber(row.lot) * 100 >= 50_000_000).length : 0
 const breakoutScore = clamp((momentum5D > 3 ? 25 : 0) + Math.min(volumeRatio, 3) * 12 + (analysis.netSmartMoney > 0 ? 20 : -15) + (analysis.netRetail > 0 && analysis.netSmartMoney < 0 ? -25 : 0) + Math.min(bidPressure, 2) * 10 + Math.min(whaleTrades, 8) * 2 - analysis.distributionRiskScore * 25, 0, 100)
 const breakoutLabel = breakoutScore >= 70 ? 'Valid Breakout' : breakoutScore <= 40 ? 'Bull Trap' : 'Suspicious Breakout'

 const ihsgItems = getChartItems(ihsgPayload)
 const firstIHSG = parseNumber(ihsgItems[0]?.close ?? ihsgItems[0]?.value)
 const lastIHSG = parseNumber(ihsgItems[ihsgItems.length - 1]?.close ?? ihsgItems[ihsgItems.length - 1]?.value)
 const ihsgReturn = firstIHSG > 0 ? ((lastIHSG - firstIHSG) / firstIHSG) * 100 : 0
 const multiplier = ihsgReturn > 3 ? 1.08 : ihsgReturn < -3 ? 0.82 : ihsgReturn < 0 ? 0.92 : 1
 const adjustedScore = Math.round(clamp(analysis.score * multiplier - analysis.distributionRiskScore * 8, 0, 100))

 return {
 followThrough,
 distribution,
 breakout: {
 score: Math.round(breakoutScore),
 label: breakoutLabel,
 reasons: [`Volume ${volumeRatio.toFixed(1)}x avg`, `Bid/Offer ${bidPressure.toFixed(2)}x`, `Whale ${whaleTrades} trade`, analysis.netSmartMoney >= 0 ? 'Smart money net buy' : 'Smart money net sell'],
 },
 regime: { ihsgReturn, multiplier, adjustedScore, label: ihsgReturn < -3 ? 'Risk-Off' : ihsgReturn > 3 ? 'Risk-On' : 'Neutral' },
 technical: { rsi: tech?.rsi || 0, volumeRatio, momentum5D },
 }
}

function verdictClass(verdict: MataDewaAnalysis['verdict']): string {
 if (verdict === 'STRONG_BUY') return 'bg-accent-green/15 text-accent-green border-accent-green/40'
 if (verdict === 'BUY') return 'bg-green-900/20 text-green-400 border-green-700/40'
 if (verdict === 'DANGER') return 'bg-accent-red/15 text-accent-red border-accent-red/40'
 return 'bg-dark-800 text-dark-300 border-dark-700'
}

function signalClass(tone: string): string {
 if (tone === 'bullish') return 'border-accent-green/30 bg-accent-green/10 text-accent-green'
 if (tone === 'bearish') return 'border-accent-red/30 bg-accent-red/10 text-accent-red'
 if (tone === 'warning') return 'border-amber-600/30 bg-amber-900/20 text-amber-300'
 return 'border-dark-700 bg-dark-800 text-dark-300'
}

const chartTooltipStyle = {
 backgroundColor: '#101820',
 border: '1px solid #263241',
 borderRadius: 12,
 color: '#e5edf4',
}

export default function MataDewaDashboard() {
 const [days, setDays] = useState(20)
 const initialSymbol = useMemo(() => getLastSearchedSymbol(), [])
 const [inputSymbol, setInputSymbol] = useState(initialSymbol)
 const [submittedSymbol, setSubmittedSymbol] = useState(initialSymbol)
 const [selectedSymbol, setSelectedSymbol] = useState<string | null>(null)
 const customWatchlist = useAlertStore((state) => state.settings.customWatchlist)
 const activeSymbol = useMemo(
 () => (submittedSymbol.trim() || DEFAULT_SYMBOL).toUpperCase(),
 [submittedSymbol]
 )
 const symbols = useMemo(() => [activeSymbol], [activeSymbol])
 const query = useMataDewaDashboard(symbols, { days })
 const retailAnomalyQuery = useRetailSellAnomaly(symbols, { days })
 const analyses = query.data ?? []
 const retailAnomalies = retailAnomalyQuery.data ?? []
 const selected = analyses.find((item) => item.symbol === selectedSymbol) || analyses[0]
 const selectedRetailAnomaly = retailAnomalies.find((item) => item.symbol === (selected?.symbol || activeSymbol))

 const submitSymbol = (value: string) => {
 const next = value.trim().toUpperCase()
 if (next.length < 3 || next === activeSymbol) return

 setSubmittedSymbol(next)
 setSelectedSymbol(null)
 window.localStorage.setItem(LAST_SYMBOL_STORAGE_KEY, next)
 }

 useEffect(() => {
 const timer = window.setTimeout(() => submitSymbol(inputSymbol), 800)
 return () => window.clearTimeout(timer)
 }, [inputSymbol])

 return (
 <div className="space-y-5">
 <Card className="overflow-hidden border-accent-green/20 bg-gradient-to-br from-dark-900 via-dark-900 to-emerald-950/30">
 <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
 <div>
 <p className="text-xs font-semibold uppercase tracking-[0.3em] text-accent-green">Mata Dewa</p>
 <h2 className="mt-2 text-2xl font-black text-dark-100">Dashboard Bandar Summary Terpadu</h2>
 <p className="mt-2 max-w-3xl text-sm leading-relaxed text-dark-400">
 Ranking watchlist dengan Composite Bandar Score, AVG cost tracker, silent accumulation,
 smart money flow, fake volume, fake foreign, persistence, dan footprint z-score.
 </p>
 </div>
 <div className="flex flex-wrap items-center gap-2">
 <input
 value={inputSymbol}
 onChange={(event) => {
 const next = event.target.value.toUpperCase()
 setInputSymbol(next)
 }}
 onKeyDown={(event) => {
 if (event.key === 'Enter') submitSymbol(inputSymbol)
 }}
 onBlur={() => submitSymbol(inputSymbol)}
 placeholder={initialSymbol}
 className="w-28 rounded-lg border border-dark-700 bg-dark-950 px-3 py-2 text-sm font-bold text-dark-100 outline-none transition placeholder:text-dark-600 focus:border-accent-green"
 />
 {[10, 20, 60].map((option) => (
 <button
 key={option}
 onClick={() => setDays(option)}
 className={clsx(
 'rounded-lg border px-3 py-2 text-xs font-bold transition',
 days === option
 ? 'border-accent-green bg-accent-green/10 text-accent-green'
 : 'border-dark-700 text-dark-400 hover:bg-dark-800 hover:text-dark-100'
 )}
 >
 {option}D
 </button>
 ))}
 </div>
 </div>
 </Card>

 {customWatchlist.length === 0 && (
 <Card className="border-amber-700/30 bg-amber-900/10 text-sm text-amber-300">
 Watchlist custom masih kosong. Mata Dewa memakai saham terakhir yang dicari: {activeSymbol}. Ketik kode saham di input kanan atas untuk cek satu saham lain.
 </Card>
 )}

 {query.isLoading && <Card className="text-dark-400">Mengambil histori {activeSymbol} x {days} hari...</Card>}
 {query.isError && (
 <Card className="border-accent-red/30 text-accent-red">
 Gagal memuat Mata Dewa. Kurangi jumlah watchlist / periode, lalu coba lagi.
 </Card>
 )}

 {analyses.length > 0 && (
 <div className="grid grid-cols-1 gap-5 xl:grid-cols-12">
 <div className="xl:col-span-7">
 <Card className="p-0 overflow-hidden">
 <div className="border-b border-dark-800 px-4 py-3">
 <h3 className="font-bold text-dark-100">Ranking Watchlist</h3>
 <p className="text-xs text-dark-500">Klik saham untuk lihat jejak broker detail.</p>
 </div>
 <div className="divide-y divide-dark-800">
 {analyses.map((item, index) => (
 <button
 key={item.symbol}
 onClick={() => setSelectedSymbol(item.symbol)}
 className={clsx(
 'grid w-full grid-cols-12 items-center gap-3 px-4 py-3 text-left transition hover:bg-dark-800/60',
 selected?.symbol === item.symbol && 'bg-dark-800/80'
 )}
 >
 <div className="col-span-3 flex items-center gap-3">
 <span className="text-xs text-dark-500">#{index + 1}</span>
 <div>
 <p className="font-black text-dark-100">{item.symbol}</p>
 <p className="text-[10px] text-dark-500">{item.latestDate || '-'}</p>
 </div>
 </div>
 <div className="col-span-2">
 <p className="text-2xl font-black text-dark-100">{item.score}</p>
 <p className="text-[10px] text-dark-500">CBS</p>
 </div>
 <div className="col-span-3">
 <span className={clsx('rounded-full border px-2 py-1 text-xs font-bold', verdictClass(item.verdict))}>
 {item.verdictLabel}
 </span>
 </div>
 <div className="col-span-4 grid grid-cols-3 gap-2 text-right text-xs">
  <Metric label="AccQ" value={score(item.accumulationQualityScore)} good={item.accumulationQualityScore >= 0.65} />
  <Metric label="Risk" value={score(item.distributionRiskScore)} bad={item.distributionRiskScore >= 0.6} />
  <Metric label="Markup" value={score(item.markupReadinessScore)} good={item.markupReadinessScore >= 0.65} />
 </div>
 </button>
 ))}
 </div>
 </Card>
 </div>

 <div className="xl:col-span-5">
 {selected && <DetailPanel analysis={selected} />}
 </div>
 </div>
 )}

 {selectedRetailAnomaly && <RetailAnomalyPanel data={selectedRetailAnomaly} />}
 </div>
 )
}

function Metric({ label, value, good, bad }: { label: string; value: string; good?: boolean; bad?: boolean }) {
 return (
 <div>
 <p className={clsx('font-mono font-bold', good && 'text-accent-green', bad && 'text-accent-red', !good && !bad && 'text-dark-200')}>{value}</p>
 <p className="text-[10px] text-dark-500">{label}</p>
 </div>
 )
}

function DetailPanel({ analysis }: { analysis: MataDewaAnalysis }) {
 const stockChart = useStockChart(analysis.symbol, '3m')
 const ihsgChart = useIHSGChart('3m')
 const orderbook = useOrderbook(analysis.symbol, { refetchInterval: false })
 const runningTrade = useRunningTrade(analysis.symbol, todayDate(), { maxPages: 6, refetchInterval: false })
 const advanced = useMemo(
 () => buildAdvancedIndicators(analysis, stockChart.data, ihsgChart.data, orderbook.data, runningTrade.data),
 [analysis, stockChart.data, ihsgChart.data, orderbook.data, runningTrade.data]
 )

 return (
 <Card className="space-y-4">
 <div className="flex items-start justify-between gap-3">
 <div>
 <h3 className="text-xl font-black text-dark-100">{analysis.symbol}</h3>
 <p className="text-xs text-dark-500">Harga referensi: {analysis.currentPrice ? analysis.currentPrice.toFixed(0) : '-'}</p>
 </div>
 <div className={clsx('rounded-xl border px-3 py-2 text-right', verdictClass(analysis.verdict))}>
 <p className="text-2xl font-black">{analysis.score}</p>
 <p className="text-[10px]">{analysis.verdictLabel}</p>
 </div>
 </div>

  <div className="grid grid-cols-2 gap-2">
  <ScorePill label="Acc Quality" value={score(analysis.accumulationQualityScore)} good={analysis.accumulationQualityScore >= 0.65} />
  <ScorePill label="Dist Risk" value={score(analysis.distributionRiskScore)} bad={analysis.distributionRiskScore >= 0.6} />
  <ScorePill label="Markup Ready" value={score(analysis.markupReadinessScore)} good={analysis.markupReadinessScore >= 0.65} />
  <ScorePill label="Shakeout" value={score(analysis.shakeoutScore)} good={analysis.shakeoutScore >= 0.6} />
  <ScorePill label="Bandar Cost Gap" value={`${analysis.bandarCostGap.toFixed(1)}%`} good={analysis.bandarCostGap < 0} bad={analysis.bandarCostGap > 15} />
  <ScorePill label="Absorption" value={`${analysis.absorptionStrength.toFixed(2)}x`} good={analysis.absorptionStrength >= 1.15} />
  <ScorePill label="Fake Retail" value={percent(analysis.fakeRetailScore)} bad={analysis.fakeRetailScore >= 0.35} />
  <ScorePill label="Divergence" value={`${Math.round(analysis.smartMoneyDivergenceScore * 100)}`} good={analysis.smartMoneyDivergenceScore >= 0.55} bad={analysis.smartMoneyDivergenceScore <= -0.55} />
  <ScorePill label="Silent Acc" value={percent(analysis.silentAccumulationScore)} />
  <ScorePill label="Buyer Conc" value={percent(analysis.buyerConcentration)} />
  <ScorePill label="Crossing" value={percent(analysis.crossingShare)} bad={analysis.crossingShare >= 0.25} />
  <ScorePill label="Fake Foreign" value={percent(analysis.fakeForeignScore)} bad={analysis.fakeForeignScore >= 0.35} />
 </div>

  <div className="rounded-xl border border-dark-800 bg-dark-900/60 p-3">
  <p className="text-xs font-bold uppercase tracking-wide text-dark-500">Cara Baca Cepat</p>
  <div className="mt-3 grid grid-cols-1 gap-2 text-xs text-dark-300 sm:grid-cols-2">
  <InsightLine label="Bandar Cost" value={analysis.bandarCostGap < 0 ? 'harga di bawah AVG akumulator' : 'harga premium dari AVG akumulator'} tone={analysis.bandarCostGap < 0 ? 'bullish' : analysis.bandarCostGap > 15 ? 'bearish' : 'neutral'} />
  <InsightLine label="Absorption" value={analysis.absorptionStrength >= 1.15 ? 'buyer menyerap tekanan jual' : 'serapan belum dominan'} tone={analysis.absorptionStrength >= 1.15 ? 'bullish' : 'neutral'} />
  <InsightLine label="Crossing" value={analysis.crossingShare >= 0.25 ? 'waspada volume semu' : 'crossing relatif rendah'} tone={analysis.crossingShare >= 0.25 ? 'warning' : 'neutral'} />
  <InsightLine label="Exit Risk" value={analysis.distributionRiskScore >= 0.6 ? 'risiko distribusi tinggi' : 'belum ada distribusi kuat'} tone={analysis.distributionRiskScore >= 0.6 ? 'bearish' : 'neutral'} />
  </div>
  </div>

 <IndicatorCharts analysis={analysis} />
 <AdvancedIndicatorCharts data={advanced} />

 <div className="space-y-2">
 <p className="text-xs font-bold uppercase tracking-wide text-dark-500">Sinyal Utama</p>
 {analysis.signals.map((signal) => (
 <div key={signal.key} className={clsx('rounded-lg border p-3', signalClass(signal.tone))}>
 <div className="flex items-center justify-between gap-3">
 <p className="text-sm font-bold">{signal.label}</p>
 <p className="font-mono text-xs font-bold">{signal.value}</p>
 </div>
 <p className="mt-1 text-xs opacity-80">{signal.description}</p>
 </div>
 ))}
 </div>

 <div className="space-y-2">
 <p className="text-xs font-bold uppercase tracking-wide text-dark-500">Bandar AVG Cost Tracker</p>
 {analysis.avgCostPositions.slice(0, 6).map((item) => (
 <div key={item.code} className="flex items-center justify-between rounded-lg bg-dark-800 px-3 py-2 text-xs">
 <div>
 <p className="font-bold text-dark-100">{item.code} <span className="text-dark-500">T{item.tier}</span></p>
 <p className="text-dark-500">AVG {item.avgCost ? item.avgCost.toFixed(0) : '-'}</p>
 </div>
 <div className="text-right">
 <p className={clsx('font-mono font-bold', item.netValue >= 0 ? 'text-accent-green' : 'text-accent-red')}>
 {compact(item.netValue)}
 </p>
 <p className={clsx('text-[10px]', item.estimatedPnLPercent < 0 ? 'text-amber-300' : 'text-dark-500')}>
 {item.estimatedPnLPercent.toFixed(1)}% est PnL
 </p>
 </div>
 </div>
 ))}
 </div>
 </Card>
 )
}

function IndicatorCharts({ analysis }: { analysis: MataDewaAnalysis }) {
 const radarData = [
 { metric: 'AccQ', value: Math.round(analysis.accumulationQualityScore * 100) },
 { metric: 'Markup', value: Math.round(analysis.markupReadinessScore * 100) },
 { metric: 'Shakeout', value: Math.round(analysis.shakeoutScore * 100) },
 { metric: 'Absorb', value: Math.min(100, Math.round(analysis.absorptionStrength * 50)) },
 { metric: 'Persist', value: Math.round(analysis.persistenceScore * 100) },
 { metric: 'Buyer', value: Math.round(analysis.buyerConcentration * 100) },
 ]

 const riskData = [
 { name: 'Distribution', value: Math.round(analysis.distributionRiskScore * 100), color: '#ef4444' },
 { name: 'Crossing', value: Math.round(analysis.crossingShare * 100), color: '#f59e0b' },
 { name: 'Fake Retail', value: Math.round(analysis.fakeRetailScore * 100), color: '#fb7185' },
 { name: 'Fake Foreign', value: Math.round(analysis.fakeForeignScore * 100), color: '#a855f7' },
 ]

 const flowData = [
 { name: 'Smart Money', value: analysis.netSmartMoney },
 { name: 'Retail', value: analysis.netRetail },
 ]

 const maxFlow = Math.max(1, ...flowData.map((item) => Math.abs(item.value)))

 return (
 <div className="space-y-3">
 <p className="text-xs font-bold uppercase tracking-wide text-dark-500">Chart Indikator</p>
 <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
 <div className="rounded-xl border border-dark-800 bg-dark-900/60 p-3">
 <div className="mb-2 flex items-center justify-between">
 <p className="text-xs font-bold text-dark-200">Radar Kekuatan Akumulasi</p>
 <span className="rounded-full bg-accent-green/10 px-2 py-1 text-[10px] font-bold text-accent-green">Bullish Map</span>
 </div>
 <div className="h-56">
 <ResponsiveContainer width="100%" height="100%">
 <RadarChart data={radarData} outerRadius="72%">
 <PolarGrid stroke="#263241" />
 <PolarAngleAxis dataKey="metric" tick={{ fill: '#94a3b8', fontSize: 11 }} />
 <Radar dataKey="value" stroke="#22c55e" fill="#22c55e" fillOpacity={0.28} />
 <Tooltip contentStyle={chartTooltipStyle} formatter={(value: number) => [`${value}`, 'Score']} />
 </RadarChart>
 </ResponsiveContainer>
 </div>
 </div>

 <div className="rounded-xl border border-dark-800 bg-dark-900/60 p-3">
 <div className="mb-2 flex items-center justify-between">
 <p className="text-xs font-bold text-dark-200">Barometer Risiko</p>
 <span className="rounded-full bg-accent-red/10 px-2 py-1 text-[10px] font-bold text-accent-red">Risk Map</span>
 </div>
 <div className="h-56">
 <ResponsiveContainer width="100%" height="100%">
 <BarChart data={riskData} layout="vertical" margin={{ left: 8, right: 16, top: 8, bottom: 8 }}>
 <CartesianGrid stroke="#1f2937" strokeDasharray="3 3" horizontal={false} />
 <XAxis type="number" domain={[0, 100]} tick={{ fill: '#64748b', fontSize: 10 }} />
 <YAxis type="category" dataKey="name" width={78} tick={{ fill: '#94a3b8', fontSize: 10 }} />
 <Tooltip contentStyle={chartTooltipStyle} formatter={(value: number) => [`${value}`, 'Score']} />
 <Bar dataKey="value" radius={[0, 8, 8, 0]}>
 {riskData.map((entry) => <Cell key={entry.name} fill={entry.color} />)}
 </Bar>
 </BarChart>
 </ResponsiveContainer>
 </div>
 </div>
 </div>

 <div className="rounded-xl border border-dark-800 bg-dark-900/60 p-3">
 <div className="mb-3 flex items-center justify-between">
 <div>
 <p className="text-xs font-bold text-dark-200">Flow Battle: Smart Money vs Retail</p>
 <p className="text-[10px] text-dark-500">Hijau berarti net buy, merah berarti net sell. Panjang bar dinormalisasi dari flow terbesar.</p>
 </div>
 <span className={clsx(
 'rounded-full px-2 py-1 text-[10px] font-bold',
 analysis.netSmartMoney >= 0 ? 'bg-accent-green/10 text-accent-green' : 'bg-accent-red/10 text-accent-red'
 )}>{analysis.netSmartMoney >= 0 ? 'Smart Accumulating' : 'Smart Distributing'}</span>
 </div>
 <div className="space-y-3">
 {flowData.map((item) => {
 const width = Math.max(4, Math.round((Math.abs(item.value) / maxFlow) * 100))
 const isPositive = item.value >= 0
 return (
 <div key={item.name}>
 <div className="mb-1 flex items-center justify-between text-xs">
 <span className="font-bold text-dark-300">{item.name}</span>
 <span className={clsx('font-mono font-bold', isPositive ? 'text-accent-green' : 'text-accent-red')}>{compact(item.value)}</span>
 </div>
 <div className="h-3 overflow-hidden rounded-full bg-dark-800">
 <div className={clsx('h-full rounded-full', isPositive ? 'bg-accent-green' : 'bg-accent-red')} style={{ width: `${width}%` }} />
 </div>
 </div>
 )
 })}
 </div>
 </div>
 </div>
 )
}

function AdvancedIndicatorCharts({ data }: { data: AdvancedIndicators }) {
 const regimeData = [
 { name: 'Base', score: data.regime.adjustedScore / data.regime.multiplier },
 { name: data.regime.label, score: data.regime.adjustedScore },
 ]
 const breakoutTone = data.breakout.label === 'Valid Breakout' ? 'text-accent-green bg-accent-green/10' : data.breakout.label === 'Bull Trap' ? 'text-accent-red bg-accent-red/10' : 'text-amber-300 bg-amber-900/20'

 return (
 <div className="space-y-3">
 <p className="text-xs font-bold uppercase tracking-wide text-dark-500">Chart Indikator Lanjutan</p>
 <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
 <div className="rounded-xl border border-dark-800 bg-dark-900/60 p-3">
 <div className="mb-2 flex items-center justify-between">
 <p className="text-xs font-bold text-dark-200">Smart Money Follow-Through</p>
 <span className="rounded-full bg-accent-green/10 px-2 py-1 text-[10px] font-bold text-accent-green">Return 1/3/5/10D</span>
 </div>
 <div className="h-52">
 <ResponsiveContainer width="100%" height="100%">
 <LineChart data={data.followThrough} margin={{ left: 0, right: 8, top: 8, bottom: 0 }}>
 <CartesianGrid stroke="#1f2937" strokeDasharray="3 3" />
 <XAxis dataKey="horizon" tick={{ fill: '#94a3b8', fontSize: 10 }} />
 <YAxis tick={{ fill: '#64748b', fontSize: 10 }} />
 <Tooltip contentStyle={chartTooltipStyle} formatter={(value: number, name: string) => [name === 'returnPct' ? `${value.toFixed(2)}%` : value.toFixed(0), name === 'returnPct' ? 'Return proxy' : 'Score']} />
 <ReferenceLine y={0} stroke="#64748b" />
 <Line type="monotone" dataKey="returnPct" stroke="#22c55e" strokeWidth={2} dot={{ r: 3 }} />
 <Line type="monotone" dataKey="score" stroke="#38bdf8" strokeWidth={2} dot={{ r: 3 }} />
 </LineChart>
 </ResponsiveContainer>
 </div>
 </div>

 <div className="rounded-xl border border-dark-800 bg-dark-900/60 p-3">
 <div className="mb-2 flex items-center justify-between">
 <p className="text-xs font-bold text-dark-200">Retail Trap / Distribution Accuracy</p>
 <span className="rounded-full bg-accent-red/10 px-2 py-1 text-[10px] font-bold text-accent-red">Probabilitas Turun</span>
 </div>
 <div className="h-52">
 <ResponsiveContainer width="100%" height="100%">
 <AreaChart data={data.distribution} margin={{ left: 0, right: 8, top: 8, bottom: 0 }}>
 <CartesianGrid stroke="#1f2937" strokeDasharray="3 3" />
 <XAxis dataKey="horizon" tick={{ fill: '#94a3b8', fontSize: 10 }} />
 <YAxis domain={[0, 100]} tick={{ fill: '#64748b', fontSize: 10 }} />
 <Tooltip contentStyle={chartTooltipStyle} formatter={(value: number) => [`${value.toFixed(0)}%`, 'Down probability']} />
 <Area type="monotone" dataKey="downProbability" stroke="#ef4444" fill="#ef4444" fillOpacity={0.22} />
 </AreaChart>
 </ResponsiveContainer>
 </div>
 </div>
 </div>

 <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
 <div className="rounded-xl border border-dark-800 bg-dark-900/60 p-3">
 <div className="mb-3 flex items-start justify-between gap-3">
 <div>
 <p className="text-xs font-bold text-dark-200">Breakout Quality Score</p>
 <p className="text-[10px] text-dark-500">Validasi breakout dari volume, smart money, orderbook, dan whale trade.</p>
 </div>
 <span className={clsx('rounded-full px-2 py-1 text-[10px] font-bold', breakoutTone)}>{data.breakout.label}</span>
 </div>
 <div className="flex items-center gap-4">
 <div className="grid h-24 w-24 place-items-center rounded-full border-8 border-dark-800 bg-dark-950" style={{ borderTopColor: data.breakout.score >= 70 ? '#22c55e' : data.breakout.score <= 40 ? '#ef4444' : '#f59e0b' }}>
 <span className="text-2xl font-black text-dark-100">{data.breakout.score}</span>
 </div>
 <div className="space-y-1 text-xs text-dark-300">
 {data.breakout.reasons.map((reason) => <p key={reason}>• {reason}</p>)}
 </div>
 </div>
 </div>

 <div className="rounded-xl border border-dark-800 bg-dark-900/60 p-3">
 <div className="mb-2 flex items-center justify-between">
 <p className="text-xs font-bold text-dark-200">Regime-Adjusted Mata Dewa Score</p>
 <span className="rounded-full bg-sky-500/10 px-2 py-1 text-[10px] font-bold text-sky-300">IHSG {data.regime.ihsgReturn.toFixed(2)}%</span>
 </div>
 <div className="h-36">
 <ResponsiveContainer width="100%" height="100%">
 <BarChart data={regimeData} margin={{ left: 0, right: 8, top: 8, bottom: 0 }}>
 <CartesianGrid stroke="#1f2937" strokeDasharray="3 3" vertical={false} />
 <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 10 }} />
 <YAxis domain={[0, 100]} tick={{ fill: '#64748b', fontSize: 10 }} />
 <Tooltip contentStyle={chartTooltipStyle} formatter={(value: number) => [value.toFixed(0), 'Score']} />
 <Bar dataKey="score" fill="#38bdf8" radius={[8, 8, 0, 0]} />
 </BarChart>
 </ResponsiveContainer>
 </div>
 <div className="mt-2 grid grid-cols-3 gap-2 text-center text-[10px] text-dark-400">
 <span>RSI {data.technical.rsi.toFixed(1)}</span>
 <span>Vol {data.technical.volumeRatio.toFixed(1)}x</span>
 <span>Mom5D {data.technical.momentum5D.toFixed(1)}%</span>
 </div>
 </div>
 </div>
 </div>
 )
}

function ScorePill({ label, value, good, bad }: { label: string; value: string; good?: boolean; bad?: boolean }) {
 return (
 <div className="rounded-lg bg-dark-800 p-3">
 <p className="text-[10px] uppercase tracking-wide text-dark-500">{label}</p>
  <p className={clsx('mt-1 font-mono text-lg font-black', good && 'text-accent-green', bad && 'text-accent-red', !good && !bad && 'text-dark-100')}>{value}</p>
 </div>
 )
}

function RetailAnomalyPanel({ data }: { data: RetailSellAnomalyResult }) {
 const verdictColor = data.verdict === 'BULLISH_ANOMALY'
 ? 'border-accent-green/30 bg-accent-green/5'
 : data.verdict === 'BEARISH_ANOMALY'
 ? 'border-accent-red/30 bg-accent-red/5'
 : 'border-dark-700 bg-dark-900/60'
 const verdictText = data.verdict === 'BULLISH_ANOMALY'
 ? 'text-accent-green'
 : data.verdict === 'BEARISH_ANOMALY'
 ? 'text-accent-red'
 : 'text-dark-300'

 const chartData = data.days.map((d) => ({
 date: d.date.slice(5),
 xl: d.xlNetValue,
 xc: d.xcNetValue,
 combined: d.combinedNetValue,
 price: d.price,
 }))

 return (
 <Card className={clsx('space-y-4', verdictColor)}>
 <div className="flex items-start justify-between gap-3">
 <div>
 <p className="text-xs font-semibold uppercase tracking-[0.2em] text-dark-500">XL / XC Retail Sell Anomaly</p>
 <h3 className="mt-1 text-lg font-black text-dark-100">{data.symbol}</h3>
 </div>
 <div className="text-right">
 <p className={clsx('text-sm font-black', verdictText)}>{data.verdictLabel}</p>
 <p className="text-[10px] text-dark-500">Net sell {data.netSellDays}/{data.totalDays} hari</p>
 </div>
 </div>

 <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
 <ScorePill label="XL Net" value={compact(data.xlTotalNet)} good={data.xlTotalNet < 0} bad={data.xlTotalNet > 0} />
 <ScorePill label="XC Net" value={compact(data.xcTotalNet)} good={data.xcTotalNet < 0} bad={data.xcTotalNet > 0} />
 <ScorePill label="Win Rate" value={`${data.winRate.toFixed(0)}%`} good={data.winRate >= 55} />
 <ScorePill label="Avg Return" value={`${data.avgReturnAfterSell >= 0 ? '+' : ''}${data.avgReturnAfterSell.toFixed(2)}%`} good={data.avgReturnAfterSell > 0} bad={data.avgReturnAfterSell < -0.1} />
 </div>

 {chartData.length > 2 && (
 <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
 <div className="rounded-xl border border-dark-800 bg-dark-900/60 p-3">
 <p className="mb-2 text-xs font-bold text-dark-200">XL + XC Net Flow Harian</p>
 <div className="h-44">
 <ResponsiveContainer width="100%" height="100%">
 <BarChart data={chartData} margin={{ left: 0, right: 8, top: 8, bottom: 0 }}>
 <CartesianGrid stroke="#1f2937" strokeDasharray="3 3" vertical={false} />
 <XAxis dataKey="date" tick={{ fill: '#64748b', fontSize: 9 }} />
 <YAxis tick={{ fill: '#64748b', fontSize: 9 }} tickFormatter={(v: number) => {
 const a = Math.abs(v)
 return a >= 1e9 ? `${(v / 1e9).toFixed(1)}B` : a >= 1e6 ? `${(v / 1e6).toFixed(0)}M` : `${v}`
 }} />
 <Tooltip contentStyle={chartTooltipStyle} formatter={(v: number, name: string) => [compact(v), name.toUpperCase()]} />
 <ReferenceLine y={0} stroke="#64748b" />
 <Bar dataKey="xl" stackId="a" fill="#f59e0b" />
 <Bar dataKey="xc" stackId="a" fill="#a855f7" />
 </BarChart>
 </ResponsiveContainer>
 </div>
 <div className="mt-1 flex gap-3 text-[10px] text-dark-500">
 <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-full bg-amber-500" /> XL</span>
 <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-full bg-purple-500" /> XC</span>
 </div>
 </div>

 <div className="rounded-xl border border-dark-800 bg-dark-900/60 p-3">
 <p className="mb-2 text-xs font-bold text-dark-200">Harga vs Combined Net</p>
 <div className="h-44">
 <ResponsiveContainer width="100%" height="100%">
 <LineChart data={chartData} margin={{ left: 0, right: 8, top: 8, bottom: 0 }}>
 <CartesianGrid stroke="#1f2937" strokeDasharray="3 3" />
 <XAxis dataKey="date" tick={{ fill: '#64748b', fontSize: 9 }} />
 <YAxis yAxisId="price" orientation="right" tick={{ fill: '#94a3b8', fontSize: 9 }} />
 <YAxis yAxisId="flow" tick={{ fill: '#64748b', fontSize: 9 }} tickFormatter={(v: number) => {
 const a = Math.abs(v)
 return a >= 1e9 ? `${(v / 1e9).toFixed(1)}B` : a >= 1e6 ? `${(v / 1e6).toFixed(0)}M` : `${v}`
 }} />
 <Tooltip contentStyle={chartTooltipStyle} />
 <ReferenceLine yAxisId="flow" y={0} stroke="#64748b" />
 <Line yAxisId="price" type="monotone" dataKey="price" stroke="#38bdf8" strokeWidth={2} dot={false} />
 <Line yAxisId="flow" type="monotone" dataKey="combined" stroke="#22c55e" strokeWidth={1.5} dot={{ r: 2 }} />
 </LineChart>
 </ResponsiveContainer>
 </div>
 <div className="mt-1 flex gap-3 text-[10px] text-dark-500">
 <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-full bg-sky-400" /> Harga</span>
 <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-full bg-accent-green" /> Combined Net</span>
 </div>
 </div>
 </div>
 )}

 <div className="space-y-1">
 <p className="text-xs font-bold uppercase tracking-wide text-dark-500">Insights</p>
 {data.insights.map((insight, i) => (
 <p key={i} className="text-xs text-dark-300">{insight}</p>
 ))}
 </div>
 </Card>
 )
}

function InsightLine({ label, value, tone }: { label: string; value: string; tone: 'bullish' | 'bearish' | 'warning' | 'neutral' }) {
 return (
 <div className="flex items-center justify-between gap-3 rounded-lg bg-dark-800/70 px-3 py-2">
 <span className="font-bold text-dark-400">{label}</span>
 <span className={clsx(
 'text-right font-semibold',
 tone === 'bullish' && 'text-accent-green',
 tone === 'bearish' && 'text-accent-red',
 tone === 'warning' && 'text-amber-300',
 tone === 'neutral' && 'text-dark-200'
 )}>{value}</span>
 </div>
 )
}
