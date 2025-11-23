// API Configuration
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001'
export const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:5001/ws'

console.log('API Configuration:', { API_BASE_URL, WS_URL })

