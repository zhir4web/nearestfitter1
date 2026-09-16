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

## Automatic GitHub builds

The repository includes `.github/workflows/flutter-build.yml`. Every change to `mobile/` on the `main` branch checks the Dart code, runs the tests, and builds the Flutter web app. It also builds separate customer and fitter APK files after the public backend address is configured.

In the GitHub repository, open **Settings → Secrets and variables → Actions → Variables**, create a variable named `API_BASE_URL`, and set it to the deployed Next.js address without a trailing slash, for example `https://your-project.vercel.app`.

After a successful run, open **Actions → Build Flutter apps**, select the latest run, and download these artifacts:

- `nearest-fitter-customer-apk`
- `nearest-fitter-partner-apk`
- `nearest-fitter-flutter-web`

GitHub keeps the source and produces installable files. The Next.js API and database still need a public deployment so installed Android apps can work when the development computer is off.

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
