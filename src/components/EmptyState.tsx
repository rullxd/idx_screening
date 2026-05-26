interface EmptyStateProps {
 icon?: string
 title: string
 message: string
}

export default function EmptyState({ icon = '', title, message }: EmptyStateProps) {
 return (
 <div className="flex flex-col items-center justify-center py-12 gap-3">
 <div className="text-4xl">{icon}</div>
 <h3 className="text-lg font-semibold text-dark-100">{title}</h3>
 <p className="text-dark-400 text-center max-w-sm">{message}</p>
 </div>
 )
}
