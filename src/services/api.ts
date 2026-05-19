import { apiClient } from './api-client'
import {
    BrokerRankingResponse,
    TrendingResponse,
    IHSGChartResponse,
    StockChartResponse,
    MarketDetectorResponse,
    ScreenerFilters,
    Broker,
} from '@/types'

/**
 * All API endpoint functions
 * Each function is type-safe and handles errors consistently
 */

// ============= BROKER ENDPOINTS =============

export async function fetchBrokerRanking(
    params?: {
        sort?: string
        order?: string
        fromDate?: string
        toDate?: string
        marketType?: string
        eodOnly?: boolean
    }
): Promise<Broker[]> {
    const response = await apiClient.get<BrokerRankingResponse>(
        '/broker-ranking',
        {
            params,
            cancelKey: 'broker-ranking',
        }
    )
    // API returns { data: Broker[] } structure
    return response.data || []
}

export async function fetchBrokerActivity(params?: {
    brokerCode: string
    fromDate?: string
    toDate?: string
    transactionType?: string
    investorType?: string
    marketBoard?: string
}): Promise<any> {
    return apiClient.get('/broker-activity', {
        params,
        cancelKey: 'broker-activity',
    })
}

// ============= SCREENING ENDPOINTS =============

// Transform broker activity data into stock screening format
function transformBrokerActivityToScreening(rawData: any): any[] {
    try {
        if (!rawData) {
            console.warn('transformBrokerActivityToScreening: rawData is null/undefined')
            return []
        }

        // Handle different response structures
        let brokerActivity: any = {}

        if (rawData.data?.broker_activity_transaction) {
            // Structure: { data: { broker_activity_transaction: { brokers_buy, brokers_sell } } }
            brokerActivity = rawData.data.broker_activity_transaction
        } else if (rawData.broker_activity_transaction) {
            // Structure: { broker_activity_transaction: { brokers_buy, brokers_sell } }
            brokerActivity = rawData.broker_activity_transaction
        }

        const brokersBuy = Array.isArray(brokerActivity.brokers_buy) ? brokerActivity.brokers_buy : []
        const brokersSell = Array.isArray(brokerActivity.brokers_sell) ? brokerActivity.brokers_sell : []

        console.log(`[Screener] Transform: ${brokersBuy.length} buy, ${brokersSell.length} sell transactions`)

        const stockMap = new Map()

        brokersBuy.forEach((entry: any) => {
            const code = entry.stock_code
            if (!stockMap.has(code)) {
                stockMap.set(code, {
                    code,
                    buy: [],
                    sell: [],
                    icon: entry.company_detail?.icon_url,
                    corpAction: entry.company_detail?.corpaction,
                })
            }
            stockMap.get(code).buy.push(entry)
        })

        brokersSell.forEach((entry: any) => {
            const code = entry.stock_code
            if (!stockMap.has(code)) {
                stockMap.set(code, {
                    code,
                    buy: [],
                    sell: [],
                    icon: entry.company_detail?.icon_url,
                    corpAction: entry.company_detail?.corpaction,
                })
            }
            stockMap.get(code).sell.push(entry)
        })

        const results = Array.from(stockMap.entries()).map(([code, data]) => {
            const buyValue = data.buy.reduce((s: number, b: any) => s + (b.value || 0), 0)
            const sellValue = data.sell.reduce((s: number, b: any) => s + (b.value || 0), 0)
            const netValue = buyValue - sellValue

            const buyLot = data.buy.reduce((s: number, b: any) => s + (b.lot || 0), 0)
            const sellLot = data.sell.reduce((s: number, b: any) => s + (b.lot || 0), 0)

            const buyFreq = data.buy.reduce((s: number, b: any) => s + (b.freq || 0), 0)
            const sellFreq = data.sell.reduce((s: number, b: any) => s + (b.freq || 0), 0)

            const buyPrice =
                data.buy.length > 0
                    ? data.buy.reduce((s: number, b: any) => s + (b.avg_price || 0), 0) / data.buy.length
                    : 0
            const sellPrice =
                data.sell.length > 0
                    ? data.sell.reduce((s: number, b: any) => s + (b.avg_price || 0), 0) / data.sell.length
                    : 0

            let accdist = 'Neutral'
            let score = 5
            if (netValue > 20000000000) {
                accdist = 'Strong Acc'
                score = 9
            } else if (netValue > 10000000000) {
                accdist = 'Acc'
                score = 8
            } else if (netValue > 3000000000) {
                accdist = 'Weak Acc'
                score = 6
            } else if (netValue < -20000000000) {
                accdist = 'Strong Dist'
                score = 1
            } else if (netValue < -10000000000) {
                accdist = 'Dist'
                score = 2
            } else if (netValue < -3000000000) {
                accdist = 'Weak Dist'
                score = 4
            }

            if (buyFreq > 5000) score = Math.min(10, score + 1)
            if (buyLot > 50000) score = Math.min(10, score + 1)
            if (buyPrice > sellPrice * 1.02) score = Math.min(10, score + 1)

            return {
                code,
                close: buyPrice || sellPrice || 0,
                open: sellPrice,
                spread: (buyPrice || 0) - (sellPrice || 0),
                net_value: netValue,
                net_lot: buyLot - sellLot,
                buy_freq: buyFreq,
                sell_freq: sellFreq,
                foreign_buy: 0,
                buy_brokers: data.buy.length,
                sell_brokers: data.sell.length,
                accdist,
                score,
                buy_value: buyValue,
                sell_value: sellValue,
            }
        })

        console.log(`[Screener] Transformed ${results.length} unique stocks`)
        return results
    } catch (error) {
        console.error('[Screener] Transform error:', error)
        return []
    }
}

export async function fetchScreeningData(
    brokerCode: string,
    filters?: ScreenerFilters
): Promise<any> {
    const response = await apiClient.get('/broker-activity', {
        params: {
            broker_code: brokerCode,
            ...filters,
        },
        cancelKey: 'screening',
    })

    // Transform broker activity to stock screening format
    return transformBrokerActivityToScreening(response)
}

// ============= CHART ENDPOINTS =============

export async function fetchIHSGChart(params?: {
    period?: string
    fromDate?: string
    toDate?: string
}): Promise<IHSGChartResponse> {
    return apiClient.get('/ihsg-chart', {
        params,
        cancelKey: 'ihsg-chart',
    })
}

export async function fetchStockChart(
    stockCode: string,
    params?: { period?: string; fromDate?: string; toDate?: string }
): Promise<StockChartResponse> {
    return apiClient.get(`/stock-chart/${stockCode}`, {
        params,
        cancelKey: `stock-chart-${stockCode}`,
    })
}

// ============= TRENDING ENDPOINTS =============

export async function fetchTrendingStocks(params?: {
    limit?: number
    period?: string
}): Promise<TrendingResponse> {
    return apiClient.get('/trending', {
        params,
        cancelKey: 'trending',
    })
}

// ============= MARKET DETECTOR ENDPOINTS =============

export async function fetchMarketDetector(
    stockCode?: string,
    params?: {
        fromDate?: string
        toDate?: string
        minSignalStrength?: number
    }
): Promise<MarketDetectorResponse> {
    const url = stockCode ? `/market-detector/${stockCode}` : '/market-detector'
    return apiClient.get(url, {
        params,
        cancelKey: `market-detector-${stockCode || 'default'}`,
    })
}

// ============= HELPER FUNCTIONS =============

/**
 * Format large numbers for display (T/M/jt format)
 */
export function formatBigNumber(value: number | string): string {
    const num = typeof value === 'string' ? parseFloat(value) : value
    if (isNaN(num)) return '0'
    if (num === 0) return '0'
    if (num >= 1_000_000_000) return (num / 1_000_000_000).toFixed(1) + 'T'
    if (num >= 1_000_000) return (num / 1_000_000).toFixed(1) + 'M'
    if (num >= 1_000) return (num / 1_000).toFixed(1) + 'jt'
    return num.toFixed(0)
}

/**
 * Format percentage change
 */
export function formatPercent(value: number | string): string {
    const num = typeof value === 'string' ? parseFloat(value) : value
    if (isNaN(num)) return '0%'
    const sign = num >= 0 ? '+' : ''
    return `${sign}${num.toFixed(2)}%`
}

/**
 * Format currency in Rupiah with K/M/T notation
 */
export function formatCurrency(value: number | string): string {
    const num = typeof value === 'string' ? parseFloat(value) : value
    if (isNaN(num)) return '0'

    const abs = Math.abs(num)
    const sign = num < 0 ? '-' : ''

    if (abs >= 1_000_000_000) return `${sign}${(abs / 1_000_000_000).toFixed(2)}T`
    if (abs >= 1_000_000) return `${sign}${(abs / 1_000_000).toFixed(2)}M`

    return `${sign}${abs.toLocaleString('id-ID')}`
}

/**
 * Format volume
 */
export function formatVolume(value: number | string): string {
    const num = typeof value === 'string' ? parseFloat(value) : value
    if (isNaN(num)) return '0'
    if (num >= 1_000_000) return (num / 1_000_000).toFixed(1) + 'M'
    if (num >= 1_000) return (num / 1_000).toFixed(1) + 'K'
    return num.toFixed(0)
}
