import { useOrderbook, useStockChart } from '@/hooks/use-queries'
import { formatBigNumber } from '@/utils/formatters'
import { AreaChart, Area, ResponsiveContainer } from 'recharts'

function accdistColor(val: string): string {
    if (!val) return 'text-dark-400'
    const v = val.toLowerCase()
    if (v.includes('acc')) return 'text-accent-green'
    if (v.includes('dist')) return 'text-accent-red'
    return 'text-dark-400'
}

export function ScreenerRow({ row }: { row: any }) {
    // Fetch live market data — matikan auto-refresh agar tidak ada N×polling per baris
    const { data: obData } = useOrderbook(row.code, { refetchInterval: false })
    const { data: chartRaw } = useStockChart(row.code, '1d')

    // ---- Harga & perubahan dari orderbook ----
    const ob = obData?.data || obData || {}
    const price = parseFloat(String(ob.lastprice ?? ob.close ?? 0)) || 0
    const changePct = parseFloat(String(ob.percentage_change ?? 0))
    const isPositive = changePct >= 0
    const priceText = price > 0 ? price.toLocaleString('id-ID') : '—'
    const changePctText = price > 0
        ? `${isPositive ? '+' : ''}${changePct.toFixed(2)}%`
        : '—'

    // ---- Data sparkline dari stock-chart ----
    const rawPrices = Array.isArray(chartRaw?.prices)
        ? chartRaw.prices
        : Array.isArray(chartRaw)
            ? chartRaw
            : Array.isArray(chartRaw?.data?.prices)
                ? chartRaw.data.prices
                : []

    const sparkData = rawPrices
        .map((p: any) => ({ v: parseFloat(p.value || p.close || '0') || 0 }))
        .filter((d: any) => d.v > 0)
        .slice(-30) // max 30 titik data intraday

    // Warna sparkline dari % change (konsisten dengan kolom perubahan)
    const sparkColor = price > 0
        ? (isPositive ? '#10b981' : '#ef4444')
        : '#6b7280'

    // ---- Warna NET VALUE & NET LOT ----
    const netValuePos = (row.net_value || 0) >= 0
    const netLotPos = (row.net_lot || 0) >= 0

    return (
        <tr className="border-b border-dark-800 hover:bg-dark-800/60 transition-colors">
            {/* KODE */}
            <td className="px-4 py-2.5 font-bold text-accent-green text-sm tracking-wide">
                {row.code}
            </td>

            {/* HARGA */}
            <td className="px-4 py-2.5 text-right text-dark-100 tabular-nums text-sm font-medium">
                {priceText}
            </td>

            {/* PERUBAHAN % */}
            <td className={`px-4 py-2.5 text-right font-semibold tabular-nums text-sm ${isPositive ? 'text-accent-green' : 'text-accent-red'}`}>
                {changePctText}
            </td>

            {/* NET VALUE */}
            <td className={`px-4 py-2.5 text-right font-medium tabular-nums text-sm ${netValuePos ? 'text-accent-green' : 'text-accent-red'}`}>
                {netValuePos ? '+' : ''}{formatBigNumber(row.net_value || 0)}
            </td>

            {/* NET LOT */}
            <td className={`px-4 py-2.5 text-right tabular-nums text-sm ${netLotPos ? 'text-accent-green' : 'text-accent-red'}`}>
                {netLotPos ? '+' : ''}{formatBigNumber(row.net_lot || 0)}
            </td>

            {/* FREK BELI */}
            <td className="px-4 py-2.5 text-right text-dark-300 tabular-nums text-sm">
                {(row.buy_freq || 0).toLocaleString('id-ID')}
            </td>

            {/* ACC / DIST */}
            <td className={`px-4 py-2.5 text-center font-bold text-xs tracking-wide ${accdistColor(row.accdist)}`}>
                {row.accdist || '—'}
            </td>

            {/* CHART SPARKLINE */}
            <td className="px-2 py-1.5">
                <div style={{ width: 88, height: 36 }}>
                    {sparkData.length > 2 ? (
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart
                                data={sparkData}
                                margin={{ top: 2, right: 2, left: 2, bottom: 2 }}
                            >
                                <defs>
                                    <linearGradient id={`sg-${row.code}`} x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor={sparkColor} stopOpacity={0.35} />
                                        <stop offset="95%" stopColor={sparkColor} stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <Area
                                    type="monotone"
                                    dataKey="v"
                                    stroke={sparkColor}
                                    strokeWidth={1.5}
                                    fill={`url(#sg-${row.code})`}
                                    dot={false}
                                    isAnimationActive={false}
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="w-full h-full flex items-center justify-center">
                            <div className="w-full h-px bg-dark-700 rounded" />
                        </div>
                    )}
                </div>
            </td>
        </tr>
    )
}
