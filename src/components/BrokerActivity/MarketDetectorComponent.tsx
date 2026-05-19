import { useState } from 'react'
import { useMarketDetector } from '@/hooks/use-queries'
import { formatBigNumber, formatCurrency } from '@/services/api'
import { parseMarketDetector } from '@/utils/broker-activity'
import { Card, LoadingSpinner, ErrorState } from '@/components'
import BrokerFlowList from './BrokerFlowList'

export default function MarketDetectorComponent() {
    const [inputCode, setInputCode] = useState('BNBR')
    const [stockCode, setStockCode] = useState('BNBR')

    const { data, isLoading, error, refetch, isFetching } = useMarketDetector(stockCode)

    const applyStock = (code?: string) => {
        const next = (code || inputCode).trim().toUpperCase()
        if (next.length < 3) return
        setStockCode(next)
        setInputCode(next)
    }

    const parsed = parseMarketDetector(data ?? {})
    const topBuyers = [...parsed.buyers].sort((a, b) => b.value - a.value).slice(0, 25)
    const topSellers = [...parsed.sellers].sort((a, b) => b.value - a.value).slice(0, 25)
    const summary = parsed.summary

    return (
        <div className="space-y-6">
            <Card className="p-4">
                <p className="text-sm text-dark-400 mb-3">
                    Analisis bandar & ringkasan broker buy/sell untuk satu saham.
                </p>
                <div className="flex flex-col sm:flex-row gap-3">
                    <input
                        type="text"
                        value={inputCode}
                        onChange={(e) => setInputCode(e.target.value.toUpperCase())}
                        onKeyDown={(e) => e.key === 'Enter' && applyStock()}
                        placeholder="Kode saham, mis. BNBR"
                        className="flex-1 px-4 py-2.5 bg-dark-800 border border-dark-700 rounded-lg text-dark-100 placeholder-dark-500 focus:outline-none focus:border-accent-green"
                    />
                    <button
                        type="button"
                        onClick={() => applyStock()}
                        className="px-6 py-2.5 bg-accent-green text-dark-950 font-semibold rounded-lg hover:bg-opacity-90 transition"
                    >
                        Analisis
                    </button>
                    <button
                        type="button"
                        onClick={() => refetch()}
                        className="px-4 py-2.5 border border-dark-700 rounded-lg text-dark-300 hover:bg-dark-800 transition"
                    >
                        ⟳ Refresh
                    </button>
                </div>
            </Card>

            {isLoading ? (
                <LoadingSpinner message={`Memuat market detector ${stockCode}...`} />
            ) : error ? (
                <ErrorState
                    title="Gagal memuat data"
                    message={error.message || `Tidak dapat memuat market detector ${stockCode}`}
                    onRetry={() => refetch()}
                />
            ) : !summary && topBuyers.length === 0 && topSellers.length === 0 ? (
                <Card className="p-6">
                    <p className="text-dark-400 text-center">Tidak ada data market detector untuk {stockCode}</p>
                </Card>
            ) : (
                <>
                    <MarketDetectorMeta
                        stockCode={stockCode}
                        dateFrom={parsed.dateFrom}
                        dateTo={parsed.dateTo}
                        isFetching={isFetching}
                    />

                    {summary && (
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                            <SummaryCard label="Nilai" value={formatCurrency(summary.totalValue)} />
                            <SummaryCard label="Volume" value={formatBigNumber(summary.totalVolume)} />
                            <SummaryCard label="Avg Acc/Dist" value={summary.accdist} />
                            <SummaryCard label="Broker Acc/Dist" value={summary.brokerAccdist} />
                            <SummaryCard label="Buyer" value={String(summary.totalBuyers)} className="text-accent-green" />
                            <SummaryCard label="Seller" value={String(summary.totalSellers)} className="text-accent-red" />
                        </div>
                    )}

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <BrokerFlowList title="🟢 Top Broker Buyer" items={topBuyers} side="buy" />
                        <BrokerFlowList title="🔴 Top Broker Seller" items={topSellers} side="sell" />
                    </div>
                </>
            )}
        </div>
    )
}

function MarketDetectorMeta({
    stockCode,
    dateFrom,
    dateTo,
    isFetching,
}: {
    stockCode: string
    dateFrom?: string
    dateTo?: string
    isFetching: boolean
}) {
    return (
        <div className="flex items-center justify-between text-sm text-dark-500">
            <span>
                Saham <strong className="text-dark-200">{stockCode}</strong>
                {dateFrom && ` · ${dateFrom}${dateTo && dateTo !== dateFrom ? ` – ${dateTo}` : ''}`}
            </span>
            {isFetching && <span className="animate-pulse">memperbarui…</span>}
        </div>
    )
}

function SummaryCard({
    label,
    value,
    className,
}: {
    label: string
    value: string
    className?: string
}) {
    return (
        <Card className="p-3">
            <p className="text-dark-400 text-[10px] uppercase tracking-wide">{label}</p>
            <p className={`font-semibold text-sm mt-1 ${className || 'text-dark-100'}`}>{value}</p>
        </Card>
    )
}
