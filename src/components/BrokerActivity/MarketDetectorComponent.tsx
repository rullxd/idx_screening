import { useState } from 'react'
import { useMarketDetector } from '@/hooks/use-queries'
import { formatBigNumber, formatCurrency } from '@/services/api'
import { Card, LoadingSpinner, ErrorState } from '@/components'

export default function MarketDetectorComponent() {
    const [stockCode, setStockCode] = useState('BNBR')
    const { data, isLoading, error, refetch } = useMarketDetector(stockCode)

    const handleSearch = () => {
        refetch()
    }

    if (isLoading) return <LoadingSpinner />
    if (error) return <ErrorState title="Error" message="Failed to load market detector data" onRetry={handleSearch} />

    // Handle response structure from Stockbit API
    const responseData = data?.data || data || {}
    const detectors = Array.isArray(responseData)
        ? responseData
        : (responseData.marketdetectors || responseData.bandar_detectors || responseData.detectors || [])

    return (
        <div className="space-y-6">
            {/* Search Bar */}
            <Card className="p-4 flex gap-3">
                <input
                    type="text"
                    value={stockCode}
                    onChange={(e) => setStockCode(e.target.value.toUpperCase())}
                    placeholder="Masukkan kode saham..."
                    className="flex-1 px-4 py-2 bg-dark-800 border border-dark-700 rounded text-dark-100 placeholder-dark-500 focus:outline-none focus:border-accent-green"
                />
                <button
                    onClick={handleSearch}
                    className="px-6 py-2 bg-accent-green text-dark-950 font-semibold rounded hover:bg-opacity-90 transition"
                >
                    Search
                </button>
            </Card>

            {/* Results */}
            {!detectors || detectors.length === 0 ? (
                <Card className="p-6">
                    <p className="text-dark-400 text-center">Tidak ada data market detector untuk {stockCode}</p>
                </Card>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {detectors.map((detector: any, idx: number) => (
                        <Card key={idx} className="p-4 border-l-4 border-accent-green">
                            <div className="mb-3">
                                <p className="text-sm text-dark-500">Broker</p>
                                <p className="font-bold text-dark-100">{detector.broker_code || detector.broker || '—'}</p>
                            </div>

                            <div className="grid grid-cols-2 gap-3 text-sm">
                                <div>
                                    <p className="text-dark-500 text-xs">Net Flow</p>
                                    <p className={`font-semibold ${(detector.net_flow || 0) >= 0 ? 'text-accent-green' : 'text-accent-red'}`}>
                                        {formatCurrency(detector.net_flow || 0)}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-dark-500 text-xs">Transaction</p>
                                    <p className="font-semibold text-dark-200">{detector.transaction_count || detector.count || 0}</p>
                                </div>
                                <div>
                                    <p className="text-dark-500 text-xs">Volume</p>
                                    <p className="font-semibold text-dark-200">{formatBigNumber(detector.volume || 0)}</p>
                                </div>
                                <div>
                                    <p className="text-dark-500 text-xs">Value</p>
                                    <p className="font-semibold text-dark-200">{formatCurrency(detector.value || 0)}</p>
                                </div>
                            </div>

                            <p className="text-xs text-dark-500 mt-3 border-t border-dark-700 pt-3">
                                {detector.date || detector.timestamp || '—'}
                            </p>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    )
}
