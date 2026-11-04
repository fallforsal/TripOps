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
        services.AddSingleton<ISystemStatusService, SystemStatusService>();
        services.AddScoped<Accounts.AccountService>();
        services.AddScoped<Guides.AgencyGuideService>();
        services.AddScoped<TripOps.Data.Repositories.TourRepository>();
        services.AddScoped<TripOps.Data.Repositories.BookingRepository>();
        services.AddScoped<Tours.TourService>();
        services.AddScoped<Tours.DesignRequestService>();
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
        services.AddScoped<Services.ServiceModerationService>();
        services.AddScoped<Services.ProviderServiceService>();
        services.AddSingleton<Tours.IItineraryDraftGenerator, Tours.UnconfiguredItineraryDraftGenerator>();
        services.AddHttpClient<Accounts.CloudinaryStorage>(client => client.Timeout = TimeSpan.FromSeconds(20));
        return services;
    }
}
