namespace TripOps.Data.Common;

public interface IBaseEntity<TKey>
{
    TKey Id { get; set; }
}

public abstract class BaseEntity<TKey> : IBaseEntity<TKey>
{
    public TKey Id { get; set; } = default!;
}

public abstract class BaseEntity : BaseEntity<int>
{
}
