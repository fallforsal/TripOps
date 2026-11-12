using Microsoft.EntityFrameworkCore;
using TripOps.Data;
using TripOps.Data.Entities;
using TripOps.Data.Enums;
using TripOps.Service.Accounts;

namespace TripOps.Service.Chat;

public sealed class ChatContactPolicy(TripOpsDbContext db)
{
    public async Task<IQueryable<User>> Allowed(string actor, CancellationToken ct)
    {
        var sender = await db.Users.AsNoTracking().SingleOrDefaultAsync(u => u.Id == actor && u.Status == UserStatus.Active, ct)
            ?? throw new AccountException(403, "Tài khoản không được phép chat.");
        var active = db.Users.Where(u => u.Id != actor && u.Status == UserStatus.Active);
        if (sender.Role == UserRole.Admin) return active;
        var allowed = active.Where(u => u.Role == UserRole.Admin);
        var previous = db.ChatConversations.Where(c => c.UserOneId == actor || c.UserTwoId == actor)
            .Select(c => c.UserOneId == actor ? c.UserTwoId : c.UserOneId);
        if (sender.Role is UserRole.User or UserRole.Customer)
        {
            var agencies = db.Bookings.Where(b => b.CustomerId == actor).Select(b => b.Tour!.AgencyId)
                .Union(db.BookingAgencies.Where(a => a.Booking.CustomerId == actor).Select(a => a.AgencyId))
                .Union(db.TourDesignRequests.Where(r => r.CustomerId == actor).Select(r => r.AgencyId!));
            var guides = db.BookingAssignedGuides.Where(g => g.Booking.CustomerId == actor).Select(g => g.GuideId);
            return allowed.Union(active.Where(u => u.Role == UserRole.TravelAgency &&
                (u.BusinessProfile != null && u.BusinessProfile.Status == BusinessProfileStatus.Approved || agencies.Contains(u.Id) || previous.Contains(u.Id))
                || u.Role == UserRole.TourGuide && guides.Contains(u.Id)));
        }
        if (sender.Role == UserRole.TravelAgency)
        {
            var customers = db.Bookings.Where(b => b.Tour!.AgencyId == actor || b.BookingAgencies.Any(a => a.AgencyId == actor))
                .Select(b => b.CustomerId!).Union(db.TourDesignRequests.Where(r => r.AgencyId == actor).Select(r => r.CustomerId!));
            var providers = db.BookingSupplierRequests.Where(r => r.Booking.Tour!.AgencyId == actor || r.Booking.BookingAgencies.Any(a => a.AgencyId == actor)).Select(r => r.ProviderId);
            return allowed.Union(active.Where(u =>
                (u.Role == UserRole.TravelAgency || u.Role == UserRole.Provider) &&
                    (u.BusinessProfile != null && u.BusinessProfile.Status == BusinessProfileStatus.Approved || previous.Contains(u.Id) || providers.Contains(u.Id))
                || (u.Role == UserRole.User || u.Role == UserRole.Customer) && (customers.Contains(u.Id) || previous.Contains(u.Id))
                || u.Role == UserRole.TourGuide && u.AgencyId == actor));
        }
        if (sender.Role == UserRole.Provider)
        {
            var bookings = db.BookingSupplierRequests.Where(r => r.ProviderId == actor).Select(r => r.BookingId);
            var agencies = db.Bookings.Where(b => bookings.Contains(b.Id)).Select(b => b.Tour!.AgencyId)
                .Union(db.BookingAgencies.Where(a => bookings.Contains(a.BookingId)).Select(a => a.AgencyId));
            return allowed.Union(active.Where(u => u.Role == UserRole.TravelAgency && (agencies.Contains(u.Id) || previous.Contains(u.Id))));
        }
        if (sender.Role == UserRole.TourGuide)
        {
            var customers = db.BookingAssignedGuides.Where(g => g.GuideId == actor).Select(g => g.Booking.CustomerId!);
            return allowed.Union(active.Where(u => u.Id == sender.AgencyId ||
                (u.Role == UserRole.User || u.Role == UserRole.Customer) && customers.Contains(u.Id)));
        }
        return allowed;
    }
}
