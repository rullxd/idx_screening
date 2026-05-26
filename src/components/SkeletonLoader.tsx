interface SkeletonProps {
  className?: string
  variant?: 'text' | 'circular' | 'rectangular' | 'card'
  width?: string | number
  height?: string | number
  count?: number
}

function SkeletonLine({ className = '', width, height }: { className?: string; width?: string | number; height?: string | number }) {
  const style: React.CSSProperties = {}
  if (width) style.width = typeof width === 'number' ? `${width}px` : width
  if (height) style.height = typeof height === 'number' ? `${height}px` : height

  return (
    <div
      className={`skeleton-shimmer rounded ${className}`}
      style={style}
    />
  )
}

export function Skeleton({ className = '', variant = 'text', width, height, count = 1 }: SkeletonProps) {
  if (variant === 'circular') {
    return (
      <div
        className={`skeleton-shimmer rounded-full ${className}`}
        style={{
          width: width || 40,
          height: height || 40,
        }}
      />
    )
  }

  if (variant === 'card') {
    return (
      <div className={`bg-dark-800 rounded-xl border border-dark-700 p-4 space-y-3 ${className}`}>
        <SkeletonLine className="h-4 w-3/4" />
        <SkeletonLine className="h-8 w-1/2" />
        <SkeletonLine className="h-3 w-full" />
      </div>
    )
  }

  if (variant === 'rectangular') {
    return (
      <SkeletonLine
        className={className}
        width={width || '100%'}
        height={height || 120}
      />
    )
  }

  // text variant
  return (
    <div className={`space-y-2 ${className}`}>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonLine
          key={i}
          className="h-4"
          width={i === count - 1 && count > 1 ? '60%' : width || '100%'}
          height={height}
        />
      ))}
    </div>
  )
}

// Pre-built skeleton patterns for common use cases
export function SkeletonTable({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <div className="bg-dark-800 rounded-xl border border-dark-700 overflow-hidden">
      {/* Header */}
      <div className="flex gap-4 p-4 border-b border-dark-700">
        {Array.from({ length: cols }).map((_, i) => (
          <SkeletonLine key={i} className="h-3 flex-1" />
        ))}
      </div>
      {/* Rows */}
      {Array.from({ length: rows }).map((_, rowIdx) => (
        <div key={rowIdx} className="flex gap-4 p-4 border-b border-dark-700/50">
          {Array.from({ length: cols }).map((_, colIdx) => (
            <SkeletonLine key={colIdx} className="h-4 flex-1" />
          ))}
        </div>
      ))}
    </div>
  )
}

export function SkeletonChart({ height = 300 }: { height?: number }) {
  return (
    <div className="bg-dark-800 rounded-xl border border-dark-700 p-4 space-y-3">
      <div className="flex justify-between items-center">
        <SkeletonLine className="h-5 w-32" />
        <div className="flex gap-2">
          <SkeletonLine className="h-6 w-16 rounded-md" />
          <SkeletonLine className="h-6 w-16 rounded-md" />
          <SkeletonLine className="h-6 w-16 rounded-md" />
        </div>
      </div>
      <SkeletonLine className="rounded-lg" height={height} />
    </div>
  )
}

export function SkeletonCards({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} variant="card" />
      ))}
    </div>
  )
}

export default Skeleton