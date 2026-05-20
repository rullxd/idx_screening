import { Broker } from '@/types'
import { formatCurrency } from '@/services/api'
import Card from '@/components/Card'

interface SummaryCardsProps {
    topBuyer: Broker | null
    topSeller: Broker | null
    foreignNetFlow: number
    localNetFlow: number
}

export default function RankingSummaryCards({
    topBuyer,
    topSeller,
    foreignNetFlow,
    localNetFlow,
}: SummaryCardsProps) {
    const summaryItems = [
        {
            label: 'TOP BUYER',
            value: topBuyer ? `${topBuyer.code} · ${topBuyer.name}` : '—',
            subvalue: topBuyer ? formatCurrency(topBuyer.buy_value) : '—',
            icon: '🟢',
            color: 'border-accent-green',
        },
        {
            label: 'TOP SELLER',
            value: topSeller ? `${topSeller.code} · ${topSeller.name}` : '—',
            subvalue: topSeller ? formatCurrency(topSeller.sell_value) : '—',
            icon: '🔴',
            color: 'border-accent-red',
        },
        {
            label: 'NET FLOW ASING',
            value: formatCurrency(foreignNetFlow),
            subvalue: foreignNetFlow >= 0 ? 'NET BUY' : 'NET SELL',
            icon: '🔵',
            color: foreignNetFlow >= 0 ? 'border-accent-blue' : 'border-accent-red',
        },
        {
            label: 'NET FLOW LOKAL',
            value: formatCurrency(localNetFlow),
            subvalue: localNetFlow >= 0 ? 'NET BUY' : 'NET SELL',
            icon: '🟡',
            color: localNetFlow >= 0 ? 'border-accent-yellow' : 'border-accent-red',
        },
    ]

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {summaryItems.map((item, idx) => (
                <Card key={idx} className={`border-t-4 ${item.color}`}>
                    <div className="text-dark-500 text-xs font-semibold uppercase tracking-wider mb-2">
                        {item.icon} {item.label}
                    </div>
                    <div className="text-lg font-bold text-dark-100 truncate">{item.value}</div>
                    <div className="text-xs text-dark-400 mt-2">{item.subvalue}</div>
                </Card>
            ))}
        </div>
    )
}
