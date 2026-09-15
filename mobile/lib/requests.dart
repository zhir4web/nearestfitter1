import 'dart:async';
import 'package:flutter/material.dart';
import 'package:latlong2/latlong.dart';
import 'core.dart';
import 'customer.dart';

class RequestPage extends StatefulWidget {
  final AppState state;
  final Json? fitter;
  const RequestPage({super.key, required this.state, this.fitter});
  @override
  State<RequestPage> createState() => _RequestPageState();
}

class _RequestPageState extends State<RequestPage> {
  final phone = TextEditingController(), note = TextEditingController();
  LatLng? selected;
  bool saving = false;
  AppState get s => widget.state;
  @override
  void initState() {
    super.initState();
    selected = s.location;
  }

  @override
  void dispose() {
    phone.dispose();
    note.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(
      title: Text(s.tr('داوای یارمەتی', 'Request roadside help', 'طلب مساعدة')),
    ),
    body: ListView(
      padding: const EdgeInsets.all(20),
      children: [
        Text(
          widget.fitter?['name'] ??
              s.tr(
                'نزیکترین فیتەری بەردەست',
                'Nearest available fitter',
                'أقرب فني متاح',
              ),
          style: Theme.of(context).textTheme.headlineSmall,
        ),
        const SizedBox(height: 12),
        Text(
          s.tr(
            'شوێنەکەت لەسەر نەخشە دیاری بکە.',
            'Tap the map to select your location.',
            'حدد موقعك على الخريطة.',
          ),
        ),
        const SizedBox(height: 12),
        SizedBox(
          height: 280,
          child: ClipRRect(
            borderRadius: BorderRadius.circular(24),
            child: MapPanel(
              state: s,
              picked: selected,
              onPick: (point) => setState(() => selected = point),
            ),
          ),
        ),
        TextButton.icon(
          onPressed: () => perform(context, () async {
            final point = await s.locate();
            if (mounted) setState(() => selected = point);
          }),
          icon: const Icon(Icons.my_location),
          label: Text(s.tr('شوێنی ئێستام', 'Use my location', 'استخدام موقعي')),
        ),
        if (selected != null)
          Text(
            '${selected!.latitude.toStringAsFixed(5)}, ${selected!.longitude.toStringAsFixed(5)}',
            textDirection: TextDirection.ltr,
          ),
        const SizedBox(height: 14),
        TextField(
          controller: phone,
          keyboardType: TextInputType.phone,
          decoration: InputDecoration(
            labelText: s.tr('ژمارەی تۆ', 'Your phone number', 'رقم هاتفك'),
          ),
        ),
        const SizedBox(height: 14),
        TextField(
          controller: note,
          maxLength: 500,
          maxLines: 3,
          decoration: InputDecoration(
            labelText: s.tr(
              'کێشەکە و نیشانەی شوێن',
              'Problem and location details',
              'المشكلة وتفاصيل الموقع',
            ),
          ),
        ),
        const SizedBox(height: 16),
        FilledButton.icon(
          onPressed: saving || selected == null ? null : submit,
          icon: const Icon(Icons.send),
          label: Text(
            saving
                ? s.tr('دەنێردرێت…', 'Sending…', 'جار الإرسال…')
                : s.tr('ناردنی داواکاری', 'Send request', 'إرسال الطلب'),
          ),
        ),
      ],
    ),
  );
  Future<void> submit() async {
    if (!RegExp(r'^\+?[0-9 ()-]{7,22}$').hasMatch(phone.text.trim())) {
      toast(
        context,
        s.tr(
          'ژمارەی دروست بنووسە',
          'Enter a valid phone number',
          'أدخل رقماً صحيحاً',
        ),
      );
      return;
    }
    setState(() => saving = true);
    try {
      final result = await s.api.call(
        '/dispatch',
        method: 'POST',
        body: {
          'user_lat': selected!.latitude,
          'user_lng': selected!.longitude,
          'user_phone': phone.text.trim(),
          'user_note': note.text.trim(),
          if (widget.fitter != null) 'fitter_id': widget.fitter!['id'],
        },
      );
      final token = result['user_token'] as String;
      await s.prefs.setString('active_request', token);
      if (mounted) {
        Navigator.pushReplacement(
          context,
          MaterialPageRoute(
            builder: (_) => RequestStatus(state: s, token: token),
          ),
        );
      }
    } catch (e) {
      if (mounted) toast(context, e);
    } finally {
      if (mounted) setState(() => saving = false);
    }
  }
}

class RequestStatus extends StatefulWidget {
  final AppState state;
  final String token;
  const RequestStatus({super.key, required this.state, required this.token});
  @override
  State<RequestStatus> createState() => _RequestStatusState();
}

class _RequestStatusState extends State<RequestStatus> {
  Timer? timer;
  Json? request;
  String? error;
  bool loading = false, acting = false;
  AppState get s => widget.state;
  @override
  void initState() {
    super.initState();
    poll();
    timer = Timer.periodic(const Duration(seconds: 5), (_) => poll());
  }

  @override
  void dispose() {
    timer?.cancel();
    super.dispose();
  }

  Future<void> poll() async {
    if (loading) return;
    loading = true;
    try {
      final result = await s.api.call('/dispatch/${widget.token}') as Json;
      if (mounted) {
        setState(() {
          request = result;
          error = null;
        });
      }
      if (['completed', 'cancelled'].contains(result['status'])) {
        timer?.cancel();
      }
    } catch (e) {
      if (mounted) setState(() => error = errorText(e));
    } finally {
      loading = false;
    }
  }

  String label(String status) => switch (status) {
    'pending' => s.tr(
      'چاوەڕێی قبوڵکردنی فیتەر',
      'Waiting for a fitter',
      'بانتظار قبول الفني',
    ),
    'accepted' => s.tr('فیتەر قبوڵی کرد', 'Fitter accepted', 'قبل الفني الطلب'),
    'en_route' => s.tr(
      'فیتەر لە ڕێگادایە',
      'Fitter is on the way',
      'الفني في الطريق',
    ),
    'completed' => s.tr('تەواو کرا', 'Completed', 'مكتمل'),
    'cancelled' => s.tr('هەڵوەشایەوە', 'Cancelled', 'ملغي'),
    'expired' => s.tr(
      'کاتی چاوەڕوانی تەواو بوو',
      'Request expired',
      'انتهت مهلة الطلب',
    ),
    'declined' => s.tr(
      'فیتەر قبوڵی نەکرد',
      'Fitter declined',
      'رفض الفني الطلب',
    ),
    _ => status,
  };
  Future<void> action(bool reassign) async {
    setState(() => acting = true);
    try {
      final result = await s.api.call(
        reassign ? '/dispatch/reassign' : '/dispatch/${widget.token}',
        method: 'POST',
        body: reassign ? {'user_token': widget.token} : {'action': 'cancel'},
      );
      if (reassign &&
          result['user_token'] != null &&
          result['user_token'] != widget.token) {
        await s.prefs.setString('active_request', result['user_token']);
        if (mounted) {
          Navigator.pushReplacement(
            context,
            MaterialPageRoute(
              builder: (_) =>
                  RequestStatus(state: s, token: result['user_token']),
            ),
          );
        }
      } else {
        await poll();
      }
    } catch (e) {
      if (mounted) toast(context, e);
    } finally {
      if (mounted) setState(() => acting = false);
    }
  }

  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(title: Text(s.tr('داواکاریی تۆ', 'Your request', 'طلبك'))),
    body: request == null
        ? Center(
            child: error == null
                ? busy()
                : Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      empty(error!),
                      FilledButton(
                        onPressed: poll,
                        child: Text(
                          s.tr('هەوڵدانەوە', 'Retry', 'إعادة المحاولة'),
                        ),
                      ),
                    ],
                  ),
          )
        : ListView(
            padding: const EdgeInsets.all(24),
            children: [
              const Icon(Icons.route, size: 72, color: accent),
              const SizedBox(height: 24),
              Text(
                label(request!['status']),
                textAlign: TextAlign.center,
                style: Theme.of(context).textTheme.headlineSmall,
              ),
              const SizedBox(height: 16),
              if (error != null) Text(error!),
              if (request!['fitter_name'] != null)
                Text('${request!['fitter_name']}', textAlign: TextAlign.center),
              const SizedBox(height: 20),
              if (request!['user_lat'] is num)
                SizedBox(
                  height: 260,
                  child: MapPanel(
                    state: s,
                    picked: LatLng(
                      (request!['user_lat'] as num).toDouble(),
                      (request!['user_lng'] as num).toDouble(),
                    ),
                  ),
                ),
              const SizedBox(height: 24),
              if (['expired', 'declined'].contains(request!['status']))
                FilledButton(
                  onPressed: acting ? null : () => action(true),
                  child: Text(
                    s.tr(
                      'گەڕان بۆ فیتەرێکی تر',
                      'Find another fitter',
                      'البحث عن فني آخر',
                    ),
                  ),
                ),
              if (!['completed', 'cancelled'].contains(request!['status']))
                OutlinedButton(
                  onPressed: acting ? null : () => action(false),
                  child: Text(
                    s.tr('هەڵوەشاندنەوە', 'Cancel request', 'إلغاء الطلب'),
                  ),
                ),
            ],
          ),
  );
}
