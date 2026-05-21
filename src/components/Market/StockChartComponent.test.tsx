import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import StockChartComponent from './StockChartComponent'
import { createNormalizedStockChartData, createQueryState } from '@/test/market-factories'

const mockUseNormalizedStockChart = vi.fn()
const mockUseOrderbook = vi.fn()

vi.mock('@/hooks/use-normalized-chart', () => ({
    useNormalizedStockChart: (...args: unknown[]) => mockUseNormalizedStockChart(...args),
}))

vi.mock('@/hooks/use-queries', () => ({
    useOrderbook: (...args: unknown[]) => mockUseOrderbook(...args),
}))

// Keep chart rendering lightweight for jsdom while preserving component behavior around state/timeframe.
vi.mock('recharts', () => ({
    AreaChart: ({ children }: { children: React.ReactNode }) => <svg>{children}</svg>,
    Area: () => <div data-testid="mock-area" />,
    XAxis: () => null,
    YAxis: () => null,
    CartesianGrid: () => null,
    Tooltip: () => null,
    ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    ReferenceLine: () => null,
}))

describe('StockChartComponent', () => {
    beforeEach(() => {
        mockUseNormalizedStockChart.mockReset()
        mockUseOrderbook.mockReset()

        mockUseOrderbook.mockReturnValue({
            data: {
                name: 'Bank Rakyat Indonesia',
                icon_url: '',
            },
        })
    })

    it('renders loading state while chart data is fetching initially', () => {
        mockUseNormalizedStockChart.mockReturnValue(createQueryState({ isLoading: true }))

        const { container } = render(<StockChartComponent symbol="BBRI" />)

        expect(container.querySelector('.animate-spin')).toBeInTheDocument()
    })

    it('renders error state and retries when requested', () => {
        const refetch = vi.fn()
        mockUseNormalizedStockChart.mockReturnValue(createQueryState({ error: new Error('failed'), refetch }))

        render(<StockChartComponent symbol="BBRI" />)

        expect(screen.getByText('Tidak dapat memuat data chart untuk BBRI')).toBeInTheDocument()
        fireEvent.click(screen.getByRole('button', { name: 'Coba Lagi' }))
        expect(refetch).toHaveBeenCalledTimes(1)
    })

    it('renders empty state when normalized chart points are unavailable', () => {
        mockUseNormalizedStockChart.mockReturnValue(
            createQueryState({
                data: createNormalizedStockChartData({
                    normalized: {
                        data: [],
                        high: 0,
                        low: 0,
                        avg: 0,
                        volatility: 0,
                        first: 0,
                        last: 0,
                        trend: 'flat',
                    },
                }),
            })
        )

        render(<StockChartComponent symbol="BBRI" />)

        expect(screen.getByText('Tidak ada data chart untuk BBRI')).toBeInTheDocument()
    })

    it('switches timeframe and re-queries chart data with the new timeframe', async () => {
        mockUseNormalizedStockChart.mockReturnValue(
            createQueryState({
                data: createNormalizedStockChartData(),
            })
        )

        render(<StockChartComponent symbol="BBRI" />)

        expect(mockUseNormalizedStockChart).toHaveBeenCalledWith('BBRI', '1d')

        fireEvent.click(screen.getByRole('button', { name: '1W' }))

        await waitFor(() => {
            expect(mockUseNormalizedStockChart).toHaveBeenCalledWith('BBRI', '1w')
        })
    })
})
