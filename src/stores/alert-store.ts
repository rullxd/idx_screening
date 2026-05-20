import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface AlertSettings {
    // Toggle fitur
    enabled: boolean
    telegramEnabled: boolean

    // Ambang batas
    priceChangeThreshold: number   // persen, default 2
    volumeChangeThreshold: number  // persen, default 50
    foreignNetBuyThreshold: number // miliar IDR, default 5
    pollingIntervalMinutes: number // menit, default 2

    // Filter saham
    watchlistMode: 'trending' | 'custom'
    customWatchlist: string[]       // daftar kode saham custom (misal: ['BBCA', 'TLKM'])
    maxStocksMonitored: number      // maks saham dipantau, default 10

    // Jenis alert yang diaktifkan
    alertTypes: {
        priceUp: boolean
        priceDown: boolean
        volumeSpike: boolean
        foreignAccumulation: boolean
    }

    // Notifikasi in-app
    inAppNotifications: boolean
}

interface AlertStore {
    settings: AlertSettings
    updateSettings: (patch: Partial<AlertSettings>) => void
    updateAlertTypes: (patch: Partial<AlertSettings['alertTypes']>) => void
    addToWatchlist: (symbol: string) => void
    removeFromWatchlist: (symbol: string) => void
    resetToDefaults: () => void
}

const defaultSettings: AlertSettings = {
    enabled: true,
    telegramEnabled: true,
    priceChangeThreshold: 2,
    volumeChangeThreshold: 50,
    foreignNetBuyThreshold: 5,
    pollingIntervalMinutes: 2,
    watchlistMode: 'trending',
    customWatchlist: [],
    maxStocksMonitored: 10,
    alertTypes: {
        priceUp: true,
        priceDown: true,
        volumeSpike: true,
        foreignAccumulation: true,
    },
    inAppNotifications: true,
}

export const useAlertStore = create<AlertStore>()(
    persist(
        (set) => ({
            settings: defaultSettings,

            updateSettings: (patch) =>
                set((state) => ({
                    settings: { ...state.settings, ...patch },
                })),

            updateAlertTypes: (patch) =>
                set((state) => ({
                    settings: {
                        ...state.settings,
                        alertTypes: { ...state.settings.alertTypes, ...patch },
                    },
                })),

            addToWatchlist: (symbol) =>
                set((state) => {
                    const upper = symbol.toUpperCase().trim()
                    if (state.settings.customWatchlist.includes(upper)) return state
                    return {
                        settings: {
                            ...state.settings,
                            customWatchlist: [...state.settings.customWatchlist, upper],
                        },
                    }
                }),

            removeFromWatchlist: (symbol) =>
                set((state) => ({
                    settings: {
                        ...state.settings,
                        customWatchlist: state.settings.customWatchlist.filter((s) => s !== symbol),
                    },
                })),

            resetToDefaults: () => set({ settings: defaultSettings }),
        }),
        {
            name: 'idx-alert-settings',
        }
    )
)