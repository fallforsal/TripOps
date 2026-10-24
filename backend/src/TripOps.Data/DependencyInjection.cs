using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using TripOps.Data.Repositories;

namespace TripOps.Data;

public sealed record DataConfiguration(bool IsConfigured);

public static class DependencyInjection
{
    public static IServiceCollection AddTripOpsData(
        this IServiceCollection services, IConfiguration configuration)
    {
        var connection = configuration.GetConnectionString("TripOps");
        var isConfigured = !string.IsNullOrWhiteSpace(connection);
        services.AddSingleton(new DataConfiguration(isConfigured));

        services.AddDbContext<TripOpsDbContext>(options =>
        {
            if (isConfigured)
            {
                options.UseSqlServer(connection);
            }
            else
            {
                options.UseSqlServer("Server=.\\SQLEXPRESS;Database=TripOps;Trusted_Connection=True;TrustServerCertificate=True;");
            }
        });

        // Repositories & Unit of Work
        services.AddScoped(typeof(IRepository<,>), typeof(Repository<,>));
        services.AddScoped(typeof(IRepository<>), typeof(Repository<>));
        services.AddScoped<IUnitOfWork, UnitOfWork>();

        return services;
    }
}
