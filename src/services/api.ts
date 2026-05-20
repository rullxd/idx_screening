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
    brokerCode?: string
    limit?: number
    fromDate?: string
    toDate?: string
    transactionType?: string
    investorType?: string
    marketBoard?: string
}): Promise<any> {
    const brokerCode = (params?.brokerCode || 'AK').toUpperCase()
    return apiClient.get('/broker-activity', {
        params: {
            broker_code: brokerCode,
            limit: params?.limit ?? 50,
            transaction_type: params?.transactionType ?? 'TRANSACTION_TYPE_NET',
            investor_type: params?.investorType ?? 'INVESTOR_TYPE_ALL',
            market_board: params?.marketBoard ?? 'MARKET_TYPE_REGULER',
            ...(params?.fromDate ? { from: params.fromDate } : {}),
            ...(params?.toDate ? { to: params.toDate } : {}),
        },
        cancelKey: `broker-activity-${brokerCode}`,
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
                close: 0,          // harga live diambil dari /api/orderbook di ScreenerRow
                net_value: netValue,
                net_lot: buyLot - sellLot,
                buy_freq: buyFreq,
                sell_freq: sellFreq,
                buy_avg_price: buyPrice,  // avg harga beli broker (referensi internal)
                sell_avg_price: sellPrice, // avg harga jual broker (referensi internal)
                buy_brokers: data.buy.length,
                sell_brokers: data.sell.length,
                accdist,
                score,
                buy_value: buyValue,
                sell_value: sellValue,
                brokers: [],       // field wajib dari ScreeningResult type
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

export async function fetchOrderbook(symbol: string): Promise<any> {
    return apiClient.get('/orderbook', {
        params: { symbol: symbol.toUpperCase() },
        cancelKey: `orderbook-${symbol.toUpperCase()}`,
    })
}

export async function fetchIHSGChart(params?: {
    period?: string
    timeframe?: string
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
    params?: { timeframe?: string; period?: string }
): Promise<StockChartResponse> {
    const timeframeMap: Record<string, string> = {
        '1d': 'today',
        intraday: 'today',
        '1w': 'weekly',
        weekly: 'weekly',
        '1m': '1m',
        monthly: '1m',
        '3m': '3m',
        '3month': '3m',
        ytd: 'ytd',
        '1y': '1y',
        yearly: '1y',
        '3y': '3y',
        '3year': '3y',
        '5y': '5y',
        '5year': '5y',
        today: 'today',
    }
    const timeframe =
        timeframeMap[params?.timeframe || params?.period || '1d'] || params?.timeframe || 'today'

    return apiClient.get('/stock-chart', {
        params: { symbol: stockCode.toUpperCase(), timeframe },
        cancelKey: `stock-chart-${stockCode}-${timeframe}`,
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
        transactionType?: string
        marketBoard?: string
        investorType?: string
        limit?: number
    }
): Promise<MarketDetectorResponse> {
    const url = stockCode ? `/market-detector/${stockCode}` : '/market-detector'
    return apiClient.get(url, {
        params: {
            from: params?.fromDate,
            to: params?.toDate,
            transaction_type: params?.transactionType || 'TRANSACTION_TYPE_NET',
            market_board: params?.marketBoard || 'MARKET_BOARD_REGULER',
            investor_type: params?.investorType || 'INVESTOR_TYPE_ALL',
            limit: params?.limit || 25,
        },
        cancelKey: `market-detector-${stockCode || 'default'}`,
    })
}