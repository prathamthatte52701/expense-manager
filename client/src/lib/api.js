import axios from 'axios'

export const CATEGORIES = ['Packing Material', 'Bus Travel Booking', 'Fuel Cost', 'Miscellaneous']

export const api = axios.create({ baseURL: '/api' })
api.defaults.headers.common['x-app-token'] = import.meta.env.VITE_ACCESS_TOKEN || ''

api.interceptors.response.use(undefined, async (error) => {
  const request = error.config
  const canRetry = request?.method === 'get'
    && (error.code === 'ERR_NETWORK' || error.response?.status === 500)
    && (request.__startupRetries || 0) < 3

  if (!canRetry) return Promise.reject(error)

  request.__startupRetries = (request.__startupRetries || 0) + 1
  await new Promise((resolve) => setTimeout(resolve, request.__startupRetries * 500))
  return api.request(request)
})

export const rupee = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 })
export const todayInput = () => new Date().toISOString().slice(0, 10)
export const thisMonth = () => new Date().toISOString().slice(0, 7)
