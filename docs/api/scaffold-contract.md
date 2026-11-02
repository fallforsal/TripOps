# Contract thực tế Task 1

API đang có duy nhất chức năng hạ tầng. Các API trong endpoints-proposal là thiết kế tương lai, chưa triển khai. Không có business auth/entity/migration hoặc database initialization.

| Method | Route | Access | Response / lỗi |
|---|---|---|---|
| GET | `/health` | Anonymous | 200 text/plain `Healthy`; chỉ process liveness, không SQL readiness |
| GET | `/api/v1/health` | Anonymous | 200 DTO dưới đây, API→Service→Data configuration; không mở SQL connection |
| GET | `/openapi/v1.json` | Development | 200 OpenAPI được sinh từ endpoint thực tế; Production 404 |
| GET | `/swagger/index.html` | Development | 200 Swagger UI dùng OpenAPI local; Production 404 |

```json
{
  "status": "ok",
  "application": "TripOps.Api",
  "database": "not_configured",
  "scope": "api_liveness_only",
  "timestampUtc": "2026-10-21T00:00:00Z"
}
```

`database` chỉ nhận `not_configured` hoặc `configured_not_checked`. Có connection string không có nghĩa SQL truy cập được. timestampUtc là thời gian runtime; ví dụ trên không phải kết quả test thật.

Exception ngoài dự kiến: 500 application/problem+json, title an toàn, status và traceId; không trả exception message/stack. Route không tồn tại: 404 ProblemDetails. [ApiController] và convention cho request DTO tương lai trả 400 ValidationProblemDetails khi lỗi model, không bind EF entity.

CORS chỉ Development, allowlist mặc định http://localhost:5173 và http://127.0.0.1:5173; không AllowAnyOrigin/AllowCredentials. Override bằng `Cors__AllowedOrigins__0` nếu cần. Local HTTP port5080, frontend port5173. Production chưa có chính sách CORS/auth/deploy; không dùng scaffold để phục vụ dữ liệu nghiệp vụ.
