# Nearest Fitter Flutter apps

This directory contains two Flutter applications that share the same Dart UI and API client:

- Customer app: fitter directory, map, favorites, ratings, roadside requests, request tracking, community posts, language and theme settings.
- Partner app: private fitter sign-in, online availability, nearby request accept/decline, en-route and completion flow, commission history, and verified replies to car problems.

Set the deployed Next.js URL when building, for example:

```powershell
flutter pub get
flutter build apk --flavor customer --dart-define=API_BASE_URL=https://your-domain.example
flutter build apk --flavor partner --target lib/main_partner.dart --dart-define=API_BASE_URL=https://your-domain.example
flutter build web --dart-define=API_BASE_URL=https://your-domain.example
```

The backend intentionally keeps fitter phone numbers and dashboard credentials private. Configure the backend database and admin secrets from the parent project's `.env.example` before using production data.

A new Flutter project.

## Getting Started

This project is a starting point for a Flutter application.

A few resources to get you started if this is your first Flutter project:

- [Learn Flutter](https://docs.flutter.dev/get-started/learn-flutter)
- [Write your first Flutter app](https://docs.flutter.dev/get-started/codelab)
- [Flutter learning resources](https://docs.flutter.dev/reference/learning-resources)

For help getting started with Flutter development, view the
[online documentation](https://docs.flutter.dev/), which offers tutorials,
samples, guidance on mobile development, and a full API reference.
