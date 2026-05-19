import { useEffect } from 'react'
import { useScreening } from '@/hooks/use-queries'
import { useScreenerStore } from '@/stores/screener-store'
import { LoadingSpinner, ErrorState } from '@/components'
import ScreenerToolbar from '@/components/Screener/ScreenerToolbar'
import ScreenerSummaryCards from '@/components/Screener/ScreenerSummaryCards'
import ScreenerTable from '@/components/Screener/ScreenerTable'

export default function ScreenerPage() {
    const brokerCode = 'AK' // Default broker
    const { data, isLoading, error, refetch } = useScreening(brokerCode, {})
    const { setResults, applyFiltersAndSearch } = useScreenerStore()

    useEffect(() => {
        if (data) {
            console.log('[ScreenerPage] data received:', typeof data, Array.isArray(data) ? data.length : 'not array')
            // Transformation already done in api.ts, data should be array
            const screeningData = Array.isArray(data) ? data : []
            console.log('[ScreenerPage] setting results:', screeningData.length, 'items')
            setResults(screeningData)
            applyFiltersAndSearch()
        }
    }, [data, setResults, applyFiltersAndSearch])

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold text-dark-100">🎯 Bandar Screener</h1>

            {/* Toolbar */}
            <ScreenerToolbar />

            {/* Summary Cards */}
            {!isLoading && !error && <ScreenerSummaryCards />}

            {/* Loading/Error States */}
            {isLoading && <LoadingSpinner />}
            {error && <ErrorState title="Error" message="Failed to load screening data" onRetry={() => refetch()} />}

            {/* Table */}
            {!isLoading && !error && <ScreenerTable />}
        </div>
    )
}
