import AnimatedSection from '@/components/AnimatedSection'
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
            <AnimatedSection animation="fade-in-down" delay={0}>
                <h1 className="text-3xl font-bold text-dark-100"> Dashboard</h1>
            </AnimatedSection>

            {/* IHSG Summary + Chart */}
            <AnimatedSection animation="scale-in" delay={80}>
                <IHSGChartComponent />
            </AnimatedSection>

            {/* Market quick pulse cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-12 gap-4">
                <AnimatedSection animation="fade-in-up" delay={120} className="xl:col-span-4">
                    <MarketBreadthCard />
                </AnimatedSection>
                <AnimatedSection animation="fade-in-up" delay={180} className="xl:col-span-4">
                    <ForeignPressureCard />
                </AnimatedSection>
                <AnimatedSection animation="fade-in-up" delay={240} className="xl:col-span-4">
                    <BandarAvgDiscountCard />
                </AnimatedSection>
                <AnimatedSection animation="fade-in-up" delay={300} className="xl:col-span-8">
                    <SmartMoneyWatchlistCard />
                </AnimatedSection>
                <AnimatedSection animation="fade-in-up" delay={360} className="xl:col-span-4">
                    <BrokerConcentrationRiskCard />
                </AnimatedSection>
            </div>

            {/* Trending Stocks Grid */}
            <AnimatedSection animation="fade-in-up" delay={150}>
                <TrendingStocksGrid />
            </AnimatedSection>
        </div>
    )
}