# Swagger/OpenAPI for WF01 and WF02

Run the API in Development and open http://localhost:5080/swagger. The OpenAPI 3.1 document is at http://localhost:5080/openapi/v1.json; this project does not use `/swagger/v1/swagger.json`. Swagger is available only in Development. It uses the existing Microsoft ASP.NET Core OpenAPI and Swashbuckle Swagger UI packages.

The backend uses the `TripOps.Session` HttpOnly cookie, not JWT. This was confirmed as the intended authentication model. Swagger displays an Authorize control with a cookie security scheme, but the useful browser flow is to execute `POST /api/v1/auth/login` in Swagger, then `GET /api/v1/auth/me`. The browser stores the returned cookie and uses it on subsequent protected requests. Use separate sessions for Agency and Admin. Public Tour list/detail and login/register stay accessible without a session. Authenticated operations carry their security requirements and 401/403 responses in OpenAPI.

Swagger groups the actual controllers into Authentication, Partner Management, Service Management, Tour Management, Tour Publishing, Tour Moderation, and Health. The Tour-specific Admin approval routes were removed. Provider account and Service approval remain part of WF01.

The Tour creation and update operations include realistic Vietnamese request examples. Nullable service IDs mean manual entries; use positive IDs from the approved catalogue when linking a Provider service. `estimatedTime` is a JSON string such as `"08:30:00"`. Continuous hotel stays are entered once on their first itinerary day. See [WF02_TESTING.md](WF02_TESTING.md) for full requests, expected statuses, and the test sequence.

The Development database on `Knaav\SQLEXPRESS`, database `TripOps`, was checked and the three existing EF Core migrations are applied. The earlier SQL Error 207 came from two pending WF02 migrations. Their operations were reviewed and applied without dropping the database or deleting WF01 data. Check future migration status with:

```powershell
dotnet ef migrations list --project backend/src/TripOps.Data --startup-project backend/src/TripOps.Api
```

Inspect `__EFMigrationsHistory` and generate a SQL script before any future update. Do not run schema updates against a different database without checking the effective connection string.
