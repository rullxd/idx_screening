import { useState } from 'react'
import BrokerActivityList from '@/components/BrokerActivity/BrokerActivityList'
import MarketDetectorComponent from '@/components/BrokerActivity/MarketDetectorComponent'
import MataDewaDashboard from '@/components/BrokerActivity/MataDewaDashboard'

export default function BrokerActivityPage() {
    const [activeTab, setActiveTab] = useState<'list' | 'detector' | 'mata-dewa'>('list')

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold text-dark-100">🏦 Broker Activity</h1>
                <p className="text-dark-400 text-sm mt-1">
                    Aktivitas transaksi broker & analisis bandar per saham
                </p>
            </div>

            {/* Tabs */}
            <div className="flex gap-2">
                <button
                    onClick={() => setActiveTab('list')}
                    className={`px-4 py-2.5 rounded-lg font-semibold transition-all duration-200 border ${activeTab === 'list'
                            ? 'bg-accent-green/10 border-accent-green text-accent-green'
                            : 'text-dark-400 border-transparent hover:bg-dark-800 hover:text-dark-100'
                        }`}
                >
                    🏦 Broker Analysis
                </button>
                <button
                    onClick={() => setActiveTab('detector')}
                    className={`px-4 py-2.5 rounded-lg font-semibold transition-all duration-200 border ${activeTab === 'detector'
                            ? 'bg-accent-green/10 border-accent-green text-accent-green'
                            : 'text-dark-400 border-transparent hover:bg-dark-800 hover:text-dark-100'
                        }`}
                >
                    🔬 Market Detector
                </button>
                <button
                    onClick={() => setActiveTab('mata-dewa')}
                    className={`px-4 py-2.5 rounded-lg font-semibold transition-all duration-200 border ${activeTab === 'mata-dewa'
                            ? 'bg-accent-green/10 border-accent-green text-accent-green'
                            : 'text-dark-400 border-transparent hover:bg-dark-800 hover:text-dark-100'
                        }`}
                >
                    👁️ Mata Dewa
                </button>
            </div>

            {/* Content */}
            {activeTab === 'list' && <BrokerActivityList />}
            {activeTab === 'detector' && <MarketDetectorComponent />}
            {activeTab === 'mata-dewa' && <MataDewaDashboard />}
        </div>
    )
}
