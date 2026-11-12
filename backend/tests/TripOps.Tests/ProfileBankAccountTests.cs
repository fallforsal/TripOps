using System.Net;
using System.Net.Http.Json;
using TripOps.Service.Accounts;
using TripOps.Service.Bookings;

namespace TripOps.Tests;

// Tài khoản ngân hàng trong hồ sơ: nhập ở hồ sơ hoặc tự lưu khi khách nhập lúc yêu cầu hoàn tiền.
public sealed partial class BookingFlowTests
{
    [Fact]
    public async Task Profile_bank_account_is_saved_directly_and_normalizes_holder_name()
    {
        using var app = new App(); await app.Initialize();
        var customer = await app.Client("customer1@example.test");
        var empty = await Read<BankAccountDto>(await customer.GetAsync("/api/v1/me/bank-account"));
        Assert.False(empty.HasAccount);

        Assert.Equal(HttpStatusCode.UnprocessableEntity, (await customer.PutAsJsonAsync("/api/v1/me/bank-account",
            new BankAccountInput("Vietcombank", "12ab", "Hoàng Tùng Lâm"))).StatusCode);
        var saved = await Read<BankAccountDto>(await customer.PutAsJsonAsync("/api/v1/me/bank-account",
            new BankAccountInput("Vietcombank", "0123 456 789", "  hoàng   tùng lâm đức ")));
        Assert.True(saved.HasAccount);
        Assert.Equal("0123456789", saved.AccountNumber);
        Assert.Equal("HOANG TUNG LAM DUC", saved.AccountHolder);
        Assert.Equal("HOANG TUNG LAM DUC", (await Read<BankAccountDto>(await customer.GetAsync("/api/v1/me/bank-account"))).AccountHolder);

        Assert.Equal(HttpStatusCode.NoContent, (await customer.DeleteAsync("/api/v1/me/bank-account")).StatusCode);
        Assert.False((await Read<BankAccountDto>(await customer.GetAsync("/api/v1/me/bank-account"))).HasAccount);
    }

    [Fact]
    public async Task Bank_account_entered_for_a_refund_is_remembered_in_the_profile()
    {
        var clock = new TestClock { Fixed = DateTime.UtcNow };
        using var app = PayOsApp(new FakePayOs(), clock); await app.Initialize();
        var (customer, _, booking) = await ApprovedBooking(app, Sample() with { StartDate = DateTime.UtcNow.Date.AddDays(20) });
        await Read<BookingDto>(await customer.PostAsJsonAsync($"/api/v1/bookings/{booking.Id}/deposit", new BookingDepositRequest(1500000, "DEP-BANK", null)));
        await Read<BookingDto>(await customer.PostAsJsonAsync($"/api/v1/bookings/{booking.Id}/cancellation-requests",
            new CustomerCancellationRequest("CUSTOMER_REQUEST", "Bận việc", "Techcombank", "1903 5555 01", "trần thị bé")));

        var profile = await Read<BankAccountDto>(await customer.GetAsync("/api/v1/me/bank-account"));
        Assert.Equal("Techcombank", profile.BankName);
        Assert.Equal("1903555501", profile.AccountNumber);
        Assert.Equal("TRAN THI BE", profile.AccountHolder);
    }
}
