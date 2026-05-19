import { ReactNode } from 'react'
import { useUIStore } from '@/stores/ui-store'
import Header from './Header'
import Sidebar from './Sidebar'
import clsx from 'clsx'

interface LayoutProps {
    children: ReactNode
}

export default function Layout({ children }: LayoutProps) {
    const sidebarOpen = useUIStore((state) => state.sidebarOpen)

    return (
        <div className="min-h-screen flex flex-col bg-dark-950">
            <Header />

            <div className="flex flex-1 overflow-hidden">
                <Sidebar />

                <main
                    className={clsx(
                        'flex-1 overflow-auto transition-all duration-300',
                        sidebarOpen ? 'ml-0' : 'ml-0'
                    )}
                >
                    <div className="p-4 md:p-6 max-w-7xl mx-auto">
                        {children}
                    </div>
                </main>
            </div>
        </div>
    )
}
