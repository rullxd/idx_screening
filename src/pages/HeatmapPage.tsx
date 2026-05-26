import { useScreening } from '@/hooks/use-queries'
import { Card } from '@/components'
import AnimatedSection from '@/components/AnimatedSection'

export default function HeatmapPage() {
 const { data } = useScreening('AK', {})
 const responseData = data?.data || data || {}
 const results = Array.isArray(responseData) ? responseData : ((responseData as any)?.list || [])

 // Create heatmap grid - 10x10 of random colors based on score
 const getScoreColor = (score: number) => {
 if (score >= 8) return 'bg-accent-green'
 if (score >= 6) return 'bg-accent-blue'
 if (score >= 4) return 'bg-accent-yellow'
 return 'bg-accent-red'
 }

 // Calculate summary stats
 const scores = results.map((r: any) => r.score || 0).filter((s: number) => s > 0)
 const avgScore = scores.length > 0 ? scores.reduce((a: number, b: number) => a + b, 0) / scores.length : 0
 const maxScore = scores.length > 0 ? Math.max(...scores) : 0
 const minScore = scores.length > 0 ? Math.min(...scores) : 0
 const strongCount = results.filter((r: any) => (r.score || 0) >= 8).length
 const highCount = results.filter((r: any) => (r.score || 0) >= 6 && (r.score || 0) < 8).length
 const mediumCount = results.filter((r: any) => (r.score || 0) >= 4 && (r.score || 0) < 6).length
 const weakCount = results.filter((r: any) => (r.score || 0) < 4).length

 return (
 <div className="space-y-6">
 <AnimatedSection animation="fade-in-down" delay={0}>
 <h1 className="text-3xl font-bold text-dark-100"> Heatmap Bandar Score</h1>
 </AnimatedSection>

 {/* Summary Stats */}
 <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2 text-xs">
 <Card className="p-3 border-l-4 border-accent-green">
 <p className="text-dark-500 text-xs font-semibold">AVG SCORE</p>
 <p className="text-xl font-bold text-accent-green mt-1">{avgScore.toFixed(1)}</p>
 </Card>
 <Card className="p-3 border-l-4 border-accent-blue">
 <p className="text-dark-500 text-xs font-semibold">MAX</p>
 <p className="text-xl font-bold text-accent-blue mt-1">{maxScore.toFixed(1)}</p>
 </Card>
 <Card className="p-3 border-l-4 border-accent-red">
 <p className="text-dark-500 text-xs font-semibold">MIN</p>
 <p className="text-xl font-bold text-accent-red mt-1">{minScore.toFixed(1)}</p>
 </Card>
 <Card className="p-3 border-l-4 border-accent-green">
 <p className="text-dark-500 text-xs font-semibold">STRONG</p>
 <p className="text-xl font-bold text-accent-green mt-1">{strongCount}</p>
 </Card>
 <Card className="p-3 border-l-4 border-accent-blue">
 <p className="text-dark-500 text-xs font-semibold">HIGH</p>
 <p className="text-xl font-bold text-accent-blue mt-1">{highCount}</p>
 </Card>
 <Card className="p-3 border-l-4 border-accent-yellow">
 <p className="text-dark-500 text-xs font-semibold">MEDIUM</p>
 <p className="text-xl font-bold text-accent-yellow mt-1">{mediumCount}</p>
 </Card>
 <Card className="p-3 border-l-4 border-accent-red">
 <p className="text-dark-500 text-xs font-semibold">WEAK</p>
 <p className="text-xl font-bold text-accent-red mt-1">{weakCount}</p>
 </Card>
 </div>

 {/* Legend */}
 <div className="flex gap-4 text-sm">
 <div className="flex items-center gap-2">
 <div className="w-4 h-4 bg-accent-green rounded"></div>
 <span className="text-dark-300">8+ Strong</span>
 </div>
 <div className="flex items-center gap-2">
 <div className="w-4 h-4 bg-accent-blue rounded"></div>
 <span className="text-dark-300">6-8 High</span>
 </div>
 <div className="flex items-center gap-2">
 <div className="w-4 h-4 bg-accent-yellow rounded"></div>
 <span className="text-dark-300">4-6 Medium</span>
 </div>
 <div className="flex items-center gap-2">
 <div className="w-4 h-4 bg-accent-red rounded"></div>
 <span className="text-dark-300">&lt;4 Weak</span>
 </div>
 </div>

 {/* Heatmap Grid */}
 <Card className="p-6">
 <div className="grid grid-cols-5 md:grid-cols-10 gap-2">
 {results.slice(0, 100).map((stock: any, idx: number) => (
 <div
 key={idx}
 className={`w-full aspect-square rounded flex flex-col items-center justify-center cursor-pointer hover:scale-110 transition ${getScoreColor(
 stock.score || 0
 )}`}
 title={`${stock.code} | Score: ${(stock.score || 0).toFixed(1)} | ${stock.accdist || '—'}`}
 >
 <span className="text-[9px] font-bold text-dark-950 leading-tight text-center px-0.5 truncate w-full text-center">
 {stock.code.substring(0, 4)}
 </span>
 <span className="text-[8px] text-dark-950/70 leading-none">
 {(stock.score || 0).toFixed(0)}
 </span>
 </div>
 ))}
 </div>
 </Card>

 <p className="text-dark-500 text-sm">Showing top {Math.min(100, results.length)} stocks by score</p>
 </div>
 )
}
