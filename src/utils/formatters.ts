/**
 * Utilitas untuk format angka, persentase, mata uang, dan volume.
 */

/**
 * Format large numbers for display without abbreviations.
 */
export function formatBigNumber(value: number | string): string {
    const num = typeof value === 'string' ? parseFloat(value) : value
    if (isNaN(num) || num === 0) return '0'
    const abs = Math.abs(num)
    const sign = num < 0 ? '-' : ''
    return `${sign}${abs.toLocaleString('id-ID', {
        maximumFractionDigits: 2,
    })}`
}

/**
 * Format percentage change
 */
export function formatPercent(value: number | string): string {
    const num = typeof value === 'string' ? parseFloat(value) : value
    if (isNaN(num)) return '0%'
    const sign = num >= 0 ? '+' : ''
    return `${sign}${num.toFixed(2)}%`
}

/**
 * Format currency in Rupiah with K/M/T notation
 */
export function formatCurrency(value: number | string): string {
    const num = typeof value === 'string' ? parseFloat(value) : value
    if (isNaN(num)) return '0'

    const abs = Math.abs(num)
    const sign = num < 0 ? '-' : ''

    if (abs >= 1_000_000_000) return `${sign}${(abs / 1_000_000_000).toFixed(2)}T`
    if (abs >= 1_000_000) return `${sign}${(abs / 1_000_000).toFixed(2)}M`

    return `${sign}${abs.toLocaleString('id-ID')}`
}

/**
 * Format volume
 */
export function formatVolume(value: number | string): string {
    const num = typeof value === 'string' ? parseFloat(value) : value
    if (isNaN(num)) return '0'
    if (num >= 1_000_000) return (num / 1_000_000).toFixed(1) + 'M'
    if (num >= 1_000) return (num / 1_000).toFixed(1) + 'K'
    return num.toFixed(0)
}