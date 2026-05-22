import { Card, ErrorState, LoadingSpinner } from '@/components'
import { useOrderbook } from '@/hooks/use-queries'
import { formatBigNumber } from '@/utils/formatters'

function toNumber(value: unknown): number {
    const parsed = typeof value === 'string' ? Number.parseFloat(value) : Number(value)
    return Number.isFinite(parsed) ? parsed : 0
}

function pickPositive(...values: unknown[]): number {
    for (const value of values) {
        const num = toNumber(value)
        if (num > 0) return num
    }
    return 0
}

export default function BandarAvgDiscountCard() {
    const { data, isLoading, error, refetch } = useOrderbook('IHSG')

    if (isLoading) return <LoadingSpinner />
    if (error) {
        return <ErrorState title="Error" message="Failed to load bandar avg alert" onRetry={() => refetch()} />
    }

    const ihsg = data?.data || data || {}
    const price = pickPositive(
        ihsg.lastprice,
        ihsg.last_price,
        ihsg.close,
        ihsg.previous,
        ihsg.prev_close,
        ihsg.previous_close,
        ihsg.open
    )

    const proxyAvg = pickPositive(
        ihsg.vwap,
        ihsg.volume_weighted_avg_price,
        ihsg.average,
        ihsg.avg,
        ihsg.previous,
        ihsg.prev_close,
        ihsg.previous_close,
        ihsg.open,
        price
    )

    if (price <= 0 || proxyAvg <= 0) {
        return (
            <Card className="p-5">
                <p className="text-sm text-dark-400">Bandar AVG Discount Alert tidak tersedia.</p>
            </Card>
        )
    }

    const spread = price - proxyAvg
    const spreadPct = proxyAvg > 0 ? (Math.abs(spread) / proxyAvg) * 100 : 0
    const isDiscount = price < proxyAvg
    const toneClass = isDiscount ? 'text-accent-green' : 'text-accent-red'

    return (
        <Card className="p-5">
            <div className="flex items-start justify-between gap-4">
                <div>
                    <p className="text-sm text-dark-400">Bandar AVG Discount Alert</p>
                    <p className={`text-2xl font-bold mt-1 ${toneClass}`}>
                        {isDiscount ? 'Diskon' : 'Premium'} {spreadPct.toFixed(2)}%
                    </p>
                    <p className="text-xs text-dark-400 mt-1">Proxy AVG dari data orderbook IHSG</p>
                </div>

                <div className="text-right">
                    <p className="text-xs text-dark-500">Proxy AVG</p>
                    <p className="text-sm font-semibold text-dark-100">{formatBigNumber(proxyAvg)}</p>
                </div>
            </div>

            <div className="grid grid-cols-3 gap-2 mt-4 text-xs">
                <div className="bg-dark-800 rounded px-2 py-2">
                    <p className="text-dark-500">Last Price</p>
                    <p className="font-semibold text-dark-100">{formatBigNumber(price)}</p>
                </div>
                <div className="bg-dark-800 rounded px-2 py-2">
                    <p className="text-dark-500">AVG Gap</p>
                    <p className={`font-semibold ${toneClass}`}>
                        {spread >= 0 ? '+' : ''}
                        {formatBigNumber(spread)}
                    </p>
                </div>
                <div className="bg-dark-800 rounded px-2 py-2">
                    <p className="text-dark-500">Signal</p>
                    <p className={`font-semibold ${toneClass}`}>{isDiscount ? 'Accumulation Zone' : 'Distribution Risk'}</p>
                </div>
            </div>
        </Card>
    )
}