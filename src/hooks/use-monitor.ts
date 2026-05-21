import { useEffect, useRef, useCallback } from 'react'
import { sendTelegramNotification } from '@/utils/telegram'
import { fetchTrendingStocks, fetchOrderbook, fetchMarketDetector } from '@/services/api'
import { useAlertStore } from '@/stores/alert-store'
import { useAlertDataStore } from '@/stores/alert-data-store'

const PRICE_ALERT_COOLDOWN_MS = 60 * 60 * 1000 // 60 menit
const VOLUME_ALERT_COOLDOWN_MS = 45 * 60 * 1000 // 45 menit
const FOREIGN_ALERT_COOLDOWN_MS = 4 * 60 * 60 * 1000 // 4 jam
const TELEGRAM_DUPLICATE_WINDOW_MS = 15 * 60 * 1000 // 15 menit
const TELEGRAM_MIN_SEND_INTERVAL_MS = 2 * 60 * 1000 // 2 menit

interface StockSnapshot {
    symbol: string
    price: number
    volume: number
    prevClose: number
}

interface MarketAlert {
    id: string
    type: 'priceUp' | 'priceDown' | 'volumeSpike' | 'foreignAccumulation'
    title: string
    message: string
    time: string
    severity: 'high' | 'medium' | 'low'
}

interface UseMonitorOptions {
    paused?: boolean
}

function isMarketHours(): boolean {
    const now = new Date()
    const jakartaOffset = 7 * 60
    const utcMinutes = now.getUTCHours() * 60 + now.getUTCMinutes()
    const jakartaMinutes = utcMinutes + jakartaOffset
    const jakartaHour = Math.floor((jakartaMinutes % (24 * 60)) / 60)

    const dayOfWeek = now.getUTCDay()
    const jakartaDay = jakartaMinutes >= 24 * 60
        ? (dayOfWeek + 1) % 7
        : dayOfWeek

    if (jakartaDay === 0 || jakartaDay === 6) return false
    return jakartaHour >= 9 && jakartaHour < 16
}

function getMarketDetectorDate(): string {
    const now = new Date()
    const hour = now.getHours()

    if (hour >= 16) {
        return now.toISOString().split('T')[0]
    }

    const yesterday = new Date(now)
    yesterday.setDate(yesterday.getDate() - 1)

    while (yesterday.getDay() === 0 || yesterday.getDay() === 6) {
        yesterday.setDate(yesterday.getDate() - 1)
    }

    return yesterday.toISOString().split('T')[0]
}

/**
 * Monitor global alerting. Bisa dipause saat halaman scanner aktif
 * agar tidak menambah burst request dan memicu 429.
 */
export function useMonitorSignificantChanges(options: UseMonitorOptions = {}) {
    const { paused = false } = options
    const previousSnapshots = useRef<Record<string, StockSnapshot>>({})
    const previousForeignNet = useRef<Record<string, number>>({})
    const alertedSymbols = useRef<Set<string>>(new Set())
    const alertCooldownUntil = useRef<Record<string, number>>({})
    const lastTelegramPayload = useRef<{ text: string; sentAt: number } | null>(null)
    const lastTelegramSentAt = useRef<number>(0)

    const fetchStocks = useCallback(async () => {
        try {
            const response = await fetchTrendingStocks?.() ?? []
            return response
        } catch {
            console.warn('[Monitor] Gagal mengambil daftar saham')
            return []
        }
    }, [])

    const { settings } = useAlertStore()

    useEffect(() => {
        if (paused) {
            console.log('[Monitor] ⏸️ Monitoring dipause sementara (scanner aktif).')
            return
        }

        if (!settings.enabled) {
            console.log('[Monitor] Alerting is disabled by settings.')
            return
        }

        const checkChanges = async () => {
            const marketOpen = isMarketHours()
            if (!marketOpen) {
                console.log('[Monitor] ⏸️ Pasar tutup. Data mungkin tidak berubah. Tetap monitoring untuk EOD alerts...')
            }

            const cycleTelegramMessages: string[] = []
            const cycleGeneratedAlerts: MarketAlert[] = []

            let symbolsToMonitor: string[] = []

            if (settings.watchlistMode === 'trending') {
                const trendingStocks = await fetchStocks()
                symbolsToMonitor = (trendingStocks as any[])
                    .map((s: any) => s.symbol || s.code)
                    .filter(Boolean)
                    .slice(0, settings.maxStocksMonitored)
            } else {
                symbolsToMonitor = settings.customWatchlist.slice(0, settings.maxStocksMonitored)
            }

            console.log(`[Monitor] 🔍 Checking ${symbolsToMonitor.length} saham... (Market ${marketOpen ? '🟢 OPEN' : '🔴 CLOSED'})`)

            for (const symbol of symbolsToMonitor) {
                try {
                    const nowTs = Date.now()
                    const isInCooldown = (key: string) => (alertCooldownUntil.current[key] ?? 0) > nowTs
                    const markCooldown = (key: string, ms: number) => {
                        alertCooldownUntil.current[key] = nowTs + ms
                    }

                    const obData: any = await fetchOrderbook(symbol)
                    const ob = obData?.data || obData || {}

                    const lastPrice = parseFloat(String(ob.lastprice ?? ob.close ?? 0)) || 0
                    const prevClose = parseFloat(String(ob.prev_close ?? ob.previous ?? 0)) || 0
                    const pctChange = parseFloat(String(ob.percentage_change ?? 0))
                    const totalVolume = parseFloat(String(ob.volume ?? ob.total_volume ?? 0)) || 0

                    if (lastPrice <= 0) continue

                    const prev = previousSnapshots.current[symbol]
                    const telegramMessages: string[] = []
                    const generatedAlerts: MarketAlert[] = []
                    const absPctChange = Math.abs(pctChange)

                    if (absPctChange >= settings.priceChangeThreshold) {
                        const alertKey = `${symbol}-price-${Math.floor(absPctChange)}`
                        const cooldownKey = `${symbol}-price-${pctChange > 0 ? 'up' : 'down'}`

                        if (!alertedSymbols.current.has(alertKey) && !isInCooldown(cooldownKey)) {
                            const severity: 'high' | 'medium' | 'low' =
                                absPctChange >= settings.priceChangeThreshold * 2 ? 'high' : 'medium'

                            if (pctChange > 0 && settings.alertTypes.priceUp) {
                                const message = `💰 <b>${symbol}</b> Harga naik <b>📈 +${pctChange.toFixed(2)}%</b> (${prevClose.toLocaleString('id-ID')} → ${lastPrice.toLocaleString('id-ID')})`
                                telegramMessages.push(message)
                                generatedAlerts.push({
                                    id: `${Date.now()}-${symbol}-priceUp`,
                                    type: 'priceUp',
                                    title: 'Harga Naik',
                                    message,
                                    time: new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' }),
                                    severity,
                                })
                                alertedSymbols.current.add(alertKey)
                                markCooldown(cooldownKey, PRICE_ALERT_COOLDOWN_MS)
                            }

                            if (pctChange < 0 && settings.alertTypes.priceDown) {
                                const message = `💰 <b>${symbol}</b> Harga turun <b>📉 ${pctChange.toFixed(2)}%</b> (${prevClose.toLocaleString('id-ID')} → ${lastPrice.toLocaleString('id-ID')})`
                                telegramMessages.push(message)
                                generatedAlerts.push({
                                    id: `${Date.now()}-${symbol}-priceDown`,
                                    type: 'priceDown',
                                    title: 'Harga Turun',
                                    message,
                                    time: new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' }),
                                    severity,
                                })
                                alertedSymbols.current.add(alertKey)
                                markCooldown(cooldownKey, PRICE_ALERT_COOLDOWN_MS)
                            }
                        }
                    }

                    if (settings.alertTypes.volumeSpike && prev && prev.volume > 0 && totalVolume > 0) {
                        const volumeChange = ((totalVolume - prev.volume) / prev.volume) * 100
                        const alertKey = `${symbol}-vol-${Math.floor(volumeChange / 50) * 50}`
                        const cooldownKey = `${symbol}-vol-${volumeChange > 0 ? 'up' : 'down'}`

                        if (
                            Math.abs(volumeChange) >= settings.volumeChangeThreshold
                            && !alertedSymbols.current.has(alertKey)
                            && !isInCooldown(cooldownKey)
                        ) {
                            const severity: 'high' | 'medium' | 'low' =
                                Math.abs(volumeChange) >= settings.volumeChangeThreshold * 2 ? 'high' : 'medium'

                            const message = `📊 <b>${symbol}</b> Volume melonjak <b>${volumeChange > 0 ? '🚀' : '⬇️'} ${volumeChange.toFixed(0)}%</b> (${prev.volume.toLocaleString('id-ID')} → ${totalVolume.toLocaleString('id-ID')})`
                            telegramMessages.push(message)
                            generatedAlerts.push({
                                id: `${Date.now()}-${symbol}-volumeSpike`,
                                type: 'volumeSpike',
                                title: 'Volume Spike',
                                message,
                                time: new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' }),
                                severity,
                            })
                            alertedSymbols.current.add(alertKey)
                            markCooldown(cooldownKey, VOLUME_ALERT_COOLDOWN_MS)
                        }
                    }

                    if (settings.alertTypes.foreignAccumulation) {
                        try {
                            const targetDate = getMarketDetectorDate()
                            const detectorData: any = await fetchMarketDetector(symbol, {
                                fromDate: targetDate,
                                toDate: targetDate,
                            })
                            const brokerSummary = detectorData?.data?.broker_summary || detectorData?.broker_summary

                            if (brokerSummary) {
                                const foreignBuy = (brokerSummary.brokers_buy || [])
                                    .filter((b: any) => b.type === 'Asing')
                                    .reduce((sum: number, b: any) => sum + parseFloat(b.bval || b.bvalv || '0'), 0)

                                const foreignSell = (brokerSummary.brokers_sell || [])
                                    .filter((s: any) => s.type === 'Asing')
                                    .reduce((sum: number, s: any) => sum + parseFloat(s.sval || s.svalv || '0'), 0)

                                const foreignNetBuyMillions = foreignBuy - foreignSell
                                const thresholdMillions = settings.foreignNetBuyThreshold * 1000

                                const prevNet = previousForeignNet.current[symbol] ?? 0
                                const isNewCrossing = prevNet < thresholdMillions && foreignNetBuyMillions >= thresholdMillions
                                const isSignificantIncrease = foreignNetBuyMillions >= thresholdMillions
                                    && (foreignNetBuyMillions - prevNet) >= thresholdMillions * 0.2

                                const alertKey = `${symbol}-foreign-${targetDate}`
                                const cooldownKey = `${symbol}-foreign`

                                if (
                                    (isNewCrossing || isSignificantIncrease)
                                    && !alertedSymbols.current.has(alertKey)
                                    && !isInCooldown(cooldownKey)
                                ) {
                                    const netBilion = (foreignNetBuyMillions / 1000).toFixed(2)
                                    const msg = `🌍 <b>${symbol}</b> Akumulasi Asing terdeteksi! Net beli asing: <b>Rp ${netBilion}M</b> (threshold: Rp ${settings.foreignNetBuyThreshold}M)`
                                    telegramMessages.push(msg)
                                    generatedAlerts.push({
                                        id: `${Date.now()}-${symbol}-foreignAccumulation`,
                                        type: 'foreignAccumulation',
                                        title: 'Akumulasi Asing',
                                        message: msg,
                                        time: new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' }),
                                        severity: foreignNetBuyMillions >= thresholdMillions * 2 ? 'high' : 'medium',
                                    })
                                    alertedSymbols.current.add(alertKey)
                                    markCooldown(cooldownKey, FOREIGN_ALERT_COOLDOWN_MS)
                                }
                                previousForeignNet.current[symbol] = foreignNetBuyMillions
                            }
                        } catch {
                            // Abaikan error market detector
                        }
                    }

                    if (generatedAlerts.length > 0) {
                        cycleGeneratedAlerts.push(...generatedAlerts)
                    }

                    if (telegramMessages.length > 0) {
                        cycleTelegramMessages.push(...telegramMessages)
                    }

                    if (generatedAlerts.length > 0) {
                        console.log(`[Monitor] ✅ ${generatedAlerts.length} alert(s) untuk ${symbol}`)
                    }

                    previousSnapshots.current[symbol] = {
                        symbol,
                        price: lastPrice,
                        volume: totalVolume,
                        prevClose,
                    }
                } catch (e) {
                    console.error(`[Monitor] Gagal memproses saham ${symbol}:`, e)
                }
            }

            if (cycleGeneratedAlerts.length > 0) {
                useAlertDataStore.getState().addAlerts(cycleGeneratedAlerts)
            }

            if (cycleTelegramMessages.length > 0 && settings.telegramEnabled) {
                const uniqueMessages = Array.from(new Set(cycleTelegramMessages))
                const fullMessage = `🔔 <b>Market Alert</b>\n\n` + uniqueMessages.join('\n')
                const nowTs = Date.now()
                const duplicatedPayload =
                    lastTelegramPayload.current
                    && lastTelegramPayload.current.text === fullMessage
                    && (nowTs - lastTelegramPayload.current.sentAt) < TELEGRAM_DUPLICATE_WINDOW_MS
                const sendInCooldown = (nowTs - lastTelegramSentAt.current) < TELEGRAM_MIN_SEND_INTERVAL_MS

                if (duplicatedPayload) {
                    console.log('[Monitor] ⏭️ Skip Telegram: payload sama dalam window dedup')
                } else if (sendInCooldown) {
                    console.log('[Monitor] ⏭️ Skip Telegram: global cooldown kirim aktif')
                } else {
                    await sendTelegramNotification(fullMessage)
                    lastTelegramPayload.current = { text: fullMessage, sentAt: nowTs }
                    lastTelegramSentAt.current = nowTs
                }
            }
        }

        const resetDaily = () => {
            const now = new Date()
            if (now.getHours() === 8 && now.getMinutes() < 5) {
                alertedSymbols.current.clear()
                previousSnapshots.current = {}
                previousForeignNet.current = {}
                alertCooldownUntil.current = {}
                lastTelegramPayload.current = null
                lastTelegramSentAt.current = 0
                console.log('[Monitor] 🔄 Reset harian - alert history cleared')
            }
        }

        const initialTimeout = setTimeout(checkChanges, 10_000)

        const interval = setInterval(() => {
            resetDaily()
            checkChanges()
        }, settings.pollingIntervalMinutes * 60 * 1000)

        return () => {
            clearTimeout(initialTimeout)
            clearInterval(interval)
        }
    }, [fetchStocks, paused, settings])
}