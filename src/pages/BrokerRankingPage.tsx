import { useEffect } from 'react'
import { useBrokerRanking } from '@/hooks/use-queries'
import { useBrokerRankingStore } from '@/stores/broker-ranking-store'
import LoadingSpinner from '@/components/LoadingSpinner'
import ErrorState from '@/components/ErrorState'
import RankingSummaryCards from '@/components/BrokerRanking/SummaryCards'
import RankingChart from '@/components/BrokerRanking/Chart'
import TopBrokersList from '@/components/BrokerRanking/TopBrokersList'

export default function BrokerRankingPage() {
    // Fetch data
    const { data, isLoading, error, refetch } = useBrokerRanking()

    // State management
    const { setBrokers, brokers, topBuyers, topSellers, topBuyer, topSeller, foreignNetFlow, localNetFlow } =
        useBrokerRankingStore()

    // Sync data to store
    useEffect(() => {
        if (data && data.length > 0) {
            setBrokers(data)
        }
    }, [data, setBrokers])

    if (isLoading) {
        return (
            <div className="space-y-6">
                <h1 className="text-3xl font-bold text-dark-100">📈 Broker Ranking</h1>
                <LoadingSpinner message="Memuat data broker..." />
            </div>
        )
    }

    if (error) {
        return (
            <div className="space-y-6">
                <h1 className="text-3xl font-bold text-dark-100">📈 Broker Ranking</h1>
                <ErrorState
                    title="Gagal Memuat Data"
                    message={error.message || 'Terjadi kesalahan saat memuat data broker'}
                    onRetry={() => refetch()}
                />
            </div>
        )
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-dark-100">📈 Broker Ranking</h1>
                    <p className="text-dark-400 text-sm mt-1">Peringkat broker berdasarkan aktivitas hari ini</p>
                </div>
                <button
                    onClick={() => refetch()}
                    className="btn-secondary"
                    aria-label="Refresh ranking data"
                >
                    ⟳ Refresh
                </button>
            </div>

            {/* Summary Cards */}
            <RankingSummaryCards
                topBuyer={topBuyer}
                topSeller={topSeller}
                foreignNetFlow={foreignNetFlow}
                localNetFlow={localNetFlow}
            />

            {/* Chart */}
            {brokers.length > 0 && <RankingChart brokers={brokers} />}

            {/* Top Lists */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <TopBrokersList title="🟢 Top 10 Buyer" brokers={topBuyers} type="buy" />
                <TopBrokersList title="🔴 Top 10 Seller" brokers={topSellers} type="sell" />
            </div>

            {/* Footer Info */}
            <div className="text-center py-4 text-dark-500 text-sm">
                <p>Total {brokers.length} broker | Diperbarui otomatis setiap 5 menit</p>
            </div>
        </div>
    )
}
