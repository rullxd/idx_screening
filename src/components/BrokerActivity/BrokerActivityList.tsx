import { useState, useMemo } from 'react'
import { useBrokerActivity } from '@/hooks/use-queries'
import { formatCurrency } from '@/utils/formatters'
import { parseBrokerActivity } from '@/utils/broker-activity'
import { Card, LoadingSpinner, ErrorState } from '@/components'
import DateRangePicker, { DateRange } from '../DateRangePicker'
import StockTransactionList from './StockTransactionList'

const POPULAR_BROKERS = ['AK', 'CC', 'YP', 'MG', 'XL', 'PD', 'NI', 'ZP']

export default function BrokerActivityList() {
    const [inputCode, setInputCode] = useState('AK')
    const [brokerCode, setBrokerCode] = useState('AK')

    // Initialize date range with last 7 days
    const defaultDateRange = useMemo(() => {
        const to = new Date()
        const from = new Date()
        from.setDate(to.getDate() - 6)
        return { from, to }
    }, [])

    const [dateRange, setDateRange] = useState<DateRange>(defaultDateRange)

    // Format dates for API
    const formatDateForAPI = (date: Date): string => {
        const year = date.getFullYear()
        const month = String(date.getMonth() + 1).padStart(2, '0')
        const day = String(date.getDate()).padStart(2, '0')
        return `${year}-${month}-${day}`
    }

    const { data, isLoading, error, refetch, isFetching } = useBrokerActivity(brokerCode, {
        fromDate: formatDateForAPI(dateRange.from),
        toDate: formatDateForAPI(dateRange.to),
    })

    const applyBroker = (code?: string) => {
        const next = (code || inputCode).trim().toUpperCase()
        if (next.length < 2) return
        setBrokerCode(next)
        setInputCode(next)
    }

    const { buys, sells, date } = parseBrokerActivity(data ?? {})

    const totalBuy = buys.reduce((s, r) => s + r.value, 0)
    const totalSell = sells.reduce((s, r) => s + r.value, 0)
    const netFlow = totalBuy - totalSell

    return (
        <div className="space-y-6">
            <Card className="p-4">
                <p className="text-sm text-dark-400 mb-3">
                    Lihat saham yang dibeli & dijual oleh broker tertentu (data transaksi harian).
                </p>
                <div className="flex flex-col gap-4">
                    <div className="flex flex-col sm:flex-row gap-3">
                        <input
                            type="text"
                            value={inputCode}
                            onChange={(e) => setInputCode(e.target.value.toUpperCase())}
                            onKeyDown={(e) => e.key === 'Enter' && applyBroker()}
                            placeholder="Kode broker, mis. AK"
                            className="flex-1 px-4 py-2.5 bg-dark-800 border border-dark-700 rounded-lg text-dark-100 placeholder-dark-500 focus:outline-none focus:border-accent-green"
                        />
                        <button
                            type="button"
                            onClick={() => applyBroker()}
                            className="px-6 py-2.5 bg-accent-green text-dark-950 font-semibold rounded-lg hover:bg-opacity-90 transition"
                        >
                            Tampilkan
                        </button>
                        <button
                            type="button"
                            onClick={() => refetch()}
                            className="px-4 py-2.5 border border-dark-700 rounded-lg text-dark-300 hover:bg-dark-800 transition"
                        >
                            ⟳ Refresh
                        </button>
                        <DateRangePicker value={dateRange} onChange={setDateRange} />
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {POPULAR_BROKERS.map((code) => (
                            <button
                                key={code}
                                type="button"
                                onClick={() => applyBroker(code)}
                                className={`px-3 py-1 rounded-full text-xs font-medium border transition ${brokerCode === code
                                        ? 'border-accent-green text-accent-green bg-accent-green/10'
                                        : 'border-dark-700 text-dark-300 hover:border-dark-500'
                                    }`}
                            >
                                {code}
                            </button>
                        ))}
                    </div>
                </div>
            </Card>

            {isLoading ? (
                <LoadingSpinner message={`Memuat aktivitas broker ${brokerCode}...`} />
            ) : error ? (
                <ErrorState
                    title="Gagal memuat data"
                    message={error.message || `Tidak dapat memuat aktivitas broker ${brokerCode}`}
                    onRetry={() => refetch()}
                />
            ) : (
                <>
                    <div className="flex items-center justify-between text-sm text-dark-500">
                        <span>
                            Broker <strong className="text-dark-200">{brokerCode}</strong>
                            {date && ` · ${date}`}
                        </span>
                        {isFetching && <span className="animate-pulse">memperbarui…</span>}
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <SummaryCard label="Total Beli" value={formatCurrency(totalBuy)} className="text-accent-green" />
                        <SummaryCard label="Total Jual" value={formatCurrency(totalSell)} className="text-accent-red" />
                        <SummaryCard
                            label="Net Flow"
                            value={formatCurrency(netFlow)}
                            className={netFlow >= 0 ? 'text-accent-green' : 'text-accent-red'}
                        />
                        <SummaryCard
                            label="Saham"
                            value={`${buys.length} beli · ${sells.length} jual`}
                        />
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <StockTransactionList title="🟢 Saham Dibeli" items={buys} side="buy" />
                        <StockTransactionList title="🔴 Saham Dijual" items={sells} side="sell" />
                    </div>
                </>
            )}
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
            <p className="text-dark-400 text-xs uppercase tracking-wide">{label}</p>
            <p className={`font-bold text-lg mt-1 tabular-nums ${className || 'text-dark-100'}`}>{value}</p>
        </Card>
    )
}
