import { Card } from '@/components'

export default function AlertsPage() {
    const alerts = [
        {
            id: 1,
            type: 'strong-buy',
            title: 'Strong Buy Signal',
            message: 'Foreign institutional buying detected on BNBR',
            time: '2 minutes ago',
            severity: 'high'
        },
        {
            id: 2,
            type: 'accumulation',
            title: 'Accumulation Pattern',
            message: 'Multiple brokers showing net buy on TLKM',
            time: '15 minutes ago',
            severity: 'medium'
        },
        {
            id: 3,
            type: 'breakout',
            title: 'Price Breakout',
            message: 'ASII breaking above resistance with high volume',
            time: '28 minutes ago',
            severity: 'high'
        },
        {
            id: 4,
            type: 'distribution',
            title: 'Distribution Alert',
            message: 'Bandar distribution pattern on BBCA detected',
            time: '1 hour ago',
            severity: 'low'
        },
    ]

    const getAlertIcon = (type: string) => {
        switch (type) {
            case 'strong-buy': return '🟢'
            case 'accumulation': return '📈'
            case 'breakout': return '⚡'
            case 'distribution': return '🔴'
            default: return '📢'
        }
    }

    const getSeverityColor = (severity: string) => {
        switch (severity) {
            case 'high': return 'border-l-4 border-accent-red'
            case 'medium': return 'border-l-4 border-accent-yellow'
            case 'low': return 'border-l-4 border-accent-blue'
            default: return 'border-l-4 border-dark-700'
        }
    }

    // Calculate summary stats
    const highSeverity = alerts.filter((a: any) => a.severity === 'high').length
    const mediumSeverity = alerts.filter((a: any) => a.severity === 'medium').length
    const lowSeverity = alerts.filter((a: any) => a.severity === 'low').length
    const strongBuyCount = alerts.filter((a: any) => a.type === 'strong-buy').length
    const accumulationCount = alerts.filter((a: any) => a.type === 'accumulation').length
    const breakoutCount = alerts.filter((a: any) => a.type === 'breakout').length
    const distributionCount = alerts.filter((a: any) => a.type === 'distribution').length

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold text-dark-100">🔔 Alert & Signals</h1>

            {/* Summary Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2 text-xs">
                <Card className="p-3 border-l-4 border-accent-red">
                    <p className="text-dark-500 text-xs font-semibold">HIGH</p>
                    <p className="text-xl font-bold text-accent-red mt-1">{highSeverity}</p>
                </Card>
                <Card className="p-3 border-l-4 border-accent-yellow">
                    <p className="text-dark-500 text-xs font-semibold">MEDIUM</p>
                    <p className="text-xl font-bold text-accent-yellow mt-1">{mediumSeverity}</p>
                </Card>
                <Card className="p-3 border-l-4 border-accent-blue">
                    <p className="text-dark-500 text-xs font-semibold">LOW</p>
                    <p className="text-xl font-bold text-accent-blue mt-1">{lowSeverity}</p>
                </Card>
                <Card className="p-3 border-l-4 border-accent-green">
                    <p className="text-dark-500 text-xs font-semibold">STRONG BUY</p>
                    <p className="text-xl font-bold text-accent-green mt-1">{strongBuyCount}</p>
                </Card>
                <Card className="p-3 border-l-4 border-accent-cyan">
                    <p className="text-dark-500 text-xs font-semibold">ACCUM</p>
                    <p className="text-xl font-bold text-accent-cyan mt-1">{accumulationCount}</p>
                </Card>
                <Card className="p-3 border-l-4 border-accent-purple">
                    <p className="text-dark-500 text-xs font-semibold">BREAKOUT</p>
                    <p className="text-xl font-bold text-accent-purple mt-1">{breakoutCount}</p>
                </Card>
                <Card className="p-3 border-l-4 border-accent-red">
                    <p className="text-dark-500 text-xs font-semibold">DIST</p>
                    <p className="text-xl font-bold text-accent-red mt-1">{distributionCount}</p>
                </Card>
            </div>

            <div className="space-y-3">
                {alerts.map((alert) => (
                    <Card key={alert.id} className={`p-4 ${getSeverityColor(alert.severity)} hover:bg-dark-800 transition cursor-pointer`}>
                        <div className="flex items-start justify-between">
                            <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                    <span className="text-lg">{getAlertIcon(alert.type)}</span>
                                    <p className="font-semibold text-dark-100">{alert.title}</p>
                                </div>
                                <p className="text-dark-400 text-sm mb-2">{alert.message}</p>
                                <p className="text-dark-500 text-xs">{alert.time}</p>
                            </div>
                            <button className="px-3 py-1 bg-dark-700 hover:bg-dark-600 rounded text-sm transition">
                                View
                            </button>
                        </div>
                    </Card>
                ))}
            </div>

            <Card className="p-4 bg-dark-800 text-dark-400 text-sm">
                <p>💡 Tip: Configure alert preferences in Settings to receive notifications for specific patterns</p>
            </Card>
        </div>
    )
}
