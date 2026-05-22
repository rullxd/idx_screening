import IHSGHeroCard from '@/components/Dashboard/IHSGHeroCard'
import IHSGChartComponent from '@/components/Dashboard/IHSGChartComponent'
import TrendingStocksGrid from '@/components/Dashboard/TrendingStocksGrid'
import MarketBreadthCard from '@/components/Dashboard/MarketBreadthCard'
import ForeignPressureCard from '@/components/Dashboard/ForeignPressureCard'
import BandarAvgDiscountCard from '@/components/Dashboard/BandarAvgDiscountCard'
import SmartMoneyWatchlistCard from '@/components/Dashboard/SmartMoneyWatchlistCard'
import BrokerConcentrationRiskCard from '@/components/Dashboard/BrokerConcentrationRiskCard'

export default function DashboardPage() {
    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold text-dark-100">📊 Dashboard</h1>

            {/* IHSG Hero Card */}
            <IHSGHeroCard />

            {/* Market quick pulse cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-12 gap-4">
                <div className="xl:col-span-4">
                    <MarketBreadthCard />
                </div>
                <div className="xl:col-span-4">
                    <ForeignPressureCard />
                </div>
                <div className="xl:col-span-4">
                    <BandarAvgDiscountCard />
                </div>
                <div className="xl:col-span-8">
                    <SmartMoneyWatchlistCard />
                </div>
                <div className="xl:col-span-4">
                    <BrokerConcentrationRiskCard />
                </div>
            </div>

            {/* IHSG Intraday Chart */}
            <IHSGChartComponent />

            {/* Trending Stocks Grid */}
            <TrendingStocksGrid />
        </div>
    )
}
