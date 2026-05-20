import { NavLink } from 'react-router-dom'
import clsx from 'clsx'

const navigationItems = [
    { path: '/dashboard', label: 'Dashboard', icon: '📊' },
    { path: '/market', label: 'Market', icon: '📉' },
    { path: '/screener', label: 'Bandar Screener', icon: '🎯' },
    { path: '/broker-activity', label: 'Broker Activity', icon: '🏦' },
    { path: '/signals', label: 'Signal Scanner', icon: '📡' },
    { path: '/alerts', label: 'Alert & Signals', icon: '🔔' },
    { path: '/heatmap', label: 'Heatmap Bandar', icon: '🔥' },
]

export default function Sidebar() {
    return (
        <nav className="hidden lg:flex lg:flex-col w-64 bg-dark-900 border-r border-dark-800 relative">
            <div className="flex-1 overflow-y-auto p-6">
                <div className="text-xs font-semibold text-dark-500 uppercase tracking-wider mb-4">
                    Menu
                </div>

                <div className="space-y-2">
                    {navigationItems.map((item) => (
                        <NavLink
                            key={item.path}
                            to={item.path}
                            className={({ isActive }) =>
                                clsx(
                                    'w-full text-left px-4 py-3 rounded-lg transition-all duration-200 flex items-center gap-3',
                                    isActive
                                        ? 'bg-accent-green bg-opacity-10 border border-accent-green text-accent-green'
                                        : 'text-dark-400 hover:bg-dark-800 hover:text-dark-100 border border-transparent'
                                )
                            }
                        >
                            <span className="text-lg">{item.icon}</span>
                            <span className="font-medium">{item.label}</span>
                        </NavLink>
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