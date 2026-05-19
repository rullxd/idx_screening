# Architecture Decisions & Technical Reference

## 🏛️ Core Architecture

### State Management Strategy: 3-Tier

```
┌─────────────────────────────────────────────────────┐
│ React Component (UI Layer)                          │
├─────────────────────────────────────────────────────┤
│ ↓ (useSelector/dispatch)                            │
├─────────────────────────────────────────────────────┤
│ Zustand Store (Feature State)                       │
│ - dashboard-store  (IHSG, chart, trending)          │
│ - screener-store   (results, filters, sorting)      │
│ - broker-ranking-store (brokers, metrics)           │
│ - ui-store         (nav, modals, sidebar)           │
├─────────────────────────────────────────────────────┤
│ ↓ (useQuery / prefetch)                             │
├─────────────────────────────────────────────────────┤
│ React Query Cache (Server State)                    │
│ - Caches API responses with TTL                     │
│ - Auto-refetch, retry, deduplication                │
│ - Invalidation on mutations                         │
├─────────────────────────────────────────────────────┤
│ ↓ (axios instance)                                  │
├─────────────────────────────────────────────────────┤
│ API Client (HTTP Layer)                             │
│ - Centralized error handling                        │
│ - XSS protection (DOMPurify)                        │
│ - Race condition protection (AbortController)       │
│ - Request/response normalization                    │
└─────────────────────────────────────────────────────┘
         ↓
   Backend API (Express)
   http://localhost:3000/api
```

### Why This Approach?

| Layer | Technology | Reason |
|-------|-----------|--------|
| UI State | Zustand | Lightweight, minimal boilerplate, easy to debug |
| Server State | React Query | Automatic caching, refetching, deduplication |
| Feature Separation | Per-store | Scale independently, debug in isolation |
| API | Centralized client | Single error handler, security policies |

---

## 🔐 Security Layers

### 1. Input Sanitization
- **Library**: DOMPurify
- **Used in**: api-client.ts `sanitizeInput()`
- **When**: All user input before sending to API
- **Example**: Search queries, filter values

### 2. URL Validation
- **Method**: `isValidURL()` in api-client.ts
- **Policy**: Only same-origin URLs allowed
- **Prevents**: Open redirect attacks
- **When**: Before rendering any user-provided links

### 3. Output Escaping
- **React Native**: Automatic in JSX
- **Chart Labels**: All formatted via utility functions
- **List Items**: Data from types (not raw HTML)

### 4. Request Signing
- **Bearer Token**: From .env `TOKEN` variable
- **Passed in**: Authorization header via axios defaults
- **Managed in**: api-client.ts

### 5. Race Condition Prevention
- **Tool**: AbortController per endpoint
- **When**: Rapid filter changes, quick navigation
- **Effect**: Cancels previous request, prevents stale data

---

## ♿ Accessibility Strategy

### Semantic HTML
- `<header>` for top bar
- `<nav>` for sidebar
- `<main>` for content
- `<article>` for card content
- `<section>` for grouped content

### ARIA Labels
```tsx
// Button with icon
<button aria-label="Toggle sidebar">
  <MenuIcon />
</button>

// Live region for status
<div aria-live="polite" aria-atomic="true">
  {loadingMessage}
</div>

// Form inputs
<label htmlFor="filterBrokerCode">Broker Code</label>
<input id="filterBrokerCode" type="text" />
```

### Keyboard Navigation
- `Tab`: Move between interactive elements
- `Enter`: Activate buttons, submit forms
- `Space`: Toggle checkboxes
- `Arrow keys`: Navigate lists

### Color Contrast
- Dark background (#07101a) on light text (#e8edf5)
- Contrast ratio: ~15:1 (exceeds WCAG AAA)
- Warning colors: Green (#00e5a0), Red (#ff4d6d) with distinct styles

---

## 📱 Responsive Design Strategy

### Breakpoints (Tailwind)
- `sm`: 640px - Small phones
- `md`: 768px - Tablets
- `lg`: 1024px - Laptops (Sidebar visible)
- `xl`: 1280px - Large screens

### Mobile-First Approach
```tsx
// Base: mobile layout
<div className="block">
  
// 768px and above: hide on mobile, show on tablet
<div className="hidden md:block">

// 1024px and above: desktop sidebar
<nav className="hidden lg:block">
```

### Responsive Table Strategy
- **Desktop**: Full table with all columns
- **Tablet**: Horizontal scroll
- **Mobile**: Card layout (each row as card)

---

## 🚀 Performance Strategy

### Code Splitting
- Each page route in separate chunk
- Loaded on-demand via dynamic import
- Initial bundle: ~184 KB gzip (acceptable)

### Memoization
- `useMemo` for expensive calculations
- `React.memo` for pure components with props
- `useCallback` for event handlers passed to children

### Virtualization
- For large tables (1000+ rows): `react-window`
- Only renders visible rows in DOM
- Huge memory & performance improvement

### Lazy Loading
- Images with `<img loading="lazy" />`
- Routes with `React.lazy()` + `<Suspense>`
- Components inside modals only render when opened

### Cache Strategy
```
React Query Cache:
├── 5 min: broker-ranking, ihsg-chart
├── 2 min: screener results
├── 1 min: market-detector
└── Auto-stale after timeout

Backend Cache (in Express):
├── 5 min: broker-ranking
├── 60s: broker-activity, market-detector
└── 30s: ihsg-chart, trending

User can always: "Refresh" button to bypass cache
```

---

## 🗂️ File Organization Philosophy

### Feature-Based (Recommended)
```
src/components/
├── BrokerRanking/          ← Feature folder
│   ├── SummaryCards.tsx
│   ├── Chart.tsx
│   └── TopBrokersList.tsx
├── Screener/               ← Feature folder
│   ├── FilterBar.tsx
│   ├── Table.tsx
│   └── SearchBox.tsx
└── Shared/                 ← Truly reusable
    ├── Card.tsx
    ├── LoadingSpinner.tsx
    └── ErrorState.tsx
```

### Rationale
- **Cohesion**: All broker ranking stuff in one folder
- **Isolation**: Easier to delete feature or refactor
- **Scaling**: N features → N folders (linear complexity)
- **Shared**: Only things used by 3+ features in Shared

---

## 🔄 Data Flow Example: Broker Ranking

```
User clicks "Broker Ranking" tab
         ↓
useUIStore.setCurrentPage('broker-ranking')
         ↓
App.tsx renders BrokerRankingPage
         ↓
BrokerRankingPage calls useBrokerRanking()
         ↓
React Query checks cache (query key: ['brokers', 'ranking'])
         ↓
Cache miss → Calls fetchBrokerRanking()
         ↓
API client makes GET /api/broker-ranking
         ↓
Backend returns 103 brokers with caching headers
         ↓
React Query caches response (5 min TTL)
         ↓
Data passed to useBrokerRankingStore.setBrokers()
         ↓
Zustand updates state:
- brokers: []
- topBuyers: [...]
- topSellers: [...]
- metrics: calculated
         ↓
Components re-render using store data
         ↓
User sees: Summary cards → Chart → Top 10 lists

If user clicks "Refresh":
- refetch() called
- Query key invalidated
- Fresh API call made
- Cache bypassed
- New data displayed
```

---

## 🧩 Component Composition Pattern

### Smart (Container) Component
```tsx
// BrokerRankingPage.tsx - Handles data & state
- Calls useBrokerRanking() hook (data fetch)
- Calls useBrokerRankingStore() hook (state)
- Handles loading/error/success states
- Passes data to dumb components
```

### Dumb (Presentational) Component
```tsx
// SummaryCards.tsx - Just renders UI
- Receives props only (no hooks)
- No side effects
- Pure render logic
- Easy to test & reuse
```

---

## 🔌 API Contract

### Request Format
```
GET /api/broker-ranking
Headers: {
  Content-Type: application/json
}
Params: (optional)
  sort: 'net_value'
  order: 'desc'
```

### Response Format
```json
{
  "success": true,
  "data": [
    {
      "code": "AK",
      "name": "Akses Investama",
      "net_value": 500000000,
      "buy_value": 750000000,
      "sell_value": 250000000,
      "total_volume": 50000,
      "group": "BROKER_GROUP_FOREIGN"
    }
  ],
  "meta": {
    "timestamp": "2024-01-15T14:30:00Z",
    "cached": true,
    "cache_key": "broker-ranking:default"
  }
}
```

### Error Response
```json
{
  "success": false,
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Invalid token",
    "details": null
  }
}
```

---

## 📊 Type System Coverage

### Generated from Backend
- `Broker` → GET /broker-ranking response
- `BrokerActivity` → GET /broker-activity response
- `ScreeningResult` → GET /screening response

### Strict TypeScript Settings
- `strict: true` → All strict checks enabled
- `noImplicitAny: true` → No implicit `any` types
- `noUnusedLocals: true` → Unused variables error
- `noFallthroughCases: true` → Switch case coverage

### Result
- Zero `any` types in codebase
- All errors caught at compile time
- IDE autocomplete works perfectly
- Refactoring is safe

---

## 🎯 Testing Strategy (For Later)

### Unit Tests (Vitest)
- Utility functions (formatters, validators)
- Zustand stores
- React hooks

### Integration Tests (Testing Library)
- Component rendering
- User interactions
- Store state updates

### E2E Tests (Cypress)
- Full user journeys
- API integration
- Error scenarios

```bash
npm run test          # Run all tests
npm run test:watch   # Watch mode
npm run test:coverage # Coverage report
```

---

## 🚀 Deployment Checklist

Before production:
- [ ] `npm run build` succeeds
- [ ] `npm run type-check` passes
- [ ] `.env` has production TOKEN
- [ ] Backend running (set NODE_ENV=production)
- [ ] Test all pages locally
- [ ] Check mobile responsiveness
- [ ] Verify keyboard navigation
- [ ] Security audit: XSS, CSRF, auth
- [ ] Performance audit: Lighthouse
- [ ] Error tracking setup (Sentry)
- [ ] Analytics setup

```bash
# Production build
npm run build
npm run preview  # Test production build locally
```

Production files in `dist/`:
- `index.html` (30 KB)
- `index-XXX.css` (14 KB gzip)
- `index-XXX.js` (184 KB gzip)

---

## 📚 References

- **React**: https://react.dev
- **Vite**: https://vitejs.dev
- **Tailwind**: https://tailwindcss.com
- **Zustand**: https://github.com/pmndrs/zustand
- **React Query**: https://tanstack.com/query
- **TypeScript**: https://www.typescriptlang.org
- **Recharts**: https://recharts.org
