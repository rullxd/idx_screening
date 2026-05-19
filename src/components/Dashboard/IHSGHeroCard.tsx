import { useIHSGChart } from '@/hooks/use-queries'
import { formatBigNumber } from '@/services/api'
import { Card, LoadingSpinner, ErrorState } from '@/components'

export default function IHSGHeroCard() {
    const { data, isLoading, error, refetch } = useIHSGChart()

    if (isLoading) return <LoadingSpinner />
    if (error) return <ErrorState title="Error" message="Failed to load IHSG data" onRetry={() => refetch()} />
    if (!data) return null

    // IHSG API returns fields directly in data
    const ihsg = data || {}
    const price = parseFloat(ihsg.previous || ihsg.close || ihsg.price || ihsg.lastprice || '0') || 0
    const change = parseFloat(ihsg.change) || 0
    const changePct = parseFloat(ihsg.percentage || ihsg.change_percent || ihsg.change_pct || '0') || 0

    // Calculate high/low/volatility from prices array
    const prices = (ihsg.prices || []).map((p: any) => parseFloat(p.value || '0')).filter((v: number) => v > 0)
    const high = prices.length > 0 ? Math.max(...prices) : 0
    const low = prices.length > 0 ? Math.min(...prices) : 0
    const volatility = high - low

    const isPositive = changePct >= 0
    const changeClass = isPositive ? 'text-accent-green' : 'text-accent-red'
    const trend = isPositive ? '📈' : changePct < 0 ? '📉' : '➡️'

    return (
        <Card className="p-8 bg-gradient-to-r from-dark-900 to-dark-800 border border-dark-700">
            <div className="flex items-end justify-between">
                <div className="flex-1">
                    <div className="text-sm text-dark-400 uppercase tracking-wide mb-2">📊 IHSG Index</div>
                    <div className="flex items-baseline gap-3 mb-3">
                        <div className="text-5xl font-bold text-dark-100">
                            {formatBigNumber(price)}
                        </div>
                        <div className="text-3xl">{trend}</div>
                    </div>
                    <div className={`text-lg font-semibold mb-3 ${changeClass}`}>
                        {isPositive ? '+' : ''}{formatBigNumber(change)} ({changePct >= 0 ? '+' : ''}{changePct.toFixed(2)}%)
                    </div>

                    {/* High/Low/Volatility Info */}
                    <div className="grid grid-cols-3 gap-3 text-xs mt-4 p-3 bg-dark-800 rounded">
                        <div>
                            <p className="text-dark-400">HIGH</p>
                            <p className="text-accent-green font-bold">{high.toFixed(0)}</p>
                        </div>
                        <div>
                            <p className="text-dark-400">LOW</p>
                            <p className="text-accent-red font-bold">{low.toFixed(0)}</p>
                        </div>
                        <div>
                            <p className="text-dark-400">RANGE</p>
                            <p className="text-accent-blue font-bold">{volatility.toFixed(2)}</p>
                        </div>
                    </div>
                </div>

                <div className="text-right text-dark-400 text-sm space-y-1 ml-6">
                    <p>🕐 {new Date().toLocaleTimeString('id-ID')}</p>
                    <p className="text-xs">Real-time data</p>
                    <p className="text-xs text-dark-500 mt-2">{prices.length} candles</p>
                </div>
            </div>
        </Card>
    )
}
