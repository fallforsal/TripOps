using Microsoft.EntityFrameworkCore.Storage;

namespace TripOps.Data.Repositories;

public class UnitOfWork : IUnitOfWork
{
    private readonly TripOpsDbContext _context;

    public UnitOfWork(TripOpsDbContext context)
    {
        _context = context;
    }

    public TripOpsDbContext Context => _context;

    public async Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        return await _context.SaveChangesAsync(cancellationToken);
    }

    public async Task<IDbContextTransaction> BeginTransactionAsync(CancellationToken cancellationToken = default)
    {
        return await _context.Database.BeginTransactionAsync(cancellationToken);
    }

    public void Dispose()
    {
        _context.Dispose();
        GC.SuppressFinalize(this);
    }
}
