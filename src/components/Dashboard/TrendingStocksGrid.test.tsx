import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import TrendingStocksGrid from './TrendingStocksGrid'

const mockUseTrendingStocks = vi.fn()

vi.mock('@/hooks/use-queries', () => ({
    useTrendingStocks: (...args: unknown[]) => mockUseTrendingStocks(...args),
}))

describe('TrendingStocksGrid', () => {
    beforeEach(() => {
        mockUseTrendingStocks.mockReset()
    })

    it('renders error state and retries when button is clicked', () => {
        const refetch = vi.fn()
        mockUseTrendingStocks.mockReturnValue({
            data: undefined,
            isLoading: false,
            error: new Error('failed'),
            refetch,
        })

        render(<TrendingStocksGrid />)

        expect(screen.getByText('Failed to load trending stocks')).toBeInTheDocument()

        fireEvent.click(screen.getByRole('button', { name: 'Coba Lagi' }))
        expect(refetch).toHaveBeenCalledTimes(1)
    })

    it('renders empty state when response has no stocks', () => {
        mockUseTrendingStocks.mockReturnValue({
            isLoading: false,
            error: null,
            refetch: vi.fn(),
            data: { data: [] },
        })

        render(<TrendingStocksGrid />)

        expect(screen.getByText('Tidak ada trending stocks')).toBeInTheDocument()
    })

    it('renders stock cards and stats when trending data exists', () => {
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
                    {
                        symbol: 'BBRI',
                        name: 'Bank Rakyat Indonesia',
                        price: '5100',
                        change: '-50',
                        percent: '-0.97',
                        volume: 150000,
                        value: 430000000,
                    },
                ],
            },
        })

        render(<TrendingStocksGrid />)

        expect(screen.getByText('🔥 Trending Hari Ini')).toBeInTheDocument()
        expect(screen.getByText('(2 saham)')).toBeInTheDocument()
        expect(screen.getByText('BBCA')).toBeInTheDocument()
        expect(screen.getByText('BBRI')).toBeInTheDocument()
        expect(screen.getByText('🟢 1')).toBeInTheDocument()
        expect(screen.getByText('🔴 1')).toBeInTheDocument()
        expect(screen.getByText('avg 0.15%')).toBeInTheDocument()
    })
})
