using System.ComponentModel.DataAnnotations;
using Microsoft.EntityFrameworkCore;
using TripOps.Data.Entities;
using TripOps.Data.Enums;
namespace TripOps.Service.Bookings;

public sealed record FinancialChangeInput([Range(typeof(decimal),"-9999999999","9999999999")] decimal Amount,
    [Required,StringLength(240,MinimumLength=3)] string Reason, decimal ExpectedTotal, Guid RequestId, string? AgencyId=null);
public sealed record FinancialChangeDecision([Required,AllowedValues("approve","reject")] string Decision,
    decimal ExpectedTotal,[StringLength(240)] string? Note=null);
public sealed record FinancialChangeDto(int Id,string AgencyId,string AgencyName,decimal Amount,string Reason,string Status,
    DateTime CreatedAt,DateTime? ReviewedAt,string? ReviewNote,int? RefundRequestId,decimal RefundAmount,string? RefundStatus,bool HasRefundAccount);

public sealed partial class BookingQuotationService
{
    public async Task<FinancialChangeDto[]> FinancialChanges(string actor,int id,CancellationToken ct)
    {
        var b=await Repository.Find(id,ct)??throw new BookingException(404,"Không tìm thấy booking.");
        var isCustomer=b.CustomerId==actor;
        var isAdmin=await Db.Users.AnyAsync(u=>u.Id==actor && u.Role==UserRole.Admin,ct);
        if(!isCustomer&&!isAdmin&&!BookingAlliance.IsMember(b,actor))throw new BookingException(403,"Không có quyền xem điều chỉnh.");
        var rows=await Db.BookingFinancialChanges.AsNoTracking().Include(x=>x.RefundRequest).Where(x=>x.BookingId==id)
            .OrderByDescending(x=>x.CreatedAt).ThenByDescending(x=>x.Id).ToListAsync(ct);
        return rows.Where(x=>isCustomer?x.Status=="Approved":isAdmin||actor==b.Tour!.AgencyId||x.AgencyId==actor).Select(x=>new FinancialChangeDto(
            x.Id,x.AgencyId,b.BookingAgencies.Single(a=>a.AgencyId==x.AgencyId).Agency?.BusinessProfile?.BusinessName??x.AgencyId,
            x.Amount,x.Reason,x.Status,x.CreatedAt,x.ReviewedAt,x.ReviewNote,x.RefundRequestId,
            x.RefundRequest?.OriginalPaidAmount??0,x.RefundRequest?.Status.ToString(),!string.IsNullOrWhiteSpace(x.RefundRequest?.RefundAccountNumber))).ToArray();
    }
    public async Task RequestFinancialChange(string actor,int id,FinancialChangeInput input,CancellationToken ct)
    {
        await using var tx=await Repository.BeginPaymentChange(id,ct);
        Require(input.RequestId!=Guid.Empty,"Thiếu mã đề nghị điều chỉnh.");
        var known=await Db.BookingFinancialChanges.SingleOrDefaultAsync(x=>x.BookingId==id&&x.RequestKey==input.RequestId,ct);
        if(known!=null) {
            Require(known.RequestedBy==actor&&known.Amount==input.Amount&&known.Reason==input.Reason.Trim()&&known.AgencyId==(input.AgencyId??actor),"Mã đề nghị đã được sử dụng.");
            await tx.CommitAsync(ct);return;
        }
        var b=await Amendable(actor,id,input.ExpectedTotal,ct,false);
        var beneficiary=input.AgencyId??actor;
        Require(actor==b.Tour!.AgencyId||beneficiary==actor,"Đối tác chỉ được đề nghị cho phần tiền của mình.");
        var allocation=b.BookingAgencies.SingleOrDefault(a=>a.AgencyId==beneficiary);
        Require(allocation!=null,"Agency không thuộc booking.");
        Require(allocation!.SettlementStatus!=SettlementStatus.Paid,"Phần tiền đã được quyết toán.");
        Require(input.Amount!=0&&input.Amount==Money(input.Amount)&&input.Amount is >=-9999999999m and <=9999999999m,"Số tiền điều chỉnh phải là số nguyên khác 0.");
        Require(input.Reason.Trim().Length is >=3 and <=240,"Cần nhập lý do điều chỉnh.");
        Db.BookingFinancialChanges.Add(new BookingFinancialChange{BookingId=id,AgencyId=beneficiary,RequestedBy=actor,
            RequestKey=input.RequestId,Amount=input.Amount,Reason=input.Reason.Trim()});
        Db.WorkflowNotifications.Add(new WorkflowNotification{UserId=b.Tour.AgencyId,BookingId=id,
            Message=$"Có đề nghị điều chỉnh {input.Amount:N0}đ cho chặng {beneficiary}: {input.Reason.Trim()}. Cần Agency chủ trì phê duyệt."});
        await Db.SaveChangesAsync(ct);await tx.CommitAsync(ct);
    }
    public async Task ReviewFinancialChange(string actor,int id,int changeId,FinancialChangeDecision input,CancellationToken ct)
    {
        await using var tx=await Repository.BeginPaymentChange(id,ct);
        var b=await Amendable(actor,id,input.ExpectedTotal,ct);
        var change=await Db.BookingFinancialChanges.SingleOrDefaultAsync(x=>x.Id==changeId&&x.BookingId==id,ct)
            ??throw new BookingException(404,"Không tìm thấy đề nghị.");
        // Replaying the same decision cannot charge/refund twice, even after the booking total changed.
        if(change.Status!="Pending")throw new BookingException(409,"Đề nghị đã được xử lý; hãy tải lại danh sách.");
        Require(input.Decision is "approve" or "reject","Quyết định không hợp lệ.");
        Require(input.Decision!="reject"||input.Note?.Trim().Length>=3,"Cần nhập lý do từ chối.");
        var allocation=b.BookingAgencies.Single(a=>a.AgencyId==change.AgencyId);
        if(input.Decision=="approve") {
            Require(allocation.SettlementStatus!=SettlementStatus.Paid,"Phần tiền của Agency đã được quyết toán.");
            Require(!b.PaymentTransactions.Any(t=>t.PaymentMethod=="PAYOS"&&t.Status==PaymentTransactionStatus.Pending&&t.ExpiresAt>DateTime.UtcNow),
                "Đang có link thanh toán còn hiệu lực. Hãy kiểm tra giao dịch hoặc chờ link hết hạn trước khi duyệt điều chỉnh.");
            var approved=BookingBilling.HasBeenApproved(b);
            if(approved&&change.Amount>0) {
                await AddSurchargeCore(b,actor,new BookingSurchargeInput(change.Amount,change.Reason,b.TotalAmount,change.RequestKey,change.AgencyId),ct);
            } else {
                var total=b.TotalAmount+change.Amount;
                Require(total>=0&&total<=9999999999m&&allocation.FinalAmount+change.Amount>=(allocation.PlatformFee??0),"Khoản giảm vượt phần tiền còn lại sau phí sàn của Agency hoặc tổng giá booking.");
                var previous=b.TotalAmount;b.OriginalTotalPrice??=previous;
                b.TotalAmount=total;allocation.FinalAmount+=change.Amount;allocation.NetPayout=allocation.FinalAmount-(allocation.PlatformFee??0);
                Db.BookingPriceAdjustments.Add(new BookingPriceAdjustment{BookingId=id,AgencyId=change.AgencyId,AdjustedBy=actor,
                    PreviousTotalPrice=previous,NewTotalPrice=total,Amount=change.Amount,Reason="[Đã duyệt điều chỉnh] "+change.Reason});
                if(approved&&change.Amount<0) {
                    BookingService.ApplyApprovedCredit(b,-change.Amount);
                    var reserved=b.RefundRequests.Where(r=>r.Reason==BookingBilling.PriceReductionReason&&r.Status is RefundStatus.Pending or RefundStatus.Reviewing or RefundStatus.Approved).Sum(r=>r.OriginalPaidAmount);
                    var excess=Math.Max(0,BookingBilling.NetPaidAmount(b)-total-reserved);
                    if(excess>0) {
                        var refund=new RefundRequest{BookingId=id,RequestedBy=b.CustomerId!,Reason=BookingBilling.PriceReductionReason,
                            ReasonDetail=$"Hoàn do giảm giá chặng {change.AgencyId}: {change.Reason}",OriginalPaidAmount=excess,RefundFee=0,Status=RefundStatus.Pending};
                        b.RefundRequests.Add(refund);change.RefundRequest=refund;
                    }
                }
                var paid=BookingBilling.NetPaidAmount(b);
                b.PaymentStatus=paid>=total?PaymentStatus.Paid:paid>0?PaymentStatus.PartiallyPaid:PaymentStatus.Unpaid;
                if(approved) b.Status=paid>=total?BookingStatus.Paid:BookingStatus.Confirmed;
            }
            MarkAmended(b);
            Db.WorkflowNotifications.Add(new WorkflowNotification{UserId=b.CustomerId!,BookingId=id,
                Message=$"Chủ trì đã duyệt điều chỉnh {change.Amount:N0}đ. {change.Reason}"});
        }
        change.Status=input.Decision=="approve"?"Approved":"Rejected";change.ReviewedBy=actor;
        change.ReviewNote=input.Note?.Trim();change.ReviewedAt=DateTime.UtcNow;
        Db.WorkflowNotifications.Add(new WorkflowNotification{UserId=change.AgencyId,BookingId=id,
            Message=$"Đề nghị {change.Amount:N0}đ đã {(change.Status=="Approved"?"được duyệt":"bị từ chối")}. {change.ReviewNote}"});
        await Db.SaveChangesAsync(ct);await tx.CommitAsync(ct);
    }
}

public sealed partial class BookingService
{
    // Preserve original installment amounts/deadlines. Credits lower outstanding obligations, not incoming transactions.
    internal static void ApplyApprovedCredit(Booking b,decimal amount)
    {
        var requests=b.PaymentRequests.Where(p=>p.Status!=PaymentRequestStatus.Cancelled)
            .OrderBy(p=>p.Stage==BalanceStage?0:BookingBilling.IsSurcharge(p)?1:2).ThenByDescending(p=>p.Id).ToArray();
        var remaining=amount;
        // First offset money not collected yet, including independent unpaid surcharges.
        // Only the remainder may credit already-paid obligations and become a refund.
        foreach(var p in requests) {
            var applied=Math.Min(remaining,Math.Min(Outstanding(b,p),Math.Max(0,p.Amount-p.CreditAmount)));
            p.CreditAmount+=applied;remaining-=applied;
            if(remaining==0)break;
        }
        foreach(var p in requests) {
            var applied=Math.Min(remaining,Math.Max(0,p.Amount-p.CreditAmount));p.CreditAmount+=applied;remaining-=applied;
            if(remaining==0)break;
        }
        if(remaining>0)throw new BookingException(409,"Lịch thanh toán chưa đầy đủ để ghi khoản giảm. Vui lòng kiểm tra booking.");
        foreach(var p in requests.Where(p=>Outstanding(b,p)==0)){p.Status=PaymentRequestStatus.Paid;p.PaidAt??=DateTime.UtcNow;}
    }
    public async Task UpdatePriceRefundAccount(string customer,int id,int refundId,RefundAccountRequest input,CancellationToken ct)
    {
        await using var tx=await Repo.BeginPaymentChange(id,ct);
        var b=await Repo.Find(id,ct)??throw new BookingException(404,"Không tìm thấy booking.");
        if(b.CustomerId!=customer)throw new BookingException(403,"Không có quyền cập nhật tài khoản.");
        var r=b.RefundRequests.SingleOrDefault(r=>r.Id==refundId&&r.Reason==BookingBilling.PriceReductionReason)
            ??throw new BookingException(404,"Không tìm thấy khoản hoàn do giảm giá.");
        if(r.Status is not (RefundStatus.Pending or RefundStatus.Reviewing))throw new BookingException(409,"Khoản hoàn đang xử lý hoặc đã hoàn tất.");
        var account=Account(input.BankName,input.AccountNumber,input.AccountHolder,true)!;
        r.RefundBankName=account.Bank;r.RefundAccountNumber=account.Number;r.RefundAccountHolder=account.Holder;
        await Repo.SaveChangesAsync(ct);await tx.CommitAsync(ct);
    }
}
