import { Routes, Route, Navigate } from 'react-router-dom' // Import Routes & Route
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

    return (
        <Layout>
            <Routes>
                <Route path="/" element={<DashboardPage />} />
                <Route path="/dashboard" element={<DashboardPage />} />
                <Route path="/market" element={<MarketPage />} />
                <Route path="/screener" element={<ScreenerPage />} />
                <Route path="/broker-activity" element={<BrokerActivityPage />} />
                <Route path="/broker-ranking" element={<BrokerRankingPage />} />
                <Route path="/alerts" element={<AlertsPage />} />
                <Route path="/heatmap" element={<HeatmapPage />} />
                {/* Fallback route */}
                <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
        </Layout>
    )
}
