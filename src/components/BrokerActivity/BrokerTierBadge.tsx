import clsx from 'clsx'
import { getBrokerTierInfo } from '@/data/broker-tiers'

interface BrokerTierBadgeProps {
 brokerCode?: string
 className?: string
}

export default function BrokerTierBadge({ brokerCode, className }: BrokerTierBadgeProps) {
 const tierInfo = getBrokerTierInfo(brokerCode)

 const toneClass =
 tierInfo.tier === 3
 ? 'bg-accent-red/15 text-accent-red border-accent-red/30'
 : tierInfo.tier === 2
 ? 'bg-accent-blue/15 text-accent-blue border-accent-blue/30'
 : 'bg-dark-700 text-dark-300 border-dark-600'

 const icon = tierInfo.tier === 3 ? '' : tierInfo.tier === 2 ? '' : ''

 return (
 <span
 className={clsx(
 'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border',
 toneClass,
 className
 )}
 title={tierInfo.description}
 >
 <span>{icon}</span>
 <span>{tierInfo.name}</span>
 </span>
 )
}

export function BrokerTierInline({ code, className }: { code?: string; className?: string }) {
 const tierInfo = getBrokerTierInfo(code)
 const icon = tierInfo.tier === 3 ? '' : tierInfo.tier === 2 ? '' : ''

 return (
 <span className={clsx('inline-flex items-center gap-1 text-xs font-semibold', className)}>
 <span className="text-[12px] leading-none">{icon}</span>
 <span className="text-[11px] opacity-80">{tierInfo.name}</span>
 </span>
 )
}
