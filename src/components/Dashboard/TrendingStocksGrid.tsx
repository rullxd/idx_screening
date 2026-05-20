import { useTrendingStocks } from '@/hooks/use-queries'
import { formatBigNumber, formatCurrency } from '@/utils/formatters'
import { Card, LoadingSpinner, ErrorState } from '@/components'

export default function TrendingStocksGrid() {
    const { data, isLoading, error, refetch } = useTrendingStocks()

    if (isLoading) return <LoadingSpinner />
    if (error) return <ErrorState title="Error" message="Failed to load trending stocks" onRetry={() => refetch()} />

    const trending = Array.isArray(data)
        ? data
        : (data?.data?.trending || data?.trending || data?.data || [])

    // Calculate stats
    const positive = trending.filter((s: any) => parseFloat(s.percent || s.change_percent || 0) >= 0).length
    const negative = trending.filter((s: any) => parseFloat(s.percent || s.change_percent || 0) < 0).length
    const avgChange = trending.reduce((sum: number, s: any) => sum + parseFloat(s.percent || s.change_percent || 0), 0) / trending.length

    if (!trending || trending.length === 0) {
        return (
            <Card className="p-6">
                <p className="text-dark-400 text-center">Tidak ada trending stocks</p>
            </Card>
        )
    }

    return (
        <div>
            <div className="mb-4 flex items-end justify-between">
                <h3 className="text-lg font-semibold text-dark-100">
                    🔥 Trending Hari Ini
                    <span className="ml-2 text-sm text-dark-400">({trending.length} saham)</span>
                </h3>
                {/* Quick Stats */}
                <div className="flex gap-2 text-xs">
                    <div className="px-2 py-1 bg-dark-800 rounded">
                        <span className="text-accent-green">🟢 {positive}</span>
                    </div>
                    <div className="px-2 py-1 bg-dark-800 rounded">
                        <span className="text-accent-red">🔴 {negative}</span>
                    </div>
                    <div className="px-2 py-1 bg-dark-800 rounded">
                        <span className={avgChange >= 0 ? 'text-accent-green' : 'text-accent-red'}>avg {avgChange.toFixed(2)}%</span>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {trending.map((stock: any, idx: number) => {
                    // Map API fields to component fields
                    const code = stock.symbol || stock.code
                    const price = parseFloat(stock.last) || parseFloat(stock.price) || 0
                    const change = parseFloat(stock.change) || 0
                    const changePct = parseFloat(stock.percent || stock.change_percent || 0)
                    const isPositive = changePct >= 0

                    return (
                        <Card key={`${code}-${idx}`} className="p-4 hover:border-accent-green transition-all duration-200">
                            <div className="mb-3">
                                <div className="font-bold text-dark-100 text-lg">{code}</div>
                                <div className="text-xs text-dark-400">{stock.name}</div>
                            </div>

                            <div className="mb-3">
                                <div className="text-2xl font-bold text-dark-100">
                                    {formatCurrency(price)}
                                </div>
                                <div className={`text-sm font-semibold ${isPositive ? 'text-accent-green' : 'text-accent-red'}`}>
                                    {isPositive ? '↑' : '↓'} {formatBigNumber(Math.abs(change))} ({changePct >= 0 ? '+' : ''}{changePct.toFixed(2)}%)
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-2 text-xs">
                                <div className="p-2 bg-dark-800 rounded">
                                    <p className="text-dark-500">Volume</p>
                                    <p className="font-semibold text-dark-100">{formatBigNumber(stock.volume || 0)}</p>
                                </div>
                                <div className="p-2 bg-dark-800 rounded">
                                    <p className="text-dark-500">Value</p>
                                    <p className="font-semibold text-dark-100">{formatBigNumber(stock.value || 0)}</p>
                                </div>
                            </div>
                        </Card>
                    )
                })}
            </div>
        </div>
    )
}
