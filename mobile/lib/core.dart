import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';
import 'package:geolocator/geolocator.dart';
import 'package:latlong2/latlong.dart';

const apiBase = String.fromEnvironment('API_BASE_URL');
const center = LatLng(35.561, 45.435);
const accent = Color(0xFFFF8A42);
typedef Json = Map<String, dynamic>;

class Api {
  final http.Client client;
  final String baseUrl;
  Api({http.Client? client, String? baseUrl}) : client = client ?? http.Client(), baseUrl = baseUrl ?? (apiBase.isNotEmpty ? apiBase : kIsWeb ? Uri.base.origin : '');
  Future<dynamic> call(String path, {String method = 'GET', Json? body}) async {
    final base = Uri.tryParse(baseUrl);
    if (base == null || !base.hasScheme || !base.hasAuthority) {
      throw Exception('API_BASE_URL is not configured.');
    }
    final request = http.Request(method, base.resolve('/api$path'));
    request.headers.addAll({
      'Content-Type': 'application/json',
      'Origin': base.origin,
    });
    if (body != null) request.body = jsonEncode(body);
    final response = await http.Response.fromStream(
      await client.send(request).timeout(const Duration(seconds: 20)),
    );
    dynamic data;
    try {
      data = jsonDecode(response.body);
    } catch (_) {
      throw Exception(
        'Server response is unavailable (${response.statusCode}).',
      );
    }
    if (response.statusCode >= 400) {
      throw Exception(
        data is Map ? data['error'] ?? 'Request failed' : 'Request failed',
      );
    }
    return data;
  }
}

class AppState extends ChangeNotifier {
  final SharedPreferences prefs;
  final Api api;
  AppState(this.prefs, {Api? api}) : api = api ?? Api();
  String get language => prefs.getString('language') ?? 'ckb';
  ThemeMode get theme => ThemeMode.values[prefs.getInt('theme') ?? 0];
  Set<String> get favorites => (prefs.getStringList('favorites') ?? []).toSet();
  LatLng? location;
  String tr(String ku, String en, [String? ar]) => language == 'en'
      ? en
      : language == 'ar'
      ? ar ?? en
      : ku;
  Future<void> setLanguage(String value) async {
    await prefs.setString('language', value);
    notifyListeners();
  }

  Future<void> setTheme(ThemeMode value) async {
    await prefs.setInt('theme', value.index);
    notifyListeners();
  }

  Future<void> favorite(String id) async {
    final values = favorites;
    values.contains(id) ? values.remove(id) : values.add(id);
    await prefs.setStringList('favorites', values.toList());
    notifyListeners();
  }

  Future<LatLng> locate() async {
    if (!await Geolocator.isLocationServiceEnabled()) {
      throw Exception(
        tr(
          'خزمەتگوزاریی شوێن چالاک بکە',
          'Enable location services',
          'فعّل خدمة الموقع',
        ),
      );
    }
    var permission = await Geolocator.checkPermission();
    if (permission == LocationPermission.denied) {
      permission = await Geolocator.requestPermission();
    }
    if (permission == LocationPermission.denied ||
        permission == LocationPermission.deniedForever) {
      throw Exception(
        tr(
          'ڕێگە بە دەستگەیشتن بە شوێن نەدرا',
          'Location permission denied',
          'تم رفض إذن الموقع',
        ),
      );
    }
    final position = await Geolocator.getCurrentPosition(
      locationSettings: const LocationSettings(
        accuracy: LocationAccuracy.high,
        timeLimit: Duration(seconds: 20),
      ),
    );
    location = LatLng(position.latitude, position.longitude);
    notifyListeners();
    return location!;
  }

  double? distance(Json fitter) => location == null
      ? null
      : const Distance().as(LengthUnit.Kilometer, location!, point(fitter));
}

LatLng point(Json fitter) => LatLng(
  (fitter['latitude'] as num).toDouble(),
  (fitter['longitude'] as num).toDouble(),
);
String errorText(Object error) =>
    error.toString().replaceFirst('Exception: ', '');
void toast(BuildContext context, Object message) => ScaffoldMessenger.of(
  context,
).showSnackBar(SnackBar(content: Text(errorText(message))));
Widget busy() => const Center(
  child: Padding(
    padding: EdgeInsets.all(32),
    child: CircularProgressIndicator(),
  ),
);
Widget empty(String text) => Padding(
  padding: const EdgeInsets.all(32),
  child: Center(child: Text(text, textAlign: TextAlign.center)),
);
Future<void> perform(
  BuildContext context,
  Future<void> Function() action,
) async {
  try {
    await action();
  } catch (e) {
    if (context.mounted) toast(context, e);
  }
}
