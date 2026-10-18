const configuredBaseUrl = import.meta.env.VITE_API_BASE_URL || '/api'

// Remove trailing slashes so callers can consistently append endpoint paths.
export const API_BASE_URL = configuredBaseUrl.replace(/\/+$/, '')
export const API_FILES_URL = `${API_BASE_URL}/files`
export const API_HEALTH_URL = `${API_BASE_URL}/health`
