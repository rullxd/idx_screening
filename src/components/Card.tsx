import { ReactNode } from 'react'
import clsx from 'clsx'

interface CardProps {
    children: ReactNode
    className?: string
    hoverable?: boolean
}

export default function Card({ children, className, hoverable }: CardProps) {
    return (
        <div
            className={clsx(
                'bg-dark-900 border border-dark-800 rounded-lg p-4 transition-all duration-200',
                hoverable && 'hover:bg-dark-800 hover:border-dark-700 hover:shadow-lg hover:-translate-y-1 cursor-pointer',
                className
            )}
        >
            {children}
        </div>
    )
}
