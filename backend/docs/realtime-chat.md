# Chat realtime 1-1

## Khảo sát và kiến trúc

TripOps dùng .NET 10 / EF Core 10.0.10 / SQL Server, Controller → scoped Service → DbContext (một số module có Repository riêng). API theo `/api/v1`; user ID là chuỗi tối đa 36 ký tự. Claim `ClaimTypes.NameIdentifier` chứa ID, `ClaimTypes.Role` chứa role được chuẩn hóa bởi AccountService.

**Source hiện dùng cookie HttpOnly `TripOps.Session`, không có JWT.** Chat giữ nguyên cơ chế này, `[Authorize]`, kiểm tra tài khoản Active trong service và lấy sender từ validated claims. Không tạo hệ thống đăng nhập hoặc JWT thứ hai, không đưa token vào URL. SignalR dùng UserIdentifier mặc định từ NameIdentifier; kết nối đóng khi hết hạn xác thực. Cookie/CORS/kiểm tra Origin hiện hữu được tái sử dụng; kiểm tra Origin cũng áp dụng cho GET WebSocket tại `/hubs/chat`.

Frontend React 18 / TypeScript / Vite sử dụng AuthContext, `http()` có credentials, điều hướng bằng state/hash; không có React Query. Design system cũ là Tailwind/Radix. Ant Design 5 và SignalR client 10 được bổ sung cho chat, màu primary xanh và font kế thừa. Trang Messages mock được thay bằng ChatPanel dùng API thật; nút có badge xuất hiện ở CustomerHeader, UnifiedHeader, Provider sidebar và launcher dùng chung.

ChatService dùng chung cho REST và Hub. Service persist/commit trước khi gọi IChatEvents; adapter SignalR broadcast tới tất cả kết nối của hai user bằng Clients.Users. Group chỉ dùng khi client join/leave, không làm căn cứ cấp quyền. SignalR tự xóa membership khi disconnect. Không có static dictionary, group chat hay attachment API.

## Entity và migration

Tái sử dụng `ChatConversation` (UserOneId, UserTwoId, LastMessage*, timestamps) và `ChatMessage` (SenderId, Content, IsRead, ReadAt). Hai FK user bắt buộc và check khác nhau đã đủ biểu diễn hai participant; không tạo bảng participant mới. Các bảng attachment cũ được giữ nguyên, không triển khai tính năng attachment.

Migration `20261110121256_AddRealtimeDirectChat`:

- Thêm `chat_messages.client_message_id` nullable uniqueidentifier để giữ tương thích message cũ.
- Unique filtered index `(conversation_id, sender_id, client_message_id)` khi key khác null.
- Thêm computed persisted `pair_low`, `pair_high` và unique index không filter để cặp đảo thứ tự cũng không thể trùng.
- Check constraint không tự chat. Index cho history `(conversation_id,id)`, unread và hai phía danh sách conversation.
- Không xóa bảng/cột/dữ liệu trong Up. Hai index đơn cũ được thay bằng composite index cùng prefix.
- Không thu hẹp cột content cũ; giới hạn 2000 được thực thi ở application service cho mọi đường gửi.

Create xử lý xung đột unique bằng đọc lại conversation thắng cuộc. Send mở transaction serializable, khóa cập nhật conversation trước khi kiểm tra key/insert và cập nhật preview, tránh thứ tự preview bị đảo và tránh gửi trùng. Timestamp mới đều UTC. Read cập nhật theo message ID đã xem, không đánh dấu tin đến sau snapshot đã xem.

Nếu dữ liệu cũ có self-conversation hoặc cặp đảo chiều bị trùng, migration dừng do constraint; không tự gộp/xóa lịch sử. Có thể kiểm tra bằng truy vấn chỉ đọc:

```sql
SELECT id, user_one_id, user_two_id FROM chat_conversations WHERE user_one_id = user_two_id;
SELECT CASE WHEN user_one_id < user_two_id THEN user_one_id ELSE user_two_id END AS pair_low,
       CASE WHEN user_one_id < user_two_id THEN user_two_id ELSE user_one_id END AS pair_high,
       COUNT(*) AS conversation_count
FROM chat_conversations
GROUP BY CASE WHEN user_one_id < user_two_id THEN user_one_id ELSE user_two_id END,
         CASE WHEN user_one_id < user_two_id THEN user_two_id ELSE user_one_id END
HAVING COUNT(*) > 1;
```

## Quyền nhắn tin

Mọi tài khoản đang hoạt động có thể tìm và nhắn tin 1-1 với mọi tài khoản đang hoạt động khác. Vai trò, booking và trạng thái duyệt hồ sơ doanh nghiệp không ảnh hưởng đến quyền chat. API danh bạ chỉ trả ID và tên. Chỉ hai thành viên của hội thoại có thể đọc lịch sử, gửi tin hoặc xác nhận đã đọc. Tài khoản bị khóa không xuất hiện trong danh bạ và không thể tham gia chat.

## API và SignalR

| Method | Route | Body / kết quả |
|---|---|---|
| GET | `/api/v1/chat/contacts` | Chỉ ID/tên contacts hợp lệ |
| GET | `/api/v1/chat/conversations` | Contact, message cuối, unread count |
| POST | `/api/v1/chat/conversations` | `{ "userId": "..." }` → `{ "id": 1 }` |
| GET | `/api/v1/chat/conversations/{id}/messages?cursor=&limit=50` | `{ items, nextCursor }`, cursor ID exclusive, limit 1–100; items tăng dần |
| POST | `/api/v1/chat/conversations/{id}/messages` | `{ "content": "...", "clientMessageId": "UUID" }` → MessageDto |
| PATCH | `/api/v1/chat/conversations/{id}/read` | `{ "throughMessageId": 123 }`; null để lấy mốc hiện có |

Không nhận senderId làm danh tính. Trim/reject empty/max 2000, UUID không rỗng; cùng key và nội dung khác trả 409. Người ngoài conversation nhận 404; mất quyền liên hệ nhận 403. DTO không có email/password/phone hoặc thông tin hồ sơ doanh nghiệp nhạy cảm.

Hub `[Authorize]` tại `/hubs/chat`:

- `JoinConversation(conversationId)`
- `LeaveConversation(conversationId)`
- `SendMessage(conversationId, content, clientMessageId)`
- `MarkAsRead(conversationId, throughMessageId?)`

Server events:

- `ReceiveMessage`: MessageDto.
- `ConversationUpdated`: `{ conversationId }`, yêu cầu refetch preview/unread.
- `MessagesRead`: `{ conversationId, userId, throughMessageId, readAt }`.

## Frontend lifecycle

ChatProvider tạo đúng một HubConnection mỗi phiên user trong tab. Listener cập nhật danh sách gắn với connection; từng khung chat đăng ký/gỡ đúng callback message/read khi đổi conversation hoặc unmount, dùng functional state update để không mất event khi React batch nhiều message; stop connection khi cleanup. Có retry start thất bại, automatic reconnect với backoff tối đa 30 giây; reconnect refetch conversations/unread và tải lại 50 message mới nhất của khung đang mở, rejoin group. Nút tải cũ dùng cursor để tiếp tục lấy toàn bộ lịch sử.

Gửi qua REST để dùng chung ứng dụng service với Hub. Client giữ UUID khi thử lại một tin chưa xác nhận; merge theo server ID và giữ readAt khi REST response cũ đến sau read receipt. Không có optimistic bubble giả trạng thái đã gửi. Nội dung chỉ render text qua React. Enter gửi, Shift+Enter xuống dòng, hỗ trợ IME, input tối đa 2000. History chỉ tự cuộn khi đang gần đáy; tải trang cũ giữ vị trí. Read chỉ xảy ra khi tab visible, cửa sổ có focus, khung chat ở trên cùng đang được xem và người dùng ở đáy lịch sử, qua ID đã tải; nhận event đơn thuần không đánh dấu đọc.

Vite proxy `/hubs` hỗ trợ WebSocket. Production reverse proxy cần chuyển cả `/api` lẫn `/hubs` tới backend và hỗ trợ WebSocket; ưu tiên cùng origin theo mô hình cookie SameSite Strict hiện có. `VITE_API_BASE_URL` được dùng đồng nhất cho REST và Hub.

## File tạo/sửa

Tạo:

- `backend/src/TripOps.Service/Chat/ChatContracts.cs`
- `backend/src/TripOps.Service/Chat/ChatService.cs`
- `backend/src/TripOps.Api/Controllers/ChatController.cs`
- `backend/src/TripOps.Api/Hubs/ChatHub.cs`
- `backend/src/TripOps.Data/Migrations/20261110121256_AddRealtimeDirectChat.cs`
- `backend/src/TripOps.Data/Migrations/20261110121256_AddRealtimeDirectChat.Designer.cs`
- `backend/tests/TripOps.Tests/ChatFlowTests.cs`
- `frontend/src/app/services/chat.ts`
- `frontend/src/app/contexts/ChatContext.tsx`
- `frontend/src/app/lib/chatMessages.ts`
- `frontend/src/app/components/chat/ChatPanel.tsx`
- `frontend/src/app/components/chat/chat.css`
- `frontend/tests/chatMessages.test.ts`
- `backend/docs/realtime-chat.md`

Sửa:

- `backend/src/TripOps.Api/Program.cs`: SignalR DI/map, adapter và kiểm tra Origin Hub.
- `backend/src/TripOps.Service/DependencyInjection.cs`: scoped ChatService.
- `backend/src/TripOps.Data/Entities/ExtensionEntities.cs`: ClientMessageId.
- `backend/src/TripOps.Data/TripOpsDbContext.cs`: mapping/index/constraints.
- `backend/src/TripOps.Data/Migrations/TripOpsDbContextModelSnapshot.cs`.
- `backend/database.md`, `backend/database.dbml`: ba cột mới.
- `backend/tests/TripOps.Tests/DatabaseDesignSchemaTests.cs`: nhận diện uniqueidentifier (cả creation_key cũ) và số cột thực tế.
- `frontend/package.json`, `frontend/package-lock.json`: dependency mới.
- `frontend/src/main.tsx`: mount provider/widget trong AuthProvider.
- `frontend/src/app/components/user/MessagesPage.tsx`: bỏ mock, dùng ChatPanel.
- `frontend/src/app/components/customer/CustomerHeader.tsx`, `frontend/src/app/components/UnifiedHeader.tsx`, `frontend/src/app/components/provider/ProviderLayout.tsx`: nút/badge mở chat chung.
- `frontend/vite.config.ts`: hub proxy.
- `README.md`: liên kết hướng dẫn này và cập nhật phạm vi chat.

## Migration và chạy thử hai trình duyệt

Từ repository root, sau khi kiểm tra cấu hình ConnectionStrings:TripOps local:

```powershell
dotnet restore backend/TripOps.sln --locked-mode
dotnet build backend/TripOps.sln -m:1
# Chỉ sinh script để review, không áp dụng database:
dotnet ef migrations script 20261109140022_PreserveBookedOriginalServiceNames 20261110121256_AddRealtimeDirectChat --project backend/src/TripOps.Data --startup-project backend/src/TripOps.Api --output chat-migration.sql
# Chủ động áp dụng sau khi review các migration đang pending:
dotnet ef database update 20261110121256_AddRealtimeDirectChat --project backend/src/TripOps.Data --startup-project backend/src/TripOps.Api
```

EF CLI trên máy khảo sát là 9.0.8, runtime 10.0.10; có cảnh báo version nhưng generate migration/script thành công. Team nên dùng dotnet-ef 10.x khớp runtime.

1. Chạy backend theo README và `npm ci`, `npm run dev` trong frontend; hoặc chạy run.bat. Frontend cổng 5174, backend 5080; Cors:AllowedOrigins phải có origin frontend.
2. Dùng hai trình duyệt/profile độc lập: Đăng nhập bằng hai tài khoản Active bất kỳ, ví dụ Customer và Admin.
3. Mở Tin nhắn ở header, chọn contact khả dụng, gửi hai chiều. Kiểm tra badge khi đóng chat; mở/focus/cuộn xuống cuối mới chuyển sang đã đọc.
4. Mở thêm tab của cùng tài khoản; cả hai tab đều nhận event. Refresh trang rồi mở lại conversation để kiểm tra persistence và history cursor.
5. Đặt trình duyệt B Offline trong DevTools, gửi từ A, bật Online. Kiểm tra trạng thái reconnect và message bị lỡ sau khi refetch. Thử gửi khi mất mạng rồi bấm Gửi lại cùng nội dung, kiểm tra chỉ có một message.
6. Kiểm tra mobile với nút Quay lại; kéo lên đọc tin cũ rồi gửi từ bên kia để xác nhận không ép cuộn.
7. Thử thêm cặp cùng role, ví dụ hai Customer.
8. Dùng user thứ ba không liên quan để thử REST/Hub với ID đã biết: không xem/join/send/read được.

## Kiểm chứng và giới hạn

Kết quả chạy thực tế được cập nhật ở phần cuối sau lần xác minh cuối cùng. Test backend dùng database SQLite in-memory riêng và SignalR WebSocket JSON thật qua TestServer, đăng nhập cookie thật; không kết nối/reset database ứng dụng. Test nhiều request dùng connection riêng với database shared-memory để kiểm tra concurrency, không dùng đồng thời một SqliteConnection.

Chưa chạy migration trên SQL Server hiện hữu, stress test concurrency SQL Server, kiểm thử UI hai trình duyệt đầy đủ và giả lập mất mạng trình duyệt cho JavaScript client. Code reconnect/lifecycle có triển khai nhưng các bước UI này cần chạy theo checklist trên. Không coi TestServer thay thế cho kiểm thử triển khai reverse proxy/SQL Server thật.

Phạm vi một backend instance, không scale-out/backplane. Không durable offline outbox; draft/key retry nằm trong bộ nhớ của khung chat. Nếu process chết giữa DB commit và broadcast, tin vẫn nằm trong history và được khôi phục khi tải lại/reconnect. Có thể phân trang danh sách hội thoại, chia bundle UI, hoặc outbox khi có nhu cầu bảo đảm phát sự kiện; không thêm các thành phần đó trong thay đổi hiện tại.

### Kết quả cuối ngày 10/11/2026

- Backend build/test đã restore đúng lockfile; build thành công. Lần đầu `--no-restore` dùng assets cũ thiếu QuestPDF.dll gây lỗi ký hợp đồng, đã xử lý bằng restore; không sửa module ký hợp đồng.
- `dotnet test backend/TripOps.sln --no-restore -m:1`: **215 passed, 2 failed, 1 skipped / 218 tests**. Toàn bộ test chat, schema snapshot và OpenAPI pass. Một test integration SQL Server có sẵn bị Skip theo cấu hình của suite.
- Hai test failed: `BookingFlowTests.Deposit_requires_reference_and_exact_outstanding_amount_and_is_paid_once` (expected 422, actual 409) và `TourFlowTests.Rejected_platform_hotel_requires_replacement_before_approval` (expected 422, actual 200).
- Đối chiếu một bản `git archive HEAD backend` riêng, cùng cấu hình local và restore lockfile: **211 passed, 3 failed, 1 skipped / 215 tests**. Hai lỗi nêu trên có sẵn; lỗi thứ ba là schema test bỏ qua kiểu uniqueidentifier của creation_key cũ, đã được sửa trong lần cập nhật schema test này. Không sửa workflow booking/payment/tour để làm xanh các test cũ.
- `npm run typecheck`: pass. `npm test`: **51/51 pass**, gồm 3 test mới về merge REST/SignalR, read receipt đến trước REST response và UTC timestamps. `npm run build`: pass; còn cảnh báo case trùng có sẵn trong AdminDashboard, SignalR PURE comments và bundle lớn.
- Backend chat integration xác nhận anonymous REST/hub endpoint/negotiate bị 401, Origin không tin cậy bị 403, contact policy, non-participant bị từ chối trên REST và từng Hub method, input validation, sender lấy từ claims, idempotency, cursor, unread/read, tài khoản bị khóa mất quyền, nhiều WebSocket của cùng user, gửi qua Hub và REST, disconnect rồi gửi khi offline/kết nối mới/khôi phục history, concurrent create 8 requests và unique constraint chặn cặp đảo chiều.
- SQL Server migration compile/snapshot match và script sinh thành công, không có DROP TABLE/DELETE/TRUNCATE trong migration mới. Chưa thực thi trên database ứng dụng. Chưa thực hiện kiểm thử UI hai trình duyệt và network reconnect của JavaScript client như đã ghi ở checklist.
- Không commit/push, không reset/drop/recreate hay chạy migration lên database hiện hữu; thư mục mobile có sẵn không bị sửa.
