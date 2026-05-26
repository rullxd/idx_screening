import { useScreenerStore } from '@/stores/screener-store'
import { Card } from '@/components'
import { ScreenerRow } from './ScreenerRow'

export default function ScreenerTable() {
 const { filteredResults } = useScreenerStore()

 if (!filteredResults || filteredResults.length === 0) {
 return (
 <Card className="p-6">
 <p className="text-dark-400 text-center">
 Tidak ada hasil screening. Coba ubah filter atau kode broker.
 </p>
 </Card>
 )
 }

 return (
 <Card className="overflow-x-auto">
 <table className="w-full text-sm">
 <thead className="bg-dark-900 border-b border-dark-700 sticky top-0 z-10">
 <tr>
 <th className="px-4 py-3 text-left font-semibold text-dark-300 text-xs uppercase tracking-wide">
 Kode
 </th>
 <th className="px-4 py-3 text-right font-semibold text-dark-300 text-xs uppercase tracking-wide">
 Harga
 </th>
 <th className="px-4 py-3 text-right font-semibold text-dark-300 text-xs uppercase tracking-wide">
 Perubahan
 </th>
 <th className="px-4 py-3 text-right font-semibold text-dark-300 text-xs uppercase tracking-wide">
 Net Value
 </th>
 <th className="px-4 py-3 text-right font-semibold text-dark-300 text-xs uppercase tracking-wide">
 Net Lot
 </th>
 <th className="px-4 py-3 text-right font-semibold text-dark-300 text-xs uppercase tracking-wide">
 Frek Beli
 </th>
 <th className="px-4 py-3 text-center font-semibold text-dark-300 text-xs uppercase tracking-wide">
 Acc/Dist
 </th>
 <th className="px-4 py-3 text-center font-semibold text-dark-300 text-xs uppercase tracking-wide">
 Chart
 </th>
 </tr>
 </thead>
 <tbody>
 {filteredResults.map((row, idx) => (
 <ScreenerRow key={`${row.code}-${idx}`} row={row} />
 ))}
 </tbody>
 </table>

 <div className="px-4 py-2.5 border-t border-dark-800 text-xs text-dark-500 flex items-center justify-between">
 <span>{filteredResults.length} saham · Harga & chart dari data live market</span>
 <span className="text-dark-600">Chart intraday 1D</span>
 </div>
 </Card>
 )
}
