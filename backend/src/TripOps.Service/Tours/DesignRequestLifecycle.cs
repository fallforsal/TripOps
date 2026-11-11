using Microsoft.EntityFrameworkCore;
using TripOps.Data.Entities;
using TripOps.Data.Enums;
namespace TripOps.Service.Tours;
public sealed partial class DesignRequestService
{
    public async Task Lifecycle(string actor,int id,DesignLifecycleInput input,CancellationToken ct)
    {
        await tours.Agency(actor,ct);
        Require(input.Action is "archive" or "unarchive" or "close" or "reopen","Thao tác không hợp lệ.");
        await using var tx=await db.Database.BeginTransactionAsync(ct);
        var request=await db.TourDesignRequests.SingleOrDefaultAsync(r=>r.Id==id,ct)??throw new TourException(404,"Không tìm thấy yêu cầu.");
        var member=await db.TourDesignRequestAgencies.SingleOrDefaultAsync(a=>a.TourDesignRequestId==id && a.AgencyId==actor && (a.IsHost && request.AgencyId==actor || !a.IsHost && (a.Status=="accepted" || a.Status=="pending")),ct)
            ?? throw new TourException(404,"Bạn không có quyền truy cập yêu cầu.");
        if(input.Action is "archive" or "unarchive") {
            member.ArchivedAt=input.Action=="archive"?DateTime.UtcNow:null;
        }else{
            Require(request.AgencyId==actor,"Chỉ Agency chủ trì được đóng hoặc mở lại yêu cầu.");
            await db.TourDesignRequests.Where(r=>r.Id==id).ExecuteUpdateAsync(s=>s.SetProperty(r=>r.Revision,r=>r.Revision+1),ct);
            await db.Entry(request).ReloadAsync(ct);
            Require(!await db.Bookings.AnyAsync(b=>b.DesignRequestId==id && b.Status!=BookingStatus.Cancelled && b.Status!=BookingStatus.Rejected,ct),"Yêu cầu đã có booking còn hiệu lực. Hãy xử lý trên booking.");
            if(input.Action=="close") {
                Require(request.Status is CustomRequestStatus.Pending or CustomRequestStatus.InProgress,"Yêu cầu không ở trạng thái có thể đóng.");
                Require(!string.IsNullOrWhiteSpace(input.Reason) && input.Reason.Trim().Length<=2000,"Hãy nhập lý do đóng yêu cầu (tối đa 2000 ký tự).");
                request.Status=CustomRequestStatus.Closed;request.ClosedAt=DateTime.UtcNow;request.CloseReason=input.Reason!.Trim();
            }else{
                Require(request.Status is CustomRequestStatus.Closed or CustomRequestStatus.Booked,"Chỉ mở lại yêu cầu đã đóng hoặc có booking đã hủy/từ chối.");
                request.Status=CustomRequestStatus.InProgress;request.ClosedAt=null;request.CloseReason=null;member.ArchivedAt=null;
                if(member.IsHost)member.Status="accepted";
            }
            request.UpdatedAt=DateTime.UtcNow;
            var tour=await db.Tours.SingleOrDefaultAsync(t=>t.DesignRequestId==id,ct);if(tour!=null)tour.Revision++;
            db.WorkflowNotifications.Add(new WorkflowNotification{UserId=request.CustomerId!,RequestId=id,Message=input.Action=="close"?"Agency đã đóng yêu cầu: "+request.CloseReason:"Agency đã mở lại yêu cầu thiết kế tour."});
        }
        await db.SaveChangesAsync(ct);await tx.CommitAsync(ct);
    }
}
