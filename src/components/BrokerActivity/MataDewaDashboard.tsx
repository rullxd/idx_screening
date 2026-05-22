import { useEffect, useMemo, useState } from 'react'
import clsx from 'clsx'
import Card from '@/components/Card'
import { useMataDewaDashboard } from '@/hooks/use-queries'
import { useAlertStore } from '@/stores/alert-store'
import { formatCurrency } from '@/utils/formatters'
import { MataDewaAnalysis } from '@/utils/mata-dewa'

const DEFAULT_SYMBOL = 'BBCA'
const LAST_SYMBOL_STORAGE_KEY = 'market:lastSymbol'

function getLastSearchedSymbol(): string {
    if (typeof window === 'undefined') return DEFAULT_SYMBOL

    const saved = window.localStorage.getItem(LAST_SYMBOL_STORAGE_KEY)?.trim().toUpperCase()
    if (!saved || saved.length < 3) return DEFAULT_SYMBOL
    return saved
}

function compact(value: number): string {
    return formatCurrency(value).replace('Rp', '').trim()
}

function percent(value: number): string {
    return `${Math.round(value * 100)}%`
}

function verdictClass(verdict: MataDewaAnalysis['verdict']): string {
    if (verdict === 'STRONG_BUY') return 'bg-accent-green/15 text-accent-green border-accent-green/40'
    if (verdict === 'BUY') return 'bg-green-900/20 text-green-400 border-green-700/40'
    if (verdict === 'DANGER') return 'bg-accent-red/15 text-accent-red border-accent-red/40'
    return 'bg-dark-800 text-dark-300 border-dark-700'
}

function signalClass(tone: string): string {
    if (tone === 'bullish') return 'border-accent-green/30 bg-accent-green/10 text-accent-green'
    if (tone === 'bearish') return 'border-accent-red/30 bg-accent-red/10 text-accent-red'
    if (tone === 'warning') return 'border-amber-600/30 bg-amber-900/20 text-amber-300'
    return 'border-dark-700 bg-dark-800 text-dark-300'
}

export default function MataDewaDashboard() {
    const [days, setDays] = useState(20)
    const initialSymbol = useMemo(() => getLastSearchedSymbol(), [])
    const [inputSymbol, setInputSymbol] = useState(initialSymbol)
    const [submittedSymbol, setSubmittedSymbol] = useState(initialSymbol)
    const [selectedSymbol, setSelectedSymbol] = useState<string | null>(null)
    const customWatchlist = useAlertStore((state) => state.settings.customWatchlist)
    const activeSymbol = useMemo(
        () => (submittedSymbol.trim() || DEFAULT_SYMBOL).toUpperCase(),
        [submittedSymbol]
    )
    const symbols = useMemo(() => [activeSymbol], [activeSymbol])
    const query = useMataDewaDashboard(symbols, { days })
    const analyses = query.data ?? []
    const selected = analyses.find((item) => item.symbol === selectedSymbol) || analyses[0]

    const submitSymbol = (value: string) => {
        const next = value.trim().toUpperCase()
        if (next.length < 3 || next === activeSymbol) return

        setSubmittedSymbol(next)
        setSelectedSymbol(null)
        window.localStorage.setItem(LAST_SYMBOL_STORAGE_KEY, next)
    }

    useEffect(() => {
        const timer = window.setTimeout(() => submitSymbol(inputSymbol), 800)
        return () => window.clearTimeout(timer)
    }, [inputSymbol])

    return (
        <div className="space-y-5">
            <Card className="overflow-hidden border-accent-green/20 bg-gradient-to-br from-dark-900 via-dark-900 to-emerald-950/30">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-accent-green">Mata Dewa</p>
                        <h2 className="mt-2 text-2xl font-black text-dark-100">Dashboard Bandar Summary Terpadu</h2>
                        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-dark-400">
                            Ranking watchlist dengan Composite Bandar Score, AVG cost tracker, silent accumulation,
                            smart money flow, fake volume, fake foreign, persistence, dan footprint z-score.
                        </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        <input
                            value={inputSymbol}
                            onChange={(event) => {
                                const next = event.target.value.toUpperCase()
                                setInputSymbol(next)
                            }}
                            onKeyDown={(event) => {
                                if (event.key === 'Enter') submitSymbol(inputSymbol)
                            }}
                            onBlur={() => submitSymbol(inputSymbol)}
                            placeholder={initialSymbol}
                            className="w-28 rounded-lg border border-dark-700 bg-dark-950 px-3 py-2 text-sm font-bold text-dark-100 outline-none transition placeholder:text-dark-600 focus:border-accent-green"
                        />
                        {[10, 20, 60].map((option) => (
                            <button
                                key={option}
                                onClick={() => setDays(option)}
                                className={clsx(
                                    'rounded-lg border px-3 py-2 text-xs font-bold transition',
                                    days === option
                                        ? 'border-accent-green bg-accent-green/10 text-accent-green'
                                        : 'border-dark-700 text-dark-400 hover:bg-dark-800 hover:text-dark-100'
                                )}
                            >
                                {option}D
                            </button>
                        ))}
                    </div>
                </div>
            </Card>

            {customWatchlist.length === 0 && (
                <Card className="border-amber-700/30 bg-amber-900/10 text-sm text-amber-300">
                    Watchlist custom masih kosong. Mata Dewa memakai saham terakhir yang dicari: {activeSymbol}. Ketik kode saham di input kanan atas untuk cek satu saham lain.
                </Card>
            )}

            {query.isLoading && <Card className="text-dark-400">Mengambil histori {activeSymbol} x {days} hari...</Card>}
            {query.isError && (
                <Card className="border-accent-red/30 text-accent-red">
                    Gagal memuat Mata Dewa. Kurangi jumlah watchlist / periode, lalu coba lagi.
                </Card>
            )}

            {analyses.length > 0 && (
                <div className="grid grid-cols-1 gap-5 xl:grid-cols-12">
                    <div className="xl:col-span-7">
                        <Card className="p-0 overflow-hidden">
                            <div className="border-b border-dark-800 px-4 py-3">
                                <h3 className="font-bold text-dark-100">Ranking Watchlist</h3>
                                <p className="text-xs text-dark-500">Klik saham untuk lihat jejak broker detail.</p>
                            </div>
                            <div className="divide-y divide-dark-800">
                                {analyses.map((item, index) => (
                                    <button
                                        key={item.symbol}
                                        onClick={() => setSelectedSymbol(item.symbol)}
                                        className={clsx(
                                            'grid w-full grid-cols-12 items-center gap-3 px-4 py-3 text-left transition hover:bg-dark-800/60',
                                            selected?.symbol === item.symbol && 'bg-dark-800/80'
                                        )}
                                    >
                                        <div className="col-span-3 flex items-center gap-3">
                                            <span className="text-xs text-dark-500">#{index + 1}</span>
                                            <div>
                                                <p className="font-black text-dark-100">{item.symbol}</p>
                                                <p className="text-[10px] text-dark-500">{item.latestDate || '-'}</p>
                                            </div>
                                        </div>
                                        <div className="col-span-2">
                                            <p className="text-2xl font-black text-dark-100">{item.score}</p>
                                            <p className="text-[10px] text-dark-500">CBS</p>
                                        </div>
                                        <div className="col-span-3">
                                            <span className={clsx('rounded-full border px-2 py-1 text-xs font-bold', verdictClass(item.verdict))}>
                                                {item.verdictLabel}
                                            </span>
                                        </div>
                                        <div className="col-span-4 grid grid-cols-3 gap-2 text-right text-xs">
                                            <Metric label="Smart" value={compact(item.netSmartMoney)} good={item.netSmartMoney >= 0} />
                                            <Metric label="Persist" value={percent(item.persistenceScore)} />
                                            <Metric label="Cross" value={percent(item.crossingShare)} bad={item.crossingShare >= 0.25} />
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </Card>
                    </div>

                    <div className="xl:col-span-5">
                        {selected && <DetailPanel analysis={selected} />}
                    </div>
                </div>
            )}
        </div>
    )
}

function Metric({ label, value, good, bad }: { label: string; value: string; good?: boolean; bad?: boolean }) {
    return (
        <div>
            <p className={clsx('font-mono font-bold', good && 'text-accent-green', bad && 'text-accent-red', !good && !bad && 'text-dark-200')}>{value}</p>
            <p className="text-[10px] text-dark-500">{label}</p>
        </div>
    )
}

function DetailPanel({ analysis }: { analysis: MataDewaAnalysis }) {
    return (
        <Card className="space-y-4">
            <div className="flex items-start justify-between gap-3">
                <div>
                    <h3 className="text-xl font-black text-dark-100">{analysis.symbol}</h3>
                    <p className="text-xs text-dark-500">Harga referensi: {analysis.currentPrice ? analysis.currentPrice.toFixed(0) : '-'}</p>
                </div>
                <div className={clsx('rounded-xl border px-3 py-2 text-right', verdictClass(analysis.verdict))}>
                    <p className="text-2xl font-black">{analysis.score}</p>
                    <p className="text-[10px]">{analysis.verdictLabel}</p>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
                <ScorePill label="Silent Acc" value={percent(analysis.silentAccumulationScore)} />
                <ScorePill label="Buyer Conc" value={percent(analysis.buyerConcentration)} />
                <ScorePill label="Footprint Z" value={`${analysis.footprintZScore.toFixed(1)}σ`} />
                <ScorePill label="Fake Foreign" value={percent(analysis.fakeForeignScore)} />
            </div>

            <div className="space-y-2">
                <p className="text-xs font-bold uppercase tracking-wide text-dark-500">Sinyal Utama</p>
                {analysis.signals.map((signal) => (
                    <div key={signal.key} className={clsx('rounded-lg border p-3', signalClass(signal.tone))}>
                        <div className="flex items-center justify-between gap-3">
                            <p className="text-sm font-bold">{signal.label}</p>
                            <p className="font-mono text-xs font-bold">{signal.value}</p>
                        </div>
                        <p className="mt-1 text-xs opacity-80">{signal.description}</p>
                    </div>
                ))}
            </div>

            <div className="space-y-2">
                <p className="text-xs font-bold uppercase tracking-wide text-dark-500">Bandar AVG Cost Tracker</p>
                {analysis.avgCostPositions.slice(0, 6).map((item) => (
                    <div key={item.code} className="flex items-center justify-between rounded-lg bg-dark-800 px-3 py-2 text-xs">
                        <div>
                            <p className="font-bold text-dark-100">{item.code} <span className="text-dark-500">T{item.tier}</span></p>
                            <p className="text-dark-500">AVG {item.avgCost ? item.avgCost.toFixed(0) : '-'}</p>
                        </div>
                        <div className="text-right">
                            <p className={clsx('font-mono font-bold', item.netValue >= 0 ? 'text-accent-green' : 'text-accent-red')}>
                                {compact(item.netValue)}
                            </p>
                            <p className={clsx('text-[10px]', item.estimatedPnLPercent < 0 ? 'text-amber-300' : 'text-dark-500')}>
                                {item.estimatedPnLPercent.toFixed(1)}% est PnL
                            </p>
                        </div>
                    </div>
                ))}
            </div>
        </Card>
    )
}

function ScorePill({ label, value }: { label: string; value: string }) {
    return (
        <div className="rounded-lg bg-dark-800 p-3">
            <p className="text-[10px] uppercase tracking-wide text-dark-500">{label}</p>
            <p className="mt-1 font-mono text-lg font-black text-dark-100">{value}</p>
        </div>
    )
}
