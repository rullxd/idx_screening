import { useMemo } from 'react'
import { useOrderbook } from '@/hooks/use-queries'
import { formatBigNumber } from '@/services/api'
import { Card, LoadingSpinner, ErrorState } from '@/components'
import clsx from 'clsx'

interface OrderbookRow {
    price: string
    que_num: string
    volume: string
}

interface OrderbookCardProps {
    symbol: string
}

function formatPrice(value: string | number): string {
    const n = typeof value === 'string' ? parseFloat(value) : value
    if (isNaN(n)) return '—'
    return n.toLocaleString('id-ID')
}

function formatLot(volume: string): string {
    const n = parseFloat(volume)
    if (isNaN(n)) return '—'
    return formatBigNumber(Math.round(n / 100))
}

function OrderbookSide({
    title,
    rows,
    variant,
}: {
    title: string
    rows: OrderbookRow[]
    variant: 'bid' | 'offer'
}) {
    const isBid = variant === 'bid'

    return (
        <div className="flex flex-col min-h-0 min-w-0 flex-1">
            <p
                className={clsx(
                    'text-xs font-semibold uppercase tracking-wide px-2 py-1 border-b border-dark-700 flex-shrink-0',
                    isBid ? 'text-accent-green' : 'text-accent-red'
                )}
            >
                {title}
            </p>
            <div
                className={clsx(
                    'grid grid-cols-3 gap-1 px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wide border-b border-dark-700 sticky top-0 bg-dark-900 z-10 flex-shrink-0',
                    isBid ? 'text-accent-green' : 'text-accent-red'
                )}
            >
                <span>Lot</span>
                <span className="text-center">Freq</span>
                <span className="text-right">Harga</span>
            </div>
            <OrderbookRows rows={rows} isBid={isBid} />
        </div>
    )
}

function OrderbookRows({ rows, isBid }: { rows: OrderbookRow[]; isBid: boolean }) {
    return (
        <div className="overflow-y-auto flex-1 min-h-0">
            {rows.map((row, idx) => (
                <div
                    key={`${row.price}-${idx}`}
                    className={clsx(
                        'grid grid-cols-3 gap-1 px-2 py-1 text-xs border-b border-dark-800/50 hover:bg-dark-800/40',
                        isBid ? 'text-accent-green/90' : 'text-accent-red/90'
                    )}
                >
                    <span className="text-dark-300 tabular-nums">{formatLot(row.volume)}</span>
                    <span className="text-center text-dark-400 tabular-nums">{row.que_num}</span>
                    <span className="text-right font-medium tabular-nums">{formatPrice(row.price)}</span>
                </div>
            ))}
        </div>
    )
}

function SummaryItem({
    label,
    value,
    className,
}: {
    label: string
    value: string
    className?: string
}) {
    return (
        <div className="bg-dark-800 rounded px-2 py-1">
            <span className="text-dark-500">{label} </span>
            <span className={clsx('font-medium text-dark-200', className)}>{value}</span>
        </div>
    )
}

export default function OrderbookCard({ symbol }: OrderbookCardProps) {
    const { data, isLoading, error, refetch, isFetching } = useOrderbook(symbol)

    const book = useMemo(() => {
        const ob = data?.data || data || {}
        const bids = (ob.bid || []) as OrderbookRow[]
        const offers = (ob.offer || []) as OrderbookRow[]
        return { ob, bids, offers }
    }, [data])

    if (isLoading) {
        return (
            <Card className="p-4 h-[520px] flex items-center justify-center">
                <LoadingSpinner />
            </Card>
        )
    }

    if (error) {
        return (
            <Card className="p-4 h-[520px]">
                <ErrorState
                    title="Orderbook"
                    message={`Gagal memuat orderbook ${symbol}`}
                    onRetry={() => refetch()}
                />
            </Card>
        )
    }

    const { ob, bids, offers } = book
    const lastPrice = ob.lastprice ?? ob.close ?? 0
    const changePct = parseFloat(String(ob.percentage_change ?? 0))
    const isPositive = changePct >= 0

    return (
        <Card className="p-4 flex flex-col h-[520px]">
            <div className="flex-shrink-0 mb-3">
                <div className="flex items-center gap-2">
                    {ob.icon_url && (
                        <img src={ob.icon_url} alt="" className="w-8 h-8 rounded-full bg-dark-800" />
                    )}
                    <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-dark-100 truncate">{symbol}</h3>
                        {ob.name && <p className="text-xs text-dark-400 truncate">{ob.name}</p>}
                    </div>
                    {isFetching && (
                        <span className="text-[10px] text-dark-500 animate-pulse">↻</span>
                    )}
                </div>

                <div className="mt-2 flex items-baseline justify-between gap-2">
                    <span className="text-xl font-bold text-dark-100 tabular-nums">
                        {formatPrice(lastPrice)}
                    </span>
                    <span
                        className={clsx(
                            'text-sm font-semibold tabular-nums',
                            isPositive ? 'text-accent-green' : 'text-accent-red'
                        )}
                    >
                        {isPositive ? '+' : ''}
                        {changePct.toFixed(2)}%
                    </span>
                </div>

                <div className="mt-2 grid grid-cols-2 gap-2 text-[10px]">
                    <SummaryItem label="Open" value={formatPrice(ob.open)} />
                    <SummaryItem label="Prev" value={formatPrice(ob.previous)} />
                    <SummaryItem label="High" value={formatPrice(ob.high)} className="text-accent-green" />
                    <SummaryItem label="Low" value={formatPrice(ob.low)} className="text-accent-red" />
                </div>

                {ob.total_bid_offer && (
                    <div className="mt-2 flex gap-2 text-[10px]">
                        <span className="text-accent-green">Bid {ob.total_bid_offer.bid?.lot} lot</span>
                        <span className="text-dark-600">|</span>
                        <span className="text-accent-red">Offer {ob.total_bid_offer.offer?.lot} lot</span>
                    </div>
                )}
            </div>

            <div className="flex-1 min-h-0 grid grid-cols-2 gap-2 border border-dark-700 rounded-lg overflow-hidden">
                <OrderbookSide title="Bid" rows={bids} variant="bid" />
                <OrderbookSide title="Offer" rows={offers} variant="offer" />
            </div>

            <p className="text-[10px] text-dark-500 text-center mt-2 flex-shrink-0">
                {bids.length} bid · {offers.length} offer · refresh 10s
            </p>
        </Card>
    )
}
