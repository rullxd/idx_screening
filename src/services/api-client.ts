import axios, { AxiosError, AxiosInstance } from 'axios'
import { APIResponse, APIException } from '@/types'
import DOMPurify from 'dompurify'

/**
 * Centralized API client with type safety, error handling, and race condition protection
 */

class APIClient {
    private client: AxiosInstance
    private abortControllers: Map<string, AbortController> = new Map()

    constructor(baseURL: string = '/api') {
        this.client = axios.create({
            baseURL,
            timeout: 30000,
            headers: {
                'Content-Type': 'application/json',
            },
        })

        // Response interceptor for error handling
        this.client.interceptors.response.use(
            (response) => response,
            (error: AxiosError) => {
                return Promise.reject(this.normalizeError(error))
            }
        )
    }

    /**
     * Generic GET request with type safety
     */
    async get<T>(
        endpoint: string,
        config?: { params?: Record<string, any>; cancelKey?: string }
    ): Promise<T> {
        try {
            const signal = this.createCancelSignal(config?.cancelKey)

            const response = await this.client.get<APIResponse<T>>(endpoint, {
                params: config?.params,
                signal,
            })

            this.clearCancelSignal(config?.cancelKey)

            if (response.data.success === false) {
                throw new APIException(
                    response.data.error?.code || 'UNKNOWN_ERROR',
                    response.data.error?.message || 'Unknown error occurred'
                )
            }

            if (response.data && typeof response.data === 'object' && 'data' in response.data) {
                const payload = (response.data as APIResponse<T>).data
                return (payload !== undefined ? payload : response.data) as T
            }

            return response.data as T
        } catch (error) {
            this.clearCancelSignal(config?.cancelKey)
            throw error
        }
    }

    /**
     * POST request with type safety
     */
    async post<T>(
        endpoint: string,
        data?: Record<string, any>,
        config?: { cancelKey?: string }
    ): Promise<T> {
        try {
            const signal = this.createCancelSignal(config?.cancelKey)

            const response = await this.client.post<APIResponse<T>>(endpoint, data, {
                signal,
            })

            this.clearCancelSignal(config?.cancelKey)

            if (response.data.success === false) {
                throw new APIException(
                    response.data.error?.code || 'UNKNOWN_ERROR',
                    response.data.error?.message || 'Unknown error occurred'
                )
            }

            if (response.data && typeof response.data === 'object' && 'data' in response.data) {
                const payload = (response.data as APIResponse<T>).data
                return (payload !== undefined ? payload : response.data) as T
            }

            return response.data as T
        } catch (error) {
            this.clearCancelSignal(config?.cancelKey)
            throw error
        }
    }

    /**
     * Cancel previous request with same key to prevent race conditions
     */
    private createCancelSignal(key?: string): AbortSignal | undefined {
        if (!key) return undefined

        // Cancel previous request with same key
        const existing = this.abortControllers.get(key)
        if (existing) {
            existing.abort()
        }

        // Create new controller
        const controller = new AbortController()
        this.abortControllers.set(key, controller)
        return controller.signal
    }

    private clearCancelSignal(key?: string) {
        if (key) {
            this.abortControllers.delete(key)
        }
    }

    /**
     * Normalize different error types into APIException
     */
    private normalizeError(error: AxiosError): APIException {
        if (error.response) {
            // Server responded with error status
            const data = error.response.data as any
            return new APIException(
                data?.error?.code || `HTTP_${error.response.status}`,
                data?.error?.message || error.message || 'Server error',
                data?.error?.details
            )
        } else if (error.request) {
            // Request made but no response
            return new APIException(
                'NO_RESPONSE',
                'Server did not respond. Check your connection.',
                { originalError: error.message }
            )
        } else {
            // Error in request setup
            return new APIException(
                'REQUEST_SETUP_ERROR',
                error.message || 'Failed to make request',
                { originalError: error }
            )
        }
    }

    /**
     * Sanitize user input to prevent XSS
     */
    sanitizeInput(input: string): string {
        return DOMPurify.sanitize(input, { ALLOWED_TAGS: [] })
    }

    /**
     * Validate and sanitize URL
     */
    isValidURL(url: string): boolean {
        try {
            const parsed = new URL(url, window.location.origin)
            // Only allow same origin
            return parsed.origin === window.location.origin
        } catch {
            return false
        }
    }
}

export const apiClient = new APIClient('/api')
