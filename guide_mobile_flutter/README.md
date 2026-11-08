# TripOps Guide — clean Flutter project

A **new, standalone** Flutter project for Tour Guides. The old `mobile/` directory is not reused or changed. This project talks to the real TripOps ASP.NET Core API on branch `develop`; no mock success responses or invented invitations API.

## Prerequisites

- Flutter stable + Dart (see `flutter doctor`).
- Backend TripOps running with a real SQL Server database and a guide account created by an Agency.
- Android emulator, iOS simulator or physical Android/iOS device.

### First-time setup — regenerate clean platform scaffolding

This repository intentionally tracks the app source separately from any previously broken platform scaffold. Generate Android/iOS folders afresh using Flutter's own templates:

```bash
cd guide_mobile_flutter
flutter create --project-name tripops_guide --org com.tripops --platforms android,ios .
flutter pub get
flutter analyze
flutter test
flutter run --dart-define=API_BASE_URL=http://10.0.2.2:5080
```

The `flutter create` command uses the Flutter SDK installed on **your computer**; avoid `--overwrite` so the app source is kept. If using iOS simulator on the same Mac as API, use `http://127.0.0.1:5080`. A physical phone needs the backend's LAN IP, its firewall open and the server bound to the reachable interface. Production **must** use HTTPS.

### Android local HTTP

Only for development, after generating Android files, configure `android/app/src/debug/AndroidManifest.xml`:

```xml
<manifest xmlns:android="http://schemas.android.com/apk/res/android">
  <application android:usesCleartextTraffic="true" />
</manifest>
```

Do not enable cleartext in the release manifest. iOS ATS restrictions likewise require an explicit development-only configuration if testing via HTTP.

## Contracts implemented

- `POST /api/v1/auth/login`, `GET /api/v1/auth/me`, `POST /api/v1/auth/logout`.
- `GET /api/v1/guide/bookings?page=N&pageSize=100` (all pages, backend returns `BookingPage<BookingListItem>`).
- `GET /api/v1/guide/bookings/{id}` (`BookingDto` with `participants`, `snapshotDays`, `incidents`, `endDate`).
- `POST /api/v1/guide/bookings/{id}/start` and `/complete`.
- `POST /api/v1/guide/bookings/{id}/attendance` (`participantId`, `status`).
- `POST /api/v1/guide/bookings/{id}/locations/{locationId}/check-in` (`status`, `note`).
- `POST /api/v1/guide/bookings/{id}/incidents` (`incidentType`, `title`, `description`, `severity`).

The server issues an eight-hour HttpOnly **TripOps.Session cookie**, not JWT. Dio + a persistent CookieJar handle it; no Bearer token is invented. Session cookies remain in the app's private support directory. Logging must never expose cookies, credentials or passenger identity.

### Important backend limitations

- **No Guide Accept/Decline Invitation endpoint** found on develop. The invitation view is explanatory, with no fake action.
- Location check-in records a status/note; **GPS proof is not validated by the current endpoint**.
- Incident evidence/photo upload is not implemented in this contract.
- `BookingListItem` has `startDate` but no `endDate`; when resolving a multi-day `InProgress` tour, the app obtains `BookingDto.endDate` from the detail API.
- The backend checks tour start against `DateTime.UtcNow.Date`; confirm local-date policy with backend if crossing midnight in Vietnam becomes an issue.
- Empty results, 401/403/409/422, connectivity issues, and incomplete pagination are surfaced rather than shown as success.

## Folder layout

```
lib/
  main.dart
  src/
    api.dart
    models.dart
    repositories.dart
    home_picker.dart
    screens.dart
test/
  home_picker_test.dart
```

## Verification status

Static review against the develop-branch controller, service, DTO and authentication source. Flutter SDK, Android toolchain and a running backend are not available in the authoring environment, so `flutter analyze`, `flutter test` and device integration must be run locally or in CI before merging.
