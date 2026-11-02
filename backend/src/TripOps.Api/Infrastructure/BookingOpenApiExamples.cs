using System.Text.Json;
using System.Text.Json.Nodes;
using Microsoft.AspNetCore.Mvc.Controllers;
using Microsoft.OpenApi;
using TripOps.Service.Bookings;

namespace TripOps.Api.Infrastructure;

internal static class BookingOpenApiExamples
{
    private static readonly JsonSerializerOptions Json = new(JsonSerializerDefaults.Web);

    internal static CreateBookingRequest SampleBooking() => new(
        TourId: 1,
        StartDate: DateTime.UtcNow.Date.AddDays(7),
        ContactName: "Nguyễn Văn An",
        ContactPhone: "0912345678",
        ContactEmail: "nguyenvanan@example.test",
        SpecialRequests: "Gia đình có 1 người ăn chay, chuẩn bị phòng tầng thấp",
        Participants:
        [
            new("Nguyễn Văn An", "0912345678", new DateTime(1988, 5, 12), "Nam", "012345678901", null),
            new("Trần Thị Bình", "0987654321", new DateTime(1990, 8, 20), "Nữ", "012345678902", null)
        ]);

    internal static void Apply(OpenApiOperation operation, ControllerActionDescriptor action)
    {
        switch (action.ControllerName, action.ActionName)
        {
            case ("CustomerBookings", "Create"):
                Request("sampleBooking", "Đặt tour 2 khách người lớn khởi hành sau 7 ngày", SampleBooking());
                break;
            case ("CustomerBookings", "Deposit"):
                Request("depositExample", "Chuyển khoản đặt cọc 30% giá trị tour", new BookingDepositRequest(2100000, "VQR20261025001", "https://res.cloudinary.com/demo/image/upload/sample.jpg"));
                break;
            case ("CustomerBookings", "Cancel"):
                Request("cancelExample", "Khách hàng yêu cầu hủy đơn vì có việc đột xuất", new BookingCancellationRequest("Có lịch công tác đột xuất vào ngày khởi hành"));
                break;
            case ("AgencyBookings", "Decide"):
                Request("approveBooking", "Agency xác nhận duyệt đơn đặt tour của khách", new BookingDecisionRequest("approve", "Đã kiểm tra lịch trình và chỗ còn trống"));
                Request("rejectBooking", "Agency từ chối đơn đặt do hết chỗ", new BookingDecisionRequest("reject", "Tour đã hết số lượng chỗ cho ngày khởi hành này"));
                break;
            case ("AgencyBookings", "AssignGuide"):
                Request("assignLeadGuide", "Phân công Hướng dẫn viên chính cho đoàn", new GuideAssignmentRequest("guide-user-id", "Lead", "Hướng dẫn viên phụ trách chính đoàn 20 khách"));
                break;
            case ("GuideBookings", "Attendance"):
                Request("checkinParticipant", "Điểm danh khách có mặt tại điểm đón", new AttendanceCheckinRequest(1, "CheckedIn"));
                break;
            case ("GuideBookings", "ReportIncident"):
                Request("trafficIncident", "Báo cáo sự cố xe đến muộn do kẹt xe", new ReportIncidentRequest("Giao thông", "Xe trễ giờ đón", "Ùn tắc giao thông cục bộ tại đường dẫn cao tốc, chậm 20 phút", "Low"));
                break;
        }

        void Request<T>(string name, string summary, T value)
        {
            if (operation.RequestBody?.Content?.TryGetValue("application/json", out var content) != true || content == null) return;
            content.Examples ??= new Dictionary<string, IOpenApiExample>();
            content.Examples[name] = new OpenApiExample { Summary = summary, Value = JsonSerializer.SerializeToNode(value, Json) };
        }
    }
}
