namespace TripOps.Service.Tours;

/// <summary>
/// Where a hotel or restaurant option on a tour comes from.
/// PLATFORM_PARTNER = approved service on the marketplace (needs a ServiceId).
/// AGENCY_SUPPLIER  = supplier of the Agency's own network; never has a Platform ServiceId and
/// the platform creates no booking or settlement toward it.
/// </summary>
public static class SupplierSources
{
    public const string PlatformPartner = "PLATFORM_PARTNER";
    public const string AgencySupplier = "AGENCY_SUPPLIER";

    public static string? Normalize(string? value) => string.IsNullOrWhiteSpace(value) ? null : value.Trim().ToUpperInvariant();

    /// <summary>Explicit source wins; legacy rows without one are Platform when a ServiceId exists, otherwise Agency-supplied.</summary>
    public static string Resolve(string? source, int? serviceId) =>
        Normalize(source) ?? (serviceId.HasValue ? PlatformPartner : AgencySupplier);
}

