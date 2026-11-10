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
flutter create --project-name tripops_guide --org com.tripops --platforms android .
flutter pub get
flutter analyze
flutter test
flutter devices
flutter run -d emulator-5554 --dart-define=API_BASE_URL=http://10.0.2.2:5080
```

The `flutter create` command generates **new** Android platform files using the Flutter SDK installed on your computer; avoid `--overwrite` so the app source is kept. The `emulator-5554` ID is an example: use the ID from `flutter devices`. On macOS you can additionally run `flutter create --platforms ios .` when Xcode is available. If using iOS simulator on the same Mac as API, use `http://127.0.0.1:5080`. A physical phone needs the backend's LAN IP, its firewall open and the server bound to the reachable interface. Production **must** use HTTPS.

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

The project uses feature-first organization, with API/storage and UI utilities in `core/`. The original `lib/src/` files were removed, so imports must use these paths.

```text
lib/
  main.dart                        # Entry point only
  app/
    tripops_app.dart               # MaterialApp / dependencies
    guide_shell.dart               # Bottom navigation / refresh
  core/
    network/api_client.dart        # Dio and session cookie
    theme/app_theme.dart
    utils/tripops_dates.dart
    utils/search_normalizer.dart
    widgets/view_helpers.dart
  features/
    auth/{data,domain,presentation}/
    home/{domain,presentation}/
    assigned_tours/{data,domain,presentation}/
    attendance/{domain,presentation}/
    location_checkin/presentation/
    incidents/presentation/
    invitations/presentation/
    tour_history/presentation/
    profile/presentation/
test/
  home_picker_test.dart
  tour_catalog_test.dart
  attendance_filter_test.dart
  booking_contract_test.dart
  widget_test.dart
```

### Architecture rules

- `app/` wires dependencies and owns tab navigation; avoid business models here.
- `core/network/` owns HTTP transport/cookies. Feature repositories call the API via `TripOpsApi`.
- Each `features/<name>/domain/` owns its models or pure selection/filter logic.
- Each `features/<name>/data/` owns the real backend repository; do not call Dio from widgets.
- Each `features/<name>/presentation/` owns only UI and user actions.
- Cross-feature UI references are allowed for tour detail actions; do not copy DTO parsing into screens.
- The project does not yet need a separate repository interface per feature; add abstractions when multiple implementations or tests require them.

See `ARCHITECTURE.md` for the complete directory map and migration notes.

## Verification status

Static review against the develop-branch controller, service, DTO and authentication source. Flutter SDK, Android toolchain and a running backend are not available in the authoring environment, so `flutter analyze`, `flutter test` and device integration must be run locally or in CI before merging.


## Milestone 2 — operational usability

- **Assigned tours:** search by tour name, booking code or customer name; filter Upcoming (Confirmed/Paid, start today or later), In progress, Completed or All. Search is accent-insensitive for Vietnamese.
- **Attendance:** search by passenger name/phone; filter Pending, CheckedIn or Absent, with an overall check-in progress indicator. Inactive passengers are hidden.
- **Incident reporting:** display the incident history returned in `BookingDto.incidents` above the new report form.
- **Authentication:** when list or detail requests return HTTP 401, clear the cached session and return to login. A generic network error does not erase a valid cookie.
- **Tests:** `home_picker_test.dart`, `tour_catalog_test.dart`, `attendance_filter_test.dart`, `booking_contract_test.dart`, `widget_test.dart`.

Commands to verify on your Windows machine (in `guide_mobile_flutter`):

```powershell
git pull origin feat/guide-flutter-clean-20261108
flutter pub get
flutter analyze
flutter test
flutter run -d emulator-5554 --dart-define=API_BASE_URL=http://10.0.2.2:5080
```

Manual checks: navigate to **Tour**, search `da lat` when there is an assigned `Đà Lạt` tour, change status filters, open a tour, use attendance search/chips, inspect the existing incidents above the incident form, and verify refresh after saving. No mock bookings are added by this milestone.

**Known behavior:** Location and attendance forms currently rely on backend enforcement for operational authorization and status transitions. Guide invitation accept/decline and incident image uploads still require real backend APIs. The guide booking list currently has no API-side search/status filter, so this milestone filters the fully paginated assigned bookings client-side. A production release still requires device integration, TLS and manual end-to-end verification.


## Milestone 3 — prototype visual alignment

The Flutter UI is styled after `TripOps_TourGuide_Mobile_Prototype_v2.html` / the TripOps Guide mobile screenboard:

- Consistent **navy + teal + soft blue-gray** palette in `lib/core/theme/app_theme.dart`.
- Shared design components in `lib/core/widgets/guide_ui.dart`: gradient tour hero, section title, metric, action tile, status pill, information banner and empty state.
- Home: greeting, gradient tour hero for **today's tour** or **nearest upcoming tour**, statistics backed by real assigned bookings, tour preview and action shortcuts.
- Tour list: search, rounded filter chips, date / guest cards and localized status labels.
- Tour detail: gradient heading, operational summary, action shortcuts and day-by-day itinerary.
- Attendance: summary counters, progress indicator, passenger cards and server-backed status actions.
- Location check-in: day-grouped stops, status badges and existing backend check-in dialog.
- Incident report: incident history, typed report form and server-backed submission.
- Profile, login, history, bottom navigation: consistent typography, card spacing and color.

**Data policy:** No fake counts, placeholder photos, GPS verification, photo-upload success, invitation acceptance or fabricated backend data. Tour data remains sourced from the ASP.NET Core API. The design uses an illustrated gradient instead of stock images.

**Verification:** `flutter analyze`, `flutter test`, and Android debug build run on GitHub Actions. Check final CI status before merging. Use an Android emulator to evaluate accessibility, small-screen wrapping, keyboard input, and operational flows against a working TripOps backend.


## Attendance: departure day only

The backend now enforces that **passenger attendance can be changed only when the
booking's `startDate` equals the current backend UTC calendar date**, consistent
with the existing Guide start-tour policy. Earlier or later requests return
HTTP 409 and do not change attendance, `checkedBy` or `checkedAt`.

`GET /api/v1/guide/bookings/{id}` now includes the backward-compatible
`canRecordAttendance` boolean. The app uses this server-authoritative value
to disable "Có mặt", "Vắng mặt" and "Đặt lại: Chưa rõ" outside departure day
and shows an explanation with the scheduled date. HDVs can still view prior
attendance statuses. Older backend versions omit this field, so the app
**fails closed** (disables attendance) until the backend update is deployed.

The value is a snapshot of the time when the detail was fetched. Reopen
or refresh the tour details after crossing midnight. The server always
re-checks on write, even if a screen remains open past midnight.

**Timezone caveat:** Existing backend rules use UTC for operational booking
calendar checks; `00:00 UTC` is `07:00 Vietnam time`. If the product
requires the entire local Vietnamese departure day, change the shared
backend calendar policy across start-tour and attendance together, rather
than letting mobile and backend disagree.
