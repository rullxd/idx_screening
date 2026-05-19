import { useUIStore } from '@/stores/ui-store'
import clsx from 'clsx'

const navigationItems = [
    { id: 'dashboard', label: 'Dashboard', icon: '📊' },
    { id: 'screener', label: 'Bandar Screener', icon: '🎯' },
    { id: 'broker-activity', label: 'Broker Activity', icon: '🏦' },
    { id: 'broker-ranking', label: 'Broker Ranking', icon: '📈' },
    { id: 'alerts', label: 'Alert & Signals', icon: '🔔' },
    { id: 'heatmap', label: 'Heatmap Bandar', icon: '🔥' },
]

export default function Sidebar() {
    const currentPage = useUIStore((state) => state.currentPage)
    const setCurrentPage = useUIStore((state) => state.setCurrentPage)

    return (
        <nav className="hidden lg:flex lg:flex-col w-64 bg-dark-900 border-r border-dark-800 relative">
            <div className="flex-1 overflow-y-auto p-6">
                <div className="text-xs font-semibold text-dark-500 uppercase tracking-wider mb-4">
                    Menu
                </div>

                <div className="space-y-2">
                    {navigationItems.map((item) => (
                        <button
                            key={item.id}
                            onClick={() => setCurrentPage(item.id as any)}
                            className={clsx(
                                'w-full text-left px-4 py-3 rounded-lg transition-all duration-200 flex items-center gap-3',
                                currentPage === item.id
                                    ? 'bg-accent-green bg-opacity-10 border border-accent-green text-accent-green'
                                    : 'text-dark-400 hover:bg-dark-800 hover:text-dark-100 border border-transparent'
                            )}
                            aria-current={currentPage === item.id ? 'page' : undefined}
                        >
                            <span className="text-lg">{item.icon}</span>
                            <span className="font-medium">{item.label}</span>
                        </button>
                    ))}
                </div>
            </div>

            {/* Footer Info */}
            <div className="p-4 border-t border-dark-800 bg-dark-950 flex-shrink-0">
                <div className="text-xs text-dark-500 text-center">
                    <p>BandarScope v2.0</p>
                    <p className="mt-1">React + TypeScript</p>
                </div>
            </div>
        </nav>
    )
}
