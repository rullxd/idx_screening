import { create } from 'zustand'
import { Broker } from '@/types'

interface BrokerRankingState {
    // Data
    brokers: Broker[]
    topBuyers: Broker[]
    topSellers: Broker[]

    // Metrics
    topBuyer: Broker | null
    topSeller: Broker | null
    foreignNetFlow: number
    localNetFlow: number

    // Loading & Error
    loading: boolean
    error: string | null

    // Actions
    setBrokers: (brokers: Broker[]) => void
    calculateMetrics: () => void
    setLoading: (loading: boolean) => void
    setError: (error: string | null) => void
    reset: () => void
}

const initialState = {
    brokers: [],
    topBuyers: [],
    topSellers: [],
    topBuyer: null,
    topSeller: null,
    foreignNetFlow: 0,
    localNetFlow: 0,
    loading: false,
    error: null,
}

export const useBrokerRankingStore = create<BrokerRankingState>((set, get) => ({
    ...initialState,

    setBrokers: (brokers) => {
        set({ brokers })
        set((state) => {
            const newState = { ...state }
            newState.topBuyers = [...brokers]
                .sort((a, b) => b.buy_value - a.buy_value)
                .slice(0, 10)
            newState.topSellers = [...brokers]
                .sort((a, b) => b.sell_value - a.sell_value)
                .slice(0, 10)
            return newState
        })
        get().calculateMetrics()
    },

    calculateMetrics: () => {
        const state = get()
        const brokers = state.brokers

        const topBuyer = brokers.reduce((max, b) =>
            b.buy_value > max.buy_value ? b : max
        )
        const topSeller = brokers.reduce((max, b) =>
            b.sell_value > max.sell_value ? b : max
        )

        const foreignNetFlow = brokers
            .filter((b) => b.group === 'BROKER_GROUP_FOREIGN')
            .reduce((sum, b) => sum + b.net_value, 0)

        const localNetFlow = brokers
            .filter((b) => b.group === 'BROKER_GROUP_LOCAL')
            .reduce((sum, b) => sum + b.net_value, 0)

        set({
            topBuyer: topBuyer || null,
            topSeller: topSeller || null,
            foreignNetFlow,
            localNetFlow,
        })
    },

    setLoading: (loading) => set({ loading }),

    setError: (error) => set({ error }),

    reset: () => set(initialState),
}))
