# Backend conventions

API → Service → Data; Tests dùng WebApplicationFactory. API đăng ký AddTripOpsServices, Service đăng ký Data; chỉ Data sở hữu DbContext. Chưa có entity, DbSet, repository nghiệp vụ hay migration. Không gọi EnsureCreated/Migrate lúc startup.

Controllers dùng [ApiController], route api/v1, DTO tách EF model trong Service theo feature. Input dùng DataAnnotations; validation 400 ValidationProblemDetails, exception 500 ProblemDetails với traceId và thông báo an toàn, 404 ProblemDetails. Chưa có auth/role hoặc API nghiệp vụ; health không xác nhận database readiness.

Task 2 trở đi: role ADMIN/TRAVEL_AGENCY/PROVIDER/CUSTOMER/TOUR_GUIDE, ownership từ principal, không bind owner/status/total trực tiếp. Tiền decimal(19,2), VND rounding AwayFromZero ở backend, contract/finance history bất biến. Không log PII, token hoặc connection string.
