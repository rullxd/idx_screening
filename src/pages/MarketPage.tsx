import { useMemo, useState } from 'react'
import StockSearchBar from '@/components/Market/StockSearchBar'
import StockChartComponent from '@/components/Market/StockChartComponent'
import OrderbookCard from '@/components/Market/OrderbookCard'
import BrokerSummaryCard from '@/components/Market/BrokerSummaryCard'
import DateRangePicker, { DateRange } from '@/components/DateRangePicker'

const DEFAULT_SYMBOL = 'BBRI'
const LAST_SYMBOL_STORAGE_KEY = 'market:lastSymbol'

function formatDateForApi(date: Date): string {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
}

function getInitialSymbol(): string {
    if (typeof window === 'undefined') return DEFAULT_SYMBOL

    const saved = window.localStorage.getItem(LAST_SYMBOL_STORAGE_KEY)?.trim().toUpperCase()
    if (!saved || saved.length < 3) return DEFAULT_SYMBOL
    return saved
}

export default function MarketPage() {
    const [selectedSymbol, setSelectedSymbol] = useState(getInitialSymbol)

    const defaultDateRange = useMemo<DateRange>(() => {
        const to = new Date()
        const from = new Date()
        from.setDate(to.getDate() - 6)
        return { from, to }
    }, [])

    const [brokerDateRange, setBrokerDateRange] = useState<DateRange>(defaultDateRange)
    const fromDate = formatDateForApi(brokerDateRange.from)
    const toDate = formatDateForApi(brokerDateRange.to)

    const handleSelectSymbol = (symbol: string) => {
        const normalized = symbol.trim().toUpperCase()
        if (normalized.length < 3) return

        setSelectedSymbol(normalized)
        if (typeof window !== 'undefined') {
            window.localStorage.setItem(LAST_SYMBOL_STORAGE_KEY, normalized)
        }
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold text-dark-100">📉 Market</h1>
                <p className="text-dark-400 mt-1 text-sm">
                    Cari kode saham lalu buka chart harga historis
                </p>
            </div>

            <StockSearchBar selectedSymbol={selectedSymbol} onSelect={handleSelectSymbol} />

            <div className="grid grid-cols-1 xl:grid-cols-[1fr_360px] gap-4 items-start">
                <StockChartComponent key={`chart-${selectedSymbol}`} symbol={selectedSymbol} />
                <OrderbookCard key={`ob-${selectedSymbol}`} symbol={selectedSymbol} />
            </div>

            <div className="space-y-3">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-xs text-dark-400">
                        Rentang broker summary dapat diubah untuk melihat akumulasi diam-diam (1 minggu - 3 bulan).
                    </p>
                    <DateRangePicker value={brokerDateRange} onChange={setBrokerDateRange} />
                </div>

                <BrokerSummaryCard
                    key={`broker-${selectedSymbol}-${fromDate}-${toDate}`}
                    symbol={selectedSymbol}
                    fromDate={fromDate}
                    toDate={toDate}
                />
            </div>
        </div>
    )
}
