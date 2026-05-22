import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import DashboardPage from './DashboardPage'

const mockUseOrderbook = vi.fn()
const mockUseTrendingStocks = vi.fn()
const mockUseBrokerRanking = vi.fn()
const mockUseMarketDetector = vi.fn()

vi.mock('@/hooks/use-queries', async () => {
    const actual = await vi.importActual<typeof import('@/hooks/use-queries')>('@/hooks/use-queries')
    return {
        ...actual,
        useOrderbook: (...args: unknown[]) => mockUseOrderbook(...args),
        useTrendingStocks: (...args: unknown[]) => mockUseTrendingStocks(...args),
        useBrokerRanking: (...args: unknown[]) => mockUseBrokerRanking(...args),
        useMarketDetector: (...args: unknown[]) => mockUseMarketDetector(...args),
    }
})

vi.mock('@/components/Dashboard/IHSGChartComponent', () => ({
    default: () => <div data-testid="ihsg-chart">IHSG chart</div>,
}))

describe('DashboardPage', () => {
    beforeEach(() => {
        mockUseOrderbook.mockReset()
        mockUseTrendingStocks.mockReset()
        mockUseBrokerRanking.mockReset()
        mockUseMarketDetector.mockReset()

        mockUseBrokerRanking.mockReturnValue({
            data: {
                data: [
                    { broker_code: 'AK', total_value: 4000000000 },
                    { broker_code: 'BK', total_value: 3000000000 },
                    { broker_code: 'RX', total_value: 2000000000 },
                    { broker_code: 'YP', total_value: 1000000000 },
                ],
            },
            isLoading: false,
            error: null,
            refetch: vi.fn(),
        })

        mockUseMarketDetector.mockImplementation((symbol?: string) => ({
            data: {
                data: {
                    broker_summary: {
                        symbol,
                        brokers_buy: [
                            {
                                netbs_broker_code: 'AK',
                                bval: 5000000000,
                                blot: 100000,
                                freq: 100,
                                netbs_buy_avg_price: 1000,
                                type: 'Asing',
                            },
                        ],
                        brokers_sell: [
                            {
                                netbs_broker_code: 'YP',
                                sval: 3000000000,
                                slot: 70000,
                                freq: 300,
                                netbs_sell_avg_price: 1000,
                                type: 'Lokal',
                            },
                        ],
                    },
                    bandar_detector: {},
                },
            },
            isLoading: false,
            error: null,
            refetch: vi.fn(),
        }))
    })

    it('renders mixed state when IHSG hero fails but trending stocks succeeds', async () => {
        mockUseOrderbook.mockReturnValue({
            data: undefined,
            isLoading: false,
            error: new Error('failed to fetch ihsg'),
            refetch: vi.fn(),
            isFetching: false,
        })

        mockUseTrendingStocks.mockReturnValue({
            isLoading: false,
            error: null,
            refetch: vi.fn(),
            data: {
                data: [
                    {
                        symbol: 'BBCA',
                        name: 'Bank Central Asia',
                        price: '9550',
                        change: '120',
                        percent: '1.27',
                        volume: 120000,
                        value: 500000000,
                    },
                ],
            },
        })

        render(<DashboardPage />)

        expect(screen.getByRole('heading', { name: '📊 Dashboard' })).toBeInTheDocument()
        expect(screen.getByText('Failed to load IHSG data')).toBeInTheDocument()
        expect(screen.getByText('Failed to load foreign pressure')).toBeInTheDocument()
        expect(screen.getByText('Failed to load bandar avg alert')).toBeInTheDocument()
        expect(screen.getByText('Market Breadth')).toBeInTheDocument()
        expect(screen.getByText('A:D 1:0')).toBeInTheDocument()
        expect(screen.getByText('Silent Accumulation Tracker')).toBeInTheDocument()
        expect(screen.getByText('Broker Concentration Risk')).toBeInTheDocument()
        expect(screen.getByText('🔥 Trending Hari Ini')).toBeInTheDocument()
        expect(screen.getByText('BBCA')).toBeInTheDocument()
        expect(await screen.findByTestId('ihsg-chart')).toBeInTheDocument()
    })

    it('renders both error states when IHSG and trending requests fail', async () => {
        mockUseOrderbook.mockReturnValue({
            data: undefined,
            isLoading: false,
            error: new Error('failed to fetch ihsg'),
            refetch: vi.fn(),
            isFetching: false,
        })

        mockUseTrendingStocks.mockReturnValue({
            data: undefined,
            isLoading: false,
            error: new Error('failed to fetch trending'),
            refetch: vi.fn(),
        })

        render(<DashboardPage />)

        expect(screen.getByText('Failed to load IHSG data')).toBeInTheDocument()
        expect(screen.getByText('Failed to load foreign pressure')).toBeInTheDocument()
        expect(screen.getByText('Failed to load bandar avg alert')).toBeInTheDocument()
        expect(screen.getByText('Failed to load market breadth')).toBeInTheDocument()
        expect(screen.getByText('Failed to load trending stocks')).toBeInTheDocument()
        expect(screen.getAllByRole('button', { name: 'Coba Lagi' })).toHaveLength(5)
        expect(await screen.findByTestId('ihsg-chart')).toBeInTheDocument()
    })

    it('shows loading indicators when both dashboard queries are still loading', async () => {
        mockUseOrderbook.mockReturnValue({
            data: undefined,
            isLoading: true,
            error: null,
            refetch: vi.fn(),
            isFetching: false,
        })

        mockUseTrendingStocks.mockReturnValue({
            data: undefined,
            isLoading: true,
            error: null,
            refetch: vi.fn(),
        })

        const { container } = render(<DashboardPage />)

        expect(container.querySelectorAll('.animate-spin').length).toBeGreaterThanOrEqual(5)
        expect(await screen.findByTestId('ihsg-chart')).toBeInTheDocument()
    })

    it('renders breadth composition for mixed movers', () => {
        mockUseOrderbook.mockReturnValue({
            data: {
                data: {
                    lastprice: 7000,
                    change: 10,
                    percentage_change: 0.14,
                    high: 7020,
                    low: 6980,
                    open: 6990,
                    previous: 6990,
                    value: 1000000000,
                    volume: 250000,
                    frequency: 10000,
                    fnet: 1000000,
                    foreign: 52,
                    domestic: 48,
                },
            },
            isLoading: false,
            error: null,
            refetch: vi.fn(),
            isFetching: false,
        })

        mockUseTrendingStocks.mockReturnValue({
            isLoading: false,
            error: null,
            refetch: vi.fn(),
            data: {
                data: [
                    { symbol: 'BBCA', percent: '1.0', change: '100', volume: 1000, value: 1000000 },
                    { symbol: 'BBRI', percent: '-0.5', change: '-25', volume: 2000, value: 1500000 },
                    { symbol: 'TLKM', percent: '0', change: '0', volume: 500, value: 500000 },
                ],
            },
        })

        render(<DashboardPage />)

        expect(screen.getByText('A:D 1:1')).toBeInTheDocument()
        expect(screen.getByText('Foreign Pressure Monitor')).toBeInTheDocument()
        expect(screen.getByText('Bandar AVG Discount Alert')).toBeInTheDocument()
        expect(screen.getByText(/Premium/i)).toBeInTheDocument()
        expect(screen.getByText('Net Buy')).toBeInTheDocument()
        expect(screen.getByText('Silent Accumulation Tracker')).toBeInTheDocument()
        expect(screen.getByText('Broker Concentration Risk')).toBeInTheDocument()
        expect(screen.getByText('Naik')).toBeInTheDocument()
        expect(screen.getByText('Turun')).toBeInTheDocument()
        expect(screen.getByText('Flat')).toBeInTheDocument()
    })
})
