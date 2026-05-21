import { useState, useRef, useEffect } from 'react'

export interface DateRange {
    from: Date
    to: Date
}

interface DateRangePickerProps {
    value: DateRange
    onChange: (range: DateRange) => void
    placeholder?: string
}

export default function DateRangePicker({
    value,
    onChange,
    placeholder: _placeholder = 'Pilih tanggal',
}: DateRangePickerProps) {
    const [isOpen, setIsOpen] = useState(false)
    const [tempFrom, setTempFrom] = useState<Date>(value.from)
    const [tempTo, setTempTo] = useState<Date>(value.to)
    const [isSelectingEnd, setIsSelectingEnd] = useState(false)
    const [currentMonth, setCurrentMonth] = useState<Date>(new Date(value.to))
    const containerRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false)
            }
        }

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside)
        }

        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [isOpen])

    const formatDate = (date: Date): string => {
        return new Intl.DateTimeFormat('en-US', {
            day: '2-digit',
            month: 'short',
            year: '2-digit',
        }).format(date)
    }

    const getDaysInMonth = (date: Date): number => {
        return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()
    }

    const getFirstDayOfMonth = (date: Date): number => {
        return new Date(date.getFullYear(), date.getMonth(), 1).getDay()
    }

    const isSameDay = (d1: Date, d2: Date): boolean => {
        return d1.getDate() === d2.getDate() &&
            d1.getMonth() === d2.getMonth() &&
            d1.getFullYear() === d2.getFullYear()
    }

    const isInRange = (date: Date): boolean => {
        return date >= tempFrom && date <= tempTo
    }

    const handleDateClick = (day: number) => {
        const selected = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day)

        if (!isSelectingEnd) {
            setTempFrom(selected)
            setTempTo(selected)
            setIsSelectingEnd(true)
            return
        }

        if (selected < tempFrom) {
            setTempTo(tempFrom)
            setTempFrom(selected)
        } else {
            setTempTo(selected)
        }

        setIsSelectingEnd(false)
    }

    const handleApply = () => {
        const from = new Date(Math.min(tempFrom.getTime(), tempTo.getTime()))
        const to = new Date(Math.max(tempFrom.getTime(), tempTo.getTime()))
        onChange({ from, to })
        setIsSelectingEnd(false)
        setIsOpen(false)
    }

    const handleQuickSelect = (days: number) => {
        const to = new Date()
        const from = new Date()
        from.setDate(to.getDate() - days)
        onChange({ from, to })
        setTempFrom(from)
        setTempTo(to)
        setCurrentMonth(new Date(to))
        setIsSelectingEnd(false)
        setIsOpen(false)
    }

    const handleToggle = () => {
        if (!isOpen) {
            setTempFrom(value.from)
            setTempTo(value.to)
            setCurrentMonth(new Date(value.to))
            setIsSelectingEnd(false)
        }

        setIsOpen((prev) => !prev)
    }

    const handleMonthChange = (offset: number) => {
        setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + offset, 1))
    }

    const renderCalendarDays = () => {
        const daysInMonth = getDaysInMonth(currentMonth)
        const firstDay = getFirstDayOfMonth(currentMonth)
        const days: (number | null)[] = Array(firstDay).fill(null)

        for (let i = 1; i <= daysInMonth; i++) {
            days.push(i)
        }

        return days.map((day, idx) => {
            if (day === null) {
                return <div key={`empty-${idx}`} className="text-center py-2" />
            }

            const dateObj = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day)
            const isStart = isSameDay(dateObj, tempFrom)
            const isEnd = isSameDay(dateObj, tempTo)
            const inRange = isInRange(dateObj)

            return (
                <button
                    key={day}
                    onClick={() => handleDateClick(day)}
                    className={`py-2 text-sm font-medium rounded transition ${isStart || isEnd
                        ? 'bg-accent-green text-dark-950 font-bold'
                        : inRange
                            ? 'bg-accent-green/30 text-accent-green'
                            : 'text-dark-300 hover:bg-dark-700'
                        }`}
                >
                    {day}
                </button>
            )
        })
    }

    const monthName = currentMonth.toLocaleString('en-US', { month: 'long', year: 'numeric' })

    return (
        <div ref={containerRef} className="relative">
            {/* Display Button */}
            <button
                onClick={handleToggle}
                className="flex items-center gap-2 px-4 py-2.5 bg-dark-800 border border-dark-700 rounded-lg text-dark-100 hover:border-accent-green transition"
            >
                <span className="text-sm font-medium">
                    {formatDate(value.from)} — {formatDate(value.to)}
                </span>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h18M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
            </button>

            {/* Calendar Popup */}
            {isOpen && (
                <div className="absolute top-full right-0 mt-2 bg-dark-800 border border-dark-700 rounded-lg shadow-lg z-50 p-4 min-w-96">
                    {/* Quick Select Options */}
                    <div className="flex gap-2 mb-4 pb-4 border-b border-dark-700">
                        <button
                            onClick={() => handleQuickSelect(0)}
                            className="text-xs px-3 py-1 rounded bg-dark-700 text-dark-300 hover:bg-accent-green/20 hover:text-accent-green transition"
                        >
                            Last 1 Day
                        </button>
                        <button
                            onClick={() => handleQuickSelect(6)}
                            className="text-xs px-3 py-1 rounded bg-dark-700 text-dark-300 hover:bg-accent-green/20 hover:text-accent-green transition"
                        >
                            Last 7 Days
                        </button>
                        <button
                            onClick={() => handleQuickSelect(29)}
                            className="text-xs px-3 py-1 rounded bg-dark-700 text-dark-300 hover:bg-accent-green/20 hover:text-accent-green transition"
                        >
                            Last 1 Month
                        </button>
                        <button
                            onClick={() => handleQuickSelect(89)}
                            className="text-xs px-3 py-1 rounded bg-dark-700 text-dark-300 hover:bg-accent-green/20 hover:text-accent-green transition"
                        >
                            Last 3 Months
                        </button>
                    </div>

                    {/* Calendar */}
                    <div className="space-y-4">
                        {/* Month Header */}
                        <div className="flex items-center justify-between">
                            <button
                                onClick={() => handleMonthChange(-1)}
                                className="p-1 hover:bg-dark-700 rounded transition"
                            >
                                <svg className="w-5 h-5 text-dark-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                </svg>
                            </button>
                            <span className="font-semibold text-dark-100">{monthName}</span>
                            <button
                                onClick={() => handleMonthChange(1)}
                                className="p-1 hover:bg-dark-700 rounded transition"
                            >
                                <svg className="w-5 h-5 text-dark-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                </svg>
                            </button>
                        </div>

                        {/* Weekdays */}
                        <div className="grid grid-cols-7 gap-1 text-center text-xs font-semibold text-dark-400 mb-2">
                            {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((day) => (
                                <div key={day}>{day}</div>
                            ))}
                        </div>

                        {/* Days Grid */}
                        <div className="grid grid-cols-7 gap-1">
                            {renderCalendarDays()}
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-2 mt-4 pt-4 border-t border-dark-700">
                        <button
                            onClick={() => {
                                setTempFrom(value.from)
                                setTempTo(value.to)
                                setIsSelectingEnd(false)
                                setIsOpen(false)
                            }}
                            className="flex-1 px-4 py-2 text-sm font-medium rounded border border-dark-700 text-dark-300 hover:bg-dark-700 transition"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleApply}
                            className="flex-1 px-4 py-2 text-sm font-medium rounded bg-accent-green text-dark-950 hover:bg-opacity-90 transition"
                        >
                            Apply
                        </button>
                    </div>
                </div>
            )}
        </div>
    )
}
