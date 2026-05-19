/**
 * Type definitions for all API responses
 * Ensures type safety across the application
 */

// ============= BROKER TYPES =============
export interface Broker {
    code: string
    name: string
    net_value: number
    buy_value: number
    sell_value: number
    total_value: number
    total_volume: number
    group: 'BROKER_GROUP_FOREIGN' | 'BROKER_GROUP_LOCAL' | 'BROKER_GROUP_GOVERNMENT'
}

export interface BrokerActivity {
    code: string
    name: string
    net_value: number
    net_lot: number
    buy_value: number
    buy_lot: number
    sell_value: number
    sell_lot: number
    total_volume: number
    group: string
}

export interface BrokerRankingResponse {
    data: Broker[]
    meta?: {
        total: number
        fetched_at: string
    }
}

// ============= STOCK TYPES =============
export interface Stock {
    code: string
    name: string
    sector?: string
    close: number
    change: number
    change_pct: number
    volume: number
    value: number
    bid: number
    ask: number
}

export interface StockDetail extends Stock {
    open?: number
    high?: number
    low?: number
    previous_close?: number
    volume_weighted_avg_price?: number
}

export interface ScreeningResult {
    code: string
    close: number
    change: number
    spread?: number
    net_value: number
    net_lot: number
    buy_freq: number
    foreign_net?: number
    brokers: string[]
    accdist: 'Acc' | 'Dist' | 'Neutral'
    score?: number
    volume?: number
    sector?: string
}

// ============= CHART TYPES =============
export interface ChartDataPoint {
    time: string
    value: number
    volume?: number
    open?: number
    high?: number
    low?: number
    close?: number
}

export interface IHSGChartResponse {
    data: ChartDataPoint[]
    current?: {
        value: number
        change: number
        change_pct: number
    }
    meta?: {
        timestamp: string
        period: string
    }
}

export interface StockChartResponse {
    data: ChartDataPoint[]
    stock: StockDetail
    meta?: {
        timestamp: string
        period: string
    }
}

// ============= TRENDING TYPES =============
export interface TrendingStock extends Stock {
    trend_score?: number
    momentum?: number
    reason?: string
}

export interface TrendingResponse {
    data: TrendingStock[]
    meta?: {
        timestamp: string
        count: number
    }
}

// ============= MARKET DETECTOR TYPES =============
export interface MarketDetectorSignal {
    code: string
    name: string
    signal_type: 'buy' | 'sell' | 'neutral'
    strength: number
    brokers_involved: string[]
    volume_change?: number
    price_change?: number
    timestamp?: string
}

export interface MarketDetectorResponse {
    data: MarketDetectorSignal[]
    meta?: {
        timestamp: string
        total_signals: number
    }
}

// ============= FILTER & SCREENER TYPES =============
export interface ScreenerFilters {
    brokerCode?: string
    fromDate?: string
    toDate?: string
    accdist?: 'ALL' | 'Acc' | 'Dist' | 'Neutral'
    minScore?: number
    minNetValue?: number
    maxNetValue?: number
    minFrequency?: number
    brokerList?: string[]
    searchText?: string
}

export interface ScreeningResponse {
    data: ScreeningResult[]
    summary?: {
        total_acc: number
        total_dist: number
        total_net_buy: number
        total_screened: number
    }
    meta?: {
        timestamp: string
        broker_code: string
        count: number
    }
}

// ============= ALERT TYPES =============
export interface Alert {
    id: string
    type: 'price_alert' | 'volume_alert' | 'broker_alert' | 'signal_alert'
    stock_code: string
    title: string
    message: string
    severity: 'info' | 'warning' | 'critical'
    triggered_at: string
    read: boolean
}

// ============= HEATMAP TYPES =============
export interface HeatmapCell {
    code: string
    value: number
    change?: number
    volume?: number
}

export interface HeatmapResponse {
    data: HeatmapCell[]
    meta?: {
        timestamp: string
        metric: string
    }
}

// ============= API REQUEST/RESPONSE WRAPPER =============
export interface APIResponse<T> {
    success: boolean
    data?: T
    error?: {
        code: string
        message: string
        details?: any
    }
    meta?: {
        timestamp: string
        cached?: boolean
        cache_key?: string
    }
}

// ============= ERROR TYPES =============
export interface APIError {
    code: string
    message: string
    details?: any
    timestamp: string
}

export class APIException extends Error {
    constructor(
        public code: string,
        message: string,
        public details?: any
    ) {
        super(message)
        this.name = 'APIException'
    }
}
