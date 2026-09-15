import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:nearest_fitter/core.dart';
import 'package:nearest_fitter/main.dart';
import 'package:shared_preferences/shared_preferences.dart';

class TestApi extends Api {
  @override
  Future<dynamic> call(String path, {String method = 'GET', Json? body}) async => <Json>[];
}
void main() {
  testWidgets('Kurdish navigation and theme preferences render without overflow', (tester) async {
    tester.view.physicalSize = const Size(390, 844);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);
    SharedPreferences.setMockInitialValues({});
    final state = AppState(await SharedPreferences.getInstance(), api: TestApi());
    await tester.pumpWidget(FitterApp(state: state));
    await tester.pumpAndSettle();
    expect(find.text('فیتەری خێرا'), findsOneWidget);
    expect(tester.takeException(), isNull);
    await tester.tap(find.byIcon(Icons.settings_outlined));
    await tester.pumpAndSettle();
    expect(find.text('ڕێکخستنەکان'), findsOneWidget);
    await state.setLanguage('en');
    await state.setTheme(ThemeMode.dark);
    await tester.pumpAndSettle();
    expect(find.text('Make it yours'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });
  test('Favorites persist and toggle off', () async {
    SharedPreferences.setMockInitialValues({});
    final state = AppState(await SharedPreferences.getInstance());
    await state.favorite('a');
    expect(state.favorites, {'a'});
    await state.favorite('a');
    expect(state.favorites, isEmpty);
  });
  test('API serializes mutation, Origin and errors', () async {
    final api = Api(baseUrl: 'https://example.test', client: MockClient((request) async {
      expect(request.headers['origin'], 'https://example.test');
      expect(jsonDecode(request.body)['action'], 'cancel');
      return http.Response('{"error":"Already completed"}', 409);
    }));
    expect(api.call('/dispatch/token', method:'POST', body:{'action':'cancel'}), throwsA(isA<Exception>()));
  });
}
