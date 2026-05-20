import { create } from 'zustand'

export interface MarketAlert {
    id: string
    type: 'priceUp' | 'priceDown' | 'volumeSpike' | 'foreignAccumulation'
    title: string
    message: string
    time: string
    severity: 'high' | 'medium' | 'low'
    symbol?: string
}

interface AlertDataStore {
    alerts: MarketAlert[]
    addAlerts: (newAlerts: MarketAlert[]) => void
    clearAlerts: () => void
    removeAlert: (id: string) => void
}

const MAX_ALERTS = 100 // Batas maks alert yang disimpan

export const useAlertDataStore = create<AlertDataStore>((set) => ({
    alerts: [],

    addAlerts: (newAlerts) =>
        set((state) => {
            // Gabungkan alert baru di atas, potong jika melebihi batas
            const combined = [...newAlerts, ...state.alerts].slice(0, MAX_ALERTS)
            return { alerts: combined }
        }),

    clearAlerts: () => set({ alerts: [] }),

    removeAlert: (id) =>
        set((state) => ({
            alerts: state.alerts.filter((a) => a.id !== id),
        })),
}))