import { Broker } from '@/types'
import { formatCurrency, formatVolume } from '@/services/api'
import Card from '@/components/Card'

interface TopBrokersListProps {
    title: string
    brokers: Broker[]
    type: 'buy' | 'sell'
}

export default function TopBrokersList({ title, brokers, type }: TopBrokersListProps) {
    const getColor = (broker: Broker) => {
        const isForeign = broker.group === 'BROKER_GROUP_FOREIGN'
        return isForeign ? 'text-blue-400' : 'text-yellow-400'
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
                                    <div className="flex items-baseline gap-2">
                                        <span className="font-semibold text-dark-100">{broker.code}</span>
                                        <span className={`text-xs font-medium ${getColor(broker)}`}>
                                            {broker.group === 'BROKER_GROUP_FOREIGN' ? '🌍 Foreign' : '🏠 Lokal'}
                                        </span>
                                    </div>
                                    <div className="text-xs text-dark-500 truncate">{broker.name}</div>
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
