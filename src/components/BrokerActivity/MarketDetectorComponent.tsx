import { useState } from 'react'
import { useMarketDetector } from '@/hooks/use-queries'
import { formatBigNumber, formatCurrency } from '@/utils/formatters'
import { parseMarketDetector, BandarTierData } from '@/utils/broker-activity'
import { Card, LoadingSpinner, ErrorState } from '@/components'
import BrokerFlowList from './BrokerFlowList'
import clsx from 'clsx'

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
    const tiers = parsed.tiers

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

                    {/* Summary Cards */}
                    {summary && (
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            <SummaryCard label="Total Nilai" value={formatCurrency(summary.totalValue)} />
                            <SummaryCard label="Total Volume" value={formatBigNumber(summary.totalVolume)} />
                            <SummaryCard label="Jumlah Broker" value={String(summary.numberBrokerBuySell)} />
                            <SummaryCard label="Rata-rata" value={formatBigNumber(summary.average)} />
                            <SummaryCard label="Avg Acc/Dist" value={summary.accdist} className={accdistColor(summary.accdist)} />
                            <SummaryCard label="Broker Acc/Dist" value={summary.brokerAccdist} className={accdistColor(summary.brokerAccdist)} />
                            <SummaryCard label="Pembeli" value={String(summary.totalBuyers)} className="text-accent-green" />
                            <SummaryCard label="Penjual" value={String(summary.totalSellers)} className="text-accent-red" />
                        </div>
                    )}

                    {/* Bandar Tier Analysis */}
                    {tiers && (
                        <Card className="p-4">
                            <h4 className="text-sm font-semibold text-dark-200 mb-3">
                                📊 Analisis Konsentrasi Bandar
                            </h4>
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
                                <TierCard label="Avg" tier={tiers.avg} />
                                <TierCard label="Avg5" tier={tiers.avg5} />
                                <TierCard label="Top 1" tier={tiers.top1} />
                                <TierCard label="Top 3" tier={tiers.top3} />
                                <TierCard label="Top 5" tier={tiers.top5} />
                                <TierCard label="Top 10" tier={tiers.top10} />
                            </div>
                        </Card>
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

function accdistColor(val: string): string {
    const v = val?.toLowerCase()
    if (v?.includes('acc') || v === 'a') return 'text-accent-green'
    if (v?.includes('dist') || v === 'd') return 'text-accent-red'
    return 'text-dark-300'
}

function TierCard({ label, tier }: { label: string; tier: BandarTierData }) {
    const isAcc = tier.accdist?.toLowerCase().includes('acc') || tier.accdist === 'A'
    const isDist = tier.accdist?.toLowerCase().includes('dist') || tier.accdist === 'D'
    const borderColor = isAcc ? 'border-accent-green' : isDist ? 'border-accent-red' : 'border-dark-700'
    const textColor = isAcc ? 'text-accent-green' : isDist ? 'text-accent-red' : 'text-dark-300'

    return (
        <div className={clsx('p-3 rounded-lg bg-dark-800 border-l-2', borderColor)}>
            <p className="text-dark-500 text-[10px] font-semibold uppercase tracking-wide">{label}</p>
            <p className={clsx('text-sm font-bold mt-1', textColor)}>{tier.accdist}</p>
            <p className="text-dark-400 text-[10px] mt-1 tabular-nums">{tier.percent.toFixed(1)}%</p>
            <p className="text-dark-500 text-[10px] tabular-nums">{formatCurrency(tier.amount)}</p>
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
