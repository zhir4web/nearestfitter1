import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'core.dart';
import 'customer.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  runApp(FitterApp(state: AppState(await SharedPreferences.getInstance())));
}

class FitterApp extends StatelessWidget {
  final AppState state;
  final Widget? home;
  const FitterApp({super.key, required this.state, this.home});
  @override
  Widget build(BuildContext context) => ListenableBuilder(
    listenable: state,
    builder: (context, _) {
      ThemeData theme(Brightness brightness) => ThemeData(
        useMaterial3: true,
        fontFamily: 'NRT',
        fontFamilyFallback: const ['Noto Naskh Arabic', 'Arial'],
        brightness: brightness,
        colorScheme: ColorScheme.fromSeed(
          seedColor: accent,
          brightness: brightness,
          primary: accent,
        ),
        scaffoldBackgroundColor: brightness == Brightness.dark
            ? const Color(0xFF0E151C)
            : const Color(0xFFF6F4F0),
        cardTheme: CardThemeData(
          elevation: 0,
          margin: const EdgeInsets.symmetric(vertical: 7),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(22),
          ),
        ),
        inputDecorationTheme: InputDecorationTheme(
          filled: true,
          border: OutlineInputBorder(
            borderRadius: BorderRadius.circular(16),
            borderSide: BorderSide.none,
          ),
        ),
        filledButtonTheme: FilledButtonThemeData(
          style: FilledButton.styleFrom(
            minimumSize: const Size(48, 50),
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(15),
            ),
          ),
        ),
      );
      return MaterialApp(
        debugShowCheckedModeBanner: false,
        title: 'Nearest Fitter',
        theme: theme(Brightness.light),
        darkTheme: theme(Brightness.dark),
        themeMode: state.theme,
        locale: Locale(state.language == 'ckb' ? 'ar' : state.language),
        supportedLocales: const [Locale('ar'), Locale('en')],
        localizationsDelegates: GlobalMaterialLocalizations.delegates,
        builder: (context, child) => Directionality(
          textDirection: state.language == 'en'
              ? TextDirection.ltr
              : TextDirection.rtl,
          child: child!,
        ),
        home: home ?? CustomerHome(state: state),
      );
    },
  );
}
