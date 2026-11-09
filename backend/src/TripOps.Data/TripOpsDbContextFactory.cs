using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;
using System.Text.Json;

namespace TripOps.Data;

public class TripOpsDbContextFactory : IDesignTimeDbContextFactory<TripOpsDbContext>
{
    public TripOpsDbContext CreateDbContext(string[] args)
    {
        var optionsBuilder = new DbContextOptionsBuilder<TripOpsDbContext>();

        var connectionString = Environment.GetEnvironmentVariable("ConnectionStrings__TripOps");
        if (string.IsNullOrWhiteSpace(connectionString))
        {
            // EF uses this factory instead of the API host. Read the same local JSON
            // connection settings, whether invoked from the repo, backend or project.
            var apiDirectory = FindApiDirectory();
            var environment = Environment.GetEnvironmentVariable("DOTNET_ENVIRONMENT")
                ?? Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT") ?? "Development";
            connectionString = ReadConnection(Path.Combine(apiDirectory, $"appsettings.{environment}.json"))
                ?? ReadConnection(Path.Combine(apiDirectory, "appsettings.json"))
                ?? "Server=.\\SQLEXPRESS;Database=TripOps;Trusted_Connection=True;TrustServerCertificate=True;";
        }

        optionsBuilder.UseSqlServer(connectionString);

        return new TripOpsDbContext(optionsBuilder.Options);
    }

    private static string FindApiDirectory()
    {
        for (var directory = new DirectoryInfo(Directory.GetCurrentDirectory()); directory is not null; directory = directory.Parent)
            foreach (var candidate in new[] { directory.FullName,
                Path.Combine(directory.FullName, "src", "TripOps.Api"),
                Path.Combine(directory.FullName, "backend", "src", "TripOps.Api") })
                if (File.Exists(Path.Combine(candidate, "TripOps.Api.csproj"))) return candidate;
        throw new InvalidOperationException("Không tìm thấy thư mục TripOps.Api để đọc cấu hình migration.");
    }

    private static string? ReadConnection(string path)
    {
        if (!File.Exists(path)) return null;
        using var json = JsonDocument.Parse(File.ReadAllText(path), new JsonDocumentOptions {
            AllowTrailingCommas = true, CommentHandling = JsonCommentHandling.Skip });
        if (!json.RootElement.TryGetProperty("ConnectionStrings", out var connections) ||
            !connections.TryGetProperty("TripOps", out var value)) return null;
        var connection = value.GetString();
        return string.IsNullOrWhiteSpace(connection) ? null : connection;
    }
}
