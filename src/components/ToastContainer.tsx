import { useToastStore, Toast } from '@/stores/toast-store'
import clsx from 'clsx'

export default function ToastContainer() {
  const toasts = useToastStore((state) => state.toasts)
  const removeToast = useToastStore((state) => state.removeToast)

  if (toasts.length === 0) return null

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3 w-full max-w-sm pointer-events-none">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onClose={() => removeToast(toast.id)} />
      ))}
    </div>
  )
}

interface ToastItemProps {
  toast: Toast
  onClose: () => void
}

// Static icon map — avoids re-creating JSX on every render
const TOAST_ICONS: Record<string, JSX.Element> = {
  success: (
    <svg className="w-5 h-5 text-accent-green" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  error: (
    <svg className="w-5 h-5 text-accent-red" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  warning: (
    <svg className="w-5 h-5 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
    </svg>
  ),
  alert: (
    <div className="relative">
      <span className="absolute inline-flex h-2 w-2 rounded-full bg-accent-green opacity-75 animate-ping -top-1 -right-1" />
      <svg className="w-5 h-5 text-accent-green" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.02 6.02 0 00-4.9-5.907 2.06 2.06 0 00-3.8 0M9 11v3.159c0 .538-.214 1.055-.595 1.436L7 17h5m4 0a3 3 0 11-6 0m6 0H9" />
      </svg>
    </div>
  ),
  info: (
    <svg className="w-5 h-5 text-accent-blue" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
}

// Static style map
const TOAST_STYLES: Record<string, string> = {
  success: 'border-accent-green bg-dark-900 shadow-[0_4px_24px_rgba(0,229,160,0.1)]',
  error: 'border-accent-red bg-dark-900 shadow-[0_4px_24px_rgba(255,77,109,0.1)]',
  warning: 'border-yellow-500 bg-dark-900 shadow-[0_4px_24px_rgba(234,179,8,0.1)]',
  alert: 'border-accent-green border-opacity-40 bg-dark-900 shadow-[0_8px_32px_rgba(0,229,160,0.15)] ring-1 ring-accent-green ring-opacity-20',
  info: 'border-accent-blue bg-dark-900 shadow-[0_4px_24px_rgba(59,130,246,0.1)]',
}

function ToastItem({ toast, onClose }: ToastItemProps) {
  return (
    <div
      className={clsx(
        'pointer-events-auto flex w-full border rounded-xl p-4 gap-3 bg-opacity-95 backdrop-blur-lg transform transition-all duration-300 animate-slide-in-right',
        TOAST_STYLES[toast.type] || TOAST_STYLES.info
      )}
      role="alert"
    >
      <div className="flex-shrink-0 mt-0.5">{TOAST_ICONS[toast.type] || TOAST_ICONS.info}</div>
      
      <div className="flex-1">
        {toast.title && <h4 className="text-sm font-semibold text-dark-100 mb-0.5">{toast.title}</h4>}
        <div 
          className="text-xs text-dark-300 leading-relaxed font-medium"
          dangerouslySetInnerHTML={{ __html: toast.message }}
        />
      </div>

      <button
        onClick={onClose}
        className="flex-shrink-0 ml-2 text-dark-500 hover:text-dark-200 transition-colors focus:outline-none"
        aria-label="Close notification"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  )
}