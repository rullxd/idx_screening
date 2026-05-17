// =============================================
// SCREENER — Data processing, Table, Filter,
//            Sorting, Quick Filter, Detail Panel
// =============================================

function processRawBrokerData(rawData) {
    if (!rawData || !rawData.data) return [];
    const brokerActivity = rawData.data.broker_activity_transaction || {};
    const brokersBuy  = brokerActivity.brokers_buy  || [];
    const brokersSell = brokerActivity.brokers_sell || [];

    const stockMap = new Map();

    brokersBuy.forEach(entry => {
        const code = entry.stock_code;
        if (!stockMap.has(code)) stockMap.set(code, { code, buy: [], sell: [], icon: entry.company_detail?.icon_url, corpAction: entry.company_detail?.corpaction });
        stockMap.get(code).buy.push(entry);
    });

    brokersSell.forEach(entry => {
        const code = entry.stock_code;
        if (!stockMap.has(code)) stockMap.set(code, { code, buy: [], sell: [], icon: entry.company_detail?.icon_url, corpAction: entry.company_detail?.corpaction });
        stockMap.get(code).sell.push(entry);
    });

    return Array.from(stockMap.entries()).map(([code, data]) => {
        const buyValue  = data.buy.reduce((s, b) => s + (b.value || 0), 0);
        const sellValue = data.sell.reduce((s, b) => s + (b.value || 0), 0);
        const netValue  = buyValue - sellValue;

        const buyLot  = data.buy.reduce((s, b)  => s + (b.lot || 0), 0);
        const sellLot = data.sell.reduce((s, b) => s + (b.lot || 0), 0);

        const buyFreq  = data.buy.reduce((s, b)  => s + (b.freq || 0), 0);
        const sellFreq = data.sell.reduce((s, b) => s + (b.freq || 0), 0);

        const buyPrice  = data.buy.length  > 0 ? data.buy.reduce((s, b)  => s + (b.avg_price || 0), 0) / data.buy.length  : 0;
        const sellPrice = data.sell.length > 0 ? data.sell.reduce((s, b) => s + (b.avg_price || 0), 0) / data.sell.length : 0;

        let accdist = 'Neutral', score = 5;
        if      (netValue >  20000000000) { accdist = 'Strong Acc';  score = 9; }
        else if (netValue >  10000000000) { accdist = 'Acc';         score = 8; }
        else if (netValue >   3000000000) { accdist = 'Weak Acc';    score = 6; }
        else if (netValue < -20000000000) { accdist = 'Strong Dist'; score = 1; }
        else if (netValue < -10000000000) { accdist = 'Dist';        score = 2; }
        else if (netValue <  -3000000000) { accdist = 'Weak Dist';   score = 4; }

        if (buyFreq  > 5000)              score = Math.min(10, score + 1);
        if (buyLot   > 50000)             score = Math.min(10, score + 1);
        if (buyPrice > sellPrice * 1.02)  score = Math.min(10, score + 1);

        const foreignBuyCount  = data.buy.filter(b => b.type === 'BROKER_TYPE_FOREIGN').length;

        return {
            StockCode: code, StockName: code,
            Close: Math.round(buyPrice), BuyPrice: Math.round(buyPrice), SellPrice: Math.round(sellPrice),
            PriceDiff: Math.round(buyPrice - sellPrice),
            BuyValue: buyValue, SellValue: sellValue, NetValue: netValue,
            BuyLot: buyLot, SellLot: sellLot, NetLot: buyLot - sellLot,
            BuyFreq: buyFreq, SellFreq: sellFreq,
            BuyBrokerCount: data.buy.length, SellBrokerCount: data.sell.length,
            ForeignBuyers: foreignBuyCount,
            Accdist: accdist,
            Score: Math.max(0, Math.min(10, Math.round(score))),
            Icon: data.icon,
            CorpAction: data.corpAction?.active || false,
            BuyData: data.buy, SellData: data.sell
        };
    }).sort((a, b) => b.Score - a.Score);
}

// ----- TABLE RENDER -----
function renderTable() {
    const tbody = document.getElementById('tableBody');
    const q = document.getElementById('searchBox')?.value.toLowerCase() || '';
    let data = appState.filteredData.filter(d => !q || d.StockCode.toLowerCase().includes(q));

    data.sort((a, b) => {
        if (['StockCode','Accdist'].includes(appState.sortKey)) {
            return appState.sortAsc ? a[appState.sortKey].localeCompare(b[appState.sortKey]) : b[appState.sortKey].localeCompare(a[appState.sortKey]);
        }
        return appState.sortAsc ? a[appState.sortKey] - b[appState.sortKey] : b[appState.sortKey] - a[appState.sortKey];
    });

    document.getElementById('rowCount').textContent = data.length + ' saham';

    let acc = 0, strongAcc = 0, dist = 0, buySum = 0;
    appState.filteredData.forEach(d => {
        if (d.Accdist.includes('Acc'))  acc++;
        if (d.Accdist === 'Strong Acc') strongAcc++;
        if (d.Accdist.includes('Dist')) dist++;
        if (d.NetValue > 0) buySum += d.NetValue;
    });
    document.getElementById('sum-acc').textContent   = `${acc} (${strongAcc} 🔥)`;
    document.getElementById('sum-dist').textContent  = dist;
    document.getElementById('sum-buy').textContent   = fmtVal(buySum);
    document.getElementById('sum-total').textContent = appState.filteredData.length;

    tbody.innerHTML = data.map(d => {
        const netClass   = d.NetValue > 0 ? 'val-pos' : d.NetValue < 0 ? 'val-neg' : 'val-neu';
        const priceClass = d.PriceDiff > 0 ? 'val-pos' : d.PriceDiff < 0 ? 'val-neg' : 'val-neu';
        const corpBadge  = d.CorpAction ? '📋' : '';
        const icon = d.Icon ? `<img src="${d.Icon}" alt="${d.StockCode}" style="width:24px;height:24px;border-radius:4px;margin-right:6px;">` : '';
        const buyBadge  = `<span class="broker-count">${d.BuyBrokerCount}</span>`;
        const sellBadge = `<span class="broker-count">${d.SellBrokerCount}</span>`;
        return `<tr onclick="openDetail('${d.StockCode}')">
            <td><div class="stock-cell">${icon}<div><div class="stock-code">${d.StockCode} ${corpBadge}</div></div></div></td>
            <td class="val-neu">${d.Close.toLocaleString()}</td>
            <td class="${priceClass}">${d.PriceDiff > 0 ? '+' : ''}${d.PriceDiff}</td>
            <td class="${netClass}">${fmtVal(d.NetValue)}</td>
            <td>${fmtLot(d.NetLot)}</td>
            <td>${fmtNum(d.BuyFreq)}</td>
            <td>${d.ForeignBuyers}</td>
            <td>${buyBadge}/${sellBadge}</td>
            <td>${accdistBadge(d.Accdist)}</td>
            <td>${scoreBadge(d.Score)}</td>
        </tr>`;
    }).join('');
}

function sortTable(key) {
    const keyMap = { code: 'StockCode', close: 'Close', change: 'PriceDiff', netval: 'NetValue', lot: 'NetLot', freq: 'BuyFreq', accdist: 'Accdist', score: 'Score' };
    const mapped = keyMap[key] || key;
    if (appState.sortKey === mapped) appState.sortAsc = !appState.sortAsc;
    else { appState.sortKey = mapped; appState.sortAsc = false; }
    renderTable();
}

// ----- FILTER -----
function applyFilter() {
    const accdist  = document.getElementById('f-accdist').value;
    const minval   = parseFloat(document.getElementById('f-minval').value) * 1e9 || -Infinity;
    const minfreq  = parseFloat(document.getElementById('f-freq').value) || 0;
    const minscore = parseFloat(document.getElementById('f-score').value) || 0;
    const broker   = document.getElementById('f-broker').value.toUpperCase();

    appState.filteredData = appState.allData.filter(d =>
        (accdist === 'ALL' || d.Accdist.includes(accdist)) &&
        d.NetValue >= minval &&
        d.BuyFreq  >= minfreq &&
        d.Score    >= minscore &&
        (!broker || d.BuyData?.some(b => b.broker_code === broker))
    );
    renderTable();
}

function resetFilter() {
    ['f-accdist', 'f-score'].forEach(id => { const el = document.getElementById(id); if (el) el.value = 'ALL'; });
    ['f-minval', 'f-maxval', 'f-freq', 'f-broker'].forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
    appState.filteredData = [...appState.allData];
    renderTable();
}

function quickFilter(type) {
    appState.filteredData = appState.allData.filter(d =>
        type === 'acc'         ? d.Accdist.includes('Acc')  :
        type === 'foreign_buy' ? d.ForeignBuyers > 0        :
        type === 'high_score'  ? d.Score >= 7               :
        type === 'high_freq'   ? d.BuyFreq >= 5000          : true
    );
    renderTable();
}

// ----- DETAIL PANEL -----
function openDetail(code) {
    const d = appState.allData.find(x => x.StockCode === code);
    if (!d) return;
    const panel = document.getElementById('detailPanel');
    panel.classList.add('open');

    document.getElementById('d-code').textContent  = d.StockCode;
    document.getElementById('d-price').textContent = d.Close.toLocaleString();
    document.getElementById('d-change').textContent  = d.PriceDiff > 0 ? `+${d.PriceDiff.toLocaleString()}` : d.PriceDiff.toLocaleString();
    document.getElementById('d-change').className    = d.PriceDiff > 0 ? 'detail-change val-pos' : 'detail-change val-neg';
    document.getElementById('d-accdist').innerHTML   = accdistBadge(d.Accdist);
    document.getElementById('d-bscore').innerHTML    = scoreBadge(d.Score);
    document.getElementById('d-netval').innerHTML    = `<span class="${d.NetValue > 0 ? 'val-pos' : 'val-neg'}">${fmtVal(d.NetValue)}</span>`;
    document.getElementById('d-netlot').innerHTML    = `<span class="${d.NetLot > 0 ? 'val-pos' : 'val-neg'}">${fmtLot(d.NetLot)} lot</span>`;
    document.getElementById('d-avgprice').textContent = `Buy: ${d.BuyPrice.toLocaleString()} | Sell: ${d.SellPrice.toLocaleString()}`;
    document.getElementById('d-freq').textContent    = `Buy: ${fmtNum(d.BuyFreq)} | Sell: ${fmtNum(d.SellFreq)}`;
    document.getElementById('d-close').textContent   = d.Close.toLocaleString();
    document.getElementById('d-vol').textContent     = `Buy: ${fmtNum(d.BuyLot)} | Sell: ${fmtNum(d.SellLot)}`;
    document.getElementById('d-val').innerHTML       = `<span class="val-pos">Buy: ${fmtVal(d.BuyValue)}</span> | <span class="val-neg">Sell: ${fmtVal(d.SellValue)}</span>`;
    document.getElementById('d-fbuy').textContent    = `${d.ForeignBuyers} buyers`;
    document.getElementById('d-fsell').textContent   = `${d.SellBrokerCount} sellers`;
    const foreignNet = d.ForeignBuyers - (d.SellBrokerCount || 0);
    document.getElementById('d-fnet').innerHTML      = `<span class="${foreignNet > 0 ? 'val-pos' : 'val-neg'}">${foreignNet > 0 ? '+' : ''}${foreignNet}</span>`;

    const brokerSection = document.getElementById('d-brokers');
    let brokerHtml = '';
    if (d.BuyData?.length > 0) {
        brokerHtml += '<div><strong>Top Buyers:</strong><div style="font-size:12px;margin-top:8px;">';
        d.BuyData.slice(0, 3).forEach(b => {
            brokerHtml += `<div style="padding:6px;background:rgba(0,229,160,0.1);margin:4px 0;border-radius:4px;"><strong>${b.broker_code}</strong> — ${fmtVal(b.value)} (${fmtNum(b.lot)} lot)</div>`;
        });
        brokerHtml += '</div></div>';
    }
    if (d.SellData?.length > 0) {
        brokerHtml += '<div style="margin-top:12px;"><strong>Top Sellers:</strong><div style="font-size:12px;margin-top:8px;">';
        d.SellData.slice(0, 3).forEach(s => {
            brokerHtml += `<div style="padding:6px;background:rgba(255,77,109,0.1);margin:4px 0;border-radius:4px;"><strong>${s.broker_code}</strong> — ${fmtVal(s.value)} (${fmtNum(s.lot)} lot)</div>`;
        });
        brokerHtml += '</div></div>';
    }
    brokerSection.innerHTML = brokerHtml || '<div style="color:#888;">No broker data</div>';
}

function closeDetail() { document.getElementById('detailPanel').classList.remove('open'); }
