import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import StockSearchBar from './StockSearchBar'

const mockUseTrendingStocks = vi.fn()

vi.mock('@/hooks/use-queries', () => ({
    useTrendingStocks: (...args: unknown[]) => mockUseTrendingStocks(...args),
}))

describe('StockSearchBar', () => {
    beforeEach(() => {
        mockUseTrendingStocks.mockReset()
    })

    it('renders popular chips and marks the selected symbol', () => {
        mockUseTrendingStocks.mockReturnValue({
            data: {
                trending: [
                    { symbol: 'BBRI', name: 'Bank Rakyat Indonesia' },
                    { symbol: 'BBCA', name: 'Bank Central Asia' },
                ],
            },
        })

        render(<StockSearchBar selectedSymbol="BBRI" onSelect={vi.fn()} />)

        expect(screen.getByLabelText('Cari Saham')).toBeInTheDocument()
        expect(screen.getByText('Populer:')).toBeInTheDocument()
        const selectedChip = screen.getByRole('button', { name: 'BBRI' })
        expect(selectedChip.className).toContain('border-accent-green')
        expect(screen.getByRole('button', { name: 'BBCA' })).toBeInTheDocument()
    })

    it('filters suggestions and selects a stock from dropdown', () => {
        const onSelect = vi.fn()
        mockUseTrendingStocks.mockReturnValue({
            data: [
                { symbol: 'BBRI', name: 'Bank Rakyat Indonesia' },
                { symbol: 'BBCA', name: 'Bank Central Asia' },
                { symbol: 'TLKM', name: 'Telkom Indonesia' },
            ],
        })

        render(<StockSearchBar selectedSymbol="BBRI" onSelect={onSelect} />)

        const input = screen.getByLabelText('Cari Saham')
        fireEvent.focus(input)
        fireEvent.change(input, { target: { value: 'bbca' } })

        expect((input as HTMLInputElement).value).toBe('BBCA')
        fireEvent.click(screen.getByRole('button', { name: /Bank Central Asia/i }))

        expect(onSelect).toHaveBeenCalledTimes(1)
        expect(onSelect).toHaveBeenCalledWith('BBCA')
    })

    it('submits uppercase symbol on Enter and ignores symbol shorter than 3 chars', () => {
        const onSelect = vi.fn()
        mockUseTrendingStocks.mockReturnValue({ data: [] })

        render(<StockSearchBar selectedSymbol="BBRI" onSelect={onSelect} />)

        const input = screen.getByLabelText('Cari Saham')
        fireEvent.change(input, { target: { value: 'bb' } })
        fireEvent.keyDown(input, { key: 'Enter' })
        expect(onSelect).not.toHaveBeenCalled()

        fireEvent.change(input, { target: { value: 'tlkm' } })
        fireEvent.keyDown(input, { key: 'Enter' })
        expect(onSelect).toHaveBeenCalledWith('TLKM')
    })
})