import { NavLink } from 'react-router-dom'
import clsx from 'clsx'
import { useUIStore } from '@/stores/ui-store'

const navigationItems = [
 { 
   path: '/dashboard', 
   label: 'Dashboard', 
   icon: (
     <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
       <rect x="3" y="3" width="7" height="9"/>
       <rect x="14" y="3" width="7" height="5"/>
       <rect x="14" y="12" width="7" height="9"/>
       <rect x="3" y="16" width="7" height="5"/>
     </svg>
   ) 
 },
 { 
   path: '/market', 
   label: 'Market', 
   icon: (
     <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
       <line x1="18" y1="20" x2="18" y2="10"/>
       <line x1="12" y1="20" x2="12" y2="4"/>
       <line x1="6" y1="20" x2="6" y2="14"/>
     </svg>
   )
 },
 { 
   path: '/broker-activity', 
   label: 'Broker Activity', 
   icon: (
     <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
       <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
       <circle cx="9" cy="7" r="4"/>
       <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
       <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
     </svg>
   )
 },
 { 
   path: '/signals', 
   label: 'Signal Scanner', 
   icon: (
     <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
       <circle cx="12" cy="12" r="10"/>
       <path d="m16.2 7.8-2 2"/>
       <path d="m18 12-3 1"/>
       <path d="M12 12v6"/>
       <path d="m7.8 7.8 2 2"/>
     </svg>
   )
 },
 { 
   path: '/alerts', 
   label: 'Alert & Signals', 
   icon: (
     <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
       <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
       <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
     </svg>
   )
 },
 { 
   path: '/heatmap', 
   label: 'Heatmap Bandar', 
   icon: (
     <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
       <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
       <line x1="9" y1="3" x2="9" y2="21"/>
       <line x1="15" y1="3" x2="15" y2="21"/>
       <line x1="3" y1="9" x2="21" y2="9"/>
       <line x1="3" y1="15" x2="21" y2="15"/>
     </svg>
   )
 },
]

export default function Sidebar() {
 const sidebarOpen = useUIStore((state) => state.sidebarOpen)

 return (
  <nav
   className={clsx(
     "hidden lg:flex lg:flex-col bg-dark-900 border-r border-dark-800 fixed left-0 z-30 transition-all duration-300 ease-in-out overflow-x-hidden",
     sidebarOpen ? "w-64" : "w-20"
   )}
   style={{ top: 'var(--header-height)', height: 'calc(100vh - var(--header-height))' }}
  >
   <div className="flex-1 overflow-y-auto p-4 md:p-5">
    <div className={clsx(
      "text-xs font-semibold text-dark-500 uppercase tracking-wider mb-4 animate-fade-in transition-all duration-300",
      sidebarOpen ? "px-2" : "text-center"
    )}>
     {sidebarOpen ? 'Menu' : '•••'}
    </div>

    <div className="space-y-2">
     {navigationItems.map((item, index) => (
      <NavLink
       key={item.path}
       to={item.path}
       className={({ isActive }) =>
        clsx(
         'w-full rounded-lg transition-all duration-300 flex items-center opacity-0-initial animate-slide-in-left',
         sidebarOpen ? 'px-4 py-3 gap-3 text-left' : 'p-3 justify-center text-center',
         isActive
          ? 'bg-accent-green bg-opacity-10 border border-accent-green text-accent-green shadow-[0_0_12px_rgba(0,229,160,0.08)]'
          : 'text-dark-400 hover:bg-dark-800 hover:text-dark-100 border border-transparent hover:translate-x-0.5'
        )
       }
       style={{ animationDelay: `${index * 50}ms`, animationFillMode: 'forwards' }}
       title={!sidebarOpen ? item.label : undefined}
      >
       <span className="text-lg flex-shrink-0">{item.icon}</span>
       <span className={clsx(
         "font-medium transition-all duration-200 whitespace-nowrap",
         sidebarOpen ? "opacity-100 scale-100 w-auto visible" : "opacity-0 scale-75 w-0 invisible overflow-hidden"
       )}>
         {item.label}
       </span>
      </NavLink>
     ))}
    </div>
   </div>

   {/* Footer Info */}
   <div className="p-4 border-t border-dark-800 bg-dark-950 flex-shrink-0 animate-fade-in" style={{ animationDelay: '0.3s' }}>
    <div className={clsx(
      "text-[10px] text-dark-500 text-center transition-all duration-300",
      sidebarOpen ? "" : "scale-90"
    )}>
     <p className="font-semibold text-dark-400">{sidebarOpen ? 'BandarScope v2.0' : 'B-Scope'}</p>
     {sidebarOpen && <p className="mt-1 text-dark-600">React + TypeScript</p>}
    </div>
   </div>
  </nav>
 )
}
