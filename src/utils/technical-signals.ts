/**
 * Technical Signal Scanner - Client-side signal computation
 * Computes RSI, SMA crossovers, volume spikes, and momentum from OHLCV data
 */

export interface OHLCVCandle {
    date: string
    open: number
    high: number
    low: number
    close: number
    volume: number
}

export type SignalType =
    | 'GOLDEN_CROSS'
    | 'DEATH_CROSS'
    | 'RSI_OVERSOLD'
    | 'RSI_OVERBOUGHT'
    | 'VOLUME_SPIKE'
    | 'BULLISH_MOMENTUM'
    | 'BEARISH_MOMENTUM'
    | 'MACD_BULLISH'
    | 'MACD_BEARISH'

export type SignalStrength = 'STRONG' | 'MODERATE' | 'WEAK'

export interface TechnicalSignal {
    type: SignalType
    strength: SignalStrength
    label: string
    description: string
    value?: number
}

export interface StockSignalResult {
    code: string
    price: number
    change: number
    changePercent: number
    volume: number
    avgVolume: number
    rsi: number
    sma20: number
    sma50: number
    macdLine: number
    macdSignal: number
    signals: TechnicalSignal[]
    overallScore: number // -10 (very bearish) to +10 (very bullish)
    overallLabel: string
}

// ============= INDICATOR COMPUTATION =============

function computeSMA(closes: number[], period: number): number[] {
    const sma: number[] = []
    for (let i = 0; i < closes.length; i++) {
        if (i < period - 1) {
            sma.push(0)
        } else {
            const slice = closes.slice(i - period + 1, i + 1)
            sma.push(slice.reduce((a, b) => a + b, 0) / period)
        }
    }
    return sma
}

function computeEMA(closes: number[], period: number): number[] {
    const ema: number[] = []
    const multiplier = 2 / (period + 1)

    for (let i = 0; i < closes.length; i++) {
        if (i === 0) {
            ema.push(closes[i])
        } else {
            ema.push((closes[i] - ema[i - 1]) * multiplier + ema[i - 1])
        }
    }
    return ema
}

function computeRSI(closes: number[], period: number = 14): number[] {
    const rsi: number[] = []
    const gains: number[] = []
    const losses: number[] = []

    for (let i = 0; i < closes.length; i++) {
        if (i === 0) {
            gains.push(0)
            losses.push(0)
            rsi.push(50)
            continue
        }

        const change = closes[i] - closes[i - 1]
        gains.push(change > 0 ? change : 0)
        losses.push(change < 0 ? Math.abs(change) : 0)

        if (i < period) {
            rsi.push(50)
            continue
        }

        let avgGain: number, avgLoss: number

        if (i === period) {
            avgGain = gains.slice(1, period + 1).reduce((a, b) => a + b, 0) / period
            avgLoss = losses.slice(1, period + 1).reduce((a, b) => a + b, 0) / period
        } else {
            // Smoothed average
            const prevAvgGain = gains.slice(Math.max(1, i - period), i).reduce((a, b) => a + b, 0) / period
            const prevAvgLoss = losses.slice(Math.max(1, i - period), i).reduce((a, b) => a + b, 0) / period
            avgGain = (prevAvgGain * (period - 1) + gains[i]) / period
            avgLoss = (prevAvgLoss * (period - 1) + losses[i]) / period
        }

        if (avgLoss === 0) {
            rsi.push(100)
        } else {
            const rs = avgGain / avgLoss
            rsi.push(100 - 100 / (1 + rs))
        }
    }
    return rsi
}

function computeMACD(closes: number[]): { macdLine: number[]; signalLine: number[]; histogram: number[] } {
    const ema12 = computeEMA(closes, 12)
    const ema26 = computeEMA(closes, 26)

    const macdLine = ema12.map((v, i) => v - ema26[i])
    const signalLine = computeEMA(macdLine, 9)
    const histogram = macdLine.map((v, i) => v - signalLine[i])

    return { macdLine, signalLine, histogram }
}

// ============= SIGNAL DETECTION =============

export function analyzeStock(candles: OHLCVCandle[]): Omit<StockSignalResult, 'code'> | null {
    if (!candles || candles.length < 50) return null

    const closes = candles.map((c) => c.close)
    const volumes = candles.map((c) => c.volume)
    const last = closes.length - 1

    // Compute indicators
    const sma20 = computeSMA(closes, 20)
    const sma50 = computeSMA(closes, 50)
    const rsi = computeRSI(closes, 14)
    const macd = computeMACD(closes)

    // Current values
    const currentPrice = closes[last]
    const prevPrice = closes[last - 1]
    const change = currentPrice - prevPrice
    const changePercent = prevPrice > 0 ? (change / prevPrice) * 100 : 0
    const currentVolume = volumes[last]
    const avgVolume =
        volumes.slice(Math.max(0, last - 20), last).reduce((a, b) => a + b, 0) /
        Math.min(20, last)
    const currentRSI = rsi[last]
    const currentSMA20 = sma20[last]
    const currentSMA50 = sma50[last]
    const currentMACD = macd.macdLine[last]
    const currentSignal = macd.signalLine[last]

    const signals: TechnicalSignal[] = []
    let score = 0

    // --- Golden Cross / Death Cross (SMA20 x SMA50) ---
    if (sma20[last] > 0 && sma50[last] > 0 && sma20[last - 1] > 0 && sma50[last - 1] > 0) {
        const prevAbove = sma20[last - 1] > sma50[last - 1]
        const currAbove = sma20[last] > sma50[last]

        if (!prevAbove && currAbove) {
            signals.push({
                type: 'GOLDEN_CROSS',
                strength: 'STRONG',
                label: '🟢 Golden Cross',
                description: 'SMA20 memotong SMA50 dari bawah — sinyal bullish kuat',
            })
            score += 3
        } else if (prevAbove && !currAbove) {
            signals.push({
                type: 'DEATH_CROSS',
                strength: 'STRONG',
                label: '🔴 Death Cross',
                description: 'SMA20 memotong SMA50 dari atas — sinyal bearish kuat',
            })
            score -= 3
        } else if (currAbove) {
            // SMA20 masih di atas SMA50 (tren naik)
            score += 1
        } else {
            // SMA20 masih di bawah SMA50 (tren turun)
            score -= 1
        }
    }

    // --- RSI ---
    if (currentRSI <= 30) {
        const strength: SignalStrength = currentRSI <= 20 ? 'STRONG' : 'MODERATE'
        signals.push({
            type: 'RSI_OVERSOLD',
            strength,
            label: '🟢 RSI Oversold',
            description: `RSI ${currentRSI.toFixed(1)} — area oversold, potensi rebound`,
            value: currentRSI,
        })
        score += strength === 'STRONG' ? 2 : 1
    } else if (currentRSI >= 70) {
        const strength: SignalStrength = currentRSI >= 80 ? 'STRONG' : 'MODERATE'
        signals.push({
            type: 'RSI_OVERBOUGHT',
            strength,
            label: '🔴 RSI Overbought',
            description: `RSI ${currentRSI.toFixed(1)} — area overbought, potensi koreksi`,
            value: currentRSI,
        })
        score -= strength === 'STRONG' ? 2 : 1
    }

    // --- Volume Spike ---
    if (avgVolume > 0 && currentVolume > avgVolume * 2) {
        const ratio = currentVolume / avgVolume
        const strength: SignalStrength = ratio > 3 ? 'STRONG' : 'MODERATE'
        signals.push({
            type: 'VOLUME_SPIKE',
            strength,
            label: '⚡ Volume Spike',
            description: `Volume ${ratio.toFixed(1)}x dari rata-rata 20 hari`,
            value: ratio,
        })
        // Volume spike + price up = bullish, price down = bearish
        if (change > 0) score += 1
        else if (change < 0) score -= 1
    }

    // --- MACD Crossover ---
    if (last > 1) {
        const prevMACDAbove = macd.macdLine[last - 1] > macd.signalLine[last - 1]
        const currMACDAbove = macd.macdLine[last] > macd.signalLine[last]

        if (!prevMACDAbove && currMACDAbove) {
            signals.push({
                type: 'MACD_BULLISH',
                strength: 'MODERATE',
                label: '🟢 MACD Bullish',
                description: 'MACD line memotong signal line dari bawah',
            })
            score += 2
        } else if (prevMACDAbove && !currMACDAbove) {
            signals.push({
                type: 'MACD_BEARISH',
                strength: 'MODERATE',
                label: '🔴 MACD Bearish',
                description: 'MACD line memotong signal line dari atas',
            })
            score -= 2
        }
    }

    // --- Price Momentum (5-day) ---
    if (last >= 5) {
        const momentum = ((closes[last] - closes[last - 5]) / closes[last - 5]) * 100
        if (momentum > 5) {
            signals.push({
                type: 'BULLISH_MOMENTUM',
                strength: momentum > 10 ? 'STRONG' : 'MODERATE',
                label: '🟢 Bullish Momentum',
                description: `Harga naik ${momentum.toFixed(1)}% dalam 5 hari terakhir`,
                value: momentum,
            })
            score += 1
        } else if (momentum < -5) {
            signals.push({
                type: 'BEARISH_MOMENTUM',
                strength: momentum < -10 ? 'STRONG' : 'MODERATE',
                label: '🔴 Bearish Momentum',
                description: `Harga turun ${Math.abs(momentum).toFixed(1)}% dalam 5 hari terakhir`,
                value: momentum,
            })
            score -= 1
        }
    }

    // Clamp score
    score = Math.max(-10, Math.min(10, score))

    let overallLabel: string
    if (score >= 4) overallLabel = 'Strong Bullish'
    else if (score >= 2) overallLabel = 'Bullish'
    else if (score >= 1) overallLabel = 'Mild Bullish'
    else if (score === 0) overallLabel = 'Neutral'
    else if (score >= -1) overallLabel = 'Mild Bearish'
    else if (score >= -3) overallLabel = 'Bearish'
    else overallLabel = 'Strong Bearish'

    return {
        price: currentPrice,
        change,
        changePercent,
        volume: currentVolume,
        avgVolume,
        rsi: currentRSI,
        sma20: currentSMA20,
        sma50: currentSMA50,
        macdLine: currentMACD,
        macdSignal: currentSignal,
        signals,
        overallScore: score,
        overallLabel,
    }
}

/**
 * Parse raw stock chart API response into OHLCV candles
 */
export function parseChartToCandles(chartData: any): OHLCVCandle[] {
    try {
        // Handle various response structures
        const data = chartData?.data || chartData
        let items: any[] = []

        if (Array.isArray(data)) {
            items = data
        } else if (data?.chart_data) {
            items = Array.isArray(data.chart_data) ? data.chart_data : []
        } else if (data?.data && Array.isArray(data.data)) {
            items = data.data
        }

        return items
            .filter((item: any) => item && (item.close || item.Close))
            .map((item: any) => ({
                date: item.date || item.Date || item.timestamp || '',
                open: item.open || item.Open || 0,
                high: item.high || item.High || 0,
                low: item.low || item.Low || 0,
                close: item.close || item.Close || 0,
                volume: item.volume || item.Volume || 0,
            }))
    } catch {
        return []
    }
}