import { useEffect, useMemo, useRef, useState } from 'react'
import {
    CandlestickSeries,
    createChart,
    CrosshairMode,
    HistogramSeries,
    LineSeries,
    LineStyle,
    type IChartApi,
    type IPriceLine,
    type ISeriesApi,
    type UTCTimestamp,
} from 'lightweight-charts'
import { useStockChart, useStockChartbit } from '@/hooks/use-queries'
import { Card, ErrorState, LoadingSpinner } from '@/components'

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

export default function StockChartComponent({ symbol }: StockChartComponentProps) {
    const [selectedTimeframe, setSelectedTimeframe] = useState('1d')
    const [chartMode, setChartMode] = useState<ChartMode>('line')
    const { data, isLoading, error, refetch } = useStockChart(symbol, selectedTimeframe)
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
            const volume = toNumber(item.volume) ?? toNumber(item.vol) ?? toNumber(item.transaction_volume) ?? 0
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
        <Card className="p-6">
            <div className="mb-6 flex items-center justify-between flex-wrap gap-3">
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

            <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-xs mb-4">
                <Stat label="HIGH" value={high.toFixed(2)} />
                <Stat label="LOW" value={low.toFixed(2)} />
                <Stat label="AVG" value={avg.toFixed(2)} />
                <Stat label="RANGE" value={volatility.toFixed(2)} />
                <Stat
                    label="CHANGE"
                    value={(last - first).toFixed(2)}
                    className={last > first ? 'text-accent-green' : 'text-accent-red'}
                />
            </div>

            <LightweightChartPanel
                symbol={symbol}
                selectedTimeframe={selectedTimeframe}
                chartMode={chartMode}
                chartData={chartData}
                gradientColor={gradientColor}
                useCandles={hasOhlcData && chartMode === 'candlestick'}
                high={high}
                low={low}
                avg={avg}
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
    useCandles,
    high,
    low,
    avg,
}: {
    symbol: string
    selectedTimeframe: string
    chartMode: ChartMode
    chartData: ParsedChartPoint[]
    gradientColor: string
    useCandles: boolean
    high: number
    low: number
    avg: number
}) {
    const containerRef = useRef<HTMLDivElement | null>(null)
    const chartRef = useRef<IChartApi | null>(null)
    const seriesRef = useRef<ISeriesApi<'Line'> | ISeriesApi<'Candlestick'> | null>(null)
    const volumeSeriesRef = useRef<VolumeSeriesApi | null>(null)
    const markerLinesRef = useRef<IPriceLine[]>([])

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
                color: (d.close ?? d.price) >= (d.open ?? d.price) ? 'rgba(16, 185, 129, 0.35)' : 'rgba(239, 68, 68, 0.35)',
            })),
        [chartData]
    )

    useEffect(() => {
        const container = containerRef.current
        if (!container) return

        const chart = createChart(container, {
            width: container.clientWidth || 900,
            height: 400,
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

        return () => {
            chart.remove()
            chartRef.current = null
            seriesRef.current = null
            volumeSeriesRef.current = null
            markerLinesRef.current = []
        }
    }, [selectedTimeframe])

    useEffect(() => {
        const chart = chartRef.current
        if (!chart) return

        if (seriesRef.current) {
            chart.removeSeries(seriesRef.current)
            seriesRef.current = null
            markerLinesRef.current = []
        }

        if (volumeSeriesRef.current) {
            chart.removeSeries(volumeSeriesRef.current)
            volumeSeriesRef.current = null
        }

        const legacyChart = chart as LegacySeriesChartApi

        const series = useCandles
            ? chart.addSeries(CandlestickSeries, {
                upColor: '#10b981',
                downColor: '#ef4444',
                borderUpColor: '#10b981',
                borderDownColor: '#ef4444',
                wickUpColor: '#10b981',
                wickDownColor: '#ef4444',
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

        const createMarker = (price: number, color: string) =>
            series.createPriceLine({
                price,
                color,
                lineWidth: 1,
                lineStyle: LineStyle.Dashed,
                axisLabelVisible: false,
                title: '',
            })

        markerLinesRef.current = [createMarker(high, '#10b981'), createMarker(low, '#ef4444'), createMarker(avg, '#f59e0b')]

        seriesRef.current = series
        volumeSeriesRef.current = volumeSeries
        chart.timeScale().fitContent()
    }, [useCandles, lineData, candleData, volumeData, gradientColor, high, low, avg])

    return (
        <div
            ref={containerRef}
            data-testid="stock-chart-canvas"
            data-symbol={symbol}
            data-mode={chartMode}
            className="h-[400px] w-full rounded-lg border border-dark-800 bg-dark-950/40"
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
