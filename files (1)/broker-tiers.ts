/**
 * BANDARSCOPE — Broker Tier Registry
 *
 * Kasta 1 — Retail (Pasukan Semut)
 *   Jutaan investor ritel, modal terbatas, mudah panik & FOMO.
 *   Jika mendominasi buyer → harga fluktuatif & fragile.
 *
 * Kasta 2 — Asing & Institusi (The Whales)
 *   Dana kelolaan triliunan, riset mendalam, orientasi jangka menengah-panjang.
 *   Jika konsisten cicil di Top Buyer → sinyal akumulasi kuat.
 *
 * Kasta 3 — Bandar Lokal & Market Maker
 *   Penggerak utama saham lapis 2–3, sangat agresif, bisa buat ARA/ARB sesuka hati.
 *   Harus dilacak NET-nya — bukan gross-nya.
 */

export type BrokerTier = 1 | 2 | 3

export interface BrokerInfo {
    code: string
    name: string
    tier: BrokerTier
    tierLabel: string
    isForeign: boolean
    isGovernment: boolean
    description: string
}

const BROKER_REGISTRY: Record<string, BrokerInfo> = {
    // ─── KASTA 1 — RETAIL ────────────────────────────────────────────────────
    YP: { code: 'YP', name: 'Mirae Asset Sekuritas', tier: 1, tierLabel: 'Retail', isForeign: false, isGovernment: false, description: 'Platform retail terbesar, dominan di volume harian' },
    PD: { code: 'PD', name: 'Indo Premier Sekuritas', tier: 1, tierLabel: 'Retail', isForeign: false, isGovernment: false, description: 'Retail populer dengan frekuensi transaksi tinggi' },
    CC: { code: 'CC', name: 'Mandiri Sekuritas', tier: 1, tierLabel: 'Retail', isForeign: false, isGovernment: true, description: 'Sekuritas BUMN, campuran retail & institusi pemerintah' },
    NI: { code: 'NI', name: 'BNI Sekuritas', tier: 1, tierLabel: 'Retail', isForeign: false, isGovernment: true, description: 'Sekuritas BUMN, banyak nasabah retail' },
    XC: { code: 'XC', name: 'Ajaib Sekuritas', tier: 1, tierLabel: 'Retail', isForeign: false, isGovernment: false, description: 'Platform retail millennial, frekuensi sangat tinggi' },
    XL: { code: 'XL', name: 'Stockbit Sekuritas', tier: 1, tierLabel: 'Retail', isForeign: false, isGovernment: false, description: 'Retail aktif, frekuensi tinggi namun lot kecil-kecil' },
    MX: { code: 'MX', name: 'Macquarie Sekuritas', tier: 1, tierLabel: 'Retail', isForeign: false, isGovernment: false, description: 'Retail dengan basis nasabah aktif' },
    GR: { code: 'GR', name: 'Panin Sekuritas', tier: 1, tierLabel: 'Retail', isForeign: false, isGovernment: false, description: 'Retail konvensional' },
    OD: { code: 'OD', name: 'Trimegah Sekuritas', tier: 1, tierLabel: 'Retail', isForeign: false, isGovernment: false, description: 'Retail konvensional, pemerintah daerah' },
    AF: { code: 'AF', name: 'Harita Sekuritas', tier: 1, tierLabel: 'Retail', isForeign: false, isGovernment: false, description: 'Retail dengan nasabah aktif' },
    LS: { code: 'LS', name: 'Reliance Sekuritas', tier: 1, tierLabel: 'Retail', isForeign: false, isGovernment: false, description: 'Retail lokal' },
    BQ: { code: 'BQ', name: 'Sinarmas Sekuritas', tier: 1, tierLabel: 'Retail', isForeign: false, isGovernment: false, description: 'Retail & reksadana Sinarmas' },
    ZR: { code: 'ZR', name: 'OCBC Sekuritas', tier: 1, tierLabel: 'Retail', isForeign: false, isGovernment: false, description: 'Retail perbankan OCBC' },
    BB: { code: 'BB', name: 'Maybank Sekuritas', tier: 1, tierLabel: 'Retail', isForeign: false, isGovernment: false, description: 'Retail Maybank' },
    SQ: { code: 'SQ', name: 'Surya Fajar Sekuritas', tier: 1, tierLabel: 'Retail', isForeign: false, isGovernment: false, description: 'Retail aktif saham lapis 2–3' },
    SS: { code: 'SS', name: 'Phillip Sekuritas', tier: 1, tierLabel: 'Retail', isForeign: false, isGovernment: false, description: 'Retail & institusi kecil' },
    KI: { code: 'KI', name: 'Ciptadana Sekuritas', tier: 1, tierLabel: 'Retail', isForeign: false, isGovernment: false, description: 'Retail konvensional' },
    EP: { code: 'EP', name: 'MNC Sekuritas', tier: 1, tierLabel: 'Retail', isForeign: false, isGovernment: false, description: 'Retail grup MNC' },
    DX: { code: 'DX', name: 'Daewoo Sekuritas', tier: 1, tierLabel: 'Retail', isForeign: false, isGovernment: false, description: 'Retail lokal' },
    AI: { code: 'AI', name: 'UBS Sekuritas', tier: 1, tierLabel: 'Retail', isForeign: false, isGovernment: false, description: 'Nasabah retail UBS lokal' },
    AG: { code: 'AG', name: 'Semesta Indovest', tier: 1, tierLabel: 'Retail', isForeign: false, isGovernment: false, description: 'Retail aktif' },
    AZ: { code: 'AZ', name: 'Waterfront Sekuritas', tier: 1, tierLabel: 'Retail', isForeign: false, isGovernment: false, description: 'Retail lokal' },
    IF: { code: 'IF', name: 'Samuel Sekuritas', tier: 1, tierLabel: 'Retail', isForeign: false, isGovernment: false, description: 'Retail aktif' },
    CP: { code: 'CP', name: 'Valbury Sekuritas', tier: 1, tierLabel: 'Retail', isForeign: false, isGovernment: false, description: 'Retail lokal' },

    // ─── KASTA 2 — ASING & INSTITUSI (WHALES) ────────────────────────────────
    AK: { code: 'AK', name: 'UBS Securities Asia', tier: 2, tierLabel: 'Whale', isForeign: true, isGovernment: false, description: 'Institusi asing besar, sering jadi sinyal arah pasar' },
    BK: { code: 'BK', name: 'JP Morgan Securities', tier: 2, tierLabel: 'Whale', isForeign: true, isGovernment: false, description: 'Asing institusional besar, orientasi jangka menengah' },
    ZP: { code: 'ZP', name: 'Kim Eng Sekuritas', tier: 2, tierLabel: 'Whale', isForeign: true, isGovernment: false, description: 'Asing institusional, grup Maybank investment' },
    RX: { code: 'RX', name: 'Macquarie Capital', tier: 2, tierLabel: 'Whale', isForeign: true, isGovernment: false, description: 'Fund manager asing besar' },
    KZ: { code: 'KZ', name: 'CLSA Indonesia', tier: 2, tierLabel: 'Whale', isForeign: true, isGovernment: false, description: 'Asing institusional Asia terkemuka' },
    CS: { code: 'CS', name: 'Credit Suisse', tier: 2, tierLabel: 'Whale', isForeign: true, isGovernment: false, description: 'Institusi asing global' },
    DB: { code: 'DB', name: 'Deutsche Bank', tier: 2, tierLabel: 'Whale', isForeign: true, isGovernment: false, description: 'Institusi asing global' },
    ML: { code: 'ML', name: 'Merrill Lynch', tier: 2, tierLabel: 'Whale', isForeign: true, isGovernment: false, description: 'Institusi asing global, nasabah HNW' },
    MS: { code: 'MS', name: 'Morgan Stanley', tier: 2, tierLabel: 'Whale', isForeign: true, isGovernment: false, description: 'Institusi asing global tier-1' },
    YU: { code: 'YU', name: 'CIMB Sekuritas', tier: 2, tierLabel: 'Whale', isForeign: true, isGovernment: false, description: 'Asing regional besar, sering combine institusi & reksadana' },
    GW: { code: 'GW', name: 'Goldman Sachs', tier: 2, tierLabel: 'Whale', isForeign: true, isGovernment: false, description: 'Institusi asing tier-1 global' },
    UB: { code: 'UB', name: 'UOB Kay Hian', tier: 2, tierLabel: 'Whale', isForeign: true, isGovernment: false, description: 'Asing institusional Asia' },
    EM: { code: 'EM', name: 'Bahana Sekuritas', tier: 2, tierLabel: 'Whale', isForeign: false, isGovernment: true, description: 'BUMN investasi, sering mewakili dana institusional besar' },
    MU: { code: 'MU', name: 'Manulife Aset Manajemen', tier: 2, tierLabel: 'Whale', isForeign: true, isGovernment: false, description: 'Fund manager asing besar, reksadana' },

    // ─── KASTA 3 — BANDAR LOKAL & MARKET MAKER ───────────────────────────────
    MG: { code: 'MG', name: 'Semesta Ciptapermai', tier: 3, tierLabel: 'Bandar', isForeign: false, isGovernment: false, description: 'Raja scalper & market maker saham lapis 2–3. Sangat agresif.' },
    DR: { code: 'DR', name: 'OSO Sekuritas', tier: 3, tierLabel: 'Bandar', isForeign: false, isGovernment: false, description: 'Bandar lokal aktif di saham gorengan' },
    YJ: { code: 'YJ', name: 'Lautandhana Sekuritas', tier: 3, tierLabel: 'Bandar', isForeign: false, isGovernment: false, description: 'Market maker aktif saham lapis 2–3' },
    GI: { code: 'GI', name: 'Panca Global Sekuritas', tier: 3, tierLabel: 'Bandar', isForeign: false, isGovernment: false, description: 'Bandar lokal aktif' },
    KK: { code: 'KK', name: 'Profindo Sekuritas', tier: 3, tierLabel: 'Bandar', isForeign: false, isGovernment: false, description: 'Bandar lokal, aktif crossing & negosiasi' },
    OX: { code: 'OX', name: 'Mentari Sekuritas', tier: 3, tierLabel: 'Bandar', isForeign: false, isGovernment: false, description: 'Bandar lokal aktif' },
    HD: { code: 'HD', name: 'Henan Putihrai', tier: 3, tierLabel: 'Bandar', isForeign: false, isGovernment: false, description: 'Bandar lokal, kadang memakai nama asing' },
    LG: { code: 'LG', name: 'Erdikha Elit Sekuritas', tier: 3, tierLabel: 'Bandar', isForeign: false, isGovernment: false, description: 'Market maker saham lapis 2–3' },
}

/** Dapatkan info tier satu broker. Jika tidak ditemukan, default Retail */
export function getBrokerInfo(code: string): BrokerInfo {
    const upper = code.toUpperCase()
    return (
        BROKER_REGISTRY[upper] ?? {
            code: upper,
            name: upper,
            tier: 1,
            tierLabel: 'Retail',
            isForeign: false,
            isGovernment: false,
            description: 'Broker tidak terdaftar — diasumsikan retail',
        }
    )
}

export function getBrokerTier(code: string): BrokerTier {
    return getBrokerInfo(code).tier
}

/** Label singkat per tier untuk UI */
export const TIER_LABELS: Record<BrokerTier, string> = {
    1: 'Retail',
    2: 'Whale',
    3: 'Bandar',
}

/** Emoji icon per tier */
export const TIER_ICONS: Record<BrokerTier, string> = {
    1: '🐜',
    2: '🐳',
    3: '🦈',
}

export const ALL_BROKERS = Object.values(BROKER_REGISTRY)
