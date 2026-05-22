export type BrokerTier = 1 | 2 | 3

export interface BrokerTierInfo {
    code: string
    name: 'Retail' | 'Whale' | 'Bandar'
    tier: BrokerTier
    description: string
    isForeign: boolean
}

const RETAIL_CODES = ['YP', 'PD', 'CC', 'NI', 'XC', 'XL', 'MX', 'GR', 'KS', 'AF', 'LS', 'BQ', 'OD', 'ZR', 'FZ']
const WHALE_CODES = ['AK', 'BK', 'ZP', 'RX', 'KZ', 'CS', 'DB', 'ML', 'MS', 'JP', 'UB', 'GW', 'YU', 'EM', 'MU']
const BANDAR_CODES = ['MG', 'DR', 'YJ', 'GI', 'KK', 'OX', 'HD', 'LG']

function toInfo(code: string, tier: BrokerTier): BrokerTierInfo {
    if (tier === 1) {
        return {
            code,
            name: 'Retail',
            tier,
            description: 'Retail flow / pasukan semut',
            isForeign: false,
        }
    }

    if (tier === 2) {
        return {
            code,
            name: 'Whale',
            tier,
            description: 'Institusi / asing dominan',
            isForeign: true,
        }
    }

    return {
        code,
        name: 'Bandar',
        tier,
        description: 'Bandar lokal / market maker',
        isForeign: false,
    }
}

const entries: Array<[string, BrokerTier]> = [
    ...RETAIL_CODES.map((code) => [code, 1] as [string, BrokerTier]),
    ...WHALE_CODES.map((code) => [code, 2] as [string, BrokerTier]),
    ...BANDAR_CODES.map((code) => [code, 3] as [string, BrokerTier]),
]

export const BROKER_TIER_REGISTRY: Record<string, BrokerTierInfo> = Object.fromEntries(
    entries.map(([code, tier]) => [code, toInfo(code, tier)])
)

export const UNKNOWN_BROKER_TIER: BrokerTierInfo = {
    code: 'UNKNOWN',
    name: 'Retail',
    tier: 1,
    description: 'Belum terdaftar di broker tier registry',
    isForeign: false,
}

export function getBrokerTierInfo(code?: string): BrokerTierInfo {
    const normalizedCode = (code || '').trim().toUpperCase()
    if (!normalizedCode) return UNKNOWN_BROKER_TIER
    return BROKER_TIER_REGISTRY[normalizedCode] || UNKNOWN_BROKER_TIER
}

/** Compatibility helpers for older utilities expecting these names */
export function getBrokerInfo(code?: string) {
    const info = getBrokerTierInfo(code)
    return {
        code: info.code,
        name: info.name,
        tier: info.tier,
        tierLabel: info.name,
        isForeign: info.isForeign,
        isGovernment: false,
        description: info.description,
    }
}

export function getBrokerTier(code?: string): BrokerTier {
    return getBrokerTierInfo(code).tier
}
