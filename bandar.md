# 🔭 BANDARSCOPE — Roadmap Pengembangan
> Berbasis analisis codebase `idx_screening` + konsep Mata Dewa Stockbit (Broker Summary / Bandarmologi)
> Disimpan sebagai dokumen roadmap utama: `bandar.md`

---

## 📦 State Proyek Saat Ini

### Halaman yang sudah ada:
| Route | Halaman | Status |
|---|---|---|
| `/dashboard` | IHSGHeroCard + TrendingStocks | ✅ Ada |
| `/market` | BrokerSummaryCard + OrderbookCard + StockChart | ✅ Ada |
| `/screener` | ScreenerTable + ScreenerToolbar | ✅ Ada |
| `/broker-activity` | BrokerActivityList + MarketDetectorComponent | ✅ Ada |
| `/signals` | SignalScannerPage (teknikal: RSI, MACD, dll) | ✅ Ada |
| `/alerts` | AlertsList + Telegram notif | ✅ Ada |
| `/heatmap` | HeatmapPage | ✅ Ada |

### Infrastruktur yang sudah ada:
- ✅ React 18 + Vite + TypeScript + TailwindCSS
- ✅ TanStack React Query (caching & refetch)
- ✅ Zustand stores (broker-ranking, screener, alert, dashboard, ui)
- ✅ `api-client.ts` terpusat dengan abort controller & error handling
- ✅ `use-queries.ts` hooks untuk semua endpoint
- ✅ `use-monitor.ts` — pemantauan perubahan pasar global
- ✅ Utils: `broker-activity.ts`, `technical-signals.ts`, `formatters.ts`, `telegram.ts`
- ✅ DateRangePicker component (penting untuk timeframe Broksum!)

### Gap vs Konsep Mata Dewa:
- ❌ Belum ada **kasta/tier classifier** per broker code (Retail vs Whale vs Bandar)
- ❌ Belum ada **AVG price** bandar + floating loss/profit indicator
- ❌ Belum ada **akumulasi vs distribusi detector** berbasis data Broksum
- ❌ Belum ada **anomali scanner** (3 anomali utama pasar)
- ❌ Belum ada **crossing/fake volume detector** (Top Buyer = Top Seller)
- ❌ Belum ada **intraday tape reading** (Value ÷ Frekuensi untuk deteksi bandar bunglon)
- ❌ Belum ada **multi-timeframe Broksum** (today vs 1W vs 1M vs 3M)
- ❌ Belum ada **shake-out detector** (harga turun tapi bandar masih di Top Buyer)
- ❌ Belum ada **Bandarscope Score** — skor terpadu akumulasi untuk satu saham

---

## 🗺️ ROADMAP

### FASE 1 — Fondasi Data & Kasta Broker
> **Estimasi:** 1–2 minggu | **Priority:** Kritis

Semua fitur lanjutan bergantung pada klasifikasi broker yang benar.

#### 1.1 — Broker Tier Registry (`src/data/broker-tiers.ts`)
Buat konstanta statis yang memetakan kode broker ke kasta:

```
Kasta 1 — Retail (Pasukan Semut):
  YP, PD, CC, NI, XC, XL, MX, GR, KS, AF, LS, BQ, OD, ZR, FZ

Kasta 2 — Asing & Institusi (The Whales):
  AK, BK, ZP, RX, KZ, CS, DB, ML, MS, JP, UB, GW, YU, EM, MU

Kasta 3 — Bandar Lokal & Market Maker:
  MG, DR, YJ, GI, KK, OX, HD, LG
```

Setiap entry berisi: `{ code, name, tier, description, isForeign }`.

#### 1.2 — Broker Tier Badge Component (`src/components/BrokerActivity/BrokerTierBadge.tsx`)
Badge visual untuk tiap kasta:
- 🐜 **Retail** — abu-abu/dim
- 🐳 **Whale/Institusi** — biru
- 🦈 **Bandar** — oranye/merah

Digunakan di: `BrokerSummaryCard`, `BrokerActivityList`, `MarketDetectorComponent`.

#### 1.3 — Upgrade `MarketDetectorComponent`
Tambahkan kolom **Tier** di tabel Top Buyer dan Top Seller. Highlight baris dengan warna berbeda per kasta. Ini langsung membuat halaman `/broker-activity` lebih informatif.

**File yang perlu diubah:**
- `src/components/BrokerActivity/MarketDetectorComponent.tsx`
- `src/utils/broker-activity.ts` — tambah `getTier(brokerCode)` helper

---

### FASE 2 — Akumulasi vs Distribusi Detector
> **Estimasi:** 1–2 minggu | **Priority:** Tinggi

Ini adalah inti konsep Mata Dewa.

#### 2.1 — Logika Akumulasi/Distribusi (`src/utils/accum-distrib.ts`)

```typescript
// Input: Top Buyers & Top Sellers dari Broksum
// Output: Phase, confidence, alasan

type BrokerSumSignal = {
  phase: 'ACCUMULATION' | 'DISTRIBUTION' | 'FAKE_VOLUME' | 'NEUTRAL'
  confidence: number // 0-100
  reasons: string[]
  dominantBuyers: { code: string; tier: number; netValue: number }[]
  dominantSellers: { code: string; tier: number; netValue: number }[]
}

function detectPhase(buyers: BrokerData[], sellers: BrokerData[]): BrokerSumSignal
```

**Aturan deteksi:**

| Kondisi | Sinyal |
|---|---|
| ≤3 broker Tier 2/3 dominasi Buy + banyak Retail di Sell | `ACCUMULATION` |
| 1 broker Tier 2/3 dominasi Sell + banyak Retail di Buy | `DISTRIBUTION` |
| Top Buyer = Top Seller (kode sama, nilai mirip) | `FAKE_VOLUME` |
| Campuran tidak jelas | `NEUTRAL` |

#### 2.2 — AccumulationCard Component (`src/components/Market/AccumulationCard.tsx`)

Panel baru di halaman `/market` (di bawah BrokerSummaryCard):
- Badge besar: `AKUMULASI 🟢` / `DISTRIBUSI 🔴` / `VOLUME PALSU ⚠️`
- Confidence meter (progress bar)
- Daftar alasan dalam bullet singkat
- Tombol "Lihat Broksum Detail"

#### 2.3 — Multi-Timeframe Broksum Switcher

Manfaatkan `DateRangePicker.tsx` yang sudah ada. Tambah preset cepat di `BrokerSummaryCard`:

```
[ Today ] [ 1W ] [ 2W ] [ 1M ] [ 3M ]
```

Setiap klik mengubah `fromDate`/`toDate` dan re-fetch data. Tampilkan label "Silent Accumulation Detected" jika pola akumulasi konsisten di semua timeframe.

**File yang perlu diubah:**
- `src/components/Market/BrokerSummaryCard.tsx`
- `src/hooks/use-queries.ts` — pastikan `useMarketDetector` support date params

---

### FASE 3 — AVG Price & Floating Loss Tracker
> **Estimasi:** 1 minggu | **Priority:** Tinggi

#### 3.1 — AVG Calculator Logic (`src/utils/avg-calculator.ts`)

Dari data Broksum multi-hari, hitung harga rata-rata akumulasi broker:

```typescript
function calculateBrokerAVG(
  transactions: { date: string; price: number; volume: number; side: 'BUY' | 'SELL' }[]
): number
```

Formula: `AVG = Σ(price × volume) / Σ(volume)` — hanya dari sisi Buy.

#### 3.2 — Floating Loss/Profit Indicator

Bandingkan AVG dengan harga pasar saat ini:

```
AVG Bandar: Rp 1.050
Harga Saat Ini: Rp 980
Status: 🔴 FLOATING LOSS -6.7% → Bandar WAJIB naikan harga
```

```
AVG Bandar: Rp 800
Harga Saat Ini: Rp 1.500
Status: 🟡 FLOATING PROFIT +87.5% → Waspada distribusi kapan saja
```

#### 3.3 — AVG Support Level Overlay di StockChart

Gambar garis horizontal di `StockChartComponent.tsx` pada level AVG bandar (lebih tebal dari support teknikal biasa). Label: "🎯 Tembok Beton Bandar".

**File yang perlu diubah:**
- `src/components/Market/StockChartComponent.tsx`
- `src/components/Market/` — tambah `AVGIndicatorPanel.tsx`

---

### FASE 4 — 3 Anomali Scanner
> **Estimasi:** 1–2 minggu | **Priority:** Menengah-Tinggi

#### 4.1 — Anomali Detection Engine (`src/utils/anomaly-detector.ts`)

```typescript
type AnomalyResult = {
  type: 'ANOMALY_1' | 'ANOMALY_2' | 'ANOMALY_3'
  label: string
  action: 'BUY_SIGNAL' | 'SELL_SIGNAL' | 'WAIT'
  confidence: number
  details: string
}

// Anomali 1: Harga turun/sideways + akumulasi masif → BELI
// Anomali 2: Harga naik tinggi + distribusi masif → JUAL
// Anomali 3: Volume besar + harga diam + buyer = seller → TUNGGU
```

#### 4.2 — Upgrade SignalScannerPage

Tambah tab baru **"Bandarmology Scan"** di samping tab sinyal teknikal yang sudah ada:

```
[ Teknikal ] [ Bandarmologi ] ← TAB BARU
```

Tab Bandarmologi scan berjalan mirip dengan scan teknikal yang ada:
- Loop semua saham dari list
- Fetch data Broksum per saham
- Jalankan `anomaly-detector` + `accum-distrib`
- Tampilkan hasil dengan badge anomali

**File yang perlu diubah:**
- `src/pages/SignalScannerPage.tsx`
- `src/utils/technical-signals.ts` — bisa dijadikan referensi pola

#### 4.3 — Upgrade AlertsPage untuk Alert Bandarmologi

Tambahkan tipe alert baru di `alert-store.ts`:
- `bandarAccumulation` — bandar kasta 2/3 mulai akumulasi
- `distributionWarning` — distribusi besar terdeteksi
- `anomaly1Detected`, `anomaly2Detected`, `anomaly3Detected`
- `shakeOutDetected` — harga turun di bawah AVG bandar tapi bandar masih di top buyer

---

### FASE 5 — Intraday Tape Reading & Bandar Bunglon Detector
> **Estimasi:** 1 minggu | **Priority:** Menengah

#### 5.1 — Tape Reading Calculator (`src/utils/tape-reading.ts`)

```typescript
function detectBandarBunglon(
  brokerCode: string,
  totalValue: number,
  frequency: number
): { isBandar: boolean; avgPerTrade: number; explanation: string }

// avgPerTrade = totalValue / frequency
// < 5 juta/transaksi → Retail murni
// > 50 juta/transaksi → Bandar menyamar sebagai retail
```

#### 5.2 — Tape Reading Panel di MarketDetectorComponent

Tambah kolom **Avg/Trade** di tabel Top Buyer/Seller, dengan indicator:
- 🐜 `< 5 juta` — Retail
- 🦈 `> 50 juta` — Bandar Bunglon (warna merah mencolok)

#### 5.3 — Bull Trap Detector

```typescript
function detectBullTrap(
  breakoutDetected: boolean,
  buyerTiers: BrokerTier[],
  sellerTiers: BrokerTier[]
): { isTrap: boolean; confidence: number }

// Bull Trap: breakout terjadi, tapi yang beli = retail, yang jual = bandar
// Valid Breakout: breakout terjadi, yang beli = bandar, yang jual = retail
```

---

### FASE 6 — Bandarscope Score & Dashboard Upgrade
> **Estimasi:** 1–2 minggu | **Priority:** Menengah

#### 6.1 — Bandarscope Score Engine (`src/utils/bandarscope-score.ts`)

Skor terpadu 0–100 untuk satu saham, menggabungkan:

| Komponen | Bobot |
|---|---|
| Fase Akumulasi/Distribusi | 30% |
| Floating Loss Bandar (lebih dalam = lebih bagus) | 25% |
| Konsistensi multi-timeframe (1W, 1M, 3M) | 20% |
| Volume real vs fake | 15% |
| Anomali yang match | 10% |

Output: `{ score: number, grade: 'A+' | 'A' | 'B' | 'C' | 'D', recommendation: string }`

#### 6.2 — Bandarscope Score Card Component

Card cantik di halaman `/market` yang menampilkan:
- Gauge meter atau angka besar (0–100)
- Grade (A+ sampai D)
- Rekomendasi singkat: "Aman untuk entry" / "Waspada, distribusi aktif" / dll.
- Breakdown per komponen

#### 6.3 — Upgrade DashboardPage

Tambahkan seksi baru di `/dashboard`:
- **Top 5 Saham dengan Bandarscope Score Tertinggi** — kandidat akumulasi
- **Top 5 Saham dengan Distribusi Aktif** — saham yang harus dihindari
- Refresh otomatis tiap 15 menit (sudah ada infrastruktur di `use-monitor.ts`)

**File yang perlu diubah:**
- `src/pages/DashboardPage.tsx`
- `src/stores/dashboard-store.ts` — tambah state Bandarscope

---

### FASE 7 — Polish, UX & Edukasi
> **Estimasi:** 1 minggu | **Priority:** Rendah-Menengah

#### 7.1 — Tooltip Edukasi

Tambah info tooltip di setiap indikator baru:
- Hover di badge "AKUMULASI" → penjelasan singkat konsepnya
- Hover di "AVG Bandar" → "Harga rata-rata modal bandar. Jika lebih tinggi dari harga saat ini, bandar floating loss dan cenderung akan menaikkan harga."

Gunakan Tailwind `group-hover` atau library tooltip ringan.

#### 7.2 — Broker Kasta Guide Page

Tambah route `/guide` atau modal di Sidebar:
- Tabel lengkap semua kode broker beserta kastanya
- Penjelasan cara membaca Broksum
- Contoh visual akumulasi vs distribusi

#### 7.3 — Export & Share

- Export Bandarscope analysis ke PNG (screenshot via html2canvas)
- Share ke Telegram via webhook yang sudah ada di `telegram.ts`

---

## 📋 Urutan Pengerjaan yang Disarankan

```
Fase 1 (Broker Tiers)
  ↓
Fase 2 (Akumulasi/Distribusi)
  ↓
Fase 3 (AVG & Floating Loss)
  ↓
Fase 4 (3 Anomali Scanner) ←→ Fase 5 (Tape Reading)  ← paralel OK
  ↓
Fase 6 (Bandarscope Score)
  ↓
Fase 7 (Polish & UX)
```

---

## 🗂️ File Baru yang Akan Dibuat

```
src/
├── data/
│   └── broker-tiers.ts              ← FASE 1
├── utils/
│   ├── accum-distrib.ts             ← FASE 2
│   ├── avg-calculator.ts            ← FASE 3
│   ├── anomaly-detector.ts          ← FASE 4
│   ├── tape-reading.ts              ← FASE 5
│   └── bandarscope-score.ts         ← FASE 6
├── components/
│   ├── BrokerActivity/
│   │   └── BrokerTierBadge.tsx      ← FASE 1
│   └── Market/
│       ├── AccumulationCard.tsx     ← FASE 2
│       ├── AVGIndicatorPanel.tsx    ← FASE 3
│       └── BandarScopeCard.tsx      ← FASE 6
└── pages/
    └── GuidePage.tsx                ← FASE 7
```

## 📝 File yang Dimodifikasi

```
src/components/BrokerActivity/MarketDetectorComponent.tsx  ← FASE 1, 5
src/components/Market/BrokerSummaryCard.tsx               ← FASE 2 (timeframe)
src/components/Market/StockChartComponent.tsx             ← FASE 3 (AVG line)
src/pages/SignalScannerPage.tsx                           ← FASE 4 (tab baru)
src/pages/AlertsPage.tsx                                  ← FASE 4
src/pages/DashboardPage.tsx                               ← FASE 6
src/stores/alert-store.ts                                 ← FASE 4
src/stores/dashboard-store.ts                             ← FASE 6
src/App.tsx                                               ← FASE 7 (guide route)
```

---

## ⚠️ Catatan Penting

1. **Data AVG** — hanya bisa akurat jika API menyediakan data historis transaksi per broker. Jika tidak, AVG bisa diaproksimasikan dari data multi-hari Broksum yang di-fetch bertahap.

2. **Fake Foreign** — untuk deteksi "asing palsu", perlu data tambahan: apakah broker kode asing bermain di saham lapis 3 dengan pola agresif. Ini bisa ditambahkan sebagai flag opsional di `broker-tiers.ts`.

3. **Rate Limiting** — scanner Fase 4 (loop banyak saham) wajib pakai pola yang sama dengan `SignalScannerPage.tsx` yang sudah ada: sequential fetch + backoff saat 429.

4. **Konsistensi Desain** — semua komponen baru harus mengikuti pola TailwindCSS yang sudah ada: dark theme, `accent-green`/`accent-blue`/`accent-red`, dan komponen `Card` dari `src/components/Card.tsx`.