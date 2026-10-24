using Microsoft.EntityFrameworkCore.Storage;

namespace TripOps.Data.Repositories;

public interface IUnitOfWork : IDisposable
{
    TripOpsDbContext Context { get; }
    Task<int> SaveChangesAsync(CancellationToken cancellationToken = default);
    Task<IDbContextTransaction> BeginTransactionAsync(CancellationToken cancellationToken = default);
}
