using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace TripOps.Data;

public sealed record DataConfiguration(bool IsConfigured);

public static class DependencyInjection
{
    public static IServiceCollection AddTripOpsData(
        this IServiceCollection services, IConfiguration configuration)
    {
        var connection = configuration.GetConnectionString("TripOps");
        services.AddSingleton(new DataConfiguration(!string.IsNullOrWhiteSpace(connection)));
        if (!string.IsNullOrWhiteSpace(connection))
            services.AddDbContext<TripOpsDbContext>(options => options.UseSqlServer(connection));
        return services;
    }
}
