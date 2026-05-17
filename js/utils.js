// =============================================
// UTILS — Formatting, UI helpers, Debounce
// =============================================

function setLoading(state) { appState.isLoading = state; }

function showError(msg)   { console.error(msg); }
function showSuccess(msg) { console.log(msg); }

/** Format rupiah value: +Rp1.23M, -Rp500jt, etc. */
function fmtVal(v) {
    const abs = Math.abs(v), sign = v < 0 ? '-' : '+';
    if (abs >= 1e12) return sign + 'Rp' + (abs / 1e12).toFixed(2) + 'T';
    if (abs >= 1e9)  return sign + 'Rp' + (abs / 1e9).toFixed(2) + 'M';
    if (abs >= 1e6)  return sign + 'Rp' + (abs / 1e6).toFixed(1) + 'jt';
    return sign + 'Rp' + abs.toLocaleString();
}

/** Format number: 1.2jt, 500k, 123 */
function fmtNum(v) {
    if (Math.abs(v) >= 1e6) return (v / 1e6).toFixed(1) + 'jt';
    if (Math.abs(v) >= 1e3) return (v / 1e3).toFixed(1) + 'k';
    return v.toLocaleString();
}

/** Format lot with sign */
function fmtLot(v) { return (v > 0 ? '+' : '') + v.toLocaleString(); }

/** AccDist badge HTML */
function accdistBadge(ac) {
    let cls = 'neutral';
    if (ac.includes('Strong Acc'))  cls = 'acc-strong';
    else if (ac.includes('Weak Acc'))  cls = 'acc-weak';
    else if (ac.includes('Acc'))  cls = 'acc';
    else if (ac.includes('Strong Dist')) cls = 'dist-strong';
    else if (ac.includes('Weak Dist'))  cls = 'dist-weak';
    else if (ac.includes('Dist')) cls = 'dist';
    return `<span class="accdist-badge ${cls}">${ac}</span>`;
}

/** Score badge HTML */
function scoreBadge(s) {
    const cls = s >= 7 ? 'score-high' : s >= 5 ? 'score-med' : 'score-low';
    return `<div class="bandar-score ${cls}">${s}</div>`;
}

/** Debounce: delay function call until after `delay` ms of silence */
function debounce(fn, delay) {
    let timer;
    return (...args) => { clearTimeout(timer); timer = setTimeout(() => fn(...args), delay); };
}
