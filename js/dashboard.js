// =============================================
// DASHBOARD — IHSG Card + Trending Stocks
// =============================================

async function loadDashboard() {
    await Promise.all([loadIHSG(), loadTrending(), loadIHSGChart()]);
}

// ---- IHSG ----
async function loadIHSG() {
    const el = document.getElementById('ihsgCard');
    if (!el) return;
    el.innerHTML = '<div class="db-loading"><div class="spinner"></div> Memuat IHSG...</div>';

    try {
        const res  = await fetch(`${API_CONFIG.BACKEND_URL}/api/ihsg`);
        const json = await res.json();
        const d    = json.data;
        renderIHSG(d);
    } catch (e) {
        console.error('IHSG error:', e);
        el.innerHTML = '<div class="db-loading" style="color:var(--red)">Gagal memuat IHSG</div>';
    }
}

function renderIHSG(d) {
    const el = document.getElementById('ihsgCard');
    if (!el || !d) return;

    const chg   = d.change || 0;
    const pct   = d.percentage_change || 0;
    const cls   = chg >= 0 ? 'pos' : 'neg';
    const sign  = chg >= 0 ? '+' : '';
    const arrow = chg >= 0 ? '▲' : '▼';
    const fmtN  = v => Number(v).toLocaleString('id-ID');
    const fmtT  = v => {
        const n = Math.abs(v);
        if (n >= 1e12) return (v/1e12).toFixed(2) + 'T';
        if (n >= 1e9)  return (v/1e9).toFixed(2)  + 'M';
        if (n >= 1e6)  return (v/1e6).toFixed(1)  + 'jt';
        return fmtN(v);
    };

    // Foreign flow
    const fbuy  = d.fbuy  || 0;
    const fsell = d.fsell || 0;
    const fnet  = d.fnet  || 0;
    const fnetCls = fnet >= 0 ? 'pos' : 'neg';

    // Market data rows
    const mktRows = (d.market_data || []).map(m => `
        <tr>
            <td>${m.label}</td>
            <td>${m.frequency?.formatted || '-'}</td>
            <td>${m.volume?.formatted || '-'}</td>
            <td>${m.value?.formatted || '-'}</td>
        </tr>`).join('');

    el.innerHTML = `
    <div class="ihsg-hero">
        <div class="ihsg-left">
            <div class="ihsg-label">IHSG <span class="ihsg-exchange">IDX</span></div>
            <div class="ihsg-price">${d.lastprice?.toLocaleString('id-ID', {minimumFractionDigits:2}) || '-'}</div>
            <div class="ihsg-change ${cls}">
                ${arrow} ${sign}${chg.toFixed(2)} (${sign}${pct.toFixed(2)}%)
            </div>
            <div class="ihsg-ohlv">
                <span>O <b>${d.open?.toFixed(2)}</b></span>
                <span>H <b class="pos">${d.high?.toFixed(2)}</b></span>
                <span>L <b class="neg">${d.low?.toFixed(2)}</b></span>
                <span>Prev <b>${d.previous?.toFixed(2)}</b></span>
            </div>
        </div>

        <div class="ihsg-right">
            <!-- Breadth -->
            <div class="ihsg-breadth">
                <div class="breadth-item pos">
                    <div class="breadth-val">${d.up}</div>
                    <div class="breadth-lbl">Naik</div>
                </div>
                <div class="breadth-item neu">
                    <div class="breadth-val">${d.unchanged}</div>
                    <div class="breadth-lbl">Tetap</div>
                </div>
                <div class="breadth-item neg">
                    <div class="breadth-val">${d.down}</div>
                    <div class="breadth-lbl">Turun</div>
                </div>
            </div>

            <!-- Foreign Flow -->
            <div class="ihsg-foreign">
                <div class="ihsg-section-title">💱 Foreign Flow</div>
                <div class="foreign-row">
                    <span class="foreign-label">Buy</span>
                    <span class="pos">+${fmtT(fbuy)}</span>
                </div>
                <div class="foreign-row">
                    <span class="foreign-label">Sell</span>
                    <span class="neg">-${fmtT(fsell)}</span>
                </div>
                <div class="foreign-row" style="border-top:1px solid var(--border);padding-top:6px;margin-top:4px;">
                    <span class="foreign-label" style="font-weight:700;">Net</span>
                    <span class="${fnetCls}" style="font-weight:700;">${fnet >= 0 ? '+' : ''}${fmtT(fnet)}</span>
                </div>
                <div class="foreign-pct-bar">
                    <div class="fpct-label">${d.domestic}% Lokal</div>
                    <div class="fpct-track">
                        <div class="fpct-fill-dom" style="width:${d.domestic}%;"></div>
                        <div class="fpct-fill-for" style="width:${d.foreign}%;"></div>
                    </div>
                    <div class="fpct-label" style="text-align:right;">${d.foreign}% Asing</div>
                </div>
            </div>
        </div>
    </div>

    <!-- Market Data Table -->
    <div class="ihsg-mktdata">
        <div class="ihsg-section-title">📊 Market Summary</div>
        <table class="ihsg-table">
            <thead><tr><th>Pasar</th><th>Frekuensi</th><th>Volume</th><th>Nilai</th></tr></thead>
            <tbody>${mktRows}</tbody>
        </table>
    </div>`;
}

// ---- TRENDING ----
async function loadTrending() {
    const el = document.getElementById('trendingGrid');
    if (!el) return;
    el.innerHTML = '<div class="db-loading"><div class="spinner"></div> Memuat trending...</div>';

    try {
        const res  = await fetch(`${API_CONFIG.BACKEND_URL}/api/trending`);
        const json = await res.json();
        renderTrending(json.data || []);
    } catch (e) {
        console.error('Trending error:', e);
        el.innerHTML = '<div class="db-loading" style="color:var(--red)">Gagal memuat trending</div>';
    }
}

// Global map: symbol → stock data (untuk dihindari masalah quote di onclick HTML)
window._trendMap = {};

function renderTrending(stocks) {
    const el = document.getElementById('trendingGrid');
    if (!el) return;

    // Populate global map
    window._trendMap = {};
    stocks.forEach(s => { window._trendMap[s.symbol] = s; });

    el.innerHTML = stocks.map(s => {
        const chg    = parseFloat(s.change) || 0;
        const pct    = parseFloat(s.percent) || 0;
        const cls    = chg > 0 ? 'pos' : chg < 0 ? 'neg' : 'neu';
        const arrow  = chg > 0 ? '▲' : chg < 0 ? '▼' : '—';
        const sign   = chg > 0 ? '+' : '';
        const border = chg > 0 ? 'rgba(0,229,160,0.25)' : chg < 0 ? 'rgba(255,77,109,0.25)' : 'var(--border)';
        const icon   = s.icon_url
            ? `<img src="${s.icon_url}" alt="${s.symbol}" class="trend-icon" onerror="this.style.display='none'">`
            : `<div class="trend-icon-fallback">${s.symbol.substring(0,2)}</div>`;
        const notations = (s.notation || []).map(n =>
            `<img src="${n.icon_url?.dark_mode}" title="${n.notation_desc}" class="trend-notation" onerror="this.style.display='none'">`
        ).join('');
        const corpBadge = s.corp_action?.active
            ? `<span class="trend-corp" title="${s.corp_action.text}">📋</span>` : '';

        // ✅ onclick hanya passing symbol — data diambil dari _trendMap
        return `<div class="trend-card" style="border-color:${border};" onclick="openStockChart('${s.symbol}')">
            <div class="trend-card-top">
                <div class="trend-icon-wrap">${icon}</div>
                <div class="trend-info">
                    <div class="trend-symbol">${s.symbol} ${notations} ${corpBadge}</div>
                    <div class="trend-name">${s.name}</div>
                </div>
            </div>
            <div class="trend-card-bottom">
                <div class="trend-price">${Number(s.last).toLocaleString('id-ID')}</div>
                <div class="trend-chg ${cls}">${arrow} ${sign}${chg.toLocaleString()} (${sign}${pct.toFixed(2)}%)</div>
            </div>
        </div>`;
    }).join('');
}

// ---- IHSG INTRADAY CHART ----
let ihsgLineChartInst = null;

async function loadIHSGChart() {
    try {
        const res  = await fetch(`${API_CONFIG.BACKEND_URL}/api/ihsg-chart`);
        const json = await res.json();
        renderIHSGChart(json.data);
    } catch (e) {
        console.error('IHSG Chart error:', e);
    }
}

function renderIHSGChart(data) {
    const ctx = document.getElementById('ihsgLineChart');
    if (!ctx || !data?.prices?.length) return;

    const valid   = data.prices.filter(p => p.value && parseFloat(p.value) > 0);
    const step    = Math.max(1, Math.floor(valid.length / 180));
    const sampled = valid.filter((_, i) => i % step === 0 || i === valid.length - 1);

    const labels = sampled.map(p => (p.formatted_date || '').split(' ')[1]?.substring(0, 5) || '');
    const values = sampled.map(p => parseFloat(p.value));

    const isUp   = (data.change || 0) >= 0;
    const color  = isUp ? '#00e5a0' : '#ff4d6d';
    const fillBg = isUp ? 'rgba(0,229,160,0.07)' : 'rgba(255,77,109,0.07)';

    const shownH = new Set();
    const tickLabels = labels.map(l => {
        const h = l.substring(0, 2);
        if (!l || shownH.has(h)) return '';
        shownH.add(h);
        return l;
    });

    const metaEl = document.getElementById('ihsgChartMeta');
    if (metaEl) metaEl.textContent = `${labels[0]} – ${labels[labels.length - 1]} · ${sampled.length} titik`;

    if (ihsgLineChartInst) { ihsgLineChartInst.destroy(); ihsgLineChartInst = null; }

    ihsgLineChartInst = new Chart(ctx, {
        type: 'line',
        data: {
            labels: tickLabels,
            datasets: [{
                data: values,
                borderColor: color,
                borderWidth: 1.8,
                backgroundColor: fillBg,
                fill: true,
                tension: 0.2,
                pointRadius: 0,
                pointHoverRadius: 4,
                pointHoverBackgroundColor: color,
                pointHoverBorderColor: '#fff',
                pointHoverBorderWidth: 2,
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: { mode: 'index', intersect: false },
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        title: items => sampled[items[0].dataIndex]?.formatted_date?.split(' ')[1] || '',
                        label: item => {
                            const idx = item.dataIndex;
                            const v   = item.parsed.y.toFixed(2);
                            const chg = (sampled[idx]?.change || 0).toFixed(2);
                            const pct = sampled[idx]?.percentage || '0';
                            return `  ${Number(v).toLocaleString('id-ID', {minimumFractionDigits:2})}   ${chg >= 0 ? '+' : ''}${chg} (${pct}%)`;
                        }
                    },
                    backgroundColor: '#1a1d2e',
                    borderColor: 'rgba(255,255,255,0.1)',
                    borderWidth: 1,
                    titleColor: '#aaa',
                    bodyColor: color,
                    padding: 10,
                    displayColors: false
                }
            },
            scales: {
                x: {
                    grid: { display: false },
                    ticks: {
                        color: '#555',
                        font: { family: "'Space Mono', monospace", size: 9 },
                        maxRotation: 0,
                        autoSkip: false
                    },
                    border: { color: 'rgba(255,255,255,0.06)' }
                },
                y: {
                    position: 'right',
                    grid: { color: 'rgba(255,255,255,0.04)' },
                    ticks: {
                        color: '#555',
                        font: { family: "'Space Mono', monospace", size: 9 },
                        callback: v => Number(v).toLocaleString('id-ID', { minimumFractionDigits: 0 })
                    },
                    border: { color: 'rgba(255,255,255,0.06)' }
                }
            }
        }
    });
}
