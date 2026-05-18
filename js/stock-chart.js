// =============================================
// STOCK CHART PAGE — Chart per saham + timeframe
// =============================================

const TIMEFRAMES = [
    { label: '1D',  value: 'today', intraday: true  },
    { label: '1W',  value: '1w',    intraday: false },
    { label: '1M',  value: '1m',    intraday: false },
    { label: '3M',  value: '3m',    intraday: false },
    { label: 'YTD', value: 'ytd',   intraday: false },
    { label: '1Y',  value: '1y',    intraday: false },
    { label: '3Y',  value: '3y',    intraday: false },
    { label: '5Y',  value: '5y',    intraday: false },
];

let scState = {
    symbol:    '',
    stockData: null,   // from trending card
    chartInst: null,
    activeTimeframe: 'today'
};

function buildTfButtons() {
    const grp = document.getElementById('scTfGroup');
    if (!grp) return;
    grp.innerHTML = TIMEFRAMES.map(tf => `
        <button class="sc-tf-btn${tf.value === scState.activeTimeframe ? ' active' : ''}"
                data-tf="${tf.value}"
                onclick="loadStockChart('${tf.value}')">
            ${tf.label}
        </button>`).join('');
}

function openStockChart(symbol, stockData) {
    scState.symbol        = symbol;
    // Ambil dari _trendMap jika tidak di-pass langsung
    scState.stockData     = stockData || (window._trendMap && window._trendMap[symbol]) || null;
    scState.activeTimeframe = 'today';

    renderStockChartHeader();
    switchTab('stockchart');
    loadStockChart('today');
}

function renderStockChartHeader() {
    const s = scState.stockData || {};
    const chg   = parseFloat(s.change) || 0;
    const pct   = parseFloat(s.percent) || 0;
    const cls   = chg > 0 ? 'pos' : chg < 0 ? 'neg' : 'neu';
    const arrow = chg > 0 ? '▲' : chg < 0 ? '▼' : '—';
    const sign  = chg > 0 ? '+' : '';

    // Icon
    const iconEl = document.getElementById('sc-icon');
    if (iconEl) {
        iconEl.innerHTML = s.icon_url
            ? `<img src="${s.icon_url}" alt="${scState.symbol}" onerror="this.parentNode.innerHTML='<div class=sc-icon-fallback>${scState.symbol.substring(0,2)}</div>'">`
            : `<div class="sc-icon-fallback">${scState.symbol.substring(0,2)}</div>`;
    }

    const setText = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
    const setHtml = (id, val) => { const el = document.getElementById(id); if (el) el.innerHTML  = val; };
    const setClass = (id, cls) => { const el = document.getElementById(id); if (el) el.className  = cls; };

    setText('sc-symbol', scState.symbol);
    setText('sc-name',   s.name || scState.symbol);
    setText('sc-price',  Number(s.last || 0).toLocaleString('id-ID'));
    setHtml('sc-chg',    `<span class="${cls}">${arrow} ${sign}${chg.toLocaleString()} (${sign}${pct.toFixed(2)}%)</span>`);
}

// ----- LOAD CHART -----
async function loadStockChart(timeframe) {
    scState.activeTimeframe = timeframe;

    // Update active button
    document.querySelectorAll('.sc-tf-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.tf === timeframe);
    });

    // Show loading
    const wrap = document.getElementById('scChartWrap');
    if (wrap) wrap.innerHTML = `
        <div style="display:flex;align-items:center;justify-content:center;height:100%;gap:10px;color:var(--text2);font-family:'Space Mono',monospace;font-size:12px;">
            <div class="spinner"></div> Memuat ${scState.symbol} ${timeframe}...
        </div>`;

    try {
        const url  = `${API_CONFIG.BACKEND_URL}/api/stock-chart?symbol=${encodeURIComponent(scState.symbol)}&timeframe=${encodeURIComponent(timeframe)}`;
        const res  = await fetch(url);
        const json = await res.json();
        renderStockChart(json.data, timeframe);
    } catch (e) {
        console.error('Stock chart error:', e);
        if (wrap) wrap.innerHTML = `<div style="display:flex;align-items:center;justify-content:center;height:100%;color:var(--red);font-size:12px;">Gagal memuat chart</div>`;
    }
}

function renderStockChart(data, timeframe) {
    const wrap = document.getElementById('scChartWrap');
    if (!wrap) return;

    // Re-create canvas (destroy old chart first)
    if (scState.chartInst) { scState.chartInst.destroy(); scState.chartInst = null; }
    wrap.innerHTML = '<canvas id="scCanvas"></canvas>';
    const ctx = document.getElementById('scCanvas');
    if (!ctx || !data?.prices?.length) {
        wrap.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100%;color:var(--text3);font-size:12px;">Tidak ada data</div>';
        return;
    }

    const isIntraday = (timeframe === 'today');
    const valid   = data.prices.filter(p => p.value && parseFloat(p.value) > 0);

    // Dedup flat tail (end-of-day repeated price)
    const prices = isIntraday ? trimFlatTail(valid) : valid;

    // Sampling for performance
    const maxPoints = isIntraday ? 300 : 200;
    const step    = Math.max(1, Math.floor(prices.length / maxPoints));
    const sampled = prices.filter((_, i) => i % step === 0 || i === prices.length - 1);

    const values = sampled.map(p => parseFloat(p.value));
    const isUp   = (data.change || 0) >= 0;
    const color  = isUp ? '#00e5a0' : '#ff4d6d';
    const fillBg = isUp ? 'rgba(0,229,160,0.08)' : 'rgba(255,77,109,0.08)';

    // Labels
    const labels = sampled.map(p => {
        const fd = p.formatted_date || '';
        if (isIntraday) return fd.split(' ')[1]?.substring(0, 5) || '';
        // For multi-day: format date nicely
        const d = fd.split(' ')[0] || fd;
        if (timeframe === '1w') return d.substring(5);   // MM-DD
        if (timeframe === '1m') return d.substring(5);
        return d.substring(2);                            // YY-MM-DD
    });

    // X tick: show periodically
    const tickLabels = buildTickLabels(labels, isIntraday, sampled.length);

    // Price range for reference line
    const prev = data.previous || values[0];

    // Update meta
    const metaEl = document.getElementById('scChartMeta');
    if (metaEl) {
        const pct = data.percentage || '0';
        const chg = data.change || 0;
        metaEl.innerHTML = `<span class="${isUp ? 'pos' : 'neg'}">${isUp ? '+' : ''}${chg.toFixed ? chg.toFixed(2) : chg} (${pct}%)</span>`;
    }

    scState.chartInst = new Chart(ctx, {
        type: 'line',
        data: {
            labels: tickLabels,
            datasets: [
                // Prev close reference line
                {
                    data: Array(sampled.length).fill(prev),
                    borderColor: 'rgba(255,255,255,0.12)',
                    borderWidth: 1,
                    borderDash: [4, 4],
                    pointRadius: 0,
                    fill: false,
                    tension: 0,
                    tooltip: { enabled: false }
                },
                // Price line
                {
                    data: values,
                    borderColor: color,
                    borderWidth: 2,
                    backgroundColor: fillBg,
                    fill: true,
                    tension: 0.15,
                    pointRadius: 0,
                    pointHoverRadius: 5,
                    pointHoverBackgroundColor: color,
                    pointHoverBorderColor: '#fff',
                    pointHoverBorderWidth: 2,
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: { mode: 'index', intersect: false },
            plugins: {
                legend: { display: false },
                tooltip: {
                    filter: item => item.datasetIndex === 1, // only price line
                    callbacks: {
                        title: items => {
                            const idx = items[0].dataIndex;
                            const fd  = sampled[idx]?.formatted_date || '';
                            return isIntraday ? fd.split(' ')[1] || '' : fd.split(' ')[0] || '';
                        },
                        label: item => {
                            const idx = item.dataIndex;
                            const v   = item.parsed.y;
                            const c   = sampled[idx]?.change || 0;
                            const p   = sampled[idx]?.percentage || '0';
                            const s   = c >= 0 ? '+' : '';
                            return `  ${v.toLocaleString('id-ID', {minimumFractionDigits:2})}   ${s}${c.toFixed ? c.toFixed(2) : c} (${p}%)`;
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
                        color: '#666',
                        font: { family: "'Space Mono', monospace", size: 9 },
                        callback: v => v.toLocaleString('id-ID')
                    },
                    border: { color: 'rgba(255,255,255,0.06)' }
                }
            }
        }
    });
}

// ---- HELPERS ----
function trimFlatTail(prices) {
    if (prices.length < 5) return prices;
    const lastVal = parseFloat(prices[prices.length - 1].value);
    let cutIdx = prices.length;
    // Walk backwards, remove repeated identical values at end (max 30)
    for (let i = prices.length - 1; i >= Math.max(0, prices.length - 30); i--) {
        if (parseFloat(prices[i].value) === lastVal) cutIdx = i + 1;
        else break;
    }
    return prices.slice(0, cutIdx);
}

function buildTickLabels(labels, isIntraday, total) {
    if (isIntraday) {
        const shownH = new Set();
        return labels.map(l => {
            const h = l.substring(0, 2);
            if (!l || shownH.has(h)) return '';
            shownH.add(h);
            return l;
        });
    }
    // Non-intraday: spread evenly ~6 labels
    const step = Math.max(1, Math.floor(total / 6));
    return labels.map((l, i) => (i % step === 0 ? l : ''));
}
