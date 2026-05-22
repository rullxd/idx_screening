import { useMemo } from 'react'
import { detectAccDist, AccDistResult, MarketPhase } from '@/utils/accum-distrib'
import { MarketDetectorBroker } from '@/utils/broker-activity'
import { formatCurrency } from '@/utils/formatters'
import { BrokerTierInline } from '@/components/BrokerActivity/BrokerTierBadge'
import { Card } from '@/components'
import clsx from 'clsx'

interface AccumulationPanelProps {
    buyers: MarketDetectorBroker[]
    sellers: MarketDetectorBroker[]
    currentPrice?: number
    stockCode: string
}

export default function AccumulationPanel({
    buyers,
    sellers,
    stockCode,
}: AccumulationPanelProps) {
    const result: AccDistResult = useMemo(
        () => detectAccDist(buyers, sellers),
        [buyers, sellers]
    )

    return (
        <Card className="p-4 space-y-4">
            <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                    <h4 className="text-sm font-semibold text-dark-200 mb-1">
                        🔭 Bandarscope — Fase Pasar
                    </h4>
                    <p className="text-xs text-dark-500">{stockCode}</p>
                </div>
                <PhaseBadge phase={result.phase} label={result.label} confidence={result.confidence} />
            </div>

            {/* Description */}
            <p className="text-sm text-dark-300 leading-relaxed">{result.description}</p>

            {/* Confidence bar */}
            <div>
                <div className="flex justify-between text-[10px] text-dark-500 mb-1">
                    <span>Confidence</span>
                    <span>{result.confidence}%</span>
                </div>
                <div className="w-full h-1.5 bg-dark-700 rounded-full overflow-hidden">
                    <div
                        className={clsx('h-full rounded-full transition-all', confidenceBarColor(result.phase))}
                        style={{ width: `${result.confidence}%` }}
                    />
                </div>
            </div>

            {/* Net flow kasta */}
            <div className="grid grid-cols-3 gap-2">
                <NetFlowCard
                    label="🐳 Whale NET"
                    value={result.whaleNetFlow}
                />
                <NetFlowCard
                    label="🦈 Bandar NET"
                    value={result.bandarNetFlow}
                />
                <NetFlowCard
                    label="🐜 Retail NET"
                    value={result.retailNetFlow}
                />
            </div>

            {/* Reasons */}
            <div className="space-y-1.5">
                <p className="text-[10px] font-semibold text-dark-500 uppercase tracking-wide">Alasan</p>
                {result.reasons.map((r, i) => (
                    <div key={i} className="flex gap-2 text-xs text-dark-300">
                        <span className="text-dark-600 flex-shrink-0">›</span>
                        <span>{r}</span>
                    </div>
                ))}
            </div>

            {/* Fake volume warning */}
            {result.fakeVolumebrokers.length > 0 && (
                <div className="rounded-lg bg-amber-900/20 border border-amber-700/40 p-3">
                    <p className="text-amber-300 text-xs font-semibold mb-1">
                        ⚠️ Crossing / Volume Palsu Terdeteksi
                    </p>
                    <p className="text-amber-400/80 text-[11px]">
                        Broker{' '}
                        <span className="font-mono font-bold">
                            {result.fakeVolumebrokers.join(', ')}
                        </span>{' '}
                        muncul di sisi beli DAN jual dengan nilai yang hampir sama. Ini adalah volume buatan.
                    </p>
                </div>
            )}

            {/* Dominant Buyers (kasta 2–3) */}
            {result.dominantBuyers.length > 0 && (
                <div>
                    <p className="text-[10px] font-semibold text-dark-500 uppercase tracking-wide mb-2">
                        Kasta Kuat — Net Buy
                    </p>
                    <div className="space-y-1">
                        {result.dominantBuyers.slice(0, 5).map((b) => (
                            <div key={b.code} className="flex items-center justify-between text-xs">
                                <div className="flex items-center gap-2">
                                    <BrokerTierInline code={b.code} />
                                    {b.isBandarBunglon && (
                                        <span className="text-[9px] bg-amber-900/30 text-amber-400 px-1.5 rounded">
                                            bunglon
                                        </span>
                                    )}
                                </div>
                                <span className="text-accent-green font-mono">
                                    +{formatCurrency(b.netValue)}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Dominant Sellers (kasta 2–3) */}
            {result.dominantSellers.length > 0 && (
                <div>
                    <p className="text-[10px] font-semibold text-dark-500 uppercase tracking-wide mb-2">
                        Kasta Kuat — Net Sell
                    </p>
                    <div className="space-y-1">
                        {result.dominantSellers.slice(0, 5).map((s) => (
                            <div key={s.code} className="flex items-center justify-between text-xs">
                                <BrokerTierInline code={s.code} />
                                <span className="text-accent-red font-mono">
                                    {formatCurrency(s.netValue)}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Konsentrasi */}
            <div className="flex items-center justify-between text-xs text-dark-400 pt-1 border-t border-dark-700">
                <span>Konsentrasi top-3 buyer</span>
                <span className="font-mono font-bold text-dark-200">
                    {result.concentrationScore.toFixed(1)}%
                </span>
            </div>

            {/* Action button */}
            <ActionBanner action={result.action} />
        </Card>
    )
}

// ─── Sub-komponen ──────────────────────────────────────────────────────────────

function PhaseBadge({
    phase,
    label,
    confidence,
}: {
    phase: MarketPhase
    label: string
    confidence: number
}) {
    const styles: Record<MarketPhase, string> = {
        STRONG_ACCUMULATION: 'bg-accent-green/20 text-accent-green border-accent-green/40',
        ACCUMULATION: 'bg-green-900/20 text-green-400 border-green-700/40',
        DISTRIBUTION: 'bg-red-900/20 text-accent-red border-accent-red/40',
        STRONG_DISTRIBUTION: 'bg-accent-red/20 text-accent-red border-accent-red/60',
        FAKE_VOLUME: 'bg-amber-900/20 text-amber-300 border-amber-600/40',
        NEUTRAL: 'bg-dark-700 text-dark-300 border-dark-600',
    }

    return (
        <div
            className={clsx(
                'px-3 py-1.5 rounded-lg border text-sm font-semibold text-right',
                styles[phase]
            )}
        >
            {label}
            <div className="text-[10px] font-normal opacity-70 mt-0.5">
                {confidence}% confidence
            </div>
        </div>
    )
}

function NetFlowCard({ label, value }: { label: string; value: number }) {
    const isPos = value >= 0
    return (
        <div className="bg-dark-800 rounded-lg p-2.5 text-center">
            <p className="text-[9px] text-dark-500 mb-1">{label}</p>
            <p
                className={clsx(
                    'text-xs font-bold font-mono tabular-nums',
                    isPos ? 'text-accent-green' : 'text-accent-red'
                )}
            >
                {isPos ? '+' : ''}
                {formatCurrency(value)}
            </p>
        </div>
    )
}

function ActionBanner({ action }: { action: AccDistResult['action'] }) {
    const config = {
        BUY_SIGNAL: {
            text: '✅ Sinyal Beli — Bandar sedang akumulasi',
            cls: 'bg-accent-green/10 text-accent-green border-accent-green/30',
        },
        SELL_SIGNAL: {
            text: '🚨 Sinyal Jual / Waspada — Distribusi aktif',
            cls: 'bg-accent-red/10 text-accent-red border-accent-red/30',
        },
        WAIT: {
            text: '⏸ Tunggu — Volume tidak bisa dipercaya',
            cls: 'bg-amber-900/10 text-amber-400 border-amber-700/30',
        },
        OBSERVE: {
            text: '👀 Observasi — Belum ada sinyal dominan',
            cls: 'bg-dark-800 text-dark-400 border-dark-700',
        },
    }

    const c = config[action]
    return (
        <div className={clsx('rounded-lg border px-3 py-2 text-xs font-semibold text-center', c.cls)}>
            {c.text}
        </div>
    )
}

function confidenceBarColor(phase: MarketPhase): string {
    if (phase === 'STRONG_ACCUMULATION' || phase === 'ACCUMULATION') return 'bg-accent-green'
    if (phase === 'STRONG_DISTRIBUTION' || phase === 'DISTRIBUTION') return 'bg-accent-red'
    if (phase === 'FAKE_VOLUME') return 'bg-amber-400'
    return 'bg-dark-500'
}
