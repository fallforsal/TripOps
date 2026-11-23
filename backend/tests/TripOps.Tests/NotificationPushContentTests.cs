using TripOps.Api.Infrastructure;
using TripOps.Data.Entities;

namespace TripOps.Tests;

public sealed class NotificationPushContentTests
{
    [Fact]
    public void GuideAssignmentShowsSpecificTitleAndBooking()
    {
        var result = NotificationPushContent.Build(new WorkflowNotification {
            Message = "Bạn được phân công booking BK123 - Tour Đà Lạt. Ngày khởi hành: 24/11/2026."
        });
        Assert.Equal("Phân công tour mới", result.Title);
        Assert.Contains("BK123", result.Body);
    }

    [Fact]
    public void IncidentDoesNotLeakSensitiveNarrativeToLockScreen()
    {
        var result = NotificationPushContent.Build(new WorkflowNotification {
            Message = "Sự cố [HEALTH] trong booking BK123: bệnh lý nhạy cảm của khách."
        });
        Assert.Equal("Báo cáo sự cố tour", result.Title);
        Assert.DoesNotContain("bệnh lý nhạy cảm", result.Body);
    }

    [Fact]
    public void CancelledAssignmentHasItsOwnTitle()
    {
        var result = NotificationPushContent.Build(new WorkflowNotification {
            Message = "Agency đã hủy phân công booking BK123."
        });
        Assert.Equal("Cập nhật phân công", result.Title);
    }

    [Fact]
    public void OtherNotificationBodyIsTruncatedAndReadable()
    {
        var result = NotificationPushContent.Build(new WorkflowNotification { Message = new string('a', 300) });
        Assert.Equal("Thông báo TripOps", result.Title);
        Assert.True(result.Body.Length <= 180);
    }
}
