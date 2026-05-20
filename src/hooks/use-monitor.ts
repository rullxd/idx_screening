import { useEffect, useRef, useCallback } from 'react'
import { sendTelegramNotification } from '@/utils/telegram'
import { fetchTrendingStocks, fetchOrderbook, fetchMarketDetector } from '@/services/api'
import { useAlertStore } from '@/stores/alert-store'
import { useAlertDataStore } from '@/stores/alert-data-store'

// Interface untuk snapshot data saham
interface StockSnapshot {
    symbol: string
    price: number
    volume: number
    prevClose: number
}

// Interface untuk struktur data alert yang akan ditampilkan
interface MarketAlert {
    id: string
    type: 'priceUp' | 'priceDown' | 'volumeSpike' | 'foreignAccumulation'
    title: string
    message: string
    time: string
    severity: 'high' | 'medium' | 'low'
}

/**
 * Cek apakah sekarang dalam jam pasar IDX
 * Pasar buka: Senin-Jumat, 09:00-16:00 WIB
 */
function isMarketHours(): boolean {
    const now = new Date()
    // Konversi ke waktu Jakarta (UTC+7)
    const jakartaOffset = 7 * 60 // menit
    const utcMinutes = now.getUTCHours() * 60 + now.getUTCMinutes()
    const jakartaMinutes = utcMinutes + jakartaOffset
    const jakartaHour = Math.floor((jakartaMinutes % (24 * 60)) / 60)

    const dayOfWeek = now.getUTCDay() // 0=Sun, 6=Sat
    // Adjust day for timezone
    const jakartaDay = jakartaMinutes >= 24 * 60
        ? (dayOfWeek + 1) % 7
        : dayOfWeek

    // Pasar tutup di akhir pekan
    if (jakartaDay === 0 || jakartaDay === 6) return false

    // Pasar buka 08:45 - 16:15 (beri sedikit buffer)
    return jakartaHour >= 9 && jakartaHour < 16
}

/**
 * Dapatkan tanggal target untuk market detector (hari trading terakhir)
 */
function getMarketDetectorDate(): string {
    const now = new Date()
    const hour = now.getHours()

    // Setelah jam 16, gunakan hari ini
    if (hour >= 16) {
        return now.toISOString().split('T')[0]
    }

    // Sebelum jam 16, gunakan kemarin (atau hari kerja terakhir)
    const yesterday = new Date(now)
    yesterday.setDate(yesterday.getDate() - 1)

    // Skip weekend
    while (yesterday.getDay() === 0 || yesterday.getDay() === 6) {
        yesterday.setDate(yesterday.getDate() - 1)
    }

    return yesterday.toISOString().split('T')[0]
}

/**
 * Memantau perubahan harga dan volume saham menggunakan data orderbook (realtime).
 * Mengirim notifikasi ke Telegram jika terdeteksi perubahan signifikan.
 *
 * Data source:
 * - fetchOrderbook: harga realtime, volume, percentage_change (cache 5 detik)
 * - fetchMarketDetector: data akumulasi asing (cache 60 detik)
 */
export function useMonitorSignificantChanges() {
    const previousSnapshots = useRef<Record<string, StockSnapshot>>({})
    const previousForeignNet = useRef<Record<string, number>>({})
    const alertedSymbols = useRef<Set<string>>(new Set()) // Hindari duplikat alert per sesi

    // Ambil daftar saham trending
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

    // Polling data harga berdasarkan interval dari store
    useEffect(() => {
        if (!settings.enabled) {
            console.log('[Monitor] Alerting is disabled by settings.')
            return
        }

        const checkChanges = async () => {
            // Cek jam pasar - tetap jalankan tapi log status
            const marketOpen = isMarketHours()
            if (!marketOpen) {
                console.log('[Monitor] ⏸️ Pasar tutup. Data mungkin tidak berubah. Tetap monitoring untuk EOD alerts...')
            }

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
                    // ===== GUNAKAN ORDERBOOK UNTUK DATA REALTIME =====
                    const obData: any = await fetchOrderbook(symbol)
                    const ob = obData?.data || obData || {}

                    const lastPrice = parseFloat(String(ob.lastprice ?? ob.close ?? 0)) || 0
                    const prevClose = parseFloat(String(ob.prev_close ?? ob.previous ?? 0)) || 0
                    const pctChange = parseFloat(String(ob.percentage_change ?? 0))
                    const totalVolume = parseFloat(String(ob.volume ?? ob.total_volume ?? 0)) || 0

                    if (lastPrice <= 0) continue

                    const prev = previousSnapshots.current[symbol]

                    // List untuk menampung pesan dan alert
                    const telegramMessages: string[] = []
                    const generatedAlerts: MarketAlert[] = []

                    // ===== CEK PRICE CHANGE (dari orderbook percentage_change) =====
                    const absPctChange = Math.abs(pctChange)

                    if (absPctChange >= settings.priceChangeThreshold) {
                        const alertKey = `${symbol}-price-${Math.floor(absPctChange)}`

                        if (!alertedSymbols.current.has(alertKey)) {
                            const severity: 'high' | 'medium' | 'low' =
                                absPctChange >= settings.priceChangeThreshold * 2 ? 'high' :
                                    absPctChange >= settings.priceChangeThreshold ? 'medium' : 'low'

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
                            }
                        }
                    }

                    // ===== CEK VOLUME SPIKE (bandingkan dengan snapshot sebelumnya) =====
                    if (settings.alertTypes.volumeSpike && prev && prev.volume > 0 && totalVolume > 0) {
                        const volumeChange = ((totalVolume - prev.volume) / prev.volume) * 100
                        const alertKey = `${symbol}-vol-${Math.floor(volumeChange / 50) * 50}`

                        if (Math.abs(volumeChange) >= settings.volumeChangeThreshold && !alertedSymbols.current.has(alertKey)) {
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
                        }
                    }

                    // ===== CEK FOREIGN ACCUMULATION via Market Detector =====
                    if (settings.alertTypes.foreignAccumulation) {
                        try {
                            const targetDate = getMarketDetectorDate()
                            const detectorData: any = await fetchMarketDetector(symbol, {
                                fromDate: targetDate,
                                toDate: targetDate,
                            })
                            const brokerSummary = detectorData?.data?.broker_summary
                                || detectorData?.broker_summary

                            if (brokerSummary) {
                                // Hitung net beli asing
                                const foreignBuy = (brokerSummary.brokers_buy || [])
                                    .filter((b: any) => b.type === 'Asing')
                                    .reduce((sum: number, b: any) => sum + parseFloat(b.bval || b.bvalv || '0'), 0)

                                const foreignSell = (brokerSummary.brokers_sell || [])
                                    .filter((s: any) => s.type === 'Asing')
                                    .reduce((sum: number, s: any) => sum + parseFloat(s.sval || s.svalv || '0'), 0)

                                // bval/sval biasanya dalam juta IDR, threshold dalam miliar → konversi
                                const foreignNetBuyMillions = foreignBuy - foreignSell
                                const thresholdMillions = settings.foreignNetBuyThreshold * 1000

                                const prevNet = previousForeignNet.current[symbol] ?? 0
                                const isNewCrossing = prevNet < thresholdMillions && foreignNetBuyMillions >= thresholdMillions
                                const isSignificantIncrease = foreignNetBuyMillions >= thresholdMillions
                                    && (foreignNetBuyMillions - prevNet) >= thresholdMillions * 0.2

                                const alertKey = `${symbol}-foreign-${targetDate}`

                                if ((isNewCrossing || isSignificantIncrease) && !alertedSymbols.current.has(alertKey)) {
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
                                }
                                previousForeignNet.current[symbol] = foreignNetBuyMillions
                            }
                        } catch {
                            // Abaikan error market detector
                        }
                    }

                    // Kirim notifikasi Telegram
                    if (telegramMessages.length > 0) {
                        const fullMessage = `🔔 <b>Market Alert</b>\n\n` + telegramMessages.join('\n')
                        if (settings.telegramEnabled) {
                            await sendTelegramNotification(fullMessage)
                        }
                    }

                    // Simpan alert ke store
                    if (generatedAlerts.length > 0) {
                        useAlertDataStore.getState().addAlerts(generatedAlerts)
                        console.log(`[Monitor] ✅ ${generatedAlerts.length} alert(s) untuk ${symbol}`)
                    }

                    // Simpan snapshot terbaru
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
        }

        // Reset alertedSymbols setiap hari baru
        const resetDaily = () => {
            const now = new Date()
            if (now.getHours() === 8 && now.getMinutes() < 5) {
                alertedSymbols.current.clear()
                previousSnapshots.current = {}
                previousForeignNet.current = {}
                console.log('[Monitor] 🔄 Reset harian - alert history cleared')
            }
        }

        // Jalankan pengecekan pertama setelah 10 detik
        const initialTimeout = setTimeout(checkChanges, 10_000)

        // Polling setiap X menit
        const interval = setInterval(() => {
            resetDaily()
            checkChanges()
        }, settings.pollingIntervalMinutes * 60 * 1000)

        return () => {
            clearTimeout(initialTimeout)
            clearInterval(interval)
        }
    }, [fetchStocks, settings])
}