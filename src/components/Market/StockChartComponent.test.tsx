import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import StockChartComponent from './StockChartComponent'
import { createQueryState } from '@/test/market-factories'
import { CandlestickSeries, createChart } from 'lightweight-charts'

const mockUseStockChart = vi.fn()
const mockAddLineSeries = vi.fn()
const mockAddSeries = vi.fn()
const mockRemoveSeries = vi.fn()
const mockFitContent = vi.fn()
const mockChartRemove = vi.fn()

const mockLineSeriesApi = {
    setData: vi.fn(),
    createPriceLine: vi.fn(() => ({})),
}

const mockCandleSeriesApi = {
    setData: vi.fn(),
    createPriceLine: vi.fn(() => ({})),
}

vi.mock('@/hooks/use-queries', () => ({
    useStockChart: (...args: unknown[]) => mockUseStockChart(...args),
}))

vi.mock('lightweight-charts', () => ({
    createChart: vi.fn(() => ({
        addLineSeries: mockAddLineSeries,
        addSeries: mockAddSeries,
        removeSeries: mockRemoveSeries,
        timeScale: () => ({ fitContent: mockFitContent }),
        remove: mockChartRemove,
    })),
    LineSeries: { seriesType: 'Line' },
    CandlestickSeries: { seriesType: 'Candlestick' },
    CrosshairMode: { Normal: 0 },
    LineStyle: { Dashed: 1 },
}))

describe('StockChartComponent', () => {
    beforeEach(() => {
        mockUseStockChart.mockReset()
        mockAddLineSeries.mockReset()
        mockAddSeries.mockReset()
        mockRemoveSeries.mockReset()
        mockFitContent.mockReset()
        mockChartRemove.mockReset()
        mockLineSeriesApi.setData.mockReset()
        mockLineSeriesApi.createPriceLine.mockReset()
        mockCandleSeriesApi.setData.mockReset()
        mockCandleSeriesApi.createPriceLine.mockReset()

        mockLineSeriesApi.createPriceLine.mockReturnValue({})
        mockCandleSeriesApi.createPriceLine.mockReturnValue({})
        mockAddLineSeries.mockReturnValue(mockLineSeriesApi)
        mockAddSeries.mockImplementation((definition: unknown) => {
            if (definition === CandlestickSeries) return mockCandleSeriesApi
            return mockLineSeriesApi
        })
    })

    it('renders loading state while chart data is fetching initially', () => {
        mockUseStockChart.mockReturnValue(createQueryState({ isLoading: true }))

        const { container } = render(<StockChartComponent symbol="BBRI" />)

        expect(container.querySelector('.animate-spin')).toBeInTheDocument()
    })

    it('renders error state and retries when requested', () => {
        const refetch = vi.fn()
        mockUseStockChart.mockReturnValue(createQueryState({ error: new Error('failed'), refetch }))

        render(<StockChartComponent symbol="BBRI" />)

        expect(screen.getByText('Tidak dapat memuat data chart untuk BBRI')).toBeInTheDocument()
        fireEvent.click(screen.getByRole('button', { name: 'Coba Lagi' }))
        expect(refetch).toHaveBeenCalledTimes(1)
    })

    it('renders empty state when chart points are unavailable', () => {
        mockUseStockChart.mockReturnValue(createQueryState({ data: { prices: [] } }))

        render(<StockChartComponent symbol="BBRI" />)

        expect(screen.getByText('Tidak ada data chart untuk BBRI')).toBeInTheDocument()
    })

    it('switches timeframe and re-queries chart data with the new timeframe', async () => {
        mockUseStockChart.mockReturnValue(
            createQueryState({
                data: {
                    prices: [{ value: '100', formatted_date: '2026-01-01T09:00:00.000Z' }],
                    percentage: '1.23',
                },
            })
        )

        render(<StockChartComponent symbol="BBRI" />)

        expect(mockUseStockChart).toHaveBeenCalledWith('BBRI', '1d')

        fireEvent.click(screen.getByRole('button', { name: '1W' }))

        await waitFor(() => {
            expect(mockUseStockChart).toHaveBeenCalledWith('BBRI', '1w')
        })

        expect(createChart).toHaveBeenCalled()
    })

    it('shows chart mode toggle and switches to candlestick mode', () => {
        mockUseStockChart.mockReturnValue(
            createQueryState({
                data: {
                    prices: [
                        {
                            open: '100',
                            high: '104',
                            low: '98',
                            close: '102',
                            formatted_date: '2026-01-01T09:00:00.000Z',
                        },
                        {
                            open: '102',
                            high: '106',
                            low: '99',
                            close: '101',
                            formatted_date: '2026-01-01T09:01:00.000Z',
                        },
                    ],
                    percentage: '1.23',
                },
            })
        )

        render(<StockChartComponent symbol="BBRI" />)

        const lineButton = screen.getByRole('button', { name: 'Line' })
        const candleButton = screen.getByRole('button', { name: 'Candlestick' })
        const chartCanvas = screen.getByTestId('stock-chart-canvas')

        expect(lineButton).toHaveAttribute('aria-pressed', 'true')
        expect(candleButton).toHaveAttribute('aria-pressed', 'false')
        expect(chartCanvas).toHaveAttribute('data-mode', 'line')
        expect(mockAddLineSeries).toHaveBeenCalledWith(expect.any(Object))

        fireEvent.click(candleButton)

        expect(candleButton).toHaveAttribute('aria-pressed', 'true')
        expect(lineButton).toHaveAttribute('aria-pressed', 'false')
        expect(chartCanvas).toHaveAttribute('data-mode', 'candlestick')
        expect(mockAddSeries).toHaveBeenCalledWith(CandlestickSeries, expect.any(Object))
    })

    it('uses OHLC points to compute high/low and renders candlestick mode', () => {
        mockUseStockChart.mockReturnValue(
            createQueryState({
                data: {
                    prices: [
                        {
                            open: '100',
                            high: '105',
                            low: '95',
                            close: '102',
                            formatted_date: '2026-01-01T09:00:00.000Z',
                        },
                        {
                            open: '102',
                            high: '108',
                            low: '99',
                            close: '100',
                            formatted_date: '2026-01-01T09:01:00.000Z',
                        },
                    ],
                },
            })
        )

        render(<StockChartComponent symbol="BBRI" />)

        expect(screen.getByText('108.00')).toBeInTheDocument()
        expect(screen.getByText('95.00')).toBeInTheDocument()

        fireEvent.click(screen.getByRole('button', { name: 'Candlestick' }))
        expect(screen.getByTestId('stock-chart-canvas')).toHaveAttribute('data-mode', 'candlestick')
        expect(mockAddSeries).toHaveBeenCalledWith(CandlestickSeries, expect.any(Object))
    })
})
