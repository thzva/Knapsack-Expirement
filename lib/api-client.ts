/**
 * API client using axios with caching, request deduplication, and error handling
 */

import axios, { AxiosInstance, AxiosRequestConfig, AxiosError } from 'axios'

// Cache for API responses (5 minute TTL)
const cache = new Map<string, { data: any; timestamp: number }>()
const CACHE_TTL = 5 * 60 * 1000 // 5 minutes

// Request deduplication - prevent duplicate requests
const pendingRequests = new Map<string, Promise<any>>()

// Get API base URL (memoized)
export const getApiBase = () => {
  if (typeof window === 'undefined') return 'http://localhost:8787'
  // Use NEXT_PUBLIC_API_BASE if set, otherwise fallback to environment-based defaults
  return process.env.NEXT_PUBLIC_API_BASE || 
         (process.env.NODE_ENV === 'production' 
           ? process.env.NEXT_PUBLIC_API_BASE || "https://knapsack-backend.onrender.com"
           : "http://localhost:8787")
}

// Create axios instance with default config
const axiosInstance: AxiosInstance = axios.create({
  baseURL: getApiBase(),
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor
axiosInstance.interceptors.request.use(
  (config) => {
    // Add any auth tokens or headers here if needed
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Response interceptor for error handling
axiosInstance.interceptors.response.use(
  (response) => {
    return response
  },
  (error: AxiosError) => {
    if (error.response) {
      // Server responded with error status
      const errorMessage = (error.response.data as any)?.error || `HTTP ${error.response.status}: Request failed`
      const customError: any = new Error(errorMessage)
      customError.status = error.response.status
      customError.data = error.response.data
      return Promise.reject(customError)
    } else if (error.request) {
      // Request made but no response
      return Promise.reject(new Error('No response from server. Please check your connection.'))
    } else {
      // Something else happened
      return Promise.reject(new Error(error.message || 'Request failed'))
    }
  }
)

// Clear cache helper
export const clearCache = (key?: string) => {
  if (key) {
    cache.delete(key)
  } else {
    cache.clear()
  }
}

// Optimized fetch with caching, deduplication, and timeout
export async function apiFetch<T = any>(
  endpoint: string,
  options: AxiosRequestConfig = {},
  useCache = false
): Promise<T> {
  const method = options.method || 'GET'
  const cacheKey = `${method}:${endpoint}:${JSON.stringify(options.data || {})}`

  // Check cache first for GET requests
  if (useCache && method === 'GET') {
    const cached = cache.get(cacheKey)
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return cached.data as T
    }
  }

  // Check for pending duplicate request
  if (pendingRequests.has(cacheKey)) {
    return pendingRequests.get(cacheKey) as Promise<T>
  }

  // Make the request
  const requestPromise = axiosInstance({
    url: endpoint,
    ...options,
  })
    .then((response) => {
      const data = response.data
      // Cache successful GET requests
      if (useCache && method === 'GET') {
        cache.set(cacheKey, { data, timestamp: Date.now() })
      }
      return data as T
    })
    .finally(() => {
      pendingRequests.delete(cacheKey)
    })

  // Store pending request
  pendingRequests.set(cacheKey, requestPromise)

  return requestPromise
}

// Specific API methods
export const api = {
  get: <T = any>(endpoint: string, useCache = true) =>
    apiFetch<T>(endpoint, { method: 'GET' }, useCache),
  
  post: <T = any>(endpoint: string, body?: any) =>
    apiFetch<T>(endpoint, {
      method: 'POST',
      data: body,
    }, false),
  
  put: <T = any>(endpoint: string, body?: any) =>
    apiFetch<T>(endpoint, {
      method: 'PUT',
      data: body,
    }, false),
  
  delete: <T = any>(endpoint: string) =>
    apiFetch<T>(endpoint, { method: 'DELETE' }, false),
  
  checkParticipant: (prolificPid: string) =>
    api.get<{ exists: boolean; completed: boolean; participantId?: string }>(
      `/api/v1/check-participant/${prolificPid}`,
      true // Cache participant checks for 5 minutes
    ),
  
  registerProlific: (prolificPid: string, studyId: string, sessionId: string) =>
    api.post<{ participantId: string }>('/api/v1/register-prolific', {
      prolificPid,
      studyId,
      sessionId,
    }),
}

// Export axios instance for advanced usage
export { axiosInstance }
