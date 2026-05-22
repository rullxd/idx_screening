import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import IHSGHeroCard from './IHSGHeroCard'

const mockUseOrderbook = vi.fn()

vi.mock('@/hooks/use-queries', () => ({
    useOrderbook: (...args: unknown[]) => mockUseOrderbook(...args),
}))

describe('IHSGHeroCard', () => {
    beforeEach(() => {
        mockUseOrderbook.mockReset()
    })

    it('renders error state and retries when button is clicked', () => {
        const refetch = vi.fn()
        mockUseOrderbook.mockReturnValue({
            data: undefined,
            isLoading: false,
            error: new Error('failed'),
            refetch,
        })

        render(<IHSGHeroCard />)

        expect(screen.getByText('Failed to load IHSG data')).toBeInTheDocument()

        fireEvent.click(screen.getByRole('button', { name: 'Coba Lagi' }))
        expect(refetch).toHaveBeenCalledTimes(1)
    })

    it('renders IHSG metrics when orderbook data is available', () => {
        mockUseOrderbook.mockReturnValue({
            isLoading: false,
            error: null,
            isFetching: false,
            refetch: vi.fn(),
            data: {
                data: {
                    lastprice: 7050,
                    change: 50,
                    percentage_change: '0.71',
                    open: 7010,
                    previous: 7000,
                    high: 7065,
                    low: 6995,
                    value: 123456789,
                    volume: 2450000,
                    frequency: 120345,
                    fnet: 23450000,
                    foreign: 42.5,
                    domestic: 57.5,
                },
            },
        })

        render(<IHSGHeroCard />)

        expect(screen.getByText('📊 IHSG Index')).toBeInTheDocument()
        expect(screen.getByText(/Asing 42\.50%/)).toBeInTheDocument()
        expect(screen.getByText(/Domestik 57\.50%/)).toBeInTheDocument()
        expect(screen.getByText('FNET')).toBeInTheDocument()
        expect(screen.queryByText('Failed to load IHSG data')).not.toBeInTheDocument()
    })
})
