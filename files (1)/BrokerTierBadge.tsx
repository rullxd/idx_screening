import { getBrokerInfo, TIER_ICONS, BrokerTier } from '@/data/broker-tiers'
import clsx from 'clsx'

interface BrokerTierBadgeProps {
    code: string
    showName?: boolean
    size?: 'xs' | 'sm' | 'md'
    className?: string
}

const TIER_COLORS: Record<BrokerTier, string> = {
    1: 'bg-dark-700 text-dark-400 border-dark-600',
    2: 'bg-blue-900/40 text-blue-300 border-blue-700',
    3: 'bg-amber-900/40 text-amber-300 border-amber-700',
}

const SIZE_CLASSES = {
    xs: 'text-[9px] px-1.5 py-0.5',
    sm: 'text-[10px] px-2 py-0.5',
    md: 'text-xs px-2.5 py-1',
}

export default function BrokerTierBadge({
    code,
    showName = false,
    size = 'xs',
    className,
}: BrokerTierBadgeProps) {
    const info = getBrokerInfo(code)
    const icon = TIER_ICONS[info.tier]
    const colorCls = TIER_COLORS[info.tier]
    const sizeCls = SIZE_CLASSES[size]

    return (
        <span
            className={clsx(
                'inline-flex items-center gap-1 rounded-full border font-medium leading-none',
                colorCls,
                sizeCls,
                className
            )}
            title={`${info.name} — ${info.description}`}
        >
            <span aria-hidden="true">{icon}</span>
            {showName ? info.name : info.tierLabel}
        </span>
    )
}

/**
 * Versi ringkas: hanya icon + kode broker, cocok untuk tabel padat
 */
export function BrokerTierInline({ code }: { code: string }) {
    const info = getBrokerInfo(code)
    const icon = TIER_ICONS[info.tier]
    const colorCls: Record<BrokerTier, string> = {
        1: 'text-dark-400',
        2: 'text-blue-400',
        3: 'text-amber-400',
    }

    return (
        <span
            className={clsx('font-bold tabular-nums', colorCls[info.tier])}
            title={`${info.name} (${info.tierLabel})`}
        >
            {icon} {code}
        </span>
    )
}
