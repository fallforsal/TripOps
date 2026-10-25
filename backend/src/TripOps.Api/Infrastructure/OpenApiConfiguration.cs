using System.ComponentModel.DataAnnotations;
using System.Globalization;
using System.Reflection;
using System.Text.Json;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Controllers;
using Microsoft.AspNetCore.OpenApi;
using Microsoft.Extensions.Options;
using Microsoft.OpenApi;

namespace TripOps.Api.Infrastructure;

public static class OpenApiConfiguration
{
    public static IServiceCollection AddTripOpsOpenApi(this IServiceCollection services)
    {
        services.AddOpenApi(options =>
        {
            options.AddDocumentTransformer<AuthenticationDocumentTransformer>();
            options.AddOperationTransformer<EndpointDocumentationTransformer>();
            options.AddSchemaTransformer<RecordValidationSchemaTransformer>();
        });
        return services;
    }
}

internal sealed class AuthenticationDocumentTransformer(
    IAuthenticationSchemeProvider schemes, IOptionsMonitor<CookieAuthenticationOptions> cookies) : IOpenApiDocumentTransformer
{
    public async Task TransformAsync(OpenApiDocument document, OpenApiDocumentTransformerContext context, CancellationToken ct)
    {
        document.Info.Title = "TripOps WF01 & WF02 API";
        document.Info.Version = "v1";
        document.Info.Description = "Development testing for implemented endpoints. Sign in using POST /api/v1/auth/login " +
            "under Authentication; the browser stores the HttpOnly session cookie and sends it on subsequent Try it out requests. " +
            "Use logout before switching Agency/Admin accounts. The current backend does not issue or accept JWT access tokens. " +
            "The Authorize dialog describes the cookie scheme; browsers cannot set an HttpOnly cookie from that dialog.";
        document.Tags ??= new HashSet<OpenApiTag>();
        foreach (var name in new[] { "Authentication", "Partner Management", "Service Management", "Tour Management", "Tour Moderation", "Tour Publishing", "Health" })
            if (!document.Tags.Any(tag => tag.Name == name)) document.Tags.Add(new OpenApiTag { Name = name });
        document.Components ??= new();
        document.Components.SecuritySchemes ??= new Dictionary<string, IOpenApiSecurityScheme>();
        foreach (var scheme in await schemes.GetAllSchemesAsync())
        {
            if (typeof(CookieAuthenticationHandler).IsAssignableFrom(scheme.HandlerType))
                document.Components.SecuritySchemes[scheme.Name] = new OpenApiSecurityScheme {
                    Type = SecuritySchemeType.ApiKey, In = ParameterLocation.Cookie,
                    Name = cookies.Get(scheme.Name).Cookie.Name,
                    Description = "Sign in through POST /api/v1/auth/login. The browser manages this HttpOnly cookie; " +
                        "pasting it into Authorize does not set a browser session." };
        }
    }
}

internal sealed class EndpointDocumentationTransformer : IOpenApiOperationTransformer
{
    public async Task TransformAsync(OpenApiOperation operation, OpenApiOperationTransformerContext context, CancellationToken ct)
    {
        if (context.Description.ActionDescriptor is not ControllerActionDescriptor action) return;
        var tag = action.MethodInfo.GetCustomAttribute<TagsAttribute>() ?? action.ControllerTypeInfo.GetCustomAttribute<TagsAttribute>();
        if (tag != null) operation.Tags = tag.Tags.Select(t => new OpenApiTagReference(t, context.Document)).ToHashSet();
        operation.OperationId = $"{action.ControllerName}_{action.ActionName}";
        operation.Summary ??= action.MethodInfo.GetCustomAttribute<EndpointSummaryAttribute>()?.Summary ?? action.ActionName;
        var metadata = action.EndpointMetadata;
        var authorization = metadata.OfType<IAuthorizeData>().ToArray();
        var protectedEndpoint = authorization.Length > 0 && !metadata.OfType<IAllowAnonymous>().Any();
        operation.Security = [];
        if (protectedEndpoint)
        {
            var provider = context.ApplicationServices.GetRequiredService<IAuthenticationSchemeProvider>();
            var defaultScheme = await provider.GetDefaultAuthenticateSchemeAsync();
            var names = authorization.SelectMany(a => (a.AuthenticationSchemes ?? "").Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)).Distinct().ToArray();
            if (names.Length == 0 && defaultScheme != null) names = [defaultScheme.Name];
            foreach (var name in names)
                operation.Security.Add(new OpenApiSecurityRequirement { [new OpenApiSecuritySchemeReference(name, context.Document)] = [] });
            var roles = authorization.Where(a => !string.IsNullOrWhiteSpace(a.Roles)).Select(a => a.Roles).Distinct();
            operation.Description = string.Join("\n\n", new[] { operation.Description, "Requires an active authenticated session.",
                roles.Any() ? $"Allowed roles: {string.Join("; ", roles)}. Agency business operations also require an approved business profile and resource ownership." : null }.Where(s => s != null));
        }

        var problem = await context.GetOrCreateSchemaAsync(typeof(ProblemDetails), cancellationToken: ct);
        var validation = await context.GetOrCreateSchemaAsync(typeof(ValidationProblemDetails), cancellationToken: ct);
        AddError(400, "Invalid request, route/query value or DTO validation.", validation);
        AddError(500, "Unexpected server error; response includes a safe message and traceId.", problem);
        if (protectedEndpoint) {
            AddError(401, "Missing, expired or invalid session.", problem);
            AddError(403, "Role, current account or business approval does not permit this operation.", problem);
        }
        if (action.ControllerName is "AgencyTours" or "AdminTours" or "TourServices" || action.ActionName == "Get" && action.ControllerName == "Tours")
            AddError(404, "Resource does not exist, is outside ownership, or is not public/eligible.", problem);
        if (action.ControllerName is "AgencyTours" or "AdminTours" or "ItineraryDrafts" && context.Description.HttpMethod != "GET") {
            AddError(409, "Invalid workflow state, stale version or unsupported historical snapshot.", problem);
            AddError(422, "Tour configuration, service eligibility or workflow business validation failed.", problem);
        }
        if (action.ControllerName == "ItineraryDrafts") AddError(503, "AI generation is not configured; manual creation remains available.", problem);
        if (action.ControllerName == "Accounts") {
            if (action.ActionName is "Register" or "Login") AddError(429, "Too many authentication requests.", problem);
            if (action.ActionName == "Register") AddError(409, "Email is already registered.", problem);
            if (action.ActionName == "Login") {
                AddError(401, "Invalid email/password.", problem);
                AddError(403, "Account is inactive or banned.", problem);
            }
        }
        if (action.ControllerName is "PartnerApplications" or "BusinessProfiles") {
            AddError(409, "Application has already been reviewed or cannot be resubmitted.", problem);
            AddError(503, "License storage is not configured.", problem);
        }
        if (action.ControllerName == "BusinessProfiles" && action.ActionName == "Submit") {
            AddError(413, "Multipart request exceeds 6 MB; license file limit is 5 MB.", problem);
            AddError(502, "License storage request failed.", problem);
            AddError(504, "License storage request timed out.", problem);
        }
        TourOpenApiExamples.Apply(operation, action);

        void AddError(int code, string description, OpenApiSchema schema)
        {
            operation.Responses ??= new();
            var content = new Dictionary<string, OpenApiMediaType> { ["application/problem+json"] = new() { Schema = schema } };
            // Existing AccountException middleware writes ProblemDetails as application/json.
            if (action.ControllerName is "Accounts" or "BusinessProfiles" or "PartnerApplications" && code is 400 or 401 or 403 or 409 or 502 or 503 or 504)
                content["application/json"] = new() { Schema = schema };
            operation.Responses.TryAdd(code.ToString(CultureInfo.InvariantCulture), new OpenApiResponse {
                Description = description, Content = content });
        }
    }
}

// MVC validates positional record constructor attributes. The JSON schema exporter
// sees properties instead, so copy those existing constraints without changing DTOs.
internal sealed class RecordValidationSchemaTransformer : IOpenApiSchemaTransformer
{
    public Task TransformAsync(OpenApiSchema schema, OpenApiSchemaTransformerContext context, CancellationToken ct)
    {
        if (schema.Properties == null || context.JsonTypeInfo.Type.Namespace?.StartsWith("TripOps.Service", StringComparison.Ordinal) != true)
            return Task.CompletedTask;
        var constructor = context.JsonTypeInfo.Type.GetConstructors().OrderByDescending(c => c.GetParameters().Length).FirstOrDefault();
        if (constructor == null) return Task.CompletedTask;
        foreach (var parameter in constructor.GetParameters())
        {
            var property = context.JsonTypeInfo.Properties.FirstOrDefault(p => string.Equals(p.Name, parameter.Name, StringComparison.OrdinalIgnoreCase));
            if (property == null || !schema.Properties.TryGetValue(property.Name, out var propertySchema)) continue;
            var attributes = parameter.GetCustomAttributes<ValidationAttribute>().ToArray();
            if (attributes.OfType<RequiredAttribute>().Any()) {
                schema.Required ??= new HashSet<string>(); schema.Required.Add(property.Name);
            }
            if (propertySchema is not OpenApiSchema target) continue;
            foreach (var attribute in attributes)
            {
                switch (attribute) {
                    case StringLengthAttribute length: target.MinLength = length.MinimumLength; target.MaxLength = length.MaximumLength; break;
                    case RangeAttribute range:
                        target.Minimum = Convert.ToString(range.Minimum, CultureInfo.InvariantCulture);
                        target.Maximum = Convert.ToString(range.Maximum, CultureInfo.InvariantCulture); break;
                    case EmailAddressAttribute: target.Format = "email"; break;
                    case AllowedValuesAttribute allowed:
                        target.Enum = allowed.Values.Select(value => JsonSerializer.SerializeToNode(value)!).ToList(); break;
                }
            }
            if (attributes.OfType<RequiredAttribute>().FirstOrDefault() is { } required) {
                target.Type &= ~JsonSchemaType.Null;
                if (!required.AllowEmptyStrings && target.Type == JsonSchemaType.String)
                    target.MinLength = Math.Max(target.MinLength ?? 0, 1);
            }
            if (parameter.Name == "Password") target.Format = "password";
            TourOpenApiExamples.DescribeProperty(context.JsonTypeInfo.Type, parameter.Name!, target);
        }
        return Task.CompletedTask;
    }
}
