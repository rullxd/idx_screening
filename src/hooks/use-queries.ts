import { useQuery, UseQueryResult } from '@tanstack/react-query'
import {
    fetchBrokerRanking,
    fetchScreeningData,
    fetchIHSGChart,
    fetchTrendingStocks,
    fetchMarketDetector,
} from '@/services/api'
import { ScreeningResponse, ScreenerFilters } from '@/types'
import { APIException } from '@/types'

/**
 * React Query hooks for all API endpoints
 * Handles caching, loading, error, and refetch states
 */

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
        retry: 2,
        retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
        enabled: options?.enabled !== false,
        refetchInterval: options?.refetchInterval,
    })
}

// ============= MARKET DETECTOR HOOK =============

export function useMarketDetector(
    stockCode?: string,
    options?: { enabled?: boolean; refetchInterval?: number }
): UseQueryResult<any, APIException> {
    return useQuery({
        queryKey: ['market', 'detector', stockCode],
        queryFn: async () => {
            const data = await fetchMarketDetector(stockCode)
            return data
        },
        staleTime: 60 * 1000, // 1 minute
        gcTime: 5 * 60 * 1000,
        retry: 2,
        retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
        enabled: options?.enabled !== false && !!stockCode,
        refetchInterval: options?.refetchInterval || 60000, // Refresh every minute
    })
}
