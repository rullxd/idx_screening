import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import OrderbookCard from './OrderbookCard'
import { createOrderbookData, createQueryState } from '@/test/market-factories'

const mockUseOrderbook = vi.fn()

vi.mock('@/hooks/use-queries', () => ({
    useOrderbook: (...args: unknown[]) => mockUseOrderbook(...args),
}))

describe('OrderbookCard', () => {
    beforeEach(() => {
        mockUseOrderbook.mockReset()
    })

    it('renders loading state while orderbook is fetching initially', () => {
        mockUseOrderbook.mockReturnValue(createQueryState({ isLoading: true }))

        const { container } = render(<OrderbookCard symbol="BBRI" />)

        expect(container.querySelector('.animate-spin')).toBeInTheDocument()
        expect(screen.queryByText('Orderbook')).not.toBeInTheDocument()
    })

    it('renders error state and retries when requested', () => {
        const refetch = vi.fn()
        mockUseOrderbook.mockReturnValue(createQueryState({ error: new Error('failed'), refetch }))

        render(<OrderbookCard symbol="BBRI" />)

        expect(screen.getByText('Gagal memuat orderbook BBRI')).toBeInTheDocument()
        fireEvent.click(screen.getByRole('button', { name: 'Coba Lagi' }))
        expect(refetch).toHaveBeenCalledTimes(1)
    })

    it('renders orderbook summary and rows when data is available', () => {
        mockUseOrderbook.mockReturnValue(
            createQueryState({
                isFetching: true,
                data: createOrderbookData(),
            })
        )

        render(<OrderbookCard symbol="BBRI" />)

        expect(screen.getByRole('heading', { name: 'BBRI' })).toBeInTheDocument()
        expect(screen.getByText('Bank Rakyat Indonesia')).toBeInTheDocument()
        expect(screen.getByText('Bid')).toBeInTheDocument()
        expect(screen.getByText('Offer')).toBeInTheDocument()
        expect(screen.getByText('+1.23%')).toBeInTheDocument()
        expect(screen.getByText('2 bid · 1 offer · auto-refresh saat halaman dibuka')).toBeInTheDocument()
        expect(screen.getByText('↻')).toBeInTheDocument()
        expect(screen.getAllByText('1.250')).toHaveLength(2)
    })
})
