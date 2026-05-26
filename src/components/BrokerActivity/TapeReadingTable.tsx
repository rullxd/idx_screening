import { MarketDetectorBroker } from '@/utils/broker-activity'
import { analyzeTapeReading } from '@/utils/tape-reading'
import { getBrokerTier } from '@/data/broker-tiers'
import { Card } from '@/components'
import { formatCurrency } from '@/utils/formatters'

export default function TapeReadingTable({ buyers, sellers }: { buyers: MarketDetectorBroker[]; sellers: MarketDetectorBroker[] }) {
 const rows = buildTapeRows(buyers, sellers)

 return (
 <Card className="p-4">
 <h4 className="text-sm font-semibold text-dark-200 mb-3">Tape Reading — Bandar Bunglon Detector</h4>
 <div className="overflow-x-auto">
 <table className="w-full table-auto text-sm">
 <thead>
 <tr className="text-left text-xs text-dark-500 border-b border-dark-700">
 <th className="py-2">Broker</th>
  <th className="text-right text-accent-green">Value<br />(buy)</th>
  <th className="text-right text-accent-green">Freq<br />(buy)</th>
  <th className="text-right text-accent-green">Avg/Trade (jt)<br />(buy)</th>
  <th className="text-right text-accent-red">Value<br />(sell)</th>
  <th className="text-right text-accent-red">Freq<br />(sell)</th>
  <th className="text-right text-accent-red">Avg/Trade (jt)<br />(sell)</th>
  <th className="text-right">Kesimpulan</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-dark-700">
  {rows.slice(0, 12).map((row, idx) => {
  const mainResult = row.buyResult?.isSuspicious ? row.buyResult : row.sellResult?.isSuspicious ? row.sellResult : row.buyResult || row.sellResult
  const labelClass = mainResult?.category === 'BANDAR_BUNGLON' ? 'bg-amber-900/20 text-amber-300 border border-amber-700/40' : mainResult?.category === 'INSTITUTION' ? 'bg-accent-green/10 text-accent-green border border-accent-green/30' : 'bg-dark-700 text-dark-200'
 return (
  <tr key={row.code} className={`${idx % 2 === 0 ? 'bg-dark-800' : 'bg-dark-700'}`}>
  <td className="py-3 font-bold text-dark-100">{row.code}</td>
  <td className="text-right font-mono text-accent-green">{formatMillion(row.buy?.value)}</td>
  <td className="text-right text-accent-green">{formatFreq(row.buy?.freq)}</td>
  <td className="text-right text-accent-green">{formatAvgTrade(row.buyResult?.avgPerTradeMillion)}</td>
  <td className="text-right font-mono text-accent-red">{formatMillion(row.sell?.value)}</td>
  <td className="text-right text-accent-red">{formatFreq(row.sell?.freq)}</td>
  <td className="text-right text-accent-red">{formatAvgTrade(row.sellResult?.avgPerTradeMillion)}</td>
  <td className="text-right"><span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${labelClass}`}>{mainResult?.label ?? '-'}</span></td>
 </tr>
 )
 })}
 </tbody>
 </table>
 </div>
 </Card>
 )
}

function buildTapeRows(buyers: MarketDetectorBroker[], sellers: MarketDetectorBroker[]) {
 const byBroker = new Map<string, { code: string; buy?: MarketDetectorBroker; sell?: MarketDetectorBroker }>()

 buyers.forEach((buyer) => {
  byBroker.set(buyer.code, { ...(byBroker.get(buyer.code) || { code: buyer.code }), buy: buyer })
 })

 sellers.forEach((seller) => {
  byBroker.set(seller.code, { ...(byBroker.get(seller.code) || { code: seller.code }), sell: seller })
 })

 return Array.from(byBroker.values())
  .map((row) => {
   const tier = getBrokerTier(row.code)
   const buyResult = row.buy ? analyzeTapeReading(row.code, 'buy', row.buy.value, row.buy.freq, tier) : undefined
   const sellResult = row.sell ? analyzeTapeReading(row.code, 'sell', row.sell.value, row.sell.freq, tier) : undefined

   return {
    ...row,
    buyResult,
    sellResult,
    sortValue: Math.max(row.buy?.value ?? 0, row.sell?.value ?? 0),
   }
  })
  .sort((a, b) => b.sortValue - a.sortValue)
}

function formatMillion(value?: number): string {
 if (!value) return '-'
 return formatCurrency(value)
}

function formatFreq(value?: number): string {
 if (!value) return '-'
 return value.toLocaleString('id-ID')
}

function formatAvgTrade(value?: number): string {
 if (!value) return '-'
 if (value >= 1_000) return `${(value / 1_000).toFixed(2)}B`
 return `${value.toFixed(1)}M`
}
