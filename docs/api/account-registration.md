# Registration and partner approval

This implementation uses the existing `users` and `business_profiles` tables.
No schema migration, new column, review history or approval note is added.

## Configuration

Run the API with the Development launch profile on port 5080 and Vite on 5173.
Vite proxies `/api` to the API. Keep frontend `VITE_API_BASE_URL` empty for local
development. Production should expose web and `/api` under the same site via
a reverse proxy, using HTTPS. The session uses an HttpOnly, SameSite=Strict
cookie, Secure outside Development, with an eight-hour lifetime. Configure
persistent ASP.NET Data Protection keys when deploying multiple instances.

Configure SQL Server through `ConnectionStrings__TripOps`. Apply the repository's
existing migrations if the database is new; this feature adds no migration.

Cloudinary credentials belong only in the backend environment:

```text
Cloudinary__CloudName
Cloudinary__ApiKey
Cloudinary__ApiSecret
```

Alternatively configure the `Cloudinary:CloudName`, `Cloudinary:ApiKey` and
`Cloudinary:ApiSecret` keys with .NET User Secrets for the API project. The project
has UserSecretsId `TripOps.Api.Local`. Root `.env` is not automatically loaded by
dotnet. Never put the API secret into a frontend VITE variable or tracked JSON.

Uploads use the authenticated Cloudinary image type. `BusinessLicenseUrl` stores
the original secure URL; API responses generate a signed delivery URL for the
owner/admin. Signed links grant access to their holder; keep them confidential.
Only PNG/JPEG up to 5 MB is accepted. File bytes are checked on the server. Each
replacement creates a new asset; previous/unreferenced assets are retained in
Cloudinary and can be cleaned there according to the operator's retention policy.

## Initial admin

There is no public admin registration and no default password. To create a new
admin, set `TRIPOPS_ADMIN_PASSWORD` in the process environment, then run:

```powershell
dotnet run --project backend/src/TripOps.Api --launch-profile http -- --CreateAdmin true --AdminEmail admin@example.com --AdminName Administrator
```

Use a private password of 8-128 characters. Remove the password environment
variable after provisioning. Existing emails are never overwritten or promoted.
The command writes one `users` row and exits without starting an HTTP server.

## Endpoints

| Method | Route under /api/v1 | Access |
|---|---|---|
| POST | /auth/register | Public, rate limited |
| POST | /auth/login | Public, rate limited |
| GET | /auth/me | Active session |
| POST | /auth/logout | Clears session |
| GET | /me/business-profile | Owner |
| POST | /me/business-profile/submit | Agency/Provider owner |
| GET | /admin/partner-applications | Admin |
| POST | /admin/partner-applications/{id}/approve | Admin |
| POST | /admin/partner-applications/{id}/reject | Admin |

Register JSON: `name`, `email`, `password`, `role`, `acceptedTerms`.
Public roles are `user` (stored as Customer), `agency` (TravelAgency), `provider`.
Guide accounts remain managed by Agencies; Google OAuth is not implemented.
Passwords are stored with ASP.NET PasswordHasher, never plaintext.
Registration signs in the new account. Email verification is not implemented;
IsVerified is explicitly false and does not determine business approval.

Profile submission is multipart/form-data: `businessName`, `taxCode`, `phone`,
`businessAddress`, optional `description`, and `license` image. First submission
requires the image. A rejected profile may retain its current image on resubmit.
No client-provided user ID, approval state or arbitrary license URL is accepted.

The first submission inserts a business profile, updates users.Phone and uses
CreatedAt as submission time. Resubmission updates the same profile, preserves
CreatedAt and updates UpdatedAt. Pending/Approved/Suspended profiles cannot be
resubmitted. Partner accounts may log in before approval, with onboarding only.
Approved is required by the frontend dashboard gate. Any future business API
must also check the current database approval status server-side; this feature
does not add tour/service business endpoints.

Admin list accepts `status`, `role`, `search`, `page`, `pageSize` (max 100),
returning `{items,total,page,pageSize}`. Items join users and business_profiles.
Approve updates Pending -> Approved and ApprovedAt; reject requires JSON
`{"reason":"..."}` and sets Rejected, RejectionReason, ApprovedAt=null.
Review uses a conditional database UPDATE so a second reviewer receives 409.

Frontend separation: `contexts/AuthContext.tsx` owns session restoration and
profile refresh; `lib/http.ts` handles transport, cookies, timeouts and
ProblemDetails errors; `services/authService.ts` and `partnerService.ts` own API
calls and mappings; components handle form and presentation state. Authentication
and partner approvals no longer consume mockData. Other features without a
business API still have their existing demo data and are outside this change.

## Validation

`dotnet test backend/TripOps.sln` includes API integration tests with isolated
SQLite and a fake Cloudinary HTTP boundary. These verify persisted registration,
password hashing, session cookies, access control and reject/resubmit/approve.
They do not claim a live Cloudinary upload or SQL Server deployment was tested.
`npm.cmd --prefix frontend run build` checks the production frontend bundle.
Vite build does not perform a full TypeScript check. An additional ad hoc tsc
comparison against the HEAD frontend found 78 current diagnostic groups versus
79 in the original frontend, with no new diagnostic groups. Existing type errors
in unrelated tour, booking and demo modules remain outside this feature.

After configuring SQL Server and Cloudinary, manually check:
1. Register an Agency or Provider and enter the onboarding page.
2. Submit a real PNG/JPEG license, then reload to confirm Pending persists.
3. Sign in as an admin in a separate browser session; find the submitted profile.
4. Open its Cloudinary image, reject with a reason, then resubmit as the partner.
5. Approve as admin; refresh the partner's status to enter its dashboard.
6. Log out and confirm authenticated API requests return 401.

Cloudinary references:
- https://cloudinary.com/documentation/upload_images
- https://cloudinary.com/documentation/delivery_url_signatures
