import { Booking } from "@/app/types";
import { getMockTourById } from "./mockData";

export function createStatusMatrixBookings(): Booking[] {
  return [
    // ==========================================================================
    // 1. [Pending + Unpaid] - CHỜ PROVIDER DUYỆT (1 ĐÃ DUYỆT, 1 ĐANG CHỜ)
    // Đơn mới gửi, Khách sạn đã duyệt, Nhà hàng đang chờ duyệt
    // -> Nút Duyệt Booking của Agency BỊ KHÓA cho tới khi Provider phê duyệt
    // ==========================================================================
    {
      id: "pending-unpaid",
      tourId: "tour-1",
      tour: getMockTourById("tour-1"),
      userId: "user-1",
      userName: "Phạm Hải Đăng",
      userEmail: "khachhang.fpt@gmail.com",
      contactName: "Phạm Hải Đăng",
      contactPhone: "0933 888 999",
      contactEmail: "khachhang.fpt@gmail.com",
      contactAddress: "Tòa nhà FPT, Cầu Giấy, Hà Nội",
      numberOfGuests: 2,
      totalPrice: 10800000,
      originalTotalPrice: 10800000,
      depositAmount: 0,
      depositPaid: false,
      paymentStatus: "unpaid",
      status: "pending",
      bookingDate: "2026-10-24",
      tourStartDate: "2026-11-15",
      companyId: "company-1",
      companyName: "Viettravel",
      bookingNotes:
        "Case 1 (Chờ Provider duyệt): Khách sạn Heritage đã duyệt phòng. Nhà hàng Làng Nướng đang chờ xác nhận giữ bàn 18:30. Nút Duyệt booking bị khóa.",
      passengers: [
        { id: "p-m1-1", fullName: "Phạm Hải Đăng", ageGroup: "adult", price: 5400000 },
        { id: "p-m1-2", fullName: "Nguyễn Thu Thảo", ageGroup: "adult", price: 5400000 },
      ],
      hasLocationCustomization: true,
      customHotelChanges: [
        {
          destination: "Đà Lạt",
          originalHotelName: "Khách sạn Đà Lạt Palace Heritage (4★)",
          newHotelName: "Khách Sạn Heritage Đà Lạt",
          mode: "provider",
          isProviderService: true,
          serviceId: "service-1",
          providerId: "provider-1",
          providerName: "Tổ hợp Dịch vụ Du lịch Heritage",
          providerPhone: "0263 3825 444",
          providerAddress: "02 Trần Phú, Phường 3, TP. Đà Lạt",
          stars: 4,
          priceDifference: 400000,
          providerStatus: "confirmed",
          providerConfirmedAt: "24/10/2026 14:15",
          note: "Khách nâng cấp lên khách sạn đối tác Heritage view rừng thông",
        },
      ],
      customMealChanges: [
        {
          dayNumber: 1,
          mealType: "dinner",
          time: "18:30",
          originalMealName: "Nhà hàng Chợ Đêm & Phố Ẩm Thực Đà Lạt",
          newMealName: "Nhà hàng Làng Nướng Đà Lạt",
          mode: "provider",
          isProviderService: true,
          serviceId: "service-fnb-dl-5",
          providerId: "provider-1",
          providerName: "Tổ hợp Dịch vụ Du lịch Heritage",
          providerPhone: "0263 3825 444",
          providerAddress: "02 Trần Phú, Phường 3, TP. Đà Lạt",
          priceDifference: 60000,
          providerStatus: "pending",
          note: "Khách đổi sang ăn tối tại Nhà hàng Làng Nướng lúc 18h30. Đang chờ nhà hàng xác nhận bàn.",
        },
      ],
    },

    // ==========================================================================
    // 1B. [Pending + All Providers Confirmed] - TẤT CẢ PROVIDER ĐÃ DUYỆT
    // Cả khách sạn và các nhà hàng đối tác đều ĐÃ DUYỆT
    // -> Nút Duyệt Booking của Agency SÁNG XANH, sẵn sàng duyệt ngay
    // ==========================================================================
    {
      id: "booking-pending-all-confirmed",
      tourId: "tour-1",
      tour: getMockTourById("tour-1"),
      userId: "user-2",
      userName: "Lê Hoàng Yến",
      userEmail: "hoangyen.le@gmail.com",
      contactName: "Lê Hoàng Yến",
      contactPhone: "0912 666 777",
      contactEmail: "hoangyen.le@gmail.com",
      contactAddress: "Quận 1, TP. Hồ Chí Minh",
      numberOfGuests: 4,
      totalPrice: 21600000,
      originalTotalPrice: 21600000,
      depositAmount: 0,
      depositPaid: false,
      paymentStatus: "unpaid",
      status: "pending",
      bookingDate: "2026-10-25",
      tourStartDate: "2026-11-20",
      companyId: "company-1",
      companyName: "Viettravel",
      bookingNotes:
        "Case 1B (Đủ điều kiện duyệt): Cả Khách sạn Dalat Edensee và Nhà hàng Cơm Niêu Trúc Lâm Viên đều đã duyệt xác nhận. Agency có thể duyệt booking ngay.",
      passengers: [
        { id: "p-allc-1", fullName: "Lê Hoàng Yến", ageGroup: "adult", price: 5400000 },
        { id: "p-allc-2", fullName: "Nguyễn Văn Tuấn", ageGroup: "adult", price: 5400000 },
        { id: "p-allc-3", fullName: "Nguyễn Hoàng Nam", ageGroup: "adult", price: 5400000 },
        { id: "p-allc-4", fullName: "Nguyễn Hoàng My", ageGroup: "adult", price: 5400000 },
      ],
      hasLocationCustomization: true,
      customHotelChanges: [
        {
          destination: "Đà Lạt",
          originalHotelName: "Khách sạn Đà Lạt Palace Heritage (4★)",
          newHotelName: "Dalat Edensee Lake Resort & Spa",
          mode: "provider",
          isProviderService: true,
          serviceId: "service-hotel-dl-3",
          providerId: "provider-1",
          providerName: "Tổ hợp Dịch vụ Du lịch Heritage",
          providerPhone: "0263 3825 444",
          providerAddress: "Khu du lịch Hồ Tuyền Lâm, Phường 4, TP. Đà Lạt",
          stars: 5,
          priceDifference: 1450000,
          providerStatus: "confirmed",
          providerConfirmedAt: "25/10/2026 10:20",
          note: "Khách nâng cấp resort 5 sao bên hồ Tuyền Lâm.",
        },
      ],
      customMealChanges: [
        {
          dayNumber: 1,
          mealType: "lunch",
          time: "11:30",
          originalMealName: "Nhà hàng Hương Rừng Đà Lạt",
          newMealName: "Nhà Hàng Cơm Niêu Trúc Lâm Viên",
          mode: "provider",
          isProviderService: true,
          serviceId: "service-fnb-dl-3",
          providerId: "provider-1",
          providerName: "Tổ hợp Dịch vụ Du lịch Heritage",
          providerPhone: "0263 3825 444",
          providerAddress: "Trần Phú, Phường 3, Đà Lạt",
          priceDifference: 50000,
          providerStatus: "confirmed",
          providerConfirmedAt: "25/10/2026 11:00",
          note: "Khách đổi sang ăn cơm niêu truyền thống trưa ngày 1 lúc 11h30.",
        },
      ],
    },

    // ==========================================================================
    // 1C. [Pending + Custom Self-filled] - KHÁCH TỰ ĐIỀN NGOÀI SÀN
    // Khách hàng tự nhập tay Homestay và Quán ăn ngoài hệ thống
    // -> Không có Provider trên sàn duyệt tự động. Agency tự liên hệ, không chặn duyệt.
    // ==========================================================================
    {
      id: "booking-pending-custom-entries",
      tourId: "tour-1",
      tour: getMockTourById("tour-1"),
      userId: "user-3",
      userName: "Trần Minh Quân",
      userEmail: "minhquan.tran@gmail.com",
      contactName: "Trần Minh Quân",
      contactPhone: "0909 333 444",
      contactEmail: "minhquan.tran@gmail.com",
      contactAddress: "Bình Thạnh, TP. Hồ Chí Minh",
      numberOfGuests: 2,
      totalPrice: 10800000,
      originalTotalPrice: 10800000,
      depositAmount: 0,
      depositPaid: false,
      paymentStatus: "unpaid",
      status: "pending",
      bookingDate: "2026-10-26",
      tourStartDate: "2026-11-25",
      companyId: "company-1",
      companyName: "Viettravel",
      bookingNotes:
        "Case 1C (Khách tự nhập ngoài sàn): Khách tự nhập The Wilder-nest Homestay và Quán Bánh Căn Lệ. Agency tự liên hệ qua Google Maps, không có Provider duyệt trên hệ thống.",
      passengers: [
        { id: "p-custom-1", fullName: "Trần Minh Quân", ageGroup: "adult", price: 5400000 },
        { id: "p-custom-2", fullName: "Nguyễn Hải Yến", ageGroup: "adult", price: 5400000 },
      ],
      hasLocationCustomization: true,
      customHotelChanges: [
        {
          destination: "Đà Lạt",
          originalHotelName: "Khách sạn Đà Lạt Palace Heritage (4★)",
          newHotelName: "The Wilder-nest Homestay Đà Lạt",
          mode: "custom",
          isCustom: true,
          stars: 3,
          address: "Đường Tuyền Lâm, Phường 4, TP. Đà Lạt (Gần Hồ Tuyền Lâm)",
          priceDifference: 0,
          note: "Khách yêu cầu tự ở homestay phong cách mộc mạc đồi thông. Agency tự liên hệ đặt phòng.",
        },
      ],
      customMealChanges: [
        {
          dayNumber: 1,
          mealType: "dinner",
          time: "19:00",
          originalMealName: "Nhà hàng Chợ Đêm & Phố Ẩm Thực Đà Lạt",
          newMealName: "Quán Bánh Căn Lệ Yersin",
          mode: "custom",
          isCustom: true,
          address: "27/44 Yersin, Phường 10, TP. Đà Lạt",
          priceDifference: 0,
          note: "Khách muốn tự trải nghiệm quán bánh căn Lệ nức tiếng tại Đà Lạt lúc 19h00.",
        },
      ],
    },

    // ==========================================================================
    // 1D. [Pending + Provider Rejected] - PROVIDER TỪ CHỐI DỊCH VỤ
    // Nhà hàng từ chối do kín bàn vào khung giờ đặt
    // -> Agency thấy cảnh báo từ chối rõ ràng và lý do từ chối để đổi dịch vụ
    // ==========================================================================
    {
      id: "booking-pending-provider-rejected",
      tourId: "tour-1",
      tour: getMockTourById("tour-1"),
      userId: "user-4",
      userName: "Đặng Thị Mai",
      userEmail: "thimai.dang@gmail.com",
      contactName: "Đặng Thị Mai",
      contactPhone: "0944 555 666",
      contactEmail: "thimai.dang@gmail.com",
      contactAddress: "Ninh Kiều, Cần Thơ",
      numberOfGuests: 6,
      totalPrice: 32400000,
      originalTotalPrice: 32400000,
      depositAmount: 0,
      depositPaid: false,
      paymentStatus: "unpaid",
      status: "pending",
      bookingDate: "2026-10-26",
      tourStartDate: "2026-11-28",
      companyId: "company-1",
      companyName: "Viettravel",
      bookingNotes:
        "Case 1D (Provider từ chối): Khách sạn Heritage đã duyệt nhưng Nhà hàng Lẩu Gà Lá É Tao Ngộ từ chối do hết bàn lúc 12h00.",
      passengers: [
        { id: "p-rej-1", fullName: "Đặng Thị Mai", ageGroup: "adult", price: 5400000 },
        { id: "p-rej-2", fullName: "Võ Văn Hùng", ageGroup: "adult", price: 5400000 },
        { id: "p-rej-3", fullName: "Võ Mai Anh", ageGroup: "adult", price: 5400000 },
        { id: "p-rej-4", fullName: "Đặng Quốc Bảo", ageGroup: "adult", price: 5400000 },
        { id: "p-rej-5", fullName: "Lê Thị Thảo", ageGroup: "adult", price: 5400000 },
        { id: "p-rej-6", fullName: "Trần Văn An", ageGroup: "adult", price: 5400000 },
      ],
      hasLocationCustomization: true,
      customHotelChanges: [
        {
          destination: "Đà Lạt",
          originalHotelName: "Khách sạn Đà Lạt Palace Heritage (4★)",
          newHotelName: "Khách Sạn Heritage Đà Lạt",
          mode: "provider",
          isProviderService: true,
          serviceId: "service-1",
          providerId: "provider-1",
          providerName: "Tổ hợp Dịch vụ Du lịch Heritage",
          providerPhone: "0263 3825 444",
          providerAddress: "02 Trần Phú, Phường 3, TP. Đà Lạt",
          stars: 4,
          priceDifference: 400000,
          providerStatus: "confirmed",
          providerConfirmedAt: "26/10/2026 14:00",
        },
      ],
      customMealChanges: [
        {
          dayNumber: 2,
          mealType: "lunch",
          time: "12:00",
          originalMealName: "Nhà hàng Làng Nướng Đà Lạt",
          newMealName: "Lẩu Gà Lá É Tao Ngộ Quán",
          mode: "provider",
          isProviderService: true,
          serviceId: "service-fnb-dl-4",
          providerId: "provider-1",
          providerName: "Tổ hợp Dịch vụ Du lịch Heritage",
          providerPhone: "0263 3825 444",
          providerAddress: "02 Trần Phú, Phường 3, TP. Đà Lạt",
          priceDifference: 60000,
          providerStatus: "rejected",
          providerRejectionReason: "Nhà hàng kín bàn vào khung giờ 12h00 trưa ngày này do có đoàn 80 khách đặt trước.",
          note: "Khách chọn đổi sang ăn Lẩu gà lá é Tao Ngộ lúc 12h00.",
        },
      ],
    },

    // ==========================================================================
    // 2. [Deposited + PartiallyPaid] - ĐÃ ĐẶT CỌC
    // Khách đã đóng cọc 15.000.000đ (>= 30%). Đã giữ chỗ chắc chắn.
    // -> Bấm Hủy -> KÍCH HOẠT FORM HOÀN TIỀN CỌC (15.000.000đ) QUA ADMIN
    // ==========================================================================
    {
      id: "pending-deposit",
      tourId: "tour-2",
      tour: getMockTourById("tour-2"),
      userId: "user-1",
      userName: "Phạm Hải Đăng",
      userEmail: "khachhang.fpt@gmail.com",
      contactName: "Phạm Hải Đăng",
      contactPhone: "0933 888 999",
      contactEmail: "khachhang.fpt@gmail.com",
      contactAddress: "Tòa nhà FPT, Cầu Giấy, Hà Nội",
      numberOfGuests: 5,
      totalPrice: 35000000,
      originalTotalPrice: 35000000,
      depositAmount: 15000000,
      depositPaid: true,
      remainingAmount: 20000000,
      paymentStatus: "partially_paid",
      status: "deposited",
      bookingDate: "2026-10-23",
      tourStartDate: "2026-11-25", // Còn 31 ngày >= 7 ngày
      companyId: "company-2",
      companyName: "Hà Giang Discovery Travel",
      bookingNotes:
        "Case 2 (Deposited + PartiallyPaid): Khách đã đóng cọc 15.000.000đ. Trạng thái đơn là Đã đặt cọc. Khi hủy sẽ kích hoạt hoàn tiền cọc.",
    },

    // ==========================================================================
    // 3. [Confirmed + Unpaid] - ĐÃ XÁC NHẬN (CHƯA THANH TOÁN)
    // Agency duyệt đơn cho thanh toán sau / lên xe trả tiền (0đ)
    // -> Bấm Hủy -> HỦY TRỰC TIẾP NGAY LẬP TỨC (Không mất phí)
    // ==========================================================================
    {
      id: "confirmed-unpaid",
      tourId: "tour-5",
      tour: getMockTourById("tour-5"),
      userId: "user-1",
      userName: "Phạm Hải Đăng",
      userEmail: "khachhang.fpt@gmail.com",
      contactName: "Phạm Hải Đăng",
      contactPhone: "0933 888 999",
      contactEmail: "khachhang.fpt@gmail.com",
      numberOfGuests: 2,
      totalPrice: 14600000,
      originalTotalPrice: 14600000,
      depositAmount: 0,
      depositPaid: false,
      paymentStatus: "unpaid",
      status: "confirmed",
      bookingDate: "2026-10-20",
      tourStartDate: "2026-11-10",
      companyId: "company-4",
      companyName: "Hà Giang Discovery",
      bookingNotes:
        "Case 3 (Confirmed + Unpaid): Agency đã duyệt nhưng khách chưa thanh toán tiền. Khi hủy sẽ hủy trực tiếp 0đ.",
    },

    // ==========================================================================
    // 4. [Confirmed + PartiallyPaid] - ĐÃ XÁC NHẬN (ĐÃ CỌC MỘT PHẦN)
    // Agency đã duyệt & Khách đã đóng cọc 12.000.000đ
    // -> Bấm Hủy -> Mở form hoàn tiền cọc theo chính sách sàn
    // ==========================================================================
    {
      id: "confirmed-deposit",
      tourId: "tour-4",
      tour: getMockTourById("tour-4"),
      userId: "user-1",
      userName: "Phạm Hải Đăng",
      userEmail: "khachhang.fpt@gmail.com",
      contactName: "Phạm Hải Đăng",
      contactPhone: "0933 888 999",
      contactEmail: "khachhang.fpt@gmail.com",
      numberOfGuests: 4,
      totalPrice: 24000000,
      originalTotalPrice: 24000000,
      depositAmount: 12000000,
      depositPaid: true,
      remainingAmount: 12000000,
      paymentStatus: "partially_paid",
      status: "confirmed",
      bookingDate: "2026-10-21",
      tourStartDate: "2026-11-28", // Còn 34 ngày >= 7 ngày
      companyId: "company-1",
      companyName: "Viettravel",
      bookingNotes:
        "Case 4 (Confirmed + PartiallyPaid): Agency đã duyệt và khách đã cọc 12.000.000đ. Khi hủy sẽ mở hoàn tiền cọc.",
    },

    // ==========================================================================
    // 5. [Paid + Paid] - ĐÃ THANH TOÁN ĐỦ 100% (HỦY TRƯỚC >= 7 NGÀY -> HOÀN 100%)
    // Đã thanh toán 16.500.000đ. Khởi hành 20/11/2026 (Còn 26 ngày >= 7 ngày)
    // -> Bấm Hủy -> Tự động tính hoàn 100% (16.500.000đ, phí hủy 0đ)
    // ==========================================================================
    {
      id: "confirmed-paid-100",
      tourId: "tour-1",
      tour: getMockTourById("tour-1"),
      userId: "user-1",
      userName: "Phạm Hải Đăng",
      userEmail: "khachhang.fpt@gmail.com",
      contactName: "Phạm Hải Đăng",
      contactPhone: "0933 888 999",
      contactEmail: "khachhang.fpt@gmail.com",
      contactAddress: "Tòa nhà FPT, Cầu Giấy, Hà Nội",
      numberOfGuests: 3,
      totalPrice: 16500000,
      originalTotalPrice: 16500000,
      depositAmount: 16500000,
      depositPaid: true,
      paymentStatus: "paid",
      status: "paid", // Trạng thái đơn mới: Paid (Đã thanh toán đủ)
      bookingDate: "2026-10-18",
      tourStartDate: "2026-11-20", // Còn 26 ngày >= 7 ngày -> Hoàn 100%
      companyId: "company-1",
      companyName: "Viettravel",
      bookingNotes:
        "Case 5 (Paid + Paid): Đã thanh toán 100%, trạng thái đơn là Đã thanh toán đủ. Hủy trước 26 ngày -> Hoàn 100%.",
    },

    // ==========================================================================
    // 6. [Paid + Paid] - ĐÃ THANH TOÁN ĐỦ 100% (HỦY TRƯỚC 3-6 NGÀY -> HOÀN 50%)
    // Đã thanh toán 18.000.000đ. Khởi hành 30/10/2026 (Còn 5 ngày -> khung 3-6 ngày)
    // -> Bấm Hủy -> Tự động tính hoàn 50% (9.000.000đ, phí phạt 50%)
    // ==========================================================================
    {
      id: "confirmed-paid-50",
      tourId: "tour-2",
      tour: getMockTourById("tour-2"),
      userId: "user-1",
      userName: "Phạm Hải Đăng",
      userEmail: "khachhang.fpt@gmail.com",
      contactName: "Phạm Hải Đăng",
      contactPhone: "0933 888 999",
      contactEmail: "khachhang.fpt@gmail.com",
      numberOfGuests: 3,
      totalPrice: 18000000,
      originalTotalPrice: 18000000,
      depositAmount: 18000000,
      depositPaid: true,
      paymentStatus: "paid",
      status: "paid", // Trạng thái đơn mới: Paid (Đã thanh toán đủ)
      bookingDate: "2026-10-15",
      tourStartDate: "2026-10-30", // Còn 5 ngày (khung 3-6 ngày) -> Hoàn 50%
      companyId: "company-2",
      companyName: "Phú Quốc Discovery",
      bookingNotes:
        "Case 6 (Paid + Paid): Hủy trước 5 ngày khởi hành -> Tự tính hoàn 50% (9.000.000đ).",
    },

    // ==========================================================================
    // 7. [Paid + Paid] - ĐÃ THANH TOÁN ĐỦ 100% (HỦY CẬN NGÀY < 3 NGÀY -> HOÀN 0%)
    // Đã thanh toán 9.200.000đ. Khởi hành 26/10/2026 (Còn 1 ngày < 3 ngày)
    // -> Bấm Hủy -> Cảnh báo hoàn 0%, phí giữ lại 100%
    // ==========================================================================
    {
      id: "confirmed-paid-0",
      tourId: "tour-5",
      tour: getMockTourById("tour-5"),
      userId: "user-1",
      userName: "Phạm Hải Đăng",
      userEmail: "khachhang.fpt@gmail.com",
      contactName: "Phạm Hải Đăng",
      contactPhone: "0933 888 999",
      contactEmail: "khachhang.fpt@gmail.com",
      numberOfGuests: 2,
      totalPrice: 9200000,
      originalTotalPrice: 9200000,
      depositAmount: 9200000,
      depositPaid: true,
      paymentStatus: "paid",
      status: "paid", // Trạng thái đơn mới: Paid (Đã thanh toán đủ)
      bookingDate: "2026-10-10",
      tourStartDate: "2026-10-26", // Còn 1 ngày (< 3 ngày) -> Hoàn 0%
      companyId: "company-4",
      companyName: "Sapa Eco Travel",
      bookingNotes:
        "Case 7 (Paid + Paid): Hủy sát ngày khởi hành (< 3 ngày). Cảnh báo quy định không hoàn tiền (0%).",
    },

    // ==========================================================================
    // 8. [InProgress + Paid] - TOUR ĐANG DIỄN RA
    // Đoàn đang di chuyển trên lộ trình, HDV đang check-in
    // -> Không hiển thị nút hủy trên ứng dụng
    // ==========================================================================
    {
      id: "inprogress-tour",
      tourId: "tour-4",
      tour: getMockTourById("tour-4"),
      userId: "user-1",
      userName: "Phạm Hải Đăng",
      userEmail: "khachhang.fpt@gmail.com",
      contactName: "Phạm Hải Đăng",
      contactPhone: "0933 888 999",
      contactEmail: "khachhang.fpt@gmail.com",
      numberOfGuests: 2,
      totalPrice: 11800000,
      originalTotalPrice: 11800000,
      depositAmount: 11800000,
      depositPaid: true,
      paymentStatus: "paid",
      status: "in_progress", // Trạng thái đơn mới: InProgress (Đang diễn ra)
      bookingDate: "2026-10-12",
      tourStartDate: "2026-10-24", // Đang diễn ra
      companyId: "company-1",
      companyName: "Viettravel",
      bookingNotes: "Case 8 (InProgress + Paid): Tour đang diễn ra, HDV đang hướng dẫn đoàn.",
    },

    // ==========================================================================
    // 9. [Completed + Paid] - TOUR ĐÃ HOÀN THÀNH
    // Đã kết thúc toàn bộ lộ trình thành công
    // ==========================================================================
    {
      id: "completed-tour",
      tourId: "tour-3",
      tour: getMockTourById("tour-3"),
      userId: "user-1",
      userName: "Phạm Hải Đăng",
      userEmail: "khachhang.fpt@gmail.com",
      contactName: "Phạm Hải Đăng",
      contactPhone: "0933 888 999",
      contactEmail: "khachhang.fpt@gmail.com",
      numberOfGuests: 2,
      totalPrice: 8400000,
      originalTotalPrice: 8400000,
      depositAmount: 8400000,
      depositPaid: true,
      paymentStatus: "paid",
      status: "completed",
      bookingDate: "2026-09-25",
      tourStartDate: "2026-10-10",
      companyId: "company-1",
      companyName: "Viettravel",
      bookingNotes: "Case 9 (Completed + Paid): Tour đã hoàn thành viên mãn.",
    },

    // ==========================================================================
    // 10. [Cancelled + Refunded] - ĐÃ HỦY & ĐÃ HOÀN TIỀN
    // Admin đã giải ngân hoàn tất về STK Vietcombank của khách
    // ==========================================================================
    {
      id: "cancelled-refunded",
      tourId: "tour-3",
      tour: getMockTourById("tour-3"),
      userId: "user-1",
      userName: "Phạm Hải Đăng",
      userEmail: "khachhang.fpt@gmail.com",
      contactName: "Phạm Hải Đăng",
      contactPhone: "0933 888 999",
      contactEmail: "khachhang.fpt@gmail.com",
      numberOfGuests: 2,
      totalPrice: 12500000,
      originalTotalPrice: 12500000,
      paymentStatus: "refunded",
      status: "cancelled",
      bookingDate: "2026-09-20",
      tourStartDate: "2026-10-15",
      cancellationReason:
        "[Yêu cầu hoàn tiền 100%]: Khách hủy trước 15 ngày. Admin đã giải ngân hoàn tất về Vietcombank (Mã GD: VCB202610239988).",
      companyId: "company-1",
      companyName: "Viettravel",
    },

    // ==========================================================================
    // 11. [Cancelled + Unpaid] - ĐÃ HỦY TRỰC TIẾP
    // Khách đã hủy ngay lúc chưa thanh toán
    // ==========================================================================
    {
      id: "cancelled-unpaid",
      tourId: "tour-5",
      tour: getMockTourById("tour-5"),
      userId: "user-1",
      userName: "Phạm Hải Đăng",
      userEmail: "khachhang.fpt@gmail.com",
      contactName: "Phạm Hải Đăng",
      contactPhone: "0933 888 999",
      contactEmail: "khachhang.fpt@gmail.com",
      numberOfGuests: 1,
      totalPrice: 6200000,
      originalTotalPrice: 6200000,
      paymentStatus: "unpaid",
      status: "cancelled",
      bookingDate: "2026-10-18",
      tourStartDate: "2026-11-05",
      cancellationReason: "Khách bận lịch công tác, đã hủy trực tiếp khi đơn chưa thanh toán.",
      companyId: "company-4",
      companyName: "Hà Giang Discovery",
    },

    // ==========================================================================
    // 12. [Rejected + Unpaid] - BỊ TỪ CHỐI
    // Agency từ chối tiếp nhận đơn
    // ==========================================================================
    {
      id: "rejected-unpaid",
      tourId: "tour-1",
      tour: getMockTourById("tour-1"),
      userId: "user-1",
      userName: "Phạm Hải Đăng",
      userEmail: "khachhang.fpt@gmail.com",
      contactName: "Phạm Hải Đăng",
      contactPhone: "0933 888 999",
      contactEmail: "khachhang.fpt@gmail.com",
      numberOfGuests: 6,
      totalPrice: 48000000,
      originalTotalPrice: 48000000,
      paymentStatus: "unpaid",
      status: "rejected",
      bookingDate: "2026-10-14",
      tourStartDate: "2026-11-01",
      rejectionReason:
        "Agency từ chối nhận đơn: Đã hết phòng khách sạn đối tác tiêu chuẩn 4 sao trong giai đoạn cao điểm này.",
      companyId: "company-1",
      companyName: "Viettravel",
    },
  ];
}
