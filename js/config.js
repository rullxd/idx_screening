// =============================================
// CONFIG — API endpoints, default params, state
// =============================================

const API_CONFIG = {
    BACKEND_URL: 'http://localhost:3000',
    ENDPOINTS: {
        brokerActivity: '/api/broker-activity',
        marketDetector: '/api/market-detector'
    }
};

const DEFAULT_PARAMS = {
    brokerCode: 'AK',
    transactionType: 'TRANSACTION_TYPE_GROSS',
    investorType: 'INVESTOR_TYPE_ALL',
    marketBoard: 'MARKET_TYPE_REGULER',
    period: 'RT_PERIOD_LAST_1_DAY',
    limit: 50,
    page: 1
};

let appState = {
    brokerActivityData: null,
    allData: [],
    filteredData: [],
    sortKey: 'Score',
    sortAsc: false,
    isLoading: false,
    currentPage: 'screener',
    detailChart: null,
    brokerChartInst: null,
    marketDetectorData: null,
    mdNetChartInst: null,
    mdTypeChartInst: null
};
