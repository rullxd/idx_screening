/**
 * Technical Signal Scanner - Client-side signal computation
 * Supports multiple trading modes: Scalping, Intraday, Swing/Day Trade
 * Each mode uses different indicator parameters optimized for that style.
 */

export interface OHLCVCandle {
    date: string
    open: number
    high: number
    low: number
    close: number
    volume: number
}

export type TradingMode = 'scalping' | 'intraday' | 'swing'

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
    | 'PRICE_ABOVE_EMA'
    | 'PRICE_BELOW_EMA'
    | 'BOLLINGER_SQUEEZE'
    | 'STOCHASTIC_OVERSOLD'
    | 'STOCHASTIC_OVERBOUGHT'

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
    ema_fast: number
    ema_slow: number
    macdLine: number
    macdSignal: number
    stochK?: number
    stochD?: number
    signals: TechnicalSignal[]
    overallScore: number // -10 (very bearish) to +10 (very bullish)
    overallLabel: string
    tradingMode: TradingMode
    confidenceScore: number
}

// ============= TRADING MODE CONFIGURATIONS =============

export interface TradingModeConfig {
    key: TradingMode
    label: string
    description: string
    timeframe: string           // API chart timeframe
    rsiPeriod: number
    emaFast: number
    emaSlow: number
    macdFast: number
    macdSlow: number
    macdSignalPeriod: number
    momentumPeriod: number      // bars to look back for momentum
    momentumThreshold: number   // % threshold for momentum signal
    volumeSpikeMultiplier: number
    volumeAvgPeriod: number
    minCandles: number          // minimum candles for valid analysis
    rsiOversold: number
    rsiOverbought: number
    useStochastic: boolean
    stochPeriod: number
    stochSmooth: number
}

export const TRADING_MODES: Record<TradingMode, TradingModeConfig> = {
    scalping: {
        key: 'scalping',
        label: '⚡ Scalping',
        description: 'Quick entry/exit, 1-15 menit. Fokus momentum cepat & volume burst.',
        timeframe: '1d',       // intraday data
        rsiPeriod: 7,
        emaFast: 5,
        emaSlow: 13,
        macdFast: 5,
        macdSlow: 13,
        macdSignalPeriod: 4,
        momentumPeriod: 3,     // 3-bar momentum
        momentumThreshold: 1.5, // 1.5% untuk scalp
        volumeSpikeMultiplier: 1.5,
        volumeAvgPeriod: 10,
        minCandles: 15,
        rsiOversold: 25,
        rsiOverbought: 75,
        useStochastic: true,
        stochPeriod: 5,
        stochSmooth: 3,
    },
    intraday: {
        key: 'intraday',
        label: '📊 Intraday',
        description: 'Hold beberapa jam. Fokus trend harian & konfirmasi volume.',
        timeframe: '1m',       // 1 month daily data
        rsiPeriod: 9,
        emaFast: 9,
        emaSlow: 21,
        macdFast: 8,
        macdSlow: 21,
        macdSignalPeriod: 5,
        momentumPeriod: 3,     // 3-day momentum
        momentumThreshold: 3,  // 3% untuk intraday
        volumeSpikeMultiplier: 1.8,
        volumeAvgPeriod: 10,
        minCandles: 20,
        rsiOversold: 30,
        rsiOverbought: 70,
        useStochastic: true,
        stochPeriod: 9,
        stochSmooth: 3,
    },
    swing: {
        key: 'swing',
        label: '📈 Swing / Day Trade',
        description: 'Hold 1-5 hari. Fokus trend & support/resistance.',
        timeframe: '3m',       // 3 months daily data
        rsiPeriod: 14,
        emaFast: 20,
        emaSlow: 50,
        macdFast: 12,
        macdSlow: 26,
        macdSignalPeriod: 9,
        momentumPeriod: 5,     // 5-day momentum
        momentumThreshold: 5,  // 5% untuk swing
        volumeSpikeMultiplier: 2,
        volumeAvgPeriod: 20,
        minCandles: 30,
        rsiOversold: 30,
        rsiOverbought: 70,
        useStochastic: false,
        stochPeriod: 14,
        stochSmooth: 3,
    },
}

// ============= INDICATOR COMPUTATION =============

function computeSMA(closes: number[], period: number): number[] {
    const sma: number[] = []
    let sum = 0
    for (let i = 0; i < closes.length; i++) {
        sum += closes[i]
        if (i >= period) sum -= closes[i - period]
        sma.push(i < period - 1 ? 0 : sum / period)
    }
    return sma
}

function median(values: number[]): number {
    const sorted = values.filter((value) => Number.isFinite(value) && value > 0).sort((a, b) => a - b)
    if (!sorted.length) return 0
    const mid = Math.floor(sorted.length / 2)
    return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
}

function clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value))
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

function computeRSI(closes: number[], period: number): number[] {
    const rsi = Array(closes.length).fill(50)
    if (closes.length <= period) return rsi

    let avgGain = 0
    let avgLoss = 0

    for (let i = 1; i <= period; i++) {
        const change = closes[i] - closes[i - 1]
        avgGain += Math.max(change, 0)
        avgLoss += Math.max(-change, 0)
    }

    avgGain /= period
    avgLoss /= period
    rsi[period] = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss)

    for (let i = period + 1; i < closes.length; i++) {
        const change = closes[i] - closes[i - 1]
        avgGain = (avgGain * (period - 1) + Math.max(change, 0)) / period
        avgLoss = (avgLoss * (period - 1) + Math.max(-change, 0)) / period
        rsi[i] = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss)
    }

    return rsi
}

function computeMACD(closes: number[], fast: number, slow: number, signalPeriod: number): {
    macdLine: number[]
    signalLine: number[]
    histogram: number[]
} {
    const emaFast = computeEMA(closes, fast)
    const emaSlow = computeEMA(closes, slow)

    const macdLine = emaFast.map((v, i) => v - emaSlow[i])
    const signalLine = computeEMA(macdLine, signalPeriod)
    const histogram = macdLine.map((v, i) => v - signalLine[i])

    return { macdLine, signalLine, histogram }
}

function computeStochastic(highs: number[], lows: number[], closes: number[], period: number, smooth: number): {
    stochK: number[]
    stochD: number[]
} {
    const rawK: number[] = []

    for (let i = 0; i < closes.length; i++) {
        if (i < period - 1) {
            rawK.push(50)
        } else {
            const highSlice = highs.slice(i - period + 1, i + 1)
            const lowSlice = lows.slice(i - period + 1, i + 1)
            const highestHigh = Math.max(...highSlice)
            const lowestLow = Math.min(...lowSlice)
            const range = highestHigh - lowestLow
            rawK.push(range > 0 ? ((closes[i] - lowestLow) / range) * 100 : 50)
        }
    }

    // %K = SMA of raw K
    const stochK = computeSMA(rawK, smooth)
    // %D = SMA of %K
    const stochD = computeSMA(stochK, smooth)

    return { stochK, stochD }
}

// ============= SIGNAL DETECTION =============

/**
 * Analyze stock candles with trading-mode-specific parameters
 */
export function analyzeStock(
    candles: OHLCVCandle[],
    mode: TradingMode = 'swing'
): Omit<StockSignalResult, 'code'> | null {
    const config = TRADING_MODES[mode]

    if (!candles || candles.length < config.minCandles) return null

    const closes = candles.map((c) => c.close)
    const highs = candles.map((c) => c.high)
    const lows = candles.map((c) => c.low)
    const volumes = candles.map((c) => c.volume)
    const last = closes.length - 1

    // Compute indicators with mode-specific periods
    const emaFastArr = computeEMA(closes, config.emaFast)
    const emaSlowArr = computeEMA(closes, config.emaSlow)
    const sma20 = computeSMA(closes, 20)
    const sma50 = candles.length >= 50 ? computeSMA(closes, 50) : sma20
    const rsi = computeRSI(closes, config.rsiPeriod)
    const macd = computeMACD(closes, config.macdFast, config.macdSlow, config.macdSignalPeriod)

    // Stochastic (for scalping & intraday)
    let stochK: number | undefined
    let stochD: number | undefined
    let stochData: { stochK: number[]; stochD: number[] } | null = null
    if (config.useStochastic) {
        stochData = computeStochastic(highs, lows, closes, config.stochPeriod, config.stochSmooth)
        stochK = stochData.stochK[last]
        stochD = stochData.stochD[last]
    }

    // Current values
    const currentPrice = closes[last]
    const prevPrice = closes[last - 1]
    const change = currentPrice - prevPrice
    const changePercent = prevPrice > 0 ? (change / prevPrice) * 100 : 0
    const currentVolume = volumes[last]
    const volLookback = Math.min(config.volumeAvgPeriod, last)
    const volumeWindow = volumes.slice(Math.max(0, last - volLookback), last).filter((value) => value > 0)
    const avgVolume = volumeWindow.length ? volumeWindow.reduce((a, b) => a + b, 0) / volumeWindow.length : 0
    const medianVolume = median(volumeWindow)
    const baselineVolume = medianVolume || avgVolume
    const volumeRatio = baselineVolume > 0 ? currentVolume / baselineVolume : 0
    const currentRSI = rsi[last]
    const currentEmaFast = emaFastArr[last]
    const currentEmaSlow = emaSlowArr[last]
    const currentSMA20 = sma20[last]
    const currentSMA50 = sma50[last]
    const currentMACD = macd.macdLine[last]
    const currentSignal = macd.signalLine[last]
    const histogram = macd.histogram[last]
    const prevHistogram = macd.histogram[last - 1] ?? 0
    const dataCoverage = clamp(candles.length / Math.max(config.minCandles * 2, config.emaSlow + config.macdSlow), 0.45, 1)

    const signals: TechnicalSignal[] = []
    const scoreParts = {
        trend: 0,
        pricePosition: 0,
        rsi: 0,
        stochastic: 0,
        volume: 0,
        macd: 0,
        momentum: 0,
    }

    const modeLabel = mode === 'scalping' ? 'Scalp' : mode === 'intraday' ? 'Intraday' : 'Swing'

    // --- EMA/SMA Crossover (Golden Cross / Death Cross) ---
    const fastName = mode === 'swing' ? `SMA${config.emaFast}` : `EMA${config.emaFast}`
    const slowName = mode === 'swing' ? `SMA${config.emaSlow}` : `EMA${config.emaSlow}`

    if (emaFastArr[last] > 0 && emaSlowArr[last] > 0 && emaFastArr[last - 1] > 0 && emaSlowArr[last - 1] > 0) {
        const prevAbove = emaFastArr[last - 1] > emaSlowArr[last - 1]
        const currAbove = emaFastArr[last] > emaSlowArr[last]

        if (!prevAbove && currAbove) {
            signals.push({
                type: 'GOLDEN_CROSS',
                strength: 'STRONG',
                label: `🟢 ${modeLabel} Golden Cross`,
                description: `${fastName} memotong ${slowName} dari bawah — sinyal bullish`,
            })
            scoreParts.trend += 3
        } else if (prevAbove && !currAbove) {
            signals.push({
                type: 'DEATH_CROSS',
                strength: 'STRONG',
                label: `🔴 ${modeLabel} Death Cross`,
                description: `${fastName} memotong ${slowName} dari atas — sinyal bearish`,
            })
            scoreParts.trend -= 3
        } else if (currAbove) {
            scoreParts.trend += 1
        } else {
            scoreParts.trend -= 1
        }
    }

    // --- Price vs EMA (Scalping & Intraday specific) ---
    if (mode !== 'swing') {
        if (currentPrice > currentEmaFast && currentEmaFast > currentEmaSlow) {
            signals.push({
                type: 'PRICE_ABOVE_EMA',
                strength: 'MODERATE',
                label: `🟢 Price > ${fastName} > ${slowName}`,
                description: `Harga di atas kedua EMA — momentum bullish ${modeLabel.toLowerCase()}`,
            })
            scoreParts.pricePosition += 1
        } else if (currentPrice < currentEmaFast && currentEmaFast < currentEmaSlow) {
            signals.push({
                type: 'PRICE_BELOW_EMA',
                strength: 'MODERATE',
                label: `🔴 Price < ${fastName} < ${slowName}`,
                description: `Harga di bawah kedua EMA — momentum bearish ${modeLabel.toLowerCase()}`,
            })
            scoreParts.pricePosition -= 1
        }
    }

    // --- RSI ---
    if (currentRSI <= config.rsiOversold) {
        const strength: SignalStrength = currentRSI <= config.rsiOversold - 10 ? 'STRONG' : 'MODERATE'
        signals.push({
            type: 'RSI_OVERSOLD',
            strength,
            label: `🟢 RSI(${config.rsiPeriod}) Oversold`,
            description: `RSI ${currentRSI.toFixed(1)} — area oversold (${modeLabel}), potensi rebound`,
            value: currentRSI,
        })
        scoreParts.rsi += strength === 'STRONG' ? 2 : 1
    } else if (currentRSI >= config.rsiOverbought) {
        const strength: SignalStrength = currentRSI >= config.rsiOverbought + 10 ? 'STRONG' : 'MODERATE'
        signals.push({
            type: 'RSI_OVERBOUGHT',
            strength,
            label: `🔴 RSI(${config.rsiPeriod}) Overbought`,
            description: `RSI ${currentRSI.toFixed(1)} — area overbought (${modeLabel}), potensi koreksi`,
            value: currentRSI,
        })
        scoreParts.rsi -= strength === 'STRONG' ? 2 : 1
    }

    // --- Stochastic (Scalping & Intraday) ---
    if (config.useStochastic && stochK !== undefined && stochD !== undefined && stochData) {
        const prevK = stochData.stochK[last - 1]
        const prevD = stochData.stochD[last - 1]

        if (stochK <= 20 && stochD <= 20) {
            // Stoch oversold + crossover up
            if (prevK <= prevD && stochK > stochD) {
                signals.push({
                    type: 'STOCHASTIC_OVERSOLD',
                    strength: 'STRONG',
                    label: `🟢 Stoch(${config.stochPeriod}) Bullish Cross`,
                    description: `Stochastic oversold crossover: %K(${stochK.toFixed(0)}) > %D(${stochD.toFixed(0)}) — sinyal beli ${modeLabel.toLowerCase()}`,
                    value: stochK,
                })
                scoreParts.stochastic += 2
            } else {
                signals.push({
                    type: 'STOCHASTIC_OVERSOLD',
                    strength: 'MODERATE',
                    label: `🟢 Stoch(${config.stochPeriod}) Oversold`,
                    description: `Stochastic oversold: %K(${stochK.toFixed(0)}) %D(${stochD.toFixed(0)})`,
                    value: stochK,
                })
                scoreParts.stochastic += 1
            }
        } else if (stochK >= 80 && stochD >= 80) {
            if (prevK >= prevD && stochK < stochD) {
                signals.push({
                    type: 'STOCHASTIC_OVERBOUGHT',
                    strength: 'STRONG',
                    label: `🔴 Stoch(${config.stochPeriod}) Bearish Cross`,
                    description: `Stochastic overbought crossover: %K(${stochK.toFixed(0)}) < %D(${stochD.toFixed(0)}) — sinyal jual ${modeLabel.toLowerCase()}`,
                    value: stochK,
                })
                scoreParts.stochastic -= 2
            } else {
                signals.push({
                    type: 'STOCHASTIC_OVERBOUGHT',
                    strength: 'MODERATE',
                    label: `🔴 Stoch(${config.stochPeriod}) Overbought`,
                    description: `Stochastic overbought: %K(${stochK.toFixed(0)}) %D(${stochD.toFixed(0)})`,
                    value: stochK,
                })
                scoreParts.stochastic -= 1
            }
        }
    }

    // --- Volume Spike ---
    if (baselineVolume > 0 && currentVolume > baselineVolume * config.volumeSpikeMultiplier) {
        const ratio = volumeRatio
        const strength: SignalStrength = ratio > config.volumeSpikeMultiplier * 1.5 ? 'STRONG' : 'MODERATE'
        signals.push({
            type: 'VOLUME_SPIKE',
            strength,
            label: `⚡ Volume Spike (${modeLabel})`,
            description: `Volume ${ratio.toFixed(1)}x dari median ${config.volumeAvgPeriod} bar`,
            value: ratio,
        })
        if (change > 0) scoreParts.volume += strength === 'STRONG' ? 2 : 1
        else if (change < 0) scoreParts.volume -= strength === 'STRONG' ? 2 : 1
    }

    // --- MACD Crossover ---
    if (last > 1) {
        const prevMACDAbove = macd.macdLine[last - 1] > macd.signalLine[last - 1]
        const currMACDAbove = macd.macdLine[last] > macd.signalLine[last]

        if (!prevMACDAbove && currMACDAbove) {
            signals.push({
                type: 'MACD_BULLISH',
                strength: 'MODERATE',
                label: `🟢 MACD(${config.macdFast},${config.macdSlow},${config.macdSignalPeriod}) Bullish`,
                description: `MACD line memotong signal line dari bawah (${modeLabel})`,
            })
            scoreParts.macd += 2
        } else if (prevMACDAbove && !currMACDAbove) {
            signals.push({
                type: 'MACD_BEARISH',
                strength: 'MODERATE',
                label: `🔴 MACD(${config.macdFast},${config.macdSlow},${config.macdSignalPeriod}) Bearish`,
                description: `MACD line memotong signal line dari atas (${modeLabel})`,
            })
            scoreParts.macd -= 2
        } else if (currMACDAbove && histogram > prevHistogram) {
            scoreParts.macd += 1
        } else if (!currMACDAbove && histogram < prevHistogram) {
            scoreParts.macd -= 1
        }
    }

    // --- Price Momentum ---
    if (last >= config.momentumPeriod) {
        const momentum = ((closes[last] - closes[last - config.momentumPeriod]) / closes[last - config.momentumPeriod]) * 100
        if (momentum > config.momentumThreshold) {
            signals.push({
                type: 'BULLISH_MOMENTUM',
                strength: momentum > config.momentumThreshold * 2 ? 'STRONG' : 'MODERATE',
                label: `🟢 ${modeLabel} Bullish Momentum`,
                description: `Harga naik ${momentum.toFixed(1)}% dalam ${config.momentumPeriod} bar terakhir`,
                value: momentum,
            })
            scoreParts.momentum += momentum > config.momentumThreshold * 2 ? 2 : 1
        } else if (momentum < -config.momentumThreshold) {
            signals.push({
                type: 'BEARISH_MOMENTUM',
                strength: momentum < -config.momentumThreshold * 2 ? 'STRONG' : 'MODERATE',
                label: `🔴 ${modeLabel} Bearish Momentum`,
                description: `Harga turun ${Math.abs(momentum).toFixed(1)}% dalam ${config.momentumPeriod} bar terakhir`,
                value: momentum,
            })
            scoreParts.momentum -= momentum < -config.momentumThreshold * 2 ? 2 : 1
        }
    }

    // Clamp score
    const rawScore = Object.values(scoreParts).reduce((sum, value) => sum + value, 0)
    const score = clamp(Math.round(rawScore * dataCoverage), -10, 10)
    const confidenceScore = Math.round(clamp((dataCoverage * 70) + (Math.min(signals.length, 6) * 5), 0, 100))

    let overallLabel: string
    if (score >= 5) overallLabel = `Strong Bullish (${modeLabel})`
    else if (score >= 3) overallLabel = `Bullish (${modeLabel})`
    else if (score >= 1) overallLabel = `Mild Bullish`
    else if (score === 0) overallLabel = 'Neutral'
    else if (score >= -1) overallLabel = `Mild Bearish`
    else if (score >= -3) overallLabel = `Bearish (${modeLabel})`
    else overallLabel = `Strong Bearish (${modeLabel})`

    return {
        price: currentPrice,
        change,
        changePercent,
        volume: currentVolume,
        avgVolume,
        rsi: currentRSI,
        sma20: currentSMA20,
        sma50: currentSMA50,
        ema_fast: currentEmaFast,
        ema_slow: currentEmaSlow,
        macdLine: currentMACD,
        macdSignal: currentSignal,
        stochK,
        stochD,
        signals,
        overallScore: score,
        overallLabel,
        tradingMode: mode,
        confidenceScore,
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
        } else if (Array.isArray(data?.prices)) {
            items = data.prices
        } else if (data?.chart_data) {
            items = Array.isArray(data.chart_data) ? data.chart_data : []
        } else if (data?.data && Array.isArray(data.data)) {
            items = data.data
        }

        return items
            .filter((item: any) => {
                if (!item) return false
                return (
                    item.close != null ||
                    item.Close != null ||
                    item.value != null ||
                    item.price != null
                )
            })
            .map((item: any, idx: number) => {
                const toNumber = (value: unknown): number | null => {
                    if (value == null || value === '') return null
                    const n = Number(value)
                    return Number.isFinite(n) ? n : null
                }

                const resolveVolume = (row: any): number => {
                    const candidates = [
                        row.volume,
                        row.vol,
                        row.transaction_volume,
                        row.total_volume,
                        row.tvol,
                        row.tlot,
                        row.lot,
                        row.lots,
                        row.value_volume,
                        row.volume_value,
                        row.accumulated_volume,
                        row.v,
                    ]

                    for (const candidate of candidates) {
                        const value = toNumber(candidate)
                        if (value != null && value > 0) return value
                    }

                    return 0
                }

                // Same price/OHLC fallback logic as MarketPage StockChartComponent
                const closeFromOhlc = toNumber(item.close ?? item.Close)
                const valueLike = toNumber(item.value) ?? toNumber(item.price)
                const price = closeFromOhlc ?? valueLike ?? 0
                const open = toNumber(item.open ?? item.Open)
                const high = toNumber(item.high ?? item.High)
                const low = toNumber(item.low ?? item.Low)
                const close = closeFromOhlc
                const previousRow = idx > 0 ? items[idx - 1] : null
                const previousPrice = previousRow
                    ? Number(previousRow.value || previousRow.close || previousRow.price || price) || price
                    : price

                const candleHigh = high ?? Math.max(open ?? price, close ?? price, price)
                const candleLow = low ?? Math.min(open ?? price, close ?? price, price)
                const candleOpen = open ?? previousPrice
                const candleClose = close ?? price
                const wickHigh = Math.max(candleHigh, candleOpen, candleClose)
                const wickLow = Math.min(candleLow, candleOpen, candleClose)
                const volume = resolveVolume(item)

                return {
                    date: item.date || item.Date || item.timestamp || item.formatted_date || '',
                    open: Number.isFinite(candleOpen) ? candleOpen : 0,
                    high: Number.isFinite(wickHigh) ? wickHigh : 0,
                    low: Number.isFinite(wickLow) ? wickLow : 0,
                    close: Number.isFinite(candleClose) ? candleClose : 0,
                    volume,
                }
            })
            .filter((c) => c.close > 0)
    } catch {
        return []
    }
}