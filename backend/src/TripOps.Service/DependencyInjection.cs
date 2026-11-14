using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using TripOps.Data;
using TripOps.Service.Diagnostics;

namespace TripOps.Service;

public static class DependencyInjection
{
    public static IServiceCollection AddTripOpsServices(
        this IServiceCollection services, IConfiguration configuration)
    {
        services.AddTripOpsData(configuration);
        services.AddMemoryCache();
        services.AddScoped<Chat.ChatService>();
        services.AddSingleton<Locations.VietnamAdministrativeService>();
        services.AddHttpClient(Locations.VietnamAdministrativeService.ClientName, client => {
            client.BaseAddress = new Uri("https://provinces.open-api.vn/api/v2/");
            client.Timeout = TimeSpan.FromSeconds(12);
        });
        services.AddSingleton<ISystemStatusService, SystemStatusService>();
        services.AddScoped<Accounts.AccountService>();
        services.AddScoped<Accounts.CustomerProfileService>();
        services.AddScoped<Guides.AgencyGuideService>();
        services.AddScoped<TripOps.Data.Repositories.TourRepository>();
        services.AddScoped<TripOps.Data.Repositories.BookingRepository>();
        services.AddScoped<Tours.TourService>();
        services.AddScoped<Tours.DesignRequestService>();
        services.AddScoped<Notifications.WorkflowNotificationService>();
        services.AddScoped<Bookings.BookingQuotationService>();
        // Đọc cấu hình lúc dựng service (không đọc sớm) để appsettings/user-secrets/test override đều có hiệu lực.
        services.TryAddSingleton<Payments.PaymentClock>();
        services.AddSingleton(sp => Payments.PayOsOptions.From(sp.GetRequiredService<IConfiguration>()));
        services.AddHttpClient<Payments.PayOsGateway>(client => client.Timeout = TimeSpan.FromSeconds(15));
        services.AddSingleton(sp => Payments.PayOsPayoutOptions.From(sp.GetRequiredService<IConfiguration>()));
        // Kênh chi hộ payOS chỉ nhận IP đã khai báo: luôn đi IPv4 để IP payOS thấy khớp IP đã thêm (tránh mạng có IPv6).
        services.AddHttpClient<Payments.PayOsPayoutGateway>(client => client.Timeout = TimeSpan.FromSeconds(20))
            .ConfigurePrimaryHttpMessageHandler(() => new System.Net.Http.SocketsHttpHandler { ConnectCallback = Payments.PayOsPayoutGateway.ConnectIPv4 });
        services.AddSingleton(sp => Notifications.SmtpOptions.From(sp.GetRequiredService<IConfiguration>()));
        services.TryAddSingleton<Notifications.EmailSender>();
        services.AddScoped<Bookings.BookingService>();
        // Quyết toán cho Agency. Tác vụ chạy ngầm chỉ chuyển tiền khi Settlement:AutoPayoutEnabled = true.
        services.AddSingleton(sp => Settlements.SettlementOptions.From(sp.GetRequiredService<IConfiguration>()));
        services.AddScoped<Settlements.AgencySettlementService>();
        services.AddHostedService<Settlements.SettlementWorker>();
        // Agency chủ trì xem (chỉ đọc) lịch sử hoàn tiền của khách — UC-068/UC-069.
        services.AddScoped<Refunds.AgencyRefundsService>();
        // Đánh giá tour (sao Agency tính bằng công thức) và khiếu nại khách ↔ Admin.
        services.AddScoped<Reviews.FeedbackService>();
        services.AddScoped<Reviews.ComplaintService>();
        // Email chào mừng, quên mật khẩu bằng OTP, đổi mật khẩu.
        services.AddScoped<Accounts.PasswordService>();
        services.AddScoped<Services.ServiceModerationService>();
        services.AddScoped<Services.ProviderServiceService>();
        services.AddSingleton<Tours.IItineraryDraftGenerator, Tours.UnconfiguredItineraryDraftGenerator>();
        services.AddHttpClient<Accounts.CloudinaryStorage>(client => client.Timeout = TimeSpan.FromSeconds(20));
        // Chatbot khách vãng lai: khóa OpenAI đọc từ user-secrets/biến môi trường (OpenAI:ApiKey); không có khóa thì dùng trả lời dự phòng.
        services.AddSingleton(sp => Ai.AiAssistantOptions.From(sp.GetRequiredService<IConfiguration>()));
        // Thời gian chờ từng lần gọi do OpenAI:TimeoutSeconds quyết định (OpenAiChatClient), nên không đặt giới hạn cứng ở đây.
        services.AddHttpClient<Ai.OpenAiChatClient>(client => client.Timeout = Timeout.InfiniteTimeSpan);
        services.AddScoped<Ai.PublicTourFinder>();
        services.AddScoped<Ai.GuestAssistantService>();
        return services;
    }
}
