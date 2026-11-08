# TripOps Guide – Flutter architecture

Feature-first modules, deliberately kept lightweight. Refactor only; no backend API changes.

## Structure

```text
guide_mobile_flutter/
├── lib/
│   ├── main.dart
│   ├── app/
│   │   ├── tripops_app.dart
│   │   └── guide_shell.dart
│   ├── core/
│   │   ├── network/api_client.dart
│   │   ├── theme/app_theme.dart
│   │   ├── utils/search_normalizer.dart
│   │   ├── utils/tripops_dates.dart
│   │   └── widgets/view_helpers.dart
│   └── features/
│       ├── auth/
│       │   ├── data/auth_repository.dart
│       │   ├── domain/guide_account.dart
│       │   └── presentation/{guide_entry,login_screen}.dart
│       ├── home/
│       │   ├── domain/home_trip_picker.dart
│       │   └── presentation/home_screen.dart
│       ├── assigned_tours/
│       │   ├── data/guide_repository.dart
│       │   ├── domain/{booking_models,tour_catalog}.dart
│       │   └── presentation/{tour_list_screen,tour_card,tour_detail_screen}.dart
│       ├── attendance/
│       │   ├── domain/attendance_filter.dart
│       │   └── presentation/attendance_screen.dart
│       ├── location_checkin/presentation/location_screen.dart
│       ├── incidents/presentation/incident_screen.dart
│       ├── invitations/presentation/invitation_notice.dart
│       ├── tour_history/presentation/history_screen.dart
│       └── profile/presentation/profile_screen.dart
└── test/
    ├── home_picker_test.dart
    ├── tour_catalog_test.dart
    ├── attendance_filter_test.dart
    ├── booking_contract_test.dart
    └── widget_test.dart
```

## Dependency direction

1. `main` initializes `app/tripops_app`.
2. `app` provides the real repositories and owns tab navigation, loading and navigation actions.
3. `presentation` builds widgets, handles input, and calls feature repository methods.
4. `data` calls the ASP.NET Core API only through `core/network/api_client.dart`.
5. `domain` models and pure functions do not import Flutter widgets or Dio.

A feature may reference another feature's public widget or domain model when completing a use case (e.g., the tour detail opens the attendance screen). Avoid circular imports and do not create a second copy of a model.

## Backend contract preserved

- Auth: `/api/v1/auth/login`, `/api/v1/auth/me`, `/api/v1/auth/logout`.
- Guide: assigned bookings, booking detail, attendance, location check-in, start, complete, incidents.
- Persistent cookie `TripOps.Session`; no JWT, fake API, or new permissions.
- Homepage prefers active tour today (including multi-day `InProgress` via detail `endDate`), otherwise the nearest future tour.

## Migration from old `lib/src/`

| Previous file | New home |
|---|---|
| `src/api.dart` | `core/network/api_client.dart` |
| `src/models.dart` | `features/auth/domain/guide_account.dart`, `features/assigned_tours/domain/booking_models.dart`, `core/utils/tripops_dates.dart` |
| `src/repositories.dart` | `features/auth/data/auth_repository.dart`, `features/assigned_tours/data/guide_repository.dart` |
| `src/home_picker.dart` | `features/home/domain/home_trip_picker.dart` |
| `src/tour_catalog.dart` | `features/assigned_tours/domain/tour_catalog.dart` and `core/utils/search_normalizer.dart` |
| `src/attendance_filter.dart` | `features/attendance/domain/attendance_filter.dart` |
| `src/screens.dart` | `app/guide_shell.dart`, `features/*/presentation/*`, `core/widgets/view_helpers.dart` |

Do not recreate or import old `lib/src/*` paths after this change. Existing Android/iOS scaffolds are untouched.

## Validation

```powershell
flutter pub get
flutter analyze
flutter test
flutter run -d emulator-5554 --dart-define=API_BASE_URL=http://10.0.2.2:5080
```

The refactor was assembled without a local Flutter SDK, so tests and device behavior must be verified by CI and on a developer machine. See README for HTTP debug setup.
