# Getting Started - Development

## 🚀 Running the Application

### Terminal 1: Start Backend Server
```bash
cd "c:\BOTT RULL\idx_screening"
npm run server
```
Backend will run on **http://localhost:3000**
- Proxy endpoints at `/api/*`
- In-memory caching with TTL per endpoint
- X-Cache headers for debugging (HIT/MISS)

### Terminal 2: Start Frontend Dev Server
```bash
cd "c:\BOTT RULL\idx_screening"
npm run dev
```
Frontend will run on **http://localhost:5173**
- Vite dev server with HMR (hot module replacement)
- Auto-proxy /api requests to http://localhost:3000
- TypeScript compilation on save

### Open Browser
Navigate to **http://localhost:5173**
- You should see BandarScope with layout and navigation
- Click "Broker Ranking" in sidebar to test first feature

---

## 🎯 Features Implemented

### ✅ Broker Ranking Page (COMPLETE)
- Real-time broker ranking data from backend
- 4 summary cards:
  - Top Buyer (by buy_value)
  - Top Seller (by sell_value)
  - Foreign Net Flow (BUYING/SELLING)
  - Local Net Flow (BUYING/SELLING)
- Recharts horizontal bar chart (Top 10 by net value)
  - 2 datasets: Net Value + Volume (normalized)
  - Interactive tooltip with formatted numbers
  - Legend
- Top 10 Buyers list with rank, code, name, value, volume
- Top 10 Sellers list with rank, code, name, value, volume
- Auto-refresh button and 5-minute cache
- Full error handling and loading states
- Responsive grid layout (1 col mobile → 4 col desktop)

### Component Architecture
```
BrokerRankingPage.tsx (page)
├── RankingSummaryCards.tsx (4 cards)
├── RankingChart.tsx (Recharts bar chart)
└── TopBrokersList.tsx (2 lists × 10 brokers each)

Using:
- useBrokerRanking() hook (React Query)
- useBrokerRankingStore() (Zustand state)
- formatCurrency(), formatVolume() helpers
```

---

## 📋 Development Workflow

### Making Changes
1. Edit files in `src/` directory
2. TypeScript errors appear in VS Code real-time
3. Vite hot reloads automatically (usually within 1-2s)
4. Backend API calls go through proxy: http://localhost:3000/api

### Type Safety
```bash
npm run type-check  # Run TypeScript compiler
npm run lint        # Type check alias
```

### Production Build
```bash
npm run build       # Creates dist/ folder
npm run preview     # Preview production build locally
```

---

## 🔧 Backend API Endpoints

All available at `http://localhost:3000/api`:

| Endpoint | Method | Cache TTL | Response Type |
|----------|--------|-----------|---------------|
| `/broker-ranking` | GET | 5 min | `Broker[]` |
| `/broker-activity` | GET | 60s | `BrokerActivity` |
| `/screening` | GET | varies | `ScreeningResponse` |
| `/ihsg-chart` | GET | 30s | `IHSGChartResponse` |
| `/trending` | GET | 30s | `TrendingResponse` |
| `/market-detector` | GET | 60s | `MarketDetectorResponse` |

All responses include `X-Cache: HIT/MISS` header for debugging.

---

## 🔍 Debugging

### Check Backend Cache
```bash
# Terminal with backend running
# Look for logs like: ♻️ Cache hit: broker-ranking
# Or: 📡 API call: /order-trade/broker/top
```

### React DevTools
Install: https://chrome.google.com/webstore/detail/react-developer-tools/fmkadmapgofadopljbjfkapdkoienihi

### Redux DevTools (for Zustand state)
Install: https://chrome.google.com/webstore/detail/redux-devtools/lmjabbbonnnmjjmnnnmkhjjmnnkkponp
- Access stores at: `window.__ZUSTAND_DEBUG__` (when in dev mode)

### Network Requests
1. Open DevTools → Network tab
2. Filter by "api" or "xhr"
3. Check response headers for `X-Cache: HIT/MISS`
4. Verify API response shapes match types in `src/types/`

---

## 📦 Project Structure Reference

```
src/
├── types/index.ts              # All TypeScript definitions
├── services/
│   ├── api-client.ts           # Axios instance + error handling
│   └── api.ts                  # Typed endpoint functions
├── stores/                     # Zustand stores
│   ├── dashboard-store.ts
│   ├── screener-store.ts
│   ├── broker-ranking-store.ts (used by ranking page)
│   └── ui-store.ts
├── hooks/
│   └── use-queries.ts          # React Query hooks
├── components/
│   ├── Layout/                 # Header + Sidebar
│   ├── Card.tsx
│   ├── LoadingSpinner.tsx
│   ├── ErrorState.tsx
│   ├── EmptyState.tsx
│   └── BrokerRanking/          # Broker ranking components
│       ├── SummaryCards.tsx
│       ├── Chart.tsx
│       └── TopBrokersList.tsx
├── pages/                      # Feature pages
│   ├── BrokerRankingPage.tsx   (DONE ✅)
│   ├── DashboardPage.tsx       (skeleton)
│   ├── ScreenerPage.tsx        (skeleton)
│   └── ...
├── styles/
│   └── index.css               # Tailwind global + components
├── App.tsx                     # Router
└── main.tsx                    # React entry point
```

---

## 🐛 Troubleshooting

### Issue: "Cannot find module '@/types'"
- Path alias not working
- Solution: Restart VS Code or dev server
- Make sure `vite.config.ts` has alias config

### Issue: "React Query not fetching data"
- Backend not running or endpoint 404
- Solution: Check backend logs, verify endpoint exists
- Check Network tab in DevTools → API call response

### Issue: "Tailwind styles not applying"
- Styles not being compiled
- Solution: Restart dev server, clear browser cache
- Make sure `tailwind.config.js` has content paths

### Issue: "TypeScript error but browser works"
- Type definitions outdated
- Solution: `npm run type-check` then fix errors
- Or temporarily use `as any` (not recommended)

---

## 📚 Next Steps

After testing Broker Ranking:
1. **Dashboard Page** - IHSG hero + trending stocks + chart
2. **Screener Page** - Largest: filters + big table + sorting
3. **Broker Activity Page** - Activity list + market detector
4. **Remaining Pages** - Alerts, Heatmap, Stock Detail

See `REACT_MIGRATION.md` for full roadmap.
