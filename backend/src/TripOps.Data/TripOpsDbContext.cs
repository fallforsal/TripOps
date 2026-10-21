using Microsoft.EntityFrameworkCore;

namespace TripOps.Data;

// Infrastructure only: no business entities, DbSet, migrations or automatic DB creation.
public sealed class TripOpsDbContext(DbContextOptions<TripOpsDbContext> options) : DbContext(options);
