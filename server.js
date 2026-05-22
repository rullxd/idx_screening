import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = 3000;

// Get __dirname in ES module
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const MAX_CACHE_SIZE = 200; // LRU cache limit
const responseCache = new Map();
const streamManagers = new Map();

// Simple rate limiter (per IP). Raised to support scanner + dashboard bursts.
const rateLimitMap = new Map();
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX = 180;

function rateLimiter(req, res, next) {
    const ip = req.ip || req.connection.remoteAddress;
    const now = Date.now();
    const entry = rateLimitMap.get(ip);

    if (!entry || now - entry.start > RATE_LIMIT_WINDOW) {
        rateLimitMap.set(ip, { start: now, count: 1 });
        return next();
    }

    entry.count++;
    if (entry.count > RATE_LIMIT_MAX) {
        const retryAfterSeconds = Math.ceil((RATE_LIMIT_WINDOW - (now - entry.start)) / 1000);
        res.set('Retry-After', String(Math.max(retryAfterSeconds, 1)));
        return res.status(429).json({ error: 'Too many requests. Please try again later.' });
    }

    return next();
}

// Clean up expired rate limit entries every 5 minutes
setInterval(() => {
    const now = Date.now();
    for (const [ip, entry] of rateLimitMap) {
        if (now - entry.start > RATE_LIMIT_WINDOW) {
            rateLimitMap.delete(ip);
        }
    }
}, 5 * 60 * 1000);
const CACHE_TTL = {
    brokerActivity: 60 * 1000,
    marketDetector: 60 * 1000,
    ihsg: 30 * 1000,
    orderbook: 5 * 1000,
    trending: 30 * 1000,
    stockChart: 45 * 1000,
    chartbit: 45 * 1000,
    ihsgChart: 5 * 1000,  // Reduced from 30s to 5s for faster timeframe switching
    brokerRanking: 5 * 60 * 1000
};

function sendSSE(res, event, data) {
    res.write(`event: ${event}\n`);
    res.write(`data: ${JSON.stringify(data)}\n\n`);
}

function getIHSGChartTimeframe(timeframe, period) {
    const timeframeMap = {
        '1d': 'today',
        'intraday': 'today',
        '1w': 'weekly',
        'weekly': 'weekly',
        '1m': '1m',
        'monthly': '1m',
        '3m': '3m',
        '3month': '3m',
        'ytd': 'ytd',
        '1y': '1y',
        'yearly': '1y',
        '3y': '3y',
        '3year': '3y',
        '5y': '5y',
        '5year': '5y',
    };

    return timeframeMap[timeframe || period || '1d'] || 'today';
}

function formatDateYYYYMMDD(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function getChartbitDateRange(timeframe = 'today') {
    const toDate = new Date();
    const fromDate = new Date(toDate);
    const key = String(timeframe || 'today').toLowerCase();

    if (key === 'today' || key === '1d' || key === 'intraday') {
        fromDate.setDate(toDate.getDate() - 1);
    } else if (key === 'weekly' || key === '1w') {
        fromDate.setDate(toDate.getDate() - 7);
    } else if (key === '1m' || key === 'monthly') {
        fromDate.setMonth(toDate.getMonth() - 1);
    } else if (key === '3m' || key === '3month') {
        fromDate.setMonth(toDate.getMonth() - 3);
    } else if (key === 'ytd') {
        fromDate.setMonth(0, 1);
    } else if (key === '1y' || key === 'yearly') {
        fromDate.setFullYear(toDate.getFullYear() - 1);
    } else if (key === '3y' || key === '3year') {
        fromDate.setFullYear(toDate.getFullYear() - 3);
    } else if (key === '5y' || key === '5year') {
        fromDate.setFullYear(toDate.getFullYear() - 5);
    } else {
        fromDate.setMonth(toDate.getMonth() - 1);
    }

    return {
        from: formatDateYYYYMMDD(fromDate),
        to: formatDateYYYYMMDD(toDate),
    };
}

function getOrCreateStreamManager(key, intervalMs, fetcher) {
    if (streamManagers.has(key)) {
        return streamManagers.get(key);
    }

    const manager = {
        clients: new Set(),
        lastPayload: '',
        timer: null,
    };

    const tick = async () => {
        try {
            const payload = await fetcher();
            const serialized = JSON.stringify(payload);
            if (serialized !== manager.lastPayload) {
                manager.lastPayload = serialized;
                for (const client of manager.clients) {
                    sendSSE(client, 'update', payload);
                }
            }
        } catch (error) {
            console.error(`❌ Stream ${key} error:`, error.message);
            for (const client of manager.clients) {
                sendSSE(client, 'error', { message: error.message });
            }
        }
    };

    manager.timer = setInterval(tick, intervalMs);
    manager.tick = tick;
    streamManagers.set(key, manager);
    return manager;
}

function attachClientToStream(res, key, intervalMs, fetcher, initialEventName = 'snapshot') {
    const manager = getOrCreateStreamManager(key, intervalMs, fetcher);
    manager.clients.add(res);

    res.on('close', () => {
        manager.clients.delete(res);
        if (manager.clients.size === 0) {
            clearInterval(manager.timer);
            streamManagers.delete(key);
        }
    });

    return manager.tick()
        .then(async () => {
            if (manager.lastPayload) {
                sendSSE(res, initialEventName, JSON.parse(manager.lastPayload));
            }
        })
        .catch(() => { });
}

async function fetchJsonWithCache({ cacheKey, ttlMs, url, headers, logLabel }) {
    const now = Date.now();
    const cached = responseCache.get(cacheKey);
    if (cached && cached.expiresAt > now) {
        console.log(`♻️ Cache hit: ${logLabel}`);
        return { data: cached.data, cacheHit: true };
    }

    if (cached) responseCache.delete(cacheKey);

    console.log(`📡 Cache miss: ${logLabel}`);
    const response = await fetch(url, { method: 'GET', headers });
    if (!response.ok) {
        throw new Error(`API returned HTTP ${response.status}`);
    }

    const data = await response.json();

    // LRU eviction: remove oldest entries when cache exceeds max size
    if (responseCache.size >= MAX_CACHE_SIZE) {
        const oldestKey = responseCache.keys().next().value;
        responseCache.delete(oldestKey);
    }

    responseCache.set(cacheKey, {
        data,
        expiresAt: now + ttlMs
    });

    return { data, cacheHit: false };
}

// Middleware
app.use(cors());
app.use(express.json());
app.use('/api', rateLimiter); // Apply rate limiting to API routes only
app.use(express.static(path.join(__dirname)));

// Load TOKEN from .env
const TOKEN = process.env.TOKEN;

if (!TOKEN) {
    console.error('❌ ERROR: TOKEN not found in .env file');
    process.exit(1);
}

console.log('✅ SERVER STARTED - TOKEN loaded from .env');

// API Proxy Endpoint — Broker Activity
app.get('/api/broker-activity', async (req, res) => {
    try {
        const {
            broker_code = 'AK',
            transaction_type = 'TRANSACTION_TYPE_NET',
            investor_type = 'INVESTOR_TYPE_ALL',
            market_board = 'MARKET_TYPE_REGULER',
            limit = 50,
            page = 1,
            from,
            to
        } = req.query;

        // Build query parameters
        const queryParams = new URLSearchParams({
            broker_code,
            transaction_type,
            investor_type,
            market_board,
            limit,
            page
        });

        // Add optional date parameters
        if (from) queryParams.append('from', from);
        if (to) queryParams.append('to', to);

        const apiUrl = `https://exodus.stockbit.com/order-trade/broker/activity?${queryParams}`;
        const { data, cacheHit } = await fetchJsonWithCache({
            cacheKey: apiUrl,
            ttlMs: CACHE_TTL.brokerActivity,
            url: apiUrl,
            logLabel: 'broker activity',
            headers: {
                'Authorization': `Bearer ${TOKEN}`,
                'Accept': 'application/json, text/plain, */*',
                'Origin': 'https://stockbit.com',
                'Referer': 'https://stockbit.com/',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        });

        res.set('X-Cache', cacheHit ? 'HIT' : 'MISS');
        console.log(`✅ Data fetched: ${data?.data?.broker_activity_transaction?.brokers_buy?.length || 0} items`);

        res.json(data);
    } catch (error) {
        console.error('❌ Proxy Error:', error.message);
        res.status(500).json({
            error: error.message,
            message: 'Failed to fetch data from Stockbit API'
        });
    }
});

// API Proxy Endpoint — Market Detector per Saham
app.get('/api/market-detector/:stockCode', async (req, res) => {
    try {
        const { stockCode } = req.params;
        const {
            transaction_type = 'TRANSACTION_TYPE_NET',
            market_board = 'MARKET_BOARD_REGULER',
            investor_type = 'INVESTOR_TYPE_ALL',
            limit = 25,
            from,
            to
        } = req.query;

        const queryParams = new URLSearchParams({
            transaction_type,
            market_board,
            investor_type,
            limit
        });

        if (from) queryParams.append('from', from);
        if (to) queryParams.append('to', to);

        const apiUrl = `https://exodus.stockbit.com/marketdetectors/${stockCode.toUpperCase()}?${queryParams}`;
        const { data, cacheHit } = await fetchJsonWithCache({
            cacheKey: apiUrl,
            ttlMs: CACHE_TTL.marketDetector,
            url: apiUrl,
            logLabel: `market detector ${stockCode.toUpperCase()}`,
            headers: {
                'Authorization': `Bearer ${TOKEN}`,
                'Accept': 'application/json, text/plain, */*',
                'Origin': 'https://stockbit.com',
                'Referer': 'https://stockbit.com/',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        });

        res.set('X-Cache', cacheHit ? 'HIT' : 'MISS');
        console.log(`✅ MarketDetector fetched for ${stockCode}: ${JSON.stringify(data).substring(0, 80)}...`);
        res.json(data);
    } catch (error) {
        console.error('❌ MarketDetector Proxy Error:', error.message);
        res.status(500).json({
            error: error.message,
            message: 'Failed to fetch market detector data'
        });
    }
});

// API Proxy Endpoint — Stock Orderbook (per symbol)
app.get('/api/orderbook', async (req, res) => {
    try {
        const symbol = String(req.query.symbol || 'BBRI').toUpperCase();
        const url = `https://exodus.stockbit.com/company-price-feed/v2/orderbook/companies/${encodeURIComponent(symbol)}`;
        const { data, cacheHit } = await fetchJsonWithCache({
            cacheKey: url,
            ttlMs: CACHE_TTL.orderbook,
            url,
            logLabel: `orderbook ${symbol}`,
            headers: {
                'Authorization': `Bearer ${TOKEN}`,
                'User-Agent': 'Mozilla/5.0',
                'Accept': 'application/json'
            }
        });
        res.set('X-Cache', cacheHit ? 'HIT' : 'MISS');
        res.json(data);
    } catch (error) {
        console.error('❌ Orderbook Proxy Error:', error.message);
        res.status(500).json({ error: error.message });
    }
});

// API Proxy Endpoint — IHSG Orderbook
app.get('/api/ihsg', async (req, res) => {
    try {
        const url = 'https://exodus.stockbit.com/company-price-feed/v2/orderbook/companies/IHSG';
        const { data, cacheHit } = await fetchJsonWithCache({
            cacheKey: url,
            ttlMs: CACHE_TTL.ihsg,
            url,
            logLabel: 'IHSG orderbook',
            headers: {
                'Authorization': `Bearer ${TOKEN}`,
                'User-Agent': 'Mozilla/5.0',
                'Accept': 'application/json'
            }
        });
        res.set('X-Cache', cacheHit ? 'HIT' : 'MISS');
        res.json(data);
    } catch (error) {
        console.error('❌ IHSG Proxy Error:', error.message);
        res.status(500).json({ error: error.message });
    }
});

// API Proxy Endpoint — Trending Stocks
app.get('/api/trending', async (req, res) => {
    try {
        const url = 'https://exodus.stockbit.com/emitten/trending';
        const { data, cacheHit } = await fetchJsonWithCache({
            cacheKey: url,
            ttlMs: CACHE_TTL.trending,
            url,
            logLabel: 'trending stocks',
            headers: {
                'Authorization': `Bearer ${TOKEN}`,
                'User-Agent': 'Mozilla/5.0',
                'Accept': 'application/json'
            }
        });
        res.set('X-Cache', cacheHit ? 'HIT' : 'MISS');
        res.json(data);
    } catch (error) {
        console.error('❌ Trending Proxy Error:', error.message);
        res.status(500).json({ error: error.message });
    }
});

// API Proxy Endpoint — Stock Chart (per symbol & timeframe)
app.get('/api/stock-chart', async (req, res) => {
    try {
        const { symbol = 'IHSG', timeframe = 'today' } = req.query;
        const url = `https://exodus.stockbit.com/charts/${encodeURIComponent(symbol.toUpperCase())}/daily?timeframe=${encodeURIComponent(timeframe)}`;
        const { data, cacheHit } = await fetchJsonWithCache({
            cacheKey: url,
            ttlMs: CACHE_TTL.stockChart,
            url,
            logLabel: `stock chart ${symbol.toUpperCase()} ${timeframe}`,
            headers: {
                'Authorization': `Bearer ${TOKEN}`,
                'User-Agent': 'Mozilla/5.0',
                'Accept': 'application/json'
            }
        });
        res.set('X-Cache', cacheHit ? 'HIT' : 'MISS');
        res.json(data);
    } catch (error) {
        console.error('❌ Stock Chart Proxy Error:', error.message);
        res.status(500).json({ error: error.message });
    }
});

// API Proxy Endpoint — Stockbit Chartbit OHLC candles
app.get('/api/stock-chartbit', async (req, res) => {
    try {
        const { symbol = 'BBCA', timeframe = 'today', from, to } = req.query;
        const stockCode = symbol.toUpperCase();
        const defaultRange = getChartbitDateRange(timeframe);
        const range = {
            from: from || defaultRange.from,
            to: to || defaultRange.to,
        };
        const chartbitUrl = `https://exodus.stockbit.com/chartbit/${encodeURIComponent(stockCode)}/price/daily?from=${encodeURIComponent(range.from)}&to=${encodeURIComponent(range.to)}`;
        const fallbackUrl = `https://exodus.stockbit.com/charts/${encodeURIComponent(stockCode)}/daily?timeframe=${encodeURIComponent(timeframe)}`;
        let url = chartbitUrl;

        let result;
        try {
            result = await fetchJsonWithCache({
                cacheKey: chartbitUrl,
                ttlMs: CACHE_TTL.chartbit,
                url: chartbitUrl,
                logLabel: `stock chartbit ${stockCode} ${timeframe}`,
                headers: {
                    'Authorization': `Bearer ${TOKEN}`,
                    'User-Agent': 'Mozilla/5.0',
                    'Accept': 'application/json'
                }
            });
        } catch (chartbitError) {
            console.warn(`⚠️ Chartbit failed for ${stockCode}; falling back to charts: ${chartbitError.message}`);
            url = fallbackUrl;
            result = await fetchJsonWithCache({
                cacheKey: fallbackUrl,
                ttlMs: CACHE_TTL.stockChart,
                url: fallbackUrl,
                logLabel: `stock chartbit fallback ${stockCode} ${timeframe}`,
                headers: {
                    'Authorization': `Bearer ${TOKEN}`,
                    'User-Agent': 'Mozilla/5.0',
                    'Accept': 'application/json'
                }
            });
        }

        const { data, cacheHit } = result;
        res.set('X-Cache', cacheHit ? 'HIT' : 'MISS');
        res.set('X-Chart-Source', url === chartbitUrl ? 'chartbit' : 'charts-fallback');
        res.json(data);
    } catch (error) {
        console.error('❌ Stock Chartbit Proxy Error:', error.message);
        res.status(500).json({ error: error.message });
    }
});

// API Proxy Endpoint — Stockbit Chartbit OHLC candles
app.get('/api/stock-chartbit-raw', async (req, res) => {
    try {
        const { symbol = 'BBCA', timeframe = 'today', from, to } = req.query;
        const defaultRange = getChartbitDateRange(timeframe);
        const range = {
            from: from || defaultRange.from,
            to: to || defaultRange.to,
        };
        const url = `https://exodus.stockbit.com/chartbit/${encodeURIComponent(symbol.toUpperCase())}/price/daily?from=${encodeURIComponent(range.from)}&to=${encodeURIComponent(range.to)}`;
        const { data, cacheHit } = await fetchJsonWithCache({
            cacheKey: url,
            ttlMs: CACHE_TTL.chartbit,
            url,
            logLabel: `stock chartbit ${symbol.toUpperCase()} ${timeframe}`,
            headers: {
                'Authorization': `Bearer ${TOKEN}`,
                'User-Agent': 'Mozilla/5.0',
                'Accept': 'application/json'
            }
        });
        res.set('X-Cache', cacheHit ? 'HIT' : 'MISS');
        res.json(data);
    } catch (error) {
        console.error('❌ Stock Chartbit Proxy Error:', error.message);
        res.status(500).json({ error: error.message });
    }
});

// API Proxy Endpoint — IHSG Intraday Chart
app.get('/api/ihsg-chart', async (req, res) => {
    try {
        const { period, timeframe } = req.query;
        const selectedTimeframe = getIHSGChartTimeframe(timeframe, period);

        const url = `https://exodus.stockbit.com/charts/IHSG/daily?timeframe=${selectedTimeframe}`;
        console.log(`🔗 IHSG Chart URL: ${url}`);

        const { data, cacheHit } = await fetchJsonWithCache({
            cacheKey: url,
            ttlMs: CACHE_TTL.ihsgChart,
            url,
            logLabel: `IHSG chart (timeframe=${selectedTimeframe})`,
            headers: {
                'Authorization': `Bearer ${TOKEN}`,
                'User-Agent': 'Mozilla/5.0',
                'Accept': 'application/json'
            }
        });
        res.set('X-Cache', cacheHit ? 'HIT' : 'MISS');
        res.json(data);
    } catch (error) {
        console.error('❌ IHSG Chart Proxy Error:', error.message);
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/stream/ihsg-chart', async (req, res) => {
    const { period, timeframe } = req.query;
    const selectedTimeframe = getIHSGChartTimeframe(timeframe, period);
    const url = `https://exodus.stockbit.com/charts/IHSG/daily?timeframe=${selectedTimeframe}`;
    const cacheKey = `stream:ihsg-chart:${selectedTimeframe}`;

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders?.();

    res.write(': connected\n\n');

    const managerKey = `ihsg-chart:${selectedTimeframe}`;
    const fetcher = async () => {
        const { data } = await fetchJsonWithCache({
            cacheKey,
            ttlMs: CACHE_TTL.ihsgChart,
            url,
            logLabel: `stream ihsg chart (timeframe=${selectedTimeframe})`,
            headers: {
                'Authorization': `Bearer ${TOKEN}`,
                'User-Agent': 'Mozilla/5.0',
                'Accept': 'application/json'
            }
        });

        return data;
    };

    const manager = getOrCreateStreamManager(managerKey, 10000, fetcher);
    manager.clients.add(res);

    const sendInitial = async () => {
        try {
            const payload = await fetcher();
            manager.lastPayload = JSON.stringify(payload);
            sendSSE(res, 'snapshot', payload);
        } catch (error) {
            sendSSE(res, 'error', { message: error.message });
        }
    };

    const heartbeat = setInterval(() => {
        res.write(': ping\n\n');
    }, 30000);

    sendInitial();

    req.on('close', () => {
        clearInterval(heartbeat);
        manager.clients.delete(res);
        if (manager.clients.size === 0) {
            clearInterval(manager.timer);
            streamManagers.delete(managerKey);
        }
    });
});

// API Proxy Endpoint — Broker Ranking
app.get('/api/broker-ranking', async (req, res) => {
    try {
        const {
            sort = 'TB_SORT_BY_TOTAL_VALUE',
            order = 'ORDER_BY_DESC',
            market_type = 'MARKET_TYPE_ALL',
            eod_only = true,
            from,
            to
        } = req.query;

        const queryParams = new URLSearchParams({
            sort,
            order,
            market_type,
            eod_only
        });

        if (from) queryParams.append('from', from);
        if (to) queryParams.append('to', to);

        const apiUrl = `https://exodus.stockbit.com/order-trade/broker/top?${queryParams}`;
        const { data, cacheHit } = await fetchJsonWithCache({
            cacheKey: apiUrl,
            ttlMs: CACHE_TTL.brokerRanking,
            url: apiUrl,
            logLabel: 'broker ranking',
            headers: {
                'Authorization': `Bearer ${TOKEN}`,
                'Accept': 'application/json, text/plain, */*',
                'Origin': 'https://stockbit.com',
                'Referer': 'https://stockbit.com/',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        });

        res.set('X-Cache', cacheHit ? 'HIT' : 'MISS');
        console.log(`✅ Broker ranking fetched: ${data?.data?.list?.length || 0} brokers`);
        res.json(data);
    } catch (error) {
        console.error('❌ Broker Ranking Proxy Error:', error.message);
        res.status(500).json({
            error: error.message,
            message: 'Failed to fetch broker ranking data'
        });
    }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', message: 'Backend is running' });
});

// Keep unknown API routes JSON-only; otherwise Express static fallback returns index.html.
app.use('/api', (req, res) => {
    res.status(404).json({ error: `API route not found: ${req.originalUrl}` });
});

// SPA fallback: serve index.html for all non-API routes
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
    console.log(`🚀 Server running at http://localhost:${PORT}`);
    console.log(`📊 Open http://localhost:${PORT} in your browser`);
});
