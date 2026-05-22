/**
 * BANDARSCOPE — Tape Reading & Bandar Bunglon Detector
 *
 * Membedah Value ÷ Frekuensi untuk mengidentifikasi apakah
 * broker yang terlihat sebagai "retail" sebenarnya adalah bandar menyamar.
 *
 * Konsep:
 *   YP borong 5 M dalam 50 transaksi  → 100 jt/klik → BANDAR BUNGLON
 *   YP borong 5 M dalam 5.000 transaksi → 1 jt/klik  → retail murni
 */

export type TapeCategory =
    | 'RETAIL'          // avg/trade < 5 jt
    | 'INSTITUTION'     // 5 jt – 50 jt
    | 'BANDAR_BUNGLON'  // > 50 jt di broker tier-1
    | 'BANDAR_GENUINE'  // > 50 jt di broker tier-3 (wajar)

export interface TapeReadingResult {
    brokerCode: string
    side: 'buy' | 'sell'
    totalValue: number
    freq: number
    avgPerTrade: number         // dalam rupiah
    avgPerTradeMillion: number  // dalam juta, untuk display
    category: TapeCategory
    label: string
    isSuspicious: boolean       // true jika bandar bunglon
    explanation: string
}

const RETAIL_THRESHOLD = 5_000_000        // 5 juta
const INSTITUTION_THRESHOLD = 50_000_000  // 50 juta

export function analyzeTapeReading(
    brokerCode: string,
    side: 'buy' | 'sell',
    totalValue: number,
    freq: number,
    brokerTier: 1 | 2 | 3
): TapeReadingResult {
    const apt = freq > 0 ? totalValue / freq : 0
    const aptMillion = apt / 1_000_000

    let category: TapeCategory
    let label: string
    let isSuspicious = false
    let explanation: string

    if (apt < RETAIL_THRESHOLD) {
        category = 'RETAIL'
        label = 'Retail murni'
        explanation = `Rata-rata ${aptMillion.toFixed(1)} jt/transaksi — pola lot kecil khas investor ritel`
    } else if (apt < INSTITUTION_THRESHOLD) {
        category = 'INSTITUTION'
        label = 'Institusi'
        isSuspicious = brokerTier === 1  // Retail label tapi transaksi besar
        explanation = isSuspicious
            ? `Rata-rata ${aptMillion.toFixed(1)} jt/transaksi dari broker retail — ukuran ini tidak wajar untuk ritel biasa`
            : `Rata-rata ${aptMillion.toFixed(1)} jt/transaksi — ukuran institusi normal`
    } else {
        if (brokerTier === 1) {
            category = 'BANDAR_BUNGLON'
            label = 'Bandar Bunglon ⚠️'
            isSuspicious = true
            explanation = `Rata-rata ${aptMillion.toFixed(1)} jt/transaksi dari broker berlabel retail — ini hampir pasti bandar atau institusi besar yang menyamar menggunakan akun retail`
        } else {
            category = 'BANDAR_GENUINE'
            label = 'Bandar / Market Maker'
            explanation = `Rata-rata ${aptMillion.toFixed(1)} jt/transaksi — ukuran normal untuk broker kasta bandar`
        }
    }

    return {
        brokerCode,
        side,
        totalValue,
        freq,
        avgPerTrade: apt,
        avgPerTradeMillion: aptMillion,
        category,
        label,
        isSuspicious,
        explanation,
    }
}

/**
 * Deteksi bull trap / valid breakout dari komposisi buyer saat breakout.
 *
 * Bull Trap (jebakan):
 *   - Harga breakout resistance
 *   - Yang beli = retail (tier 1)
 *   - Yang jual besar = bandar/whale (tier 2–3)
 *
 * Valid Breakout:
 *   - Harga breakout resistance
 *   - Yang hajar kanan = bandar/whale (tier 2–3)
 *   - Retail justru profit taking (jual)
 */
export interface BreakoutAnalysis {
    isValidBreakout: boolean
    isBullTrap: boolean
    confidence: number
    explanation: string
    action: 'CHASE' | 'AVOID' | 'OBSERVE'
}

export function analyzeBreakout(
    buyerTiers: (1 | 2 | 3)[],
    sellerTiers: (1 | 2 | 3)[],
    buyerValues: number[],
    sellerValues: number[]
): BreakoutAnalysis {
    const totalBuyValue = buyerValues.reduce((s, v) => s + v, 0)
    const totalSellValue = sellerValues.reduce((s, v) => s + v, 0)

    const strongBuyValue = buyerTiers.reduce((s, t, i) =>
        (t === 2 || t === 3) ? s + buyerValues[i] : s, 0)
    const retailBuyValue = buyerTiers.reduce((s, t, i) =>
        t === 1 ? s + buyerValues[i] : s, 0)
    const strongSellValue = sellerTiers.reduce((s, t, i) =>
        (t === 2 || t === 3) ? s + sellerValues[i] : s, 0)

    const strongBuyRatio = totalBuyValue > 0 ? strongBuyValue / totalBuyValue : 0
    const strongSellRatio = totalSellValue > 0 ? strongSellValue / totalSellValue : 0
    const retailBuyRatio = totalBuyValue > 0 ? retailBuyValue / totalBuyValue : 0

    // Bull trap: retail dominasi beli, bandar/whale dominasi jual
    if (retailBuyRatio > 0.6 && strongSellRatio > 0.5) {
        return {
            isValidBreakout: false,
            isBullTrap: true,
            confidence: Math.round(60 + retailBuyRatio * 20 + strongSellRatio * 20),
            explanation: 'Breakout ini mencurigakan — yang beli adalah retail FOMO, sedangkan bandar/whale justru jual besar-besaran. Kemungkinan besar ini adalah bull trap.',
            action: 'AVOID',
        }
    }

    // Valid breakout: bandar/whale dominasi beli
    if (strongBuyRatio > 0.5 && strongSellRatio < 0.4) {
        return {
            isValidBreakout: true,
            isBullTrap: false,
            confidence: Math.round(55 + strongBuyRatio * 25),
            explanation: 'Breakout valid — bandar/whale yang "hajar kanan", retail justru profit taking. Momentum kemungkinan besar akan berlanjut.',
            action: 'CHASE',
        }
    }

    return {
        isValidBreakout: false,
        isBullTrap: false,
        confidence: 35,
        explanation: 'Pola breakout tidak jelas. Tunggu satu-dua candle konfirmasi sebelum masuk.',
        action: 'OBSERVE',
    }
}
