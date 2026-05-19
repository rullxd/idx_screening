import { create } from 'zustand'

interface UIState {
    // Navigation
    currentPage: 'dashboard' | 'market' | 'screener' | 'broker-activity' | 'broker-ranking' | 'alerts' | 'heatmap' | 'stock-detail'
    currentBrokerSubpage: 'brokerlist' | 'marketdetector'

    // Modals & Drawers
    showStockDetail: boolean
    selectedStockCode: string | null
    detailDrawerOpen: boolean

    // UI State
    sidebarOpen: boolean
    mobileMenuOpen: boolean
    loadingOverlay: boolean

    // Actions
    setCurrentPage: (page: UIState['currentPage']) => void
    setCurrentBrokerSubpage: (subpage: UIState['currentBrokerSubpage']) => void
    showStockDetailModal: (code: string) => void
    hideStockDetailModal: () => void
    setSidebarOpen: (open: boolean) => void
    setMobileMenuOpen: (open: boolean) => void
    setLoadingOverlay: (loading: boolean) => void
}

type UIStateData = Omit<UIState, 'setCurrentPage' | 'setCurrentBrokerSubpage' | 'showStockDetailModal' | 'hideStockDetailModal' | 'setSidebarOpen' | 'setMobileMenuOpen' | 'setLoadingOverlay'>

const initialState: UIStateData = {
    currentPage: 'dashboard',
    currentBrokerSubpage: 'brokerlist',
    showStockDetail: false,
    selectedStockCode: null,
    detailDrawerOpen: false,
    sidebarOpen: true,
    mobileMenuOpen: false,
    loadingOverlay: false,
}

export const useUIStore = create<UIState>((set) => ({
    ...initialState,

    setCurrentPage: (page) => set({ currentPage: page }),

    setCurrentBrokerSubpage: (subpage) => set({ currentBrokerSubpage: subpage }),

    showStockDetailModal: (code) =>
        set({ showStockDetail: true, selectedStockCode: code, detailDrawerOpen: true }),

    hideStockDetailModal: () =>
        set({ showStockDetail: false, selectedStockCode: null, detailDrawerOpen: false }),

    setSidebarOpen: (open) => set({ sidebarOpen: open }),

    setMobileMenuOpen: (open) => set({ mobileMenuOpen: open }),

    setLoadingOverlay: (loading) => set({ loadingOverlay: loading }),
}))
