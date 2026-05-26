import { Component, ErrorInfo, ReactNode } from 'react'

interface Props {
 children: ReactNode
 fallback?: ReactNode
}

interface State {
 hasError: boolean
 error: Error | null
}

export default class ErrorBoundary extends Component<Props, State> {
 constructor(props: Props) {
 super(props)
 this.state = { hasError: false, error: null }
 }

 static getDerivedStateFromError(error: Error): State {
 return { hasError: true, error }
 }

 componentDidCatch(error: Error, errorInfo: ErrorInfo) {
 console.error('ErrorBoundary caught:', error, errorInfo)
 }

 render() {
 if (this.state.hasError) {
 if (this.props.fallback) {
 return this.props.fallback
 }

 return (
 <div className="min-h-screen flex items-center justify-center bg-dark-950 p-6">
 <div className="bg-dark-900 border border-red-500/30 rounded-xl p-8 max-w-lg w-full text-center">
 <div className="text-4xl mb-4">️</div>
 <h2 className="text-xl font-bold text-red-400 mb-2">
 Terjadi Kesalahan
 </h2>
 <p className="text-dark-400 mb-4 text-sm">
 {this.state.error?.message || 'Unexpected error occurred'}
 </p>
 <button
 onClick={() => {
 this.setState({ hasError: false, error: null })
 window.location.href = '/'
 }}
 className="px-6 py-2 bg-accent-green text-dark-950 font-semibold rounded-lg hover:bg-accent-green/90 transition-colors"
 >
 Kembali ke Dashboard
 </button>
 </div>
 </div>
 )
 }

 return this.props.children
 }
}