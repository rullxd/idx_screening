import { useState } from 'react'
import { Card } from '@/components'
import { useAlertStore } from '@/stores/alert-store'
import { useAlertDataStore } from '@/stores/alert-data-store'
import { sendTelegramNotification } from '@/utils/telegram'

export default function AlertsPage() {
    const [activeTab, setActiveTab] = useState<'alerts' | 'settings'>('alerts')

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold text-dark-100">🔔 Alert & Signals</h1>
                <div className="flex bg-dark-800 rounded-lg p-1">
                    <button
                        onClick={() => setActiveTab('alerts')}
                        className={`px-4 py-2 rounded-md text-sm font-medium transition ${activeTab === 'alerts'
                            ? 'bg-accent-blue text-white'
                            : 'text-dark-400 hover:text-dark-200'
                            }`}
                    >
                        📋 Alerts
                    </button>
                    <button
                        onClick={() => setActiveTab('settings')}
                        className={`px-4 py-2 rounded-md text-sm font-medium transition ${activeTab === 'settings'
                            ? 'bg-accent-blue text-white'
                            : 'text-dark-400 hover:text-dark-200'
                            }`}
                    >
                        ⚙️ Pengaturan
                    </button>
                </div>
            </div>

            {activeTab === 'alerts' && <AlertsList />}
            {activeTab === 'settings' && <AlertSettingsPanel />}
        </div>
    )
}

/* ────────────────────── ALERTS LIST ────────────────────── */

function AlertsList() {
    const { alerts, clearAlerts, removeAlert } = useAlertDataStore()

    const getAlertIcon = (type: string) => {
        switch (type) {
            case 'priceUp': return '📈'
            case 'priceDown': return '📉'
            case 'volumeSpike': return '🚀'
            case 'foreignAccumulation': return '🌍'
            default: return '📢'
        }
    }

    const getAlertTypeLabel = (type: string) => {
        switch (type) {
            case 'priceUp': return 'Harga Naik'
            case 'priceDown': return 'Harga Turun'
            case 'volumeSpike': return 'Volume Spike'
            case 'foreignAccumulation': return 'Akumulasi Asing'
            default: return 'Alert'
        }
    }

    const getSeverityColor = (severity: string) => {
        switch (severity) {
            case 'high': return 'border-l-4 border-accent-red'
            case 'medium': return 'border-l-4 border-accent-yellow'
            case 'low': return 'border-l-4 border-accent-blue'
            default: return 'border-l-4 border-dark-700'
        }
    }

    // Strip HTML tags dari message Telegram untuk display di UI
    const stripHtml = (html: string) => html.replace(/<[^>]*>/g, '')

    const highCount = alerts.filter((a) => a.severity === 'high').length
    const mediumCount = alerts.filter((a) => a.severity === 'medium').length
    const lowCount = alerts.filter((a) => a.severity === 'low').length
    const priceUpCount = alerts.filter((a) => a.type === 'priceUp').length
    const priceDownCount = alerts.filter((a) => a.type === 'priceDown').length
    const volumeSpikeCount = alerts.filter((a) => a.type === 'volumeSpike').length
    const foreignAccCount = alerts.filter((a) => a.type === 'foreignAccumulation').length

    return (
        <>
            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2">
                <Card className="p-3 border-l-4 border-accent-red">
                    <p className="text-dark-500 text-xs font-semibold">HIGH</p>
                    <p className="text-xl font-bold text-accent-red mt-1">{highCount}</p>
                </Card>
                <Card className="p-3 border-l-4 border-accent-yellow">
                    <p className="text-dark-500 text-xs font-semibold">MEDIUM</p>
                    <p className="text-xl font-bold text-accent-yellow mt-1">{mediumCount}</p>
                </Card>
                <Card className="p-3 border-l-4 border-accent-blue">
                    <p className="text-dark-500 text-xs font-semibold">LOW</p>
                    <p className="text-xl font-bold text-accent-blue mt-1">{lowCount}</p>
                </Card>
                <Card className="p-3 border-l-4 border-accent-green">
                    <p className="text-dark-500 text-xs font-semibold">HARGA NAIK</p>
                    <p className="text-xl font-bold text-accent-green mt-1">{priceUpCount}</p>
                </Card>
                <Card className="p-3 border-l-4 border-accent-red">
                    <p className="text-dark-500 text-xs font-semibold">HARGA TURUN</p>
                    <p className="text-xl font-bold text-accent-red mt-1">{priceDownCount}</p>
                </Card>
                <Card className="p-3 border-l-4 border-accent-purple">
                    <p className="text-dark-500 text-xs font-semibold">VOL SPIKE</p>
                    <p className="text-xl font-bold text-accent-purple mt-1">{volumeSpikeCount}</p>
                </Card>
                <Card className="p-3 border-l-4 border-cyan-500">
                    <p className="text-dark-500 text-xs font-semibold">ASING</p>
                    <p className="text-xl font-bold text-cyan-400 mt-1">{foreignAccCount}</p>
                </Card>
            </div>

            {/* Header baris + tombol clear */}
            {alerts.length > 0 && (
                <div className="flex items-center justify-between">
                    <p className="text-dark-400 text-sm">{alerts.length} alert terdeteksi dari market</p>
                    <button
                        onClick={clearAlerts}
                        className="px-3 py-1.5 text-xs bg-dark-700 hover:bg-dark-600 border border-dark-600 text-dark-400 hover:text-dark-200 rounded-lg transition"
                    >
                        🗑️ Clear All
                    </button>
                </div>
            )}

            {/* Daftar Alert */}
            {alerts.length === 0 ? (
                <Card className="p-10 text-center">
                    <p className="text-4xl mb-3">📭</p>
                    <p className="text-dark-300 font-medium">Belum ada alert terdeteksi</p>
                    <p className="text-dark-500 text-sm mt-1">
                        Sistem akan memantau perubahan harga & volume secara otomatis.<br />
                        Alert akan muncul di sini saat ada sinyal signifikan dari market.
                    </p>
                    <p className="text-dark-600 text-xs mt-3">
                        Pemantauan dimulai 30 detik setelah halaman dibuka.
                    </p>
                </Card>
            ) : (
                <div className="space-y-3">
                    {alerts.map((alert) => (
                        <Card
                            key={alert.id}
                            className={`p-4 ${getSeverityColor(alert.severity)} hover:bg-dark-800 transition`}
                        >
                            <div className="flex items-start justify-between gap-3">
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="text-lg flex-shrink-0">{getAlertIcon(alert.type)}</span>
                                        <p className="font-semibold text-dark-100">{getAlertTypeLabel(alert.type)}</p>
                                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${alert.severity === 'high'
                                                ? 'bg-accent-red/20 text-accent-red'
                                                : alert.severity === 'medium'
                                                    ? 'bg-accent-yellow/20 text-accent-yellow'
                                                    : 'bg-accent-blue/20 text-accent-blue'
                                            }`}>
                                            {alert.severity.toUpperCase()}
                                        </span>
                                    </div>
                                    <p className="text-dark-300 text-sm mb-2 break-words">{stripHtml(alert.message)}</p>
                                    <p className="text-dark-500 text-xs">{alert.time}</p>
                                </div>
                                <button
                                    onClick={() => removeAlert(alert.id)}
                                    className="text-dark-600 hover:text-accent-red transition text-lg flex-shrink-0"
                                    title="Hapus alert ini"
                                >
                                    ✕
                                </button>
                            </div>
                        </Card>
                    ))}
                </div>
            )}

            <Card className="p-4 bg-dark-800/50 text-dark-400 text-sm">
                <p>💡 Alert dihasilkan otomatis dari data market real-time. Klik tab <strong>⚙️ Pengaturan</strong> untuk mengkonfigurasi threshold dan notifikasi Telegram.</p>
            </Card>
        </>
    )
}

/* ────────────────────── SETTINGS PANEL ────────────────────── */

function AlertSettingsPanel() {
    const { settings, updateSettings, updateAlertTypes, addToWatchlist, removeFromWatchlist, resetToDefaults } = useAlertStore()
    const [newSymbol, setNewSymbol] = useState('')

    const handleAddSymbol = () => {
        const trimmed = newSymbol.trim().toUpperCase()
        if (trimmed && trimmed.length >= 2) {
            addToWatchlist(trimmed)
            setNewSymbol('')
        }
    }

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            handleAddSymbol()
        }
    }

    return (
        <div className="space-y-6">
            {/* ── Master Toggle ── */}
            <Card className="p-5">
                <div className="flex items-center justify-between">
                    <div>
                        <h3 className="text-lg font-semibold text-dark-100">🟢 Pemantauan Aktif</h3>
                        <p className="text-dark-400 text-sm mt-1">Aktifkan/nonaktifkan seluruh sistem pemantauan alert otomatis</p>
                    </div>
                    <ToggleSwitch
                        checked={settings.enabled}
                        onChange={(val) => updateSettings({ enabled: val })}
                    />
                </div>
            </Card>

            {/* ── Notifikasi ── */}
            <Card className="p-5">
                <h3 className="text-lg font-semibold text-dark-100 mb-4">📬 Channel Notifikasi</h3>
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-dark-200 font-medium">Telegram</p>
                            <p className="text-dark-500 text-xs">Kirim alert ke bot Telegram yang sudah dikonfigurasi</p>
                        </div>
                        <div className="flex items-center gap-3">
                            <TestSendButton />
                            <ToggleSwitch
                                checked={settings.telegramEnabled}
                                onChange={(val) => updateSettings({ telegramEnabled: val })}
                            />
                        </div>
                    </div>
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-dark-200 font-medium">In-App Notifikasi</p>
                            <p className="text-dark-500 text-xs">Tampilkan alert di dalam aplikasi (coming soon)</p>
                        </div>
                        <ToggleSwitch
                            checked={settings.inAppNotifications}
                            onChange={(val) => updateSettings({ inAppNotifications: val })}
                        />
                    </div>
                </div>
            </Card>

            {/* ── Ambang Batas ── */}
            <Card className="p-5">
                <h3 className="text-lg font-semibold text-dark-100 mb-4">📏 Ambang Batas (Threshold)</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div>
                        <label className="block text-dark-300 text-sm font-medium mb-1">Perubahan Harga (%)</label>
                        <input
                            type="number"
                            min={0.1}
                            max={50}
                            step={0.1}
                            value={settings.priceChangeThreshold}
                            onChange={(e) => updateSettings({ priceChangeThreshold: parseFloat(e.target.value) || 2 })}
                            className="w-full bg-dark-800 border border-dark-600 rounded-lg px-3 py-2 text-dark-100 focus:outline-none focus:border-accent-blue"
                        />
                        <p className="text-dark-500 text-xs mt-1">Alert jika harga berubah ≥ nilai ini</p>
                    </div>
                    <div>
                        <label className="block text-dark-300 text-sm font-medium mb-1">Lonjakan Volume (%)</label>
                        <input
                            type="number"
                            min={5}
                            max={500}
                            step={5}
                            value={settings.volumeChangeThreshold}
                            onChange={(e) => updateSettings({ volumeChangeThreshold: parseFloat(e.target.value) || 50 })}
                            className="w-full bg-dark-800 border border-dark-600 rounded-lg px-3 py-2 text-dark-100 focus:outline-none focus:border-accent-blue"
                        />
                        <p className="text-dark-500 text-xs mt-1">Alert jika volume melonjak ≥ nilai ini</p>
                    </div>
                    <div>
                        <label className="block text-dark-300 text-sm font-medium mb-1">Net Buy Asing (Miliar)</label>
                        <input
                            type="number"
                            min={0.5}
                            max={100}
                            step={0.5}
                            value={settings.foreignNetBuyThreshold}
                            onChange={(e) => updateSettings({ foreignNetBuyThreshold: parseFloat(e.target.value) || 5 })}
                            className="w-full bg-dark-800 border border-dark-600 rounded-lg px-3 py-2 text-dark-100 focus:outline-none focus:border-accent-blue"
                        />
                        <p className="text-dark-500 text-xs mt-1">Alert jika net buy asing ≥ nilai ini (miliar IDR)</p>
                    </div>
                    <div>
                        <label className="block text-dark-300 text-sm font-medium mb-1">Interval Polling (menit)</label>
                        <input
                            type="number"
                            min={1}
                            max={60}
                            step={1}
                            value={settings.pollingIntervalMinutes}
                            onChange={(e) => updateSettings({ pollingIntervalMinutes: parseInt(e.target.value) || 2 })}
                            className="w-full bg-dark-800 border border-dark-600 rounded-lg px-3 py-2 text-dark-100 focus:outline-none focus:border-accent-blue"
                        />
                        <p className="text-dark-500 text-xs mt-1">Seberapa sering cek data (1-60 menit)</p>
                    </div>
                </div>
            </Card>

            {/* ── Jenis Alert ── */}
            <Card className="p-5">
                <h3 className="text-lg font-semibold text-dark-100 mb-4">🔔 Jenis Alert</h3>
                <div className="space-y-3">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <span>📈</span>
                            <div>
                                <p className="text-dark-200 font-medium">Harga Naik</p>
                                <p className="text-dark-500 text-xs">Notifikasi saat harga naik melebihi ambang batas</p>
                            </div>
                        </div>
                        <ToggleSwitch
                            checked={settings.alertTypes.priceUp}
                            onChange={(val) => updateAlertTypes({ priceUp: val })}
                        />
                    </div>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <span>📉</span>
                            <div>
                                <p className="text-dark-200 font-medium">Harga Turun</p>
                                <p className="text-dark-500 text-xs">Notifikasi saat harga turun melebihi ambang batas</p>
                            </div>
                        </div>
                        <ToggleSwitch
                            checked={settings.alertTypes.priceDown}
                            onChange={(val) => updateAlertTypes({ priceDown: val })}
                        />
                    </div>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <span>🚀</span>
                            <div>
                                <p className="text-dark-200 font-medium">Volume Spike</p>
                                <p className="text-dark-500 text-xs">Notifikasi saat volume melonjak signifikan</p>
                            </div>
                        </div>
                        <ToggleSwitch
                            checked={settings.alertTypes.volumeSpike}
                            onChange={(val) => updateAlertTypes({ volumeSpike: val })}
                        />
                    </div>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <span>🌍</span>
                            <div>
                                <p className="text-dark-200 font-medium">Akumulasi Asing</p>
                                <p className="text-dark-500 text-xs">Notifikasi saat net buy asing melebihi threshold</p>
                            </div>
                        </div>
                        <ToggleSwitch
                            checked={settings.alertTypes.foreignAccumulation}
                            onChange={(val) => updateAlertTypes({ foreignAccumulation: val })}
                        />
                    </div>
                </div>
            </Card>

            {/* ── Watchlist Mode ── */}
            <Card className="p-5">
                <h3 className="text-lg font-semibold text-dark-100 mb-4">📊 Mode Watchlist</h3>
                <div className="space-y-4">
                    <div className="flex gap-3">
                        <button
                            onClick={() => updateSettings({ watchlistMode: 'trending' })}
                            className={`flex-1 px-4 py-3 rounded-lg border-2 transition text-sm font-medium ${settings.watchlistMode === 'trending'
                                ? 'border-accent-blue bg-accent-blue/10 text-accent-blue'
                                : 'border-dark-600 text-dark-400 hover:border-dark-500'
                                }`}
                        >
                            🔥 Trending Stocks
                            <p className="text-xs mt-1 opacity-70">Pantau saham trending otomatis</p>
                        </button>
                        <button
                            onClick={() => updateSettings({ watchlistMode: 'custom' })}
                            className={`flex-1 px-4 py-3 rounded-lg border-2 transition text-sm font-medium ${settings.watchlistMode === 'custom'
                                ? 'border-accent-blue bg-accent-blue/10 text-accent-blue'
                                : 'border-dark-600 text-dark-400 hover:border-dark-500'
                                }`}
                        >
                            ✏️ Custom Watchlist
                            <p className="text-xs mt-1 opacity-70">Pilih saham yang ingin dipantau</p>
                        </button>
                    </div>

                    <div>
                        <label className="block text-dark-300 text-sm font-medium mb-1">Maks Saham Dipantau</label>
                        <input
                            type="number"
                            min={1}
                            max={50}
                            step={1}
                            value={settings.maxStocksMonitored}
                            onChange={(e) => updateSettings({ maxStocksMonitored: parseInt(e.target.value) || 10 })}
                            className="w-full bg-dark-800 border border-dark-600 rounded-lg px-3 py-2 text-dark-100 focus:outline-none focus:border-accent-blue max-w-xs"
                        />
                    </div>

                    {settings.watchlistMode === 'custom' && (
                        <div className="mt-4 space-y-3">
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    placeholder="Ketik kode saham, misal: BBCA"
                                    value={newSymbol}
                                    onChange={(e) => setNewSymbol(e.target.value.toUpperCase())}
                                    onKeyDown={handleKeyDown}
                                    className="flex-1 bg-dark-800 border border-dark-600 rounded-lg px-3 py-2 text-dark-100 placeholder-dark-500 focus:outline-none focus:border-accent-blue"
                                    maxLength={10}
                                />
                                <button
                                    onClick={handleAddSymbol}
                                    className="px-4 py-2 bg-accent-blue hover:bg-accent-blue/80 text-white rounded-lg font-medium text-sm transition"
                                >
                                    + Tambah
                                </button>
                            </div>

                            {settings.customWatchlist.length === 0 ? (
                                <p className="text-dark-500 text-sm italic">Belum ada saham di watchlist custom. Tambahkan kode saham di atas.</p>
                            ) : (
                                <div className="flex flex-wrap gap-2">
                                    {settings.customWatchlist.map((symbol) => (
                                        <span
                                            key={symbol}
                                            className="inline-flex items-center gap-1 px-3 py-1.5 bg-dark-700 rounded-full text-sm text-dark-200 border border-dark-600"
                                        >
                                            {symbol}
                                            <button
                                                onClick={() => removeFromWatchlist(symbol)}
                                                className="ml-1 text-dark-500 hover:text-accent-red transition"
                                                title={`Hapus ${symbol}`}
                                            >
                                                ✕
                                            </button>
                                        </span>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </Card>

            {/* ── Reset ── */}
            <Card className="p-5 border border-dark-600">
                <div className="flex items-center justify-between">
                    <div>
                        <h3 className="text-dark-200 font-semibold">🗑️ Reset Pengaturan</h3>
                        <p className="text-dark-500 text-sm">Kembalikan semua pengaturan alert ke nilai default</p>
                    </div>
                    <button
                        onClick={resetToDefaults}
                        className="px-4 py-2 bg-accent-red/20 hover:bg-accent-red/40 text-accent-red rounded-lg font-medium text-sm transition border border-accent-red/30"
                    >
                        Reset Default
                    </button>
                </div>
            </Card>
        </div>
    )
}

/* ────────────────────── TEST SEND BUTTON ────────────────────── */

function TestSendButton() {
    const [status, setStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle')

    const handleTestSend = async () => {
        setStatus('sending')
        try {
            const now = new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })
            const testMessage =
                `🧪 <b>Test Alert — IDX Screening</b>\n\n` +
                `Ini adalah pesan percobaan dari sistem alert.\n\n` +
                `💰 <b>BBCA</b> Harga naik <b>📈 +3.25%</b> (8,750 → 9,035)\n` +
                `📊 <b>TLKM</b> Volume melonjak <b>🚀 +120%</b> (1.2M → 2.6M)\n\n` +
                `⏰ Dikirim pada: ${now}\n` +
                `✅ Koneksi Telegram berhasil!`

            const success = await sendTelegramNotification(testMessage)
            setStatus(success ? 'success' : 'error')
        } catch {
            setStatus('error')
        }

        // Reset status setelah 3 detik
        setTimeout(() => setStatus('idle'), 3000)
    }

    return (
        <button
            onClick={handleTestSend}
            disabled={status === 'sending'}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition border ${status === 'idle'
                    ? 'bg-dark-700 border-dark-600 text-dark-300 hover:bg-dark-600 hover:text-dark-100'
                    : status === 'sending'
                        ? 'bg-dark-700 border-dark-600 text-dark-400 cursor-wait'
                        : status === 'success'
                            ? 'bg-accent-green/20 border-accent-green/40 text-accent-green'
                            : 'bg-accent-red/20 border-accent-red/40 text-accent-red'
                }`}
        >
            {status === 'idle' && '🧪 Test Send'}
            {status === 'sending' && '⏳ Mengirim...'}
            {status === 'success' && '✅ Terkirim!'}
            {status === 'error' && '❌ Gagal'}
        </button>
    )
}

/* ────────────────────── TOGGLE SWITCH ────────────────────── */

function ToggleSwitch({ checked, onChange }: { checked: boolean; onChange: (val: boolean) => void }) {
    return (
        <button
            type="button"
            role="switch"
            aria-checked={checked}
            onClick={() => onChange(!checked)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-accent-blue focus:ring-offset-2 focus:ring-offset-dark-900 ${checked ? 'bg-accent-blue' : 'bg-dark-600'
                }`}
        >
            <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${checked ? 'translate-x-6' : 'translate-x-1'
                    }`}
            />
        </button>
    )
}