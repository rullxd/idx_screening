import { useState } from 'react'
import StockSearchBar from '@/components/Market/StockSearchBar'
import StockChartComponent from '@/components/Market/StockChartComponent'
import OrderbookCard from '@/components/Market/OrderbookCard'

const DEFAULT_SYMBOL = 'BBRI'

export default function MarketPage() {
    const [selectedSymbol, setSelectedSymbol] = useState(DEFAULT_SYMBOL)

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold text-dark-100">📉 Market</h1>
                <p className="text-dark-400 mt-1 text-sm">
                    Cari kode saham lalu buka chart harga historis
                </p>
            </div>

            <StockSearchBar selectedSymbol={selectedSymbol} onSelect={setSelectedSymbol} />

            <div className="grid grid-cols-1 xl:grid-cols-[1fr_360px] gap-4 items-start">
                <StockChartComponent key={`chart-${selectedSymbol}`} symbol={selectedSymbol} />
                <OrderbookCard key={`ob-${selectedSymbol}`} symbol={selectedSymbol} />
            </div>
        </div>
    )
}
