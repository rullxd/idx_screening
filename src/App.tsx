import { useMemo } from 'react'
import { useUIStore } from '@/stores/ui-store'
import Layout from '@/components/Layout'
import DashboardPage from '@/pages/DashboardPage'
import MarketPage from '@/pages/MarketPage'
import ScreenerPage from '@/pages/ScreenerPage'
import BrokerActivityPage from '@/pages/BrokerActivityPage'
import BrokerRankingPage from '@/pages/BrokerRankingPage'
import AlertsPage from '@/pages/AlertsPage'
import HeatmapPage from '@/pages/HeatmapPage'
import { useMonitorSignificantChanges } from '@/hooks/use-monitor'

export default function App() {
    // Jalankan pemantauan perubahan pasar secara global
    useMonitorSignificantChanges()

    const currentPage = useUIStore((state) => state.currentPage)

    const PageComponent = useMemo(() => {
        switch (currentPage) {
            case 'dashboard':
                return DashboardPage
            case 'market':
                return MarketPage
            case 'screener':
                return ScreenerPage
            case 'broker-activity':
                return BrokerActivityPage
            case 'broker-ranking':
                return BrokerRankingPage
            case 'alerts':
                return AlertsPage
            case 'heatmap':
                return HeatmapPage
            default:
                return DashboardPage
        }
    }, [currentPage])

    return (
        <Layout>
            <PageComponent />
        </Layout>
    )
}
