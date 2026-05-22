import { useQuery, UseQueryResult } from '@tanstack/react-query'
import {
    fetchBrokerRanking,
    fetchBrokerActivity,
    fetchScreeningData,
    fetchIHSGChart,
    fetchOrderbook,
    fetchStockChart,
    fetchStockChartbit,
    fetchTrendingStocks,
    fetchMarketDetector,
} from '@/services/api'
import { ScreeningResponse, ScreenerFilters } from '@/types'
import { APIException } from '@/types'
import { analyzeMataDewa, MataDewaAnalysis } from '@/utils/mata-dewa'

/**
 * React Query hooks for all API endpoints
 * Handles caching, loading, error, and refetch states
 */

const MAX_RETRY_ATTEMPT = 2

function shouldRetryQuery(failureCount: number, error: APIException): boolean {
    // Do not hammer API when server already rate-limits us.
    if (error?.code === 'HTTP_429') return false
    return failureCount < MAX_RETRY_ATTEMPT
}

// ============= BROKER RANKING HOOK =============

export function useBrokerRanking(
    options?: { enabled?: boolean; refetchInterval?: number }
): UseQueryResult<any, APIException> {
    return useQuery({
        queryKey: ['brokers', 'ranking'],
        queryFn: async () => {
            const data = await fetchBrokerRanking({
                sort: 'TB_SORT_BY_TOTAL_VALUE',
                order: 'ORDER_BY_DESC',
            })
            return data
        },
        staleTime: 5 * 60 * 1000, // 5 minutes
        gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
        retry: 2,
        retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
        enabled: options?.enabled !== false,
        refetchInterval: options?.refetchInterval,
    })
}

// ============= BROKER ACTIVITY HOOK =============

export function useBrokerActivity(
    brokerCode: string,
    options?: {
        enabled?: boolean;
        limit?: number;
        refetchInterval?: number;
        fromDate?: string;
        toDate?: string;
    }
): UseQueryResult<any, APIException> {
    const code = brokerCode.trim().toUpperCase()
    return useQuery({
        queryKey: ['broker', 'activity', code, options?.limit, options?.fromDate, options?.toDate],
        queryFn: async () =>
            fetchBrokerActivity({
                brokerCode: code,
                limit: options?.limit ?? 50,
                fromDate: options?.fromDate,
                toDate: options?.toDate,
            }),
        staleTime: 2 * 60 * 1000,
        gcTime: 5 * 60 * 1000,
        retry: shouldRetryQuery,
        retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
        enabled: options?.enabled !== false && code.length >= 2,
        refetchInterval: options?.refetchInterval,
    })
}

// ============= SCREENING HOOK =============

export function useScreening(
    brokerCode: string,
    filters?: ScreenerFilters,
    options?: { enabled?: boolean }
): UseQueryResult<ScreeningResponse, APIException> {
    return useQuery({
        queryKey: ['screening', brokerCode, filters],
        queryFn: async () => {
            const data = await fetchScreeningData(brokerCode, filters)
            return data
        },
        staleTime: 2 * 60 * 1000, // 2 minutes
        gcTime: 5 * 60 * 1000,
        retry: 2,
        retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
        enabled: options?.enabled !== false && !!brokerCode,
    })
}

// ============= IHSG CHART HOOK =============

// Map timeframe to period
function getChartPeriod(timeframe: string): string {
    const periodMap: Record<string, string> = {
        '1d': 'intraday',
        '1w': 'weekly',
        '1m': 'monthly',
        '3m': '3month',
        'ytd': 'ytd',
        '1y': 'yearly',
        '3y': '3year',
        '5y': '5year',
    }
    return periodMap[timeframe] || 'intraday'
}

export function useIHSGChart(
    timeframe: string = '1d',
    options?: { enabled?: boolean; refetchInterval?: number }
): UseQueryResult<any, APIException> {
    return useQuery({
        queryKey: ['ihsg', 'chart', timeframe],
        queryFn: async () => {
            const data = await fetchIHSGChart({
                period: getChartPeriod(timeframe),
                timeframe: timeframe,
            })
            return data
        },
        staleTime: 5 * 1000, // 5 seconds - reduced from 2 minutes for timeframe switching
        gcTime: 10 * 1000, // 10 seconds
        retry: 2,
        retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
        enabled: options?.enabled !== false,
        refetchInterval: options?.refetchInterval,
    })
}

// ============= ORDERBOOK HOOK =============

export function useOrderbook(
    symbol: string,
    options?: { enabled?: boolean; refetchInterval?: number | false }
): UseQueryResult<any, APIException> {
    return useQuery({
        queryKey: ['orderbook', symbol],
        queryFn: async () => fetchOrderbook(symbol),
        staleTime: 10 * 1000,
        gcTime: 10 * 1000,
        retry: shouldRetryQuery,
        retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
        refetchOnMount: 'always',
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
        enabled: options?.enabled !== false && !!symbol,
        // Default tanpa polling; bisa di-override per pemanggil jika diperlukan.
        refetchInterval: options?.refetchInterval,
        refetchIntervalInBackground: false,
    })
}

// ============= STOCK CHART HOOK =============

export function useStockChart(
    symbol: string,
    timeframe: string = '1d',
    options?: { enabled?: boolean; refetchInterval?: number }
): UseQueryResult<any, APIException> {
    return useQuery({
        queryKey: ['stock', 'chart', symbol, timeframe],
        queryFn: async () => {
            const data = await fetchStockChart(symbol, { timeframe })
            return data
        },
        staleTime: 5 * 1000,
        gcTime: 10 * 1000,
        retry: shouldRetryQuery,
        retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
        refetchOnMount: 'always',
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
        enabled: options?.enabled !== false && !!symbol,
        refetchInterval: options?.refetchInterval,
    })
}

export function useStockChartbit(
    symbol: string,
    timeframe: string = '1d',
    options?: { enabled?: boolean; refetchInterval?: number }
): UseQueryResult<any, APIException> {
    return useQuery({
        queryKey: ['stock', 'chartbit', symbol, timeframe],
        queryFn: async () => fetchStockChartbit(symbol, { timeframe }),
        staleTime: 5 * 1000,
        gcTime: 10 * 1000,
        retry: shouldRetryQuery,
        retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
        refetchOnMount: 'always',
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
        enabled: options?.enabled !== false && !!symbol,
        refetchInterval: options?.refetchInterval,
    })
}

// ============= TRENDING STOCKS HOOK =============

export function useTrendingStocks(
    options?: { enabled?: boolean; refetchInterval?: number }
): UseQueryResult<any, APIException> {
    return useQuery({
        queryKey: ['stocks', 'trending'],
        queryFn: async () => {
            const data = await fetchTrendingStocks({
                limit: 12,
                period: 'today',
            })
            return data
        },
        staleTime: 3 * 60 * 1000, // 3 minutes
        gcTime: 10 * 60 * 1000,
        retry: shouldRetryQuery,
        retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
        refetchOnMount: 'always',
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
        enabled: options?.enabled !== false,
        refetchInterval: options?.refetchInterval,
    })
}

// ============= MARKET DETECTOR HOOK =============

export function useMarketDetector(
    stockCode?: string,
    options?: { enabled?: boolean; refetchInterval?: number; fromDate?: string; toDate?: string }
): UseQueryResult<any, APIException> {
    return useQuery({
        queryKey: ['market', 'detector', stockCode, options?.fromDate, options?.toDate],
        queryFn: async () => {
            // Logic: jika jam >= 19:00 pakai hari ini, jika belum pakai kemarin
            const now = new Date()
            const hour = now.getHours()
            const today = now.toISOString().split('T')[0]

            let targetDate: string
            if (hour >= 19) {
                // Setelah jam 19:00, pakai hari ini
                targetDate = today
            } else {
                // Sebelum jam 19:00, pakai kemarin
                const yesterday = new Date(now)
                yesterday.setDate(yesterday.getDate() - 1)
                targetDate = yesterday.toISOString().split('T')[0]
            }

            const data = await fetchMarketDetector(stockCode, {
                fromDate: options?.fromDate || targetDate,
                toDate: options?.toDate || targetDate,
            })
            return data
        },
        staleTime: 60 * 1000, // 1 minute
        gcTime: 5 * 60 * 1000,
        retry: shouldRetryQuery,
        retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
        refetchOnMount: 'always',
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
        enabled: options?.enabled !== false && !!stockCode,
        refetchInterval: options?.refetchInterval,
        refetchIntervalInBackground: false,
    })
}

function formatDate(date: Date): string {
    return date.toISOString().split('T')[0]
}

function recentTradingDateStrings(days: number): string[] {
    const dates: string[] = []
    const cursor = new Date()
    const hour = cursor.getHours()
    if (hour < 19) cursor.setDate(cursor.getDate() - 1)

    while (dates.length < days) {
        const day = cursor.getDay()
        if (day !== 0 && day !== 6) dates.unshift(formatDate(cursor))
        cursor.setDate(cursor.getDate() - 1)
    }

    return dates
}

function latestTradingDateString(): string {
    return recentTradingDateStrings(1)[0]
}

const mataDewaSnapshotCache = new Map<string, any>()

async function fetchMataDewaSnapshot(symbol: string, date: string): Promise<any> {
    const cacheKey = `${symbol}:${date}`
    if (mataDewaSnapshotCache.has(cacheKey)) {
        return mataDewaSnapshotCache.get(cacheKey)
    }

    const raw = await fetchMarketDetector(symbol, {
        fromDate: date,
        toDate: date,
        transactionType: 'TRANSACTION_TYPE_GROSS',
        marketBoard: 'MARKET_BOARD_REGULER',
        investorType: 'INVESTOR_TYPE_ALL',
        limit: 25,
    })
    mataDewaSnapshotCache.set(cacheKey, raw)
    return raw
}

// ============= MATA DEWA HISTORICAL DASHBOARD HOOK =============

export function useMataDewaDashboard(
    symbols: string[],
    options?: { enabled?: boolean; days?: number }
): UseQueryResult<MataDewaAnalysis[], APIException> {
    const cleanSymbols = symbols.map((symbol) => symbol.trim().toUpperCase()).filter(Boolean)
    const days = options?.days ?? 20
    const latestTradingDate = latestTradingDateString()

    return useQuery({
        queryKey: ['mata-dewa', cleanSymbols, days, latestTradingDate],
        queryFn: async () => {
            const dates = recentTradingDateStrings(days)
            const analyses = await Promise.all(
                cleanSymbols.map(async (symbol) => {
                    const snapshots = []
                    for (const date of dates) {
                        try {
                            const raw = await fetchMataDewaSnapshot(symbol, date)
                            snapshots.push({ date, raw })
                        } catch (error) {
                            // Some dates can be holidays or missing from the upstream API; keep the scan usable.
                            console.warn(`Mata Dewa skipped ${symbol} ${date}`, error)
                        }
                    }
                    return analyzeMataDewa(symbol, snapshots)
                })
            )

            return analyses.sort((a, b) => b.score - a.score)
        },
        staleTime: 24 * 60 * 60 * 1000,
        gcTime: 7 * 24 * 60 * 60 * 1000,
        retry: shouldRetryQuery,
        retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
        refetchOnMount: false,
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
        enabled: options?.enabled !== false && cleanSymbols.length > 0,
    })
}
