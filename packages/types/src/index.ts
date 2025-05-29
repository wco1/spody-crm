export * from './database'

// Common API types
export interface ApiResponse<T = any> {
  data?: T
  error?: string
  success: boolean
}

// Pagination
export interface PaginationParams {
  page?: number
  limit?: number
  offset?: number
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination?: {
    page: number
    limit: number
    total: number
    pages: number
  }
}

// Auth types
export interface AuthUser {
  id: string
  email: string
  role: string
  created_at: string
} 