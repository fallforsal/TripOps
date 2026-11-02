using Microsoft.EntityFrameworkCore;
using TripOps.Data;
using TripOps.Data.Entities;
using TripOps.Data.Enums;
using TripOps.Data.Repositories;

namespace TripOps.Tests;

public class TourStatusMatrixTests
{
    private static TripOpsDbContext CreateContext()
    {
        var context = new TripOpsDbContext(new DbContextOptionsBuilder<TripOpsDbContext>()
            .UseSqlServer("Server=localhost;Database=MatrixTests;Integrated Security=True")
            .Options);
        // Stop before any database access, after the context normalizes tour state.
        context.SavingChanges += (_, _) => throw new OperationCanceledException("Test boundary");
        return context;
    }

    [Theory]
    [InlineData(TourStatus.Draft, false, TourVisibility.Hidden)]
    [InlineData(TourStatus.Completed, false, TourVisibility.Public)]
    [InlineData(TourStatus.Completed, true, TourVisibility.Hidden)]
    [InlineData(TourStatus.Draft, true, TourVisibility.Hidden)]
    [InlineData(TourStatus.Deleted, false, TourVisibility.Hidden)]
    public void SaveEnforcesMatrix(TourStatus status, bool isRequest, TourVisibility expected)
    {
        using var context = CreateContext();
        var tour = new Tour { Status = status, Visibility = TourVisibility.Public, IsRequest = isRequest };
        context.Add(tour);
        Assert.Throws<OperationCanceledException>(() => context.SaveChanges());
        Assert.Equal(expected, tour.Visibility);
        Assert.Equal(status == TourStatus.Deleted, tour.IsDeleted);
    }

    [Fact]
    public async Task RepositorySoftDeleteSetsDeletedStatus()
    {
        using var context = CreateContext();
        var tour = new Tour { Id = 1, Status = TourStatus.Completed, Visibility = TourVisibility.Public };
        context.Attach(tour);
        new Repository<Tour>(context).Delete(tour);
        await Assert.ThrowsAsync<OperationCanceledException>(() => context.SaveChangesAsync());
        Assert.Equal(TourStatus.Deleted, tour.Status);
        Assert.Equal(TourVisibility.Hidden, tour.Visibility);
        Assert.True(tour.IsDeleted);
        Assert.NotNull(tour.DeletedAt);
    }

    [Fact]
    public void StorageUsesLowercaseMatrixValues()
    {
        using var context = CreateContext();
        var entity = context.Model.FindEntityType(typeof(Tour))!;
        Assert.Equal("completed", entity.FindProperty(nameof(Tour.Status))!.GetTypeMapping()
            .Converter!.ConvertToProvider(TourStatus.Completed));
        Assert.Equal("hidden", entity.FindProperty(nameof(Tour.Visibility))!.GetTypeMapping()
            .Converter!.ConvertToProvider(TourVisibility.Hidden));
        Assert.Equal(TourVisibility.Hidden, new Tour().Visibility);
    }
}
