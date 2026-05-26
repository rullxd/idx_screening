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
    bandarCostGap: number
    accumulationQualityScore: number
    distributionRiskScore: number
    fakeRetailScore: number
    absorptionStrength: number
    markupReadinessScore: number
    shakeoutScore: number
    smartMoneyDivergenceScore: number
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

function retailShare(items: MarketDetectorBroker[]): number {
    const total = sumValue(items)
    if (total <= 0) return 0
    const retail = items
        .filter((item) => getBrokerTierInfo(item.code).tier === 1)
        .reduce((sum, item) => sum + item.value, 0)
    return retail / total
}

function fakeRetailScore(items: MarketDetectorBroker[]): number {
    const retail = items.filter((item) => getBrokerTierInfo(item.code).tier === 1)
    const total = retail.reduce((sum, item) => sum + item.value, 0)
    if (total <= 0) return 0

    const suspicious = retail.reduce((sum, item) => {
        const avgTicket = safeDiv(item.value, item.freq)
        return avgTicket >= 50_000_000 ? sum + item.value : sum
    }, 0)

    return safeDiv(suspicious, total)
}

function latestSmartRetailFlow(detector?: ParsedMarketDetector) {
    const flow = { smartBuy: 0, smartSell: 0, retailBuy: 0, retailSell: 0 }
    if (!detector) return flow

    detector.buyers.forEach((item) => {
        if (getBrokerTierInfo(item.code).tier === 1) flow.retailBuy += item.value
        else flow.smartBuy += item.value
    })
    detector.sellers.forEach((item) => {
        if (getBrokerTierInfo(item.code).tier === 1) flow.retailSell += item.value
        else flow.smartSell += item.value
    })

    return flow
}

function clamp01(value: number): number {
    return Math.max(0, Math.min(1, value))
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

    if (analysis.accumulationQualityScore >= 0.7) {
        signals.push({
            key: 'accumulation-quality',
            label: 'Akumulasi Berkualitas',
            tone: 'bullish',
            value: `${Math.round(analysis.accumulationQualityScore * 100)}`,
            description: 'Net smart money, konsentrasi buyer, seller retail, persistensi, dan AVG cost mendukung pola akumulasi valid.',
        })
    }

    if (analysis.distributionRiskScore >= 0.65) {
        signals.push({
            key: 'distribution-risk',
            label: 'Distribution Risk',
            tone: 'bearish',
            value: `${Math.round(analysis.distributionRiskScore * 100)}`,
            description: 'Seller terkonsentrasi, smart money cenderung keluar, retail menampung, atau harga sudah jauh di atas AVG bandar.',
        })
    }

    if (analysis.fakeRetailScore >= 0.35) {
        signals.push({
            key: 'fake-retail',
            label: 'Fake Retail',
            tone: 'warning',
            value: `${Math.round(analysis.fakeRetailScore * 100)}%`,
            description: 'Broker ritel punya value per transaksi terlalu besar. Ada indikasi akun besar memakai topeng retail.',
        })
    }

    if (analysis.absorptionStrength >= 1.15 && analysis.buyerConcentration >= 0.35) {
        signals.push({
            key: 'absorption',
            label: 'Absorption Strength',
            tone: 'bullish',
            value: `${analysis.absorptionStrength.toFixed(2)}x`,
            description: 'Tekanan jual relatif terserap oleh buyer besar. Ini sering muncul sebelum supply mengering.',
        })
    }

    if (analysis.markupReadinessScore >= 0.68) {
        signals.push({
            key: 'markup-readiness',
            label: 'Ready to Mark Up',
            tone: 'bullish',
            value: `${Math.round(analysis.markupReadinessScore * 100)}`,
            description: 'Akumulasi senyap, persistensi buyer, konsentrasi, dan crossing rendah mendukung fase siap mark-up.',
        })
    }

    if (analysis.shakeoutScore >= 0.6) {
        signals.push({
            key: 'shakeout',
            label: 'Potensi Shakeout',
            tone: 'warning',
            value: `${Math.round(analysis.shakeoutScore * 100)}`,
            description: 'Harga dekat/di bawah AVG bandar, seller retail dominan, dan buyer kuat masih menyerap. Bedakan dari distribusi institusi.',
        })
    }

    if (Math.abs(analysis.smartMoneyDivergenceScore) >= 0.55) {
        signals.push({
            key: 'smart-money-divergence',
            label: analysis.smartMoneyDivergenceScore > 0 ? 'Bullish Divergence' : 'Bearish Divergence',
            tone: analysis.smartMoneyDivergenceScore > 0 ? 'bullish' : 'bearish',
            value: `${Math.round(analysis.smartMoneyDivergenceScore * 100)}`,
            description: analysis.smartMoneyDivergenceScore > 0
                ? 'Harga berada di bawah AVG utama tetapi smart money masih net buy. Ini anomali bullish yang perlu dipantau.'
                : 'Harga sudah premium terhadap AVG utama tetapi smart money net sell. Ini anomali bearish/distribusi.',
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

/* ─── XL / XC Net Sell Anomaly Detector ─── */

export interface RetailSellDaySnapshot {
    date: string
    xlNetValue: number
    xcNetValue: number
    combinedNetValue: number
    /** price reference on that day (avg from broksum) */
    price: number
}

export interface RetailSellAnomalyResult {
    symbol: string
    days: RetailSellDaySnapshot[]
    /** how many days both XL+XC were net sell */
    netSellDays: number
    totalDays: number
    /** average forward return (%) when XL+XC net sell together */
    avgReturnAfterSell: number
    /** win rate – how often price went up after XL+XC net sell */
    winRate: number
    /** total XL net value across period */
    xlTotalNet: number
    /** total XC net value across period */
    xcTotalNet: number
    /** combined XL+XC net value across period */
    combinedTotalNet: number
    /** overall price change from first to last snapshot */
    overallPriceChange: number
    /** anomaly verdict */
    verdict: 'BULLISH_ANOMALY' | 'BEARISH_ANOMALY' | 'NEUTRAL'
    verdictLabel: string
    insights: string[]
}

export function analyzeRetailSellAnomaly(
    symbol: string,
    rawSnapshots: Array<{ date: string; raw: unknown }>
): RetailSellAnomalyResult {
    const snapshots = rawSnapshots
        .map((s) => ({ date: s.date, detector: parseMarketDetector(s.raw) }))
        .filter((s) => s.detector.buyers.length > 0 || s.detector.sellers.length > 0)

    const days: RetailSellDaySnapshot[] = snapshots.map(({ date, detector }) => {
        const xlBuy = detector.buyers.filter((b) => b.code === 'XL').reduce((s, i) => s + i.value, 0)
        const xlSell = detector.sellers.filter((b) => b.code === 'XL').reduce((s, i) => s + i.value, 0)
        const xcBuy = detector.buyers.filter((b) => b.code === 'XC').reduce((s, i) => s + i.value, 0)
        const xcSell = detector.sellers.filter((b) => b.code === 'XC').reduce((s, i) => s + i.value, 0)
        const xlNet = xlBuy - xlSell
        const xcNet = xcBuy - xcSell

        const prices = [...detector.buyers, ...detector.sellers]
            .map((i) => i.avgPrice)
            .filter((p) => p > 0)
        const avgPrice = prices.length ? prices.reduce((a, b) => a + b, 0) / prices.length : 0

        return {
            date,
            xlNetValue: xlNet,
            xcNetValue: xcNet,
            combinedNetValue: xlNet + xcNet,
            price: detector.summary?.average || avgPrice,
        }
    })

    const netSellDays = days.filter((d) => d.combinedNetValue < 0).length
    const xlTotal = days.reduce((s, d) => s + d.xlNetValue, 0)
    const xcTotal = days.reduce((s, d) => s + d.xcNetValue, 0)
    const combinedTotal = xlTotal + xcTotal

    // Calculate forward returns: after each net sell day, what happened to price next?
    let wins = 0
    let totalReturn = 0
    let sellEvents = 0

    for (let i = 0; i < days.length - 1; i++) {
        if (days[i].combinedNetValue >= 0) continue
        // look at next day's price as forward return
        const nextPrice = days[i + 1].price
        const curPrice = days[i].price
        if (curPrice <= 0 || nextPrice <= 0) continue
        const fwdReturn = ((nextPrice - curPrice) / curPrice) * 100
        totalReturn += fwdReturn
        sellEvents++
        if (fwdReturn > 0) wins++
    }

    const avgReturnAfterSell = sellEvents > 0 ? totalReturn / sellEvents : 0
    const winRate = sellEvents > 0 ? (wins / sellEvents) * 100 : 0

    const firstPrice = days.find((d) => d.price > 0)?.price || 0
    const lastPrice = [...days].reverse().find((d) => d.price > 0)?.price || 0
    const overallPriceChange = firstPrice > 0 ? ((lastPrice - firstPrice) / firstPrice) * 100 : 0

    // Build verdict
    const isBullish = combinedTotal < 0 && (winRate >= 55 || overallPriceChange > 2 || avgReturnAfterSell > 0.15)
    const isBearish = combinedTotal > 0 && overallPriceChange < -2
    const verdict = isBullish ? 'BULLISH_ANOMALY' : isBearish ? 'BEARISH_ANOMALY' : 'NEUTRAL'
    const verdictLabel = verdict === 'BULLISH_ANOMALY'
        ? 'XL/XC Net Sell → Kecenderungan Naik'
        : verdict === 'BEARISH_ANOMALY'
            ? 'XL/XC Net Buy → Kecenderungan Turun'
            : 'Belum Ada Anomali Kuat'

    const insights: string[] = []
    if (combinedTotal < 0) {
        insights.push(`XL+XC net sell total ${formatCompact(combinedTotal)} selama ${netSellDays}/${days.length} hari.`)
    } else {
        insights.push(`XL+XC net buy total ${formatCompact(combinedTotal)} selama ${days.length} hari.`)
    }
    if (sellEvents > 0) {
        insights.push(`Setelah XL/XC net sell, harga naik ${winRate.toFixed(0)}% hari berikutnya (${wins}/${sellEvents}).`)
        insights.push(`Rata-rata return setelah XL/XC net sell: ${avgReturnAfterSell >= 0 ? '+' : ''}${avgReturnAfterSell.toFixed(2)}%.`)
    }
    if (overallPriceChange !== 0) {
        insights.push(`Perubahan harga total periode: ${overallPriceChange >= 0 ? '+' : ''}${overallPriceChange.toFixed(2)}%.`)
    }
    if (isBullish) {
        insights.push('⚡ ANOMALI: Ritel (XL/XC) membuang barang, tapi harga cenderung naik. Bandar/smart money kemungkinan akumulasi.')
    }
    if (xlTotal < 0 && xcTotal < 0) {
        insights.push(`Kedua broker ritel konsisten net sell. XL: ${formatCompact(xlTotal)}, XC: ${formatCompact(xcTotal)}.`)
    }

    return {
        symbol: symbol.toUpperCase(),
        days,
        netSellDays,
        totalDays: days.length,
        avgReturnAfterSell,
        winRate,
        xlTotalNet: xlTotal,
        xcTotalNet: xcTotal,
        combinedTotalNet: combinedTotal,
        overallPriceChange,
        verdict,
        verdictLabel,
        insights,
    }
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
    const latestBuyValue = latest ? sumValue(latest.detector.buyers) : 0
    const latestSellValue = latest ? sumValue(latest.detector.sellers) : 0
    const latestFlow = latestSmartRetailFlow(latest?.detector)
    const latestSmartNet = latestFlow.smartBuy - latestFlow.smartSell
    const latestRetailNet = latestFlow.retailBuy - latestFlow.retailSell
    const buyRetailShare = latest ? retailShare(latest.detector.buyers) : 0
    const sellRetailShare = latest ? retailShare(latest.detector.sellers) : 0
    const latestFakeRetailScore = latest
        ? Math.max(fakeRetailScore(latest.detector.buyers), fakeRetailScore(latest.detector.sellers))
        : 0
    const primaryAccumulator = topAccumulators.find((item) => item.tier !== 1 && item.avgCost > 0) || topAccumulators.find((item) => item.avgCost > 0)
    const bandarCostGap = primaryAccumulator?.avgCost && currentPrice > 0
        ? ((currentPrice - primaryAccumulator.avgCost) / primaryAccumulator.avgCost) * 100
        : 0
    const costDiscountScore = primaryAccumulator?.avgCost ? clamp01(-bandarCostGap / 8) : 0
    const costPremiumRisk = primaryAccumulator?.avgCost ? clamp01(bandarCostGap / 18) : 0
    const accumulationQualityScore = clamp01(
        (clamp01(smartMoneyFlowScore) * 0.28) +
        (buyerConcentration * 0.18) +
        (sellRetailShare * 0.16) +
        (persistenceScore * 0.16) +
        (costDiscountScore * 0.12) +
        ((1 - latestCrossingShare) * 0.1)
    )
    const distributionRiskScore = clamp01(
        (clamp01(-smartMoneyFlowScore) * 0.3) +
        (sellerConcentration * 0.18) +
        (buyRetailShare * 0.16) +
        (costPremiumRisk * 0.16) +
        (latestCrossingShare * 0.1) +
        ((latestRetailNet > 0 && latestSmartNet < 0) ? 0.1 : 0)
    )
    const absorptionStrength = safeDiv(latestBuyValue, latestSellValue)
    const markupReadinessScore = clamp01(
        (silentAccumulationScore * 0.32) +
        (persistenceScore * 0.22) +
        (buyerConcentration * 0.18) +
        (costDiscountScore * 0.12) +
        ((1 - latestCrossingShare) * 0.1) +
        (clamp01(absorptionStrength - 1) * 0.06)
    )
    const shakeoutScore = clamp01(
        (costDiscountScore * 0.32) +
        (sellRetailShare * 0.24) +
        (buyerConcentration * 0.18) +
        (clamp01(smartMoneyFlowScore) * 0.16) +
        ((latestSmartNet >= 0 && latestRetailNet < 0) ? 0.1 : 0)
    )
    const smartMoneyDivergenceScore = clamp01(Math.abs(smartMoneyFlowScore)) * Math.sign(smartMoneyFlowScore) * (bandarCostGap < 0 ? 1 : -1)

    let score = 50
    score += smartMoneyFlowScore * 18
    score += accumulationQualityScore * 18
    score += markupReadinessScore * 12
    score += shakeoutScore * 6
    score -= distributionRiskScore * 22
    score -= latestCrossingShare * 12
    score -= latestFakeRetailScore * 6
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
        bandarCostGap,
        accumulationQualityScore,
        distributionRiskScore,
        fakeRetailScore: latestFakeRetailScore,
        absorptionStrength,
        markupReadinessScore,
        shakeoutScore,
        smartMoneyDivergenceScore,
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
