# TripOps Guide mobile

Flutter3.41.9 stable/Dart3.11.5, Android và iOS scaffold. App chỉ kiểm tra kết nối thật qua HTTP, chưa có auth hoặc Guide business flow. Dependency khóa pubspec.lock, SDK pin .fvmrc (FVM tùy chọn).

Xem [README gốc](../README.md) cho API/emulator/máy thật. Android emulator mặc định http://10.0.2.2:5080; iOS simulator dùng http://127.0.0.1:5080 khi API cùng máy Mac, nếu API ở Windows thì dùng IP LAN Windows. Máy thật dùng IP LAN máy chạy API. Truyền --dart-define=API_BASE_URL, backend bind LAN khi cần. Chỉ Debug cho phép HTTP local; Release cần HTTPS.

Mở terminal mobile mới tại repo root; giữ API ở terminal backend riêng. Đặt cache trước khi chuyển thư mục:

```powershell
$env:PUB_CACHE = Join-Path (Get-Location) '.local/pub-cache'
Set-Location mobile
flutter pub get --enforce-lockfile
flutter devices
flutter run --dart-define=API_BASE_URL=http://10.0.2.2:5080
```

`flutter pub get --enforce-lockfile`, `flutter analyze`, `flutter test`. Android build cần toolchain, iOS cần macOS/Xcode; analyze/test không thay device verification. Không báo đã gửi khi backend chưa xác nhận. HTTP mock chỉ trong test và gắn nhãn rõ, app không giả backend success.

Analyze/test dành cho kiểm tra trước PR sau pub get, không phải điều kiện mỗi lần mở app. Python chỉ dành cho maintainer kiểm tài liệu/cấu trúc. Android/iOS device build và thao tác kết nối trên thiết bị chưa được kiểm chứng trong lần rà soát bàn giao; xem progress ở README gốc.
