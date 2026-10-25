using System.Text.Json;
using System.Text.Json.Nodes;
using Microsoft.AspNetCore.Mvc.Controllers;
using Microsoft.OpenApi;
using TripOps.Service.Tours;

namespace TripOps.Api.Infrastructure;

internal static class TourOpenApiExamples
{
    private static readonly JsonSerializerOptions Json = new(JsonSerializerDefaults.Web);

    internal static TourConfiguration ThreeDayTour() => new(
        "Đà Nẵng – Hội An 3 ngày 2 đêm",
        Description: "Khám phá Sơn Trà, biển Mỹ Khê và phố cổ Hội An. Dữ liệu minh họa để kiểm thử.",
        Destination: "Đà Nẵng, Hội An", DurationDays: 3, DurationNights: 2,
        BasePrice: 3500000, MinGuests: 10, MaxGuests: 30,
        OperationPeriod: "Theo lịch khởi hành do Agency xác nhận",
        Highlights: "Chùa Linh Ứng; biển Mỹ Khê; phố cổ Hội An",
        Inclusions: "Xe theo lịch trình, hai đêm lưu trú và các bữa ăn đã cấu hình",
        Exclusions: "Chi phí cá nhân và dịch vụ ngoài lịch trình",
        CancellationPolicy: "Liên hệ Agency để xác nhận điều kiện hủy trước khi đặt tour.",
        Images: [],
        PricingTiers: [new("Em bé dưới 2 tuổi", 0, 1, 0), new("Trẻ em 2–11 tuổi", 2, 11, 2450000, 1), new("Người lớn", 12, null, 3500000, 2)],
        Timelines: [
            new(1, "Đà Nẵng – Sơn Trà – biển Mỹ Khê",
                Activities: [new("Chùa Linh Ứng", EstimatedTime: new TimeSpan(8, 30, 0), OrderIndex: 0),
                    new("Biển Mỹ Khê", EstimatedTime: new TimeSpan(15, 0, 0), OrderIndex: 1)],
                Meals: [new("lunch", "Nhà hàng địa phương tại Đà Nẵng"),
                    new("lunch", "Phương án thực đơn chay", IsDefault: false, PriceDifference: -30000)],
                Accommodations: [new("Khách sạn tiêu chuẩn tại Đà Nẵng", "Đà Nẵng", RoomType: "Phòng tiêu chuẩn", NightsCount: 2, StarRating: 3),
                    new("Phương án khách sạn nâng hạng tại Đà Nẵng", "Đà Nẵng", RoomType: "Phòng superior", NightsCount: 2, StarRating: 4, IsDefault: false, PriceDifference: 150000)]),
            new(2, "Tham quan phố cổ Hội An", Activities: [new("Phố cổ Hội An", EstimatedTime: new TimeSpan(8, 30, 0))],
                Meals: [new("lunch", "Nhà hàng địa phương tại Hội An")], Accommodations: []),
            new(3, "Cầu Rồng – kết thúc chương trình", Activities: [new("Cầu Rồng", EstimatedTime: new TimeSpan(9, 0, 0))], Accommodations: [])]);

    internal static void Apply(OpenApiOperation operation, ControllerActionDescriptor action)
    {
        switch (action.ControllerName, action.ActionName)
        {
            case ("AgencyTours", "Create"):
                Request("completeManualTour", "Tour thủ công 3 ngày 2 đêm; không cần seed dịch vụ", ThreeDayTour());
                Request("minimalDraft", "Bản nháp tối thiểu; bổ sung cấu hình bằng PUT trước khi gửi duyệt", new TourConfiguration("Bản nháp tour Đà Nẵng – Hội An"));
                break;
            case ("AgencyTours", "Update"):
                Request("configureThreeDayTour", "Thay toàn bộ cấu hình của bản nháp v1: lịch trình, dịch vụ và giá", new UpdateTourRequest(1, ThreeDayTour(), "Hoàn thiện lịch trình 3 ngày và hai đêm lưu trú"));
                break;
            case ("AgencyTours", "Publish"):
                Request("publishCompleteTour", "Agency công bố trực tiếp bản nháp đầy đủ v1", new TourCommand(1)); break;
            case ("AgencyTours", "Hide"): case ("AdminTours", "Hide"):
                Request("hidePublishedTour", "Ẩn phiên bản v5 đang công khai", new TourCommand(5, "Tạm ẩn để rà soát lịch khởi hành")); break;
            case ("AgencyTours", "Restore"):
                Request("restoreAsNewDraft", "Thay version bằng phiên bản hiện tại; number trên URL là phiên bản nguồn", new TourCommand(6, "Khôi phục lịch trình trước đó để chỉnh sửa")); break;
            case ("AgencyTours", "Duplicate"):
                Request("duplicateDraft", "Tạo tour và lịch sử độc lập", new DuplicateTourRequest("Đà Nẵng – Hội An: phương án mới")); break;
            case ("ItineraryDrafts", "Create"):
                Request("optionalAiDraft", "Trả 503 khi chưa cấu hình AI", new AiDraftRequest("Đà Nẵng, Hội An", 3, "Nghỉ dưỡng gia đình")); break;
            case ("Tours", "Get"):
                Response(new PublicTourDto(42, "TOUR-EXAMPLE-DANANG", 5, ThreeDayTour())); break;
            case ("Tours", "List"):
                Response(new TourPage<TourListItem>([new(42, ThreeDayTour().Name, "Đà Nẵng, Hội An", 3500000, "completed", "public", 2)], 1, 1, 20)); break;
        }
        if (action.ControllerName is "AgencyTours" or "AdminTours" or "Tours" or "ItineraryDrafts")
        {
            operation.Description += "\n\nExamples use manual service entries (null IDs). Replace every version with the latest response version and every tour id with the actual created id. " +
                "A hotel group is one continuous stay on its starting day; alternatives cover that same stay and are not additive. " +
                "TimeSpan JSON uses strings such as 08:30:00, not a time object or ISO 8601 PT8H30M. See backend/WF02_TESTING.md for the exact testing order.";
        }
        foreach (var parameter in operation.Parameters ?? [])
        {
            if (parameter is not OpenApiParameter value) continue;
            value.Example = value.Name switch {
                "id" => JsonValue.Create(42), "number" => JsonValue.Create(1), "page" => JsonValue.Create(1),
                "pageSize" => JsonValue.Create(20), "destination" => JsonValue.Create("Đà Nẵng"),
                "maxPrice" => JsonValue.Create(4000000), "headcount" => JsonValue.Create(20), _ => value.Example };
            if (value.Name == "id") value.Description = "Use the actual resource ID returned by creation or catalogue lookup; 42 is illustrative.";
        }

        void Request<T>(string name, string summary, T value)
        {
            if (operation.RequestBody?.Content?.TryGetValue("application/json", out var content) != true || content == null) return;
            content.Examples ??= new Dictionary<string, IOpenApiExample>();
            content.Examples[name] = new OpenApiExample { Summary = summary, Value = JsonSerializer.SerializeToNode(value, Json) };
        }
        void Response<T>(T value)
        {
            if (operation.Responses?.TryGetValue("200", out var response) == true && response.Content?.TryGetValue("application/json", out var content) == true)
                content.Example = JsonSerializer.SerializeToNode(value, Json);
        }
    }

    internal static void DescribeProperty(Type type, string name, OpenApiSchema schema)
    {
        if (type.Namespace != typeof(TourConfiguration).Namespace) return;
        if (type == typeof(PricingTierInput)) {
            if (name == "MinAge") { schema.Description = "Required inclusive lower age; integer 0–150. Adjacent ranges must not share a boundary."; schema.Examples = [JsonValue.Create(12)!]; }
            if (name == "MaxAge") { schema.Description = "Inclusive upper age, or null for an open-ended tier. Must be >= minAge; age ranges cannot overlap."; schema.Examples = [JsonValue.Create((int?)null)!]; }
        }
        if (type == typeof(ActivityInput) && name == "EstimatedTime") {
            schema.Description = "Optional nonnegative TimeSpan less than 24 hours, used as an itinerary time. Canonical JSON string hh:mm:ss with optional 1–7 fractional second digits, for example 08:30:00. Null is allowed. Native aliases such as 8:30 are accepted and normalized. Not an ISO 8601 duration or an object.";
            // The generated constant-format pattern excludes aliases accepted by the
            // existing parser; retain the parser rather than tightening the wire contract.
            schema.Pattern = null;
            schema.Examples = [JsonValue.Create("08:30:00")!];
        }
        if (name == "MealType") { schema.Description = "Lowercase breakfast, lunch or dinner; each configured meal group has exactly one default."; schema.Examples = [JsonValue.Create("lunch")!]; }
        if (name == "StarRating") schema.Examples = [JsonValue.Create(3)!];
        if (name == "NightsCount") {
            schema.Description = "Continuous stay starting on the enclosing day. For 3 days/2 nights, put nightsCount=2 on day 1 only. Alternatives must have the same count; different stay groups cannot overlap. Zero consumes no overnight allocation.";
            schema.Examples = [JsonValue.Create(2)!];
        }
        if (name == "PriceDifference") {
            schema.Description = "VND per guest per meal, or per guest per hotel night. Default option must be exactly 0; alternatives may be positive or negative per Q5. Rounded to whole VND.";
            schema.Examples = [JsonValue.Create(0)!];
        }
        if (name == "DayNumber") { schema.Description = "1-based, unique, and <= durationDays. Publication requires one day for each day of the tour."; schema.Examples = [JsonValue.Create(1)!]; }
        if (type == typeof(TourConfiguration) && name == "Images" && schema.Items is OpenApiSchema item) {
            schema.Description = "Optional/null/empty list of HTTPS image URLs, each at most 2048 characters. Upload local files with POST /api/v1/agency/tours/images first. The first URL is the primary image.";
            item.Format = "uri"; item.MaxLength = 2048; item.Pattern = "^[hH][tT][tT][pP][sS]://";
        }
    }
}
