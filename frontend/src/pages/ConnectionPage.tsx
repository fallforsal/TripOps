import { useEffect, useRef, useState } from 'react'
import { CircleCheck, LoaderCircle, PlugZap } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { apiBaseUrl, checkHealth, type HealthResponse } from '@/lib/api'

export function ConnectionPage() {
  const [health, setHealth] = useState<HealthResponse | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const request = useRef<AbortController | null>(null)
  useEffect(() => () => request.current?.abort(), [])
  async function connect() {
    request.current?.abort()
    const controller = new AbortController()
    request.current = controller
    setLoading(true); setError(''); setHealth(null)
    try { setHealth(await checkHealth(controller.signal)) }
    catch (cause) {
      if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : 'Không thể kết nối backend.')
    } finally { if (!controller.signal.aborted) setLoading(false) }
  }
  return <section className="max-w-2xl rounded-xl border bg-card p-6 shadow-sm">
    <PlugZap className="mb-4 size-8 text-primary" aria-hidden />
    <h1 className="text-2xl font-semibold">Kiểm tra kết nối backend</h1>
    <p className="mt-3 text-muted-foreground">Gửi yêu cầu thật tới health endpoint. Kết quả chỉ xác nhận API đang chạy.</p>
    <p className="my-5 break-all rounded-md bg-muted p-3 font-mono text-sm">{apiBaseUrl}/api/v1/health</p>
    <Button onClick={connect} disabled={loading}>
      {loading ? <LoaderCircle className="size-4 animate-spin" aria-hidden /> : <PlugZap className="size-4" aria-hidden />}
      {loading ? 'Đang kết nối…' : 'Kiểm tra kết nối'}
    </Button>
    <div className="mt-5" role="status" aria-live="polite">
      {!health && !error && !loading && <p>Chưa kiểm tra.</p>}
      {health && <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-emerald-950">
        <p className="flex items-center gap-2 font-medium"><CircleCheck className="size-5" aria-hidden /> API đã phản hồi</p>
        <p className="mt-2">{health.application} · {new Date(health.timestampUtc).toLocaleString('vi-VN')}</p>
        <p className="mt-2 text-sm">{health.database === 'not_configured' ? 'Database chưa cấu hình.' : 'Có cấu hình database, chưa kiểm tra kết nối SQL Server.'}</p>
      </div>}
      {error && <p className="rounded-lg bg-red-50 p-4 text-red-900">{error}</p>}
    </div>
  </section>
}
