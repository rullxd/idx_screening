import { Card, ErrorState, LoadingSpinner } from '@/components'
import { useBrokerRanking } from '@/hooks/use-queries'

interface BrokerRankingRow {
 broker_code?: string
 code?: string
 total_value?: number
 value?: number
}

interface NormalizedBroker {
 code: string
 value: number
}

function toNumber(value: unknown): number {
 const parsed = typeof value === 'string' ? Number.parseFloat(value) : Number(value)
 return Number.isFinite(parsed) ? parsed : 0
}

function readBrokerCode(item: BrokerRankingRow): string {
 return String(item.broker_code || item.code || '—').toUpperCase()
}

function readBrokerValue(item: BrokerRankingRow): number {
 return toNumber(item.total_value ?? item.value ?? 0)
}

export default function BrokerConcentrationRiskCard() {
 const { data, isLoading, error, refetch } = useBrokerRanking()

 if (isLoading) return <LoadingSpinner />
 if (error) {
 return <ErrorState title="Error" message="Failed to load broker concentration" onRetry={() => refetch()} />
 }

 const brokers = Array.isArray(data) ? data : (data?.data ?? [])
 const normalized: NormalizedBroker[] = brokers
 .map((item: BrokerRankingRow) => ({
 code: readBrokerCode(item),
 value: readBrokerValue(item),
 }))
 .filter((item: NormalizedBroker) => item.value > 0)
 .sort((a: NormalizedBroker, b: NormalizedBroker) => b.value - a.value)

 if (normalized.length === 0) {
 return (
 <Card className="p-5">
 <p className="text-sm text-dark-400">Broker concentration tidak tersedia.</p>
 </Card>
 )
 }

 const top3 = normalized.slice(0, 3)
 const top3Value = top3.reduce((sum: number, item: NormalizedBroker) => sum + item.value, 0)
 const totalValue = normalized.reduce((sum: number, item: NormalizedBroker) => sum + item.value, 0)
 const top3Share = totalValue > 0 ? (top3Value / totalValue) * 100 : 0

 const riskToneClass =
 top3Share >= 45 ? 'text-accent-red' : top3Share >= 30 ? 'text-yellow-400' : 'text-accent-green'
 const riskLabel = top3Share >= 45 ? 'Risiko tinggi' : top3Share >= 30 ? 'Risiko menengah' : 'Risiko rendah'

 return (
 <Card className="p-5">
 <div className="flex items-start justify-between gap-4">
 <div>
 <p className="text-sm text-dark-400">Broker Concentration Risk</p>
 <p className="text-2xl font-bold text-dark-100 mt-1">{top3Share.toFixed(1)}%</p>
 <p className={`text-xs mt-1 ${riskToneClass}`}>{riskLabel}</p>
 </div>

 <div className="text-right text-xs text-dark-400">
 <p>Top 3 broker</p>
 <p className="text-dark-200 mt-1">{top3.map((item: NormalizedBroker) => item.code).join(' · ')}</p>
 </div>
 </div>

 <div className="mt-4 rounded bg-dark-800 px-3 py-3 text-xs">
 <p className="text-dark-500">Konsentrasi likuiditas broker terbesar</p>
 <p className="text-dark-200 mt-1">Semakin tinggi angka ini, semakin rentan volatilitas saat broker besar keluar.</p>
 </div>
 </Card>
 )
}