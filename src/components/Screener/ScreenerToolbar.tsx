import { useScreenerStore } from '@/stores/screener-store'
import { Card } from '@/components'

export default function ScreenerToolbar() {
    const {
        filters,
        setFilters,
        setSearchText,
    } = useScreenerStore()

    const handleFilterChange = (field: string, value: any) => {
        setFilters({
            ...filters,
            [field]: value
        })
    }

    return (
        <Card className="p-6 space-y-4">
            <div>
                <h3 className="text-lg font-semibold text-dark-100 mb-4">🎯 Filter Data</h3>

                {/* Row 1: Data Source */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                    <div>
                        <label className="text-sm font-medium text-dark-300 mb-2 block">Kode Broker</label>
                        <input
                            type="text"
                            placeholder="cth. AK"
                            value={filters.brokerCode ?? ''}
                            onChange={(e) => handleFilterChange('brokerCode', e.target.value)}
                            className="w-full px-3 py-2 bg-dark-800 border border-dark-700 rounded text-dark-100 placeholder-dark-500 focus:outline-none focus:border-accent-green"
                        />
                    </div>

                    <div>
                        <label className="text-sm font-medium text-dark-300 mb-2 block">Acc/Dist</label>
                        <select
                            value={filters.accdist || 'ALL'}
                            onChange={(e) => handleFilterChange('accdist', e.target.value)}
                            className="w-full px-3 py-2 bg-dark-800 border border-dark-700 rounded text-dark-100 focus:outline-none focus:border-accent-green"
                        >
                            <option value="ALL">Semua</option>
                            <option value="Acc">Accumulation</option>
                            <option value="Dist">Distribution</option>
                            <option value="Neutral">Neutral</option>
                        </select>
                    </div>

                    <div>
                        <label className="text-sm font-medium text-dark-300 mb-2 block">Min Score</label>
                        <select
                            value={filters.minScore || '0'}
                            onChange={(e) => handleFilterChange('minScore', parseFloat(e.target.value))}
                            className="w-full px-3 py-2 bg-dark-800 border border-dark-700 rounded text-dark-100 focus:outline-none focus:border-accent-green"
                        >
                            <option value="0">Semua</option>
                            <option value="7">7+ High</option>
                            <option value="5">5+ Med</option>
                            <option value="3">3+ Low</option>
                        </select>
                    </div>

                    <div>
                        <label className="text-sm font-medium text-dark-300 mb-2 block">Min Frek Beli</label>
                        <input
                            type="number"
                            placeholder="0"
                            value={filters.minFrequency || ''}
                            onChange={(e) => handleFilterChange('minFrequency', e.target.value ? parseInt(e.target.value) : null)}
                            className="w-full px-3 py-2 bg-dark-800 border border-dark-700 rounded text-dark-100 placeholder-dark-500 focus:outline-none focus:border-accent-green"
                        />
                    </div>
                </div>

                {/* Row 2: Advanced Filters */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                        <label className="text-sm font-medium text-dark-300 mb-2 block">Min Net Value (jt)</label>
                        <input
                            type="number"
                            placeholder="Min"
                            value={filters.minNetValue || ''}
                            onChange={(e) => handleFilterChange('minNetValue', e.target.value ? parseFloat(e.target.value) : null)}
                            className="w-full px-3 py-2 bg-dark-800 border border-dark-700 rounded text-dark-100 placeholder-dark-500 focus:outline-none focus:border-accent-green"
                        />
                    </div>

                    <div>
                        <label className="text-sm font-medium text-dark-300 mb-2 block">Filter Broker (pisah koma)</label>
                        <input
                            type="text"
                            placeholder="AK,YP,BP"
                            value={filters.brokerList?.join(',') || ''}
                            onChange={(e) => handleFilterChange('brokerList', e.target.value ? e.target.value.split(',').map(b => b.trim()) : [])}
                            className="w-full px-3 py-2 bg-dark-800 border border-dark-700 rounded text-dark-100 placeholder-dark-500 focus:outline-none focus:border-accent-green"
                        />
                    </div>

                    <div>
                        <label className="text-sm font-medium text-dark-300 mb-2 block">Cari Saham</label>
                        <input
                            type="text"
                            placeholder="Cari kode saham..."
                            onChange={(e) => setSearchText(e.target.value)}
                            className="w-full px-3 py-2 bg-dark-800 border border-dark-700 rounded text-dark-100 placeholder-dark-500 focus:outline-none focus:border-accent-green"
                        />
                    </div>
                </div>
            </div>
        </Card>
    )
}
