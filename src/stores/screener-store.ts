import { create } from 'zustand'
import { ScreeningResult, ScreenerFilters } from '@/types'

interface ScreenerState {
    // Data
    results: ScreeningResult[]
    filteredResults: ScreeningResult[]
    summary: {
        total_acc: number
        total_dist: number
        total_net_buy: number
        total_screened: number
    }

    // Filter state
    filters: ScreenerFilters
    searchText: string

    // Loading & Error
    loading: boolean
    error: string | null

    // Sorting
    sortBy: keyof ScreeningResult | null
    sortOrder: 'asc' | 'desc'

    // Actions
    setResults: (results: ScreeningResult[]) => void
    setSummary: (summary: any) => void
    setFilters: (filters: ScreenerFilters) => void
    setSearchText: (text: string) => void
    setLoading: (loading: boolean) => void
    setError: (error: string | null) => void
    setSorting: (sortBy: keyof ScreeningResult | null, order?: 'asc' | 'desc') => void
    applyFiltersAndSearch: () => void
    reset: () => void
}

const initialState = {
    results: [],
    filteredResults: [],
    summary: {
        total_acc: 0,
        total_dist: 0,
        total_net_buy: 0,
        total_screened: 0,
    },
    filters: {},
    searchText: '',
    loading: false,
    error: null,
    sortBy: null,
    sortOrder: 'desc' as const,
}

export const useScreenerStore = create<ScreenerState>((set, get) => ({
    ...initialState,

    setResults: (results) => {
        set({ results })
        get().applyFiltersAndSearch()
    },

    setSummary: (summary) => set({ summary }),

    setFilters: (filters) => {
        set({ filters })
        get().applyFiltersAndSearch()
    },

    setSearchText: (text) => {
        set({ searchText: text })
        get().applyFiltersAndSearch()
    },

    setLoading: (loading) => set({ loading }),

    setError: (error) => set({ error }),

    setSorting: (sortBy, order = 'desc') => {
        set({ sortBy, sortOrder: order })
        get().applyFiltersAndSearch()
    },

    applyFiltersAndSearch: () => {
        const state = get()
        let filtered = [...state.results]

        // Apply text search
        if (state.searchText.trim()) {
            const query = state.searchText.toLowerCase()
            filtered = filtered.filter((r) => r.code.toLowerCase().includes(query))
        }

        // Apply filters
        if (state.filters.accdist && state.filters.accdist !== 'ALL') {
            filtered = filtered.filter((r) => r.accdist === state.filters.accdist)
        }

        if (state.filters.minScore) {
            filtered = filtered.filter((r) => (r.score || 0) >= state.filters.minScore!)
        }

        if (state.filters.minNetValue) {
            filtered = filtered.filter((r) => r.net_value >= state.filters.minNetValue!)
        }

        if (state.filters.minFrequency) {
            filtered = filtered.filter((r) => r.buy_freq >= state.filters.minFrequency!)
        }

        if (state.filters.brokerList?.length) {
            filtered = filtered.filter((r) =>
                r.brokers.some((b) => state.filters.brokerList!.includes(b))
            )
        }

        // Apply sorting
        if (state.sortBy) {
            filtered.sort((a, b) => {
                const aVal = a[state.sortBy!]
                const bVal = b[state.sortBy!]

                let comparison = 0
                if (typeof aVal === 'number' && typeof bVal === 'number') {
                    comparison = aVal - bVal
                } else if (typeof aVal === 'string' && typeof bVal === 'string') {
                    comparison = aVal.localeCompare(bVal)
                }

                return state.sortOrder === 'asc' ? comparison : -comparison
            })
        }

        set({ filteredResults: filtered })
    },

    reset: () => set(initialState),
}))
