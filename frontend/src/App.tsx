import { BrowserRouter, Link, Route, Routes } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Layout } from '@/Layout'
import { ConnectionPage } from '@/pages/ConnectionPage'

export default function App() {
  return <BrowserRouter><Routes><Route element={<Layout />}>
    <Route index element={<section className="max-w-2xl rounded-xl border bg-card p-8 shadow-sm">
      <p className="mb-3 text-sm font-semibold uppercase tracking-wider text-primary">Nền tảng điều hành du lịch đoàn</p>
      <h1 className="text-3xl font-semibold">TripOps Web Portal</h1>
      <p className="my-5 leading-relaxed text-muted-foreground">Khung ứng dụng đã sẵn sàng để kiểm tra kết nối. Các chức năng theo vai trò, dữ liệu tour, booking và thanh toán chưa triển khai.</p>
      <Button asChild><Link to="/connection">Kiểm tra backend</Link></Button>
    </section>} />
    <Route path="connection" element={<ConnectionPage />} />
    <Route path="*" element={<section><h1 className="text-2xl font-semibold">Không tìm thấy trang</h1><Link className="text-primary underline" to="/">Về tổng quan</Link></section>} />
  </Route></Routes></BrowserRouter>
}
