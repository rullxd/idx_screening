import { useScreenerStore } from '@/stores/screener-store'
import { formatCurrency } from '@/utils/formatters'
import { Card } from '@/components'

export default function ScreenerSummaryCards() {
 const { filteredResults } = useScreenerStore()

 const totalAcc = filteredResults.filter(r => r.accdist === 'Acc').length
 const totalDist = filteredResults.filter(r => r.accdist === 'Dist').length
 const totalNeutral = filteredResults.filter(r => r.accdist === 'Neutral').length
 const totalNetBuy = filteredResults.reduce((sum: number, r: any) => sum + (r.net_value || 0), 0)
 const avgNetValue = filteredResults.length > 0 ? totalNetBuy / filteredResults.length : 0
 const totalBrokers = new Set(filteredResults.flatMap((r: any) => r.brokers || [])).size

 return (
 <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 text-xs">
 <Card className="p-3 border-l-4 border-accent-green">
 <p className="text-dark-500 text-xs font-semibold">ACC</p>
 <p className="text-xl font-bold text-accent-green mt-1">{totalAcc}</p>
 <p className="text-dark-500 text-xs mt-1">{((totalAcc / filteredResults.length) * 100).toFixed(0)}%</p>
 </Card>

 <Card className="p-3 border-l-4 border-accent-red">
 <p className="text-dark-500 text-xs font-semibold">DIST</p>
 <p className="text-xl font-bold text-accent-red mt-1">{totalDist}</p>
 <p className="text-dark-500 text-xs mt-1">{((totalDist / filteredResults.length) * 100).toFixed(0)}%</p>
 </Card>

 <Card className="p-3 border-l-4 border-accent-yellow">
 <p className="text-dark-500 text-xs font-semibold">NEUTRAL</p>
 <p className="text-xl font-bold text-accent-yellow mt-1">{totalNeutral}</p>
 <p className="text-dark-500 text-xs mt-1">{((totalNeutral / filteredResults.length) * 100).toFixed(0)}%</p>
 </Card>

 <Card className="p-3 border-l-4 border-accent-blue">
 <p className="text-dark-500 text-xs font-semibold">TOTAL NET BUY</p>
 <p className="text-xl font-bold text-accent-blue mt-1">{formatCurrency(totalNetBuy)}</p>
 <p className="text-dark-500 text-xs mt-1">semua saham</p>
 </Card>

 <Card className="p-3 border-l-4 border-accent-cyan">
 <p className="text-dark-500 text-xs font-semibold">RATA-RATA NET</p>
 <p className="text-xl font-bold text-accent-cyan mt-1">{formatCurrency(avgNetValue)}</p>
 <p className="text-dark-500 text-xs mt-1">per saham</p>
 </Card>

 <Card className="p-3 border-l-4 border-dark-600">
 <p className="text-dark-500 text-xs font-semibold">SCREENED</p>
 <p className="text-xl font-bold text-dark-100 mt-1">{filteredResults.length}</p>
 <p className="text-dark-500 text-xs mt-1">{totalBrokers} broker aktif</p>
 </Card>
 </div>
 )
}
