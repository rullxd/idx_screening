/**
 * BANDARSCOPE — Akumulasi vs Distribusi Detector
 *
 * Membaca komposisi Top Buyer & Top Seller dari Broksum,
 * lalu menentukan fase pasar dan sinyal aksi.
 */

import { getBrokerInfo, getBrokerTier, BrokerTier } from '@/data/broker-tiers'
import { MarketDetectorBroker } from '@/utils/broker-activity'

export type MarketPhase =
    | 'STRONG_ACCUMULATION'   // Bandar/Whale borong, retail jual → sangat bullish
    | 'ACCUMULATION'          // Whale/Bandar di top buyer, seller tersebar → bullish
    | 'DISTRIBUTION'          // Whale/Bandar dominasi seller, retail nampung → bahaya
    | 'STRONG_DISTRIBUTION'   // Distribusi masif, harga puncak → sangat bahaya
    | 'FAKE_VOLUME'           // Broker yang sama di buy & sell, nilai mirip → volume palsu
    | 'NEUTRAL'               // Tidak ada pola dominan yang jelas

export type PhaseAction = 'BUY_SIGNAL' | 'SELL_SIGNAL' | 'WAIT' | 'OBSERVE'

export interface BrokerNetFlow {
    code: string
    tier: BrokerTier
    tierLabel: string
    buyValue: number
    sellValue: number
    netValue: number        // positif = net buy, negatif = net sell
    avgBuyPrice: number
    avgSellPrice: number
    avgPerTradeBuy: number  // untuk tape reading
    avgPerTradeSell: number
    isBandarBunglon: boolean // retail label tapi avg/trade > 50 jt
}

export interface AccDistResult {
    phase: MarketPhase
    action: PhaseAction
    confidence: number          // 0–100
    label: string               // teks pendek untuk badge
    description: string         // penjelasan detail
    reasons: string[]           // bullet-point alasan
    dominantBuyers: BrokerNetFlow[]   // kasta 2 & 3 yang net buy
    dominantSellers: BrokerNetFlow[]  // kasta 2 & 3 yang net sell
    fakeVolumebrokers: string[]       // broker yang ada di kedua sisi dengan nilai mirip
    whaleNetFlow: number        // total net value kasta 2 (+ = beli, - = jual)
    bandarNetFlow: number       // total net value kasta 3
    retailNetFlow: number       // total net value kasta 1
    concentrationScore: number  // top 3 buyer % dari total → makin tinggi makin terkonsentrasi
}

const BANDAR_BUNGLON_THRESHOLD = 50_000_000  // 50 juta per transaksi

function avgPerTrade(value: number, freq: number): number {
    if (!freq || freq === 0) return 0
    return value / freq
}

function isBandarBunglon(broker: MarketDetectorBroker, tier: BrokerTier): boolean {
    // Retail tier tapi avg per trade > 50 jt → kemungkinan bandar menyamar
    if (tier !== 1) return false
    const apt = avgPerTrade(broker.value, broker.freq)
    return apt > BANDAR_BUNGLON_THRESHOLD
}

/**
 * Deteksi broker yang ada di KEDUA sisi (crossing/fake volume).
 * Kriteria: nilai beli dan nilai jual selisihnya < 20% dari nilai terbesar.
 */
function detectFakeVolume(
    buyers: MarketDetectorBroker[],
    sellers: MarketDetectorBroker[]
): string[] {
    const buyMap = new Map(buyers.map((b) => [b.code, b.value]))
    const fakes: string[] = []

    sellers.forEach((s) => {
        const buyVal = buyMap.get(s.code)
        if (!buyVal) return
        const larger = Math.max(buyVal, s.value)
        const smaller = Math.min(buyVal, s.value)
        const diff = (larger - smaller) / larger
        if (diff < 0.2) {
            fakes.push(s.code)
        }
    })

    return fakes
}

/**
 * Hitung concentration score: % nilai top-3 buyer dari total nilai buy
 */
function concentrationScore(buyers: MarketDetectorBroker[]): number {
    if (buyers.length === 0) return 0
    const total = buyers.reduce((s, b) => s + b.value, 0)
    const top3 = buyers
        .slice(0, 3)
        .reduce((s, b) => s + b.value, 0)
    return total > 0 ? (top3 / total) * 100 : 0
}

/** Fungsi utama: analisis Broksum dan kembalikan fase + sinyal */
export function detectAccDist(
    buyers: MarketDetectorBroker[],
    sellers: MarketDetectorBroker[]
): AccDistResult {
    // Build net flow per broker

    const netFlowMap = new Map<string, BrokerNetFlow>()

    buyers.forEach((b) => {
        const tier = getBrokerTier(b.code)
        const info = getBrokerInfo(b.code)
        const apt = avgPerTrade(b.value, b.freq)
        netFlowMap.set(b.code, {
            code: b.code,
            tier,
            tierLabel: info.tierLabel,
            buyValue: b.value,
            sellValue: 0,
            netValue: b.value,
            avgBuyPrice: b.avgPrice,
            avgSellPrice: 0,
            avgPerTradeBuy: apt,
            avgPerTradeSell: 0,
            isBandarBunglon: isBandarBunglon(b, tier),
        })
    })

    sellers.forEach((s) => {
        const tier = getBrokerTier(s.code)
        const info = getBrokerInfo(s.code)
        const apt = avgPerTrade(s.value, s.freq)
        const existing = netFlowMap.get(s.code)
        if (existing) {
            existing.sellValue = s.value
            existing.netValue = existing.buyValue - s.value
            existing.avgSellPrice = s.avgPrice
            existing.avgPerTradeSell = apt
        } else {
            netFlowMap.set(s.code, {
                code: s.code,
                tier,
                tierLabel: info.tierLabel,
                buyValue: 0,
                sellValue: s.value,
                netValue: -s.value,
                avgBuyPrice: 0,
                avgSellPrice: s.avgPrice,
                avgPerTradeBuy: 0,
                avgPerTradeSell: apt,
                isBandarBunglon: isBandarBunglon(s, tier),
            })
        }
    })

    const allFlows = Array.from(netFlowMap.values())

    // Pisahkan per kasta
    const whaleFlows = allFlows.filter((f) => f.tier === 2)
    const bandarFlows = allFlows.filter((f) => f.tier === 3)
    const retailFlows = allFlows.filter((f) => f.tier === 1)

    const whaleNetFlow = whaleFlows.reduce((s, f) => s + f.netValue, 0)
    const bandarNetFlow = bandarFlows.reduce((s, f) => s + f.netValue, 0)
    const retailNetFlow = retailFlows.reduce((s, f) => s + f.netValue, 0)

    // Broker kasta 2–3 yang net buy (dominan di sisi beli)
    const dominantBuyers = allFlows
        .filter((f) => (f.tier === 2 || f.tier === 3) && f.netValue > 0)
        .sort((a, b) => b.netValue - a.netValue)

    // Broker kasta 2–3 yang net sell (dominan di sisi jual)
    const dominantSellers = allFlows
        .filter((f) => (f.tier === 2 || f.tier === 3) && f.netValue < 0)
        .sort((a, b) => a.netValue - b.netValue)

    // Fake volume detector
    const fakeVolumebrokers = detectFakeVolume(buyers, sellers)

    // Concentration score
    const concScore = concentrationScore(buyers)

    // ─── RULES untuk menentukan fase ─────────────────────────────────────────

    const reasons: string[] = []
    let phase: MarketPhase = 'NEUTRAL'
    let confidence = 0

    const isWhaleBuying = whaleNetFlow > 0
    const isWhaleSelling = whaleNetFlow < 0
    const isBandarBuying = bandarNetFlow > 0
    const isBandarSelling = bandarNetFlow < 0
    const isRetailSelling = retailNetFlow < 0
    const isRetailBuying = retailNetFlow > 0

    const totalAbsValue = buyers.reduce((s, b) => s + b.value, 0) +
        sellers.reduce((s, b) => s + b.value, 0)

    const whaleAbsFlow = Math.abs(whaleNetFlow)
    const bandarAbsFlow = Math.abs(bandarNetFlow)
    const dominantSize = (whaleAbsFlow + bandarAbsFlow) / (totalAbsValue || 1)

    // Fake volume check pertama
    if (fakeVolumebrokers.length >= 3) {
        phase = 'FAKE_VOLUME'
        confidence = 75 + fakeVolumebrokers.length * 3
        reasons.push(`${fakeVolumebrokers.length} broker muncul di sisi beli DAN jual dengan nilai yang hampir sama`)
        reasons.push('Ini adalah crossing / passing the parcel — volume semu untuk memancing retail')
        reasons.push('Fokus pada kolom NET, bukan gross volume')
    }
    // Strong Accumulation
    else if (isWhaleBuying && isBandarBuying && isRetailSelling && concScore > 50) {
        phase = 'STRONG_ACCUMULATION'
        confidence = Math.min(95, 60 + Math.round(dominantSize * 30) + (concScore > 60 ? 10 : 0))
        reasons.push(`Whale (${dominantBuyers.filter(f => f.tier === 2).length} broker) NET BUY `)
        reasons.push(`Bandar (${dominantBuyers.filter(f => f.tier === 3).length} broker) ikut akumulasi`)
        reasons.push('Retail justru jual (supply dari tangan lemah ke tangan kuat)')
        if (concScore > 60) reasons.push(`Konsentrasi tinggi: top-3 buyer menguasai ${concScore.toFixed(0)}% transaksi`)
    }
    // Accumulation
    else if ((isWhaleBuying || isBandarBuying) && !isWhaleSelling) {
        phase = 'ACCUMULATION'
        confidence = Math.min(85, 45 + Math.round(dominantSize * 25))
        if (isWhaleBuying) reasons.push(`Whale NET BUY — akumulasi institusional terdeteksi`)
        if (isBandarBuying) reasons.push(`Bandar NET BUY — penggerak saham ini sedang kumpul barang`)
        if (isRetailSelling) reasons.push('Retail jual → barang berpindah ke tangan kuat')
        reasons.push(`Konsentrasi pembelian: ${concScore.toFixed(0)}%`)
    }
    // Strong Distribution
    else if (isWhaleSelling && isBandarSelling && isRetailBuying) {
        phase = 'STRONG_DISTRIBUTION'
        confidence = Math.min(95, 65 + Math.round(dominantSize * 25))
        reasons.push('Whale DAN Bandar kompak net sell — distribusi masif')
        reasons.push('Retail nampung di harga atas — ini jebakan')
        reasons.push('Jika harga sudah naik banyak, ini sinyal puncak yang sangat berbahaya')
        if (dominantSellers.length > 0) {
            reasons.push(`${dominantSellers.length} broker kasta 2–3 dominasi sisi jual`)
        }
    }
    // Distribution
    else if (isWhaleSelling || isBandarSelling) {
        phase = 'DISTRIBUTION'
        confidence = Math.min(80, 40 + Math.round(dominantSize * 20))
        if (isWhaleSelling) reasons.push('Whale NET SELL — institusi asing mulai lepas barang')
        if (isBandarSelling) reasons.push('Bandar NET SELL — penggerak saham mulai distribusi')
        if (isRetailBuying) reasons.push('Retail nampung barang yang dilempar bandar')
        reasons.push('Hati-hati — jangan beli di kondisi ini tanpa konfirmasi')
    }
    // Neutral
    else {
        phase = 'NEUTRAL'
        confidence = 40
        reasons.push('Tidak ada dominasi yang jelas dari satu kasta manapun')
        reasons.push('Tunggu konfirmasi lebih lanjut')
    }

    // Clamp confidence
    confidence = Math.max(10, Math.min(97, confidence))

    const { label, description, action } = getPhaseMetadata(phase)

    return {
        phase,
        action,
        confidence,
        label,
        description,
        reasons,
        dominantBuyers,
        dominantSellers,
        fakeVolumebrokers,
        whaleNetFlow,
        bandarNetFlow,
        retailNetFlow,
        concentrationScore: concScore,
    }
}

function getPhaseMetadata(phase: MarketPhase): {
    label: string
    description: string
    action: PhaseAction
} {
    switch (phase) {
        case 'STRONG_ACCUMULATION':
            return {
                label: 'Akumulasi Kuat',
                description: 'Bandar & Whale kompak borong. Retail jual. Barang berpindah ke tangan kuat — harga kemungkinan besar akan dinaikkan.',
                action: 'BUY_SIGNAL',
            }
        case 'ACCUMULATION':
            return {
                label: 'Akumulasi',
                description: 'Institusi atau bandar sedang cicil barang secara diam-diam. Ini adalah sinyal awal yang positif.',
                action: 'BUY_SIGNAL',
            }
        case 'DISTRIBUTION':
            return {
                label: 'Distribusi',
                description: 'Bandar atau Whale mulai lepas barang ke retail. Hati-hati masuk posisi baru.',
                action: 'SELL_SIGNAL',
            }
        case 'STRONG_DISTRIBUTION':
            return {
                label: 'Distribusi Masif',
                description: 'Distribusi besar-besaran oleh semua pihak kuat. Retail nampung. Sangat berbahaya — kemungkinan harga akan longsor.',
                action: 'SELL_SIGNAL',
            }
        case 'FAKE_VOLUME':
            return {
                label: 'Volume Palsu',
                description: 'Broker yang sama jual dan beli. Ini adalah crossing untuk memancing FOMO retail. Jangan masuk.',
                action: 'WAIT',
            }
        case 'NEUTRAL':
        default:
            return {
                label: 'Netral',
                description: 'Tidak ada sinyal dominan. Tunggu pola yang lebih jelas sebelum mengambil keputusan.',
                action: 'OBSERVE',
            }
    }
}
