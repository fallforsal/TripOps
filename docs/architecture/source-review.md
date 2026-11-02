# Nhật ký đọc và bằng chứng nguồn

Ngày 2026-10-21. Đọc toàn bộ XML/OOXML bằng Python standard library. File nguồn giữ nguyên. Hash SHA-256 để phát hiện thay đổi sau đối chiếu; không phải dấu phê duyệt. Không đưa nội dung PII trong phiếu vào tài liệu đầu ra. Không dùng database khác trong UseCase/Page-8 làm baseline.

## Tất cả file nguồn

| File | SHA-256 | Trang/nội dung đã đọc |
|---|---|---|
| `AdminScreenFLow.drawio.xml` | `f2067b3fd83bfe6f2cf03613a1e3d672ade8b7a4528d708668713e548d459dcc` | Admin: 37 nhãn, 35 edge |
| `BackendPackageDiagram.drawio.xml` | `b178b8e6d3a7f70e1fb640468ec73fd15483ec9b11b60ad760b4a5af881fb85f` | Backend Package Diagram: 47 nhãn, 45 edge |
| `ContextDiagram.drawio.xml` | `5e50b9afda9f069d41588fd5932e0ac564b7148784c222c998f15ee383d13cd9` | Context Diagram V2: 61 nhãn, 53 edge |
| `CustomerScreenFlow.drawio.xml` | `95cb72fcefbf7fffd74e64173ab9613fa0ce2796e7371ed802f26612832897c3` | Customer: 44 nhãn, 43 edge |
| `ERD.drawio.xml` | `92736a1b70f4af749c007758c25abbc7ecc0690dfaadf1c31701508b299f0d42` | Database: 384 nhãn, 29 edge |
| `Phiếu Đăng kí đồ án cập nhật.docx` | `1ec493949434083f9b317200bbb91d24ff3a4c3a4904facf6731b1f49526e044` | 162 paragraphs gồm cả table cells; đọc toàn bộ §1–4, chỉ §3 dùng thiết kế |
| `ProviderScreenFlow.drawio.xml` | `5e4e01f5766987b4177a078ff7f26e008df392a822b723d9f2d362e59fd4637d` | Provider: 16 nhãn, 14 edge |
| `TourGuideScreenFlow.drawio.xml` | `675cda99866a7b400bf47a2006fde70a892c0f4f55411b9b5533d8a6c2741263` | Tour Guide: 13 nhãn, 11 edge |
| `TravelAgencyFlow.drawio.xml` | `f11254ea07d55f42737ee177a340fc2a8689cd0100761bccd4b07b712ce94410` | Travel Agency: 45 nhãn, 43 edge |
| `UseCase.drawio.xml` | `d9fb7182f96c5e17d41abb61b6aca87c3d5ab316a19c74d44c5ea282e05b9d8d` | Usecase: 161 nhãn, 136 edge; Database: 384 nhãn, 29 edge; Context Diagram: 115 nhãn, 99 edge; Page-8: 506 nhãn, 51 edge; Context Diagram V2: 61 nhãn, 53 edge; Admin: 37 nhãn, 35 edge; Customer: 44 nhãn, 43 edge; Travel Agency: 45 nhãn, 43 edge; Provider: 16 nhãn, 14 edge; Tour Guide: 13 nhãn, 11 edge; Backend Package Diagram: 47 nhãn, 45 edge |

## Kiểm tra package edges

Mọi edge backend/web/mobile được đọc từ XML. Endpoint không có source/target được giữ là MISSING, không tự gán theo vị trí.

| Edge ID | Source label | Target label |
|---|---|---|
| `g7bGeyyEzdwo6al8g-S9-108` | components | types |
| `g7bGeyyEzdwo6al8g-S9-109` | components | contexts |
| `g7bGeyyEzdwo6al8g-S9-112` | app | api |
| `g7bGeyyEzdwo6al8g-S9-113` | app | models |
| `g7bGeyyEzdwo6al8g-S9-114` | [MISSING/unnamed] | types |
| `g7bGeyyEzdwo6al8g-S9-115` | app | hooks |
| `g7bGeyyEzdwo6al8g-S9-116` | app | utils |
| `g7bGeyyEzdwo6al8g-S9-117` | app | assets |
| `g7bGeyyEzdwo6al8g-S9-118` | app | helpers |
| `g7bGeyyEzdwo6al8g-S9-119` | app | components |
| `g7bGeyyEzdwo6al8g-S9-120` | components | models |
| `g7bGeyyEzdwo6al8g-S9-121` | components | helpers |
| `g7bGeyyEzdwo6al8g-S9-123` | Repositories | DBContext |
| `g7bGeyyEzdwo6al8g-S9-124` | Repositories | Models |
| `g7bGeyyEzdwo6al8g-S9-125` | Repositories | GenericRepository |
| `g7bGeyyEzdwo6al8g-S9-126` | Repositories | IRepositories |
| `g7bGeyyEzdwo6al8g-S9-127` | [MISSING/unnamed] | GenericRepository |
| `g7bGeyyEzdwo6al8g-S9-128` | Service | Commons |
| `g7bGeyyEzdwo6al8g-S9-129` | Service | UnitOfWork |
| `g7bGeyyEzdwo6al8g-S9-130` | Service | IRepositories |
| `g7bGeyyEzdwo6al8g-S9-131` | Service | Enum |
| `g7bGeyyEzdwo6al8g-S9-132` | Service | Mappers |
| `g7bGeyyEzdwo6al8g-S9-133` | Workers | [MISSING/unnamed] |
| `g7bGeyyEzdwo6al8g-S9-134` | Service | Helpers |
| `g7bGeyyEzdwo6al8g-S9-135` | Service | Utils |
| `g7bGeyyEzdwo6al8g-S9-136` | Service | Hubs |
| `g7bGeyyEzdwo6al8g-S9-137` | Service | DTO |
| `g7bGeyyEzdwo6al8g-S9-138` | Service | IService |
| `g7bGeyyEzdwo6al8g-S9-139` | Controllers | IService |
| `g7bGeyyEzdwo6al8g-S9-140` | Controllers | DTO |
| `g7bGeyyEzdwo6al8g-S9-155` | main.dart | assets |
| `g7bGeyyEzdwo6al8g-S9-156` | main.dart | routes |
| `g7bGeyyEzdwo6al8g-S9-157` | routes | screens |
| `g7bGeyyEzdwo6al8g-S9-158` | screens | widgets |
| `g7bGeyyEzdwo6al8g-S9-159` | screens | constants |
| `g7bGeyyEzdwo6al8g-S9-160` | widgets | theme |
| `g7bGeyyEzdwo6al8g-S9-161` | widgets | assets |
| `g7bGeyyEzdwo6al8g-S9-162` | providers | repositories |
| `g7bGeyyEzdwo6al8g-S9-163` | providers | models |
| `g7bGeyyEzdwo6al8g-S9-164` | repositories | models |
| `g7bGeyyEzdwo6al8g-S9-165` | repositories | services |
| `g7bGeyyEzdwo6al8g-S9-166` | services | utils |
| `g7bGeyyEzdwo6al8g-S9-167` | utils | constants |
| `g7bGeyyEzdwo6al8g-S9-168` | [MISSING/unnamed] | theme |
| `g7bGeyyEzdwo6al8g-S9-169` | screens | providers |

## Navigation trong XML screen flow

Toàn bộ edge của năm file flow dùng điểm tọa độ, không có thuộc tính source/target gắn node. Bảng dưới giữ sourcePoint/targetPoint và chỉ liệt kê node chứa chính xác điểm đó theo mxGeometry (ứng viên hình học, không coi là quan hệ ngữ nghĩa đã xác nhận). Điểm nằm ngoài node giữ unresolved; không nối bằng node gần nhất. ERD inventory tách riêng và chỉ dùng thuộc tính source/target thật.

| File:edge ID | sourcePoint → targetPoint | Node ứng viên theo geometry |
|---|---|---|
| `AdminScreenFLow.drawio.xml:edge-0` | (300,891) → (345,891) | login → dashboard |
| `AdminScreenFLow.drawio.xml:edge-1` | (555,891) → (650,211) | dashboard → accounts |
| `AdminScreenFLow.drawio.xml:edge-2` | (860,211) → (950,211) | accounts → user_list |
| `AdminScreenFLow.drawio.xml:edge-3` | (1160,211) → (1225,211) | user_list → user_detail |
| `AdminScreenFLow.drawio.xml:edge-4` | (1160,211) → (1510,106) | user_list → user_create |
| `AdminScreenFLow.drawio.xml:edge-5` | (1435,211) → (1510,176) | user_detail → user_approve |
| `AdminScreenFLow.drawio.xml:edge-6` | (1435,211) → (1510,246) | user_detail → user_status |
| `AdminScreenFLow.drawio.xml:edge-7` | (1435,211) → (1510,316) | user_detail → user_delete |
| `AdminScreenFLow.drawio.xml:edge-8` | (555,891) → (650,496) | dashboard → plans |
| `AdminScreenFLow.drawio.xml:edge-9` | (860,496) → (950,496) | plans → plan_list |
| `AdminScreenFLow.drawio.xml:edge-10` | (1160,496) → (1230,426) | plan_list → plan_create |
| `AdminScreenFLow.drawio.xml:edge-11` | (1160,496) → (1230,496) | plan_list → plan_edit |
| `AdminScreenFLow.drawio.xml:edge-12` | (1160,496) → (1230,566) | plan_list → plan_delete |
| `AdminScreenFLow.drawio.xml:edge-13` | (555,891) → (650,791) | dashboard → services |
| `AdminScreenFLow.drawio.xml:edge-14` | (860,791) → (950,791) | services → service_list |
| `AdminScreenFLow.drawio.xml:edge-15` | (1160,791) → (1225,791) | service_list → service_detail |
| `AdminScreenFLow.drawio.xml:edge-16` | (1435,791) → (1510,721) | service_detail → service_approve |
| `AdminScreenFLow.drawio.xml:edge-17` | (1435,791) → (1510,791) | service_detail → service_reject |
| `AdminScreenFLow.drawio.xml:edge-18` | (1435,791) → (1510,861) | service_detail → service_suspend |
| `AdminScreenFLow.drawio.xml:edge-19` | (555,891) → (650,1086) | dashboard → disputes |
| `AdminScreenFLow.drawio.xml:edge-20` | (860,1086) → (950,1086) | disputes → complaint_list |
| `AdminScreenFLow.drawio.xml:edge-21` | (1160,1086) → (1225,1086) | complaint_list → dispute_detail |
| `AdminScreenFLow.drawio.xml:edge-22` | (1435,1086) → (1510,1051) | dispute_detail → evidence |
| `AdminScreenFLow.drawio.xml:edge-23` | (1435,1086) → (1510,1121) | dispute_detail → resolution |
| `AdminScreenFLow.drawio.xml:edge-24` | (555,891) → (650,1361) | dashboard → refunds |
| `AdminScreenFLow.drawio.xml:edge-25` | (860,1361) → (950,1361) | refunds → refund_list |
| `AdminScreenFLow.drawio.xml:edge-26` | (1160,1361) → (1225,1361) | refund_list → refund_detail |
| `AdminScreenFLow.drawio.xml:edge-27` | (1435,1361) → (1510,1291) | refund_detail → refund_calc |
| `AdminScreenFLow.drawio.xml:edge-28` | (1435,1361) → (1510,1361) | refund_detail → refund_approve |
| `AdminScreenFLow.drawio.xml:edge-29` | (1435,1361) → (1510,1431) | refund_detail → refund_reject |
| `AdminScreenFLow.drawio.xml:edge-30` | (555,891) → (650,1661) | dashboard → finance |
| `AdminScreenFLow.drawio.xml:edge-31` | (860,1661) → (950,1586) | finance → transactions |
| `AdminScreenFLow.drawio.xml:edge-32` | (860,1661) → (950,1661) | finance → settlements |
| `AdminScreenFLow.drawio.xml:edge-33` | (860,1661) → (950,1736) | finance → bank |
| `AdminScreenFLow.drawio.xml:edge-34` | (1160,1736) → (1230,1736) | bank → withdrawal |
| `CustomerScreenFlow.drawio.xml:edge-0` | (290,251) → (360,251) | login → home |
| `CustomerScreenFlow.drawio.xml:edge-1` | (290,111) → (360,111) | register → verify |
| `CustomerScreenFlow.drawio.xml:edge-2` | (570,111) → (80,251) | verify → login |
| `CustomerScreenFlow.drawio.xml:edge-3` | (290,251) → (80,391) | login → forgot |
| `CustomerScreenFlow.drawio.xml:edge-4` | (570,251) → (360,391) | home → profile |
| `CustomerScreenFlow.drawio.xml:edge-5` | (570,391) → (640,391) | profile → update_profile |
| `CustomerScreenFlow.drawio.xml:edge-6` | (570,251) → (650,221) | home → tour_list |
| `CustomerScreenFlow.drawio.xml:edge-7` | (860,221) → (930,221) | tour_list → tour_detail |
| `CustomerScreenFlow.drawio.xml:edge-8` | (1140,221) → (1210,221) | tour_detail → customize |
| `CustomerScreenFlow.drawio.xml:edge-9` | (1420,221) → (1490,221) | customize → price |
| `CustomerScreenFlow.drawio.xml:edge-10` | (1420,221) → (1210,86) | customize → hotel |
| `CustomerScreenFlow.drawio.xml:edge-11` | (1420,221) → (1210,356) | customize → meal |
| `CustomerScreenFlow.drawio.xml:edge-12` | (1420,221) → (1490,86) | customize → provider_hotel |
| `CustomerScreenFlow.drawio.xml:edge-13` | (1420,221) → (1490,356) | customize → provider_meal |
| `CustomerScreenFlow.drawio.xml:edge-14` | (1700,221) → (1770,356) | price → sightseeing |
| `CustomerScreenFlow.drawio.xml:edge-15` | (570,251) → (650,506) | home → ai_search |
| `CustomerScreenFlow.drawio.xml:edge-16` | (860,506) → (930,506) | ai_search → ai_results |
| `CustomerScreenFlow.drawio.xml:edge-17` | (570,251) → (650,691) | home → requests |
| `CustomerScreenFlow.drawio.xml:edge-18` | (860,691) → (930,691) | requests → request_list |
| `CustomerScreenFlow.drawio.xml:edge-19` | (1140,691) → (1210,691) | request_list → request_detail |
| `CustomerScreenFlow.drawio.xml:edge-20` | (1140,691) → (1490,621) | request_list → request_create |
| `CustomerScreenFlow.drawio.xml:edge-21` | (1420,691) → (1490,761) | request_detail → request_cancel |
| `CustomerScreenFlow.drawio.xml:edge-22` | (570,251) → (650,991) | home → booking |
| `CustomerScreenFlow.drawio.xml:edge-23` | (860,991) → (930,991) | booking → booking_history |
| `CustomerScreenFlow.drawio.xml:edge-24` | (1700,221) → (1700,851) | price → booking_form |
| `CustomerScreenFlow.drawio.xml:edge-25` | (1140,991) → (1210,991) | booking_history → booking_detail |
| `CustomerScreenFlow.drawio.xml:edge-26` | (1420,991) → (1490,921) | booking_detail → contract |
| `CustomerScreenFlow.drawio.xml:edge-27` | (1700,851) → (1210,991) | booking_form → booking_detail |
| `CustomerScreenFlow.drawio.xml:edge-28` | (1420,991) → (1490,991) | booking_detail → deposit_request |
| `CustomerScreenFlow.drawio.xml:edge-29` | (1700,991) → (1770,991) | deposit_request → deposit_payment |
| `CustomerScreenFlow.drawio.xml:edge-30` | (1420,991) → (1490,1131) | booking_detail → balance_request |
| `CustomerScreenFlow.drawio.xml:edge-31` | (1700,1131) → (1770,1131) | balance_request → final_payment |
| `CustomerScreenFlow.drawio.xml:edge-32` | (1420,991) → (1210,1131) | booking_detail → payment_history |
| `CustomerScreenFlow.drawio.xml:edge-33` | (570,251) → (650,1366) | home → reviews |
| `CustomerScreenFlow.drawio.xml:edge-34` | (860,1366) → (930,1366) | reviews → review_list |
| `CustomerScreenFlow.drawio.xml:edge-35` | (1140,1366) → (1210,1366) | review_list → own_reviews |
| `CustomerScreenFlow.drawio.xml:edge-36` | (1420,1366) → (1490,1296) | own_reviews → review_update |
| `CustomerScreenFlow.drawio.xml:edge-37` | (1420,1366) → (1490,1436) | own_reviews → review_delete |
| `CustomerScreenFlow.drawio.xml:edge-38` | (570,251) → (650,1631) | home → issues |
| `CustomerScreenFlow.drawio.xml:edge-39` | (860,1631) → (930,1571) | issues → complaints |
| `CustomerScreenFlow.drawio.xml:edge-40` | (860,1631) → (1210,1571) | issues → complaint_create |
| `CustomerScreenFlow.drawio.xml:edge-41` | (860,1631) → (930,1691) | issues → refund_requests |
| `CustomerScreenFlow.drawio.xml:edge-42` | (860,1631) → (1210,1691) | issues → refund_status |
| `ProviderScreenFlow.drawio.xml:edge-0` | (290,516) → (345,516) | login → dashboard |
| `ProviderScreenFlow.drawio.xml:edge-1` | (555,516) → (650,236) | dashboard → profile |
| `ProviderScreenFlow.drawio.xml:edge-2` | (860,236) → (950,236) | profile → profile_detail |
| `ProviderScreenFlow.drawio.xml:edge-3` | (1160,236) → (1230,236) | profile_detail → profile_edit |
| `ProviderScreenFlow.drawio.xml:edge-4` | (555,516) → (650,516) | dashboard → services |
| `ProviderScreenFlow.drawio.xml:edge-5` | (860,516) → (950,516) | services → service_list |
| `ProviderScreenFlow.drawio.xml:edge-6` | (1160,516) → (1230,516) | service_list → service_detail |
| `ProviderScreenFlow.drawio.xml:edge-7` | (1160,516) → (1510,371) | service_list → service_create |
| `ProviderScreenFlow.drawio.xml:edge-8` | (1440,516) → (1510,441) | service_detail → service_update |
| `ProviderScreenFlow.drawio.xml:edge-9` | (1440,516) → (1510,511) | service_detail → service_images |
| `ProviderScreenFlow.drawio.xml:edge-10` | (1440,516) → (1510,581) | service_detail → service_delete |
| `ProviderScreenFlow.drawio.xml:edge-11` | (555,516) → (650,796) | dashboard → approval |
| `ProviderScreenFlow.drawio.xml:edge-12` | (860,796) → (950,796) | approval → approval_status |
| `ProviderScreenFlow.drawio.xml:edge-13` | (1160,796) → (1230,796) | approval_status → rejection_reason |
| `TourGuideScreenFlow.drawio.xml:edge-0` | (290,516) → (345,516) | login → dashboard |
| `TourGuideScreenFlow.drawio.xml:edge-1` | (555,516) → (650,236) | dashboard → assigned |
| `TourGuideScreenFlow.drawio.xml:edge-2` | (860,236) → (950,236) | assigned → assigned_list |
| `TourGuideScreenFlow.drawio.xml:edge-3` | (1160,236) → (1230,236) | assigned_list → trip_detail |
| `TourGuideScreenFlow.drawio.xml:edge-4` | (555,516) → (650,516) | dashboard → locations |
| `TourGuideScreenFlow.drawio.xml:edge-5` | (860,516) → (950,516) | locations → location_list |
| `TourGuideScreenFlow.drawio.xml:edge-6` | (1160,516) → (1230,481) | location_list → check_in |
| `TourGuideScreenFlow.drawio.xml:edge-7` | (1440,481) → (1510,481) | check_in → check_status |
| `TourGuideScreenFlow.drawio.xml:edge-8` | (555,516) → (650,796) | dashboard → history |
| `TourGuideScreenFlow.drawio.xml:edge-9` | (860,796) → (950,796) | history → history_list |
| `TourGuideScreenFlow.drawio.xml:edge-10` | (1160,796) → (1230,796) | history_list → history_detail |
| `TravelAgencyFlow.drawio.xml:edge-0` | (290,971) → (345,971) | login → dashboard |
| `TravelAgencyFlow.drawio.xml:edge-1` | (555,971) → (650,221) | dashboard → tours |
| `TravelAgencyFlow.drawio.xml:edge-2` | (860,221) → (950,221) | tours → tour_list |
| `TravelAgencyFlow.drawio.xml:edge-3` | (1160,221) → (1225,221) | tour_list → tour_detail |
| `TravelAgencyFlow.drawio.xml:edge-4` | (1160,221) → (1510,86) | tour_list → tour_create |
| `TravelAgencyFlow.drawio.xml:edge-5` | (1160,221) → (1510,156) | tour_list → ai_draft |
| `TravelAgencyFlow.drawio.xml:edge-6` | (1435,221) → (1510,226) | tour_detail → tour_edit |
| `TravelAgencyFlow.drawio.xml:edge-7` | (1435,221) → (1510,296) | tour_detail → tour_duplicate |
| `TravelAgencyFlow.drawio.xml:edge-8` | (1435,221) → (1510,366) | tour_detail → tour_versions |
| `TravelAgencyFlow.drawio.xml:edge-9` | (1435,221) → (1510,436) | tour_detail → tour_restore |
| `TravelAgencyFlow.drawio.xml:edge-10` | (555,971) → (650,571) | dashboard → requests |
| `TravelAgencyFlow.drawio.xml:edge-11` | (860,571) → (950,571) | requests → request_list |
| `TravelAgencyFlow.drawio.xml:edge-12` | (1160,571) → (1225,571) | request_list → request_detail |
| `TravelAgencyFlow.drawio.xml:edge-13` | (1435,571) → (1510,501) | request_detail → request_status |
| `TravelAgencyFlow.drawio.xml:edge-14` | (1435,571) → (1510,571) | request_detail → request_quote |
| `TravelAgencyFlow.drawio.xml:edge-15` | (1435,571) → (1510,641) | request_detail → request_tour |
| `TravelAgencyFlow.drawio.xml:edge-16` | (555,971) → (650,841) | dashboard → cohost |
| `TravelAgencyFlow.drawio.xml:edge-17` | (860,841) → (950,841) | cohost → invitation_list |
| `TravelAgencyFlow.drawio.xml:edge-18` | (1160,841) → (1225,841) | invitation_list → invitation_detail |
| `TravelAgencyFlow.drawio.xml:edge-19` | (1435,841) → (1510,751) | invitation_detail → invite |
| `TravelAgencyFlow.drawio.xml:edge-20` | (1435,841) → (1510,821) | invitation_detail → accept |
| `TravelAgencyFlow.drawio.xml:edge-21` | (1435,841) → (1510,891) | invitation_detail → reject |
| `TravelAgencyFlow.drawio.xml:edge-22` | (1435,841) → (1510,961) | invitation_detail → segment_quote |
| `TravelAgencyFlow.drawio.xml:edge-23` | (1435,841) → (1510,1031) | invitation_detail → combined_price |
| `TravelAgencyFlow.drawio.xml:edge-24` | (555,971) → (650,1151) | dashboard → bookings |
| `TravelAgencyFlow.drawio.xml:edge-25` | (860,1151) → (950,1151) | bookings → booking_list |
| `TravelAgencyFlow.drawio.xml:edge-26` | (1160,1151) → (1225,1151) | booking_list → booking_detail |
| `TravelAgencyFlow.drawio.xml:edge-27` | (1435,1151) → (1510,1081) | booking_detail → selected_services |
| `TravelAgencyFlow.drawio.xml:edge-28` | (1435,1151) → (1510,1151) | booking_detail → booking_price |
| `TravelAgencyFlow.drawio.xml:edge-29` | (1435,1151) → (1510,1221) | booking_detail → booking_contract |
| `TravelAgencyFlow.drawio.xml:edge-30` | (1435,1151) → (1510,1291) | booking_detail → booking_decision |
| `TravelAgencyFlow.drawio.xml:edge-31` | (555,971) → (650,1491) | dashboard → payments |
| `TravelAgencyFlow.drawio.xml:edge-32` | (860,1491) → (950,1491) | payments → payment_list |
| `TravelAgencyFlow.drawio.xml:edge-33` | (1160,1491) → (1225,1491) | payment_list → payment_detail |
| `TravelAgencyFlow.drawio.xml:edge-34` | (1435,1491) → (1510,1371) | payment_detail → deposit |
| `TravelAgencyFlow.drawio.xml:edge-35` | (1435,1491) → (1510,1441) | payment_detail → revised_deposit |
| `TravelAgencyFlow.drawio.xml:edge-36` | (1435,1491) → (1510,1511) | payment_detail → deposit_status |
| `TravelAgencyFlow.drawio.xml:edge-37` | (1435,1491) → (1510,1581) | payment_detail → balance |
| `TravelAgencyFlow.drawio.xml:edge-38` | (1435,1491) → (1510,1651) | payment_detail → balance_status |
| `TravelAgencyFlow.drawio.xml:edge-39` | (555,971) → (650,1811) | dashboard → guides |
| `TravelAgencyFlow.drawio.xml:edge-40` | (860,1811) → (950,1811) | guides → guide_list |
| `TravelAgencyFlow.drawio.xml:edge-41` | (1160,1811) → (1225,1811) | guide_list → guide_detail |
| `TravelAgencyFlow.drawio.xml:edge-42` | (1435,1811) → (1510,1811) | guide_detail → guide_assign |

## Giới hạn và cách tái lập

Đọc tất cả nhãn/cột/cạnh và paragraph là kiểm tra cấu trúc/nội dung, không phải render QA Word hoặc xác nhận UX chạy được. Không có source code/build target để thực thi trong Task 0. UseCase trang cũ chỉ dùng ghi nhận mâu thuẫn; mọi bảng/cột schema proposal lấy từ ERD độc lập. Các màn hình/cạnh trùng trong UseCase không tăng baseline.

Sau khi Q1–Q11 được chốt, hai generator Task0 đã đóng băng để không ghi đè thiết kế hiện hành; `python docs/tools/source_audit.py --check` kiểm tra coverage và hash. Hai generator chỉ ghi tài liệu đích, không ghi docs/source, không tạo DDL. Tránh sửa tay phần đã sinh mà không sửa generator.
