// Date formatting utilities
export const formatDate = (date: string | Date) => {
  const d = new Date(date)
  return d.toLocaleDateString('ru-RU', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
}

export const formatDateTime = (date: string | Date) => {
  const d = new Date(date)
  return d.toLocaleString('ru-RU', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

// String utilities
export const truncateText = (text: string, length: number = 100) => {
  if (text.length <= length) return text
  return text.substring(0, length) + '...'
}

export const capitalizeFirst = (str: string) => {
  return str.charAt(0).toUpperCase() + str.slice(1)
}

// URL utilities
export const createAvatarUrl = (path: string | null) => {
  if (!path) return null
  if (path.startsWith('http')) return path
  if (path.startsWith('data:')) return path
  return path
}

// Validation utilities
export const isValidEmail = (email: string) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

// ID generation
export const generateId = () => {
  return Math.random().toString(36).substring(2) + Date.now().toString(36)
} 