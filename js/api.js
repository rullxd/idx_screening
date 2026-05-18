// =============================================
// API — Fetch functions for backend proxy
// =============================================

async function fetchBrokerActivity(params = {}) {
    const p = { ...DEFAULT_PARAMS, ...params };
    const queryObj = {
        broker_code: p.brokerCode,
        transaction_type: p.transactionType,
        investor_type: p.investorType,
        market_board: p.marketBoard,
        limit: p.limit,
        page: p.page
    };

    if (p.fromDate) queryObj.from = p.fromDate;
    if (p.toDate) queryObj.to = p.toDate;

    const url = `${API_CONFIG.BACKEND_URL}${API_CONFIG.ENDPOINTS.brokerActivity}?${new URLSearchParams(queryObj)}`;
    console.log('📡 Fetching broker activity:', url.substring(0, 100) + '...');

    try {
        const res = await fetch(url);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        console.log('✅ Broker data loaded:', data?.data?.broker_activity_transaction?.brokers_buy?.length || 0, 'items');
        return data;
    } catch (e) {
        console.error('❌ Broker fetch error:', e.message);
        showError(`Failed to fetch broker data: ${e.message}`);
        return null;
    }
}

async function fetchMarketDetector(stockCode, params = {}) {
    const {
        transactionType = 'TRANSACTION_TYPE_NET',
        marketBoard = 'MARKET_BOARD_REGULER',
        investorType = 'INVESTOR_TYPE_ALL',
        limit = 5,
        fromDate = '',
        toDate = ''
    } = params;

    const queryObj = { transaction_type: transactionType, market_board: marketBoard, investor_type: investorType, limit };
    if (fromDate) queryObj.from = fromDate;
    if (toDate) queryObj.to = toDate;

    const url = `${API_CONFIG.BACKEND_URL}${API_CONFIG.ENDPOINTS.marketDetector}/${encodeURIComponent(stockCode.toUpperCase())}?${new URLSearchParams(queryObj)}`;
    console.log('📡 Market detector fetching:', url.substring(0, 120) + '...');

    try {
        const res = await fetch(url);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        console.log('✅ Market detector loaded for', stockCode);
        return data;
    } catch (e) {
        console.error('❌ Market detector error:', e.message);
        showError(`Market detector fetch failed: ${e.message}`);
        return null;
    }
}

async function fetchBrokerRanking(params = {}) {
    const {
        sort = 'TB_SORT_BY_TOTAL_VALUE',
        order = 'ORDER_BY_DESC',
        fromDate = '',
        toDate = '',
        marketType = 'MARKET_TYPE_ALL',
        eodOnly = true
    } = params;

    const queryObj = {
        sort: sort,
        order: order,
        market_type: marketType,
        eod_only: eodOnly
    };

    if (fromDate) queryObj.from = fromDate;
    if (toDate) queryObj.to = toDate;

    const url = `${API_CONFIG.BACKEND_URL}${API_CONFIG.ENDPOINTS.brokerRanking}?${new URLSearchParams(queryObj)}`;
    console.log('📡 Fetching broker ranking:', url.substring(0, 120) + '...');

    try {
        const res = await fetch(url);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        console.log('✅ Broker ranking loaded:', data?.data?.list?.length || 0, 'brokers');
        return data;
    } catch (e) {
        console.error('❌ Broker ranking error:', e.message);
        showError(`Failed to fetch broker ranking: ${e.message}`);
        return null;
    }
}

