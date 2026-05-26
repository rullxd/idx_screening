import { useMemo } from 'react'
import { useMarketDetector } from '@/hooks/use-queries'
import { formatCurrency, formatVolume } from '@/utils/formatters'
import { Card, LoadingSpinner, ErrorState } from '@/components'
import clsx from 'clsx'

interface BrokerSummaryCardProps {
 symbol: string
 fromDate?: string
 toDate?: string
}

function formatScientificNotation(value: string): number {
 if (!value) return 0
 const num = parseFloat(value)
 if (isNaN(num)) return 0
 return num
}

function BrokerRow({
 brokerCode,
 type,
 value,
 volume,
 freq,
}: {
 brokerCode: string
 type: string
 value: string
 volume: string
 freq: string
}) {
 const numValue = formatScientificNotation(value)
 const numVolume = formatScientificNotation(volume)
 const numFreq = parseFloat(freq) || 0

 const typeColor = {
 'Asing': 'text-blue-400',
 'Lokal': 'text-yellow-400',
 'Pemerintah': 'text-green-400',
 }[type] || 'text-gray-400'

 return (
 <div className="grid grid-cols-5 gap-2 px-2 py-1.5 text-xs border-b border-dark-800/50 hover:bg-dark-800/40">
 <span className="font-medium text-dark-200">{brokerCode}</span>
 <span className={clsx('text-[10px]', typeColor)}>{type}</span>
 <span className="text-right tabular-nums">{formatCurrency(numValue)}</span>
 <span className="text-right tabular-nums">{formatVolume(numVolume)}</span>
 <span className="text-right tabular-nums text-dark-400">{numFreq.toLocaleString()}</span>
 </div>
 )
}

function BrokerTable({
 title,
 brokers,
 isBuy,
}: {
 title: string
 brokers: any[]
 isBuy: boolean
}) {
 const isGreen = isBuy

 return (
 <div className="flex flex-col min-h-0 flex-1">
 <p
 className={clsx(
 'text-xs font-semibold uppercase tracking-wide px-2 py-1 border-b border-dark-700 flex-shrink-0',
 isGreen ? 'text-accent-green' : 'text-accent-red'
 )}
 >
 {title}
 </p>
 <div
 className={clsx(
 'grid grid-cols-5 gap-2 px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wide border-b border-dark-700 sticky top-0 bg-dark-900 z-10 flex-shrink-0',
 isGreen ? 'text-accent-green' : 'text-accent-red'
 )}
 >
 <span>Broker</span>
 <span>Tipe</span>
 <span className="text-right">Nilai</span>
 <span className="text-right">Vol</span>
 <span className="text-right">Freq</span>
 </div>
 <div className="overflow-y-auto flex-1 min-h-0">
 {brokers.map((broker, idx) => (
 <BrokerRow
 key={`${broker.netbs_broker_code || broker.broker_code}-${idx}`}
 brokerCode={broker.netbs_broker_code || broker.broker_code}
 type={broker.type}
 value={isBuy ? broker.bval : broker.sval}
 volume={isBuy ? broker.blot : broker.slot}
 freq={broker.freq}
 />
 ))}
 </div>
 </div>
 )
}

export default function BrokerSummaryCard({ symbol, fromDate, toDate }: BrokerSummaryCardProps) {
 const { data, isLoading, error, refetch, isFetching } = useMarketDetector(symbol, {
 enabled: !!symbol,
 fromDate,
 toDate,
 })

 const brokerData = useMemo(() => {
 if (data?.data?.broker_summary) return data.data.broker_summary
 if (data?.broker_summary) return data.broker_summary
 return null
 }, [data])

 const bandarData = useMemo(() => {
 if (data?.data?.bandar_detector) return data.data.bandar_detector
 if (data?.bandar_detector) return data.bandar_detector
 return null
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
 title="Broker Summary"
 message={`Gagal memuat data broker ${symbol}`}
 onRetry={() => refetch()}
 />
 </Card>
 )
 }

 const brokersBuy = brokerData?.brokers_buy || []
 const brokersSell = brokerData?.brokers_sell || []

 return (
 <Card className="p-4 flex flex-col gap-3 h-[560px]">
 <div className="flex-shrink-0">
 <div className="flex items-start justify-between gap-3">
 <div>
 <div className="flex items-center gap-2">
 <h3 className="font-semibold text-dark-100">Broker Summary</h3>
 <span className="text-xs rounded-full border border-dark-700 bg-dark-800 px-2 py-0.5 text-dark-300">
 {symbol}
 </span>
 </div>
 {(fromDate || toDate) && (
 <p className="text-[11px] text-dark-500 mt-1">
 {fromDate || '-'}{toDate && toDate !== fromDate ? ` - ${toDate}` : ''}
 </p>
 )}
 </div>

 {isFetching && <span className="text-[10px] text-dark-500 animate-pulse">Memperbarui...</span>}
 </div>
 </div>

 {bandarData && (
 <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[10px]">
 <div className="rounded-lg border border-dark-700 bg-dark-800/70 px-2.5 py-2">
 <p className="text-dark-500 uppercase tracking-wide">Buyer</p>
 <p className="font-semibold text-accent-green text-sm mt-0.5">{bandarData.total_buyer}</p>
 </div>
 <div className="rounded-lg border border-dark-700 bg-dark-800/70 px-2.5 py-2">
 <p className="text-dark-500 uppercase tracking-wide">Seller</p>
 <p className="font-semibold text-accent-red text-sm mt-0.5">{bandarData.total_seller}</p>
 </div>
 <div className="rounded-lg border border-dark-700 bg-dark-800/70 px-2.5 py-2">
 <p className="text-dark-500 uppercase tracking-wide">Net Avg</p>
 <p className={clsx('font-semibold text-sm mt-0.5', bandarData.avg.amount >= 0 ? 'text-accent-green' : 'text-accent-red')}>
 {formatCurrency(bandarData.avg.amount)}
 </p>
 </div>
 </div>
 )}

 <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-2 gap-2 border border-dark-700 rounded-lg overflow-hidden">
 <BrokerTable title="Top Buyers" brokers={brokersBuy.slice(0, 10)} isBuy={true} />
 <BrokerTable title="Top Sellers" brokers={brokersSell.slice(0, 10)} isBuy={false} />
 </div>

 <p className="text-[10px] text-dark-500 text-center flex-shrink-0">
 {brokersBuy.length} buyer · {brokersSell.length} seller · fokus ke nilai NET dan konsentrasi lot
 </p>
 </Card>
 )
}
