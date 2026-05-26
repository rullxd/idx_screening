import { MarketDetectorBroker } from '@/utils/broker-activity'
import { formatCurrency } from '@/utils/formatters'
import { Card } from '@/components'
import BrokerTierBadge from './BrokerTierBadge'

export default function NetFlowTable({ buyers, sellers }: { buyers: MarketDetectorBroker[]; sellers: MarketDetectorBroker[] }) {
 const sellMap = new Map(sellers.map((s) => [s.code, s]))
 const buyMap = new Map(buyers.map((b) => [b.code, b]))

 const codes = Array.from(new Set([...buyers.map((b) => b.code), ...sellers.map((s) => s.code)]))

 const rows = codes.map((code) => {
 const b = buyMap.get(code)
 const s = sellMap.get(code)
 const buyValue = b?.value ?? 0
 const sellValue = s?.value ?? 0
 const net = buyValue - sellValue
 const investorType = (b || s)?.investorType || 'Lokal'
 return { code, buyValue, sellValue, net, investorType }
 }).sort((a, b) => Math.abs(b.net) - Math.abs(a.net))

 return (
 <Card className="p-4">
 <h4 className="text-sm font-semibold text-dark-200 mb-3">NET Flow per Broker (Top Overlap)</h4>
 <div className="overflow-x-auto">
 <table className="w-full table-auto text-sm">
 <thead>
 <tr className="text-left text-xs text-dark-500 border-b border-dark-700">
 <th className="py-2 w-24">Broker</th>
 <th className="w-28">Kasta</th>
 <th className="w-28">Type API</th>
 <th className="text-right w-28">Buy (M)</th>
 <th className="text-right w-28">Sell (M)</th>
 <th className="text-right w-28">NET (M)</th>
 <th className="text-right w-28">Status</th>
 </tr>
 </thead>
 <tbody>
 {rows.slice(0, 12).map((r, idx) => (
 <tr key={r.code} className={`align-middle ${idx % 2 === 0 ? 'bg-dark-800' : 'bg-dark-700'} rounded-lg`}>
 <td className="py-3 font-bold text-dark-100">{r.code}</td>
 <td><BrokerTierBadge brokerCode={r.code} /></td>
 <td className="text-dark-400 text-[12px]">{r.investorType}</td>
 <td className="text-right font-mono text-dark-100">{formatCurrency(r.buyValue)}</td>
 <td className="text-right font-mono text-dark-100">{formatCurrency(r.sellValue)}</td>
 <td className={`text-right font-semibold ${r.net >= 0 ? 'text-accent-green' : 'text-accent-red'}`}>{r.net >= 0 ? '+' : ''}{formatCurrency(r.net)}</td>
 <td className="text-right text-[13px]">
 <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${r.net >= 0 ? 'bg-accent-green/10 text-accent-green border border-accent-green/30' : 'bg-accent-red/10 text-accent-red border border-accent-red/30'}`}>
 {r.net >= 0 ? 'Net Buy' : 'Net Sell'}
 </span>
 </td>
 </tr>
 ))}
 </tbody>
 </table>
 </div>
 </Card>
 )
}
