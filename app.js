// ===== API & CONFIG =====
let API_CONFIG = {
    BACKEND_URL: "http://localhost:3000",
    ENDPOINTS: { brokerActivity: "/api/broker-activity" }
};
const DEFAULT_PARAMS = { brokerCode: "AK", transactionType: "TRANSACTION_TYPE_GROSS", investorType: "INVESTOR_TYPE_ALL", marketBoard: "MARKET_TYPE_REGULER", period: "RT_PERIOD_LAST_1_DAY", limit: 50, page: 1 };
let appState = { brokerActivityData: null, allData: [], filteredData: [], sortKey: 'Score', sortAsc: false, isLoading: false, currentPage: 'screener', detailChart: null, brokerChartInst: null };

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

    // Tambahkan parameter tanggal jika tersedia
    if (p.fromDate) queryObj.from = p.fromDate;
    if (p.toDate) queryObj.to = p.toDate;

    const query = new URLSearchParams(queryObj);
    const url = `${API_CONFIG.BACKEND_URL}${API_CONFIG.ENDPOINTS.brokerActivity}?${query}`;
    console.log("📡 Fetching from backend:", url.substring(0, 100) + "...");

    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = await response.json();
        console.log("✅ Data loaded:", data?.data?.broker_activity_transaction?.brokers_buy?.length || 0, "items");
        return data;
    } catch (e) {
        console.error("❌ Backend Error:", e.message);
        showError(`Failed to fetch: ${e.message}`);
        return null;
    }
}

function processRawBrokerData(rawData) {
    if (!rawData || !rawData.data) return [];
    const brokerActivity = rawData.data.broker_activity_transaction || {};
    const brokersBuy = brokerActivity.brokers_buy || [];
    const brokersSell = brokerActivity.brokers_sell || [];

    // Combine buy dan sell data
    const stockMap = new Map();

    brokersBuy.forEach(entry => {
        const code = entry.stock_code;
        if (!stockMap.has(code)) {
            stockMap.set(code, { code, buy: [], sell: [], icon: entry.company_detail?.icon_url, corpAction: entry.company_detail?.corpaction });
        }
        stockMap.get(code).buy.push(entry);
    });

    brokersSell.forEach(entry => {
        const code = entry.stock_code;
        if (!stockMap.has(code)) {
            stockMap.set(code, { code, buy: [], sell: [], icon: entry.company_detail?.icon_url, corpAction: entry.company_detail?.corpaction });
        }
        stockMap.get(code).sell.push(entry);
    });

    return Array.from(stockMap.entries()).map(([code, data]) => {
        // Calculate aggregate metrics
        const buyValue = data.buy.reduce((sum, b) => sum + (b.value || 0), 0);
        const sellValue = data.sell.reduce((sum, s) => sum + (s.value || 0), 0);
        const netValue = buyValue - sellValue;

        const buyLot = data.buy.reduce((sum, b) => sum + (b.lot || 0), 0);
        const sellLot = data.sell.reduce((sum, s) => sum + (s.lot || 0), 0);
        const netLot = buyLot - sellLot;

        const buyFreq = data.buy.reduce((sum, b) => sum + (b.freq || 0), 0);
        const sellFreq = data.sell.reduce((sum, s) => sum + (s.freq || 0), 0);

        const buyPrice = data.buy.length > 0 ? data.buy.reduce((sum, b) => sum + (b.avg_price || 0), 0) / data.buy.length : 0;
        const sellPrice = data.sell.length > 0 ? data.sell.reduce((sum, s) => sum + (s.avg_price || 0), 0) / data.sell.length : 0;

        // Determine accumulation/distribution
        let accdist = "Neutral", score = 5;
        if (netValue > 20000000000) { accdist = "Strong Acc"; score = 9; }
        else if (netValue > 10000000000) { accdist = "Acc"; score = 8; }
        else if (netValue > 3000000000) { accdist = "Weak Acc"; score = 6; }
        else if (netValue < -20000000000) { accdist = "Strong Dist"; score = 1; }
        else if (netValue < -10000000000) { accdist = "Dist"; score = 2; }
        else if (netValue < -3000000000) { accdist = "Weak Dist"; score = 4; }

        // Bonus scoring
        if (buyFreq > 5000) score = Math.min(10, score + 1);
        if (buyLot > 50000) score = Math.min(10, score + 1);
        if (buyPrice > sellPrice * 1.02) score = Math.min(10, score + 1);

        const foreignBuyCount = data.buy.filter(b => b.type === 'BROKER_TYPE_FOREIGN').length;
        const domesticBuyCount = data.buy.filter(b => b.type === 'BROKER_TYPE_DOMESTIC').length;

        return {
            StockCode: code,
            StockName: code,
            Close: Math.round(buyPrice),
            BuyPrice: Math.round(buyPrice),
            SellPrice: Math.round(sellPrice),
            PriceDiff: Math.round(buyPrice - sellPrice),
            BuyValue: buyValue,
            SellValue: sellValue,
            NetValue: netValue,
            BuyLot: buyLot,
            SellLot: sellLot,
            NetLot: netLot,
            BuyFreq: buyFreq,
            SellFreq: sellFreq,
            BuyBrokerCount: data.buy.length,
            SellBrokerCount: data.sell.length,
            ForeignBuyers: foreignBuyCount,
            DomesticBuyers: domesticBuyCount,
            Accdist: accdist,
            Score: Math.max(0, Math.min(10, Math.round(score))),
            Icon: data.icon,
            CorpAction: data.corpAction?.active || false,
            BuyData: data.buy,
            SellData: data.sell
        };
    }).sort((a, b) => b.Score - a.Score);
}

function setLoading(state) { appState.isLoading = state; }
function showError(msg) { console.error(msg); const alert = document.createElement('div'); alert.style.cssText = 'position:fixed;top:20px;right:20px;background:#ff4d6d;color:#fff;padding:16px;border-radius:8px;z-index:9999;'; alert.textContent = msg; document.body.appendChild(alert); setTimeout(() => alert.remove(), 5000); }
function showSuccess(msg) { console.log(msg); const alert = document.createElement('div'); alert.style.cssText = 'position:fixed;top:20px;right:20px;background:#00e5a0;color:#000;padding:16px;border-radius:8px;z-index:9999;font-weight:500;'; alert.textContent = msg; document.body.appendChild(alert); setTimeout(() => alert.remove(), 4000); }
function fmtVal(v) { const abs = Math.abs(v), sign = v < 0 ? '-' : '+'; if (abs >= 1e12) return sign + 'Rp' + (abs / 1e12).toFixed(2) + 'T'; if (abs >= 1e9) return sign + 'Rp' + (abs / 1e9).toFixed(2) + 'M'; if (abs >= 1e6) return sign + 'Rp' + (abs / 1e6).toFixed(1) + 'jt'; return sign + 'Rp' + abs.toLocaleString(); }
function fmtNum(v) { if (Math.abs(v) >= 1e6) return (v / 1e6).toFixed(1) + 'jt'; if (Math.abs(v) >= 1e3) return (v / 1e3).toFixed(1) + 'k'; return v.toLocaleString(); }
function fmtLot(v) { return (v > 0 ? '+' : '') + v.toLocaleString(); }
function accdistBadge(ac) {
    let cls = 'neutral';
    if (ac.includes('Strong Acc')) cls = 'acc-strong';
    else if (ac.includes('Acc')) cls = 'acc';
    else if (ac.includes('Weak Acc')) cls = 'acc-weak';
    else if (ac.includes('Weak Dist')) cls = 'dist-weak';
    else if (ac.includes('Strong Dist')) cls = 'dist-strong';
    else if (ac.includes('Dist')) cls = 'dist';
    return `<span class="accdist-badge ${cls}">${ac}</span>`;
}
function scoreBadge(s) { const cls = s >= 7 ? 'score-high' : s >= 5 ? 'score-med' : 'score-low'; return `<div class="bandar-score ${cls}">${s}</div>`; }

function renderTable() {
    const tbody = document.getElementById('tableBody');
    const q = document.getElementById('searchBox')?.value.toLowerCase() || '';
    let data = appState.filteredData.filter(d => !q || d.StockCode.toLowerCase().includes(q));
    data.sort((a, b) => {
        let av, bv;
        if (appState.sortKey === 'StockCode') {
            av = a.StockCode;
            bv = b.StockCode;
            return appState.sortAsc ? av.localeCompare(bv) : bv.localeCompare(av);
        }
        if (appState.sortKey === 'Accdist') {
            av = a.Accdist;
            bv = b.Accdist;
            return appState.sortAsc ? av.localeCompare(bv) : bv.localeCompare(av);
        }
        av = a[appState.sortKey];
        bv = b[appState.sortKey];
        return appState.sortAsc ? av - bv : bv - av;
    });
    document.getElementById('rowCount').textContent = data.length + ' saham';

    let acc = 0, strongAcc = 0, dist = 0, buySum = 0, foreignBuy = 0;
    appState.filteredData.forEach(d => {
        if (d.Accdist.includes('Acc')) acc++;
        if (d.Accdist === 'Strong Acc') strongAcc++;
        if (d.Accdist.includes('Dist')) dist++;
        if (d.NetValue > 0) buySum += d.NetValue;
        foreignBuy += d.ForeignBuyers;
    });
    document.getElementById('sum-acc').textContent = `${acc} (${strongAcc} 🔥)`;
    document.getElementById('sum-dist').textContent = dist;
    document.getElementById('sum-buy').textContent = fmtVal(buySum);
    document.getElementById('sum-total').textContent = appState.filteredData.length;

    tbody.innerHTML = data.map(d => {
        const netClass = d.NetValue > 0 ? 'val-pos' : d.NetValue < 0 ? 'val-neg' : 'val-neu';
        const priceClass = d.PriceDiff > 0 ? 'val-pos' : d.PriceDiff < 0 ? 'val-neg' : 'val-neu';
        const corpBadge = d.CorpAction ? '📋' : '';
        const icon = d.Icon ? `<img src="${d.Icon}" alt="${d.StockCode}" style="width:24px;height:24px;border-radius:4px;margin-right:6px;">` : '';
        const buyBrokerBadge = `<span class="broker-count" title="Buy Brokers">${d.BuyBrokerCount}</span>`;
        const sellBrokerBadge = `<span class="broker-count" title="Sell Brokers">${d.SellBrokerCount}</span>`;
        return `<tr onclick="openDetail('${d.StockCode}')" style="cursor:pointer;"><td><div class="stock-cell">${icon}<div><div class="stock-code">${d.StockCode} ${corpBadge}</div></div></div></td><td class="val-neu">${d.Close.toLocaleString()}</td><td class="${priceClass}">${d.PriceDiff > 0 ? '+' : ''}${d.PriceDiff}</td><td class="${netClass}">${fmtVal(d.NetValue)}</td><td>${fmtLot(d.NetLot)}</td><td>${fmtNum(d.BuyFreq)}</td><td>${d.ForeignBuyers}</td><td>${buyBrokerBadge}/${sellBrokerBadge}</td><td>${accdistBadge(d.Accdist)}</td><td>${scoreBadge(d.Score)}</td></tr>`;
    }).join('');
}

function sortTable(key) {
    // Map HTML keys to data object keys
    const keyMap = {
        'code': 'StockCode',
        'close': 'Close',
        'change': 'PriceDiff',
        'netval': 'NetValue',
        'lot': 'NetLot',
        'freq': 'BuyFreq',
        'accdist': 'Accdist',
        'score': 'Score'
    };
    const mappedKey = keyMap[key] || key;

    if (appState.sortKey === mappedKey) appState.sortAsc = !appState.sortAsc;
    else { appState.sortKey = mappedKey; appState.sortAsc = false; }
    renderTable();
}
function applyFilter() {
    const accdist = document.getElementById('f-accdist').value,
        minval = parseFloat(document.getElementById('f-minval').value) * 1e9 || -Infinity,
        minfreq = parseFloat(document.getElementById('f-freq').value) || 0,
        minscore = parseFloat(document.getElementById('f-score').value) || 0,
        broker = document.getElementById('f-broker').value.toUpperCase();

    appState.filteredData = appState.allData.filter(d =>
        (accdist === 'ALL' || d.Accdist.includes(accdist)) &&
        d.NetValue >= minval &&
        d.BuyFreq >= minfreq &&
        d.Score >= minscore &&
        (!broker || d.BuyData?.some(b => b.broker_code === broker))
    );
    renderTable();
}
function resetFilter() {
    ['f-accdist', 'f-score'].forEach(id => document.getElementById(id).value = 'ALL');
    ['f-minval', 'f-maxval', 'f-freq', 'f-broker'].forEach(id => document.getElementById(id).value = '');
    appState.filteredData = [...appState.allData];
    renderTable();
}
function quickFilter(type) {
    appState.filteredData = appState.allData.filter(d =>
        type === 'acc' ? d.Accdist.includes('Acc') :
            type === 'foreign_buy' ? d.ForeignBuyers > 0 :
                type === 'high_score' ? d.Score >= 7 :
                    type === 'high_freq' ? d.BuyFreq >= 5000 :
                        true
    );
    renderTable();
}
function openDetail(code) {
    const d = appState.allData.find(x => x.StockCode === code);
    if (!d) return;
    const panel = document.getElementById('detailPanel');
    panel.classList.add('open');

    // Stock info
    document.getElementById('d-code').textContent = d.StockCode;
    document.getElementById('d-price').textContent = d.Close.toLocaleString();
    document.getElementById('d-change').textContent = d.PriceDiff > 0 ? `+${d.PriceDiff.toLocaleString()}` : d.PriceDiff.toLocaleString();
    document.getElementById('d-change').className = d.PriceDiff > 0 ? 'detail-change val-pos' : 'detail-change val-neg';

    // Bandar analysis
    document.getElementById('d-accdist').innerHTML = accdistBadge(d.Accdist);
    document.getElementById('d-bscore').innerHTML = scoreBadge(d.Score);
    document.getElementById('d-netval').innerHTML = `<span class="${d.NetValue > 0 ? 'val-pos' : 'val-neg'}">${fmtVal(d.NetValue)}</span>`;
    document.getElementById('d-netlot').innerHTML = `<span class="${d.NetLot > 0 ? 'val-pos' : 'val-neg'}">${fmtLot(d.NetLot)} lot</span>`;
    document.getElementById('d-avgprice').textContent = `Buy: ${d.BuyPrice.toLocaleString()} | Sell: ${d.SellPrice.toLocaleString()}`;
    document.getElementById('d-freq').textContent = `Buy: ${fmtNum(d.BuyFreq)} | Sell: ${fmtNum(d.SellFreq)}`;

    // Market data
    document.getElementById('d-close').textContent = d.Close.toLocaleString();
    document.getElementById('d-vol').textContent = `Buy: ${fmtNum(d.BuyLot)} | Sell: ${fmtNum(d.SellLot)}`;
    document.getElementById('d-val').innerHTML = `<span class="val-pos">Buy: ${fmtVal(d.BuyValue)}</span> | <span class="val-neg">Sell: ${fmtVal(d.SellValue)}</span>`;
    document.getElementById('d-fbuy').textContent = `${d.ForeignBuyers} buyers`;
    document.getElementById('d-fsell').textContent = `${d.SellBrokerCount} sellers`;
    const foreignNet = d.ForeignBuyers - (d.SellBrokerCount || 0);
    document.getElementById('d-fnet').innerHTML = `<span class="${foreignNet > 0 ? 'val-pos' : 'val-neg'}">${foreignNet > 0 ? '+' : ''}${foreignNet}</span>`;

    // Top broker activity
    const brokerSection = document.getElementById('d-brokers');
    let brokerHtml = '';
    if (d.BuyData?.length > 0) {
        brokerHtml += '<div class="broker-subsection"><strong>Top Buyers:</strong><div style="font-size:12px;margin-top:8px;">';
        d.BuyData.slice(0, 3).forEach(b => {
            brokerHtml += `<div style="padding:6px;background:rgba(0,229,160,0.1);margin:4px 0;border-radius:4px;"><strong>${b.broker_code}</strong> - ${fmtVal(b.value)} (${fmtNum(b.lot)} lot)</div>`;
        });
        brokerHtml += '</div></div>';
    }
    if (d.SellData?.length > 0) {
        brokerHtml += '<div class="broker-subsection" style="margin-top:12px;"><strong>Top Sellers:</strong><div style="font-size:12px;margin-top:8px;">';
        d.SellData.slice(0, 3).forEach(s => {
            brokerHtml += `<div style="padding:6px;background:rgba(255,77,109,0.1);margin:4px 0;border-radius:4px;"><strong>${s.broker_code}</strong> - ${fmtVal(s.value)} (${fmtNum(s.lot)} lot)</div>`;
        });
        brokerHtml += '</div></div>';
    }
    brokerSection.innerHTML = brokerHtml || '<div style="color:#888;">No broker data available</div>';
}
function closeDetail() { document.getElementById('detailPanel').classList.remove('open'); }
function switchTab(tab) { appState.currentPage = tab;['screener', 'broker', 'heatmap', 'alerts', 'ranking'].forEach(t => { const page = document.getElementById('page-' + t); if (page) page.style.display = t === tab ? 'block' : 'none'; }); }

async function loadDataWithFilters() {
    setLoading(true);
    const brokerCode = document.getElementById('filterBrokerCode')?.value?.toUpperCase() || 'AK';
    const fromDate = document.getElementById('filterFromDate')?.value || '';
    const toDate = document.getElementById('filterToDate')?.value || '';

    console.log(`📊 Loading data - Broker: ${brokerCode}, From: ${fromDate}, To: ${toDate}`);

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
        console.log("✅ Loaded", processedData.length, "stocks");
    } else {
        showError("⚠️ Failed to load API data. Check console.");
    }
    setLoading(false);
}

async function initializeApp() {
    console.log("🚀 App Init - Backend Proxy Mode");
    document.getElementById('liveDate').textContent = new Date().toISOString().split('T')[0];

    // Set default dates (hari ini)
    const today = new Date().toISOString().split('T')[0];
    const filterFromDate = document.getElementById('filterFromDate');
    const filterToDate = document.getElementById('filterToDate');
    if (filterFromDate) filterFromDate.value = today;
    if (filterToDate) filterToDate.value = today;

    // Auto-load data saat input berubah
    const filterBrokerCode = document.getElementById('filterBrokerCode');
    if (filterBrokerCode) {
        filterBrokerCode.addEventListener('input', loadDataWithFilters);
    }
    if (filterFromDate) {
        filterFromDate.addEventListener('change', loadDataWithFilters);
    }
    if (filterToDate) {
        filterToDate.addEventListener('change', loadDataWithFilters);
    }
}
