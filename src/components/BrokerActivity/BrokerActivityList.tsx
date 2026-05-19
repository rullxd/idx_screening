import { useBrokerRanking } from '@/hooks/use-queries'
import { formatBigNumber, formatCurrency } from '@/services/api'
import { Card, LoadingSpinner, ErrorState } from '@/components'

export default function BrokerActivityList() {
    const { data, isLoading, error, refetch } = useBrokerRanking()

    if (isLoading) return <LoadingSpinner />
    if (error) return <ErrorState title="Error" message="Failed to load broker activity" onRetry={() => refetch()} />

    const brokers = Array.isArray(data)
        ? data
        : (data?.data?.list || data?.list || data?.data || [])

    // Top buyers and sellers
    const topBuyers = [...brokers]
        .sort((a, b) => (b.buy_value || 0) - (a.buy_value || 0))
        .slice(0, 10)

    const topSellers = [...brokers]
        .sort((a, b) => (b.sell_value || 0) - (a.sell_value || 0))
        .slice(0, 10)

    // Calculate stats
    const totalBuyValue = brokers.reduce((sum: number, b: any) => sum + (b.buy_value || 0), 0)
    const totalSellValue = brokers.reduce((sum: number, b: any) => sum + (b.sell_value || 0), 0)
    const totalVolume = brokers.reduce((sum: number, b: any) => sum + (b.total_volume || 0), 0)
    const netFlow = totalBuyValue - totalSellValue
    const foreignBrokers = brokers.filter((b: any) => b.group?.includes('FOREIGN')).length
    const localBrokers = brokers.filter((b: any) => !b.group?.includes('FOREIGN')).length

    return (
        <div className="space-y-6">
            {/* Summary Stats */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-xs">
                <Card className="p-3 bg-dark-800">
                    <p className="text-dark-400 text-xs">TOTAL BUY</p>
                    <p className="text-accent-green font-bold text-lg mt-1">{formatCurrency(totalBuyValue)}</p>
                </Card>
                <Card className="p-3 bg-dark-800">
                    <p className="text-dark-400 text-xs">TOTAL SELL</p>
                    <p className="text-accent-red font-bold text-lg mt-1">{formatCurrency(totalSellValue)}</p>
                </Card>
                <Card className="p-3 bg-dark-800">
                    <p className="text-dark-400 text-xs">NET FLOW</p>
                    <p className={`font-bold text-lg mt-1 ${netFlow >= 0 ? 'text-accent-green' : 'text-accent-red'}`}>{formatCurrency(netFlow)}</p>
                </Card>
                <Card className="p-3 bg-dark-800">
                    <p className="text-dark-400 text-xs">VOLUME</p>
                    <p className="text-accent-blue font-bold text-lg mt-1">{formatBigNumber(totalVolume)}</p>
                </Card>
                <Card className="p-3 bg-dark-800">
                    <p className="text-dark-400 text-xs">BROKERS</p>
                    <p className="text-dark-100 font-bold text-lg mt-1">{brokers.length} ({foreignBrokers}F {localBrokers}L)</p>
                </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Top Buyers */}
                <Card className="p-6">
                    <h3 className="text-lg font-semibold text-dark-100 mb-4">🟢 Top Buyer</h3>
                    <div className="space-y-3">
                        {topBuyers.map((broker, idx) => (
                            <div key={broker.code} className="p-3 bg-dark-800 rounded-lg border border-dark-700 hover:border-accent-green transition">
                                <div className="flex items-start justify-between mb-2">
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-sm font-bold text-dark-400 w-6 h-6 flex items-center justify-center bg-dark-700 rounded-full">
                                                {idx + 1}
                                            </span>
                                            <span className="font-bold text-accent-green">{broker.code}</span>
                                        </div>
                                        <p className="text-xs text-dark-400 mt-1">{broker.name}</p>
                                    </div>
                                    <span className={`text-xs px-2 py-1 rounded ${broker.group === 'FOREIGN' ? 'bg-accent-blue bg-opacity-20 text-accent-blue' : 'bg-accent-yellow bg-opacity-20 text-accent-yellow'}`}>
                                        {broker.group === 'FOREIGN' ? '🌍' : '🏠'}
                                    </span>
                                </div>
                                <div className="grid grid-cols-2 gap-2 text-xs">
                                    <div>
                                        <p className="text-dark-500">Buy Value</p>
                                        <p className="font-semibold text-accent-green">{formatCurrency(broker.buy_value || 0)}</p>
                                    </div>
                                    <div>
                                        <p className="text-dark-500">Volume</p>
                                        <p className="font-semibold text-dark-200">{formatBigNumber(broker.total_volume || 0)}</p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </Card>

                {/* Top Sellers */}
                <Card className="p-6">
                    <h3 className="text-lg font-semibold text-dark-100 mb-4">🔴 Top Seller</h3>
                    <div className="space-y-3">
                        {topSellers.map((broker, idx) => (
                            <div key={broker.code} className="p-3 bg-dark-800 rounded-lg border border-dark-700 hover:border-accent-red transition">
                                <div className="flex items-start justify-between mb-2">
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-sm font-bold text-dark-400 w-6 h-6 flex items-center justify-center bg-dark-700 rounded-full">
                                                {idx + 1}
                                            </span>
                                            <span className="font-bold text-accent-red">{broker.code}</span>
                                        </div>
                                        <p className="text-xs text-dark-400 mt-1">{broker.name}</p>
                                    </div>
                                    <span className={`text-xs px-2 py-1 rounded ${broker.group === 'FOREIGN' ? 'bg-accent-blue bg-opacity-20 text-accent-blue' : 'bg-accent-yellow bg-opacity-20 text-accent-yellow'}`}>
                                        {broker.group === 'FOREIGN' ? '🌍' : '🏠'}
                                    </span>
                                </div>
                                <div className="grid grid-cols-2 gap-2 text-xs">
                                    <div>
                                        <p className="text-dark-500">Sell Value</p>
                                        <p className="font-semibold text-accent-red">{formatCurrency(broker.sell_value || 0)}</p>
                                    </div>
                                    <div>
                                        <p className="text-dark-500">Volume</p>
                                        <p className="font-semibold text-dark-200">{formatBigNumber(broker.total_volume || 0)}</p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </Card>
            </div>
        </div>
    )
}
