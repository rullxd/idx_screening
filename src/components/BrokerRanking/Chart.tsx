import { useMemo } from 'react'
import { Broker } from '@/types'
import { formatBigNumber } from '@/utils/formatters'
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
} from 'recharts'
import Card from '@/components/Card'

interface RankingChartProps {
    brokers: Broker[]
}

export default function RankingChart({ brokers }: RankingChartProps) {
    // Get top 10 by net value
    const chartData = useMemo(() => {
        return [...brokers]
            .sort((a, b) => Math.abs(b.net_value) - Math.abs(a.net_value))
            .slice(0, 10)
            .map((b) => ({
                code: b.code,
                name: b.name,
                netValue: b.net_value,
                volume: b.total_volume,
                // Normalize volume to fit on same scale as net value for visualization
                volumeScaled: (b.total_volume / 1000000) * (Math.abs(b.net_value) / Math.abs(brokers[0].net_value)),
            }))
    }, [brokers])

    return (
        <Card>
            <div className="mb-4">
                <h3 className="text-lg font-semibold text-dark-100">📊 Top 10 Broker Net Value & Volume</h3>
                <p className="text-xs text-dark-500 mt-1">Perbandingan nilai bersih dan volume transaksi</p>
            </div>

            <div className="w-full h-80">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                        data={chartData}
                        layout="vertical"
                        margin={{ top: 5, right: 30, left: 100, bottom: 5 }}
                    >
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                        <XAxis type="number" stroke="rgba(255,255,255,0.5)" tick={{ fontSize: 12 }} />
                        <YAxis dataKey="code" type="category" stroke="rgba(255,255,255,0.5)" width={80} tick={{ fontSize: 12 }} />
                        <Tooltip
                            contentStyle={{
                                backgroundColor: 'rgba(15, 23, 36, 0.95)',
                                border: '1px solid rgba(255, 255, 255, 0.1)',
                                borderRadius: '8px',
                            }}
                            labelStyle={{ color: '#e8edf5' }}
                            formatter={(value) => {
                                if (typeof value === 'number') {
                                    return [formatBigNumber(value), undefined]
                                }
                                return value
                            }}
                        />
                        <Legend wrapperStyle={{ paddingTop: '20px' }} />
                        <Bar
                            dataKey="netValue"
                            fill="#00e5a0"
                            name="Net Value (Rp)"
                            radius={[0, 8, 8, 0]}
                        />
                        <Bar
                            dataKey="volumeScaled"
                            fill="rgba(59, 130, 246, 0.5)"
                            name="Volume (Normalized)"
                            radius={[0, 8, 8, 0]}
                        />
                    </BarChart>
                </ResponsiveContainer>
            </div>

            <div className="mt-4 text-xs text-dark-500 text-center">
                Volume yang ditampilkan di-normalisasi untuk perbandingan visual
            </div>
        </Card>
    )
}
