import { vi } from 'vitest'

type QueryState<T> = {
    data: T | undefined
    isLoading: boolean
    error: Error | null
    isFetching: boolean
    refetch: ReturnType<typeof vi.fn>
}

export function createQueryState<T>(overrides: Partial<QueryState<T>> = {}): QueryState<T> {
    return {
        data: undefined,
        isLoading: false,
        error: null,
        isFetching: false,
        refetch: vi.fn(),
        ...overrides,
    }
}

export function createOrderbookData(overrides: Record<string, unknown> = {}) {
    return {
        name: 'Bank Rakyat Indonesia',
        lastprice: 1250,
        percentage_change: '1.23',
        open: 1240,
        previous: 1230,
        high: 1260,
        low: 1220,
        bid: [
            { price: 1245, que_num: 5, volume: 12000 },
            { price: 1240, que_num: 3, volume: 7000 },
        ],
        offer: [{ price: 1250, que_num: 4, volume: 9000 }],
        ...overrides,
    }
}

export function createBrokerDetectorData(overrides: Record<string, unknown> = {}) {
    return {
        data: {
            broker_summary: {
                brokers_buy: [
                    {
                        netbs_broker_code: 'YP',
                        type: 'Asing',
                        bval: '2500000',
                        blot: '1200000',
                        freq: '12',
                    },
                    {
                        netbs_broker_code: 'CC',
                        type: 'Lokal',
                        bval: '1500000',
                        blot: '900000',
                        freq: '8',
                    },
                ],
                brokers_sell: [
                    {
                        broker_code: 'PD',
                        type: 'Pemerintah',
                        sval: '500000',
                        slot: '700000',
                        freq: '10',
                    },
                ],
            },
            bandar_detector: {
                total_buyer: '22',
                total_seller: '17',
                avg: {
                    amount: 1500000,
                },
            },
        },
        ...overrides,
    }
}

export function createNormalizedStockChartData(overrides: Record<string, unknown> = {}) {
    return {
        percentage: '1.50',
        previous: 100,
        normalized: {
            data: [
                { time: '09:00', price: 100 },
                { time: '10:00', price: 102 },
            ],
            high: 102,
            low: 100,
            avg: 101,
            volatility: 2,
            first: 100,
            last: 102,
            trend: 'naik',
        },
        ...overrides,
    }
}
