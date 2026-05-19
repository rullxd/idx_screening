import { useState } from 'react'
import BrokerActivityList from '@/components/BrokerActivity/BrokerActivityList'
import MarketDetectorComponent from '@/components/BrokerActivity/MarketDetectorComponent'

export default function BrokerActivityPage() {
    const [activeTab, setActiveTab] = useState<'list' | 'detector'>('list')

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold text-dark-100">🏦 Broker Activity</h1>

            {/* Tabs */}
            <div className="flex gap-2 border-b border-dark-800">
                <button
                    onClick={() => setActiveTab('list')}
                    className={`px-4 py-3 font-semibold transition-colors ${activeTab === 'list'
                            ? 'text-accent-green border-b-2 border-accent-green'
                            : 'text-dark-400 hover:text-dark-100'
                        }`}
                >
                    🏦 Broker List
                </button>
                <button
                    onClick={() => setActiveTab('detector')}
                    className={`px-4 py-3 font-semibold transition-colors ${activeTab === 'detector'
                            ? 'text-accent-green border-b-2 border-accent-green'
                            : 'text-dark-400 hover:text-dark-100'
                        }`}
                >
                    🔬 Market Detector
                </button>
            </div>

            {/* Content */}
            {activeTab === 'list' && <BrokerActivityList />}
            {activeTab === 'detector' && <MarketDetectorComponent />}
        </div>
    )
}
