import { useScreenerStore } from '@/stores/screener-store'
import { formatBigNumber, formatCurrency } from '@/services/api'
import { Card } from '@/components'

export default function ScreenerTable() {
    const { filteredResults } = useScreenerStore()

    if (!filteredResults || filteredResults.length === 0) {
        return (
            <Card className="p-6">
                <p className="text-dark-400 text-center">Tidak ada hasil screening. Coba ubah filter.</p>
            </Card>
        )
    }

    return (
        <Card className="overflow-x-auto">
            <table className="w-full text-sm">
                <thead className="bg-dark-900 border-b border-dark-700">
                    <tr>
                        <th className="px-4 py-3 text-left font-semibold text-dark-300">
                            KODE
                        </th>
                        <th className="px-4 py-3 text-right font-semibold text-dark-300">
                            CLOSE
                        </th>
                        <th className="px-4 py-3 text-right font-semibold text-dark-300">
                            SPREAD
                        </th>
                        <th className="px-4 py-3 text-right font-semibold text-dark-300">
                            NET VALUE
                        </th>
                        <th className="px-4 py-3 text-right font-semibold text-dark-300">
                            NET LOT
                        </th>
                        <th className="px-4 py-3 text-right font-semibold text-dark-300">
                            BUY FREQ
                        </th>
                        <th className="px-4 py-3 text-center font-semibold text-dark-300">FOREIGN</th>
                        <th className="px-4 py-3 text-center font-semibold text-dark-300">BROKERS</th>
                        <th className="px-4 py-3 text-center font-semibold text-dark-300">
                            ACC/DIST
                        </th>
                        <th className="px-4 py-3 text-right font-semibold text-dark-300">
                            SCORE
                        </th>
                    </tr>
                </thead>
                <tbody>
                    {filteredResults.map((row, idx) => {
                        const accdistColor = row.accdist === 'Acc' ? 'text-accent-green' : row.accdist === 'Dist' ? 'text-accent-red' : 'text-dark-400'

                        return (
                            <tr key={`${row.code}-${idx}`} className="border-b border-dark-800 hover:bg-dark-800 transition-colors">
                                <td className="px-4 py-3 font-semibold text-accent-green">{row.code}</td>
                                <td className="px-4 py-3 text-right text-dark-200">{formatCurrency(row.close || 0)}</td>
                                <td className="px-4 py-3 text-right text-dark-200">—</td>
                                <td className="px-4 py-3 text-right text-dark-200">{formatBigNumber(row.net_value || 0)}</td>
                                <td className="px-4 py-3 text-right text-dark-200">{formatBigNumber(row.net_lot || 0)}</td>
                                <td className="px-4 py-3 text-right text-dark-200">{row.buy_freq || 0}</td>
                                <td className="px-4 py-3 text-center text-dark-200">🌍</td>
                                <td className="px-4 py-3 text-center text-dark-200">—</td>
                                <td className={`px-4 py-3 text-center font-semibold ${accdistColor}`}>{row.accdist || '—'}</td>
                                <td className="px-4 py-3 text-right font-semibold text-accent-yellow">{(row.score || 0).toFixed(1)}</td>
                            </tr>
                        )
                    })}
                </tbody>
            </table>
        </Card>
    )
}
