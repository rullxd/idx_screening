import { MarketDetectorBroker } from '@/utils/broker-activity'
import { analyzeTapeReading } from '@/utils/tape-reading'
import { getBrokerTier } from '@/data/broker-tiers'
import { Card } from '@/components'
import { formatCurrency } from '@/utils/formatters'

export default function TapeReadingTable({ buyers, sellers }: { buyers: MarketDetectorBroker[]; sellers: MarketDetectorBroker[] }) {
    const combined = [...buyers.map((b) => ({ ...b, side: 'Buy' })), ...sellers.map((s) => ({ ...s, side: 'Sell' }))]

    return (
        <Card className="p-4">
            <h4 className="text-sm font-semibold text-dark-200 mb-3">Tape Reading — Bandar Bunglon Detector</h4>
            <div className="overflow-x-auto">
                <table className="w-full table-auto text-sm">
                    <thead>
                        <tr className="text-left text-xs text-dark-500 border-b border-dark-700">
                            <th className="py-2">Broker</th>
                            <th>Sisi</th>
                            <th className="text-right">Value (M)</th>
                            <th className="text-right">Freq</th>
                            <th className="text-right">Avg/Trade (jt)</th>
                            <th className="text-right">Kesimpulan</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-dark-700">
                        {combined.slice(0, 12).map((b, idx) => {
                            const tier = getBrokerTier(b.code)
                            const res = analyzeTapeReading(b.code, (b as any).side.toLowerCase(), b.value, b.freq, tier)
                            const labelClass = res.category === 'BANDAR_BUNGLON' ? 'bg-amber-900/20 text-amber-300 border border-amber-700/40' : res.category === 'INSTITUTION' ? 'bg-accent-green/10 text-accent-green border border-accent-green/30' : 'bg-dark-700 text-dark-200'
                            return (
                                <tr key={`${b.code}-${(b as any).side}`} className={`${idx % 2 === 0 ? 'bg-dark-800' : 'bg-dark-700'}`}>
                                    <td className="py-3 font-bold text-dark-100">{b.code}</td>
                                    <td className={res.side === 'buy' ? 'text-accent-green' : 'text-accent-red'}>{(b as any).side}</td>
                                    <td className="text-right font-mono text-dark-100">{formatCurrency(b.value)}</td>
                                    <td className="text-right">{b.freq}</td>
                                    <td className="text-right">{(res.avgPerTrade / 1_000_000).toFixed(1)}</td>
                                    <td className="text-right"><span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${labelClass}`}>{res.label}</span></td>
                                </tr>
                            )
                        })}
                    </tbody>
                </table>
            </div>
        </Card>
    )
}
