# Triển khai workflow thiết kế Tour

## Kết quả

Dùng chung TourDesignRequest → Tour/TourVersion → TourPlanProposal → BookingSupplierRequest → BookingQuotation → PaymentRequest/PaymentTransaction cho yêu cầu mới và tùy chỉnh Tour công khai. Form yêu cầu mới không cần Tour ID. Tour nguồn chỉ được sao chép, không bị sửa.

Agency nhận yêu cầu do Customer lựa chọn; với Tour mẫu, Agency phải là đơn vị sở hữu Tour. Có trao đổi bổ sung thông tin, tiếp nhận/từ chối, thiết kế chỗ ở/chỗ ăn bằng catalogue thật và nhà cung cấp thủ công. Attraction chỉ nhập tên và giờ như Entity/lịch trình ban đầu; không liên kết Provider, không lưu đơn giá/số lượng và không sinh dòng chi phí. Workflow không quản lý tiền xe.

Các TourVersion đã gửi lưu snapshot bất biến, số khách và người tạo. Customer gửi nhiều TourPlanProposal trên cùng phiên bản; không sửa trực tiếp Tour. Agency quyết định áp dụng, tạo revision mới và chia sẻ lại. Chỉ một Tour hiện được chia sẻ cho mỗi request; lịch sử các phiên bản đã gửi vẫn xem được. VersionNumber tái sử dụng revision hiện hữu của Tour, gồm cả thao tác lưu draft và complete, nên không nhất thiết liên tiếp giữa hai lần gửi.

Customer đồng ý sơ bộ bằng agree-plan; ngay tại đây hệ thống thông báo đúng Provider chỗ ở/chỗ ăn của phương án đã chọn, không gửi trùng khi bấm lại. Booking Pending được dùng làm hồ sơ xác nhận Provider/báo giá để tái sử dụng cấu trúc hiện hữu; bước này chưa yêu cầu trả tiền. Mỗi request chỉ có một Booking hoạt động. Provider xác nhận, counter offer, phản hồi một phần hoặc từ chối; lịch sử phản hồi được lưu riêng theo service request. Xác nhận giá, khả năng cung cấp và hạn giữ chỗ có trường riêng. Agency quyết định counter offer. Các xác nhận không bị ảnh hưởng có thể được dùng lại khi đổi phương án Booking.

Giá vốn chỗ ở/chỗ ăn tính tại backend theo đơn vị giá và số lượng; không tính Attraction hoặc xe; Agency chỉnh số lượng, chi phí thủ công, tổng giá bán hoặc lãi. Giá bán không tự đổi theo phản hồi Provider. Customer không nhận giá vốn, margin hoặc supplier snapshot nội bộ. Có so sánh giá bán các Plan và chênh lệch chi phí từng dòng giữa các báo giá.

Báo giá gửi đi có snapshot lịch trình, dịch vụ, số khách, giá cuối, chính sách thanh toán, hoàn/hủy và hạn hiệu lực. Chỉ thay đổi trạng thái/chấp nhận được phép sau khi gửi. Customer chấp nhận, từ chối hoặc yêu cầu sửa. Kiểm tra phiên bản hiện hành, hạn báo giá và Provider trước chấp nhận/thanh toán; khóa phương án đã chốt.

Cọc 50% lấy từ tổng giá bán cuối đã chấp nhận; PaymentRequest.QuotationId và Booking.AcceptedQuotationId giữ tham chiếu. payOS/DEMO tiếp tục dùng khóa Booking và xử lý idempotent hiện hữu. Tiền về cho báo giá không hợp lệ được đưa vào đối soát. Thông báo nội bộ được lưu database cho Customer/Agency/Provider; callback thanh toán gửi thông báo cho Customer và Agency. Không bổ sung giải ngân tự động.

Với Tour thiết kế sát ngày, cọc vẫn 50%; phần còn lại có hạn trước ngày khởi hành khi hạn tiêu chuẩn đã qua. Tour công khai giữ chính sách thu hiện hữu. Luồng duyệt Booking/ký hợp đồng trước thanh toán hiện có được giữ lại. Không thêm Admin Approval khi publish Tour.

## Entity và API

Entity tái sử dụng: TourDesignRequest, TourDesignRequestAgency (trao đổi trong CommunicationNotes), Tour, TourVersion, TouristAttraction, TourPlanProposal, Booking/BookingTimeline/BookingTimelineAttraction, BookingSupplierRequest, BookingQuotation, Service, PaymentRequest và PaymentTransaction. Entity mới: WorkflowNotification vì source chưa có lưu thông báo nội bộ, chỉ có EmailSender cho nghiệp vụ khác.

API bổ sung/mở rộng:

- `/api/v1/tour-design-requests`: tạo yêu cầu độc lập; tùy chọn sourceTourId/initialChanges.
- `/api/v1/tour-design-requests/{id}/history`, `/source`, `/initial-changes`, `/messages`, `/agree-plan`.
- Các API `/history`, `/source`, `/initial-changes`, `/messages` tương ứng dưới `/api/v1/agency/tour-design-requests/{id}`; tiếp tục dùng API action/tours/proposals hiện có.
- `/api/v1/provider/booking-requests/{id}/respond`: confirm/counter/partial/reject, số lượng khả dụng, hạn giữ chỗ.
- `/api/v1/bookings/{bookingId}/quotations/terms`, `/{version}/decision`, `/supplier-requests/{id}/counter/{accept}`, `/supplier-requests/{id}/history`.
- API quotation draft/send/accept/change-plan và Booking/Payment hiện hữu được mở rộng kiểm tra backend.
- `/api/v1/notifications` và `/{id}/read`: chỉ đọc/cập nhật thông báo của principal hiện tại.
- Service hỗ trợ PriceUnit trên API và giao diện Provider; PublicTourDto bổ sung AgencyId để định tuyến đúng Agency khi tùy chỉnh.

## Migration

Chưa áp dụng migration lên database đang chạy:

1. `20261106183411_UnifiedDesignWorkflow`: trạng thái đồng ý sơ bộ, nguồn Tour, metadata phiên bản, báo giá, phản hồi Provider, tham chiếu báo giá/thanh toán và bảng thông báo.
2. `20261106205811_DesignServiceCosting`: migration trước đính chính, được giữ để tương thích lịch sử migration. Các cột chi phí Attraction do migration này thêm được gỡ tại RestoreTextOnlyAttractions; các thay đổi đơn vị Service/thời điểm dịch vụ/bảng thông báo còn giữ.
3. `20261106205933_InitialDesignChanges`: đề xuất ban đầu từ Tour mẫu và backfill dữ liệu lịch sử/JSON.
4. `20261107073904_RestoreTextOnlyAttractions`: khôi phục Entity điểm tham quan ban đầu, bỏ 8 cột ServiceId/Quantity/CostUnit/UnitCost đã thêm nhầm vào tourist_locations và booking_locations. Migration chỉ được tạo, chưa áp dụng vào database đang chạy.

Từ thư mục gốc repository:

```sh
dotnet ef database update --project backend/src/TripOps.Data --startup-project backend/src/TripOps.Api
```

Đã sinh thành công script SQL idempotent tại `/tmp/tripops-design-workflow.sql`. Tài liệu database và EF model snapshot đã cập nhật.

## Kiểm chứng

- Backend build: thành công, 0 warning, 0 error.
- Bộ backend: 190 passed, 1 skipped (test yêu cầu SQL Server thật).
- Các test mới: nhiều change request không ghi đè lịch sử; quyền trao đổi; sao chép Tour công khai và đúng Agency; snapshot báo giá bất biến; hết hạn; counter offer; cung cấp một phần; cọc gắn đúng báo giá.
- Journey tích hợp có Provider → báo giá → chấp nhận → Agency duyệt → ký hợp đồng → fake payOS → callback/sync, gồm Tour xa ngày và sát ngày.
- Frontend typecheck và production build: thành công.
- Frontend test: 51 passed.
- `git diff --check`: thành công.

Chưa kiểm chứng: áp dụng migration/khóa đồng thời trên SQL Server thật, thao tác end-to-end bằng trình duyệt với database thật, giao dịch payOS thật và tải đồng thời lớn. Test tích hợp chạy với SQLite và gateway giả lập. Build frontend còn cảnh báo có sẵn về case trùng trong AdminDashboard, Node deprecation và bundle lớn.

Giữ nguyên các thay đổi frontend/package.json, frontend/package-lock.json và các tệp .DS_Store đã có trong working tree trước task.


## Đính chính phạm vi theo yêu cầu mới

CustomerPlanEditor sử dụng trực tiếp TourFormPage ở customerMode và cùng JSX tab “2. Chỗ ở, Chỗ ăn & Lịch trình chi tiết”. Customer có cùng các thao tác chọn, thêm, sửa, xóa, đổi giờ, sắp xếp khách sạn/bữa ăn/điểm tham quan. Chế độ Customer chỉ gửi TourPlanProposal hoặc lưu đề xuất vào request; không gọi API cập nhật Tour, danh bạ Agency, publish hay định giá. Các tab giá/chính sách/quản trị và trường giá vốn thủ công được ẩn.

Lịch trình Agency khôi phục input text điểm tham quan ban đầu; không có dropdown catalogue Attraction/xe, không có khối “Chi tiết dịch vụ” hoặc trường giá trong dòng Attraction.

Đã kiểm tra render thực tế HTML Customer dùng chung component, xác nhận có điều khiển lịch trình/khách sạn và gửi thay đổi, không có publish/cost picker. Backend regression kiểm tra điểm tham quan tồn tại trong snapshot lịch trình nhưng không có trong costing/Provider request; chốt phương án gửi thông báo đúng Provider và không trùng. Bộ backend 190 passed/1 skipped; frontend 51 passed; typecheck/build thành công. Chưa kiểm chứng tương tác bằng trình duyệt/database thật.

## File chỉnh sửa hoặc thêm mới

- `backend/database.md`
- `backend/src/TripOps.Api/Controllers/BookingQuotationsController.cs`
- `backend/src/TripOps.Api/Controllers/DesignRequestsController.cs`
- `backend/src/TripOps.Api/Controllers/WorkflowNotificationsController.cs`
- `backend/src/TripOps.Api/Infrastructure/ApiExceptionHandler.cs`
- `backend/src/TripOps.Data/BookingQuotationConfiguration.cs`
- `backend/src/TripOps.Data/Entities/BookingEntities.cs`
- `backend/src/TripOps.Data/Entities/BookingQuotationEntities.cs`
- `backend/src/TripOps.Data/Entities/FinanceEntities.cs`
- `backend/src/TripOps.Data/Entities/Service.cs`
- `backend/src/TripOps.Data/Entities/TourEntities.cs`
- `backend/src/TripOps.Data/Entities/WorkflowNotification.cs`
- `backend/src/TripOps.Data/Migrations/20261106183411_UnifiedDesignWorkflow.Designer.cs`
- `backend/src/TripOps.Data/Migrations/20261106183411_UnifiedDesignWorkflow.cs`
- `backend/src/TripOps.Data/Migrations/20261106205811_DesignServiceCosting.Designer.cs`
- `backend/src/TripOps.Data/Migrations/20261106205811_DesignServiceCosting.cs`
- `backend/src/TripOps.Data/Migrations/20261106205933_InitialDesignChanges.Designer.cs`
- `backend/src/TripOps.Data/Migrations/20261106205933_InitialDesignChanges.cs`
- `backend/src/TripOps.Data/Migrations/TripOpsDbContextModelSnapshot.cs`
- `backend/src/TripOps.Data/Repositories/BookingRepository.cs`
- `backend/src/TripOps.Data/TripOpsDbContext.cs`
- `backend/src/TripOps.Service/Bookings/BookingPayments.cs`
- `backend/src/TripOps.Service/Bookings/BookingQuotationService.cs`
- `backend/src/TripOps.Service/Bookings/BookingService.cs`
- `backend/src/TripOps.Service/DependencyInjection.cs`
- `backend/src/TripOps.Service/Notifications/WorkflowNotificationService.cs`
- `backend/src/TripOps.Service/Services/ProviderServiceContracts.cs`
- `backend/src/TripOps.Service/Services/ProviderServiceService.cs`
- `backend/src/TripOps.Service/Services/ServiceModerationContracts.cs`
- `backend/src/TripOps.Service/Services/ServiceModerationService.cs`
- `backend/src/TripOps.Service/Tours/DesignRequestContracts.cs`
- `backend/src/TripOps.Service/Tours/DesignRequestService.cs`
- `backend/src/TripOps.Service/Tours/DesignRequestWorkflow.cs`
- `backend/src/TripOps.Service/Tours/TourContracts.cs`
- `backend/src/TripOps.Service/Tours/TourService.cs`
- `backend/tests/TripOps.Tests/ApiScaffoldTests.cs`
- `backend/tests/TripOps.Tests/CustomTourRequestFlowTests.cs`
- `backend/tests/TripOps.Tests/DatabaseDesignSchemaTests.cs`
- `backend/tests/TripOps.Tests/OpenApiTests.cs`
- `backend/tests/TripOps.Tests/TourBookingPaymentJourneyTests.cs`
- `backend/tests/TripOps.Tests/UnifiedDesignWorkflowTests.cs`
- `frontend/src/app/App.tsx`
- `frontend/src/app/components/agency/AgencyCustomRequests.tsx`
- `frontend/src/app/components/agency/AgencyTourManagement.tsx`
- `frontend/src/app/components/common/BookingQuotationPanel.tsx`
- `frontend/src/app/components/common/DesignRequestMessages.tsx`
- `frontend/src/app/components/common/DesignVersionHistory.tsx`
- `frontend/src/app/components/common/WorkflowNotifications.tsx`
- `frontend/src/app/components/customer/CustomerPlanEditor.tsx`
- `frontend/src/app/components/customer/MyRequestsPage.tsx`
- `frontend/src/app/components/provider/ProviderBookingConfirmations.tsx`
- `frontend/src/app/components/provider/ProviderCreateServicePage.tsx`
- `frontend/src/app/components/provider/ProviderDashboard.tsx`
- `frontend/src/app/components/user/CustomTourRequestPage.tsx`
- `frontend/src/app/components/user/TourDetailPage.tsx`
- `frontend/src/app/lib/bookingSupplierStatus.ts`
- `frontend/src/app/services/customTourRequests.ts`
- `frontend/src/app/services/servicePosts.ts`
- `frontend/src/app/services/wf02Tours.ts`
- `frontend/src/app/types/index.ts`

- `backend/src/TripOps.Data/Migrations/20261107073904_RestoreTextOnlyAttractions.cs`
- `backend/src/TripOps.Data/Migrations/20261107073904_RestoreTextOnlyAttractions.Designer.cs`

## Sửa lỗi Customer không thấy Plan sau lần gửi đầu

- Bổ sung mapping `ApiTour.designRequestId` sang `Tour.customRequestId`; endpoint danh sách Plan gán lại request ID để hỗ trợ response cũ.
- Trang chi tiết yêu cầu tải Plan trực tiếp, không phụ thuộc dữ liệu Tour đã tải ở App; hiển thị lỗi và cho tải lại.
- Customer có thể gửi note gắn với Plan hoặc mở editor chung của Agency để gửi bản custom. Mỗi lần gửi là một TourPlanProposal mới. Backend tự lưu quotation và planSnapshot bất biến vào ProposalJson; không nhận giá do Customer tự quyết định. Hai bên thấy giá gắn với từng bản gửi.
- Kiểm thử mapping frontend thành công; kiểm thử backend giữ hai ID riêng và giá/snapshot gốc sau Agency revision thành công; frontend typecheck/build thành công.
- Đã đọc OpenAPI từ backend thực tế cổng 5080: có `/plans` nhưng không có `/messages` và `/history`. Tiến trình hiện tại vẫn chạy bản cũ. Chưa dừng tiến trình hoặc áp dụng migration vào database đang dùng. Cần chạy các migration trong báo cáo và khởi động lại backend bằng source hiện tại để giao diện đang mở sử dụng API mới.

## Đã áp dụng migration theo xác nhận của người dùng

Đã áp dụng thành công cả 6 migration còn thiếu vào database đang dùng (FixTourPendingChanges, AddUserBanFields, UnifiedDesignWorkflow, DesignServiceCosting, InitialDesignChanges, RestoreTextOnlyAttractions). Không còn pending migration. Số bản ghi users/tours/services/bookings/tour_design_requests trước và sau giữ nguyên. Các truy vấn EF Services, Users/BusinessProfile, TourDesignRequests thành công.

Đã kiểm tra trực tiếp cả backend cổng 5080 và Vite cổng 5174: Tour, catalogue và danh sách Agency trả HTTP 200. auth/me trả HTTP 401 khi không gửi cookie đăng nhập, không còn HTTP 500. Các ghi chú “chưa áp dụng migration” phía trên mô tả trạng thái trước lần xác nhận này.
