import { Broker } from '@/types'
import { formatCurrency, formatVolume } from '@/utils/formatters'
import Card from '@/components/Card'

interface TopBrokersListProps {
    title: string
    brokers: Broker[]
    type: 'buy' | 'sell'
}

export default function TopBrokersList({ title, brokers, type }: TopBrokersListProps) {
    const getGroupStyle = (broker: Broker): { color: string; label: string } => {
        if (broker.group === 'BROKER_GROUP_FOREIGN') return { color: 'text-accent-blue', label: '🌍 Asing' }
        if (broker.group === 'BROKER_GROUP_GOVERNMENT') return { color: 'text-accent-green', label: '🏛 Pemerintah' }
        return { color: 'text-accent-yellow', label: '🏠 Lokal' }
    }

    return (
        <Card>
            <div className="mb-4">
                <h3 className="text-lg font-semibold text-dark-100">{title}</h3>
                <p className="text-xs text-dark-500 mt-1">{brokers.length} broker teratas</p>
            </div>

            <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
                {brokers.length === 0 ? (
                    <div className="text-center py-6 text-dark-500">Tidak ada data</div>
                ) : (
                    brokers.map((broker, idx) => {
                        const value = type === 'buy' ? broker.buy_value : broker.sell_value
                        const { color, label } = getGroupStyle(broker)
                        const isPositiveNet = broker.net_value >= 0

                        return (
                            <div
                                key={broker.code}
                                className="flex items-start gap-3 p-3 rounded-lg bg-dark-800 hover:bg-dark-700 transition-colors"
                            >
                                {/* Rank */}
                                <div className="flex-shrink-0 w-7 h-7 rounded-full bg-dark-700 flex items-center justify-center text-xs font-bold text-dark-300">
                                    {idx + 1}
                                </div>

                                {/* Code & Name */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-baseline gap-2 flex-wrap">
                                        <span className="font-bold text-dark-100 text-sm">{broker.code}</span>
                                        <span className={`text-[10px] font-medium ${color}`}>{label}</span>
                                    </div>
                                    <div className="text-xs text-dark-500 truncate">{broker.name}</div>
                                    <div className={`text-[10px] mt-0.5 tabular-nums ${isPositiveNet ? 'text-accent-green' : 'text-accent-red'}`}>
                                        Net: {isPositiveNet ? '+' : ''}{formatCurrency(broker.net_value)}
                                    </div>
                                </div>

                                {/* Value */}
                                <div className="flex-shrink-0 text-right">
                                    <div className="text-sm font-bold text-dark-100">{formatCurrency(value)}</div>
                                    <div className="text-xs text-dark-400">
                                        Vol: {formatVolume(broker.total_volume)}
                                    </div>
                                </div>
                            </div>
                        )
                    })
                )}
            </div>
        </Card>
    )
}
