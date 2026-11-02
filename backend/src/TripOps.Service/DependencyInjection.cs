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
        // Đọc cấu hình lúc dựng service (không đọc sớm) để appsettings/user-secrets/test override đều có hiệu lực.
        services.TryAddSingleton<Payments.PaymentClock>();
        services.AddSingleton(sp => Payments.PayOsOptions.From(sp.GetRequiredService<IConfiguration>()));
        services.AddHttpClient<Payments.PayOsGateway>(client => client.Timeout = TimeSpan.FromSeconds(15));
        services.AddScoped<Bookings.BookingService>();
        services.AddScoped<Services.ServiceModerationService>();
        services.AddScoped<Services.ProviderServiceService>();
        services.AddSingleton<Tours.IItineraryDraftGenerator, Tours.UnconfiguredItineraryDraftGenerator>();
        services.AddHttpClient<Accounts.CloudinaryStorage>(client => client.Timeout = TimeSpan.FromSeconds(20));
        return services;
    }
}
