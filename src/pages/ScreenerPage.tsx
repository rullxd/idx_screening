import { useEffect } from 'react'
import { useScreening } from '@/hooks/use-queries'
import { useScreenerStore } from '@/stores/screener-store'
import { LoadingSpinner, ErrorState } from '@/components'
import ScreenerToolbar from '@/components/Screener/ScreenerToolbar'
import ScreenerSummaryCards from '@/components/Screener/ScreenerSummaryCards'
import ScreenerTable from '@/components/Screener/ScreenerTable'

export default function ScreenerPage() {
    const { filters, setResults, applyFiltersAndSearch } = useScreenerStore()
    // Ambil brokerCode dari filter, default ke 'AK'
    const brokerCode = filters.brokerCode?.trim().toUpperCase() || 'AK'
    const { data, isLoading, error, refetch } = useScreening(brokerCode, filters)

    useEffect(() => {
        if (data) {
            console.log('[ScreenerPage] data received:', typeof data, Array.isArray(data) ? data.length : 'not array')
            const screeningData = Array.isArray(data) ? data : []
            console.log('[ScreenerPage] setting results:', screeningData.length, 'items')
            setResults(screeningData)
            applyFiltersAndSearch()
        }
    }, [data, setResults, applyFiltersAndSearch])

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold text-dark-100">🎯 Bandar Screener</h1>
                <p className="text-dark-400 text-sm mt-1">
                    Broker aktif: <strong className="text-accent-green">{brokerCode}</strong>
                    {isLoading && <span className="ml-2 text-dark-500 animate-pulse">memuat…</span>}
                </p>
            </div>

            {/* Toolbar */}
            <ScreenerToolbar />

            {/* Summary Cards */}
            {!isLoading && !error && <ScreenerSummaryCards />}

            {/* Loading/Error States */}
            {isLoading && <LoadingSpinner />}
            {error && <ErrorState title="Gagal Memuat Data" message="Tidak dapat memuat data screening" onRetry={() => refetch()} />}

            {/* Table */}
            {!isLoading && !error && <ScreenerTable />}
        </div>
    )
}
