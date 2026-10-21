# TripOps web portal

React/TypeScript/Vite, Tailwind v4, shadcn/ui source Button/Radix và Lucide. Router `/` và `/connection`. Đây là scaffold Task1, chưa có auth hoặc UI nghiệp vụ theo vai trò.

Xem [README gốc](../README.md) để cài và chạy API. VITE_API_BASE_URL mặc định http://localhost:5080; copy .env.example thành .env.local, restart Vite khi đổi cấu hình. Không đưa secrets vào VITE variables vì chúng công khai.

Mở terminal frontend mới tại repo root, giữ API chạy ở terminal backend riêng:

```powershell
Set-Location frontend
if (!(Test-Path .env.local)) { Copy-Item .env.example .env.local }
npm.cmd ci
npm.cmd run dev
```

`npm.cmd ci`, `npm.cmd run dev`, `npm.cmd run build`, `npm.cmd run lint`. Windows dùng npm.cmd khi PowerShell chặn npm.ps1. Khóa package-lock.json và Node .nvmrc; không force/legacy-peer-deps.

Build/lint là kiểm tra trước PR; Python chỉ cần cho maintainer kiểm tài liệu/cấu trúc, không cần để chạy web.
