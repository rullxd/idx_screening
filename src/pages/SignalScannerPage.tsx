import { useState, useEffect, useCallback, useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import { fetchStockChart, fetchTrendingStocks } from '@/services/api'
import {
    analyzeStock,
    parseChartToCandles,
    StockSignalResult,
    TradingMode,
    TRADING_MODES,
    TradingModeConfig,
} from '@/utils/technical-signals'
import { Card } from '@/components'
import AnimatedSection from '@/components/AnimatedSection'
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
    { key: 'ALL', label: 'Semua', icon: '' },
    { key: 'BULLISH', label: 'Bullish', icon: '' },
    { key: 'BEARISH', label: 'Bearish', icon: '' },
    { key: 'OVERSOLD', label: 'Oversold', icon: '' },
    { key: 'OVERBOUGHT', label: 'Overbought', icon: '️' },
    { key: 'VOLUME_SPIKE', label: 'Volume Spike', icon: '' },
    { key: 'CROSSOVER', label: 'Crossover', icon: '️' },
]

const SCAN_CONCURRENCY = 3
const SCAN_BATCH_DELAY_MS = 500

export default function SignalScannerPage() {
    const [results, setResults] = useState<StockSignalResult[]>([])
    const [scanning, setScanning] = useState(false)
    const [progress, setProgress] = useState({ done: 0, total: 0 })
    const [filter, setFilter] = useState<FilterType>('ALL')
    const [sortBy, setSortBy] = useState<'score' | 'rsi' | 'change'>('score')
    const [expandedRow, setExpandedRow] = useState<string | null>(null)
    const [tradingMode, setTradingMode] = useState<TradingMode>('swing')
    const hasAutoScanned = useRef(false)
    const scanRunIdRef = useRef(0)

    const modeConfig: TradingModeConfig = TRADING_MODES[tradingMode]

    const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

    const isRateLimitError = (error: unknown) => {
        const err = error as any
        const code = String(err?.code || '')
        const message = String(err?.message || '')
        return code.includes('429') || message.includes('429')
    }

    const fetchChartWithRetry = useCallback(async (code: string, timeframe: string) => {
        let attempts = 0
        const maxAttempts = 3

        while (attempts < maxAttempts) {
            try {
                return await fetchStockChart(code, { timeframe })
            } catch (error) {
                attempts += 1
                if (!isRateLimitError(error) || attempts >= maxAttempts) {
                    throw error
                }

                // Backoff saat 429 agar scanner tetap lanjut dan tidak mengosongkan semua hasil
                await sleep(700 * attempts)
            }
        }

        return null
    }, [])

    // Fetch trending to get dynamic stock list
    const { data: trendingData } = useQuery({
        queryKey: ['signals', 'trending'],
        queryFn: () => fetchTrendingStocks({ limit: 10 }),
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
        return merged.slice(0, 18) // max 18 stocks untuk mode stabil anti-429
    }, [trendingData])

    const runScan = useCallback(async (mode?: TradingMode) => {
        const runId = scanRunIdRef.current + 1
        scanRunIdRef.current = runId
        const activeMode = mode ?? tradingMode
        const config = TRADING_MODES[activeMode]
        const stocks = getStockList()
        setScanning(true)
        setResults([])
        setProgress({ done: 0, total: stocks.length })

        const scannedResults: StockSignalResult[] = []
        let done = 0

        const scanOne = async (code: string): Promise<StockSignalResult | null> => {
            try {
                const chartData = await fetchChartWithRetry(code, config.timeframe)
                if (!chartData) return null

                const candles = parseChartToCandles(chartData)
                const analysis = analyzeStock(candles, activeMode)
                return analysis ? ({ ...analysis, code } as StockSignalResult) : null
            } catch (err) {
                console.warn(`[Scanner] Failed to scan ${code}:`, err)
                return null
            }
        }

        // Batch kecil: lebih cepat dari 1-by-1, tetap rendah risiko 429.
        for (let i = 0; i < stocks.length; i += SCAN_CONCURRENCY) {
            if (scanRunIdRef.current !== runId) return

            const batch = stocks.slice(i, i + SCAN_CONCURRENCY)
            const batchResults = await Promise.all(batch.map(scanOne))

            if (scanRunIdRef.current !== runId) return

            for (const result of batchResults) {
                if (result) scannedResults.push(result)
            }

            done += batch.length
            setProgress({ done, total: stocks.length })
            setResults([...scannedResults].sort((a, b) => b.overallScore - a.overallScore || b.confidenceScore - a.confidenceScore || a.code.localeCompare(b.code)))

            if (i + SCAN_CONCURRENCY < stocks.length) {
                await sleep(SCAN_BATCH_DELAY_MS)
            }
        }

        if (scanRunIdRef.current === runId) setScanning(false)
    }, [getStockList, tradingMode, fetchChartWithRetry])

    // Handle mode change: switch mode and auto-rescan
    const handleModeChange = useCallback((newMode: TradingMode) => {
        if (scanning) return // prevent switching during scan
        setTradingMode(newMode)
        // Clear old results and rescan
        setResults([])
        setExpandedRow(null)
        // Use setTimeout to allow state update before scan
        setTimeout(() => {
            runScan(newMode)
        }, 50)
    }, [scanning, runScan])

    // Auto-scan on mount
    useEffect(() => {
        if (hasAutoScanned.current) return
        hasAutoScanned.current = true
        runScan()
    }, []) // eslint-disable-line react-hooks/exhaustive-deps

    // Filter results
    const filteredResults = results.filter((r) => {
        if (filter === 'ALL') return true
        if (filter === 'BULLISH') return r.overallScore >= 2
        if (filter === 'BEARISH') return r.overallScore <= -2
        if (filter === 'OVERSOLD') return r.rsi <= modeConfig.rsiOversold
        if (filter === 'OVERBOUGHT') return r.rsi >= modeConfig.rsiOverbought
        if (filter === 'VOLUME_SPIKE') return r.signals.some((s) => s.type === 'VOLUME_SPIKE')
        if (filter === 'CROSSOVER') return r.signals.some((s) => s.type === 'GOLDEN_CROSS' || s.type === 'DEATH_CROSS')
        return true
    })

    // Sort results
    const sortedResults = [...filteredResults].sort((a, b) => {
        if (sortBy === 'score') return b.overallScore - a.overallScore || b.confidenceScore - a.confidenceScore || a.code.localeCompare(b.code)
        if (sortBy === 'rsi') return a.rsi - b.rsi || a.code.localeCompare(b.code)
        if (sortBy === 'change') return b.changePercent - a.changePercent || a.code.localeCompare(b.code)
        return a.code.localeCompare(b.code)
    })

    // Summary stats
    const bullishCount = results.filter((r) => r.overallScore >= 2).length
    const bearishCount = results.filter((r) => r.overallScore <= -2).length
    const oversoldCount = results.filter((r) => r.rsi <= modeConfig.rsiOversold).length
    const overboughtCount = results.filter((r) => r.rsi >= modeConfig.rsiOverbought).length
    const volumeSpikeCount = results.filter((r) => r.signals.some((s) => s.type === 'VOLUME_SPIKE')).length
    const crossoverCount = results.filter((r) => r.signals.some((s) => s.type === 'GOLDEN_CROSS' || s.type === 'DEATH_CROSS')).length

    return (
        <div className="space-y-6">
            {/* Header */}
            <AnimatedSection animation="fade-in-down" delay={0}>
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold text-dark-100"> Technical Signal Scanner</h1>
                        <p className="text-dark-400 text-sm mt-1">
                            Scan otomatis sinyal teknikal pada {results.length} saham — Mode: <span className="text-accent-green font-semibold">{modeConfig.label}</span>
                        </p>
                    </div>
                    <button
                        onClick={() => runScan()}
                        disabled={scanning}
                        className={clsx('btn-secondary', scanning && 'opacity-50 cursor-not-allowed')}
                    >
                        {scanning ? `Scanning ${progress.done}/${progress.total}...` : '⟳ Scan Ulang'}
                    </button>
                </div>
            </AnimatedSection>

            {/* Trading Mode Selector */}
            <AnimatedSection animation="fade-in-up" delay={50}>
                <Card className="p-4">
                    <div className="flex items-center gap-2 mb-3">
                        <span className="text-dark-400 text-xs font-semibold uppercase tracking-wider">Trading Mode</span>
                        {scanning && (
                            <span className="text-xs text-dark-500 italic">(tidak bisa ganti saat scanning)</span>
                        )}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        {(Object.values(TRADING_MODES) as TradingModeConfig[]).map((mode) => (
                            <button
                                key={mode.key}
                                onClick={() => handleModeChange(mode.key)}
                                disabled={scanning}
                                className={clsx(
                                    'relative p-4 rounded-xl border-2 text-left transition-all',
                                    tradingMode === mode.key
                                        ? 'border-accent-green bg-accent-green bg-opacity-10 shadow-[0_0_15px_rgba(0,229,160,0.1)]'
                                        : 'border-dark-700 bg-dark-850 hover:border-dark-500',
                                    scanning && 'opacity-50 cursor-not-allowed'
                                )}
                            >
                                {tradingMode === mode.key && (
                                    <div className="absolute top-2 right-2">
                                        <span className="relative flex h-2.5 w-2.5">
                                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent-green opacity-75"></span>
                                            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-accent-green"></span>
                                        </span>
                                    </div>
                                )}
                                <div className="text-lg font-bold text-dark-100 mb-1">{mode.label}</div>
                                <p className="text-dark-400 text-xs mb-3">{mode.description}</p>
                                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                                    <div className="text-dark-500">
                                        RSI: <span className="text-dark-300 font-mono">{mode.rsiPeriod}</span>
                                    </div>
                                    <div className="text-dark-500">
                                        EMA: <span className="text-dark-300 font-mono">{mode.emaFast}/{mode.emaSlow}</span>
                                    </div>
                                    <div className="text-dark-500">
                                        MACD: <span className="text-dark-300 font-mono">{mode.macdFast},{mode.macdSlow},{mode.macdSignalPeriod}</span>
                                    </div>
                                    <div className="text-dark-500">
                                        Vol Spike: <span className="text-dark-300 font-mono">{mode.volumeSpikeMultiplier}x</span>
                                    </div>
                                    {mode.useStochastic && (
                                        <div className="text-dark-500">
                                            Stoch: <span className="text-dark-300 font-mono">{mode.stochPeriod},{mode.stochSmooth}</span>
                                        </div>
                                    )}
                                    <div className="text-dark-500">
                                        Timeframe: <span className="text-dark-300 font-mono">{mode.timeframe}</span>
                                    </div>
                                </div>
                            </button>
                        ))}
                    </div>
                </Card>
            </AnimatedSection>

            {/* Summary Cards */}
            <AnimatedSection animation="fade-in-up" delay={100}>
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
            </AnimatedSection>

            {/* Filter Bar */}
            <AnimatedSection animation="fade-in-up" delay={150}>
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
            </AnimatedSection>

            {/* Loading / Scanning */}
            {scanning && results.length === 0 && (
                <Card className="overflow-hidden border border-dark-700">
                    <div className="p-4 bg-dark-800 flex items-center justify-between border-b border-dark-700">
                        <div className="flex items-center gap-2">
                            <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent-green opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-accent-green"></span>
                            </span>
                            <span className="text-sm font-semibold text-accent-green">Scanning ({modeConfig.label})...</span>
                        </div>
                        <span className="text-xs text-dark-300 bg-dark-700 px-2 py-1 rounded font-mono font-bold">
                            {progress.done} / {progress.total} Saham
                        </span>
                    </div>
                    <div className="w-full bg-dark-800 h-1.5 overflow-hidden">
                        <div
                            className="bg-accent-green h-full transition-all duration-300 shadow-[0_0_8px_#00e5a0]"
                            style={{ width: `${(progress.done / Math.max(progress.total, 1)) * 100}%` }}
                        />
                    </div>
                    <div className="p-4 space-y-4">
                        {Array.from({ length: 6 }).map((_, idx) => (
                            <div key={idx} className="flex items-center justify-between border-b border-dark-800 pb-3 last:border-0 last:pb-0">
                                <div className="flex items-center gap-3 w-1/4">
                                    <div className="h-8 w-8 bg-dark-800 rounded-full animate-pulse" />
                                    <div className="space-y-1">
                                        <div className="h-4 w-12 bg-dark-800 rounded animate-pulse" />
                                        <div className="h-3 w-20 bg-dark-800 rounded animate-pulse" />
                                    </div>
                                </div>
                                <div className="h-4 w-16 bg-dark-800 rounded animate-pulse" />
                                <div className="h-4 w-12 bg-dark-800 rounded animate-pulse" />
                                <div className="h-5 w-24 bg-dark-800 rounded-full animate-pulse" />
                                <div className="h-4 w-8 bg-dark-850 rounded animate-pulse" />
                            </div>
                        ))}
                    </div>
                </Card>
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
                                    <th className="px-4 py-3 text-center">RSI({modeConfig.rsiPeriod})</th>
                                    <th className="px-4 py-3 text-center">MACD</th>
                                    <th className="px-4 py-3 text-center">EMA Trend</th>
                                    {modeConfig.useStochastic && (
                                        <th className="px-4 py-3 text-center">Stoch</th>
                                    )}
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
                                        modeConfig={modeConfig}
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
                <p>
                    Mode: {modeConfig.label} | Timeframe: {modeConfig.timeframe} | RSI({modeConfig.rsiPeriod}), EMA({modeConfig.emaFast},{modeConfig.emaSlow}), MACD({modeConfig.macdFast},{modeConfig.macdSlow},{modeConfig.macdSignalPeriod})
                    {modeConfig.useStochastic && `, Stoch(${modeConfig.stochPeriod},${modeConfig.stochSmooth})`}
                </p>
                <p className="mt-1 text-dark-600">️ Sinyal teknikal bersifat referensi, bukan rekomendasi investasi</p>
            </div>
        </div>
    )
}

// ============= Signal Row Component =============

function SignalRow({
    result,
    expanded,
    onToggle,
    modeConfig,
}: {
    result: StockSignalResult
    expanded: boolean
    onToggle: () => void
    modeConfig: TradingModeConfig
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
        if (rsi <= modeConfig.rsiOversold) return 'text-accent-blue'
        if (rsi >= modeConfig.rsiOverbought) return 'text-accent-yellow'
        return 'text-dark-300'
    }

    const emaTrend = r.ema_fast > r.ema_slow ? 'UP' : r.ema_fast < r.ema_slow ? 'DOWN' : 'FLAT'
    const macdTrend = r.macdLine > r.macdSignal ? 'UP' : 'DOWN'

    const colSpan = modeConfig.useStochastic ? 9 : 8

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

                {/* EMA Trend */}
                <td className="px-4 py-3 text-center">
                    <span className={clsx(
                        'inline-block px-2 py-0.5 rounded text-xs font-bold',
                        emaTrend === 'UP' ? 'bg-green-900 bg-opacity-50 text-accent-green' : emaTrend === 'DOWN' ? 'bg-red-900 bg-opacity-50 text-accent-red' : 'bg-dark-700 text-dark-400'
                    )}>
                        {emaTrend === 'UP' ? '▲ Uptrend' : emaTrend === 'DOWN' ? '▼ Downtrend' : '— Flat'}
                    </span>
                </td>

                {/* Stochastic (only for scalping & intraday) */}
                {modeConfig.useStochastic && (
                    <td className="px-4 py-3 text-center">
                        {r.stochK != null ? (
                            <span className={clsx(
                                'font-mono text-xs font-bold',
                                r.stochK <= 20 ? 'text-accent-blue' : r.stochK >= 80 ? 'text-accent-yellow' : 'text-dark-300'
                            )}>
                                {r.stochK.toFixed(0)}/{r.stochD?.toFixed(0) ?? '-'}
                            </span>
                        ) : (
                            <span className="text-dark-600">—</span>
                        )}
                    </td>
                )}

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
                                        : s.type.includes('BEARISH') || s.type === 'DEATH_CROSS' || s.type === 'RSI_OVERBOUGHT' || s.type === 'MACD_BEARISH' || s.type === 'STOCHASTIC_OVERBOUGHT'
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
                        <span className="text-[10px] text-dark-600">Conf {r.confidenceScore}%</span>
                    </div>
                </td>
            </tr>

            {/* Expanded Detail Row */}
            {expanded && (
                <tr className="bg-dark-850">
                    <td colSpan={colSpan} className="px-6 py-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {/* Indicators */}
                            <div>
                                <h4 className="text-xs font-semibold text-dark-500 uppercase mb-2">Indikator ({r.tradingMode})</h4>
                                <div className="space-y-1 text-sm">
                                    <div className="flex justify-between">
                                        <span className="text-dark-400">RSI({modeConfig.rsiPeriod})</span>
                                        <span className={getRSIColor(r.rsi)}>{r.rsi.toFixed(1)}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-dark-400">EMA {modeConfig.emaFast}</span>
                                        <span className="text-dark-200">{r.ema_fast.toLocaleString('id-ID', { maximumFractionDigits: 0 })}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-dark-400">EMA {modeConfig.emaSlow}</span>
                                        <span className="text-dark-200">{r.ema_slow.toLocaleString('id-ID', { maximumFractionDigits: 0 })}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-dark-400">MACD({modeConfig.macdFast},{modeConfig.macdSlow},{modeConfig.macdSignalPeriod})</span>
                                        <span className={r.macdLine >= 0 ? 'text-accent-green' : 'text-accent-red'}>{r.macdLine.toFixed(1)}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-dark-400">Signal Line</span>
                                        <span className="text-dark-200">{r.macdSignal.toFixed(1)}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-dark-400">Confidence</span>
                                        <span className="text-dark-200">{r.confidenceScore}%</span>
                                    </div>
                                    {r.stochK != null && (
                                        <>
                                            <div className="flex justify-between">
                                                <span className="text-dark-400">Stoch %K</span>
                                                <span className={r.stochK <= 20 ? 'text-accent-blue' : r.stochK >= 80 ? 'text-accent-yellow' : 'text-dark-200'}>{r.stochK.toFixed(1)}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-dark-400">Stoch %D</span>
                                                <span className="text-dark-200">{r.stochD?.toFixed(1) ?? '—'}</span>
                                            </div>
                                        </>
                                    )}
                                </div>
                            </div>

                            {/* Volume */}
                            <div>
                                <h4 className="text-xs font-semibold text-dark-500 uppercase mb-2">Volume</h4>
                                <div className="space-y-1 text-sm">
                                    <div className="flex justify-between">
                                        <span className="text-dark-400">Volume Terakhir</span>
                                        <span className="text-dark-200">{(r.volume / 1e6).toFixed(1)}M</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-dark-400">Avg Volume ({modeConfig.volumeAvgPeriod}d)</span>
                                        <span className="text-dark-200">{(r.avgVolume / 1e6).toFixed(1)}M</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-dark-400">Vol Ratio</span>
                                        <span className={r.volume > r.avgVolume * modeConfig.volumeSpikeMultiplier ? 'text-purple-400 font-bold' : 'text-dark-200'}>
                                            {r.avgVolume > 0 ? (r.volume / r.avgVolume).toFixed(1) : '—'}x
                                        </span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-dark-400">Spike Threshold</span>
                                        <span className="text-dark-500">{modeConfig.volumeSpikeMultiplier}x</span>
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