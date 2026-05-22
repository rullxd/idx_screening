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

                <main className={clsx('flex-1 overflow-auto transition-all duration-300 lg:ml-64')}>
                    <div className="w-full max-w-[1560px] mx-auto px-4 py-4 md:px-6 md:py-5">
                        {children}
                    </div>
                </main>
            </div>
        </div>
    )
}
