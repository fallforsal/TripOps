using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;

namespace TripOps.Data;

public class TripOpsDbContextFactory : IDesignTimeDbContextFactory<TripOpsDbContext>
{
    public TripOpsDbContext CreateDbContext(string[] args)
    {
        var optionsBuilder = new DbContextOptionsBuilder<TripOpsDbContext>();
        var connectionString = Environment.GetEnvironmentVariable("ConnectionStrings__TripOps")
            ?? "Server=.\\SQLEXPRESS;Database=TripOps;Trusted_Connection=True;TrustServerCertificate=True;";

        optionsBuilder.UseSqlServer(connectionString);

        return new TripOpsDbContext(optionsBuilder.Options);
    }
}
