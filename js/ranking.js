// =============================================
// RANKING — Broker Top Ranking by Trading Value
// =============================================

async function loadRanking() {
    const today = new Date().toISOString().split('T')[0];

    try {
        // Fetch broker ranking data
        const rankingData = await fetchBrokerRanking({
            fromDate: today,
            toDate: today,
            marketType: 'MARKET_TYPE_ALL',
            eodOnly: true
        });

        if (rankingData?.data?.list) {
            appState.brokerRankingData = rankingData.data;
            renderRanking(rankingData.data);
            appState.brokerRankingLoaded = true;
        } else {
            showError('❌ No ranking data available');
        }
    } catch (e) {
        console.error('❌ Load ranking error:', e);
        showError(`Failed to load broker ranking: ${e.message}`);
    }
}

function renderRanking(data) {
    if (!data?.list) return;

    const brokers = data.list;
    const date = data.date?.idx || 'N/A';

    // Format function untuk reusable
    const formatVal = v => {
        const n = Math.abs(v);
        if (n >= 1e12) return (v / 1e12).toFixed(1) + 'T';
        if (n >= 1e9) return (v / 1e9).toFixed(1) + 'M';
        if (n >= 1e6) return (v / 1e6).toFixed(1) + 'jt';
        return v.toLocaleString('id-ID');
    };

    // ---- Summary Cards ----
    // Find top net buyer & seller
    const topBuyer = brokers.reduce((a, b) => {
        const aNet = parseInt(a.net_value || 0);
        const bNet = parseInt(b.net_value || 0);
        return aNet > bNet ? a : b;
    }, brokers[0] || {});

    const topSeller = brokers.reduce((a, b) => {
        const aNet = parseInt(a.net_value || 0);
        const bNet = parseInt(b.net_value || 0);
        return aNet < bNet ? a : b;
    }, brokers[0] || {});

    // Group by broker group & calculate net flows
    const flowByGroup = {};
    brokers.forEach(b => {
        const group = b.group || 'UNKNOWN';
        if (!flowByGroup[group]) {
            flowByGroup[group] = {
                buy: 0,
                sell: 0,
                net: 0,
                count: 0
            };
        }
        flowByGroup[group].buy += parseInt(b.buy_value || 0);
        flowByGroup[group].sell += parseInt(b.sell_value || 0);
        flowByGroup[group].count += 1;
    });

    Object.keys(flowByGroup).forEach(g => {
        flowByGroup[g].net = flowByGroup[g].buy - flowByGroup[g].sell;
    });

    const asingFlow = (flowByGroup['BROKER_GROUP_FOREIGN']?.net || 0);
    const lokalFlow = (flowByGroup['BROKER_GROUP_LOCAL']?.net || 0);
    const govFlow = (flowByGroup['BROKER_GROUP_GOVERNMENT']?.net || 0);

    // Update summary cards
    document.getElementById('r-top-buyer').textContent = topBuyer.code || 'N/A';
    document.getElementById('r-top-seller').textContent = topSeller.code || 'N/A';
    document.getElementById('r-asing').textContent = (asingFlow >= 0 ? '+' : '') + formatVal(asingFlow);
    document.getElementById('r-lokal').textContent = (lokalFlow >= 0 ? '+' : '') + formatVal(lokalFlow);

    // ---- Top 10 Lists ----
    // Use spread operator to avoid mutating original array
    const buyerSorted = [...brokers].sort((a, b) => (parseInt(b.net_value || 0) - parseInt(a.net_value || 0))).slice(0, 10);
    const sellerSorted = [...brokers].sort((a, b) => (parseInt(a.net_value || 0) - parseInt(b.net_value || 0))).slice(0, 10);

    const renderList = (items, container) => {
        const html = items.map((b, idx) => {
            const netVal = parseInt(b.net_value || 0);
            const totalVal = parseInt(b.total_value || 0);
            const volume = parseInt(b.total_volume || 0);
            const netSign = netVal >= 0 ? '+' : '';
            const netClass = netVal >= 0 ? 'pos' : 'neg';
            const groupIcon = b.group === 'BROKER_GROUP_FOREIGN' ? '🌍'
                : b.group === 'BROKER_GROUP_GOVERNMENT' ? '🏛️'
                    : '🏢';

            return `
            <div class="ranking-item">
                <div class="ranking-rank">#${idx + 1}</div>
                <div class="ranking-code">${groupIcon} ${b.code}</div>
                <div class="ranking-details">
                    <div class="ranking-name">${b.name}</div>
                    <div class="ranking-stats">
                        <span class="stat-badge">Vol: ${formatBigNumber(volume)}</span>
                        <span class="stat-badge">Val: ${formatBigNumber(totalVal)}</span>
                    </div>
                </div>
            </div>`;
        }).join('');

        const el = document.getElementById(container);
        if (el) el.innerHTML = html;
    };

    renderList(buyerSorted, 'rankBuyList');
    renderList(sellerSorted, 'rankSellList');

    // ---- Bar Chart: Top 10 Net Value ----
    renderBrokerChart(buyerSorted.slice(0, 10));
}

function renderBrokerChart(brokers) {
    const ctx = document.getElementById('brokerChart');
    if (!ctx) return;

    const labels = brokers.map(b => b.code);
    const netValues = brokers.map(b => parseInt(b.net_value || 0));
    const volumes = brokers.map(b => parseInt(b.total_volume || 0));

    // Normalize volume untuk scale yang lebih baik di chart
    const maxVolume = Math.max(...volumes);
    const normalizedVolumes = volumes.map(v => (v / maxVolume) * Math.max(...netValues.map(Math.abs)));

    const netColors = netValues.map(v => v >= 0 ? 'rgba(0, 229, 160, 0.7)' : 'rgba(255, 77, 109, 0.7)');
    const netBorderColors = netValues.map(v => v >= 0 ? 'rgba(0, 229, 160, 1)' : 'rgba(255, 77, 109, 1)');

    if (appState.brokerChartInst) {
        appState.brokerChartInst.destroy();
        appState.brokerChartInst = null;
    }

    appState.brokerChartInst = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Net Value',
                    data: netValues,
                    backgroundColor: netColors,
                    borderColor: netBorderColors,
                    borderWidth: 1,
                    borderRadius: 6,
                    order: 1
                },
                {
                    label: 'Volume (Normalized)',
                    data: normalizedVolumes,
                    backgroundColor: 'rgba(59, 130, 246, 0.3)',
                    borderColor: 'rgba(59, 130, 246, 0.8)',
                    borderWidth: 1,
                    borderRadius: 6,
                    order: 2
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            indexAxis: 'y',
            plugins: {
                legend: {
                    display: true,
                    position: 'top',
                    labels: {
                        color: '#888',
                        font: { size: 11 },
                        padding: 12
                    }
                },
                tooltip: {
                    callbacks: {
                        label: item => {
                            const dataset = item.dataset.label;
                            if (dataset === 'Net Value') {
                                const v = item.parsed.x;
                                const sign = v >= 0 ? '+' : '';
                                return `  ${sign}${formatBigNumber(v)}`;
                            } else {
                                const vol = brokers[item.dataIndex].total_volume;
                                return `  Volume: ${formatBigNumber(vol)}`;
                            }
                        }
                    },
                    backgroundColor: '#1a1d2e',
                    borderColor: 'rgba(255,255,255,0.1)',
                    borderWidth: 1,
                    titleColor: '#aaa',
                    bodyColor: '#ccc',
                    padding: 10,
                    displayColors: true
                }
            },
            scales: {
                x: {
                    grid: { color: 'rgba(255,255,255,0.04)' },
                    ticks: {
                        color: '#555',
                        font: { family: "'Space Mono', monospace", size: 9 },
                        callback: v => formatBigNumber(v)
                    },
                    border: { color: 'rgba(255,255,255,0.06)' }
                },
                y: {
                    grid: { display: false },
                    ticks: {
                        color: '#888',
                        font: { family: "'Space Mono', monospace", size: 10 }
                    },
                    border: { color: 'rgba(255,255,255,0.06)' }
                }
            }
        }
    });
}

function formatBigNumber(v) {
    const sign = v >= 0 ? '+' : '';
    const abs = Math.abs(v);
    if (abs >= 1e12) return sign + (v / 1e12).toFixed(1) + 'T';
    if (abs >= 1e9) return sign + (v / 1e9).toFixed(1) + 'M';
    if (abs >= 1e6) return sign + (v / 1e6).toFixed(1) + 'jt';
    return sign + abs.toLocaleString('id-ID');
}
