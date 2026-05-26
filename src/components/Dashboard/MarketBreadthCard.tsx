import { useTrendingStocks } from '@/hooks/use-queries'
import { Card, ErrorState, LoadingSpinner } from '@/components'

function toPercentValue(stock: any): number {
 const raw = stock?.percent ?? stock?.change_percent ?? stock?.percentage ?? 0
 const parsed = Number(typeof raw === 'string' ? raw.replace('%', '') : raw)
 return Number.isFinite(parsed) ? parsed : 0
}

export default function MarketBreadthCard() {
 const { data, isLoading, error, refetch } = useTrendingStocks()

 if (isLoading) return <LoadingSpinner />
 if (error) return <ErrorState title="Error" message="Failed to load market breadth" onRetry={() => refetch()} />

 const trending = Array.isArray(data)
 ? data
 : (data?.data?.trending || data?.trending || data?.data || [])

 if (!Array.isArray(trending) || trending.length === 0) {
 return (
 <Card>
 <div className="text-sm text-dark-400">Market Breadth tidak tersedia.</div>
 </Card>
 )
 }

 const advance = trending.filter((s: any) => toPercentValue(s) > 0).length
 const decline = trending.filter((s: any) => toPercentValue(s) < 0).length
 const flat = trending.length - advance - decline
 const ratioText = `${advance}:${decline}`
 const breadthScore = decline === 0 ? advance : advance / decline

 const toneClass =
 breadthScore > 1.2
 ? 'text-accent-green'
 : breadthScore < 0.8
 ? 'text-accent-red'
 : 'text-accent-blue'

 return (
 <Card className="p-5">
 <div className="flex items-start justify-between gap-4">
 <div>
 <p className="text-sm text-dark-400">Market Breadth</p>
 <p className="text-2xl font-bold text-dark-100 mt-1">A:D {ratioText}</p>
 <p className={`text-xs mt-1 ${toneClass}`}>
 {breadthScore > 1.2 ? 'Breadth sehat' : breadthScore < 0.8 ? 'Breadth melemah' : 'Breadth netral'}
 </p>
 </div>

 <div className="text-right text-xs text-dark-400">
 <p>Total {trending.length} saham</p>
 </div>
 </div>

 <div className="grid grid-cols-3 gap-2 mt-4 text-xs">
 <div className="bg-dark-800 rounded px-2 py-2">
 <p className="text-dark-500">Naik</p>
 <p className="font-semibold text-accent-green">{advance}</p>
 </div>
 <div className="bg-dark-800 rounded px-2 py-2">
 <p className="text-dark-500">Turun</p>
 <p className="font-semibold text-accent-red">{decline}</p>
 </div>
 <div className="bg-dark-800 rounded px-2 py-2">
 <p className="text-dark-500">Flat</p>
 <p className="font-semibold text-dark-200">{flat}</p>
 </div>
 </div>
 </Card>
 )
}