const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname)));

// Load TOKEN from .env
const TOKEN = process.env.TOKEN;

if (!TOKEN) {
    console.error('❌ ERROR: TOKEN not found in .env file');
    process.exit(1);
}

console.log('✅ SERVER STARTED - TOKEN loaded from .env');

// API Proxy Endpoint
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

        console.log(`📡 Proxying request: ${apiUrl.substring(0, 100)}...`);

        const response = await fetch(apiUrl, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${TOKEN}`,
                'Accept': 'application/json, text/plain, */*',
                'Origin': 'https://stockbit.com',
                'Referer': 'https://stockbit.com/',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        });

        if (!response.ok) {
            throw new Error(`API returned HTTP ${response.status}`);
        }

        const data = await response.json();
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

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', message: 'Backend is running' });
});

// Serve index.html for root
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
    console.log(`🚀 Server running at http://localhost:${PORT}`);
    console.log(`📊 Open http://localhost:${PORT} in your browser`);
});
