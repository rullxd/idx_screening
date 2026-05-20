import { useState, useEffect, useCallback } from 'react'
import { useQuery } from '@tanstack/react-query'
import { fetchStockChart, fetchTrendingStocks } from '@/services/api'
import { analyzeStock, parseChartToCandles, StockSignalResult } from '@/utils/technical-signals'
import { Card, LoadingSpinner } from '@/components'
import clsx from 'clsx'

// Default stock list to scan
const DEFAULT_STOCKS = [
    'BBCA', 'BBRI', 'BMRI', 'TLKM', 'ASII', 'UNVR', 'HMSP', 'BBNI',
    'ICBP', 'INDF', 'GGRM', 'KLBF', 'PGAS', 'SMGR', 'JSMR',
    'ADRO', 'PTBA', 'ANTM', 'INCO', 'MDKA', 'BRIS', 'ARTO',
    'GOTO', 'BREN', 'AMMN', 'CPIN', 'MAPI', 'ERAA', 'ACES', 'ESSA',
]

type FilterType = 'ALL' | 'BULLISH' | 'BEARISH' | 'OVERSOLD' | 'OVERBOUGHT' | 'VOLUME_SPIKE' | 'CROSSOVER'

const FILTERS: { key: FilterType; label: string; icon: string }[] = [
    { key: 'ALL', label: 'Semua', icon: '📋' },
    { key: 'BULLISH', label: 'Bullish', icon: '🟢' },
    { key: 'BEARISH', label: 'Bearish', icon: '🔴' },
    { key: 'OVERSOLD', label: 'Oversold', icon: '💎' },
    { key: 'OVERBOUGHT', label: 'Overbought', icon: '⚠️' },
    { key: 'VOLUME_SPIKE', label: 'Volume Spike', icon: '⚡' },
    { key: 'CROSSOVER', label: 'Crossover', icon: '✂️' },
]

export default function SignalScannerPage() {
    const [results, setResults] = useState<StockSignalResult[]>([])
    const [scanning, setScanning] = useState(false)
    const [progress, setProgress] = useState({ done: 0, total: 0 })
    const [filter, setFilter] = useState<FilterType>('ALL')
    const [sortBy, setSortBy] = useState<'score' | 'rsi' | 'change'>('score')
    const [expandedRow, setExpandedRow] = useState<string | null>(null)

    // Fetch trending to get dynamic stock list
    const { data: trendingData } = useQuery({
        queryKey: ['signals', 'trending'],
        queryFn: () => fetchTrendingStocks({ limit: 20 }),
        staleTime: 5 * 60 * 1000,
    })

    const getStockList = useCallback((): string[] => {
        const trendingCodes: string[] = []
        try {
            const raw = trendingData as any
            const items = raw?.data || raw?.stocks || raw || []
            if (Array.isArray(items)) {
                items.forEach((item: any) => {
                    const code = item?.code || item?.symbol || item?.stock_code
                    if (code && !trendingCodes.includes(code)) trendingCodes.push(code)
                })
            }
        } catch { /* ignore */ }
        // Merge trending with defaults, deduplicate
        const merged = [...new Set([...trendingCodes, ...DEFAULT_STOCKS])]
        return merged.slice(0, 40) // max 40 stocks
    }, [trendingData])

    const runScan = useCallback(async () => {
        const stocks = getStockList()
        setScanning(true)
        setResults([])
        setProgress({ done: 0, total: stocks.length })

        const scannedResults: StockSignalResult[] = []

        // Scan in batches of 5 to avoid overwhelming API
        for (let i = 0; i < stocks.length; i += 5) {
            const batch = stocks.slice(i, i + 5)
            const promises = batch.map(async (code) => {
                try {
                    const chartData = await fetchStockChart(code, { timeframe: '3m' })
                    const candles = parseChartToCandles(chartData)
                    const analysis = analyzeStock(candles)
                    if (analysis) {
                        return { ...analysis, code } as StockSignalResult
                    }
                } catch (err) {
                    console.warn(`[Scanner] Failed to scan ${code}:`, err)
                }
                return null
            })

            const batchResults = await Promise.all(promises)
            batchResults.forEach((r) => {
                if (r) scannedResults.push(r)
            })

            setProgress({ done: Math.min(i + 5, stocks.length), total: stocks.length })
            setResults([...scannedResults])
        }

        setScanning(false)
    }, [getStockList])

    // Auto-scan on mount
    useEffect(() => {
        runScan()
    }, []) // eslint-disable-line react-hooks/exhaustive-deps

    // Filter results
    const filteredResults = results.filter((r) => {
        if (filter === 'ALL') return true
        if (filter === 'BULLISH') return r.overallScore >= 2
        if (filter === 'BEARISH') return r.overallScore <= -2
        if (filter === 'OVERSOLD') return r.rsi <= 30
        if (filter === 'OVERBOUGHT') return r.rsi >= 70
        if (filter === 'VOLUME_SPIKE') return r.signals.some((s) => s.type === 'VOLUME_SPIKE')
        if (filter === 'CROSSOVER') return r.signals.some((s) => s.type === 'GOLDEN_CROSS' || s.type === 'DEATH_CROSS')
        return true
    })

    // Sort results
    const sortedResults = [...filteredResults].sort((a, b) => {
        if (sortBy === 'score') return b.overallScore - a.overallScore
        if (sortBy === 'rsi') return a.rsi - b.rsi
        if (sortBy === 'change') return b.changePercent - a.changePercent
        return 0
    })

    // Summary stats
    const bullishCount = results.filter((r) => r.overallScore >= 2).length
    const bearishCount = results.filter((r) => r.overallScore <= -2).length
    const oversoldCount = results.filter((r) => r.rsi <= 30).length
    const overboughtCount = results.filter((r) => r.rsi >= 70).length
    const volumeSpikeCount = results.filter((r) => r.signals.some((s) => s.type === 'VOLUME_SPIKE')).length
    const crossoverCount = results.filter((r) => r.signals.some((s) => s.type === 'GOLDEN_CROSS' || s.type === 'DEATH_CROSS')).length

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-dark-100">📡 Technical Signal Scanner</h1>
                    <p className="text-dark-400 text-sm mt-1">
                        Scan otomatis Golden Cross, RSI, MACD, Volume Spike pada {results.length} saham
                    </p>
                </div>
                <button
                    onClick={runScan}
                    disabled={scanning}
                    className={clsx('btn-secondary', scanning && 'opacity-50 cursor-not-allowed')}
                >
                    {scanning ? `Scanning ${progress.done}/${progress.total}...` : '⟳ Scan Ulang'}
                </button>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                <Card className="p-3 border-l-4 border-dark-600 cursor-pointer hover:border-accent-blue transition-colors" onClick={() => setFilter('ALL')}>
                    <p className="text-dark-500 text-xs font-semibold">TOTAL SCAN</p>
                    <p className="text-2xl font-bold text-dark-100 mt-1">{results.length}</p>
                </Card>
                <Card className="p-3 border-l-4 border-accent-green cursor-pointer hover:border-green-400 transition-colors" onClick={() => setFilter('BULLISH')}>
                    <p className="text-dark-500 text-xs font-semibold">BULLISH</p>
                    <p className="text-2xl font-bold text-accent-green mt-1">{bullishCount}</p>
                </Card>
                <Card className="p-3 border-l-4 border-accent-red cursor-pointer hover:border-red-400 transition-colors" onClick={() => setFilter('BEARISH')}>
                    <p className="text-dark-500 text-xs font-semibold">BEARISH</p>
                    <p className="text-2xl font-bold text-accent-red mt-1">{bearishCount}</p>
                </Card>
                <Card className="p-3 border-l-4 border-accent-blue cursor-pointer hover:border-blue-400 transition-colors" onClick={() => setFilter('OVERSOLD')}>
                    <p className="text-dark-500 text-xs font-semibold">RSI OVERSOLD</p>
                    <p className="text-2xl font-bold text-accent-blue mt-1">{oversoldCount}</p>
                </Card>
                <Card className="p-3 border-l-4 border-accent-yellow cursor-pointer hover:border-yellow-400 transition-colors" onClick={() => setFilter('OVERBOUGHT')}>
                    <p className="text-dark-500 text-xs font-semibold">RSI OVERBOUGHT</p>
                    <p className="text-2xl font-bold text-accent-yellow mt-1">{overboughtCount}</p>
                </Card>
                <Card className="p-3 border-l-4 border-purple-500 cursor-pointer hover:border-purple-400 transition-colors" onClick={() => setFilter('VOLUME_SPIKE')}>
                    <p className="text-dark-500 text-xs font-semibold">VOL SPIKE</p>
                    <p className="text-2xl font-bold text-purple-400 mt-1">{volumeSpikeCount}</p>
                </Card>
            </div>

            {/* Filter Bar */}
            <div className="flex flex-wrap gap-2">
                {FILTERS.map((f) => (
                    <button
                        key={f.key}
                        onClick={() => setFilter(f.key)}
                        className={clsx(
                            'px-3 py-1.5 rounded-lg text-sm font-medium transition-all',
                            filter === f.key
                                ? 'bg-accent-green bg-opacity-20 text-accent-green border border-accent-green'
                                : 'bg-dark-800 text-dark-400 border border-dark-700 hover:border-dark-500'
                        )}
                    >
                        {f.icon} {f.label}
                        {f.key === 'CROSSOVER' && crossoverCount > 0 && (
                            <span className="ml-1 bg-accent-green bg-opacity-30 px-1.5 rounded text-xs">{crossoverCount}</span>
                        )}
                    </button>
                ))}

                {/* Sort */}
                <div className="ml-auto flex items-center gap-2">
                    <span className="text-dark-500 text-xs">Sort:</span>
                    {(['score', 'rsi', 'change'] as const).map((s) => (
                        <button
                            key={s}
                            onClick={() => setSortBy(s)}
                            className={clsx(
                                'px-2 py-1 rounded text-xs font-medium',
                                sortBy === s ? 'bg-dark-700 text-dark-100' : 'text-dark-500 hover:text-dark-300'
                            )}
                        >
                            {s === 'score' ? 'Score' : s === 'rsi' ? 'RSI' : 'Change%'}
                        </button>
                    ))}
                </div>
            </div>

            {/* Loading / Scanning */}
            {scanning && results.length === 0 && (
                <LoadingSpinner message={`Scanning ${progress.done}/${progress.total} saham...`} />
            )}

            {/* Results Table */}
            {sortedResults.length > 0 && (
                <Card className="overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="bg-dark-800 text-dark-400 text-xs uppercase">
                                    <th className="px-4 py-3 text-left">Saham</th>
                                    <th className="px-4 py-3 text-right">Harga</th>
                                    <th className="px-4 py-3 text-right">Change</th>
                                    <th className="px-4 py-3 text-center">RSI</th>
                                    <th className="px-4 py-3 text-center">MACD</th>
                                    <th className="px-4 py-3 text-center">SMA Trend</th>
                                    <th className="px-4 py-3 text-left">Sinyal</th>
                                    <th className="px-4 py-3 text-center">Score</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-dark-800">
                                {sortedResults.map((r) => (
                                    <SignalRow
                                        key={r.code}
                                        result={r}
                                        expanded={expandedRow === r.code}
                                        onToggle={() => setExpandedRow(expandedRow === r.code ? null : r.code)}
                                    />
                                ))}
                            </tbody>
                        </table>
                    </div>
                </Card>
            )}

            {/* Empty state */}
            {!scanning && sortedResults.length === 0 && results.length > 0 && (
                <Card className="p-8 text-center">
                    <p className="text-dark-400 text-lg">Tidak ada saham yang cocok dengan filter "{FILTERS.find(f => f.key === filter)?.label}"</p>
                    <button onClick={() => setFilter('ALL')} className="mt-3 text-accent-green text-sm hover:underline">
                        Tampilkan semua
                    </button>
                </Card>
            )}

            {/* Footer */}
            <div className="text-center py-4 text-dark-500 text-xs">
                <p>Data berdasarkan chart 3 bulan terakhir | Indikator: RSI(14), SMA(20,50), MACD(12,26,9)</p>
                <p className="mt-1 text-dark-600">⚠️ Sinyal teknikal bersifat referensi, bukan rekomendasi investasi</p>
            </div>
        </div>
    )
}

// ============= Signal Row Component =============

function SignalRow({
    result,
    expanded,
    onToggle,
}: {
    result: StockSignalResult
    expanded: boolean
    onToggle: () => void
}) {
    const r = result

    const getScoreColor = (score: number) => {
        if (score >= 4) return 'text-accent-green bg-accent-green'
        if (score >= 2) return 'text-green-400 bg-green-400'
        if (score >= 1) return 'text-green-300 bg-green-300'
        if (score === 0) return 'text-dark-400 bg-dark-400'
        if (score >= -1) return 'text-orange-300 bg-orange-300'
        if (score >= -3) return 'text-accent-red bg-red-400'
        return 'text-red-500 bg-red-500'
    }

    const getRSIColor = (rsi: number) => {
        if (rsi <= 30) return 'text-accent-blue'
        if (rsi >= 70) return 'text-accent-yellow'
        return 'text-dark-300'
    }

    const smaTrend = r.sma20 > r.sma50 ? 'UP' : r.sma20 < r.sma50 ? 'DOWN' : 'FLAT'
    const macdTrend = r.macdLine > r.macdSignal ? 'UP' : 'DOWN'

    return (
        <>
            <tr
                className="hover:bg-dark-850 cursor-pointer transition-colors"
                onClick={onToggle}
            >
                {/* Stock Code */}
                <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                        <span className="font-bold text-dark-100">{r.code}</span>
                        {r.signals.length > 0 && (
                            <span className="bg-dark-700 text-dark-300 text-xs px-1.5 py-0.5 rounded">
                                {r.signals.length} sinyal
                            </span>
                        )}
                    </div>
                </td>

                {/* Price */}
                <td className="px-4 py-3 text-right font-mono text-dark-200">
                    {r.price.toLocaleString('id-ID')}
                </td>

                {/* Change */}
                <td className={clsx('px-4 py-3 text-right font-mono', r.changePercent >= 0 ? 'text-accent-green' : 'text-accent-red')}>
                    {r.changePercent >= 0 ? '+' : ''}{r.changePercent.toFixed(2)}%
                </td>

                {/* RSI */}
                <td className="px-4 py-3 text-center">
                    <span className={clsx('font-mono font-bold', getRSIColor(r.rsi))}>
                        {r.rsi.toFixed(0)}
                    </span>
                </td>

                {/* MACD */}
                <td className="px-4 py-3 text-center">
                    <span className={clsx(
                        'inline-block px-2 py-0.5 rounded text-xs font-bold',
                        macdTrend === 'UP' ? 'bg-green-900 bg-opacity-50 text-accent-green' : 'bg-red-900 bg-opacity-50 text-accent-red'
                    )}>
                        {macdTrend === 'UP' ? '▲' : '▼'}
                    </span>
                </td>

                {/* SMA Trend */}
                <td className="px-4 py-3 text-center">
                    <span className={clsx(
                        'inline-block px-2 py-0.5 rounded text-xs font-bold',
                        smaTrend === 'UP' ? 'bg-green-900 bg-opacity-50 text-accent-green' : smaTrend === 'DOWN' ? 'bg-red-900 bg-opacity-50 text-accent-red' : 'bg-dark-700 text-dark-400'
                    )}>
                        {smaTrend === 'UP' ? '▲ Uptrend' : smaTrend === 'DOWN' ? '▼ Downtrend' : '— Flat'}
                    </span>
                </td>

                {/* Signals */}
                <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                        {r.signals.slice(0, 3).map((s, i) => (
                            <span
                                key={i}
                                className={clsx(
                                    'text-xs px-1.5 py-0.5 rounded whitespace-nowrap',
                                    s.strength === 'STRONG'
                                        ? 'bg-accent-green bg-opacity-20 text-accent-green border border-accent-green border-opacity-30'
                                        : s.type.includes('BEARISH') || s.type === 'DEATH_CROSS' || s.type === 'RSI_OVERBOUGHT' || s.type === 'MACD_BEARISH'
                                            ? 'bg-red-900 bg-opacity-30 text-red-400 border border-red-800'
                                            : 'bg-dark-700 text-dark-300'
                                )}
                            >
                                {s.label}
                            </span>
                        ))}
                        {r.signals.length > 3 && (
                            <span className="text-xs text-dark-500">+{r.signals.length - 3}</span>
                        )}
                    </div>
                </td>

                {/* Score */}
                <td className="px-4 py-3 text-center">
                    <div className="flex flex-col items-center gap-1">
                        <span className={clsx('font-bold text-lg', getScoreColor(r.overallScore).split(' ')[0])}>
                            {r.overallScore > 0 ? '+' : ''}{r.overallScore}
                        </span>
                        <span className="text-xs text-dark-500">{r.overallLabel}</span>
                    </div>
                </td>
            </tr>

            {/* Expanded Detail Row */}
            {expanded && (
                <tr className="bg-dark-850">
                    <td colSpan={8} className="px-6 py-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {/* Indicators */}
                            <div>
                                <h4 className="text-xs font-semibold text-dark-500 uppercase mb-2">Indikator</h4>
                                <div className="space-y-1 text-sm">
                                    <div className="flex justify-between">
                                        <span className="text-dark-400">RSI(14)</span>
                                        <span className={getRSIColor(r.rsi)}>{r.rsi.toFixed(1)}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-dark-400">SMA 20</span>
                                        <span className="text-dark-200">{r.sma20.toLocaleString('id-ID', { maximumFractionDigits: 0 })}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-dark-400">SMA 50</span>
                                        <span className="text-dark-200">{r.sma50.toLocaleString('id-ID', { maximumFractionDigits: 0 })}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-dark-400">MACD Line</span>
                                        <span className={r.macdLine >= 0 ? 'text-accent-green' : 'text-accent-red'}>{r.macdLine.toFixed(1)}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-dark-400">Signal Line</span>
                                        <span className="text-dark-200">{r.macdSignal.toFixed(1)}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Volume */}
                            <div>
                                <h4 className="text-xs font-semibold text-dark-500 uppercase mb-2">Volume</h4>
                                <div className="space-y-1 text-sm">
                                    <div className="flex justify-between">
                                        <span className="text-dark-400">Volume Hari Ini</span>
                                        <span className="text-dark-200">{(r.volume / 1e6).toFixed(1)}M</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-dark-400">Avg Volume (20d)</span>
                                        <span className="text-dark-200">{(r.avgVolume / 1e6).toFixed(1)}M</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-dark-400">Vol Ratio</span>
                                        <span className={r.volume > r.avgVolume * 1.5 ? 'text-purple-400 font-bold' : 'text-dark-200'}>
                                            {r.avgVolume > 0 ? (r.volume / r.avgVolume).toFixed(1) : '—'}x
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* All Signals */}
                            <div>
                                <h4 className="text-xs font-semibold text-dark-500 uppercase mb-2">Semua Sinyal ({r.signals.length})</h4>
                                <div className="space-y-2">
                                    {r.signals.length === 0 && (
                                        <p className="text-dark-500 text-sm italic">Tidak ada sinyal signifikan</p>
                                    )}
                                    {r.signals.map((s, i) => (
                                        <div key={i} className="text-sm">
                                            <span className="font-medium">{s.label}</span>
                                            <p className="text-dark-500 text-xs mt-0.5">{s.description}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </td>
                </tr>
            )}
        </>
    )
}