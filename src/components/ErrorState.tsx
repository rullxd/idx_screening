interface ErrorStateProps {
    title: string
    message: string
    onRetry?: () => void
}

export default function ErrorState({ title, message, onRetry }: ErrorStateProps) {
    return (
        <div className="flex flex-col items-center justify-center py-12 gap-4">
            <div className="text-4xl">⚠️</div>
            <h3 className="text-lg font-semibold text-dark-100">{title}</h3>
            <p className="text-dark-400 text-center max-w-sm">{message}</p>
            {onRetry && (
                <button
                    onClick={onRetry}
                    className="btn-secondary mt-4"
                >
                    Coba Lagi
                </button>
            )}
        </div>
    )
}
