import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import BrokerSummaryCard from './BrokerSummaryCard'
import { createBrokerDetectorData, createQueryState } from '@/test/market-factories'

const mockUseMarketDetector = vi.fn()

vi.mock('@/hooks/use-queries', () => ({
    useMarketDetector: (...args: unknown[]) => mockUseMarketDetector(...args),
}))

describe('BrokerSummaryCard', () => {
    beforeEach(() => {
        mockUseMarketDetector.mockReset()
    })

    it('renders loading state while broker data is fetching initially', () => {
        mockUseMarketDetector.mockReturnValue(createQueryState({ isLoading: true }))

        const { container } = render(<BrokerSummaryCard symbol="BBRI" />)

        expect(container.querySelector('.animate-spin')).toBeInTheDocument()
        expect(screen.queryByText('Broker Summary')).not.toBeInTheDocument()
    })

    it('renders error state and retries when requested', () => {
        const refetch = vi.fn()
        mockUseMarketDetector.mockReturnValue(createQueryState({ error: new Error('failed'), refetch }))

        render(<BrokerSummaryCard symbol="BBRI" />)

        expect(screen.getByText('Gagal memuat data broker BBRI')).toBeInTheDocument()
        fireEvent.click(screen.getByRole('button', { name: 'Coba Lagi' }))
        expect(refetch).toHaveBeenCalledTimes(1)
    })

    it('renders broker summary tables and bandar metrics when data is available', () => {
        mockUseMarketDetector.mockReturnValue(
            createQueryState({
                isFetching: true,
                data: createBrokerDetectorData(),
            })
        )

        render(<BrokerSummaryCard symbol="BBRI" />)

        expect(screen.getByText('Broker Summary')).toBeInTheDocument()
        expect(screen.getByText('BBRI')).toBeInTheDocument()
        expect(screen.getByText('Top Buyers')).toBeInTheDocument()
        expect(screen.getByText('Top Sellers')).toBeInTheDocument()
        expect(screen.getByText('Buyer')).toBeInTheDocument()
        expect(screen.getByText('Seller')).toBeInTheDocument()
        expect(screen.getByText('Net Avg')).toBeInTheDocument()
        expect(screen.getByText('22')).toBeInTheDocument()
        expect(screen.getByText('17')).toBeInTheDocument()
        expect(screen.getByText('YP')).toBeInTheDocument()
        expect(screen.getByText('PD')).toBeInTheDocument()
        expect(screen.getByText('2 buyer · 1 seller · fokus ke nilai NET dan konsentrasi lot')).toBeInTheDocument()
        expect(screen.getByText('Memperbarui...')).toBeInTheDocument()
    })

    it('passes custom date range to market detector query options', () => {
        mockUseMarketDetector.mockReturnValue(createQueryState({ data: createBrokerDetectorData() }))

        render(<BrokerSummaryCard symbol="BBRI" fromDate="2026-05-01" toDate="2026-05-07" />)

        expect(mockUseMarketDetector).toHaveBeenCalledWith('BBRI', {
            enabled: true,
            fromDate: '2026-05-01',
            toDate: '2026-05-07',
        })
        expect(screen.getByText('2026-05-01 - 2026-05-07')).toBeInTheDocument()
    })
})
