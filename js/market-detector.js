// =============================================
// MARKET DETECTOR — processData, renderChart,
//                   renderTable, loadMD, autoLoad
// =============================================
function processMarketDetectorData(rawData) {
    if (!rawData || !rawData.data) return { raw: rawData, rows: [], unknown: true };

    const d = rawData.data;

    // ✅ Struktur asli Exodus: data.bandar_detector + data.broker_summary
    if (d.broker_summary && (d.broker_summary.brokers_buy || d.broker_summary.brokers_sell)) {
        const buyRows = (d.broker_summary.brokers_buy || []).map(r => ({ ...r, _side: 'buy' }));
        const sellRows = (d.broker_summary.brokers_sell || []).map(r => ({ ...r, _side: 'sell' }));
        return {
            raw: rawData,
            bandarDetector: d.bandar_detector || null,
            brokerSummary: d.broker_summary,
            buyRows,
            sellRows,
            from: d.from,
            to: d.to
        };
    }

    // Fallback: format lain
    let rows = null;
    if (Array.isArray(d)) rows = d;
    else if (d.brokers_buy || d.brokers_sell) {
        rows = [
            ...(d.brokers_buy || []).map(r => ({ ...r, _side: 'buy' })),
            ...(d.brokers_sell || []).map(r => ({ ...r, _side: 'sell' }))
        ];
    } else if (d.transactions) rows = d.transactions;

    if (!rows || rows.length === 0) {
        console.warn("⚠️ MarketDetector: struktur tidak dikenal:", JSON.stringify(rawData).substring(0, 300));
        return { raw: rawData, rows: [], unknown: true };
    }
    return { raw: rawData, rows };
}

// ===== MARKET DETECTOR CHARTS =====
function renderMDCharts(data) {
    const wrapper = document.getElementById('mdChartWrapper');
    if (!wrapper) return;

    const buyRows  = data.buyRows  || [];
    const sellRows = data.sellRows || [];
    if (!buyRows.length && !sellRows.length) {
        wrapper.style.display = 'none';
        return;
    }
    wrapper.style.display = 'flex';

    const pf = v => parseFloat(v) || 0;

    // Build unified broker list sorted by |net value|
    const brokerMap = {};
    buyRows.forEach(r => {
        const k = r.netbs_broker_code;
        if (!brokerMap[k]) brokerMap[k] = { code: k, type: r.type || '-', buy: 0, sell: 0 };
        brokerMap[k].buy += pf(r.bval);
    });
    sellRows.forEach(r => {
        const k = r.netbs_broker_code;
        if (!brokerMap[k]) brokerMap[k] = { code: k, type: r.type || '-', buy: 0, sell: 0 };
        brokerMap[k].sell += pf(r.sval); // sval is already negative from API
    });

    const brokers = Object.values(brokerMap)
        .map(b => ({ ...b, net: b.buy + b.sell }))
        .sort((a, b) => b.net - a.net)
        .slice(0, 15); // top 15

    // ---- CHART 1: Horizontal Bar — Net Flow per Broker ----
    const netCtx = document.getElementById('mdNetChart');
    if (netCtx) {
        if (appState.mdNetChartInst) { appState.mdNetChartInst.destroy(); appState.mdNetChartInst = null; }

        const labels = brokers.map(b => b.code);
        const netVals = brokers.map(b => b.net);
        const bgColors = netVals.map(v => v >= 0 ? 'rgba(0,229,160,0.75)' : 'rgba(255,77,109,0.75)');
        const bdColors = netVals.map(v => v >= 0 ? '#00e5a0' : '#ff4d6d');

        appState.mdNetChartInst = new Chart(netCtx, {
            type: 'bar',
            data: {
                labels,
                datasets: [{
                    label: 'Net Value',
                    data: netVals,
                    backgroundColor: bgColors,
                    borderColor: bdColors,
                    borderWidth: 1,
                    borderRadius: 3,
                }]
            },
            options: {
                indexAxis: 'y',
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            label: ctx => ' ' + fmtVal(ctx.parsed.x),
                            afterLabel: ctx => {
                                const b = brokers[ctx.dataIndex];
                                return ` ${b.type} | Buy: ${fmtVal(b.buy)} | Sell: ${fmtVal(b.sell)}`;
                            }
                        },
                        backgroundColor: '#1a1d2e',
                        borderColor: 'rgba(255,255,255,0.1)',
                        borderWidth: 1,
                        titleColor: '#fff',
                        bodyColor: '#aaa',
                        padding: 10
                    }
                },
                scales: {
                    x: {
                        grid: { color: 'rgba(255,255,255,0.04)' },
                        ticks: {
                            color: '#666',
                            font: { size: 10 },
                            callback: v => fmtVal(v)
                        },
                        border: { color: 'rgba(255,255,255,0.06)' }
                    },
                    y: {
                        grid: { display: false },
                        ticks: {
                            color: '#ccc',
                            font: { family: "'Space Mono', monospace", size: 10 }
                        },
                        border: { color: 'rgba(255,255,255,0.06)' }
                    }
                }
            }
        });
    }

    // ---- CHART 2: Doughnut — Investor Type breakdown ----
    const typeCtx = document.getElementById('mdTypeChart');
    if (typeCtx) {
        if (appState.mdTypeChartInst) { appState.mdTypeChartInst.destroy(); appState.mdTypeChartInst = null; }

        // Aggregate net by type
        const typeAgg = {};
        Object.values(brokerMap).forEach(b => {
            const t = b.type;
            if (!typeAgg[t]) typeAgg[t] = 0;
            typeAgg[t] += (b.buy + b.sell);
        });

        const typeColors = {
            'Asing':      'rgba(59,130,246,0.8)',
            'Lokal':      'rgba(167,139,250,0.8)',
            'Pemerintah': 'rgba(245,158,11,0.8)',
        };
        const typeBorderColors = {
            'Asing':      '#3b82f6',
            'Lokal':      '#a78bfa',
            'Pemerintah': '#f59e0b',
        };

        const typeLabels = Object.keys(typeAgg);
        const typeVals   = typeLabels.map(t => Math.abs(typeAgg[t])); // absolute for donut size
        const typeNets   = typeLabels.map(t => typeAgg[t]);
        const typeBg     = typeLabels.map(t => typeColors[t]   || 'rgba(128,128,128,0.6)');
        const typeBorder = typeLabels.map(t => typeBorderColors[t] || '#888');

        appState.mdTypeChartInst = new Chart(typeCtx, {
            type: 'doughnut',
            data: {
                labels: typeLabels,
                datasets: [{
                    data: typeVals,
                    backgroundColor: typeBg,
                    borderColor: typeBorder,
                    borderWidth: 2,
                    hoverOffset: 6
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '65%',
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            label: ctx => ` ${ctx.label}: ${fmtVal(typeNets[ctx.dataIndex])}`,
                        },
                        backgroundColor: '#1a1d2e',
                        borderColor: 'rgba(255,255,255,0.1)',
                        borderWidth: 1,
                        titleColor: '#fff',
                        bodyColor: '#aaa',
                        padding: 10
                    }
                }
            }
        });

        // Custom legend
        const legendEl = document.getElementById('mdTypeChartLegend');
        if (legendEl) {
            legendEl.innerHTML = typeLabels.map((t, i) => {
                const net = typeNets[i];
                const cls = net >= 0 ? 'val-pos' : 'val-neg';
                const sign = net >= 0 ? '+' : '';
                return `<div style="display:flex;align-items:center;justify-content:space-between;gap:8px;">
                    <span style="display:flex;align-items:center;gap:6px;">
                        <span style="width:10px;height:10px;border-radius:50%;background:${typeBg[i]};display:inline-block;flex-shrink:0;"></span>
                        <span style="color:var(--text2);">${t}</span>
                    </span>
                    <span class="${cls}" style="font-weight:600;font-size:11px;">${sign}${fmtVal(net)}</span>
                </div>`;
            }).join('');
        }
    }
}

function renderMarketDetectorTable(data, stockCode) {
    const container = document.getElementById('mdTableBody');
    const titleEl   = document.getElementById('mdStockTitle');
    const statsEl   = document.getElementById('mdStats');
    const thead     = document.getElementById('mdTableHead');
    if (!container) return;

    if (titleEl) titleEl.textContent = `🔬 Market Detector — ${stockCode.toUpperCase()}`;

    if (!data || data.unknown) {
        if (thead) thead.innerHTML = '';
        container.innerHTML = `<tr><td colspan="99" style="color:#f5a623;padding:16px;font-size:12px;">
            <strong>⚠️ Struktur response tidak dikenal. Raw:</strong><br>
            <pre style="font-size:10px;overflow:auto;max-height:200px;">${JSON.stringify(data?.raw || data, null, 2)}</pre>
        </td></tr>`;
        return;
    }

    const pf = v => parseFloat(v) || 0;
    const accdistCls = s => s && (s.includes('Acc')) ? 'val-pos' : s && s.includes('Dist') ? 'val-neg' : 'val-neu';
    const typeBadge = t => {
        if (t === 'Asing')      return '<span class="md-type-badge asing">Asing</span>';
        if (t === 'Pemerintah') return '<span class="md-type-badge pem">Pem</span>';
        return '<span class="md-type-badge lokal">Lokal</span>';
    };
    const fmtDate = d => /^\d{8}$/.test(d) ? `${d.slice(0,4)}-${d.slice(4,6)}-${d.slice(6,8)}` : (d || '-');
    const signStr = v => v >= 0 ? '+' : '';

    // ==========================================================
    // 1. BANDAR DETECTOR STATS
    // ==========================================================
    if (statsEl) {
        if (data.bandarDetector) {
            const bd = data.bandarDetector;
            const acCls = accdistCls(bd.broker_accdist);

            const groups = [
                { label: 'Top 1',      d: bd.top1  },
                { label: 'Top 3',      d: bd.top3  },
                { label: 'Top 5',      d: bd.top5  },
                { label: 'Top 10',     d: bd.top10 },
                { label: 'Avg/Broker', d: bd.avg   },
                { label: 'Avg 5D',     d: bd.avg5  },
            ];
            const maxAmt = Math.max(...groups.map(g => Math.abs(g.d?.amount || 0)), 1);

            const groupRows = groups.filter(g => g.d).map(g => {
                const amt    = g.d.amount || 0;
                const pct    = ((g.d.percent || 0) * 100).toFixed(2);
                const vol    = fmtNum(g.d.vol || 0);
                const ac     = g.d.accdist || '-';
                const cls    = accdistCls(ac);
                const barPct = Math.min(100, Math.abs(amt) / maxAmt * 100).toFixed(1);
                const bColor = amt >= 0 ? 'var(--green)' : 'var(--red)';
                return `<tr class="md-group-row">
                    <td style="font-family:'Space Mono',monospace;font-size:11px;color:var(--text2);white-space:nowrap;padding:5px 8px;">${g.label}</td>
                    <td class="${cls}" style="font-size:11px;padding:5px 8px;">${ac}</td>
                    <td class="${amt >= 0 ? 'val-pos' : 'val-neg'}" style="font-size:12px;font-weight:600;padding:5px 8px;text-align:right;">${signStr(amt)}${fmtVal(amt)}</td>
                    <td style="font-size:11px;color:var(--text2);padding:5px 8px;text-align:right;">${signStr(pct)}${pct}%</td>
                    <td style="font-size:11px;color:var(--text2);padding:5px 8px;text-align:right;">${signStr(vol)}${vol} lot</td>
                    <td style="padding:5px 8px;min-width:120px;">
                        <div style="height:5px;border-radius:3px;background:var(--bg3);overflow:hidden;">
                            <div style="height:100%;width:${barPct}%;background:${bColor};border-radius:3px;"></div>
                        </div>
                    </td>
                </tr>`;
            }).join('');

            statsEl.innerHTML = `
            <div style="display:flex;flex-wrap:wrap;gap:10px;width:100%;margin-bottom:14px;">
                <div class="md-stat-card"><div class="md-stat-label">Avg Price</div><div class="md-stat-val">${(bd.average||0).toFixed(0)}</div></div>
                <div class="md-stat-card"><div class="md-stat-label">Broker Status</div><div class="md-stat-val ${acCls}">${bd.broker_accdist||'-'}</div></div>
                <div class="md-stat-card"><div class="md-stat-label">Total Value</div><div class="md-stat-val">${fmtVal(bd.value||0)}</div></div>
                <div class="md-stat-card"><div class="md-stat-label">Total Volume</div><div class="md-stat-val">${fmtNum(bd.volume||0)}</div></div>
                <div class="md-stat-card"><div class="md-stat-label">Total Buyer</div><div class="md-stat-val val-pos">${bd.total_buyer||0}</div></div>
                <div class="md-stat-card"><div class="md-stat-label">Total Seller</div><div class="md-stat-val val-neg">${bd.total_seller||0}</div></div>
                <div class="md-stat-card"><div class="md-stat-label"># Broker</div><div class="md-stat-val">${bd.number_broker_buysell||0}</div></div>
                ${data.from ? `<div class="md-stat-card" style="border-color:rgba(100,100,200,0.25);"><div class="md-stat-label">Periode</div><div class="md-stat-val" style="font-size:12px;">${data.from} → ${data.to||'?'}</div></div>` : ''}
            </div>
            <div style="width:100%;background:var(--bg2);border:1px solid var(--border);border-radius:8px;padding:14px;">
                <div style="font-size:10px;color:var(--text3);font-family:'Space Mono',monospace;letter-spacing:1.5px;text-transform:uppercase;margin-bottom:10px;">📊 Analisis Broker Group — Net Acc/Dist</div>
                <table style="width:100%;border-collapse:collapse;">
                    <thead><tr style="font-size:10px;color:var(--text3);font-family:'Space Mono',monospace;">
                        <th style="padding:4px 8px;text-align:left;">Group</th>
                        <th style="padding:4px 8px;text-align:left;">Status</th>
                        <th style="padding:4px 8px;text-align:right;">Net Amount</th>
                        <th style="padding:4px 8px;text-align:right;">%</th>
                        <th style="padding:4px 8px;text-align:right;">Net Lot</th>
                        <th style="padding:4px 8px;min-width:120px;">Bar</th>
                    </tr></thead>
                    <tbody>${groupRows}</tbody>
                </table>
            </div>`;
        } else {
            statsEl.innerHTML = '';
        }
    }

    // ==========================================================
    // 2. PROSES ROWS
    // ==========================================================
    const buyRaw  = data.buyRows  || [];
    const sellRaw = data.sellRows || [];

    if (!buyRaw.length && !sellRaw.length) {
        if (thead) thead.innerHTML = '';
        container.innerHTML = '<tr><td colspan="99" style="text-align:center;color:#888;padding:32px;">Tidak ada data broker untuk periode ini</td></tr>';
        return;
    }

    const mkBuy  = r => ({ side:'BUY',  broker:r.netbs_broker_code, type:r.type||'-',
        netLot:pf(r.blot), netValue:pf(r.bval), cumLot:pf(r.blotv), cumValue:pf(r.bvalv),
        avgPrice:pf(r.netbs_buy_avg_price), freq:pf(r.freq), date:fmtDate(r.netbs_date) });
    const mkSell = r => ({ side:'SELL', broker:r.netbs_broker_code, type:r.type||'-',
        netLot:pf(r.slot), netValue:pf(r.sval), cumLot:pf(r.slotv), cumValue:pf(r.svalv),
        avgPrice:pf(r.netbs_sell_avg_price), freq:pf(r.freq), date:fmtDate(r.netbs_date) });

    const buyRows  = buyRaw.map(mkBuy).sort((a,b) => b.netValue - a.netValue);
    const sellRows = sellRaw.map(mkSell).sort((a,b) => a.netValue - b.netValue);

    // ==========================================================
    // 3. INVESTOR TYPE BREAKDOWN
    // ==========================================================
    const allP = [...buyRows, ...sellRows];
    const typeMap = {};
    allP.forEach(r => {
        if (!typeMap[r.type]) typeMap[r.type] = { buyVal:0, sellVal:0, buyLot:0, sellLot:0, buyCount:0, sellCount:0 };
        const t = typeMap[r.type];
        if (r.side==='BUY')  { t.buyVal+=r.netValue;  t.buyLot+=r.netLot;  t.buyCount++;  }
        else                  { t.sellVal+=r.netValue; t.sellLot+=r.netLot; t.sellCount++; }
    });

    const typeBreakdown = Object.entries(typeMap).map(([type, d]) => {
        const net    = d.buyVal + d.sellVal;
        const netLot = d.buyLot + d.sellLot;
        const nCls   = net >= 0 ? 'val-pos' : 'val-neg';
        const nlCls  = netLot >= 0 ? 'val-pos' : 'val-neg';
        return `<div class="md-type-card">
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;">
                ${typeBadge(type)}
                <span style="font-size:10px;color:var(--text3);">${d.buyCount}B / ${d.sellCount}S</span>
            </div>
            <div style="font-size:11px;margin:3px 0;">Buy&nbsp;<span class="val-pos" style="font-weight:600;">${fmtVal(d.buyVal)}</span></div>
            <div style="font-size:11px;margin:3px 0;">Sell&nbsp;<span class="val-neg" style="font-weight:600;">${fmtVal(d.sellVal)}</span></div>
            <div style="height:1px;background:var(--border);margin:8px 0;"></div>
            <div class="${nCls}" style="font-size:13px;font-weight:700;">Net ${fmtVal(net)}</div>
            <div class="${nlCls}" style="font-size:11px;">${signStr(netLot)}${fmtNum(netLot)} lot</div>
        </div>`;
    }).join('');

    // ==========================================================
    // 4. RENDER TABLE ROWS
    // ==========================================================
    const maxBuyVal  = Math.max(...buyRows.map(r  => Math.abs(r.netValue)), 1);
    const maxSellVal = Math.max(...sellRows.map(r => Math.abs(r.netValue)), 1);

    const mkRow = (r, maxVal) => {
        const nvCls  = r.netValue >= 0 ? 'val-pos' : 'val-neg';
        const nlCls  = r.netLot  >= 0 ? 'val-pos' : 'val-neg';
        const barPct = Math.min(100, Math.abs(r.netValue)/maxVal*100).toFixed(1);
        const bColor = r.side==='BUY' ? 'var(--green)' : 'var(--red)';
        return `<tr>
            <td><strong style="font-family:'Space Mono',monospace;font-size:12px;">${r.broker}</strong></td>
            <td>${typeBadge(r.type)}</td>
            <td class="${nlCls}" style="font-size:12px;">${signStr(r.netLot)}${fmtNum(r.netLot)}</td>
            <td>
                <div style="display:flex;align-items:center;gap:6px;">
                    <span class="${nvCls}" style="font-size:12px;font-weight:600;white-space:nowrap;">${signStr(r.netValue)}${fmtVal(r.netValue)}</span>
                    <div style="flex:1;min-width:40px;height:4px;border-radius:2px;background:var(--bg3);overflow:hidden;">
                        <div style="height:100%;width:${barPct}%;background:${bColor};border-radius:2px;"></div>
                    </div>
                </div>
            </td>
            <td style="color:var(--text2);font-size:11px;">${fmtNum(r.cumLot)}</td>
            <td style="color:var(--text2);font-size:11px;">${fmtVal(r.cumValue)}</td>
            <td style="font-size:12px;">${r.avgPrice.toFixed(0)}</td>
            <td style="color:var(--text2);font-size:11px;">${fmtNum(r.freq)}</td>
            <td style="color:var(--text3);font-size:10px;">${r.date}</td>
        </tr>`;
    };

    const colHeader = `<tr>
        <th>Broker</th><th>Type</th><th>Net Lot</th>
        <th>Net Value</th><th>Cum Lot</th><th>Cum Value</th>
        <th>Avg Price</th><th>Freq</th><th>Tanggal</th>
    </tr>`;

    if (thead) thead.innerHTML = '';

    container.innerHTML = `<tr><td colspan="99" style="padding:0;">
        <!-- Investor Type Breakdown -->
        <div style="display:flex;gap:10px;flex-wrap:wrap;padding:12px 0 14px;">${typeBreakdown}</div>

        <!-- Buy Table -->
        <div style="margin-bottom:16px;">
            <div style="font-size:11px;font-family:'Space Mono',monospace;color:var(--green);letter-spacing:1.5px;text-transform:uppercase;margin-bottom:8px;padding:6px 0;border-bottom:1px solid rgba(0,229,160,0.2);">
                🟢 Net Buyer — ${buyRows.length} Broker
            </div>
            <div style="overflow-x:auto;border-radius:6px;border:1px solid rgba(0,229,160,0.1);">
                <table style="width:100%;border-collapse:collapse;">
                    <thead style="background:rgba(0,229,160,0.06);">${colHeader}</thead>
                    <tbody>${buyRows.map(r => mkRow(r, maxBuyVal)).join('')}</tbody>
                </table>
            </div>
        </div>

        <!-- Sell Table -->
        <div>
            <div style="font-size:11px;font-family:'Space Mono',monospace;color:var(--red);letter-spacing:1.5px;text-transform:uppercase;margin-bottom:8px;padding:6px 0;border-bottom:1px solid rgba(255,77,109,0.2);">
                🔴 Net Seller — ${sellRows.length} Broker
            </div>
            <div style="overflow-x:auto;border-radius:6px;border:1px solid rgba(255,77,109,0.1);">
                <table style="width:100%;border-collapse:collapse;">
                    <thead style="background:rgba(255,77,109,0.06);">${colHeader}</thead>
                    <tbody>${sellRows.map(r => mkRow(r, maxSellVal)).join('')}</tbody>
                </table>
            </div>
        </div>
    </td></tr>`;
}

async function loadMarketDetector() {
    const stockCode = document.getElementById('mdStockCode')?.value?.trim() || '';
    if (!stockCode) return; // Jangan load jika kode kosong

    const fromDate = document.getElementById('mdFromDate')?.value || '';
    const toDate = document.getElementById('mdToDate')?.value || '';
    const investorType = document.getElementById('mdInvestorType')?.value || 'INVESTOR_TYPE_ALL';
    const transactionType = document.getElementById('mdTransactionType')?.value || 'TRANSACTION_TYPE_NET';
    const marketBoard = document.getElementById('mdMarketBoard')?.value || 'MARKET_BOARD_REGULER';
    const limit = document.getElementById('mdLimit')?.value || 5;

    // Loading indicator di title
    const titleEl = document.getElementById('mdStockTitle');
    if (titleEl) titleEl.textContent = `⏳ Loading ${stockCode.toUpperCase()}...`;

    const rawData = await fetchMarketDetector(stockCode, { fromDate, toDate, investorType, transactionType, marketBoard, limit });
    appState.marketDetectorData = rawData;

    const processed = processMarketDetectorData(rawData);
    renderMarketDetectorTable(processed, stockCode);
    renderMDCharts(processed);
}