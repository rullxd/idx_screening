import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import IHSGHeroCard from './IHSGHeroCard'

const mockUseIHSGChart = vi.fn()

vi.mock('@/hooks/use-queries', () => ({
    useIHSGChart: (...args: unknown[]) => mockUseIHSGChart(...args),
}))

describe('IHSGHeroCard', () => {
    beforeEach(() => {
        mockUseIHSGChart.mockReset()
    })

    it('renders error state and retries when button is clicked', () => {
        const refetch = vi.fn()
        mockUseIHSGChart.mockReturnValue({
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

    it('renders IHSG metrics when chart data is available', () => {
        mockUseIHSGChart.mockReturnValue({
            isLoading: false,
            error: null,
            refetch: vi.fn(),
            data: {
                prices: [{ value: 7000 }, { value: 7050 }, { value: 7075 }],
            },
        })

        render(<IHSGHeroCard />)

        expect(screen.getByText('📊 IHSG Index')).toBeInTheDocument()
        expect(screen.getByText('3 candles')).toBeInTheDocument()
        expect(screen.queryByText('Failed to load IHSG data')).not.toBeInTheDocument()
    })
})
