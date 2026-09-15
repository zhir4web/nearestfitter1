import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';
import 'package:url_launcher/url_launcher.dart';
import 'core.dart';
import 'community.dart';
import 'requests.dart';

class CustomerHome extends StatefulWidget {
  final AppState state;
  const CustomerHome({super.key, required this.state});
  @override
  State<CustomerHome> createState() => _CustomerHomeState();
}

class _CustomerHomeState extends State<CustomerHome> {
  AppState get s => widget.state;
  int tab = 0;
  String query = '', type = 'all';
  bool onlyOnline = false;
  late Future<List<Json>> data;
  @override
  void initState() {
    super.initState();
    reload();
  }

  void reload() {
    data = s.api.call('/fitters').then((value) => (value as List).cast<Json>());
  }

  void request([Json? fitter]) => Navigator.push(
    context,
    MaterialPageRoute(
      builder: (_) => RequestPage(state: s, fitter: fitter),
    ),
  );
  @override
  Widget build(BuildContext context) {
    final titles = [
      s.tr('سەرەکی', 'Home', 'الرئيسية'),
      s.tr('نەخشە', 'Map', 'الخريطة'),
      s.tr('کێشەی سەیارە', 'Community', 'مشاكل السيارات'),
      s.tr('دڵخوازەکان', 'Favorites', 'المفضلة'),
      s.tr('ڕێکخستن', 'Settings', 'الإعدادات'),
    ];
    return Scaffold(
      appBar: AppBar(
        title: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                color: accent,
                borderRadius: BorderRadius.circular(12),
              ),
              child: const Icon(Icons.tire_repair, color: Colors.black),
            ),
            const SizedBox(width: 10),
            Expanded(child: Text(s.tr('فیتەری خێرا', 'Nearest Fitter', 'أقرب فني'), maxLines: 1, overflow: TextOverflow.ellipsis)),
          ],
        ),
        actions: [
          IconButton(
            onPressed: () => perform(context, () async {
              await s.locate();
              setState(() {});
            }),
            icon: const Icon(Icons.my_location),
            tooltip: s.tr('شوێنی من', 'My location', 'موقعي'),
          ),
        ],
      ),
      body: tab == 2
          ? CommunityPage(state: s)
          : tab == 4
          ? settings()
          : FutureBuilder<List<Json>>(
              future: data,
              builder: (context, snapshot) {
                if (snapshot.hasError) {
                  return Center(
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        empty(errorText(snapshot.error!)),
                        FilledButton(
                          onPressed: () => setState(reload),
                          child: Text(
                            s.tr('هەوڵدانەوە', 'Retry', 'إعادة المحاولة'),
                          ),
                        ),
                      ],
                    ),
                  );
                }
                if (!snapshot.hasData) return busy();
                final fitters = snapshot.data!
                    .where(
                      (f) =>
                          (tab != 3 || s.favorites.contains(f['id'])) &&
                          (type == 'all' || f['type'] == type) &&
                          (!onlyOnline || f['is_online'] == true) &&
                          ('${f['name']} ${f['neighborhood']} ${(f['services'] as List).join(' ')}'
                              .toLowerCase()
                              .contains(query.toLowerCase())),
                    )
                    .toList();
                if (s.location != null) {
                  fitters.sort(
                    (a, b) => s.distance(a)!.compareTo(s.distance(b)!),
                  );
                }
                if (tab == 1) {
                  return MapPanel(state: s, fitters: fitters, onSelect: detail);
                }
                return RefreshIndicator(
                  onRefresh: () async {
                    setState(reload);
                    await data;
                  },
                  child: ListView(
                    padding: const EdgeInsets.all(20),
                    children: [
                      if (tab == 0) ...[
                        Container(
                          padding: const EdgeInsets.all(24),
                          decoration: BoxDecoration(
                            borderRadius: BorderRadius.circular(28),
                            gradient: const LinearGradient(
                              colors: [Color(0xFF263D40), Color(0xFF15252F)],
                            ),
                          ),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                s.tr(
                                  'لە ڕێگادا تەنها نیت',
                                  'Back on the road, together.',
                                  'لست وحدك على الطريق',
                                ),
                                style: const TextStyle(
                                  color: Colors.white,
                                  fontSize: 29,
                                  fontWeight: FontWeight.w800,
                                ),
                              ),
                              const SizedBox(height: 12),
                              Text(
                                s.tr(
                                  'فیتەری نزیک بدۆزەوە، یان داوای یارمەتی بکە.',
                                  'Find a nearby expert or request roadside help.',
                                  'اعثر على فني قريب أو اطلب المساعدة.',
                                ),
                                style: const TextStyle(
                                  color: Color(0xFFD1DCE0),
                                  height: 1.8,
                                ),
                              ),
                              const SizedBox(height: 22),
                              FilledButton.icon(
                                onPressed: request,
                                icon: const Icon(Icons.bolt),
                                label: Text(
                                  s.tr(
                                    'داوای یارمەتی',
                                    'Request help',
                                    'طلب المساعدة',
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ),
                        const SizedBox(height: 22),
                      ],
                      Text(
                        titles[tab == 3 ? 3 : 0],
                        style: Theme.of(context).textTheme.headlineSmall,
                      ),
                      const SizedBox(height: 14),
                      TextField(
                        onChanged: (value) => setState(() => query = value),
                        decoration: InputDecoration(
                          prefixIcon: const Icon(Icons.search),
                          hintText: s.tr(
                            'گەڕان بە ناو و ناوچە',
                            'Search name or neighborhood',
                            'البحث بالاسم أو المنطقة',
                          ),
                        ),
                      ),
                      const SizedBox(height: 12),
                      Wrap(
                        spacing: 8,
                        children: [
                          for (final item in [
                            ('all', s.tr('هەموو', 'All', 'الكل')),
                            ('fixed', s.tr('دوکان', 'Workshop', 'ورشة')),
                            ('mobile', s.tr('گەڕۆک', 'Mobile', 'متنقل')),
                          ])
                            ChoiceChip(
                              label: Text(item.$2),
                              selected: type == item.$1,
                              onSelected: (_) => setState(() => type = item.$1),
                            ),
                          FilterChip(
                            label: Text(s.tr('ئۆنلاین', 'Online', 'متصل')),
                            selected: onlyOnline,
                            onSelected: (v) => setState(() => onlyOnline = v),
                          ),
                        ],
                      ),
                      const SizedBox(height: 12),
                      if (fitters.isEmpty)
                        empty(
                          s.tr(
                            'هیچ فیتەرێک نەدۆزرایەوە',
                            'No fitters found',
                            'لم يتم العثور على فني',
                          ),
                        ),
                      for (final f in fitters)
                        Card(
                          child: InkWell(
                            borderRadius: BorderRadius.circular(22),
                            onTap: () => detail(f),
                            child: Padding(
                              padding: const EdgeInsets.all(18),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Row(
                                    children: [
                                      CircleAvatar(
                                        backgroundColor: accent.withValues(
                                          alpha: .15,
                                        ),
                                        child: Icon(
                                          f['type'] == 'mobile'
                                              ? Icons.local_shipping_outlined
                                              : Icons.storefront,
                                          color: accent,
                                        ),
                                      ),
                                      const SizedBox(width: 12),
                                      Expanded(
                                        child: Text(
                                          '${f['name']}',
                                          style: const TextStyle(
                                            fontSize: 18,
                                            fontWeight: FontWeight.bold,
                                          ),
                                        ),
                                      ),
                                      IconButton(
                                        onPressed: () async {
                                          await s.favorite(f['id']);
                                          setState(() {});
                                        },
                                        icon: Icon(
                                          s.favorites.contains(f['id'])
                                              ? Icons.favorite
                                              : Icons.favorite_border,
                                          color: accent,
                                        ),
                                      ),
                                    ],
                                  ),
                                  const SizedBox(height: 10),
                                  Text('${f['neighborhood']}'),
                                  const SizedBox(height: 12),
                                  Wrap(
                                    spacing: 12,
                                    children: [
                                      Text(
                                        '★ ${f['rating'] ?? 0} (${f['review_count'] ?? 0})',
                                      ),
                                      if (s.distance(f) != null)
                                        Text(
                                          '${s.distance(f)!.toStringAsFixed(1)} km',
                                        ),
                                      Text(
                                        f['is_busy'] == true
                                            ? s.tr('سەرقاڵ', 'Busy', 'مشغول')
                                            : f['is_online'] == true
                                            ? s.tr(
                                                'بەردەستە',
                                                'Available',
                                                'متاح',
                                              )
                                            : s.tr(
                                                'ئۆفلاین',
                                                'Offline',
                                                'غير متصل',
                                              ),
                                        style: TextStyle(
                                          color: f['is_online'] == true
                                              ? Colors.teal
                                              : Colors.grey,
                                        ),
                                      ),
                                      if (f['demo'] == true)
                                        Text(s.tr('نموونە', 'Demo', 'تجريبي')),
                                    ],
                                  ),
                                  const SizedBox(height: 8),
                                  Text(
                                    (f['services'] as List)
                                        .map((v) => service('$v'))
                                        .join(' • '),
                                    style: Theme.of(
                                      context,
                                    ).textTheme.bodySmall,
                                  ),
                                ],
                              ),
                            ),
                          ),
                        ),
                    ],
                  ),
                );
              },
            ),
      bottomNavigationBar: NavigationBar(
        selectedIndex: tab,
        onDestinationSelected: (value) => setState(() => tab = value),
        destinations: [
          for (var i = 0; i < titles.length; i++)
            NavigationDestination(
              icon: Icon(
                [
                  Icons.home_outlined,
                  Icons.map_outlined,
                  Icons.forum_outlined,
                  Icons.favorite_border,
                  Icons.settings_outlined,
                ][i],
              ),
              label: titles[i],
            ),
        ],
      ),
    );
  }

  String service(String key) => switch (key) {
    'puncture' => s.tr('پەنچەگیری', 'Puncture repair', 'إصلاح ثقب'),
    'change' => s.tr('گۆڕینی تایە', 'Tire change', 'تبديل الإطار'),
    'balance' => s.tr('باڵانس', 'Balancing', 'موازنة'),
    'alignment' => s.tr('ڕێکخستنی ویڵ', 'Alignment', 'محاذاة'),
    'sales' => s.tr('فرۆشتنی تایە', 'Tire sales', 'بيع الإطارات'),
    'roadside' => s.tr('یارمەتی ڕێگا', 'Roadside', 'مساعدة الطريق'),
    _ => key,
  };
  void detail(Json f) => Navigator.push(
    context,
    MaterialPageRoute(
      builder: (_) => FitterDetail(state: s, fitter: f),
    ),
  );
  Widget settings() => ListView(
    padding: const EdgeInsets.all(20),
    children: [
      Text(
        s.tr('ڕێکخستنەکان', 'Make it yours', 'الإعدادات'),
        style: Theme.of(context).textTheme.headlineMedium,
      ),
      const SizedBox(height: 24),
      Card(
        child: Column(
          children: [
            ListTile(
              leading: const Icon(Icons.language),
              title: Text(s.tr('زمان', 'Language', 'اللغة')),
              trailing: DropdownButton<String>(
                value: s.language,
                items: const [
                  DropdownMenuItem(value: 'ckb', child: Text('کوردی')),
                  DropdownMenuItem(value: 'en', child: Text('English')),
                  DropdownMenuItem(value: 'ar', child: Text('العربية')),
                ],
                onChanged: (v) => s.setLanguage(v!),
              ),
            ),
            ListTile(
              leading: const Icon(Icons.brightness_6),
              title: Text(s.tr('ڕووکار', 'Appearance', 'المظهر')),
              trailing: DropdownButton<ThemeMode>(
                value: s.theme,
                items: [
                  DropdownMenuItem(
                    value: ThemeMode.system,
                    child: Text(s.tr('سیستەم', 'System', 'النظام')),
                  ),
                  DropdownMenuItem(
                    value: ThemeMode.dark,
                    child: Text(s.tr('تاریک', 'Dark', 'داكن')),
                  ),
                  DropdownMenuItem(
                    value: ThemeMode.light,
                    child: Text(s.tr('ڕووناک', 'Light', 'فاتح')),
                  ),
                ],
                onChanged: (v) => s.setTheme(v!),
              ),
            ),
          ],
        ),
      ),
      Card(
        child: Column(
          children: [
            ListTile(
              leading: const Icon(Icons.info_outline),
              title: Text(s.tr('دەربارەی ئێمە', 'About', 'حول التطبيق')),
              subtitle: Text(
                s.tr(
                  'فیتەری خێرا، پەیوەندییەکی ئاسان لە نێوان شۆفێر و فیتەرەکانی سلێمانی.',
                  'Nearest Fitter connects drivers with fitters in Sulaymaniyah.',
                  'أقرب فني يربط السائقين بالفنيين في السليمانية.',
                ),
              ),
            ),
            ListTile(
              leading: const Icon(Icons.privacy_tip_outlined),
              title: Text(s.tr('تایبەتمەندی', 'Privacy', 'الخصوصية')),
              subtitle: Text(
                s.tr(
                  'شوێن تەنها بە ڕەزامەندی تۆ و بۆ داواکاریی یارمەتی بەکاردێت. ژمارەی فیتەر گشتی نییە.',
                  'Location is requested with your permission for finding help. Fitter phone numbers are private.',
                  'يُستخدم الموقع بإذنك لطلب المساعدة. أرقام الفنيين خاصة.',
                ),
              ),
            ),
          ],
        ),
      ),
      if (s.prefs.getString('active_request') != null)
        ListTile(
          leading: const Icon(Icons.route),
          title: Text(s.tr('دوایین داواکاری', 'Last request', 'آخر طلب')),
          onTap: () => Navigator.push(
            context,
            MaterialPageRoute(
              builder: (_) => RequestStatus(
                state: s,
                token: s.prefs.getString('active_request')!,
              ),
            ),
          ),
        ),
    ],
  );
}

class MapPanel extends StatelessWidget {
  final AppState state;
  final List<Json> fitters;
  final void Function(Json)? onSelect;
  final LatLng? picked;
  final void Function(LatLng)? onPick;
  const MapPanel({
    super.key,
    required this.state,
    this.fitters = const [],
    this.onSelect,
    this.picked,
    this.onPick,
  });
  @override
  Widget build(BuildContext context) => FlutterMap(
    options: MapOptions(
      initialCenter: picked ?? state.location ?? center,
      initialZoom: 12,
      onTap: (_, point) => onPick?.call(point),
    ),
    children: [
      TileLayer(
        urlTemplate: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
        userAgentPackageName: 'com.nearestfitter.app',
      ),
      MarkerLayer(
        markers: [
          for (final f in fitters)
            Marker(
              point: point(f),
              width: 48,
              height: 48,
              child: IconButton(
                onPressed: () => onSelect?.call(f),
                icon: Icon(
                  f['type'] == 'mobile'
                      ? Icons.local_shipping
                      : Icons.location_on,
                  color: f['is_online'] == true ? Colors.teal : accent,
                  size: 36,
                ),
              ),
            ),
          if (picked ?? state.location case final LatLng position)
            Marker(
              point: position,
              child: const Icon(
                Icons.my_location,
                color: Colors.blue,
                size: 32,
              ),
            ),
        ],
      ),
      RichAttributionWidget(
        attributions: [
          TextSourceAttribution(
            'OpenStreetMap contributors',
            onTap: () =>
                launchUrl(Uri.parse('https://www.openstreetmap.org/copyright')),
          ),
        ],
      ),
    ],
  );
}

class FitterDetail extends StatelessWidget {
  final AppState state;
  final Json fitter;
  const FitterDetail({super.key, required this.state, required this.fitter});
  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(title: Text('${fitter['name']}')),
    body: ListView(
      padding: const EdgeInsets.all(20),
      children: [
        SizedBox(
          height: 240,
          child: ClipRRect(
            borderRadius: BorderRadius.circular(24),
            child: MapPanel(
              state: state,
              fitters: [fitter],
              picked: point(fitter),
            ),
          ),
        ),
        const SizedBox(height: 20),
        Text(
          '${fitter['neighborhood']}',
          style: Theme.of(context).textTheme.headlineSmall,
        ),
        const SizedBox(height: 18),
        FilledButton.icon(
          onPressed: () => Navigator.push(
            context,
            MaterialPageRoute(
              builder: (_) => RequestPage(state: state, fitter: fitter),
            ),
          ),
          icon: const Icon(Icons.bolt),
          label: Text(
            state.tr('داوای یارمەتی', 'Request help', 'طلب المساعدة'),
          ),
        ),
        const SizedBox(height: 12),
        OutlinedButton.icon(
          onPressed: () => perform(context, () async {
            final uri = Uri.https('www.google.com', '/maps/dir/', {
              'api': '1',
              'destination': '${fitter['latitude']},${fitter['longitude']}',
            });
            if (!await launchUrl(uri, mode: LaunchMode.externalApplication)) {
              throw Exception('Unable to open directions');
            }
          }),
          icon: const Icon(Icons.directions),
          label: Text(state.tr('ڕێگاکە', 'Directions', 'الاتجاهات')),
        ),
        const SizedBox(height: 24),
        Text(
          state.tr('هەڵسەنگاندنەکان', 'Reviews', 'التقييمات'),
          style: Theme.of(context).textTheme.titleLarge,
        ),
        FutureBuilder(
          future: state.api.call('/reviews/${fitter['id']}'),
          builder: (context, snapshot) {
            if (snapshot.hasError) return empty(errorText(snapshot.error!));
            if (!snapshot.hasData) return busy();
            final reviews = snapshot.data as List;
            return Column(
              children: [
                if (reviews.isEmpty)
                  empty(
                    state.tr(
                      'هێشتا هەڵسەنگاندن نییە',
                      'No reviews yet',
                      'لا توجد تقييمات',
                    ),
                  ),
                for (final r in reviews)
                  Card(
                    child: ListTile(
                      title: Text('${r['reviewer_name']} · ${r['rating']} ★'),
                      subtitle: Text('${r['comment']}'),
                    ),
                  ),
              ],
            );
          },
        ),
        OutlinedButton(
          onPressed: () => Navigator.push(
            context,
            MaterialPageRoute(
              builder: (_) => ReviewPage(state: state, id: fitter['id']),
            ),
          ),
          child: Text(
            state.tr('هەڵسەنگاندن بنووسە', 'Write a review', 'اكتب تقييماً'),
          ),
        ),
      ],
    ),
  );
}

class ReviewPage extends StatefulWidget {
  final AppState state;
  final String id;
  const ReviewPage({super.key, required this.state, required this.id});
  @override
  State<ReviewPage> createState() => _ReviewPageState();
}

class _ReviewPageState extends State<ReviewPage> {
  final name = TextEditingController(), comment = TextEditingController();
  int rating = 5;
  bool saving = false;
  @override
  void dispose() {
    name.dispose();
    comment.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(
      title: Text(widget.state.tr('هەڵسەنگاندن', 'Review', 'تقييم')),
    ),
    body: ListView(
      padding: const EdgeInsets.all(20),
      children: [
        TextField(
          controller: name,
          maxLength: 70,
          decoration: InputDecoration(
            labelText: widget.state.tr('ناو', 'Name', 'الاسم'),
          ),
        ),
        Row(
          children: [
            for (var i = 1; i <= 5; i++)
              IconButton(
                onPressed: () => setState(() => rating = i),
                icon: Icon(
                  i <= rating ? Icons.star : Icons.star_border,
                  color: accent,
                ),
              ),
          ],
        ),
        TextField(
          controller: comment,
          maxLength: 1000,
          maxLines: 5,
          decoration: InputDecoration(
            labelText: widget.state.tr(
              'ئەزموونی تۆ',
              'Your experience',
              'تجربتك',
            ),
          ),
        ),
        const SizedBox(height: 16),
        FilledButton(
          onPressed: saving
              ? null
              : () async {
                  setState(() => saving = true);
                  try {
                    await widget.state.api.call(
                      '/reviews/${widget.id}',
                      method: 'POST',
                      body: {
                        'reviewer_name': name.text.trim(),
                        'rating': rating,
                        'comment': comment.text.trim(),
                        'website': '',
                      },
                    );
                    if (context.mounted) {
                      toast(
                        context,
                        widget.state.tr(
                          'نێردرا بۆ پێداچوونەوە',
                          'Submitted for moderation',
                          'أرسل للمراجعة',
                        ),
                      );
                      Navigator.pop(context);
                    }
                  } catch (e) {
                    if (context.mounted) toast(context, e);
                  } finally {
                    if (mounted) setState(() => saving = false);
                  }
                },
          child: Text(widget.state.tr('ناردن', 'Submit', 'إرسال')),
        ),
      ],
    ),
  );
}
