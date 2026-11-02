namespace TripOps.Data.Common;

public interface IBaseEntity<TKey>
{
    TKey Id { get; set; }
    DateTime CreatedAt { get; set; }
    DateTime UpdatedAt { get; set; }
}

public abstract class BaseEntity<TKey> : IBaseEntity<TKey>
{
    public TKey Id { get; set; } = default!;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}

public abstract class BaseEntity : BaseEntity<int>
{
}
