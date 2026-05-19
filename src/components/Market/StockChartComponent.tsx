import { useState } from 'react'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts'
import { useStockChart, useOrderbook } from '@/hooks/use-queries'
import { Card, LoadingSpinner, ErrorState } from '@/components'

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

interface StockChartComponentProps {
    symbol: string
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

export default function StockChartComponent({ symbol }: StockChartComponentProps) {
    const [selectedTimeframe, setSelectedTimeframe] = useState('1d')
    const { data, isLoading, error, refetch } = useStockChart(symbol, selectedTimeframe)
    const { data: orderbookData } = useOrderbook(symbol)

    if (isLoading) return <LoadingSpinner />
    if (error) {
        return (
            <ErrorState
                title="Gagal memuat chart"
                message={`Tidak dapat memuat data chart untuk ${symbol}`}
                onRetry={() => refetch()}
            />
        )
    }

    const rawData = Array.isArray(data?.prices)
        ? data.prices
        : Array.isArray(data)
          ? data
          : Array.isArray(data?.data?.prices)
            ? data.data.prices
            : Array.isArray(data?.data)
              ? data.data
              : []

    const chartData = rawData
        .map((item: any, idx: number) => {
            const price = parseFloat(item.value || item.close || item.price || '0') || 0
            const dateStr = item.formatted_date || item.date || ''

            let time = ''
            if (dateStr && dateStr !== '0') {
                try {
                    const date = new Date(dateStr)
                    if (!isNaN(date.getTime())) {
                        time =
                            selectedTimeframe === '1d'
                                ? date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
                                : date.toLocaleDateString('id-ID', { day: '2-digit', month: 'short' })
                    }
                } catch {
                    // ignore
                }
            }

            time = time || item.xlabel || `${idx}`

            return { time, price }
        })
        .filter((d: { time: string; price: number }) => d.price >= 0)

    const prices = chartData.map((d: { time: string; price: number }) => d.price)
    const high = prices.length ? Math.max(...prices) : 0
    const low = prices.length ? Math.min(...prices) : 0
    const avg = prices.length ? prices.reduce((a: number, b: number) => a + b, 0) / prices.length : 0
    const volatility = high - low
    const first = prices[0] ?? 0
    const last = prices[prices.length - 1] ?? 0
    const trend = last > first ? 'naik' : last < first ? 'turun' : 'flat'
    const trendColor = trend === 'naik' ? 'text-accent-green' : trend === 'turun' ? 'text-accent-red' : 'text-dark-400'
    const gradientColor = trend === 'naik' ? '#10b981' : '#ef4444'
    const changePct = data?.percentage != null ? parseFloat(String(data.percentage)) : null
    const displayPrice = resolveDisplayPrice(data, last)

    const ob = orderbookData?.data || orderbookData || {}
    const iconUrl = stockIconUrl(symbol, ob.icon_url)
    const companyName = ob.name as string | undefined

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
                    {trend === 'naik' ? '📈' : trend === 'turun' ? '📉' : '➡️'} {trend.toUpperCase()}
                </div>
            </div>

            <TimeframeButtons
                selectedTimeframe={selectedTimeframe}
                onSelect={setSelectedTimeframe}
            />

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

            <ResponsiveContainer width="100%" height={400}>
                <AreaChart data={chartData}>
                    <defs>
                        <linearGradient id={`stockGradient-${symbol}`} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={gradientColor} stopOpacity={0.3} />
                            <stop offset="95%" stopColor={gradientColor} stopOpacity={0} />
                        </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" vertical={false} />
                    <XAxis
                        dataKey="time"
                        stroke="#6b7280"
                        style={{ fontSize: '11px' }}
                        interval="preserveStartEnd"
                    />
                    <YAxis
                        stroke="#6b7280"
                        style={{ fontSize: '11px' }}
                        domain={['dataMin - 50', 'dataMax + 50']}
                        width={60}
                    />
                    <ReferenceLine y={high} stroke="#10b981" strokeDasharray="5 5" opacity={0.15} strokeWidth={1} />
                    <ReferenceLine y={low} stroke="#ef4444" strokeDasharray="5 5" opacity={0.15} strokeWidth={1} />
                    <ReferenceLine y={avg} stroke="#f59e0b" strokeDasharray="5 5" opacity={0.15} strokeWidth={1} />
                    <Tooltip
                        contentStyle={{
                            backgroundColor: '#0f172a',
                            border: '1px solid #1e293b',
                            borderRadius: '8px',
                        }}
                        labelStyle={{ color: '#e5e7eb' }}
                        formatter={(value: number) => [value.toFixed(2), 'Harga']}
                    />
                    <Area
                        type="monotone"
                        dataKey="price"
                        stroke={gradientColor}
                        strokeWidth={2}
                        fill={`url(#stockGradient-${symbol})`}
                        dot={false}
                        isAnimationActive
                    />
                </AreaChart>
            </ResponsiveContainer>
        </Card>
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
            <img
                src={iconUrl}
                alt=""
                className="w-10 h-10 rounded-full bg-dark-800 flex-shrink-0 object-cover"
            />
            <div className="min-w-0">
                <h3 className="text-lg font-semibold text-dark-100">{symbol}</h3>
                {companyName && (
                    <p className="text-xs text-dark-400 truncate">{companyName}</p>
                )}
                <p className="text-xs text-dark-500 mt-1">
                    Timeframe: {selectedTimeframe.toUpperCase()} • {chartDataLength} titik data
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
                    className={`px-3 py-1.5 rounded text-sm font-medium transition-all ${
                        selectedTimeframe === tf.value
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
