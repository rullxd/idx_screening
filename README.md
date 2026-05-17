# BandarScope - IDX Bandarmology Screener

## ⚙️ Setup & Installation

### 1. Install Node.js Dependencies
```bash
npm install
```

### 2. Configure TOKEN
Edit `.env` file dan masukkan TOKEN Anda:
```
TOKEN=your_stockbit_api_token_here
```

### 3. Start Backend Server
```bash
npm start
```

Server akan berjalan di **http://localhost:3000**

### 4. Buka di Browser
Akses aplikasi di: **http://localhost:3000**

---

## 🚀 Cara Menggunakan

1. **Pilih Broker Code** (contoh: AK, YP, MG, BB, etc) - **Otomatis load data**
2. **Pilih Tanggal** (From Date - To Date) - **Otomatis load data**
3. Data akan dimuat langsung saat Anda mengubah nilai (tidak perlu klik tombol)
4. Tombol **⟳ Load Data** bisa digunakan untuk manual refresh jika diperlukan

---

## 📊 Fitur & Data Processing

### Real-time Data dari Stockbit API
- ✅ **Buy & Sell Analysis** - Proses data dari brokers_buy dan brokers_sell
- ✅ **Price Spread Detection** - Analisis perbedaan harga buy vs sell
- ✅ **Broker Activity** - Lihat detail top brokers untuk buy & sell
- ✅ **Foreign Investor Tracking** - Hitung jumlah foreign investors (buyers)
- ✅ **Accumulation/Distribution Scoring** - Scoring otomatis berdasarkan net value:
  - **Strong Acc** (🔥) - Net Value > 20M (Score: 9)
  - **Acc** - Net Value 10M-20M (Score: 8)
  - **Weak Acc** - Net Value 3M-10M (Score: 6)
  - **Weak Dist** - Net Value -3M to -10M (Score: 4)
  - **Dist** - Net Value -10M to -20M (Score: 2)
  - **Strong Dist** - Net Value < -20M (Score: 1)
  - **Neutral** - Net Value -3M to 3M (Score: 5)

### UI Improvements
- ✅ **Company Logo** - Tampil logo perusahaan dari API
- ✅ **Corporate Action Indicator** - Badge 📋 jika ada corporate action
- ✅ **Broker Count** - Jumlah buy vs sell brokers
- ✅ **Foreign Investor Count** - Tracking investor asing (colored badge)
- ✅ **Price Spread** - Lihat perbedaan buy vs sell price
- ✅ **Enhanced Detail Panel** - Informasi broker detail (top 3 buy & sell)
- ✅ **Better Visual Hierarchy** - Color coding & styling improvements
- ✅ **Auto-refresh** - Data reload otomatis saat input berubah

---

## 📋 Kolom Tabel

| Kolom | Deskripsi |
|-------|-----------|
| KODE | Kode saham dengan logo & corporate action indicator |
| CLOSE | Harga rata-rata buy brokers |
| SPREAD | Perbedaan buy-sell price (positive = buy dominan) |
| NET VALUE | Nilai net dari broker activity (buy - sell) |
| NET LOT | Jumlah lot net dari broker activity |
| BUY FREQ | Frekuensi transaksi buy |
| 🌍 FOREIGN | Jumlah foreign brokers yang membeli |
| BROKERS | Jumlah buy brokers / sell brokers |
| ACC/DIST | Status akumulasi/distribusi dengan strength indicator |
| SCORE | Bandar score (0-10) berdasarkan activity |

---

## 🔒 Keamanan

TOKEN disimpan di `.env` dan hanya diakses oleh backend server. Frontend tidak pernah mengirim TOKEN langsung ke API, sehingga lebih aman.

---

## 📦 Struktur File

```
├── server.js          (Backend Express server + API Proxy)
├── app.js            (Frontend logic + data processing)
├── index.html        (HTML UI)
├── styles.css        (CSS styling)
├── .env              (TOKEN configuration)
├── package.json      (Dependencies)
└── README.md         (This file)
```

---

## 🐛 Troubleshooting

### Error: "Backend Error: Failed to fetch"
- ✅ Pastikan server berjalan (`npm start`)
- ✅ Cek TOKEN di `.env` sudah benar
- ✅ Cek koneksi internet

### Error: "Cannot find module 'express'"
- ✅ Jalankan `npm install`

### PORT 3000 sudah digunakan
- Edit `server.js` dan ubah `PORT = 3000` ke port lain (misal 3001)

### Data tidak muncul (kosong)
- ✅ Pastikan tanggal yang dipilih memiliki data di Stockbit
- ✅ Coba gunakan tanggal historis (tidak real-time)

---

## 📝 API Endpoints (Backend)

### GET `/api/broker-activity`
Parameters:
- `broker_code` - Kode broker (default: AK)
- `from` - Tanggal mulai (YYYY-MM-DD)
- `to` - Tanggal akhir (YYYY-MM-DD)
- `limit` - Jumlah data (default: 50)
- `page` - Halaman (default: 1)

Contoh:
```
http://localhost:3000/api/broker-activity?broker_code=AK&from=2026-05-13&to=2026-05-13&limit=50
```

### GET `/api/health`
Health check endpoint

---

## 💡 Tips

- Gunakan date range yang tidak terlalu besar untuk performa lebih baik
- Filter berdasarkan ACC status untuk fokus ke accumulation
- Lihat detail panel untuk melihat top brokers activity
- Strong Acc (🔥) adalah signal paling kuat untuk buying pressure
- Foreign investor count menunjukkan kepercayaan investor asing

---

## 📈 Data Meaning

- **Net Value** - Selisih nilai buy-sell brokers. Positif = accumulation, Negatif = distribution
- **Buy Freq** - Semakin tinggi = aktivitas broker semakin intens
- **Foreign Buyers** - Investor asing yang membeli. Indikator kepercayaan foreign institutional
- **Price Spread** - Perbedaan buy-sell price. Positif = buy dominan, negatif = sell dominan
- **Broker Count** - Jumlah unique brokers. Lebih banyak brokers = trend lebih kuat
- **Bandar Score** - Kombinasi dari semua faktor di atas (0-10 scale)

