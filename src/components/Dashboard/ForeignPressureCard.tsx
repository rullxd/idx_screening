import { Card, ErrorState, LoadingSpinner } from '@/components'
import { useOrderbook } from '@/hooks/use-queries'
import { formatBigNumber } from '@/utils/formatters'

function toNumber(value: unknown): number {
    const parsed = typeof value === 'string' ? Number.parseFloat(value) : Number(value)
    return Number.isFinite(parsed) ? parsed : 0
}

export default function ForeignPressureCard() {
    const { data, isLoading, error, refetch } = useOrderbook('IHSG')

    if (isLoading) return <LoadingSpinner />
    if (error) {
        return <ErrorState title="Error" message="Failed to load foreign pressure" onRetry={() => refetch()} />
    }

    const ihsg = data?.data || data || {}
    const foreign = toNumber(ihsg.foreign)
    const domestic = toNumber(ihsg.domestic)
    const fnet = toNumber(ihsg.fnet)
    const isNetBuy = fnet >= 0

    return (
        <Card className="p-5">
            <div className="flex items-start justify-between gap-4">
                <div>
                    <p className="text-sm text-dark-400">Foreign Pressure Monitor</p>
                    <p className={`text-2xl font-bold mt-1 ${isNetBuy ? 'text-accent-green' : 'text-accent-red'}`}>
                        {isNetBuy ? 'Net Buy' : 'Net Sell'}
                    </p>
                    <p className="text-xs text-dark-400 mt-1">Status asing vs domestik</p>
                </div>

                <div className="text-right">
                    <p className="text-xs text-dark-500">FNET</p>
                    <p className={`text-sm font-semibold ${isNetBuy ? 'text-accent-green' : 'text-accent-red'}`}>
                        {isNetBuy ? '+' : ''}
                        {formatBigNumber(fnet)}
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-2 mt-4 text-xs">
                <div className="bg-dark-800 rounded px-2 py-2">
                    <p className="text-dark-500">Foreign</p>
                    <p className="font-semibold text-dark-100">{foreign.toFixed(2)}%</p>
                </div>
                <div className="bg-dark-800 rounded px-2 py-2">
                    <p className="text-dark-500">Domestic</p>
                    <p className="font-semibold text-dark-100">{domestic.toFixed(2)}%</p>
                </div>
            </div>
        </Card>
    )
}