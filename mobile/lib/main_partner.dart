import 'dart:async';
import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:url_launcher/url_launcher.dart';
import 'core.dart';
import 'main.dart' show FitterApp;
import 'community.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  final state = AppState(await SharedPreferences.getInstance());
  runApp(
    FitterApp(
      state: state,
      home: PartnerHome(state: state),
    ),
  );
}

class PartnerHome extends StatefulWidget {
  final AppState state;
  const PartnerHome({super.key, required this.state});
  @override
  State<PartnerHome> createState() => _PartnerHomeState();
}

class _PartnerHomeState extends State<PartnerHome> with WidgetsBindingObserver {
  final input = TextEditingController(), price = TextEditingController();
  Timer? timer;
  String? code, error;
  Json? data;
  bool working = false, polling = false, online = false;
  AppState get s => widget.state;
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    restore();
  }

  Future<void> restore() async {
    final prefs = await SharedPreferences.getInstance();
    code = prefs.getString('fitter_code');
    if (mounted) setState(() {});
    if (code != null) start();
  }

  void start() {
    poll();
    timer?.cancel();
    timer = Timer.periodic(const Duration(seconds: 10), (_) => poll());
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    timer?.cancel();
    input.dispose();
    price.dispose();
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed && code != null) {
      start();
    } else if (state == AppLifecycleState.paused) {
      timer?.cancel();
    }
  }

  Future<void> poll() async {
    if (polling || code == null) return;
    polling = true;
    try {
      final result = await s.api.call('/fitter/dashboard/$code') as Json;
      if (mounted) {
        final oldReq = data?['request'];
        final newReq = result['request'];
        if (newReq != null && newReq['status'] == 'pending' && (oldReq == null || oldReq['id'] != newReq['id'])) {
          _showNotificationDialog();
        }
        setState(() {
          data = result;
          error = null;
          online = result['fitter']['is_online'] == true;
        });
      }
      if (online) await heartbeat();
    } catch (e) {
      if (mounted) setState(() => error = errorText(e));
    } finally {
      polling = false;
    }
  }

  void _showNotificationDialog() {
    showDialog(
      context: context,
      builder: (_) => AlertDialog(
        title: Text(s.tr('داواکاری نوێ!', 'New Request!', 'طلب جديد!')),
        content: Text(s.tr('کڕیارێک داوای یارمەتی دەکات. تکایە زوو وەڵام بدەرەوە.', 'A customer is requesting help. Please respond quickly.', 'عميل يطلب المساعدة. يرجى الرد بسرعة.')),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: Text(s.tr('باشە', 'OK', 'حسناً')),
          )
        ],
      ),
    );
  }

  Future<void> heartbeat() async {
    final position = data?['fitter']['fitter_type'] == 'mobile'
        ? await s.locate()
        : null;
    await s.api.call(
      '/fitter/location',
      method: 'POST',
      body: {
        'fitter_code': code,
        'is_online': true,
        if (position != null) 'lat': position.latitude,
        if (position != null) 'lng': position.longitude,
      },
    );
  }

  Future<void> toggle(bool value) async {
    setState(() => working = true);
    try {
      if (value) {
        await heartbeat();
      } else {
        await s.api.call(
          '/fitter/location',
          method: 'POST',
          body: {'fitter_code': code, 'is_online': false},
        );
      }
      await poll();
    } catch (e) {
      if (mounted) toast(context, e);
    } finally {
      if (mounted) setState(() => working = false);
    }
  }

  Future<void> act(String action) async {
    final request = data?['request'];
    if (request == null) return;
    setState(() => working = true);
    try {
      await s.api.call(
        '/dispatch/${action == 'decline' ? 'decline' : 'accept'}/${request['fitter_token']}',
        method: 'POST',
        body: {
          'fitter_code': code,
          'action': action,
        },
      );
      await poll();
    } catch (e) {
      if (mounted) toast(context, e);
    } finally {
      if (mounted) setState(() => working = false);
    }
  }

  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(
      title: Text(
        s.tr(
          'فیتەری خێرا · هاوبەش',
          'Nearest Fitter · Partner',
          'أقرب فني · الشريك',
        ),
      ),
      actions: [
        if (code != null)
          IconButton(
            tooltip: s.tr('چوونەدەرەوە', 'Sign out', 'خروج'),
            onPressed: working
                ? null
                : () async {
                    try {
                      await s.api.call(
                        '/fitter/location',
                        method: 'POST',
                        body: {'fitter_code': code, 'is_online': false},
                      );
                    } catch (e) {
                      if (context.mounted) toast(context, e);
                      return;
                    }
                    final prefs = await SharedPreferences.getInstance();
                    await prefs.remove('fitter_code');
                    timer?.cancel();
                    if (mounted) {
                      setState(() {
                        code = null;
                        data = null;
                        online = false;
                      });
                    }
                  },
            icon: const Icon(Icons.logout),
          ),
      ],
    ),
    body: code == null
        ? ListView(
            padding: const EdgeInsets.all(24),
            children: [
              const SizedBox(height: 36),
              const Icon(Icons.handyman, size: 72, color: accent),
              const SizedBox(height: 24),
              Text(
                s.tr(
                  'بەخێربێیتەوە، هاوبەش',
                  'Welcome back, partner',
                  'مرحباً بعودتك',
                ),
                style: Theme.of(context).textTheme.headlineMedium,
              ),
              const SizedBox(height: 18),
              Text(
                s.tr(
                  'کۆدی تایبەتی لە ئەدمین وەربگرە.',
                  'Use the private access code provided by your administrator.',
                  'استخدم رمز الدخول الخاص الذي يوفره المسؤول.',
                ),
              ),
              const SizedBox(height: 20),
              TextField(
                controller: input,
                obscureText: true,
                autocorrect: false,
                decoration: InputDecoration(
                  labelText: s.tr('کۆدی تایبەت', 'Private code', 'الرمز الخاص'),
                ),
              ),
              const SizedBox(height: 20),
              FilledButton(
                onPressed: working
                    ? null
                    : () async {
                        final value = input.text.trim();
                        if (value.length < 4 || value.length > 50) {
                          toast(
                            context,
                            s.tr(
                              'کۆدەکە دروست نییە',
                              'Invalid code',
                              'رمز غير صالح',
                            ),
                          );
                          return;
                        }
                        setState(() => working = true);
                        try {
                          await s.api.call('/fitter/dashboard/$value');
                          final prefs = await SharedPreferences.getInstance();
                          await prefs.setString('fitter_code', value);
                          if (mounted) setState(() => code = value);
                          start();
                        } catch (e) {
                          if (context.mounted) toast(context, e);
                        } finally {
                          if (mounted) setState(() => working = false);
                        }
                      },
                child: Text(s.tr('چوونەژوورەوە', 'Sign in', 'دخول')),
              ),
            ],
          )
        : data == null
        ? Center(
            child: error == null
                ? busy()
                : Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      empty(error!),
                      TextButton(
                        onPressed: poll,
                        child: Text(
                          s.tr('هەوڵدانەوە', 'Retry', 'إعادة المحاولة'),
                        ),
                      ),
                    ],
                  ),
          )
        : ListView(
            padding: const EdgeInsets.all(20),
            children: [
              Text(
                '${data!['fitter']['fitter_name'] ?? ''}',
                style: Theme.of(context).textTheme.headlineMedium,
              ),
              SwitchListTile(
                value: online,
                onChanged: working ? null : toggle,
                title: Text(
                  s.tr(
                    'بەردەستی بۆ داواکاری',
                    'Available for requests',
                    'متاح للطلبات',
                  ),
                ),
                subtitle: Text(
                  s.tr(
                    'بۆ وەرگرتنی داواکاری ئەپەکە کراوە بهێڵەوە.',
                    'Keep this app open to receive requests.',
                    'أبق التطبيق مفتوحاً لاستقبال الطلبات.',
                  ),
                ),
              ),
              if (error != null) Text(error!),
              if (data!['request'] != null)
                job(data!['request'])
              else
                Card(
                  child: empty(
                    s.tr(
                      'ئێستا داواکارییەکی چالاک نییە',
                      'No active requests',
                      'لا توجد طلبات نشطة',
                    ),
                  ),
                ),
              const SizedBox(height: 16),
              Text(
                s.tr('مێژووی کارەکان', 'Recent jobs', 'الأعمال الأخيرة'),
                style: Theme.of(context).textTheme.titleLarge,
              ),
              for (final j in data!['jobs'] as List? ?? [])
                Card(
                  child: ListTile(
                    title: Text('${j['status']}'),
                    subtitle: Text('${j['created_at']}'),
                    trailing: Text(
                      '${j['final_price_iqd'] ?? 0} IQD\n${s.tr('کۆمیشن', 'Commission', 'العمولة')}: ${j['commission_iqd'] ?? 0}',
                    ),
                  ),
                ),
              const SizedBox(height: 16),
              OutlinedButton.icon(
                onPressed: () => Navigator.push(
                  context,
                  MaterialPageRoute(
                    builder: (_) => Scaffold(
                      appBar: AppBar(
                        title: Text(
                          s.tr(
                            'کێشەی سەیارەکان',
                            'Car problems',
                            'مشاكل السيارات',
                          ),
                        ),
                      ),
                      body: CommunityPage(state: s, fitterCode: code),
                    ),
                  ),
                ),
                icon: const Icon(Icons.forum_outlined),
                label: Text(
                  s.tr(
                    'وەڵامی کێشەکان بدەوە',
                    'Answer car problems',
                    'الرد على المشاكل',
                  ),
                ),
              ),
            ],
          ),
  );
  Widget job(Json request) => Card(
    child: Padding(
      padding: const EdgeInsets.all(20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            s.tr('داواکاریی یارمەتی', 'Help request', 'طلب مساعدة'),
            style: Theme.of(context).textTheme.titleLarge,
          ),
          const SizedBox(height: 10),
          Text('${request['user_note']}'),
          Text('${request['status']}'),
          const SizedBox(height: 12),
          if (request['status'] == 'pending')
            Wrap(
              spacing: 10,
              children: [
                FilledButton(
                  onPressed: working ? null : () => act('accept'),
                  child: Text(s.tr('قبوڵکردن', 'Accept', 'قبول')),
                ),
                OutlinedButton(
                  onPressed: working ? null : () => act('decline'),
                  child: Text(s.tr('ڕەتکردنەوە', 'Decline', 'رفض')),
                ),
              ],
            ),
          if (['accepted', 'en_route'].contains(request['status'])) ...[
            OutlinedButton.icon(
              onPressed: () => perform(context, () async {
                if (!await launchUrl(
                  Uri.https('www.google.com', '/maps/dir/', {
                    'api': '1',
                    'destination':
                        '${request['user_lat']},${request['user_lng']}',
                  }),
                  mode: LaunchMode.externalApplication,
                )) {
                  throw Exception('Unable to open directions');
                }
              }),
              icon: const Icon(Icons.directions),
              label: Text(
                s.tr(
                  'ڕێگای کڕیار',
                  'Customer directions',
                  'الاتجاهات إلى العميل',
                ),
              ),
            ),
            if (request['user_phone'] != null)
              OutlinedButton.icon(
                onPressed: () => launchUrl(Uri.parse('tel:${request['user_phone']}')),
                icon: const Icon(Icons.call),
                label: Text(
                  s.tr('پەیوەندی بە کڕیار', 'Call customer', 'اتصل بالعميل'),
                ),
              ),
            if (request['status'] == 'accepted')
              FilledButton(
                onPressed: working ? null : () => act('en_route'),
                child: Text(
                  s.tr('لە ڕێگادام', 'I am on my way', 'أنا في الطريق'),
                ),
              ),
            const SizedBox(height: 16),
            FilledButton(
              onPressed: working ? null : () => act('complete'),
              child: Text(
                s.tr('تەواوکردنی کار', 'Complete job', 'إكمال العمل'),
              ),
            ),
          ],
        ],
      ),
    ),
  );
}
