import { useMemo } from 'react'
import { formatBigNumber, formatCurrency } from '@/utils/formatters'
import { MarketDetectorBroker } from '@/utils/broker-activity'
import { analyzeTapeReading } from '@/utils/tape-reading'
import { getBrokerTier } from '@/data/broker-tiers'
import BrokerTierBadge from '@/components/BrokerActivity/BrokerTierBadge'
import { Card } from '@/components'
import clsx from 'clsx'

interface BrokerFlowListProps {
    title: string
    items: MarketDetectorBroker[]
    side: 'buy' | 'sell'
}

export default function BrokerFlowList({ title, items, side }: BrokerFlowListProps) {
    const isBuy = side === 'buy'
    const accent = isBuy ? 'text-accent-green' : 'text-accent-red'
    const barColor = isBuy ? 'bg-accent-green' : 'bg-accent-red'
    const borderHover = isBuy ? 'hover:border-green-700' : 'hover:border-red-700'

    const maxValue = useMemo(() => Math.max(...items.map((b) => b.value), 1), [items])

    return (
        <Card className="p-4 flex flex-col min-h-0">
            <div className="mb-3">
                <h3 className="text-sm font-semibold text-dark-100">{title}</h3>
                <p className="text-xs text-dark-500 mt-0.5">{items.length} broker</p>
            </div>

            <div className="space-y-1.5 max-h-[28rem] overflow-y-auto pr-1">
                {items.length === 0 ? (
                    <p className="text-dark-500 text-center py-6 text-sm">Tidak ada data</p>
                ) : (
                    items.map((broker, idx) => (
                        <BrokerRow
                            key={`${broker.code}-${idx}`}
                            broker={broker}
                            idx={idx}
                            side={side}
                            accent={accent}
                            barColor={barColor}
                            borderHover={borderHover}
                            maxValue={maxValue}
                        />
                    ))
                )}
            </div>
        </Card>
    )
}

function BrokerRow({
    broker,
    idx,
    side,
    accent,
    barColor,
    borderHover,
    maxValue,
}: {
    broker: MarketDetectorBroker
    idx: number
    side: 'buy' | 'sell'
    accent: string
    barColor: string
    borderHover: string
    maxValue: number
}) {
    const tier = getBrokerTier(broker.code)
    const tape = analyzeTapeReading(broker.code, side, broker.value, broker.freq, tier)
    const barWidth = maxValue > 0 ? (broker.value / maxValue) * 100 : 0

    // Warna baris berdasarkan kasta
    const rowBg =
        tier === 2
            ? 'bg-blue-900/10 border-blue-900/30'
            : tier === 3
                ? 'bg-amber-900/10 border-amber-900/30'
                : 'bg-dark-800 border-dark-700'

    return (
        <div
            className={clsx(
                'rounded-lg border transition group',
                rowBg,
                borderHover,
                'p-2.5'
            )}
        >
            {/* Row utama */}
            <div className="flex items-center gap-2">
                {/* Rank */}
                <span className="w-5 h-5 flex items-center justify-center text-[10px] font-bold text-dark-500 flex-shrink-0">
                    {idx + 1}
                </span>

                {/* Kode + badge kasta */}
                <div className="flex-shrink-0 min-w-[60px]">
                    <div className="flex items-center gap-1.5">
                        <span className={clsx('text-sm font-bold', accent)}>{broker.code}</span>
                        {tape.isSuspicious && (
                            <span className="text-[8px] bg-amber-900/40 text-amber-400 px-1 rounded">
                                bunglon
                            </span>
                        )}
                    </div>
                    <BrokerTierBadge code={broker.code} size="xs" className="mt-0.5" />
                </div>

                {/* Info tengah */}
                <div className="flex-1 min-w-0">
                    {/* Bar value */}
                    <div className="w-full h-1 bg-dark-700 rounded-full overflow-hidden mb-1">
                        <div
                            className={clsx('h-full rounded-full', barColor)}
                            style={{ width: `${barWidth}%` }}
                        />
                    </div>
                    <p className="text-[10px] text-dark-500 tabular-nums truncate">
                        AVG {broker.avgPrice.toLocaleString('id-ID', { maximumFractionDigits: 0 })}
                        {' · '}
                        {broker.freq > 0
                            ? `${formatBigNumber(broker.freq)}x · ${tape.avgPerTradeMillion.toFixed(1)} jt/tx`
                            : broker.investorType}
                    </p>
                </div>

                {/* Value kanan */}
                <div className="text-right flex-shrink-0">
                    <p className={clsx('text-sm font-bold tabular-nums', accent)}>
                        {formatCurrency(broker.value)}
                    </p>
                    <p className="text-[10px] text-dark-500 tabular-nums">
                        {formatBigNumber(broker.lot)} lot
                    </p>
                </div>
            </div>

            {/* Tape reading warning — hanya muncul jika bandar bunglon */}
            {tape.isSuspicious && (
                <div className="mt-1.5 px-2 py-1 rounded bg-amber-900/20 text-amber-400 text-[10px] leading-tight">
                    ⚠️ {tape.explanation}
                </div>
            )}
        </div>
    )
}
