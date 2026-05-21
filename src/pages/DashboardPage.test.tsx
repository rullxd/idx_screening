import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import DashboardPage from './DashboardPage'

const mockUseIHSGChart = vi.fn()
const mockUseTrendingStocks = vi.fn()

vi.mock('@/hooks/use-queries', async () => {
    const actual = await vi.importActual<typeof import('@/hooks/use-queries')>('@/hooks/use-queries')
    return {
        ...actual,
        useIHSGChart: (...args: unknown[]) => mockUseIHSGChart(...args),
        useTrendingStocks: (...args: unknown[]) => mockUseTrendingStocks(...args),
    }
})

vi.mock('@/components/Dashboard/IHSGChartComponent', () => ({
    default: () => <div data-testid="ihsg-chart">IHSG chart</div>,
}))

describe('DashboardPage', () => {
    beforeEach(() => {
        mockUseIHSGChart.mockReset()
        mockUseTrendingStocks.mockReset()
    })

    it('renders mixed state when IHSG hero fails but trending stocks succeeds', async () => {
        mockUseIHSGChart.mockReturnValue({
            data: undefined,
            isLoading: false,
            error: new Error('failed to fetch ihsg'),
            refetch: vi.fn(),
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
        expect(screen.getByText('🔥 Trending Hari Ini')).toBeInTheDocument()
        expect(screen.getByText('BBCA')).toBeInTheDocument()
        expect(await screen.findByTestId('ihsg-chart')).toBeInTheDocument()
    })

    it('renders both error states when IHSG and trending requests fail', async () => {
        mockUseIHSGChart.mockReturnValue({
            data: undefined,
            isLoading: false,
            error: new Error('failed to fetch ihsg'),
            refetch: vi.fn(),
        })

        mockUseTrendingStocks.mockReturnValue({
            data: undefined,
            isLoading: false,
            error: new Error('failed to fetch trending'),
            refetch: vi.fn(),
        })

        render(<DashboardPage />)

        expect(screen.getByText('Failed to load IHSG data')).toBeInTheDocument()
        expect(screen.getByText('Failed to load trending stocks')).toBeInTheDocument()
        expect(screen.getAllByRole('button', { name: 'Coba Lagi' })).toHaveLength(2)
        expect(await screen.findByTestId('ihsg-chart')).toBeInTheDocument()
    })

    it('shows loading indicators when both dashboard queries are still loading', async () => {
        mockUseIHSGChart.mockReturnValue({
            data: undefined,
            isLoading: true,
            error: null,
            refetch: vi.fn(),
        })

        mockUseTrendingStocks.mockReturnValue({
            data: undefined,
            isLoading: true,
            error: null,
            refetch: vi.fn(),
        })

        const { container } = render(<DashboardPage />)

        expect(container.querySelectorAll('.animate-spin').length).toBeGreaterThanOrEqual(2)
        expect(await screen.findByTestId('ihsg-chart')).toBeInTheDocument()
    })
})
