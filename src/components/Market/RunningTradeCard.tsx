import { useMemo } from 'react'
import clsx from 'clsx'
import { Card, ErrorState } from '@/components'
import { SkeletonTable } from '@/components/SkeletonLoader'
import { useRunningTrade } from '@/hooks/use-queries'
import { formatBigNumber } from '@/utils/formatters'

interface RunningTradeCardProps {
 symbol: string
 date: string
 compact?: boolean
}

interface RunningTradeRow {
 id?: string
 time?: string
 action?: 'buy' | 'sell' | string
 code?: string
 price?: string
 change?: string
 lot?: string
 buyer?: string
 seller?: string
 trade_number?: string
 market_board?: string
}

function parseNumber(value: unknown): number {
 const parsed = typeof value === 'string' ? Number.parseFloat(value.replace(/,/g, '')) : Number(value)
 return Number.isFinite(parsed) ? parsed : 0
}

function formatPrice(row: RunningTradeRow): string {
 const change = row.change ? ` (${row.change})` : ''
 return `${row.price || '-'}${change}`
}

function getRows(payload: any): RunningTradeRow[] {
 const rows = payload?.running_trade || payload?.data?.running_trade || []
 return Array.isArray(rows) ? rows : []
}

export default function RunningTradeCard({ symbol, date, compact = false }: RunningTradeCardProps) {
 const { data, isLoading, error, refetch, isFetching } = useRunningTrade(symbol, date, {
 maxPages: 12,
 refetchInterval: 15000,
 })

 const rows = getRows(data)
 const meta = data?.data || data || {}
 const stats = useMemo(() => {
 const buyLot = rows
 .filter((row) => row.action === 'buy')
 .reduce((sum, row) => sum + parseNumber(row.lot), 0)
 const sellLot = rows
 .filter((row) => row.action === 'sell')
 .reduce((sum, row) => sum + parseNumber(row.lot), 0)
 const last = rows[rows.length - 1]
 return { buyLot, sellLot, lastTradeNumber: last?.trade_number || '-' }
 }, [rows])

 if (isLoading) {
  return (
   <div className="space-y-3">
    <SkeletonTable rows={compact ? 6 : 12} cols={7} />
   </div>
  )
 }

 if (error) {
 return <ErrorState title="Running Trade Error" message={error.message} onRetry={() => refetch()} />
 }

 return (
 <Card className="p-0 overflow-hidden">
 <div className={clsx('flex flex-col border-b border-dark-800', compact ? 'gap-2 p-3' : 'gap-3 p-4 sm:flex-row sm:items-start sm:justify-between')}>
 <div>
 <div className="flex items-center gap-2">
  <h3 className={clsx('font-semibold text-dark-100', compact ? 'text-sm' : 'text-lg')}>Running Trade {symbol}</h3>
  <span className={clsx(
  'inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-semibold',
  meta.is_open_market ? 'bg-accent-green/10 text-accent-green' : 'bg-dark-800 text-dark-400'
  )}>
   <span className={clsx(
    'h-1.5 w-1.5 rounded-full',
    meta.is_open_market ? 'bg-accent-green pulse-glow-green' : 'bg-dark-500'
   )} />
  {meta.is_open_market ? 'Market Open' : 'Market Closed'}
  </span>
  </div>
 <p className="mt-1 text-xs text-dark-500">
 Data {date} sampai #{stats.lastTradeNumber} {meta.reached_stop_time ? '- stop 16:08:07' : ''}
 </p>
 </div>
 <div className={clsx('grid grid-cols-3 gap-2 text-right text-xs', compact && 'text-[11px]')}>
 <div className={clsx('rounded bg-dark-800', compact ? 'px-2 py-1.5' : 'px-3 py-2')}>
 <p className="text-dark-500">Rows</p>
 <p className="font-semibold text-dark-100">{formatBigNumber(rows.length)}</p>
 </div>
 <div className={clsx('rounded bg-dark-800', compact ? 'px-2 py-1.5' : 'px-3 py-2')}>
 <p className="text-dark-500">Buy Lot</p>
 <p className="font-semibold text-accent-green">{formatBigNumber(stats.buyLot)}</p>
 </div>
 <div className={clsx('rounded bg-dark-800', compact ? 'px-2 py-1.5' : 'px-3 py-2')}>
 <p className="text-dark-500">Sell Lot</p>
 <p className="font-semibold text-accent-red">{formatBigNumber(stats.sellLot)}</p>
 </div>
 </div>
 </div>

 <div className={clsx('overflow-auto', compact ? 'max-h-[18rem]' : 'max-h-[32rem]')}>
 <table className={clsx('min-w-full text-left', compact ? 'text-[9px]' : 'text-xs')}>
 <thead className="sticky top-0 z-10 bg-dark-900 text-dark-500">
 <tr className="border-b border-dark-800">
 <th className={clsx('font-medium', compact ? 'px-1 py-2' : 'px-4 py-3')}>Time</th>
 <th className={clsx('font-medium', compact ? 'px-1 py-2' : 'px-3 py-3')}>Price</th>
 <th className={clsx('font-medium', compact ? 'px-1 py-2' : 'px-3 py-3')}>Action</th>
 <th className={clsx('text-right font-medium', compact ? 'px-1 py-2' : 'px-3 py-3')}>Lot</th>
 <th className={clsx('font-medium', compact ? 'px-1 py-2' : 'px-3 py-3')}>Buyer</th>
 <th className={clsx('font-medium', compact ? 'px-1 py-2' : 'px-3 py-3')}>Seller</th>
 <th className={clsx('font-medium', compact ? 'px-1 py-2' : 'px-3 py-3')}>Market</th>
 </tr>
 </thead>
 <tbody>
 {rows.length === 0 ? (
 <tr>
 <td colSpan={7} className="px-4 py-10 text-center text-dark-500">Tidak ada data running trade</td>
 </tr>
 ) : rows.map((row, idx) => {
 const isBuy = row.action === 'buy'
 return (
 <tr key={row.id || `${row.trade_number}-${idx}`} className="border-b border-dark-800/70 hover:bg-dark-800/50">
 <td className={clsx('whitespace-nowrap font-mono text-dark-300', compact ? 'px-1 py-1.5' : 'px-4 py-2')}>{row.time || '-'}</td>
 <td className={clsx('whitespace-nowrap font-medium tabular-nums', isBuy ? 'text-accent-green' : 'text-accent-red', compact ? 'px-1 py-1.5' : 'px-3 py-2')}>
 {formatPrice(row)}
 </td>
 <td className={clsx('capitalize', isBuy ? 'text-accent-green' : 'text-accent-red', compact ? 'px-1 py-1.5' : 'px-3 py-2')}>
 {row.action || '-'}
 </td>
 <td className={clsx('text-right tabular-nums text-dark-300', compact ? 'px-1 py-1.5' : 'px-3 py-2')}>
 {formatBigNumber(parseNumber(row.lot))}
 </td>
 <td className={clsx('whitespace-nowrap font-semibold text-violet-400', compact ? 'px-1 py-1.5' : 'px-3 py-2')}>
 {row.buyer || '-'}
 </td>
 <td className={clsx('whitespace-nowrap font-semibold text-accent-red', compact ? 'px-1 py-1.5' : 'px-3 py-2')}>
 {row.seller || '-'}
 </td>
 <td className={clsx('whitespace-nowrap text-dark-300', compact ? 'px-1 py-1.5' : 'px-3 py-2')}>
 {row.market_board || '-'}
 </td>
 </tr>
 )
 })}
 </tbody>
 </table>
 </div>
 {isFetching && <div className="border-t border-dark-800 px-4 py-2 text-xs text-dark-500">Refreshing running trade...</div>}
 </Card>
 )
}