# TripOps frontend

UI từ TripOps_FE_new, dùng API thật của backend cho các luồng đã triển khai. Hướng dẫn và tài khoản test tại `../README.md`.

```powershell
npm ci
npm run dev
```

FE chạy ở http://localhost:5174; `/api` proxy tới http://localhost:5080. Chạy `npm run typecheck`, `npm test`, `npm run build` để kiểm tra.

Các thao tác ngoài phạm vi hiện tại báo chưa hỗ trợ, không báo lưu thành công với mockdata.
