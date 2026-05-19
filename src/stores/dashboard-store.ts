import { create } from 'zustand'
import { TrendingStock, ChartDataPoint } from '@/types'

interface DashboardState {
    // IHSG Data
    ihsgValue: number
    ihsgChange: number
    ihsgChangePct: number
    ihsgTimestamp: string | null

    // Chart Data
    ihsgChartData: ChartDataPoint[]
    ihsgChartLoading: boolean
    ihsgChartError: string | null

    // Trending Stocks
    trendingStocks: TrendingStock[]
    trendingLoading: boolean
    trendingError: string | null

    // Actions
    setIHSGData: (value: number, change: number, changePct: number) => void
    setIHSGChartData: (data: ChartDataPoint[]) => void
    setIHSGChartLoading: (loading: boolean) => void
    setIHSGChartError: (error: string | null) => void
    setTrendingStocks: (stocks: TrendingStock[]) => void
    setTrendingLoading: (loading: boolean) => void
    setTrendingError: (error: string | null) => void
    reset: () => void
}

const initialState = {
    ihsgValue: 0,
    ihsgChange: 0,
    ihsgChangePct: 0,
    ihsgTimestamp: null,
    ihsgChartData: [],
    ihsgChartLoading: false,
    ihsgChartError: null,
    trendingStocks: [],
    trendingLoading: false,
    trendingError: null,
}

export const useDashboardStore = create<DashboardState>((set) => ({
    ...initialState,

    setIHSGData: (value, change, changePct) =>
        set({
            ihsgValue: value,
            ihsgChange: change,
            ihsgChangePct: changePct,
            ihsgTimestamp: new Date().toISOString(),
        }),

    setIHSGChartData: (data) => set({ ihsgChartData: data }),

    setIHSGChartLoading: (loading) => set({ ihsgChartLoading: loading }),

    setIHSGChartError: (error) => set({ ihsgChartError: error }),

    setTrendingStocks: (stocks) => set({ trendingStocks: stocks }),

    setTrendingLoading: (loading) => set({ trendingLoading: loading }),

    setTrendingError: (error) => set({ trendingError: error }),

    reset: () => set(initialState),
}))
