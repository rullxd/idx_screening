import { getBrokerTierInfo } from '@/data/broker-tiers'

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

export type BandarmologySignalTone = 'bullish' | 'bearish' | 'neutral' | 'warning'

export interface BandarmologySignal {
    key: string
    title: string
    tone: BandarmologySignalTone
    description: string
}

export interface BandarmologyInsight {
    netFlow: number
    buyRetailShare: number
    sellRetailShare: number
    buyerConcentration: number
    sellerConcentration: number
    crossingValue: number
    fakeRetailBuyers: string[]
    fakeRetailSellers: string[]
    dominantBuyerTier: 'Retail' | 'Whale' | 'Bandar' | 'Mixed'
    dominantSellerTier: 'Retail' | 'Whale' | 'Bandar' | 'Mixed'
    signals: BandarmologySignal[]
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

function sumValue(items: MarketDetectorBroker[]): number {
    return items.reduce((sum, item) => sum + item.value, 0)
}

function calculateTierShare(items: MarketDetectorBroker[], tier: 1 | 2 | 3): number {
    const total = sumValue(items)
    if (total <= 0) return 0
    const tierValue = items
        .filter((item) => getBrokerTierInfo(item.code).tier === tier)
        .reduce((sum, item) => sum + item.value, 0)
    return tierValue / total
}

function dominantTier(items: MarketDetectorBroker[]): 'Retail' | 'Whale' | 'Bandar' | 'Mixed' {
    const total = sumValue(items)
    if (total <= 0) return 'Mixed'

    const shares = {
        Retail: calculateTierShare(items, 1),
        Whale: calculateTierShare(items, 2),
        Bandar: calculateTierShare(items, 3),
    }

    if (shares.Bandar >= 0.45) return 'Bandar'
    if (shares.Whale >= 0.45) return 'Whale'
    if (shares.Retail >= 0.55) return 'Retail'
    return 'Mixed'
}

function calculateConcentration(items: MarketDetectorBroker[], topN: number): number {
    const total = sumValue(items)
    if (total <= 0) return 0
    const topValue = [...items]
        .sort((a, b) => b.value - a.value)
        .slice(0, topN)
        .reduce((sum, item) => sum + item.value, 0)
    return topValue / total
}

function crossingValue(buyers: MarketDetectorBroker[], sellers: MarketDetectorBroker[]): number {
    const sellerByCode = new Map(sellers.map((item) => [item.code, item]))
    let totalCrossing = 0

    buyers.forEach((buyer) => {
        const seller = sellerByCode.get(buyer.code)
        if (!seller) return

        const smaller = Math.min(buyer.value, seller.value)
        const larger = Math.max(buyer.value, seller.value)
        if (larger <= 0) return

        const similarity = smaller / larger
        if (similarity >= 0.75) {
            totalCrossing += smaller
        }
    })

    return totalCrossing
}

function findFakeRetail(items: MarketDetectorBroker[]): string[] {
    return items
        .filter((item) => {
            const info = getBrokerTierInfo(item.code)
            if (info.tier !== 1) return false
            if (item.freq <= 0) return false
            const valuePerClick = item.value / item.freq
            return valuePerClick >= 50_000_000
        })
        .map((item) => item.code)
}

export function analyzeBandarmology(
    buyers: MarketDetectorBroker[],
    sellers: MarketDetectorBroker[]
): BandarmologyInsight {
    const buyTotal = sumValue(buyers)
    const sellTotal = sumValue(sellers)
    const netFlow = buyTotal - sellTotal
    const buyRetailShare = calculateTierShare(buyers, 1)
    const sellRetailShare = calculateTierShare(sellers, 1)
    const buyerConcentration = calculateConcentration(buyers, 3)
    const sellerConcentration = calculateConcentration(sellers, 3)
    const crossing = crossingValue(buyers, sellers)
    const crossingShare = buyTotal > 0 ? crossing / buyTotal : 0
    const fakeRetailBuyers = findFakeRetail(buyers)
    const fakeRetailSellers = findFakeRetail(sellers)
    const dominantBuyerTier = dominantTier(buyers)
    const dominantSellerTier = dominantTier(sellers)

    const signals: BandarmologySignal[] = []

    if (netFlow > 0 && buyerConcentration >= 0.45 && sellRetailShare >= 0.45) {
        signals.push({
            key: 'accumulation',
            title: 'Akumulasi terdeteksi',
            tone: 'bullish',
            description:
                'Top buyer terkonsentrasi dan sisi seller didominasi ritel. Ini mirip pola perpindahan barang dari banyak tangan ke sedikit tangan.',
        })
    }

    if (netFlow < 0 && sellerConcentration >= 0.45 && buyRetailShare >= 0.45) {
        signals.push({
            key: 'distribution',
            title: 'Distribusi terdeteksi',
            tone: 'bearish',
            description:
                'Top seller sangat terkonsentrasi sementara penampung didominasi broker ritel. Risiko dump lanjutan meningkat.',
        })
    }

    if (crossingShare >= 0.25) {
        signals.push({
            key: 'crossing',
            title: 'Potensi crossing / volume semu',
            tone: 'warning',
            description:
                'Ada broker yang muncul besar di buyer dan seller sekaligus dengan nilai mirip. Fokus ke NET, jangan terpancing gross volume.',
        })
    }

    if (fakeRetailBuyers.length > 0 || fakeRetailSellers.length > 0) {
        signals.push({
            key: 'fake-retail',
            title: 'Broker ritel berukuran paus',
            tone: 'warning',
            description:
                'Value per frekuensi transaksi pada broker ritel terlalu besar. Kemungkinan ada akun besar yang menyamar sebagai arus ritel.',
        })
    }

    if (signals.length === 0) {
        signals.push({
            key: 'neutral',
            title: 'Belum ada anomali kuat',
            tone: 'neutral',
            description:
                'Pola buy/sell relatif seimbang. Gunakan mode wait and see sampai ada dominasi aliran yang lebih jelas.',
        })
    }

    return {
        netFlow,
        buyRetailShare,
        sellRetailShare,
        buyerConcentration,
        sellerConcentration,
        crossingValue: crossing,
        fakeRetailBuyers,
        fakeRetailSellers,
        dominantBuyerTier,
        dominantSellerTier,
        signals,
    }
}
