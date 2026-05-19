import { useState } from 'react'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts'
import { useIHSGChart } from '@/hooks/use-queries'
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

export default function IHSGChartComponent() {
    const [selectedTimeframe, setSelectedTimeframe] = useState('1d')
    const { data, isLoading, error, refetch } = useIHSGChart(selectedTimeframe)

    if (isLoading) return <LoadingSpinner />
    if (error) return <ErrorState title="Error" message="Failed to load chart data" onRetry={() => refetch()} />

    // Extract data array - API returns metadata object with prices array
    const rawData = Array.isArray(data?.prices) ? data.prices : (Array.isArray(data) ? data : (Array.isArray(data?.data) ? data.data : []))

    // Transform to chart format - USE ALL DATA POINTS
    const chartData = rawData
        .map((item: any, idx: number) => {
            const price = parseFloat(item.value || item.close || item.price || '0') || 0
            const dateStr = item.formatted_date || item.date || ''

            let time = ''
            if (dateStr && dateStr !== '0') {
                try {
                    const date = new Date(dateStr)
                    if (!isNaN(date.getTime())) {
                        time = date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
                    }
                } catch (e) {
                    // Fallback
                }
            }

            time = time || item.xlabel || `${idx}`

            return { time, price }
        })
        .filter((d: { time: string; price: number }) => d.price >= 0)

    // Calculate statistics
    const prices = chartData.map((d: { time: string; price: number }) => d.price)
    const high = Math.max(...prices)
    const low = Math.min(...prices)
    const avg = prices.reduce((a: number, b: number) => a + b, 0) / prices.length
    const volatility = high - low
    const first = prices[0]
    const last = prices[prices.length - 1]
    const trend = last > first ? 'naik' : last < first ? 'turun' : 'flat'
    const trendColor = trend === 'naik' ? 'text-accent-green' : trend === 'turun' ? 'text-accent-red' : 'text-dark-400'
    const gradientColor = trend === 'naik' ? '#10b981' : '#ef4444'

    if (!chartData || chartData.length === 0) {
        const getKeys = (obj: any) => {
            try {
                return Object.keys(obj || {}).slice(0, 5).join(',');
            } catch {
                return 'err';
            }
        };
        const debugInfo = `data:${data ? `{${getKeys(data)}}` : 'null'} hasData.data:${!!data?.data} len:${Array.isArray(data) ? (data as any[]).length : 'N/A'}`
        return (
            <Card className="p-6">
                <p className="text-dark-400 text-center text-xs">Tidak ada data ({debugInfo})</p>
            </Card>
        )
    }

    return (
        <Card className="p-6">
            <div className="mb-6">
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <h3 className="text-lg font-semibold text-dark-100">📈 IHSG Chart</h3>
                        <p className="text-xs text-dark-500 mt-1">Timeframe: {selectedTimeframe.toUpperCase()} • {chartData.length} data points</p>
                    </div>
                    <div className={`text-right font-semibold ${trendColor}`}>
                        {trend === 'naik' ? '📈' : trend === 'turun' ? '📉' : '➡️'} {trend.toUpperCase()}
                    </div>
                </div>

                {/* Timeframe Selector */}
                <div className="mb-4 flex flex-wrap gap-2">
                    {TIMEFRAMES.map((tf) => (
                        <button
                            key={tf.value}
                            onClick={() => setSelectedTimeframe(tf.value)}
                            className={`px-3 py-1.5 rounded text-sm font-medium transition-all ${selectedTimeframe === tf.value
                                    ? 'bg-accent-blue text-white'
                                    : 'bg-dark-800 text-dark-300 hover:bg-dark-700'
                                }`}
                        >
                            {tf.label}
                        </button>
                    ))}
                </div>

                {/* Statistics Summary */}
                <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-xs">
                    <div className="bg-dark-800 rounded p-2">
                        <p className="text-dark-400">HIGH</p>
                        <p className="text-dark-100 font-bold">{high.toFixed(2)}</p>
                    </div>
                    <div className="bg-dark-800 rounded p-2">
                        <p className="text-dark-400">LOW</p>
                        <p className="text-dark-100 font-bold">{low.toFixed(2)}</p>
                    </div>
                    <div className="bg-dark-800 rounded p-2">
                        <p className="text-dark-400">AVG</p>
                        <p className="text-dark-100 font-bold">{avg.toFixed(2)}</p>
                    </div>
                    <div className="bg-dark-800 rounded p-2">
                        <p className="text-dark-400">RANGE</p>
                        <p className="text-dark-100 font-bold">{volatility.toFixed(2)}</p>
                    </div>
                    <div className="bg-dark-800 rounded p-2">
                        <p className="text-dark-400">CHANGE</p>
                        <p className={`font-bold ${last > first ? 'text-accent-green' : 'text-accent-red'}`}>
                            {(last - first).toFixed(2)}
                        </p>
                    </div>
                </div>
            </div>

            <ResponsiveContainer width="100%" height={350}>
                <AreaChart data={chartData}>
                    <defs>
                        <linearGradient id="ihsgGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={gradientColor} stopOpacity={0.3} />
                            <stop offset="95%" stopColor={gradientColor} stopOpacity={0} />
                        </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" vertical={false} />
                    <XAxis dataKey="time" stroke="#6b7280" style={{ fontSize: '11px' }} interval="preserveStartEnd" />
                    <YAxis stroke="#6b7280" style={{ fontSize: '11px' }} domain={['dataMin - 50', 'dataMax + 50']} width={60} />

                    {/* Reference lines for high/low/avg - very subtle */}
                    <ReferenceLine y={high} stroke="#10b981" strokeDasharray="5 5" opacity={0.15} strokeWidth={1} />
                    <ReferenceLine y={low} stroke="#ef4444" strokeDasharray="5 5" opacity={0.15} strokeWidth={1} />
                    <ReferenceLine y={avg} stroke="#f59e0b" strokeDasharray="5 5" opacity={0.15} strokeWidth={1} />

                    <Tooltip
                        contentStyle={{
                            backgroundColor: '#0f172a',
                            border: '1px solid #1e293b',
                            borderRadius: '8px'
                        }}
                        labelStyle={{ color: '#e5e7eb' }}
                        formatter={(value: number) => [value.toFixed(2), 'Price']}
                    />
                    <Area
                        type="monotone"
                        dataKey="price"
                        stroke={gradientColor}
                        strokeWidth={2}
                        fill="url(#ihsgGradient)"
                        dot={false}
                        isAnimationActive={true}
                    />
                </AreaChart>
            </ResponsiveContainer>
        </Card>
    )
}
