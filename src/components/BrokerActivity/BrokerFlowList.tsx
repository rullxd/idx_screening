import { formatBigNumber, formatCurrency } from '@/utils/formatters'
import { MarketDetectorBroker } from '@/utils/broker-activity'
import { getBrokerTierInfo } from '@/data/broker-tiers'
import { Card } from '@/components'
import BrokerTierBadge from './BrokerTierBadge'
import clsx from 'clsx'

interface BrokerFlowListProps {
    title: string
    items: MarketDetectorBroker[]
    side: 'buy' | 'sell'
}

export default function BrokerFlowList({ title, items, side }: BrokerFlowListProps) {
    const isBuy = side === 'buy'
    const accent = isBuy ? 'text-accent-green' : 'text-accent-red'
    const borderHover = isBuy ? 'hover:border-accent-green' : 'hover:border-accent-red'

    return (
        <Card className="p-6 flex flex-col min-h-0">
            <div className="mb-4">
                <h3 className="text-lg font-semibold text-dark-100">{title}</h3>
                <p className="text-xs text-dark-500 mt-1">{items.length} broker</p>
            </div>
            <div className="space-y-2 max-h-[24rem] overflow-y-auto pr-1">
                {items.length === 0 ? (
                    <p className="text-dark-500 text-center py-6 text-sm">Tidak ada data</p>
                ) : (
                    items.map((broker, idx) => (
                        <div
                            key={`${broker.code}-${idx}`}
                            className={clsx(
                                'flex items-center gap-3 p-3 rounded-lg border transition',
                                getTierRowClass(broker.code),
                                borderHover
                            )}
                        >
                            <span className="w-6 h-6 flex items-center justify-center text-xs font-bold text-dark-400 bg-dark-700 rounded-full flex-shrink-0">
                                {idx + 1}
                            </span>
                            <div className="flex-1 min-w-0 flex items-center justify-between gap-2">
                                <div>
                                    <div className="flex items-center gap-2">
                                        <span className={clsx('font-bold', accent)}>{broker.code}</span>
                                        <BrokerTierBadge brokerCode={broker.code} />
                                        <span className="text-[10px] text-dark-400">{broker.investorType}</span>
                                    </div>
                                    <p className="text-[10px] text-dark-500 mt-0.5 tabular-nums">
                                        Avg{' '}
                                        {broker.avgPrice.toLocaleString('id-ID', {
                                            maximumFractionDigits: 0,
                                        })}
                                    </p>
                                </div>
                                <div className="text-right flex-shrink-0">
                                    <p className={clsx('text-sm font-bold tabular-nums', accent)}>
                                        {formatCurrency(broker.value)}
                                    </p>
                                    <p className="text-[10px] text-dark-500 tabular-nums">
                                        {formatBigNumber(broker.lot)} lot · {formatBigNumber(broker.freq)}x
                                    </p>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </Card>
    )
}

function getTierRowClass(brokerCode: string): string {
    const tier = getBrokerTierInfo(brokerCode).tier
    if (tier === 3) return 'bg-dark-800 border-accent-red/30'
    if (tier === 2) return 'bg-dark-800 border-accent-blue/30'
    return 'bg-dark-800 border-dark-700'
}
