export interface StockTransaction {
    stockCode: string
    brokerCode: string
    value: number
    lot: number
    avgPrice: number
    freq: number
    date?: string
    investorType?: string
    iconUrl?: string
}

export interface ParsedBrokerActivity {
    buys: StockTransaction[]
    sells: StockTransaction[]
    date?: string
}

function mapInvestorType(type?: string): string {
    if (!type) return '—'
    if (type.includes('FOREIGN') || type === 'Asing') return 'Asing'
    if (type.includes('GOVERNMENT') || type === 'Pemerintah') return 'Pemerintah'
    return 'Lokal'
}

function normalizeRow(entry: any): StockTransaction {
    const value = Math.abs(Number(entry.value ?? entry.bval ?? entry.sval ?? 0))
    const lot = Math.abs(Number(entry.lot ?? entry.blot ?? entry.slot ?? 0))
    const avgPrice = Math.abs(
        Number(entry.avg_price ?? entry.netbs_buy_avg_price ?? entry.netbs_sell_avg_price ?? 0)
    )

    return {
        stockCode: (entry.stock_code || entry.netbs_stock_code || '').toUpperCase(),
        brokerCode: (entry.broker_code || entry.netbs_broker_code || '').toUpperCase(),
        value,
        lot,
        avgPrice,
        freq: Number(entry.freq ?? 0),
        date: entry.date || entry.netbs_date,
        investorType: mapInvestorType(entry.type),
        iconUrl: entry.company_detail?.icon_url,
    }
}

export function parseBrokerActivity(raw: any): ParsedBrokerActivity {
    const tx =
        raw?.broker_activity_transaction ??
        raw?.data?.broker_activity_transaction ??
        raw

    const buys = (tx?.brokers_buy ?? []).map((e: any) => normalizeRow(e))
    const sells = (tx?.brokers_sell ?? []).map((e: any) => normalizeRow(e))

    return {
        buys,
        sells,
        date: buys[0]?.date || sells[0]?.date,
    }
}

export interface MarketDetectorBroker {
    code: string
    value: number
    lot: number
    avgPrice: number
    freq: number
    investorType: string
}

export interface BandarTierData {
    accdist: string
    amount: number
    percent: number
    vol: number
}

export interface ParsedMarketDetector {
    symbol: string
    dateFrom?: string
    dateTo?: string
    summary?: {
        totalValue: number
        totalVolume: number
        accdist: string
        brokerAccdist: string
        totalBuyers: number
        totalSellers: number
        average: number
        numberBrokerBuySell: number
    }
    tiers?: {
        avg: BandarTierData
        avg5: BandarTierData
        top1: BandarTierData
        top3: BandarTierData
        top5: BandarTierData
        top10: BandarTierData
    }
    buyers: MarketDetectorBroker[]
    sellers: MarketDetectorBroker[]
}

function normalizeDetectorBroker(entry: any, side: 'buy' | 'sell'): MarketDetectorBroker {
    const isBuy = side === 'buy'
    return {
        code: (entry.netbs_broker_code || entry.broker_code || '').toUpperCase(),
        value: Math.abs(Number(isBuy ? entry.bval ?? entry.bvalv : entry.sval ?? entry.svalv ?? 0)),
        lot: Math.abs(Number(isBuy ? entry.blot ?? entry.blotv : entry.slot ?? entry.slotv ?? 0)),
        avgPrice: Math.abs(
            Number(
                isBuy ? entry.netbs_buy_avg_price : entry.netbs_sell_avg_price ?? entry.avg_price ?? 0
            )
        ),
        freq: Number(entry.freq ?? 0),
        investorType: mapInvestorType(entry.type),
    }
}

function normalizeTier(tier: any): BandarTierData {
    return {
        accdist: tier?.accdist ?? '—',
        amount: Number(tier?.amount ?? 0),
        percent: Number(tier?.percent ?? 0),
        vol: Number(tier?.vol ?? 0),
    }
}

export function parseMarketDetector(raw: any): ParsedMarketDetector {
    const payload = raw?.data ?? raw ?? {}
    const bandar = payload.bandar_detector ?? {}
    const summary = payload.broker_summary ?? {}

    return {
        symbol: (summary.symbol || '').toUpperCase(),
        dateFrom: payload.from,
        dateTo: payload.to,
        summary: {
            totalValue: Number(bandar.value ?? 0),
            totalVolume: Number(bandar.volume ?? 0),
            accdist: bandar.avg?.accdist ?? '—',
            brokerAccdist: bandar.broker_accdist ?? '—',
            totalBuyers: Number(bandar.total_buyer ?? 0),
            totalSellers: Number(bandar.total_seller ?? 0),
            average: Number(bandar.average ?? 0),
            numberBrokerBuySell: Number(bandar.number_broker_buysell ?? 0),
        },
        tiers: {
            avg: normalizeTier(bandar.avg),
            avg5: normalizeTier(bandar.avg5),
            top1: normalizeTier(bandar.top1),
            top3: normalizeTier(bandar.top3),
            top5: normalizeTier(bandar.top5),
            top10: normalizeTier(bandar.top10),
        },
        buyers: (summary.brokers_buy ?? []).map((e: any) => normalizeDetectorBroker(e, 'buy')),
        sellers: (summary.brokers_sell ?? []).map((e: any) => normalizeDetectorBroker(e, 'sell')),
    }
}
