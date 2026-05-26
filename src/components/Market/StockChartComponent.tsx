import { useEffect, useMemo, useRef, useState } from 'react'
import {
 CandlestickSeries,
 createChart,
 CrosshairMode,
 HistogramSeries,
 LineSeries,
 LineStyle,
 type IChartApi,
 type ISeriesApi,
 type UTCTimestamp,
} from 'lightweight-charts'
import { useMarketDetector, useStockChart, useStockChartbit } from '@/hooks/use-queries'
import { Card, ErrorState, LoadingSpinner } from '@/components'
import { getBrokerTierInfo } from '@/data/broker-tiers'
import { parseMarketDetector, type MarketDetectorBroker } from '@/utils/broker-activity'

const TIMEFRAMES = [
 { value: '1d', label: '1D' },
 { value: '1w', label: '1W' },
 { value: '1m', label: '1M' },
 { value: '3m', label: '3M' },
 { value: 'ytd', label: 'YTD' },
 { value: '1y', label: '1Y' },
 { value: '3y', label: '3Y' },
 { value: '5y', label: '5Y' },
]

const MARKET_TIME_ZONE = 'Asia/Jakarta'
const CANDLE_UP_COLOR = '#f8fafc'
const CANDLE_DOWN_COLOR = '#2563eb'
const VOLUME_UP_COLOR = 'rgba(248, 250, 252, 0.35)'
const VOLUME_DOWN_COLOR = 'rgba(37, 99, 235, 0.42)'
const BROKER_AVG_COLOR = '#f59e0b'

type BandarChartInsight = {
 brokerAvgPrice: number | null
 netAvgPrice: number | null
 netSide: 'buy' | 'sell' | 'flat'
 reversal: ReversalSignal
 timeframe: string
 netBrokers: NetBrokerPosition[]
 score: number
 verdict: string
 tone: 'bullish' | 'bearish' | 'neutral'
 smartMoneyNet: number
 retailNet: number
 concentration: number
 explanation: string
}

type NetBrokerPosition = MarketDetectorBroker & {
 buyValue: number
 sellValue: number
 netValue: number
 side: 'buy' | 'sell'
}

type ReversalSignal = {
 label: 'Bullish Reversal' | 'Bearish Reversal' | 'Wait Confirmation'
 tone: 'bullish' | 'bearish' | 'neutral'
 score: number
 reasons: string[]
 ema20: number | null
 ema50: number | null
 volumeRatio: number
 structure: 'breakout' | 'breakdown' | 'sideways'
}

function formatChartDateTime(timestamp: UTCTimestamp): string {
 const date = new Date(Number(timestamp) * 1000)
 return date.toLocaleDateString('id-ID', {
 day: '2-digit',
 month: 'short',
 year: '2-digit',
 timeZone: 'UTC',
 })
}

interface StockChartComponentProps {
 symbol: string
}

type ChartMode = 'line' | 'candlestick'

type LegacySeriesChartApi = IChartApi & {
 addLineSeries?: (options?: Record<string, unknown>) => ISeriesApi<'Line'>
}

type VolumeSeriesApi = ISeriesApi<'Histogram'>

type ParsedChartPoint = {
 time: string
 chartTime: UTCTimestamp
 price: number
 volume: number
 open: number | null
 high: number
 low: number
 close: number | null
}

function toNumber(value: unknown): number | null {
 if (value == null || value === '') return null
 const n = Number(value)
 return Number.isFinite(n) ? n : null
}

function resolveChartVolume(item: any): number {
 const candidates = [
 item.volume,
 item.vol,
 item.transaction_volume,
 item.total_volume,
 item.tvol,
 item.tlot,
 item.lot,
 item.lots,
 item.value_volume,
 item.volume_value,
 item.accumulated_volume,
 item.v,
 ]

 for (const candidate of candidates) {
 const value = toNumber(candidate)
 if (value != null && value > 0) return value
 }

 return 0
}

/** API: `change` is absolute delta (number); `previous_timeframe_price` is often an object. */
function resolveDisplayPrice(data: any, lastFromChart: number): number | null {
 if (lastFromChart > 0) return lastFromChart

 const prev = data?.previous
 if (prev != null && prev !== '') {
 const n = parseFloat(String(prev))
 if (!isNaN(n)) return n
 }

 const ptf = data?.previous_timeframe_price
 if (ptf != null && typeof ptf === 'object') {
 const v = ptf.value ?? ptf.close ?? ptf.price
 if (v != null && v !== '') {
 const n = parseFloat(String(v))
 if (!isNaN(n)) return n
 }
 }
 if (typeof ptf === 'number' && !isNaN(ptf)) return ptf

 return null
}

function stockIconUrl(symbol: string, fromApi?: string): string {
 return fromApi || `https://assets.stockbit.com/logos/companies/${symbol.toUpperCase()}.png`
}

function toMarketDate(dateStr: string): Date | null {
 const parsed = new Date(dateStr)
 return isNaN(parsed.getTime()) ? null : parsed
}

function toChartTimestamp(dateStr: string, idx: number): UTCTimestamp {
 const parsed = new Date(dateStr)
 if (!isNaN(parsed.getTime())) {
 // lightweight-charts renders timestamps in UTC, so shift WIB timestamps
 // forward to keep the visible axis label equal to the real market time.
 return Math.floor((parsed.getTime() + 7 * 60 * 60 * 1000) / 1000) as UTCTimestamp
 }

 const fallbackEpoch = Date.UTC(2000, 0, 1) + idx * 60_000
 return Math.floor(fallbackEpoch / 1000) as UTCTimestamp
}

function extractChartRows(payload: any): any[] {
 const candidates = [
 payload?.prices,
 payload?.data?.prices,
 payload?.data?.data?.prices,
 payload?.data?.chart,
 payload?.data?.chartbit,
 payload?.chart,
 payload?.chartbit,
 payload?.data,
 payload,
 ]

 return candidates.find(Array.isArray) || []
}

function sumValue(items: MarketDetectorBroker[]): number {
 return items.reduce((sum, item) => sum + item.value, 0)
}

function weightedAvgPrice(items: MarketDetectorBroker[]): number | null {
 const totalValue = sumValue(items)
 if (totalValue <= 0) return null
 const weighted = items.reduce((sum, item) => sum + item.avgPrice * item.value, 0)
 return weighted / totalValue
}

function ema(values: number[], period: number): number | null {
 if (values.length < period) return null
 const multiplier = 2 / (period + 1)
 let current = values.slice(0, period).reduce((sum, value) => sum + value, 0) / period
 for (let i = period; i < values.length; i += 1) {
 current = values[i] * multiplier + current * (1 - multiplier)
 }
 return current
}

function average(values: number[]): number {
 if (!values.length) return 0
 return values.reduce((sum, value) => sum + value, 0) / values.length
}

function detectReversal(chartData: ParsedChartPoint[], smartMoneyNet: number, retailNet: number, netSide: 'buy' | 'sell' | 'flat', netAvgPrice: number | null): ReversalSignal {
 const closes = chartData.map((point) => point.price).filter((value) => value > 0)
 const volumes = chartData.map((point) => point.volume).filter((value) => value >= 0)
 const latest = closes[closes.length - 1] ?? 0
 const previous = closes[closes.length - 2] ?? latest
 const lookback = Math.min(20, Math.max(5, closes.length - 1))
 const previousWindow = closes.slice(Math.max(0, closes.length - lookback - 1), Math.max(0, closes.length - 1))
 const resistance = previousWindow.length ? Math.max(...previousWindow) : latest
 const support = previousWindow.length ? Math.min(...previousWindow) : latest
 const recentVolume = volumes[volumes.length - 1] ?? 0
 const avgVolume = average(volumes.slice(Math.max(0, volumes.length - 20), Math.max(0, volumes.length - 1)))
 const volumeRatio = avgVolume > 0 ? recentVolume / avgVolume : 0
 const ema20 = ema(closes, 20)
 const ema50 = ema(closes, 50)
 const structure: ReversalSignal['structure'] = latest > resistance ? 'breakout' : latest < support ? 'breakdown' : 'sideways'
 const nearNetAvg = netAvgPrice && netAvgPrice > 0 ? Math.abs(latest - netAvgPrice) / netAvgPrice <= 0.05 : false
 const aboveEma20 = ema20 != null && latest > ema20
 const belowEma20 = ema20 != null && latest < ema20

 let bullishScore = 0
 let bearishScore = 0
 const reasons: string[] = []

 if (structure === 'breakout') {
 bullishScore += 25
 reasons.push('Harga breakout dari resistance minor.')
 }
 if (structure === 'breakdown') {
 bearishScore += 25
 reasons.push('Harga breakdown dari support minor.')
 }
 if (volumeRatio >= 1.4) {
 bullishScore += structure === 'breakout' ? 18 : 0
 bearishScore += structure === 'breakdown' ? 18 : 0
 reasons.push('Volume lebih besar dari rata-rata 20 candle.')
 }
 if (netSide === 'buy' && smartMoneyNet > 0) {
 bullishScore += 28
 reasons.push('Smart broker dominan net buy di timeframe aktif.')
 }
 if (netSide === 'sell' && smartMoneyNet < 0) {
 bearishScore += 28
 reasons.push('Smart broker dominan net sell di timeframe aktif.')
 }
 if (nearNetAvg && netSide === 'buy') {
 bullishScore += 14
 reasons.push('Harga dekat area NET AVG BUY bandar.')
 }
 if (retailNet > 0 && smartMoneyNet < 0) {
 bearishScore += 16
 reasons.push('Ritel net buy saat smart money net sell: risiko distribusi.')
 }
 if (aboveEma20 && latest > previous) bullishScore += 10
 if (belowEma20 && latest < previous) bearishScore += 10

 const score = Math.max(bullishScore, bearishScore)
 const tone = score >= 55 ? (bullishScore > bearishScore ? 'bullish' : 'bearish') : 'neutral'
 const label = tone === 'bullish' ? 'Bullish Reversal' : tone === 'bearish' ? 'Bearish Reversal' : 'Wait Confirmation'

 return {
 label,
 tone,
 score: Math.min(100, score),
 reasons: reasons.slice(0, 4),
 ema20,
 ema50,
 volumeRatio,
 structure,
 }
}

function buildNetBrokerPositions(buyers: MarketDetectorBroker[], sellers: MarketDetectorBroker[]): NetBrokerPosition[] {
 const byCode = new Map<string, { buy?: MarketDetectorBroker; sell?: MarketDetectorBroker }>()

 buyers.forEach((broker) => {
 const current = byCode.get(broker.code) || {}
 byCode.set(broker.code, { ...current, buy: broker })
 })

 sellers.forEach((broker) => {
 const current = byCode.get(broker.code) || {}
 byCode.set(broker.code, { ...current, sell: broker })
 })

 return Array.from(byCode.entries())
 .map(([code, pair]) => {
 const buyValue = pair.buy?.value ?? 0
 const sellValue = pair.sell?.value ?? 0
 const netValue = buyValue - sellValue
 if (netValue === 0) return null

 const source = netValue > 0 ? pair.buy : pair.sell
 if (!source) return null

 return {
 ...source,
 code,
 value: Math.abs(netValue),
 buyValue,
 sellValue,
 netValue,
 side: netValue > 0 ? 'buy' : 'sell',
 } as NetBrokerPosition
 })
 .filter((item): item is NetBrokerPosition => Boolean(item))
 .sort((a, b) => Math.abs(b.netValue) - Math.abs(a.netValue))
}

function netValueForTier(buys: MarketDetectorBroker[], sells: MarketDetectorBroker[], tier: 1 | 2 | 3): number {
 const buyValue = buys.filter((item) => getBrokerTierInfo(item.code).tier === tier).reduce((sum, item) => sum + item.value, 0)
 const sellValue = sells.filter((item) => getBrokerTierInfo(item.code).tier === tier).reduce((sum, item) => sum + item.value, 0)
 return buyValue - sellValue
}

function concentration(items: MarketDetectorBroker[]): number {
 const total = sumValue(items)
 if (total <= 0) return 0
 return items.slice(0, 3).reduce((sum, item) => sum + item.value, 0) / total
}

function formatDateForApi(date: Date): string {
 const year = date.getFullYear()
 const month = String(date.getMonth() + 1).padStart(2, '0')
 const day = String(date.getDate()).padStart(2, '0')
 return `${year}-${month}-${day}`
}

function getBrokerDateRange(timeframe: string): { fromDate: string; toDate: string } {
 const to = new Date()
 if (to.getHours() < 19) to.setDate(to.getDate() - 1)
 while (to.getDay() === 0 || to.getDay() === 6) to.setDate(to.getDate() - 1)

 const from = new Date(to)
 const dayMap: Record<string, number> = {
  '1d': 0,
  '1w': 6,
  '1m': 30,
  '3m': 90,
  ytd: Math.max(0, Math.floor((to.getTime() - new Date(to.getFullYear(), 0, 1).getTime()) / 86_400_000)),
  '1y': 365,
  '3y': 365 * 3,
  '5y': 365 * 5,
 }
 from.setDate(to.getDate() - (dayMap[timeframe] ?? 0))

 return { fromDate: formatDateForApi(from), toDate: formatDateForApi(to) }
}

function analyzeBandarChart(detectorRaw: unknown, chartData: ParsedChartPoint[], timeframe: string): BandarChartInsight | null {
 const detector = parseMarketDetector(detectorRaw)
 if (!detector.buyers.length && !detector.sellers.length) return null

 const smartMoneyNet = netValueForTier(detector.buyers, detector.sellers, 2) + netValueForTier(detector.buyers, detector.sellers, 3)
 const retailNet = netValueForTier(detector.buyers, detector.sellers, 1)
 const netSmartBrokers = buildNetBrokerPositions(detector.buyers, detector.sellers)
 .filter((item) => getBrokerTierInfo(item.code).tier !== 1)
 const netBuyBrokers = netSmartBrokers.filter((item) => item.side === 'buy').slice(0, 5)
 const netSellBrokers = netSmartBrokers.filter((item) => item.side === 'sell').slice(0, 5)
 const netBuyValue = sumValue(netBuyBrokers)
 const netSellValue = sumValue(netSellBrokers)
 const netSide = netBuyValue > netSellValue ? 'buy' : netSellValue > netBuyValue ? 'sell' : 'flat'
 const netBrokers = netSide === 'sell' ? netSellBrokers : netBuyBrokers
 const netAvgPrice = weightedAvgPrice(netBrokers) ?? detector.summary?.average ?? null
 const brokerAvgPrice = netAvgPrice
 const buyerConcentration = concentration(detector.buyers)
 const sellerConcentration = concentration(detector.sellers)
 const latest = chartData[chartData.length - 1]?.price ?? 0
 const first = chartData[0]?.price ?? latest
 const priceDrift = first > 0 ? (latest - first) / first : 0
 const avgDistance = brokerAvgPrice && brokerAvgPrice > 0 ? (latest - brokerAvgPrice) / brokerAvgPrice : 0
 const smartFlowRatio = smartMoneyNet / Math.max(Math.abs(smartMoneyNet) + Math.abs(retailNet), 1)
 const reversal = detectReversal(chartData, smartMoneyNet, retailNet, netSide, netAvgPrice)

 let score = 50
 score += smartFlowRatio * 28
 score += buyerConcentration * 18
 score -= sellerConcentration * 14
 if (priceDrift <= 0.03 && smartMoneyNet > 0) score += 14
 if (avgDistance < 0 && smartMoneyNet > 0) score += 10
 if (retailNet > 0 && smartMoneyNet < 0) score -= 22
 score = Math.round(Math.max(0, Math.min(100, score)))

 const tone = score >= 62 ? 'bullish' : score <= 38 ? 'bearish' : 'neutral'
 const verdict = score >= 75 ? 'Akumulasi Kuat' : score >= 62 ? 'Akumulasi' : score <= 38 ? 'Distribusi' : 'Wait & See'
 const explanation = smartMoneyNet > 0 && priceDrift <= 0.03
  ? 'Harga cenderung sideways/turun saat broker non-retail net buy: indikasi silent accumulation.'
  : smartMoneyNet < 0 && retailNet > 0
  ? 'Broker non-retail net sell dan ritel menampung: risiko distribusi.'
  : 'Belum ada anomali kuat antara arah harga dan perpindahan barang.'

 return { brokerAvgPrice, netAvgPrice, netSide, reversal, timeframe, netBrokers, score, verdict, tone, smartMoneyNet, retailNet, concentration: buyerConcentration, explanation }
}

export default function StockChartComponent({ symbol }: StockChartComponentProps) {
 const [selectedTimeframe, setSelectedTimeframe] = useState('1d')
 const [chartMode, setChartMode] = useState<ChartMode>('line')
 const brokerDateRange = useMemo(() => getBrokerDateRange(selectedTimeframe), [selectedTimeframe])
 const { data, isLoading, error, refetch } = useStockChart(symbol, selectedTimeframe)
 const { data: marketDetectorData } = useMarketDetector(symbol, {
 enabled: symbol !== 'IHSG',
 fromDate: brokerDateRange.fromDate,
 toDate: brokerDateRange.toDate,
 })
 const {
 data: candleResponse,
 isLoading: isCandleLoading,
 error: candleError,
 } = useStockChartbit(symbol, selectedTimeframe, { enabled: chartMode === 'candlestick' })

 if (isLoading || (chartMode === 'candlestick' && isCandleLoading)) return <LoadingSpinner />
 if (error) {
 return (
 <ErrorState
 title="Gagal memuat chart"
 message={`Tidak dapat memuat data chart untuk ${symbol}`}
 onRetry={() => refetch()}
 />
 )
 }

 const candleRows = chartMode === 'candlestick' && !candleError ? extractChartRows(candleResponse) : []
 const rawData = candleRows.length ? candleRows : extractChartRows(data)

 const chartData: ParsedChartPoint[] = rawData
 .map((item: any, idx: number) => {
 const closeFromOhlc = toNumber(item.close)
 const valueLike = toNumber(item.value) ?? toNumber(item.price)
 const price = closeFromOhlc ?? valueLike ?? 0
 const open = toNumber(item.open)
 const high = toNumber(item.high)
 const low = toNumber(item.low)
 const close = closeFromOhlc
 const volume = resolveChartVolume(item)
 const dateStr = item.formatted_date || item.date || ''

 let time = ''
 if (dateStr && dateStr !== '0') {
 try {
 const date = toMarketDate(dateStr)
 if (date) {
 time =
 selectedTimeframe === '1d'
 ? date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', timeZone: MARKET_TIME_ZONE })
 : date.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', timeZone: MARKET_TIME_ZONE })
 }
 } catch {
 // ignore parse failures
 }
 }

 time = time || item.xlabel || `${idx}`

 const previousPrice =
 idx > 0
 ? parseFloat(rawData[idx - 1]?.value || rawData[idx - 1]?.close || rawData[idx - 1]?.price || '0') || 0
 : price

 // For candlestick: use actual OHLC if available, otherwise calculate from price
 const candleHigh = high ?? Math.max(open ?? price, close ?? price, price)
 const candleLow = low ?? Math.min(open ?? price, close ?? price, price)
 const candleOpen = open ?? previousPrice
 const candleClose = close ?? price

 // Ensure wicks extend properly from open/close to high/low
 const wickHigh = Math.max(candleHigh, candleOpen, candleClose)
 const wickLow = Math.min(candleLow, candleOpen, candleClose)
 const fallbackOpen = candleOpen
 const fallbackClose = candleClose

 return {
 time,
 chartTime: toChartTimestamp(String(dateStr), idx),
 price,
 volume,
 open: open ?? fallbackOpen,
 high: Math.max(wickHigh, fallbackOpen, fallbackClose),
 low: Math.min(wickLow, fallbackOpen, fallbackClose),
 close: close ?? fallbackClose,
 }
 })
 .filter((d: ParsedChartPoint) => d.price >= 0)
 .sort((a: ParsedChartPoint, b: ParsedChartPoint) => Number(a.chartTime) - Number(b.chartTime))

 const hasOhlcData = chartData.some(
 (d: ParsedChartPoint) => d.open != null && d.close != null && Number.isFinite(d.high) && Number.isFinite(d.low)
 )

 const prices = chartData.map((d: ParsedChartPoint) => d.price)
 const highs = chartData.map((d: ParsedChartPoint) => d.high)
 const lows = chartData.map((d: ParsedChartPoint) => d.low)
 const high = highs.length ? Math.max(...highs) : 0
 const low = lows.length ? Math.min(...lows) : 0
 const avg = prices.length ? prices.reduce((a: number, b: number) => a + b, 0) / prices.length : 0
 const volatility = high - low
 const first = prices[0] ?? 0
 const last = prices[prices.length - 1] ?? 0
 const trend = last > first ? 'naik' : last < first ? 'turun' : 'flat'
 const trendColor = trend === 'naik' ? 'text-accent-green' : trend === 'turun' ? 'text-accent-red' : 'text-dark-400'
 const gradientColor = trend === 'naik' ? '#10b981' : '#ef4444'
 const changePct = data?.percentage != null ? parseFloat(String(data.percentage)) : null
 const displayPrice = resolveDisplayPrice(data, last)
 const bandarInsight = analyzeBandarChart(marketDetectorData, chartData, selectedTimeframe)

 const iconUrl = stockIconUrl(symbol)
 const companyName = undefined

 if (!chartData.length) {
 return (
 <Card className="p-6">
 <p className="text-dark-400 text-center">Tidak ada data chart untuk {symbol}</p>
 </Card>
 )
 }

 return (
 <Card className="p-4 lg:p-5">
 <div className="mb-4 flex items-center justify-between flex-wrap gap-3">
 <ChartHeaderLeft
 symbol={symbol}
 iconUrl={iconUrl}
 companyName={companyName}
 selectedTimeframe={selectedTimeframe}
 chartDataLength={chartData.length}
 price={displayPrice}
 changePct={changePct}
 />
 <div className={`text-right font-semibold ${trendColor}`}>
 {trend === 'naik' ? 'UP' : trend === 'turun' ? 'DOWN' : 'FLAT'} {trend.toUpperCase()}
 </div>
 </div>

 <TimeframeButtons selectedTimeframe={selectedTimeframe} onSelect={setSelectedTimeframe} />
 <ChartModeButtons selectedMode={chartMode} onSelect={setChartMode} />

 <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-xs mb-3">
 <Stat label="HIGH" value={high.toFixed(2)} />
 <Stat label="LOW" value={low.toFixed(2)} />
 <Stat label="AVG" value={avg.toFixed(2)} />
 <Stat label="RANGE" value={volatility.toFixed(2)} />
 <Stat
 label="CHANGE"
 value={(last - first).toFixed(2)}
 className={last > first ? 'text-accent-green' : 'text-accent-red'}
 />
  <Stat
  label="BANDAR SCORE"
  value={bandarInsight ? `${bandarInsight.score}` : '-'}
  className={bandarInsight?.tone === 'bullish' ? 'text-accent-green' : bandarInsight?.tone === 'bearish' ? 'text-accent-red' : 'text-dark-300'}
  />
 </div>

  {bandarInsight && <BandarChartPanel insight={bandarInsight} />}

 <LightweightChartPanel
 symbol={symbol}
 selectedTimeframe={selectedTimeframe}
 chartMode={chartMode}
 chartData={chartData}
 gradientColor={gradientColor}
  brokerAvgPrice={bandarInsight?.brokerAvgPrice ?? null}
 useCandles={hasOhlcData && chartMode === 'candlestick'}
 />
 </Card>
 )
}

function LightweightChartPanel({
 symbol,
 selectedTimeframe,
 chartMode,
 chartData,
 gradientColor,
 brokerAvgPrice,
 useCandles,
}: {
 symbol: string
 selectedTimeframe: string
 chartMode: ChartMode
 chartData: ParsedChartPoint[]
 gradientColor: string
 brokerAvgPrice: number | null
 useCandles: boolean
}) {
 const containerRef = useRef<HTMLDivElement | null>(null)
 const chartRef = useRef<IChartApi | null>(null)
 const seriesRef = useRef<ISeriesApi<'Line'> | ISeriesApi<'Candlestick'> | null>(null)
 const brokerAvgSeriesRef = useRef<ISeriesApi<'Line'> | null>(null)
 const volumeSeriesRef = useRef<VolumeSeriesApi | null>(null)

 const lineData = useMemo(() => chartData.map((d) => ({ time: d.chartTime, value: d.price })), [chartData])
 const candleData = useMemo(
 () =>
 chartData.map((d) => ({
 time: d.chartTime,
 open: d.open ?? d.price,
 high: d.high,
 low: d.low,
 close: d.close ?? d.price,
 })),
 [chartData]
 )
 const volumeData = useMemo(
 () =>
 chartData.map((d) => ({
 time: d.chartTime,
 value: d.volume,
 color: (d.close ?? d.price) >= (d.open ?? d.price) ? VOLUME_UP_COLOR : VOLUME_DOWN_COLOR,
 })),
 [chartData]
 )

 useEffect(() => {
 const container = containerRef.current
 if (!container) return

 const chart = createChart(container, {
 width: container.clientWidth || 900,
 height: 340,
 layout: {
 background: { color: '#020617' },
 textColor: '#94a3b8',
 },
 grid: {
 vertLines: { color: '#1f2937' },
 horzLines: { color: '#1f2937' },
 },
 rightPriceScale: {
 visible: true,
 borderColor: '#334155',
 autoScale: true,
 scaleMargins: { top: 0.08, bottom: 0.08 },
 },
 timeScale: {
 borderColor: '#334155',
 rightOffset: 4,
 timeVisible: true,
 secondsVisible: false,
 tickMarkFormatter: (time: UTCTimestamp) => formatChartDateTime(time),
 },
 crosshair: {
 mode: CrosshairMode.Normal,
 vertLine: {
 color: '#64748b',
 style: LineStyle.Dashed,
 width: 1,
 labelBackgroundColor: '#0f172a',
 },
 horzLine: {
 color: '#475569',
 style: LineStyle.Dashed,
 width: 1,
 labelBackgroundColor: '#0f172a',
 },
 },
 handleScroll: {
 mouseWheel: true,
 pressedMouseMove: true,
 horzTouchDrag: true,
 vertTouchDrag: false,
 },
 handleScale: {
 mouseWheel: true,
 pinch: true,
 axisPressedMouseMove: true,
 },
 localization: {
 locale: 'id-ID',
 timeFormatter: (time: UTCTimestamp) => formatChartDateTime(time),
 },
 })

 chartRef.current = chart

 const resizeObserver = new ResizeObserver(([entry]) => {
 const width = Math.floor(entry.contentRect.width)
 if (width > 0) chart.applyOptions({ width })
 })
 resizeObserver.observe(container)

 return () => {
 resizeObserver.disconnect()
 chart.remove()
 chartRef.current = null
 seriesRef.current = null
 brokerAvgSeriesRef.current = null
 volumeSeriesRef.current = null
 }
 }, [selectedTimeframe])

 useEffect(() => {
 const chart = chartRef.current
 if (!chart) return

 if (seriesRef.current) {
 chart.removeSeries(seriesRef.current)
 seriesRef.current = null
 }

 if (volumeSeriesRef.current) {
 chart.removeSeries(volumeSeriesRef.current)
 volumeSeriesRef.current = null
 }

 if (brokerAvgSeriesRef.current) {
 chart.removeSeries(brokerAvgSeriesRef.current)
 brokerAvgSeriesRef.current = null
 }

 const legacyChart = chart as LegacySeriesChartApi

 const series = useCandles
 ? chart.addSeries(CandlestickSeries, {
 upColor: CANDLE_UP_COLOR,
 downColor: CANDLE_DOWN_COLOR,
 borderUpColor: CANDLE_UP_COLOR,
 borderDownColor: CANDLE_DOWN_COLOR,
 wickUpColor: CANDLE_UP_COLOR,
 wickDownColor: CANDLE_DOWN_COLOR,
 priceLineVisible: true,
 lastValueVisible: true,
 })
 : typeof legacyChart.addLineSeries === 'function'
 ? legacyChart.addLineSeries({
 color: gradientColor,
 lineWidth: 2,
 priceLineVisible: true,
 crosshairMarkerVisible: true,
 lastValueVisible: true,
 })
 : chart.addSeries(LineSeries, {
 color: gradientColor,
 lineWidth: 2,
 priceLineVisible: true,
 crosshairMarkerVisible: true,
 lastValueVisible: true,
 })

 if (useCandles) {
 series.setData(candleData)
 } else {
 series.setData(lineData)
 }

 const volumeSeries = chart.addSeries(HistogramSeries, {
 priceFormat: { type: 'volume' },
 priceScaleId: 'volume',
 priceLineVisible: false,
 lastValueVisible: false,
 })
 chart.priceScale('volume').applyOptions({
 scaleMargins: { top: 0.78, bottom: 0 },
 })
 volumeSeries.setData(volumeData)

 if (brokerAvgPrice && brokerAvgPrice > 0 && chartData.length > 0) {
 const brokerAvgSeries = chart.addSeries(LineSeries, {
 color: BROKER_AVG_COLOR,
 lineWidth: 2,
 lineStyle: LineStyle.Dashed,
 priceLineVisible: true,
 lastValueVisible: true,
 title: 'Broker AVG',
 })
 brokerAvgSeries.setData(chartData.map((point) => ({ time: point.chartTime, value: brokerAvgPrice })))
 brokerAvgSeriesRef.current = brokerAvgSeries
 }

 seriesRef.current = series
 volumeSeriesRef.current = volumeSeries
 chart.timeScale().fitContent()
 }, [useCandles, lineData, candleData, volumeData, gradientColor, brokerAvgPrice, chartData])

 return (
 <div
 ref={containerRef}
 data-testid="stock-chart-canvas"
 data-symbol={symbol}
 data-mode={chartMode}
 className="h-[340px] w-full rounded-lg border border-dark-800 bg-dark-950/40"
 />
 )
}

function Stat({ label, value, className }: { label: string; value: string; className?: string }) {
 return (
 <div className="bg-dark-800 rounded p-2">
 <p className="text-dark-400">{label}</p>
 <p className={`font-bold text-dark-100 ${className || ''}`}>{value}</p>
 </div>
 )
}

function compactCurrency(value: number): string {
 const abs = Math.abs(value)
 if (abs >= 1_000_000_000_000) return `${(value / 1_000_000_000_000).toFixed(1)}T`
 if (abs >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(1)}B`
 if (abs >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`
 return value.toLocaleString('id-ID')
}

function ReversalPanel({ signal }: { signal: ReversalSignal }) {
 const toneClass =
 signal.tone === 'bullish'
 ? 'border-accent-green/30 bg-accent-green/10 text-accent-green'
 : signal.tone === 'bearish'
 ? 'border-accent-red/30 bg-accent-red/10 text-accent-red'
 : 'border-amber-500/30 bg-amber-500/10 text-amber-300'
 const reasons = signal.reasons.length ? signal.reasons : ['Belum ada kombinasi breakout, volume, dan broker net yang cukup kuat.']

 return (
 <div className={`mt-4 rounded-xl border p-4 ${toneClass}`}>
 <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
 <div>
 <p className="text-xs font-black uppercase tracking-[0.22em]">Reversal Detector</p>
 <h5 className="mt-1 text-lg font-black">{signal.label}</h5>
 <p className="mt-1 text-xs opacity-80">
 Struktur: {signal.structure.toUpperCase()} | Volume: {signal.volumeRatio.toFixed(2)}x rata-rata
 </p>
 </div>
 <div className="rounded-lg border border-current/30 px-3 py-2 text-center">
 <p className="text-xs font-bold uppercase tracking-wider">Rev Score</p>
 <p className="text-2xl font-black">{signal.score}</p>
 </div>
 </div>
 <div className="mt-3 grid gap-2 text-xs md:grid-cols-2">
 <Stat label="EMA 20" value={signal.ema20 ? signal.ema20.toFixed(2) : '-'} />
 <Stat label="EMA 50" value={signal.ema50 ? signal.ema50.toFixed(2) : '-'} />
 </div>
 <ul className="mt-3 space-y-1 text-xs leading-relaxed opacity-90">
 {reasons.map((reason) => (
 <li key={reason}>- {reason}</li>
 ))}
 </ul>
 </div>
 )
}

function BandarChartPanel({ insight }: { insight: BandarChartInsight }) {
 const toneClass =
 insight.tone === 'bullish'
 ? 'border-accent-green/30 bg-accent-green/10 text-accent-green'
 : insight.tone === 'bearish'
 ? 'border-accent-red/30 bg-accent-red/10 text-accent-red'
 : 'border-dark-700 bg-dark-800 text-dark-300'

 return (
 <div className="mb-4 rounded-xl border border-dark-800 bg-dark-950/50 p-4">
 <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
 <div>
 <p className="text-xs font-bold uppercase tracking-[0.24em] text-amber-400">
 Broker AVG Line + Acc/Dist ({insight.timeframe.toUpperCase()})
 </p>
 <h4 className="mt-1 text-lg font-black text-dark-100">{insight.verdict}</h4>
 <p className="mt-1 text-sm leading-relaxed text-dark-400">{insight.explanation}</p>
 </div>
 <div className={`rounded-lg border px-3 py-2 text-center ${toneClass}`}>
 <p className="text-xs font-bold uppercase tracking-wider">Score</p>
 <p className="text-2xl font-black">{insight.score}</p>
 </div>
 </div>

 <div className="mt-4 grid grid-cols-2 gap-2 text-xs md:grid-cols-4">
 <Stat
 label={insight.netSide === 'sell' ? 'NET AVG SELL' : insight.netSide === 'buy' ? 'NET AVG BUY' : 'NET AVG'}
 value={insight.netAvgPrice ? insight.netAvgPrice.toFixed(2) : '-'}
 className={insight.netSide === 'sell' ? 'text-accent-red' : insight.netSide === 'buy' ? 'text-accent-green' : 'text-dark-300'}
 />
 <Stat label="NET SIDE" value={insight.netSide.toUpperCase()} className={insight.netSide === 'sell' ? 'text-accent-red' : insight.netSide === 'buy' ? 'text-accent-green' : 'text-dark-300'} />
 <Stat label="SMART NET" value={compactCurrency(insight.smartMoneyNet)} className={insight.smartMoneyNet >= 0 ? 'text-accent-green' : 'text-accent-red'} />
 <Stat label="RETAIL NET" value={compactCurrency(insight.retailNet)} className={insight.retailNet >= 0 ? 'text-accent-green' : 'text-accent-red'} />
 </div>

 <ReversalPanel signal={insight.reversal} />

 {insight.netBrokers.length > 0 && (
 <div className="mt-4">
 <p className="mb-2 text-xs font-bold uppercase tracking-wider text-dark-400">
 Broker pembentuk {insight.netSide === 'sell' ? 'NET AVG SELL' : 'NET AVG BUY'}
 </p>
 <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
 {insight.netBrokers.map((broker) => {
 const tier = getBrokerTierInfo(broker.code)
 return (
 <div key={broker.code} className="rounded-lg border border-dark-800 bg-dark-900/70 p-3 text-xs">
 <div className="flex items-center justify-between gap-2">
 <span className="text-sm font-black text-dark-100">{broker.code}</span>
 <span className="rounded-full bg-dark-800 px-2 py-0.5 text-[10px] font-bold uppercase text-dark-300">
 T{tier.tier}
 </span>
 </div>
 <p className="mt-1 truncate text-dark-400">{tier.name} - {tier.description}</p>
 <div className="mt-2 grid grid-cols-2 gap-2">
 <div>
 <p className="text-dark-500">{broker.side === 'sell' ? 'AVG Sell' : 'AVG Buy'}</p>
 <p className={`font-bold ${broker.side === 'sell' ? 'text-accent-red' : 'text-accent-green'}`}>{broker.avgPrice.toFixed(2)}</p>
 </div>
 <div>
 <p className="text-dark-500">Net Value</p>
 <p className={`font-bold ${broker.netValue < 0 ? 'text-accent-red' : 'text-accent-green'}`}>{compactCurrency(broker.netValue)}</p>
 </div>
 </div>
 </div>
 )
 })}
 </div>
 </div>
 )}
 </div>
 )
}

function ChartHeaderLeft({
 symbol,
 iconUrl,
 companyName,
 selectedTimeframe,
 chartDataLength,
 price,
 changePct,
}: {
 symbol: string
 iconUrl: string
 companyName?: string
 selectedTimeframe: string
 chartDataLength: number
 price: number | null
 changePct: number | null
}) {
 return (
 <div className="flex items-start gap-3 min-w-0">
 <img src={iconUrl} alt="" className="w-10 h-10 rounded-full bg-dark-800 flex-shrink-0 object-cover" />
 <div className="min-w-0">
 <h3 className="text-lg font-semibold text-dark-100">{symbol}</h3>
 {companyName && <p className="text-xs text-dark-400 truncate">{companyName}</p>}
 <p className="text-xs text-dark-500 mt-1">
 Timeframe: {selectedTimeframe.toUpperCase()} | {chartDataLength} titik data
 </p>
 {price != null && !isNaN(price) && (
 <p className="text-sm text-dark-300 mt-1">
 Harga: {price.toLocaleString('id-ID')}
 {changePct != null && (
 <span className={changePct >= 0 ? ' text-accent-green' : ' text-accent-red'}>
 {' '}
 ({changePct >= 0 ? '+' : ''}
 {changePct.toFixed(2)}%)
 </span>
 )}
 </p>
 )}
 </div>
 </div>
 )
}

function TimeframeButtons({
 selectedTimeframe,
 onSelect,
}: {
 selectedTimeframe: string
 onSelect: (value: string) => void
}) {
 return (
 <div className="mb-4 flex flex-wrap gap-2">
 {TIMEFRAMES.map((tf) => (
 <button
 key={tf.value}
 onClick={() => onSelect(tf.value)}
 className={`px-3 py-1.5 rounded text-sm font-medium transition-all ${selectedTimeframe === tf.value
 ? 'bg-accent-blue text-white'
 : 'bg-dark-800 text-dark-300 hover:bg-dark-700'
 }`}
 >
 {tf.label}
 </button>
 ))}
 </div>
 )
}

function ChartModeButtons({
 selectedMode,
 onSelect,
}: {
 selectedMode: ChartMode
 onSelect: (value: ChartMode) => void
}) {
 const modes: Array<{ value: ChartMode; label: string }> = [
 { value: 'line', label: 'Line' },
 { value: 'candlestick', label: 'Candlestick' },
 ]

 return (
 <div className="mb-4 flex flex-wrap gap-2">
 {modes.map((mode) => (
 <button
 key={mode.value}
 type="button"
 onClick={() => onSelect(mode.value)}
 aria-pressed={selectedMode === mode.value}
 className={`px-3 py-1.5 rounded text-sm font-medium transition-all ${selectedMode === mode.value ? 'bg-accent-blue text-white' : 'bg-dark-800 text-dark-300 hover:bg-dark-700'
 }`}
 >
 {mode.label}
 </button>
 ))}
 </div>
 )
}
