using TripOps.Data.Entities;
using TripOps.Data.Enums;
using TripOps.Data.Repositories;
using TripOps.Service.Accounts;

namespace TripOps.Service.Bookings;

public sealed class BookingService(BookingRepository repository, AccountService accounts)
{
    private static decimal Money(decimal value) => decimal.Round(value, 0, MidpointRounding.AwayFromZero);

    public async Task<BookingDto> Create(string customerId, CreateBookingRequest request, CancellationToken ct)
    {
        var customer = await accounts.Current(customerId, ct);
        if (customer.Status != UserStatus.Active)
            throw new BookingException(403, "Tài khoản khách hàng không hợp lệ hoặc đã bị khóa.");

        var tour = await repository.FindPublicTour(request.TourId, ct);
        if (tour is null)
            throw new BookingException(404, "Tour không tồn tại hoặc chưa được công bố mở bán.");

        if (request.Participants.Length == 0)
            throw new BookingException(400, "Cần có ít nhất một hành khách trong đơn đặt.");

        if (tour.MinGuests.HasValue && request.Participants.Length < tour.MinGuests.Value)
            throw new BookingException(422, $"Số lượng khách tối thiểu cho tour này là {tour.MinGuests.Value} người.");

        if (tour.MaxGuests.HasValue && request.Participants.Length > tour.MaxGuests.Value)
            throw new BookingException(422, $"Số lượng khách tối đa cho tour này là {tour.MaxGuests.Value} người.");

        if (request.StartDate.Date < DateTime.UtcNow.Date)
            throw new BookingException(422, "Ngày khởi hành phải từ hôm nay trở đi.");

        static string Clean(string value) => System.Text.RegularExpressions.Regex.Replace(value.Trim(), @"\s*\(\d+★\)\s*$", "");
        var hotelSelections = new Dictionary<string, TourAccommodation>(StringComparer.OrdinalIgnoreCase);
        var mealSelections = new Dictionary<(int, string), TourMeal>();
        decimal extra = 0;
        foreach (var choice in request.HotelChoices ?? [])
        {
            if (hotelSelections.ContainsKey(choice.Destination)) throw new BookingException(422, "Duplicate hotel selection.");
            var option = tour.Accommodations.FirstOrDefault(h => h.DestinationName.Equals(choice.Destination, StringComparison.OrdinalIgnoreCase) && (choice.ServiceId.HasValue ? h.ServiceId == choice.ServiceId : h.HotelName.Equals(Clean(choice.Name), StringComparison.OrdinalIgnoreCase)));
            if (option is null) throw new BookingException(422, "Khách sạn phải thuộc phương án Agency đã cấu hình.");
            hotelSelections[choice.Destination] = option; extra += option.PriceDifference ?? 0;
        }
        foreach (var choice in request.MealChoices ?? [])
        {
            var key = (choice.DayNumber, choice.MealType);
            if (mealSelections.ContainsKey(key)) throw new BookingException(422, "Duplicate meal selection.");
            var option = tour.Timelines.FirstOrDefault(d => d.DayNumber == choice.DayNumber)?.Meals.FirstOrDefault(m => m.MealType == choice.MealType && (choice.ServiceId.HasValue ? m.ServiceId == choice.ServiceId : m.RestaurantName.Equals(Clean(choice.Name), StringComparison.OrdinalIgnoreCase)));
            if (option is null) throw new BookingException(422, "Bữa ăn phải thuộc phương án Agency đã cấu hình.");
            mealSelections[key] = option; extra += option.PriceDifference;
        }
        var selectedServiceIds = tour.Accommodations.Where(h => h.IsDefault == true).Select(h => hotelSelections.GetValueOrDefault(h.DestinationName, h).ServiceId)
            .Concat(tour.Timelines.SelectMany(d => d.Meals.Where(m => m.IsDefault).Select(m => mealSelections.GetValueOrDefault((d.DayNumber, m.MealType), m).ServiceId)))
            .Where(id => id.HasValue).Select(id => id!.Value).Distinct().ToArray();
        if (await repository.EligibleServiceCount(selectedServiceIds, ct) != selectedServiceIds.Length)
            throw new BookingException(422, "Dịch vụ Provider trong phương án đã ngừng hoạt động; vui lòng liên hệ Agency.");

        // Tính toán tổng tiền theo pricing tiers hoặc base price
        var tiers = tour.PricingTiers.ToDictionary(t => t.Id);
        decimal totalAmount = 0;
        var participants = new List<BookingParticipant>();

        foreach (var p in request.Participants)
        {
            decimal price = tour.BasePrice ?? 0;
            string? tierName = null;
            int? age = null;
            if (p.DateOfBirth.HasValue)
            {
                var birth = p.DateOfBirth.Value.Date;
                if (birth > request.StartDate.Date)
                    throw new BookingException(422, "Ngày sinh không được sau ngày khởi hành.");
                age = request.StartDate.Year - birth.Year;
                if (birth.AddYears(age.Value) > request.StartDate.Date) age--;
            }
            if (p.PricingTierId.HasValue)
            {
                if (!tiers.TryGetValue(p.PricingTierId.Value, out var tier))
                    throw new BookingException(422, "Nhóm giá không thuộc tour đang đặt.");
                if (age.HasValue && ((tier.MinAge.HasValue && age < tier.MinAge) || (tier.MaxAge.HasValue && age > tier.MaxAge)))
                    throw new BookingException(422, "Nhóm giá không phù hợp với tuổi hành khách.");
                price = tier.PricePerGuest ?? 0;
                tierName = tier.Name;
            }
            else if (age.HasValue)
            {
                var tier = tour.PricingTiers.OrderBy(t => t.DisplayOrder).FirstOrDefault(t =>
                    (!t.MinAge.HasValue || age >= t.MinAge) && (!t.MaxAge.HasValue || age <= t.MaxAge));
                if (tier is not null) { price = tier.PricePerGuest ?? 0; tierName = tier.Name; }
            }

            price = Money(price + extra);
            if (price < 0) throw new BookingException(422, "Giá khách sau phụ thu không hợp lệ.");
            totalAmount += price;

            participants.Add(new BookingParticipant
            {
                AgencyId = tour.AgencyId ?? throw new BookingException(422, "Tour requires an Agency."),
                ParticipantIndex = participants.Count + 1,
                IsPrimary = true,
                TierName = tierName,
                Price = Money(price),
                RoommateNote = p.RoommateNote,
                RestaurantNote = p.RestaurantNote,
                FullName = p.FullName.Trim(),
                Note = ParticipantNote(p.Note, p.PhoneNumber),
                DateOfBirth = p.DateOfBirth,
                Gender = p.Gender?.Trim(),
                IdentityNumber = p.IdentityNumber?.Trim(),
                AttendanceStatus = AttendanceStatus.Pending,
                Status = "ACTIVE"
            });
        }

        totalAmount = Money(totalAmount);
        var depositAmount = Money(totalAmount * 0.3m); // Mặc định cọc 30%
        var code = $"BK{DateTime.UtcNow:yyMMddHHmmss}{Random.Shared.Next(100, 999)}";

        var booking = new Booking
        {
            BookingCode = code,
            CustomerId = customerId,
            TourId = tour.Id,
            StartDate = request.StartDate.Date,
            TotalAmount = totalAmount,
            OriginalTotalPrice = totalAmount - extra * participants.Count,
            HasCustomization = hotelSelections.Count > 0 || mealSelections.Count > 0,
            Status = BookingStatus.Pending,
            PaymentStatus = PaymentStatus.Unpaid,
            ContactName = request.ContactName.Trim(),
            ContactPhone = request.ContactPhone.Trim(),
            ContactEmail = request.ContactEmail.Trim().ToLowerInvariant(),
            SpecialRequests = request.SpecialRequests?.Trim(),
            Participants = participants,
            BookingAgencies = [new BookingAgency { AgencyId = tour.AgencyId!, IsHost = true, OriginalAmount = totalAmount, FinalAmount = totalAmount, NetPayout = totalAmount }],
            Timelines = Enumerable.Range(1, Math.Max(1, tour.DurationDays ?? 1)).Select(number => {
                var day = tour.Timelines.SingleOrDefault(d => d.DayNumber == number);
                return new BookingTimeline {
                    DayNumber = number,
                    Title = day?.Title ?? $"Ngày {number}",
                    Description = day?.Description,
                    Attractions = (day?.Attractions ?? []).Select(a => new BookingTimelineAttraction {
                        AgencyId = a.AgencyId ?? tour.AgencyId,
                        OriginalLocationName = a.Name ?? "",
                        Time = a.Time.HasValue ? request.StartDate.Date.AddDays(number - 1).Add(a.Time.Value.TimeOfDay) : null
                    }).ToList(),
                    Meals = (day?.Meals ?? []).Where(m => m.IsDefault == true).Select(m => new BookingTimelineMeal {
                        MealType = m.MealType,
                        OriginalRestaurantName = m.RestaurantName,
                        CustomizedRestaurantName = mealSelections.TryGetValue((number, m.MealType), out var chosenMeal) ? chosenMeal.RestaurantName : null,
                        IsCustomized = mealSelections.ContainsKey((number, m.MealType)),
                        PriceDifference = mealSelections.TryGetValue((number, m.MealType), out var mealOption) ? mealOption.PriceDifference : 0,
                        ServiceId = mealSelections.TryGetValue((number, m.MealType), out var selectedMeal) ? selectedMeal.ServiceId : m.ServiceId,
                        DateService = request.StartDate.Date.AddDays(number - 1),
                        Time = m.Time.HasValue ? request.StartDate.Date.AddDays(number - 1).Add(m.Time.Value.TimeOfDay) : null
                    }).ToList()
                };
            }).ToList(),
            Accommodations = tour.Accommodations.Where(a => a.IsDefault == true).Select(a => new BookingAccommodation {
                CustomizedHotelName = hotelSelections.TryGetValue(a.DestinationName, out var chosenHotel) ? chosenHotel.HotelName : null,
                CustomizedStars = hotelSelections.TryGetValue(a.DestinationName, out var starsHotel) ? starsHotel.StarRating : null,
                IsCustomized = hotelSelections.ContainsKey(a.DestinationName),
                PriceDifference = hotelSelections.TryGetValue(a.DestinationName, out var priceHotel) ? priceHotel.PriceDifference : 0,
                ServiceId = hotelSelections.TryGetValue(a.DestinationName, out var selectedHotel) ? selectedHotel.ServiceId : a.ServiceId,
                DateFrom = request.StartDate.Date,
                DateTo = request.StartDate.Date.AddDays(a.NightsCount ?? 1),
                Destination = a.DestinationName,
                OriginalHotelName = a.HotelName,
                OriginalStars = a.StarRating,
                NightsCount = a.NightsCount
            }).ToList(),
            PaymentRequests = [new PaymentRequest {
                Description = "Đặt cọc 30%",
                Amount = depositAmount,
                DueDate = request.StartDate.Date,
                CreatedBy = customerId
            }]
        };

        repository.Add(booking);

        // Đóng gói Snapshot v1 (initial_request) ngay trong cùng giao dịch tạo booking
        int? sourceTourVersion = tour.Version;
        var initialPayload = BuildSnapshotPayload(booking, tour, sourceTourVersion, request.SpecialRequests);
        var initialJson = System.Text.Json.JsonSerializer.Serialize(initialPayload, new System.Text.Json.JsonSerializerOptions
        {
            PropertyNamingPolicy = System.Text.Json.JsonNamingPolicy.CamelCase,
            WriteIndented = false
        });

        var initialSnapshot = new BookingSnapshot
        {
            Booking = booking,
            Version = 1,
            SnapshotType = "initial_request",
            SnapshotData = initialJson,
            SourceTourVersion = initialPayload.SourceTourVersion,
            CreatedAt = DateTime.UtcNow,
            CreatedBy = customerId
        };
        repository.AddSnapshot(initialSnapshot);
        booking.Snapshots.Add(initialSnapshot);

        await repository.SaveChangesAsync(ct);

        return ToDto(booking);
    }

    public async Task<BookingDto> Get(string actorId, int id, CancellationToken ct)
    {
        var booking = await repository.Find(id, ct) ?? throw new BookingException(404, "Không tìm thấy đơn đặt tour.");
        var user = await accounts.Current(actorId, ct);

        bool isOwner = booking.CustomerId == actorId;
        bool isAgency = booking.Tour?.AgencyId == actorId || booking.BookingAgencies.Any(ba => ba.AgencyId == actorId);
        bool isGuide = booking.AssignedGuides.Any(ag => ag.GuideId == actorId);
        bool isAdmin = user.Role == UserRole.Admin;

        if (!isOwner && !isAgency && !isGuide && !isAdmin)
            throw new BookingException(403, "Bạn không có quyền xem thông tin đơn đặt này.");

        return ToDto(booking);
    }

    public async Task<BookingPage<BookingListItem>> ListForCustomer(
        string customerId, string? statusStr, int page, int pageSize, CancellationToken ct)
    {
        BookingStatus? status = null;
        if (!string.IsNullOrWhiteSpace(statusStr) && Enum.TryParse<BookingStatus>(statusStr, true, out var s))
            status = s;

        var (rows, total) = await repository.ListForCustomer(customerId, status, Math.Max(1, page), Math.Clamp(pageSize, 1, 100), ct);
        var items = rows.Select(ToListItem).ToList();

        return new BookingPage<BookingListItem>(items, total, page, pageSize);
    }

    public async Task<BookingPage<BookingListItem>> ListForAgency(
        string agencyId, string? statusStr, string? search, int page, int pageSize, CancellationToken ct)
    {
        await accounts.Current(agencyId, ct);
        BookingStatus? status = null;
        if (!string.IsNullOrWhiteSpace(statusStr) && Enum.TryParse<BookingStatus>(statusStr, true, out var s))
            status = s;

        var (rows, total) = await repository.ListForAgency(agencyId, status, search, Math.Max(1, page), Math.Clamp(pageSize, 1, 100), ct);
        var items = rows.Select(ToListItem).ToList();

        return new BookingPage<BookingListItem>(items, total, page, pageSize);
    }

    public async Task<BookingDto> Decide(string agencyId, int id, BookingDecisionRequest request, CancellationToken ct)
    {
        var booking = await repository.Find(id, ct) ?? throw new BookingException(404, "Không tìm thấy đơn đặt tour.");
        if (booking.Tour?.AgencyId != agencyId && !booking.BookingAgencies.Any(ba => ba.AgencyId == agencyId))
            throw new BookingException(403, "Chỉ Agency sở hữu tour mới có quyền duyệt đơn này.");

        if (booking.Status is not (BookingStatus.Pending or BookingStatus.Deposited))
            throw new BookingException(422, $"Không thể duyệt đơn đặt đang ở trạng thái {booking.Status}.");

        if (request.Decision == "approve")
        {
            booking.Status = BookingStatus.Confirmed;
        }
        else if (request.Decision == "reject")
        {
            booking.Status = BookingStatus.Rejected;
            if (!string.IsNullOrWhiteSpace(request.Reason))
                booking.SpecialRequests = $"{booking.SpecialRequests} [Lý do từ chối: {request.Reason}]".Trim();
        }

        await repository.SaveChangesAsync(ct);
        return ToDto(booking);
    }

    public async Task<BookingDto> Deposit(string customerId, int id, BookingDepositRequest request, CancellationToken ct)
    {
        var booking = await repository.Find(id, ct) ?? throw new BookingException(404, "Không tìm thấy đơn đặt tour.");
        if (booking.CustomerId != customerId)
            throw new BookingException(403, "Bạn không phải người tạo đơn đặt này.");

        if (booking.Status is BookingStatus.Cancelled or BookingStatus.Rejected)
            throw new BookingException(422, "Không thể thanh toán cho đơn đã hủy hoặc bị từ chối.");

        var code = string.IsNullOrWhiteSpace(request.TransactionReference)
            ? $"DEMO-{Guid.NewGuid():N}" : request.TransactionReference.Trim();
        var previous = await repository.FindTransaction(code, ct);
        if (previous is not null)
        {
            if (previous.BookingId != id || previous.Amount != request.Amount)
                throw new BookingException(409, "Mã giao dịch đã được sử dụng.");
            return ToDto(booking);
        }
        var paid = Money(PaidAmount(booking) + request.Amount);
        if (paid > booking.TotalAmount) throw new BookingException(422, "Số tiền vượt quá phần còn phải thanh toán.");
        var deposit = booking.PaymentRequests.FirstOrDefault(p => p.Description.StartsWith("Đặt cọc"));
        booking.PaymentTransactions.Add(new PaymentTransaction
        {
            TransactionCode = code,
            Amount = Money(request.Amount),
            PaymentMethod = "DEMO",
            Status = PaymentTransactionStatus.Success,
            ProofImageUrl = request.PaymentProofUrl,
            PayerName = booking.ContactName,
            PaidAt = DateTime.UtcNow,
            PaymentRequest = deposit
        });
        if (paid >= booking.TotalAmount)
        {
            booking.PaymentStatus = PaymentStatus.Paid;
            if (booking.Status is BookingStatus.Pending or BookingStatus.Deposited or BookingStatus.Confirmed)
                booking.Status = BookingStatus.Paid;
        }
        else
        {
            booking.PaymentStatus = PaymentStatus.PartiallyPaid;
            if (paid >= DepositAmount(booking) && booking.Status == BookingStatus.Pending)
                booking.Status = BookingStatus.Deposited;
        }
        if (deposit is not null && paid >= deposit.Amount)
        {
            deposit.Status = PaymentRequestStatus.Paid;
            deposit.PaidAt = DateTime.UtcNow;
        }

        await repository.SaveChangesAsync(ct);
        return ToDto(booking);
    }

    public async Task<BookingDto> Cancel(string customerId, int id, BookingCancellationRequest request, CancellationToken ct)
    {
        var booking = await repository.Find(id, ct) ?? throw new BookingException(404, "Không tìm thấy đơn đặt tour.");
        if (booking.CustomerId != customerId)
            throw new BookingException(403, "Bạn không phải người tạo đơn đặt này.");

        if (booking.Status is BookingStatus.Cancelled or BookingStatus.Rejected or BookingStatus.Completed)
            throw new BookingException(422, $"Không thể hủy đơn đặt đang ở trạng thái {booking.Status}.");

        booking.Status = BookingStatus.Cancelled;
        booking.CancelReason = request.Reason.Trim();
        booking.CancelledAt = DateTime.UtcNow;
        booking.SpecialRequests = $"{booking.SpecialRequests} [Khách hủy: {request.Reason}]".Trim();

        await repository.SaveChangesAsync(ct);
        return ToDto(booking);
    }

    // WF06: Phân công Hướng dẫn viên
    public async Task<BookingDto> AssignGuide(string agencyId, int id, GuideAssignmentRequest request, CancellationToken ct)
    {
        var booking = await repository.Find(id, ct) ?? throw new BookingException(404, "Không tìm thấy đơn đặt tour.");
        if (booking.Tour?.AgencyId != agencyId && !booking.BookingAgencies.Any(ba => ba.AgencyId == agencyId))
            throw new BookingException(403, "Chỉ Agency sở hữu tour mới có quyền phân công hướng dẫn viên.");

        var guide = await repository.FindUser(request.GuideId, ct);
        if (guide is null || guide.Role != UserRole.TourGuide || guide.Status != UserStatus.Active || guide.AgencyId != agencyId)
            throw new BookingException(404, "Hướng dẫn viên không tồn tại hoặc đã bị vô hiệu hóa.");

        if (booking.Status is not (BookingStatus.Confirmed or BookingStatus.Paid or BookingStatus.InProgress))
            throw new BookingException(422, "Chỉ phân công hướng dẫn viên cho đơn đã được Agency xác nhận.");

        var existing = booking.AssignedGuides.FirstOrDefault(ag => ag.GuideId == request.GuideId);
        if (existing is null)
        {
            booking.AssignedGuides.Add(new BookingAssignedGuide
            {
                BookingId = id,
                GuideId = request.GuideId,
                AgencyId = agencyId,
                AssignedAt = DateTime.UtcNow,
                Role = request.Role ?? "Lead",
                Notes = request.Notes
            });
        }
        else
        {
            existing.AgencyId = agencyId;
            existing.AssignedAt ??= DateTime.UtcNow;
            existing.Role = request.Role ?? existing.Role;
            existing.Notes = request.Notes ?? existing.Notes;
        }

        await repository.SaveChangesAsync(ct);
        return ToDto(booking);
    }

    // WF06: Guide xem danh sách tour được giao
    public async Task<IReadOnlyList<AvailableGuideDto>> AvailableGuides(string agencyId, CancellationToken ct) =>
        (await repository.AvailableGuides(agencyId, ct)).Select(g => new AvailableGuideDto(g.Id, g.Name ?? "", g.Phone)).ToList();

    public async Task<BookingPage<BookingListItem>> ListForGuide(string guideId, int page, int pageSize, CancellationToken ct)
    {
        var (rows, total) = await repository.ListForGuide(guideId, Math.Max(1, page), Math.Clamp(pageSize, 1, 100), ct);
        var items = rows.Select(ToListItem).ToList();

        return new BookingPage<BookingListItem>(items, total, page, pageSize);
    }

    // Snapshot Operations
    public async Task<List<BookingSnapshotSummaryDto>> ListSnapshots(string actorId, int bookingId, CancellationToken ct)
    {
        var booking = await repository.Find(bookingId, ct) ?? throw new BookingException(404, "Không tìm thấy đơn đặt tour.");
        var user = await accounts.Current(actorId, ct);
        bool isOwner = booking.CustomerId == actorId;
        bool isAgency = booking.Tour?.AgencyId == actorId || booking.BookingAgencies.Any(ba => ba.AgencyId == actorId);
        bool isAdmin = user.Role == UserRole.Admin;

        if (!isOwner && !isAgency && !isAdmin)
            throw new BookingException(403, "Bạn không có quyền xem snapshot của booking này.");

        var snapshots = await repository.ListSnapshots(bookingId, ct);
        return snapshots.Select(ToSnapshotSummaryDto).ToList();
    }

    public async Task<BookingSnapshotDto> GetSnapshot(string actorId, int bookingId, int snapshotId, CancellationToken ct)
    {
        var booking = await repository.Find(bookingId, ct) ?? throw new BookingException(404, "Không tìm thấy đơn đặt tour.");
        var user = await accounts.Current(actorId, ct);
        bool isOwner = booking.CustomerId == actorId;
        bool isAgency = booking.Tour?.AgencyId == actorId || booking.BookingAgencies.Any(ba => ba.AgencyId == actorId);
        bool isAdmin = user.Role == UserRole.Admin;

        if (!isOwner && !isAgency && !isAdmin)
            throw new BookingException(403, "Bạn không có quyền xem snapshot của booking này.");

        var snapshot = await repository.FindSnapshot(snapshotId, ct) ?? throw new BookingException(404, "Không tìm thấy snapshot.");
        if (snapshot.BookingId != bookingId)
            throw new BookingException(404, "Snapshot không thuộc booking này.");

        return ToSnapshotDto(snapshot);
    }

    public async Task<BookingSnapshotDto> CreateProposal(string agencyId, int bookingId, CreateProposalRequest request, CancellationToken ct)
    {
        await using var transaction = await repository.BeginSnapshotChange(bookingId, ct);
        var booking = await repository.Find(bookingId, ct) ?? throw new BookingException(404, "Không tìm thấy đơn đặt tour.");
        if (booking.Tour?.AgencyId != agencyId && !booking.BookingAgencies.Any(ba => ba.AgencyId == agencyId))
            throw new BookingException(403, "Chỉ Agency phụ trách mới có quyền gửi phương án đề xuất cho booking này.");

        EnsureProposalAllowed(booking);
        if (booking.Snapshots.Any(s => s.SnapshotType == "agreed"))
            throw new BookingException(409, "Đơn đã có phương án được chấp nhận. Thay đổi thỏa thuận cần thực hiện qua phụ lục (amendment).");

        var maxVersion = await repository.GetMaxSnapshotVersion(bookingId, ct);
        var newVersion = maxVersion + 1;
        if (request.Note?.Length > 2000)
            throw new BookingException(400, "Nội dung phương án tối đa 2.000 ký tự.");

        var agencyNote = string.IsNullOrWhiteSpace(request?.Note) ? null : request.Note.Trim();

        // Preserve the catalogue terms that this booking was based on, even if the
        // public tour has since changed. Refresh operational choices/prices from the booking.
        var source = booking.Snapshots.Where(s => s.SnapshotType == "initial_request")
            .OrderBy(s => s.Version).FirstOrDefault()
            ?? booking.Snapshots.OrderByDescending(s => s.Version).FirstOrDefault();
        var terms = source is null ? null : ToSnapshotDto(source).SnapshotData;
        var current = BuildSnapshotPayload(booking, booking.Tour!, booking.Tour!.Version, agencyNote: agencyNote);
        var payload = terms is null ? current : terms with
        {
            SchemaVersion = current.SchemaVersion,
            StartDate = current.StartDate,
            EndDate = current.EndDate,
            TotalAmount = current.TotalAmount,
            DepositAmount = current.DepositAmount,
            Passengers = current.Passengers,
            Itinerary = current.Itinerary,
            Hotels = current.Hotels,
            PaymentConditions = current.PaymentConditions,
            CustomerNotes = current.CustomerNotes,
            AgencyNote = current.AgencyNote,
            GeneratedAt = current.GeneratedAt
        };
        var json = System.Text.Json.JsonSerializer.Serialize(payload, new System.Text.Json.JsonSerializerOptions
        {
            PropertyNamingPolicy = System.Text.Json.JsonNamingPolicy.CamelCase,
            WriteIndented = false
        });

        var proposalSnapshot = new BookingSnapshot
        {
            BookingId = bookingId,
            Version = newVersion,
            SnapshotType = "proposal",
            SnapshotData = json,
            SourceTourVersion = payload.SourceTourVersion,
            CreatedAt = DateTime.UtcNow,
            CreatedBy = agencyId
        };

        repository.AddSnapshot(proposalSnapshot);
        if (booking.CustomerId is not null)
            proposalSnapshot.Events.Add(new BookingProposalEvent { ActorId = agencyId,
                RecipientId = booking.CustomerId, EventType = "proposal_sent", Message = agencyNote });
        await repository.SaveChangesAsync(ct);
        await transaction.CommitAsync(ct);

        return ToSnapshotDto(proposalSnapshot);
    }

    public async Task<BookingDto> AcceptProposal(string customerId, int bookingId, int snapshotId, CancellationToken ct)
    {
        await using var transaction = await repository.BeginSnapshotChange(bookingId, ct);
        var booking = await repository.Find(bookingId, ct) ?? throw new BookingException(404, "Không tìm thấy đơn đặt tour.");
        if (booking.CustomerId != customerId)
            throw new BookingException(403, "Chỉ khách hàng sở hữu đơn mới có quyền chấp nhận phương án.");

        var snapshot = await repository.FindSnapshot(snapshotId, ct) ?? throw new BookingException(404, "Không tìm thấy snapshot phương án.");
        if (snapshot.BookingId != bookingId)
            throw new BookingException(404, "Snapshot không thuộc booking này.");

        // Idempotent: nếu đã được duyệt trước đó
        if (snapshot.SnapshotType == "agreed" && snapshot.AcceptedAt.HasValue && snapshot.AcceptedBy == customerId)
        {
            await transaction.CommitAsync(ct);
            return ToDto(booking);
        }

        EnsureProposalAllowed(booking);
        if (snapshot.SnapshotType != "proposal")
            throw new BookingException(422, "Chỉ có thể chấp nhận snapshot loại phương án đề xuất (proposal).");

        var latestVersion = await repository.GetMaxSnapshotVersion(bookingId, ct);
        if (snapshot.Version != latestVersion)
            throw new BookingException(409, "Phương án này đã cũ. Vui lòng xem xét phương án mới nhất do đại lý gửi.");
        if (booking.Snapshots.Any(s => s.SnapshotType == "agreed"))
            throw new BookingException(409, "Đơn đã chốt phương án. Thay đổi thỏa thuận cần thực hiện qua phụ lục (amendment).");
        if (snapshot.Events.Any(e => e.EventType == "changes_requested"))
            throw new BookingException(409, "Bạn đã yêu cầu chỉnh sửa phương án này. Vui lòng chờ phương án mới từ công ty lữ hành.");

        snapshot.SnapshotType = "agreed";
        snapshot.AcceptedAt = DateTime.UtcNow;
        snapshot.AcceptedBy = customerId;
        snapshot.Events.Add(new BookingProposalEvent { ActorId = customerId, RecipientId = snapshot.CreatedBy,
            EventType = "proposal_accepted" });

        await repository.SaveChangesAsync(ct);
        await transaction.CommitAsync(ct);

        return ToDto(booking);
    }

    public async Task<BookingDto> RequestProposalChanges(string customerId, int bookingId, int snapshotId,
        RequestProposalChangesRequest request, CancellationToken ct)
    {
        var message = request.Message?.Trim();
        if (string.IsNullOrWhiteSpace(message) || message.Length > 2000)
            throw new BookingException(400, "Vui lòng nhập nội dung cần chỉnh sửa (tối đa 2.000 ký tự).");
        await using var transaction = await repository.BeginSnapshotChange(bookingId, ct);
        var booking = await repository.Find(bookingId, ct) ?? throw new BookingException(404, "Không tìm thấy đơn đặt tour.");
        if (booking.CustomerId != customerId) throw new BookingException(403, "Bạn không sở hữu đơn đặt tour này.");
        var snapshot = booking.Snapshots.SingleOrDefault(s => s.Id == snapshotId)
            ?? throw new BookingException(404, "Không tìm thấy phương án trong đơn đặt tour.");
        EnsureProposalAllowed(booking);
        if (snapshot.SnapshotType != "proposal" || booking.Snapshots.Any(s => s.SnapshotType == "agreed") ||
            snapshot.Version != await repository.GetMaxSnapshotVersion(bookingId, ct))
            throw new BookingException(409, "Chỉ có thể phản hồi phương án mới nhất chưa được chấp nhận.");
        var existing = snapshot.Events.SingleOrDefault(e => e.EventType == "changes_requested");
        if (existing is not null && existing.Message != message)
            throw new BookingException(409, "Phản hồi đã được gửi. Vui lòng chờ công ty lữ hành gửi phương án mới.");
        if (existing is null)
        {
            snapshot.Events.Add(new BookingProposalEvent { ActorId = customerId, RecipientId = snapshot.CreatedBy,
                EventType = "changes_requested", Message = message });
            await repository.SaveChangesAsync(ct);
        }
        await transaction.CommitAsync(ct);
        return ToDto(booking);
    }

    private static void EnsureProposalAllowed(Booking booking)
    {
        if (booking.Status is not (BookingStatus.Pending or BookingStatus.Deposited or BookingStatus.Confirmed or BookingStatus.Paid))
            throw new BookingException(409, "Trạng thái đơn đặt không còn cho phép gửi hoặc chấp nhận phương án.");
    }

    // WF06: Điểm danh hành khách
    public async Task<ParticipantDto> RecordAttendance(string guideId, int bookingId, AttendanceCheckinRequest request, CancellationToken ct)
    {
        var booking = await repository.Find(bookingId, ct) ?? throw new BookingException(404, "Không tìm thấy đơn đặt tour.");
        if (!booking.AssignedGuides.Any(ag => ag.GuideId == guideId))
            throw new BookingException(403, "Chỉ Hướng dẫn viên được phân công cho chuyến này mới có quyền điểm danh.");

        var participant = booking.Participants.FirstOrDefault(p => p.Id == request.ParticipantId)
            ?? throw new BookingException(404, "Không tìm thấy hành khách trong danh sách đoàn.");

        if (Enum.TryParse<AttendanceStatus>(request.Status, true, out var status))
            participant.AttendanceStatus = status;
        else
            throw new BookingException(400, "Trạng thái điểm danh không hợp lệ.");

        participant.CheckedBy = guideId;
        participant.CheckedAt = DateTime.UtcNow;
        await repository.SaveChangesAsync(ct);

        return Participant(participant);
    }

    // WF06: Báo cáo sự cố
    public async Task<IncidentDto> ReportIncident(string guideId, int bookingId, ReportIncidentRequest request, CancellationToken ct)
    {
        var booking = await repository.Find(bookingId, ct) ?? throw new BookingException(404, "Không tìm thấy đơn đặt tour.");
        if (!booking.AssignedGuides.Any(ag => ag.GuideId == guideId))
            throw new BookingException(403, "Chỉ Hướng dẫn viên được phân công cho chuyến này mới có quyền báo sự cố.");

        var incident = new BookingIncident
        {
            BookingId = bookingId,
            AgencyId = booking.Tour!.AgencyId ?? throw new BookingException(422, "Booking requires an Agency."),
            IncidentType = request.IncidentType.Trim(),
            Title = string.IsNullOrWhiteSpace(request.IncidentType) ? request.Title.Trim() : $"[{request.IncidentType.Trim()}] {request.Title.Trim()}",
            Description = IncidentDescription(request.Description, request.Severity),
            Status = IncidentStatus.Reported,
            ReportedBy = guideId
        };

        repository.AddIncident(incident);
        await repository.SaveChangesAsync(ct);

        return new IncidentDto(
            incident.Id, incident.BookingId,
            incident.Title, incident.Description, Severity(incident.Description),
            incident.Status.GetValueOrDefault(IncidentStatus.Reported).ToString(), incident.CreatedAt ?? DateTime.UnixEpoch);
    }

    // Schema 2: tách AgencyNote khỏi CustomerNotes và lưu 3 ghi chú hành khách.
    // Bản chụp cũ (schema 1) giữ nguyên, không ghi đè.
    private const int SnapshotSchemaVersion = 2;

    private static BookingSnapshotPayload BuildSnapshotPayload(Booking booking, Tour tour, int? sourceTourVersion, string? customNotes = null, string? agencyNote = null)
    {
        var pricingTiers = tour.PricingTiers.OrderBy(t => t.DisplayOrder).Select(t => new SnapshotPricingTier(
            t.Id, t.Name ?? "Tiêu chuẩn", t.MinAge, t.MaxAge, t.PricePerGuest ?? 0)).ToList();

        var passengers = booking.Participants.OrderBy(p => p.ParticipantIndex).Select(p => new SnapshotPassenger(
            p.ParticipantIndex,
            p.FullName,
            Phone(p.Note),
            p.DateOfBirth,
            p.Gender,
            p.IdentityNumber,
            p.TierName,
            p.Price,
            NoteWithoutPhone(p.Note),
            Blank(p.RoommateNote),
            Blank(p.RestaurantNote))).ToList();

        var itinerary = booking.Timelines.OrderBy(t => t.DayNumber).Select(t => new SnapshotDay(
            t.DayNumber,
            t.Title,
            t.Description,
            t.Attractions.Select(a => new SnapshotLocation(t.DayNumber, a.CustomizedLocationName ?? a.OriginalLocationName, a.Time)).ToList(),
            t.Meals.Select(m => new SnapshotMeal(t.DayNumber, m.MealType, m.CustomizedRestaurantName ?? m.OriginalRestaurantName, m.Time, m.ServiceId, m.PriceDifference ?? 0)).ToList())).ToList();

        var hotels = booking.Accommodations.Select(h => new SnapshotHotel(
            h.Destination,
            h.CustomizedHotelName ?? h.OriginalHotelName,
            h.CustomizedStars ?? h.OriginalStars,
            h.NightsCount,
            h.ServiceId,
            h.PriceDifference ?? 0)).ToList();

        var paymentConditions = booking.PaymentRequests.Select(pr => new SnapshotPaymentCondition(
            pr.Description.StartsWith("Đặt cọc") ? "deposit" : "balance",
            pr.Amount,
            pr.DueDate,
            pr.Description)).ToList();

        return new BookingSnapshotPayload(
            SchemaVersion: SnapshotSchemaVersion,
            TourId: booking.TourId ?? tour.Id,
            TourCode: tour.Code ?? $"TRIP-{tour.Id}",
            TourName: tour.Name ?? "Tour Du Lịch",
            SourceTourVersion: sourceTourVersion,
            Destination: tour.Destination,
            DepartureLocation: tour.DepartureLocation,
            DurationDays: tour.DurationDays ?? Math.Max(1, booking.Timelines.Count),
            DurationNights: tour.DurationNights ?? 0,
            StartDate: booking.StartDate,
            EndDate: EndDate(booking),
            AgencyId: tour.AgencyId ?? booking.Tour?.AgencyId ?? "",
            AgencyName: tour.Agency?.Name ?? booking.Tour?.Agency?.Name,
            BasePrice: tour.BasePrice ?? 0,
            TotalAmount: booking.TotalAmount,
            DepositAmount: DepositAmount(booking),
            MinGuests: tour.MinGuests,
            MaxGuests: tour.MaxGuests,
            PricingTiers: pricingTiers,
            Passengers: passengers,
            Itinerary: itinerary,
            Hotels: hotels,
            Inclusions: tour.Inclusions,
            Exclusions: tour.Exclusions,
            CancellationPolicy: tour.CancellationPolicy,
            PaymentConditions: paymentConditions,
            CustomerNotes: customNotes ?? booking.SpecialRequests,
            GeneratedAt: DateTime.UtcNow,
            AgencyNote: agencyNote
        );
    }

    private static BookingSnapshotSummaryDto ToSnapshotSummaryDto(BookingSnapshot s) =>
        new(s.Id, s.BookingId, s.Version, s.SnapshotType, s.SourceTourVersion,
            Utc(s.CreatedAt), s.CreatedBy, s.AcceptedAt is { } at ? Utc(at) : null, s.AcceptedBy,
            ChangeRequest(s), s.Events.FirstOrDefault(e => e.EventType == "proposal_sent")?.Message);

    private static DateTime Utc(DateTime value) => DateTime.SpecifyKind(value, DateTimeKind.Utc);
    private static ProposalChangeRequestDto? ChangeRequest(BookingSnapshot s) =>
        s.Events.FirstOrDefault(e => e.EventType == "changes_requested") is { } feedback
            ? new(feedback.Message ?? "", Utc(feedback.CreatedAt)) : null;

    private static BookingSnapshotDto ToSnapshotDto(BookingSnapshot s)
    {
        var payload = System.Text.Json.JsonSerializer.Deserialize<BookingSnapshotPayload>(s.SnapshotData,
            new System.Text.Json.JsonSerializerOptions { PropertyNameCaseInsensitive = true })
            ?? throw new InvalidOperationException("Invalid snapshot json data");

        return new(s.Id, s.BookingId, s.Version, s.SnapshotType, s.SourceTourVersion,
            payload, Utc(s.CreatedAt), s.CreatedBy, s.AcceptedAt is { } at ? Utc(at) : null, s.AcceptedBy,
            ChangeRequest(s), s.Events.FirstOrDefault(e => e.EventType == "proposal_sent")?.Message);
    }

    private static BookingDto ToDto(Booking b)
    {
        var snapshots = b.Snapshots ?? [];
        var agreed = snapshots.Where(s => s.SnapshotType == "agreed" && s.AcceptedAt.HasValue && s.AcceptedBy != null)
            .OrderByDescending(s => s.Version).FirstOrDefault();
        var latestProposal = snapshots.Where(s => s.SnapshotType == "proposal")
            .OrderByDescending(s => s.Version).FirstOrDefault();
        var initialRequest = snapshots.Where(s => s.SnapshotType == "initial_request")
            .OrderBy(s => s.Version).FirstOrDefault();

        var effectiveSnapshot = agreed ?? latestProposal ?? initialRequest;
        BookingSnapshotPayload? effectivePayload = null;
        if (effectiveSnapshot is not null)
        {
            try
            {
                effectivePayload = System.Text.Json.JsonSerializer.Deserialize<BookingSnapshotPayload>(effectiveSnapshot.SnapshotData,
                    new System.Text.Json.JsonSerializerOptions { PropertyNameCaseInsensitive = true });
            }
            catch { }
        }

        string tourName = effectivePayload?.TourName ?? b.Tour?.Name ?? "Tour Du Lịch";
        string? agencyId = effectivePayload?.AgencyId ?? b.Tour?.AgencyId;
        string? agencyName = effectivePayload?.AgencyName ?? b.Tour?.Agency?.Name;

        string snapshotStatus = agreed is not null
            ? "agreed"
            : (latestProposal is not null
                ? "proposal_pending"
                : (initialRequest is not null ? "initial_pending" : "legacy_unverified"));

        int? effectiveVersion = effectiveSnapshot?.Version;

        return new BookingDto(
            b.Id, b.BookingCode, b.CustomerId ?? "", b.Customer?.Name ?? "",
            b.TourId, tourName, agencyId, agencyName,
            b.StartDate, EndDate(b), TotalGuests(b), b.TotalAmount,
            DepositAmount(b), PaidAmount(b), b.Status.GetValueOrDefault(BookingStatus.Pending).ToString(), b.PaymentStatus.GetValueOrDefault(PaymentStatus.Unpaid).ToString(),
            b.ContactName, b.ContactPhone, b.ContactEmail, b.SpecialRequests,
            b.Participants.OrderBy(p => p.ParticipantIndex).Select(Participant).ToList(),
            b.AssignedGuides.Select(ag => new AssignedGuideDto(
                ag.Id, ag.GuideId, ag.Guide?.Name ?? "", ag.Guide?.Phone,
                ag.Role, "ASSIGNED", ag.Notes, ag.AssignedAt, ag.AgencyId)).ToList(),
            b.CreatedAt ?? DateTime.UnixEpoch, b.UpdatedAt,
            b.Incidents.OrderByDescending(i => i.CreatedAt).Select(i => new IncidentDto(
                i.Id, i.BookingId, i.Title, i.Description, Severity(i.Description), i.Status.GetValueOrDefault(IncidentStatus.Reported).ToString(), i.CreatedAt ?? DateTime.UnixEpoch)).ToList(),
            b.Timelines.OrderBy(t => t.DayNumber).Select(t => new BookingDayDto(t.Id, t.DayNumber, t.Title, t.Description,
                t.Attractions.Select(a => new BookingLocationDto(a.Id, a.CustomizedLocationName ?? a.OriginalLocationName, a.Time, a.AttendanceStatus)).ToList(),
                t.Meals.Select(m => new BookingMealDto(m.Id, m.MealType, m.CustomizedRestaurantName ?? m.OriginalRestaurantName, m.DateService, m.Time, m.ServiceId, m.PriceDifference ?? 0)).ToList())).ToList(),
            b.Accommodations.Select(h => new BookingHotelDto(h.Id, h.Destination, h.CustomizedHotelName ?? h.OriginalHotelName, h.CustomizedStars ?? h.OriginalStars, h.NightsCount, h.ServiceId, h.PriceDifference ?? 0)).ToList(),
            AgreedSnapshot: agreed is not null ? ToSnapshotDto(agreed) : null,
            LatestProposal: latestProposal is not null ? ToSnapshotDto(latestProposal) : null,
            InitialRequestSnapshot: initialRequest is not null ? ToSnapshotDto(initialRequest) : null,
            SnapshotStatus: snapshotStatus,
            EffectiveSnapshotVersion: effectiveVersion);
    }

    private static BookingListItem ToListItem(Booking b)
    {
        var snapshots = b.Snapshots ?? [];
        var agreed = snapshots.Where(s => s.SnapshotType == "agreed" && s.AcceptedAt.HasValue && s.AcceptedBy != null)
            .OrderByDescending(s => s.Version).FirstOrDefault();
        var latestProposal = snapshots.Where(s => s.SnapshotType == "proposal")
            .OrderByDescending(s => s.Version).FirstOrDefault();
        var initialRequest = snapshots.Where(s => s.SnapshotType == "initial_request")
            .OrderBy(s => s.Version).FirstOrDefault();
        var effective = agreed ?? latestProposal ?? initialRequest;

        string? tourName = null;
        if (effective is not null)
        {
            try
            {
                var doc = System.Text.Json.JsonDocument.Parse(effective.SnapshotData);
                if (doc.RootElement.TryGetProperty("tourName", out var nameProp))
                    tourName = nameProp.GetString();
            }
            catch { }
        }
        tourName ??= b.Tour?.Name;

        string snapshotStatus = agreed is not null
            ? "agreed"
            : (latestProposal is not null
                ? "proposal_pending"
                : (initialRequest is not null ? "initial_pending" : "legacy_unverified"));

        return new BookingListItem(
            b.Id, b.BookingCode, tourName, b.Customer?.Name, b.ContactPhone,
            b.StartDate, TotalGuests(b), b.TotalAmount, PaidAmount(b),
            b.Status.GetValueOrDefault(BookingStatus.Pending).ToString(),
            b.PaymentStatus.GetValueOrDefault(PaymentStatus.Unpaid).ToString(),
            b.CreatedAt ?? DateTime.UnixEpoch,
            snapshotStatus,
            effective?.Version);
    }

    private static ParticipantDto Participant(BookingParticipant p) => new(p.Id, p.FullName, Phone(p.Note),
        p.DateOfBirth, p.Gender, p.IdentityNumber, p.AttendanceStatus.GetValueOrDefault(AttendanceStatus.Pending).ToString(),
        p.Status ?? "ACTIVE", p.AssignedGuide?.Name, p.Price, p.TierName, p.AgencyId, p.ParticipantIndex, p.IsPrimary, p.Note, p.RoommateNote, p.RestaurantNote, p.CheckedBy, p.CheckedAt, p.AssignedGuideId);
    private static int TotalGuests(Booking booking) => booking.Participants.Count(p => p.IsPrimary != false && p.Status != "INACTIVE");
    private static decimal PaidAmount(Booking booking) => booking.PaymentTransactions
        .Where(t => t.Status == PaymentTransactionStatus.Success).Sum(t => t.Amount);
    private static decimal DepositAmount(Booking booking) => booking.PaymentRequests
        .Where(p => p.Description.StartsWith("Đặt cọc")).Select(p => (decimal?)p.Amount).FirstOrDefault() ?? Money(booking.TotalAmount * 0.3m);
    private static DateTime EndDate(Booking booking) => booking.StartDate.AddDays(Math.Max(1,
        booking.Timelines.Select(t => t.DayNumber).DefaultIfEmpty(booking.Tour?.DurationDays ?? 1).Max()) - 1);
    private static string? ParticipantNote(string? note, string? phone) => string.IsNullOrWhiteSpace(phone)
        ? note?.Trim() : string.Join("\n", new[] { note?.Trim(), $"Điện thoại: {phone.Trim()}" }.Where(s => !string.IsNullOrWhiteSpace(s)));
    private static string? Blank(string? value) => string.IsNullOrWhiteSpace(value) ? null : value.Trim();
    private static string? NoteWithoutPhone(string? note) => Blank(note is null ? null
        : System.Text.RegularExpressions.Regex.Replace(note, @"(?:^|\r?\n)Điện thoại: [^\r\n]*", ""));
    private static string? Phone(string? note) => string.IsNullOrWhiteSpace(note) ? null
        : System.Text.RegularExpressions.Regex.Match(note, @"(?:^|\n)Điện thoại: ([^\r\n]+)") is { Success: true } match ? match.Groups[1].Value : null;
    private static string IncidentDescription(string description, string? severity) => string.IsNullOrWhiteSpace(severity)
        ? description.Trim() : $"{description.Trim()}\nMức độ: {severity.Trim()}";
    private static string? Severity(string? description) => string.IsNullOrWhiteSpace(description) ? null
        : System.Text.RegularExpressions.Regex.Match(description, @"(?:^|\n)Mức độ: ([^\r\n]+)") is { Success: true } match ? match.Groups[1].Value : null;
}
