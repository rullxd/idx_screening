import { formatBigNumber, formatCurrency } from '@/utils/formatters'
import { StockTransaction } from '@/utils/broker-activity'
import { Card } from '@/components'
import clsx from 'clsx'

interface StockTransactionListProps {
    title: string
    items: StockTransaction[]
    side: 'buy' | 'sell'
}

function stockIconUrl(code: string, fromApi?: string): string {
    return fromApi || `https://assets.stockbit.com/logos/companies/${code}.png`
}

function StatCellInner({ label, value, className }: { label: string; value: string; className?: string }) {
    return (
        <div>
            <p className="text-dark-500">{label}</p>
            <p className={clsx('font-semibold tabular-nums text-dark-200', className)}>{value}</p>
        </div>
    )
}

function StockTransactionRow({
    item,
    idx,
    accent,
    borderHover,
}: {
    item: StockTransaction
    idx: number
    accent: string
    borderHover: string
}) {
    return (
        <div className={clsx('p-3 bg-dark-800 rounded-lg border border-dark-700 transition', borderHover)}>
            <div className="flex items-start gap-3">
                <img
                    src={stockIconUrl(item.stockCode, item.iconUrl)}
                    alt=""
                    className="w-9 h-9 rounded-full bg-dark-700 object-cover flex-shrink-0"
                />
                <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                        <StockTransactionRank idx={idx} stockCode={item.stockCode} accent={accent} />
                        <span className="text-[10px] px-2 py-0.5 rounded bg-dark-700 text-dark-300 flex-shrink-0">
                            {item.investorType}
                        </span>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs mt-2">
                        <StatCellInner label="Nilai" value={formatCurrency(item.value)} className={accent} />
                        <StatCellInner label="Lot" value={formatBigNumber(item.lot)} />
                        <StatCellInner
                            label="Avg"
                            value={item.avgPrice.toLocaleString('id-ID', { maximumFractionDigits: 0 })}
                        />
                        <StatCellInner label="Freq" value={formatBigNumber(item.freq)} />
                    </div>
                </div>
            </div>
        </div>
    )
}

function StockTransactionRank({
    idx,
    stockCode,
    accent,
}: {
    idx: number
    stockCode: string
    accent: string
}) {
    return (
        <div className="flex items-center gap-2 min-w-0">
            <span className="text-xs font-bold text-dark-500 w-5 h-5 flex items-center justify-center bg-dark-700 rounded-full flex-shrink-0">
                {idx + 1}
            </span>
            <span className={clsx('font-bold truncate', accent)}>{stockCode}</span>
        </div>
    )
}

export default function StockTransactionList({ title, items, side }: StockTransactionListProps) {
    const isBuy = side === 'buy'
    const borderHover = isBuy ? 'hover:border-accent-green' : 'hover:border-accent-red'
    const accent = isBuy ? 'text-accent-green' : 'text-accent-red'

    return (
        <Card className="p-6 flex flex-col min-h-0">
            <div className="mb-4 flex-shrink-0">
                <h3 className="text-lg font-semibold text-dark-100">{title}</h3>
                <p className="text-xs text-dark-500 mt-1">{items.length} saham</p>
            </div>

            <div className="space-y-2 flex-1 min-h-0 max-h-[28rem] overflow-y-auto pr-1">
                {items.length === 0 ? (
                    <p className="text-dark-500 text-center py-8 text-sm">Tidak ada data</p>
                ) : (
                    items.map((item, idx) => (
                        <StockTransactionRow
                            key={`${item.stockCode}-${idx}`}
                            item={item}
                            idx={idx}
                            accent={accent}
                            borderHover={borderHover}
                        />
                    ))
                )}
            </div>
        </Card>
    )
}
