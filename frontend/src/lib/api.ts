export const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:5080').replace(/\/+$/, '')

export type HealthResponse = {
  status: string
  application: string
  database: 'not_configured' | 'configured_not_checked'
  scope: 'api_liveness_only'
  timestampUtc: string
}

export async function apiGet(path: string, signal?: AbortSignal): Promise<unknown> {
  const url = new URL(`${apiBaseUrl}/${path.replace(/^\/+/, '')}`)
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password)
    throw new Error('API base URL phải là địa chỉ HTTP(S) không chứa credentials.')
  const response = await fetch(url, {
    headers: { Accept: 'application/json' },
    signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(8000)]) : AbortSignal.timeout(8000),
  })
  if (!response.ok) throw new Error(`Backend trả HTTP ${response.status}. Kiểm tra API hoặc cấu hình CORS.`)
  return response.json() as Promise<unknown>
}

export async function checkHealth(signal?: AbortSignal): Promise<HealthResponse> {
  const data = await apiGet('/api/v1/health', signal)
  if (!data || typeof data !== 'object' || !('status' in data) || data.status !== 'ok'
    || !('scope' in data) || data.scope !== 'api_liveness_only'
    || !('application' in data) || typeof data.application !== 'string'
    || !('database' in data) || !['not_configured', 'configured_not_checked'].includes(String(data.database))
    || !('timestampUtc' in data) || typeof data.timestampUtc !== 'string')
    throw new Error('Backend trả dữ liệu health không đúng contract.')
  return data as HealthResponse
}
