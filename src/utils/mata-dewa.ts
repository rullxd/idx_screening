import { getBrokerTierInfo } from '@/data/broker-tiers'
import { MarketDetectorBroker, parseMarketDetector, ParsedMarketDetector } from '@/utils/broker-activity'

export interface MataDewaDailySnapshot {
    date: string
    detector: ParsedMarketDetector
}

export interface BrokerCostPosition {
    code: string
    tier: 1 | 2 | 3
    netValue: number
    netLot: number
    avgCost: number
    side: 'NET_BUY' | 'NET_SELL' | 'FLAT'
    estimatedPnLPercent: number
}

export interface MataDewaSignal {
    key: string
    label: string
    tone: 'bullish' | 'bearish' | 'warning' | 'neutral'
    value: string
    description: string
}

export interface MataDewaAnalysis {
    symbol: string
    score: number
    verdict: 'STRONG_BUY' | 'BUY' | 'WAIT' | 'DANGER'
    verdictLabel: string
    latestDate?: string
    currentPrice: number
    netSmartMoney: number
    netRetail: number
    buyerConcentration: number
    sellerConcentration: number
    persistenceScore: number
    silentAccumulationScore: number
    smartMoneyFlowScore: number
    footprintZScore: number
    crossingShare: number
    fakeForeignScore: number
    avgCostPositions: BrokerCostPosition[]
    topAccumulators: BrokerCostPosition[]
    signals: MataDewaSignal[]
}

const formatCompact = (value: number): string => {
    const abs = Math.abs(value)
    const sign = value < 0 ? '-' : ''
    if (abs >= 1_000_000_000_000) return `${sign}${(abs / 1_000_000_000_000).toFixed(1)}T`
    if (abs >= 1_000_000_000) return `${sign}${(abs / 1_000_000_000).toFixed(1)}B`
    if (abs >= 1_000_000) return `${sign}${(abs / 1_000_000).toFixed(1)}M`
    return `${sign}${abs.toFixed(0)}`
}

function safeDiv(numerator: number, denominator: number): number {
    if (!Number.isFinite(numerator) || !Number.isFinite(denominator) || denominator <= 0) return 0
    return numerator / denominator
}

function sumValue(items: MarketDetectorBroker[]): number {
    return items.reduce((sum, item) => sum + item.value, 0)
}

function weightedAverage(items: Array<{ value: number; price: number }>): number {
    const value = items.reduce((sum, item) => sum + item.value, 0)
    if (value <= 0) return 0
    return items.reduce((sum, item) => sum + item.value * item.price, 0) / value
}

function brokerNetMap(snapshots: MataDewaDailySnapshot[]): Map<string, BrokerCostPosition> {
    const rows = new Map<string, { buyValue: number; sellValue: number; buyLot: number; sellLot: number; buyPrices: Array<{ value: number; price: number }> }>()

    snapshots.forEach(({ detector }) => {
        detector.buyers.forEach((buyer) => {
            const row = rows.get(buyer.code) || { buyValue: 0, sellValue: 0, buyLot: 0, sellLot: 0, buyPrices: [] }
            row.buyValue += buyer.value
            row.buyLot += buyer.lot
            if (buyer.avgPrice > 0) row.buyPrices.push({ value: buyer.value, price: buyer.avgPrice })
            rows.set(buyer.code, row)
        })

        detector.sellers.forEach((seller) => {
            const row = rows.get(seller.code) || { buyValue: 0, sellValue: 0, buyLot: 0, sellLot: 0, buyPrices: [] }
            row.sellValue += seller.value
            row.sellLot += seller.lot
            rows.set(seller.code, row)
        })
    })

    const result = new Map<string, BrokerCostPosition>()
    rows.forEach((row, code) => {
        const netValue = row.buyValue - row.sellValue
        const netLot = row.buyLot - row.sellLot
        const avgCost = weightedAverage(row.buyPrices)
        const tier = getBrokerTierInfo(code).tier
        result.set(code, {
            code,
            tier,
            netValue,
            netLot,
            avgCost,
            side: netValue > 0 ? 'NET_BUY' : netValue < 0 ? 'NET_SELL' : 'FLAT',
            estimatedPnLPercent: 0,
        })
    })

    return result
}

function currentPriceFrom(snapshot?: MataDewaDailySnapshot): number {
    if (!snapshot) return 0
    const avg = snapshot.detector.summary?.average || 0
    if (avg > 0) return avg
    const prices = [...snapshot.detector.buyers, ...snapshot.detector.sellers]
        .map((item) => item.avgPrice)
        .filter((price) => price > 0)
    return prices.length ? prices.reduce((sum, price) => sum + price, 0) / prices.length : 0
}

function concentration(items: MarketDetectorBroker[], topN = 3): number {
    const total = sumValue(items)
    if (total <= 0) return 0
    return [...items]
        .sort((a, b) => b.value - a.value)
        .slice(0, topN)
        .reduce((sum, item) => sum + item.value, 0) / total
}

function crossingShare(buyers: MarketDetectorBroker[], sellers: MarketDetectorBroker[]): number {
    const sellersByCode = new Map(sellers.map((seller) => [seller.code, seller]))
    const buyTotal = sumValue(buyers)
    let crossing = 0

    buyers.forEach((buyer) => {
        const seller = sellersByCode.get(buyer.code)
        if (!seller) return
        const smaller = Math.min(buyer.value, seller.value)
        const larger = Math.max(buyer.value, seller.value)
        if (safeDiv(smaller, larger) >= 0.75) crossing += smaller
    })

    return safeDiv(crossing, buyTotal)
}

function zScore(values: number[]): number {
    if (values.length < 5) return 0
    const latest = values[values.length - 1]
    const prior = values.slice(0, -1)
    const mean = prior.reduce((sum, value) => sum + value, 0) / prior.length
    const variance = prior.reduce((sum, value) => sum + (value - mean) ** 2, 0) / prior.length
    const deviation = Math.sqrt(variance)
    return deviation > 0 ? (latest - mean) / deviation : 0
}

function detectPersistence(snapshots: MataDewaDailySnapshot[]): number {
    const count = new Map<string, number>()
    snapshots.forEach(({ detector }) => {
        detector.buyers.slice(0, 3).forEach((buyer) => count.set(buyer.code, (count.get(buyer.code) || 0) + 1))
    })
    const max = Math.max(0, ...count.values())
    return safeDiv(max, snapshots.length)
}

function detectFakeForeign(snapshots: MataDewaDailySnapshot[]): number {
    let suspiciousValue = 0
    let foreignValue = 0

    snapshots.forEach(({ detector }) => {
        detector.buyers.forEach((buyer) => {
            const info = getBrokerTierInfo(buyer.code)
            if (!info.isForeign) return
            foreignValue += buyer.value
            const avgTicket = safeDiv(buyer.value, buyer.freq)
            if (avgTicket >= 50_000_000 && detector.summary?.totalValue && detector.summary.totalValue < 50_000_000_000) {
                suspiciousValue += buyer.value
            }
        })
    })

    return safeDiv(suspiciousValue, foreignValue)
}

function buildSignals(analysis: Omit<MataDewaAnalysis, 'signals' | 'verdict' | 'verdictLabel'>): MataDewaSignal[] {
    const signals: MataDewaSignal[] = []

    if (analysis.silentAccumulationScore >= 0.6) {
        signals.push({
            key: 'silent-accumulation',
            label: 'Silent Accumulation',
            tone: 'bullish',
            value: `${Math.round(analysis.silentAccumulationScore * 100)}%`,
            description: 'Top buyer konsisten menyerap barang selama histori watchlist, cocok dengan pola akumulasi senyap.',
        })
    }

    if (analysis.avgCostPositions.some((item) => item.tier !== 1 && item.avgCost > analysis.currentPrice && item.netValue > 0)) {
        signals.push({
            key: 'bandar-discount',
            label: 'Bandar Floating Loss',
            tone: 'bullish',
            value: 'Diskon',
            description: 'Ada broker kuat yang rata-rata modalnya masih di atas harga sekarang. Ini sering menjadi area pantau akumulasi.',
        })
    }

    if (analysis.crossingShare >= 0.25) {
        signals.push({
            key: 'crossing',
            label: 'Volume Palsu',
            tone: 'warning',
            value: `${Math.round(analysis.crossingShare * 100)}%`,
            description: 'Broker yang sama muncul di buy dan sell dengan nilai mirip. Fokus ke net flow, jangan gross volume.',
        })
    }

    if (analysis.netRetail > 0 && analysis.netSmartMoney < 0) {
        signals.push({
            key: 'distribution',
            label: 'Distribusi ke Retail',
            tone: 'bearish',
            value: formatCompact(analysis.netSmartMoney),
            description: 'Smart money net sell sementara retail net buy. Risiko barang sedang dilempar ke kerumunan.',
        })
    }

    if (analysis.footprintZScore >= 2) {
        signals.push({
            key: 'footprint-zscore',
            label: 'Footprint Abnormal',
            tone: 'warning',
            value: `${analysis.footprintZScore.toFixed(1)}σ`,
            description: 'Nilai transaksi terakhir jauh di atas baseline histori. Cocok untuk dicek apakah akumulasi asli atau crossing.',
        })
    }

    if (signals.length === 0) {
        signals.push({
            key: 'neutral',
            label: 'Belum Ada Anomali Kuat',
            tone: 'neutral',
            value: 'Wait',
            description: 'Pola belum dominan. Tunggu konsistensi broker dan konfirmasi harga.',
        })
    }

    return signals
}

export function analyzeMataDewa(symbol: string, rawSnapshots: Array<{ date: string; raw: unknown }>): MataDewaAnalysis {
    const snapshots = rawSnapshots
        .map((snapshot) => ({ date: snapshot.date, detector: parseMarketDetector(snapshot.raw) }))
        .filter((snapshot) => snapshot.detector.buyers.length > 0 || snapshot.detector.sellers.length > 0)

    const latest = snapshots[snapshots.length - 1]
    const currentPrice = currentPriceFrom(latest)
    const positions = Array.from(brokerNetMap(snapshots).values()).map((position) => ({
        ...position,
        estimatedPnLPercent: position.avgCost > 0 && currentPrice > 0 ? ((currentPrice - position.avgCost) / position.avgCost) * 100 : 0,
    }))

    const topAccumulators = positions
        .filter((position) => position.netValue > 0)
        .sort((a, b) => b.netValue - a.netValue)
        .slice(0, 5)

    const smartMoneyCodes = new Set(positions.filter((position) => position.tier !== 1).map((position) => position.code))
    const retailCodes = new Set(positions.filter((position) => position.tier === 1).map((position) => position.code))
    const netSmartMoney = positions.filter((position) => smartMoneyCodes.has(position.code)).reduce((sum, item) => sum + item.netValue, 0)
    const netRetail = positions.filter((position) => retailCodes.has(position.code)).reduce((sum, item) => sum + item.netValue, 0)
    const buyerConcentration = latest ? concentration(latest.detector.buyers) : 0
    const sellerConcentration = latest ? concentration(latest.detector.sellers) : 0
    const persistenceScore = detectPersistence(snapshots)
    const smartMoneyFlowScore = safeDiv(netSmartMoney, Math.abs(netSmartMoney) + Math.abs(netRetail))
    const silentAccumulationScore = Math.max(0, Math.min(1, (persistenceScore * 0.45) + (buyerConcentration * 0.3) + (smartMoneyFlowScore * 0.25)))
    const footprintZScore = zScore(snapshots.map((snapshot) => snapshot.detector.summary?.totalValue || sumValue(snapshot.detector.buyers)))
    const latestCrossingShare = latest ? crossingShare(latest.detector.buyers, latest.detector.sellers) : 0
    const fakeForeignScore = detectFakeForeign(snapshots)

    let score = 50
    score += smartMoneyFlowScore * 25
    score += buyerConcentration * 12
    score += persistenceScore * 15
    score += silentAccumulationScore * 15
    score -= sellerConcentration * 10
    score -= latestCrossingShare * 18
    if (netRetail > 0 && netSmartMoney < 0) score -= 20
    score = Math.round(Math.max(0, Math.min(100, score)))

    const base = {
        symbol: symbol.toUpperCase(),
        score,
        latestDate: latest?.date,
        currentPrice,
        netSmartMoney,
        netRetail,
        buyerConcentration,
        sellerConcentration,
        persistenceScore,
        silentAccumulationScore,
        smartMoneyFlowScore,
        footprintZScore,
        crossingShare: latestCrossingShare,
        fakeForeignScore,
        avgCostPositions: positions.sort((a, b) => b.netValue - a.netValue).slice(0, 10),
        topAccumulators,
    }

    const verdict = score >= 75 ? 'STRONG_BUY' : score >= 62 ? 'BUY' : score <= 35 ? 'DANGER' : 'WAIT'
    const verdictLabel = verdict === 'STRONG_BUY' ? 'Akumulasi Kuat' : verdict === 'BUY' ? 'Akumulasi' : verdict === 'DANGER' ? 'Distribusi/Risiko' : 'Wait & See'

    return {
        ...base,
        verdict,
        verdictLabel,
        signals: buildSignals(base),
    }
}
