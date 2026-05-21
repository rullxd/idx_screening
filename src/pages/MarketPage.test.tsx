import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import MarketPage from './MarketPage'

const mockChartDelay = vi.hoisted(() => ({
    value: 0,
}))

const mockWidgetState = vi.hoisted(() => ({
    orderbook: 'ready' as 'ready' | 'loading' | 'error',
    broker: 'ready' as 'ready' | 'loading' | 'error',
}))

vi.mock('@/components/Market/StockChartComponent', async () => {
    if (mockChartDelay.value > 0) {
        await new Promise((resolve) => setTimeout(resolve, mockChartDelay.value))
    }

    return {
        default: ({ symbol }: { symbol: string }) => <div data-testid="market-chart">chart-{symbol}</div>,
    }
})

vi.mock('@/components/Market/StockSearchBar', () => ({
    default: ({ selectedSymbol, onSelect }: { selectedSymbol: string; onSelect: (symbol: string) => void }) => (
        <div>
            <div data-testid="search-selected">selected-{selectedSymbol}</div>
            <button type="button" onClick={() => onSelect('BBCA')}>Pilih BBCA</button>
        </div>
    ),
}))

vi.mock('@/components/Market/OrderbookCard', () => ({
    default: ({ symbol }: { symbol: string }) => {
        if (mockWidgetState.orderbook === 'loading') {
            return <div aria-label={`orderbook-loading-${symbol}`}>orderbook-loading-{symbol}</div>
        }

        if (mockWidgetState.orderbook === 'error') {
            return <div>orderbook-error-{symbol}</div>
        }

        return <div data-testid="orderbook-card">orderbook-{symbol}</div>
    },
}))

vi.mock('@/components/Market/BrokerSummaryCard', () => ({
    default: ({ symbol }: { symbol: string }) => {
        if (mockWidgetState.broker === 'loading') {
            return <div aria-label={`broker-loading-${symbol}`}>broker-loading-{symbol}</div>
        }

        if (mockWidgetState.broker === 'error') {
            return <div>broker-error-{symbol}</div>
        }

        return <div data-testid="broker-card">broker-{symbol}</div>
    },
}))

describe('MarketPage', () => {
    beforeEach(() => {
        mockChartDelay.value = 0
        mockWidgetState.orderbook = 'ready'
        mockWidgetState.broker = 'ready'
    })

    it('shows chart suspense fallback while lazy chart module is still loading', async () => {
        mockChartDelay.value = 30

        render(<MarketPage />)

        expect(screen.getByLabelText('Memuat chart saham')).toBeInTheDocument()
        expect(await screen.findByTestId('market-chart')).toHaveTextContent('chart-BBRI')
        await waitFor(() => {
            expect(screen.queryByLabelText('Memuat chart saham')).not.toBeInTheDocument()
        })
    })

    it('renders market page with default symbol propagated to child widgets', async () => {
        render(<MarketPage />)

        expect(screen.getByRole('heading', { name: '📉 Market' })).toBeInTheDocument()
        expect(screen.getByTestId('search-selected')).toHaveTextContent('selected-BBRI')
        expect(screen.getByTestId('orderbook-card')).toHaveTextContent('orderbook-BBRI')
        expect(screen.getByTestId('broker-card')).toHaveTextContent('broker-BBRI')
        expect(await screen.findByTestId('market-chart')).toHaveTextContent('chart-BBRI')
    })

    it('updates selected symbol when stock is chosen from search bar', async () => {
        render(<MarketPage />)

        fireEvent.click(screen.getByRole('button', { name: 'Pilih BBCA' }))

        await waitFor(() => {
            expect(screen.getByTestId('search-selected')).toHaveTextContent('selected-BBCA')
            expect(screen.getByTestId('orderbook-card')).toHaveTextContent('orderbook-BBCA')
            expect(screen.getByTestId('broker-card')).toHaveTextContent('broker-BBCA')
        })

        expect(await screen.findByTestId('market-chart')).toHaveTextContent('chart-BBCA')
    })

    it('keeps selected symbol in sync across mixed child widget states', async () => {
        mockWidgetState.orderbook = 'loading'
        mockWidgetState.broker = 'error'

        render(<MarketPage />)

        expect(screen.getByTestId('search-selected')).toHaveTextContent('selected-BBRI')
        expect(screen.getByLabelText('orderbook-loading-BBRI')).toBeInTheDocument()
        expect(screen.getByText('broker-error-BBRI')).toBeInTheDocument()
        expect(await screen.findByTestId('market-chart')).toHaveTextContent('chart-BBRI')

        fireEvent.click(screen.getByRole('button', { name: 'Pilih BBCA' }))

        await waitFor(() => {
            expect(screen.getByTestId('search-selected')).toHaveTextContent('selected-BBCA')
            expect(screen.getByLabelText('orderbook-loading-BBCA')).toBeInTheDocument()
            expect(screen.getByText('broker-error-BBCA')).toBeInTheDocument()
        })

        expect(await screen.findByTestId('market-chart')).toHaveTextContent('chart-BBCA')
    })
})