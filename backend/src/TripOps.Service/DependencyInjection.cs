using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
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
        return services;
    }
}
