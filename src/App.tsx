import { Routes, Route, Navigate, useLocation } from 'react-router-dom' // Import Routes & Route
import Layout from '@/components/Layout'
import DashboardPage from '@/pages/DashboardPage'
import MarketPage from '@/pages/MarketPage'
import BrokerActivityPage from '@/pages/BrokerActivityPage'
import SignalScannerPage from '@/pages/SignalScannerPage'
import AlertsPage from '@/pages/AlertsPage'
import HeatmapPage from '@/pages/HeatmapPage'
import { useMonitorSignificantChanges } from '@/hooks/use-monitor'

export default function App() {
    const location = useLocation()
    const shouldPauseGlobalMonitor =
        location.pathname.startsWith('/signals')
        || location.pathname.startsWith('/market')

    // Jalankan pemantauan perubahan pasar secara global
    useMonitorSignificantChanges({ paused: shouldPauseGlobalMonitor })

    return (
        <Layout>
            <Routes>
                <Route path="/" element={<DashboardPage />} />
                <Route path="/dashboard" element={<DashboardPage />} />
                <Route path="/market" element={<MarketPage />} />
                <Route path="/screener" element={<Navigate to="/broker-activity" replace />} />
                <Route path="/broker-activity" element={<BrokerActivityPage />} />
                <Route path="/signals" element={<SignalScannerPage />} />
                <Route path="/alerts" element={<AlertsPage />} />
                <Route path="/heatmap" element={<HeatmapPage />} />
                {/* Fallback route */}
                <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
        </Layout>
    )
}
