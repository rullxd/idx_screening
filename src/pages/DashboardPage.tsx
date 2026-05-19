import IHSGHeroCard from '@/components/Dashboard/IHSGHeroCard'
import IHSGChartComponent from '@/components/Dashboard/IHSGChartComponent'
import TrendingStocksGrid from '@/components/Dashboard/TrendingStocksGrid'

export default function DashboardPage() {
    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold text-dark-100">📊 Dashboard</h1>

            {/* IHSG Hero Card */}
            <IHSGHeroCard />

            {/* IHSG Intraday Chart */}
            <IHSGChartComponent />

            {/* Trending Stocks Grid */}
            <TrendingStocksGrid />
        </div>
    )
}
