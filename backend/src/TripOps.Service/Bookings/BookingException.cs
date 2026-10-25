namespace TripOps.Service.Bookings;

public sealed class BookingException(int status, string message) : Exception(message)
{
    public int Status { get; } = status;
}
