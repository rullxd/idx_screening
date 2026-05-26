import { useQuery, UseQueryResult } from '@tanstack/react-query'
import {
    fetchBrokerRanking,
    fetchBrokerActivity,
    fetchScreeningData,
    fetchIHSGChart,
    fetchOrderbook,
    fetchRunningTrade,
    fetchStockChart,
    fetchStockChartbit,
    fetchTrendingStocks,
    fetchMarketDetector,
} from '@/services/api'
import { ScreeningResponse, ScreenerFilters } from '@/types'
import { APIException } from '@/types'
import { analyzeMataDewa, analyzeRetailSellAnomaly, MataDewaAnalysis, RetailSellAnomalyResult } from '@/utils/mata-dewa'

/**
 * React Query hooks for all API endpoints
 * Handles caching, loading, error, and refetch states
 */

// ============= SHARED QUERY CONFIG (Optimization E) =============

const MAX_RETRY_ATTEMPT = 2

function shouldRetryQuery(failureCount: number, error: APIException): boolean {
    if (error?.code === 'HTTP_429') return false
    return failureCount < MAX_RETRY_ATTEMPT
}

/** Shared exponential backoff used across all hooks */
function exponentialRetryDelay(attemptIndex: number): number {
    return Math.min(1000 * 2 ** attemptIndex, 30000)
}

/** Default query options shared by most hooks to keep config DRY */
const sharedDefaults = {
    retry: shouldRetryQuery,
    retryDelay: exponentialRetryDelay,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
} as const

// ============= LRU CACHE WITH TTL (Optimization A) =============

const SNAPSHOT_CACHE_MAX_SIZE = 2000
const SNAPSHOT_CACHE_TTL = 24 * 60 * 60 * 1000 // 24 hours

interface CacheEntry<T> {
    data: T
    expiresAt: number
}

class LRUCache<T> {
    private cache = new Map<string, CacheEntry<T>>()
    private maxSize: number
    private ttl: number

    constructor(maxSize: number, ttl: number) {
        this.maxSize = maxSize
        this.ttl = ttl
    }

    get(key: string): T | undefined {
        const entry = this.cache.get(key)
        if (!entry) return undefined

        // Check TTL expiration
        if (Date.now() > entry.expiresAt) {
            this.cache.delete(key)
            return undefined
        }

        // Move to end (most recently used) by re-inserting
        this.cache.delete(key)
        this.cache.set(key, entry)
        return entry.data
    }

    set(key: string, data: T): void {
        // If key exists, delete first to update position
        if (this.cache.has(key)) {
            this.cache.delete(key)
        }

        // Evict oldest entries if at capacity
        while (this.cache.size >= this.maxSize) {
            const oldestKey = this.cache.keys().next().value
            if (oldestKey !== undefined) {
                this.cache.delete(oldestKey)
            } else {
                break
            }
        }

        this.cache.set(key, {
            data,
            expiresAt: Date.now() + this.ttl,
        })
    }

    has(key: string): boolean {
        return this.get(key) !== undefined // also checks TTL
    }

    get size(): number {
        return this.cache.size
    }

    /** Purge expired entries to free memory (call periodically if needed) */
    prune(): void {
        const now = Date.now()
        for (const [key, entry] of this.cache) {
            if (now > entry.expiresAt) {
                this.cache.delete(key)
            }
        }
    }
}

const mataDewaSnapshotCache = new LRUCache<any>(SNAPSHOT_CACHE_MAX_SIZE, SNAPSHOT_CACHE_TTL)

// ============= CONCURRENCY LIMITER (Optimization B) =============

/**
 * Limits concurrent async operations to prevent overwhelming the API.
 * Uses a simple semaphore pattern.
 */
class ConcurrencyLimiter {
    private running = 0
    private queue: Array<() => void> = []

    constructor(private maxConcurrency: number) {}

    async run<T>(fn: () => Promise<T>): Promise<T> {
        // Wait for a slot to become available
        if (this.running >= this.maxConcurrency) {
            await new Promise<void>((resolve) => this.queue.push(resolve))
        }

        this.running++
        try {
            return await fn()
        } finally {
            this.running--
            // Release next queued task
            const next = this.queue.shift()
            if (next) next()
        }
    }
}

/** Shared limiter: max 6 concurrent requests to upstream API for Mata Dewa scans */
const mataDewaLimiter = new ConcurrencyLimiter(6)

// ============= SHARED DATE UTILITIES =============

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

// ============= SHARED SNAPSHOT FETCHER (Optimization C) =============

/**
 * In-flight deduplication map: if the same snapshot is being fetched by
 * multiple hooks simultaneously, they share the same Promise.
 */
const inFlightSnapshots = new Map<string, Promise<any>>()

async function fetchMataDewaSnapshot(symbol: string, date: string): Promise<any> {
    const cacheKey = `${symbol}:${date}`

    // 1. Check LRU cache
    const cached = mataDewaSnapshotCache.get(cacheKey)
    if (cached !== undefined) {
        return cached
    }

    // 2. Deduplicate in-flight requests (Optimization C)
    const inflight = inFlightSnapshots.get(cacheKey)
    if (inflight) {
        return inflight
    }

    // 3. Fetch with concurrency limiter (Optimization B)
    const promise = mataDewaLimiter.run(async () => {
        // Double-check cache after waiting in queue
        const rechecked = mataDewaSnapshotCache.get(cacheKey)
        if (rechecked !== undefined) return rechecked

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
    })

    inFlightSnapshots.set(cacheKey, promise)

    try {
        const result = await promise
        return result
    } finally {
        inFlightSnapshots.delete(cacheKey)
    }
}

/**
 * Shared fetch logic for both useMataDewaDashboard and useRetailSellAnomaly.
 * Fetches snapshots for multiple symbols across multiple dates.
 */
async function fetchSnapshotsForSymbols(
    symbols: string[],
    dates: string[]
): Promise<Map<string, Array<{ date: string; raw: any }>>> {
    const resultMap = new Map<string, Array<{ date: string; raw: any }>>()

    await Promise.all(
        symbols.map(async (symbol) => {
            const snapshots: Array<{ date: string; raw: any }> = []
            for (const date of dates) {
                try {
                    const raw = await fetchMataDewaSnapshot(symbol, date)
                    snapshots.push({ date, raw })
                } catch (error) {
                    console.warn(`Mata Dewa skipped ${symbol} ${date}`, error)
                }
            }
            resultMap.set(symbol, snapshots)
        })
    )

    return resultMap
}

// ============= IHSG CHART PERIOD MAPPING =============

const CHART_PERIOD_MAP: Record<string, string> = {
    '1d': 'intraday',
    '1w': 'weekly',
    '1m': 'monthly',
    '3m': '3month',
    'ytd': 'ytd',
    '1y': 'yearly',
    '3y': '3year',
    '5y': '5year',
}

function getChartPeriod(timeframe: string): string {
    return CHART_PERIOD_MAP[timeframe] || 'intraday'
}

// ============= BROKER RANKING HOOK =============

export function useBrokerRanking(
    options?: { enabled?: boolean; refetchInterval?: number }
): UseQueryResult<any, APIException> {
    return useQuery({
        queryKey: ['brokers', 'ranking'],
        queryFn: () => fetchBrokerRanking({ // (H) simplified: removed unnecessary async wrapper
            sort: 'TB_SORT_BY_TOTAL_VALUE',
            order: 'ORDER_BY_DESC',
        }),
        staleTime: 5 * 60 * 1000,
        gcTime: 10 * 60 * 1000,
        ...sharedDefaults, // (E) shared config
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
        queryFn: () => fetchBrokerActivity({ // (H) simplified
            brokerCode: code,
            limit: options?.limit ?? 50,
            fromDate: options?.fromDate,
            toDate: options?.toDate,
        }),
        staleTime: 2 * 60 * 1000,
        gcTime: 5 * 60 * 1000,
        ...sharedDefaults, // (E)
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
        queryFn: () => fetchScreeningData(brokerCode, filters), // (H) simplified
        staleTime: 2 * 60 * 1000,
        gcTime: 5 * 60 * 1000,
        ...sharedDefaults, // (E)
        enabled: options?.enabled !== false && !!brokerCode,
    })
}

// ============= IHSG CHART HOOK =============

export function useIHSGChart(
    timeframe: string = '1d',
    options?: { enabled?: boolean; refetchInterval?: number }
): UseQueryResult<any, APIException> {
    return useQuery({
        queryKey: ['ihsg', 'chart', timeframe],
        queryFn: () => fetchIHSGChart({ // (H) simplified
            period: getChartPeriod(timeframe),
            timeframe: timeframe,
        }),
        staleTime: 5 * 1000,
        gcTime: 10 * 1000,
        ...sharedDefaults, // (E)
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
        queryFn: () => fetchOrderbook(symbol), // (H) already simple
        staleTime: 10 * 1000,
        gcTime: 10 * 1000,
        ...sharedDefaults, // (E)
        refetchOnMount: 'always',
        enabled: options?.enabled !== false && !!symbol,
        refetchInterval: options?.refetchInterval,
        refetchIntervalInBackground: false,
    })
}

// ============= RUNNING TRADE HOOK =============

export function useRunningTrade(
    symbol: string,
    date: string,
    options?: { enabled?: boolean; refetchInterval?: number | false; maxPages?: number }
): UseQueryResult<any, APIException> {
    const code = symbol.trim().toUpperCase()
    return useQuery({
        queryKey: ['running-trade', code, date, options?.maxPages],
        queryFn: () => fetchRunningTrade({ // (H) simplified
            symbol: code,
            date,
            limit: 80,
            maxPages: options?.maxPages ?? 8,
        }),
        staleTime: 15 * 1000,
        gcTime: 60 * 1000,
        ...sharedDefaults, // (E)
        refetchOnMount: 'always',
        enabled: options?.enabled !== false && code.length >= 3 && !!date,
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
        queryFn: () => fetchStockChart(symbol, { timeframe }), // (H) simplified
        staleTime: 5 * 1000,
        gcTime: 10 * 1000,
        ...sharedDefaults, // (E)
        refetchOnMount: 'always',
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
        queryFn: () => fetchStockChartbit(symbol, { timeframe }), // (H) simplified
        staleTime: 5 * 1000,
        gcTime: 10 * 1000,
        ...sharedDefaults, // (E)
        refetchOnMount: 'always',
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
        queryFn: () => fetchTrendingStocks({ // (H) simplified
            limit: 12,
            period: 'today',
        }),
        staleTime: 3 * 60 * 1000,
        gcTime: 10 * 60 * 1000,
        ...sharedDefaults, // (E)
        refetchOnMount: 'always',
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
            // (F) Fixed: use latestTradingDateString() to skip weekends correctly
            const targetDate = latestTradingDateString()

            const data = await fetchMarketDetector(stockCode, {
                fromDate: options?.fromDate || targetDate,
                toDate: options?.toDate || targetDate,
            })
            return data
        },
        staleTime: 60 * 1000,
        gcTime: 5 * 60 * 1000,
        ...sharedDefaults, // (E)
        refetchOnMount: 'always',
        enabled: options?.enabled !== false && !!stockCode,
        refetchInterval: options?.refetchInterval,
        refetchIntervalInBackground: false,
    })
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

            // (C) Use shared fetcher — if useRetailSellAnomaly fetches the same
            // snapshots concurrently, in-flight dedup prevents duplicate requests
            const snapshotMap = await fetchSnapshotsForSymbols(cleanSymbols, dates)

            const analyses = cleanSymbols.map((symbol) => {
                const snapshots = snapshotMap.get(symbol) || []
                return analyzeMataDewa(symbol, snapshots)
            })

            return analyses.sort((a, b) => b.score - a.score)
        },
        staleTime: 24 * 60 * 60 * 1000,
        gcTime: 7 * 24 * 60 * 60 * 1000,
        ...sharedDefaults, // (E)
        refetchOnMount: false,
        enabled: options?.enabled !== false && cleanSymbols.length > 0,
    })
}

// ============= XL/XC RETAIL SELL ANOMALY HOOK =============

export function useRetailSellAnomaly(
    symbols: string[],
    options?: { enabled?: boolean; days?: number }
): UseQueryResult<RetailSellAnomalyResult[], APIException> {
    const cleanSymbols = symbols.map((s) => s.trim().toUpperCase()).filter(Boolean)
    const days = options?.days ?? 20
    const latestTradingDate = latestTradingDateString()

    return useQuery({
        queryKey: ['retail-sell-anomaly', cleanSymbols, days, latestTradingDate],
        queryFn: async () => {
            const dates = recentTradingDateStrings(days)

            // (C) Shared fetcher — deduplicates with useMataDewaDashboard
            const snapshotMap = await fetchSnapshotsForSymbols(cleanSymbols, dates)

            const results = cleanSymbols.map((symbol) => {
                const snapshots = snapshotMap.get(symbol) || []
                return analyzeRetailSellAnomaly(symbol, snapshots)
            })

            return results
        },
        staleTime: 24 * 60 * 60 * 1000,
        gcTime: 7 * 24 * 60 * 60 * 1000,
        ...sharedDefaults, // (E)
        refetchOnMount: false,
        enabled: options?.enabled !== false && cleanSymbols.length > 0,
    })
}