import { useOrderbook } from '@/hooks/use-queries'
import { formatBigNumber, formatVolume } from '@/utils/formatters'
import { Card, LoadingSpinner, ErrorState } from '@/components'

export default function IHSGHeroCard() {
    const { data, isLoading, error, refetch, isFetching } = useOrderbook('IHSG')

    if (isLoading) return <LoadingSpinner />
    if (error) return <ErrorState title="Error" message="Failed to load IHSG data" onRetry={() => refetch()} />
    if (!data) return null

    const ihsg = data?.data || data || {}
    const toNumber = (value: unknown): number => {
        const num = typeof value === 'string' ? parseFloat(value) : Number(value)
        return Number.isFinite(num) ? num : 0
    }

    const price = toNumber(ihsg.lastprice || ihsg.close || ihsg.previous)
    const change = toNumber(ihsg.change)
    const changePct = toNumber(ihsg.percentage_change ?? ihsg.percentage)
    const high = toNumber(ihsg.high)
    const low = toNumber(ihsg.low)
    const open = toNumber(ihsg.open)
    const previous = toNumber(ihsg.previous)
    const value = toNumber(ihsg.value)
    const volume = toNumber(ihsg.volume)
    const frequency = toNumber(ihsg.frequency)
    const fnet = toNumber(ihsg.fnet)
    const foreign = toNumber(ihsg.foreign)
    const domestic = toNumber(ihsg.domestic)
    const volatility = high - low

    const isPositive = changePct >= 0
    const changeClass = isPositive ? 'text-accent-green' : 'text-accent-red'
    const trend = isPositive ? '📈' : changePct < 0 ? '📉' : '➡️'

    return (
        <Card className="p-8 bg-gradient-to-r from-dark-900 to-dark-800 border border-dark-700">
            <div className="flex items-end justify-between">
                <div className="flex-1">
                    <div className="text-sm text-dark-400 uppercase tracking-wide mb-2">📊 IHSG Index</div>
                    <div className="flex items-baseline gap-3 mb-3">
                        <div className="text-5xl font-bold text-dark-100">
                            {formatBigNumber(price)}
                        </div>
                        <div className="text-3xl">{trend}</div>
                        {isFetching && <span className="text-xs text-dark-500 animate-pulse">↻</span>}
                    </div>
                    <div className={`text-lg font-semibold mb-3 ${changeClass}`}>
                        {isPositive ? '+' : ''}{formatBigNumber(change)} ({changePct >= 0 ? '+' : ''}{changePct.toFixed(2)}%)
                    </div>

                    <div className="grid grid-cols-5 gap-3 text-xs mt-4 p-3 bg-dark-800 rounded">
                        <div>
                            <p className="text-dark-400">OPEN</p>
                            <p className="text-dark-200 font-bold">{open.toFixed(0)}</p>
                        </div>
                        <div>
                            <p className="text-dark-400">PREV</p>
                            <p className="text-dark-200 font-bold">{previous.toFixed(0)}</p>
                        </div>
                        <div>
                            <p className="text-dark-400">HIGH</p>
                            <p className="text-accent-green font-bold">{high.toFixed(0)}</p>
                        </div>
                        <div>
                            <p className="text-dark-400">LOW</p>
                            <p className="text-accent-red font-bold">{low.toFixed(0)}</p>
                        </div>
                        <div>
                            <p className="text-dark-400">RANGE</p>
                            <p className="text-accent-blue font-bold">{volatility.toFixed(2)}</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs mt-3">
                        <div className="bg-dark-800 rounded px-2 py-1">
                            <p className="text-dark-500">VALUE</p>
                            <p className="text-dark-200 font-semibold">{formatBigNumber(value)}</p>
                        </div>
                        <div className="bg-dark-800 rounded px-2 py-1">
                            <p className="text-dark-500">VOLUME</p>
                            <p className="text-dark-200 font-semibold">{formatVolume(volume)}</p>
                        </div>
                        <div className="bg-dark-800 rounded px-2 py-1">
                            <p className="text-dark-500">FREQ</p>
                            <p className="text-dark-200 font-semibold">{formatBigNumber(frequency)}</p>
                        </div>
                        <div className="bg-dark-800 rounded px-2 py-1">
                            <p className="text-dark-500">FNET</p>
                            <p className={`font-semibold ${fnet >= 0 ? 'text-accent-green' : 'text-accent-red'}`}>
                                {fnet >= 0 ? '+' : ''}{formatBigNumber(fnet)}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="text-right text-dark-400 text-sm space-y-1 ml-6">
                    <p>🕐 {new Date().toLocaleTimeString('id-ID')}</p>
                    <p className="text-xs">Real-time data</p>
                    <p className="text-xs text-dark-500 mt-2">Asing {foreign.toFixed(2)}% · Domestik {domestic.toFixed(2)}%</p>
                </div>
            </div>
        </Card>
    )
}
