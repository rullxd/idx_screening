// =============================================
// APP — Navigation, Tab switching, Main init,
//       Data loading, Auto-load wiring
// =============================================

function switchTab(tab) {
    appState.currentPage = tab;
    ['dashboard', 'screener', 'broker', 'heatmap', 'alerts', 'ranking', 'stockchart'].forEach(t => {
        const pageEl = document.getElementById('page-' + t);
        const navEl = document.getElementById('nav-' + t);
        if (pageEl) pageEl.style.display = t === tab ? 'block' : 'none';
        if (navEl) navEl.classList.toggle('active', t === tab);
    });
    // Auto-load dashboard saat pertama dibuka
    if (tab === 'dashboard' && !appState.dashboardLoaded) {
        appState.dashboardLoaded = true;
        loadDashboard().then(() => {
            const tc = document.getElementById('trendCount');
            const grid = document.getElementById('trendingGrid');
            if (tc && grid) tc.textContent = grid.children.length + ' saham';
        });
    }
    // Auto-load ranking saat pertama dibuka
    if (tab === 'ranking' && !appState.brokerRankingLoaded) {
        appState.brokerRankingLoaded = true;
        loadRanking();
    }
    // Build timeframe buttons when entering stock chart page
    if (tab === 'stockchart') buildTfButtons();
}

function switchBrokerSubtab(sub) {
    ['brokerlist', 'marketdetector'].forEach(s => {
        const el = document.getElementById('broker-sub-' + s);
        const btn = document.getElementById('subtab-' + s);
        if (el) el.style.display = s === sub ? 'block' : 'none';
        if (btn) btn.classList.toggle('active', s === sub);
    });
    // Auto-load Market Detector saat pertama kali dibuka
    if (sub === 'marketdetector') {
        const code = document.getElementById('mdStockCode')?.value?.trim();
        if (code && !appState.marketDetectorData) loadMarketDetector();
    }
}

function initMarketDetectorAutoLoad() {
    const debouncedLoad = debounce(loadMarketDetector, 600);
    // Select & date → trigger setelah 600ms
    ['mdTransactionType', 'mdInvestorType', 'mdMarketBoard', 'mdFromDate', 'mdToDate'].forEach(id => {
        document.getElementById(id)?.addEventListener('change', debouncedLoad);
    });
    // Text & number → trigger lebih lambat saat user selesai mengetik
    const slowLoad = debounce(loadMarketDetector, 800);
    document.getElementById('mdStockCode')?.addEventListener('input', slowLoad);
    document.getElementById('mdLimit')?.addEventListener('change', debouncedLoad);
}

async function loadDataWithFilters() {
    setLoading(true);
    const brokerCode = document.getElementById('filterBrokerCode')?.value?.toUpperCase() || 'AK';
    const fromDate = document.getElementById('filterFromDate')?.value || '';
    const toDate = document.getElementById('filterToDate')?.value || '';

    console.log(`📊 Loading data — Broker: ${brokerCode}, From: ${fromDate}, To: ${toDate}`);

    const params = { brokerCode };
    if (fromDate) params.fromDate = fromDate;
    if (toDate) params.toDate = toDate;

    const brokerData = await fetchBrokerActivity(params);
    if (brokerData) {
        const processedData = processRawBrokerData(brokerData);
        appState.allData = processedData;
        appState.filteredData = [...processedData];
        renderTable();
        showSuccess(`✅ Data loaded: ${processedData.length} stocks dari broker ${brokerCode}`);
    } else {
        showError('⚠️ Failed to load API data. Check console.');
    }
    setLoading(false);
}

async function initializeApp() {
    console.log('🚀 BandarScope Init');

    const today = new Date().toISOString().split('T')[0];
    document.getElementById('liveDate').textContent = today;

    // Init tab state dulu agar semua elemen visible
    switchTab('screener');

    // Set tanggal default = hari ini setelah tab aktif
    ['filterFromDate', 'filterToDate', 'mdFromDate', 'mdToDate'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = today;
    });

    // Auto-load saat filter screener berubah
    document.getElementById('filterBrokerCode')?.addEventListener('input', loadDataWithFilters);
    document.getElementById('filterFromDate')?.addEventListener('change', loadDataWithFilters);
    document.getElementById('filterToDate')?.addEventListener('change', loadDataWithFilters);

    // Init auto-load Market Detector
    initMarketDetectorAutoLoad();
}
