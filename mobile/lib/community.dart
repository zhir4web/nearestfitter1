import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'core.dart';

class CommunityPage extends StatefulWidget {
  final AppState state;
  final String? fitterCode;
  const CommunityPage({super.key, required this.state, this.fitterCode});
  @override
  State<CommunityPage> createState() => _CommunityPageState();
}

class _CommunityPageState extends State<CommunityPage> {
  AppState get s => widget.state;
  late Future<dynamic> data;
  @override
  void initState() {
    super.initState();
    reload();
  }

  void reload() {
    data = s.api.call('/community');
  }

  @override
  Widget build(BuildContext context) => FutureBuilder(
    future: data,
    builder: (context, snapshot) {
      return RefreshIndicator(
        onRefresh: () async {
          setState(reload);
          await data;
        },
        child: ListView(
          padding: const EdgeInsets.all(20),
          children: [
            Text(
              s.tr(
                'با پێکەوە چارەسەری بکەین',
                'Let’s solve it together',
                'لنحلها معاً',
              ),
              style: Theme.of(context).textTheme.headlineSmall,
            ),
            const SizedBox(height: 12),
            Text(
              s.tr(
                'کێشەی سەیارەکەت بنووسە؛ فیتەرە پشتڕاستکراوەکان وەڵامت دەدەنەوە.',
                'Describe your car problem. Verified fitters can reply.',
                'اكتب مشكلة سيارتك ليرد عليك الفنيون المعتمدون.',
              ),
            ),
            const SizedBox(height: 16),
            if (widget.fitterCode == null)
              FilledButton.icon(
                onPressed: () async {
                  await Navigator.push(
                    context,
                    MaterialPageRoute(builder: (_) => PostForm(state: s)),
                  );
                  if (mounted) setState(reload);
                },
                icon: const Icon(Icons.add),
                label: Text(
                  s.tr('کێشەیەک بنووسە', 'Post a problem', 'أضف مشكلة'),
                ),
              ),
            if (snapshot.hasError)
              Column(
                children: [
                  empty(errorText(snapshot.error!)),
                  TextButton(
                    onPressed: () => setState(reload),
                    child: Text(s.tr('هەوڵدانەوە', 'Retry', 'إعادة المحاولة')),
                  ),
                ],
              )
            else if (!snapshot.hasData)
              busy()
            else ...[
              if ((snapshot.data as List).isEmpty)
                empty(
                  s.tr('هێشتا پۆست نییە', 'No posts yet', 'لا توجد منشورات'),
                ),
              for (final post in snapshot.data as List)
                Card(
                  child: Padding(
                    padding: const EdgeInsets.all(18),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          '${post['title']}',
                          style: Theme.of(context).textTheme.titleLarge,
                        ),
                        const SizedBox(height: 8),
                        Text('${post['car_model']} · ${post['neighborhood']}'),
                        const SizedBox(height: 14),
                        Text('${post['body']}'),
                        const SizedBox(height: 12),
                        Text(
                          '${post['author_name']} · ${post['status']}',
                          style: Theme.of(context).textTheme.bodySmall,
                        ),
                        for (final reply in (post['replies'] as List? ?? []))
                          Container(
                            margin: const EdgeInsets.only(top: 12),
                            padding: const EdgeInsets.all(12),
                            decoration: BoxDecoration(
                              color: accent.withValues(alpha: .08),
                              borderRadius: BorderRadius.circular(14),
                            ),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  '${reply['fitter_name'] ?? ''}',
                                  style: const TextStyle(
                                    fontWeight: FontWeight.bold,
                                  ),
                                ),
                                Text('${reply['body']}'),
                              ],
                            ),
                          ),
                        if (widget.fitterCode != null &&
                            post['status'] == 'open')
                          TextButton.icon(
                            onPressed: () => reply(post['id']),
                            icon: const Icon(Icons.reply),
                            label: Text(s.tr('وەڵام', 'Reply', 'رد')),
                          ),
                      ],
                    ),
                  ),
                ),
            ],
          ],
        ),
      );
    },
  );
  Future<void> reply(String id) async {
    final controller = TextEditingController();
    final value = await showDialog<String>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text(s.tr('وەڵامی فیتەر', 'Fitter reply', 'رد الفني')),
        content: TextField(
          controller: controller,
          maxLength: 1800,
          maxLines: 5,
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: Text(s.tr('داخستن', 'Close', 'إغلاق')),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(ctx, controller.text),
            child: Text(s.tr('ناردن', 'Send', 'إرسال')),
          ),
        ],
      ),
    );
    controller.dispose();
    if (value == null || !mounted) return;
    await perform(context, () async {
      await s.api.call(
        '/community/$id/replies',
        method: 'POST',
        body: {'fitter_code': widget.fitterCode, 'body': value},
      );
      if (mounted) setState(reload);
    });
  }
}

class PostForm extends StatefulWidget {
  final AppState state;
  const PostForm({super.key, required this.state});
  @override
  State<PostForm> createState() => _PostFormState();
}

class _PostFormState extends State<PostForm> {
  final fields = {
    for (final key in [
      'author_name',
      'title',
      'car_model',
      'neighborhood',
      'body',
    ])
      key: TextEditingController(),
  };
  bool saving = false;
  String? validationError;
  @override
  void dispose() {
    for (final c in fields.values) {
      c.dispose();
    }
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final s = widget.state;
    final labels = [
      s.tr('ناو', 'Name', 'الاسم'),
      s.tr('ناونیشانی کێشە', 'Problem title', 'عنوان المشكلة'),
      s.tr('جۆری سەیارە', 'Car model', 'موديل السيارة'),
      s.tr('ناوچە', 'Neighborhood', 'المنطقة'),
      s.tr('وردەکاریی کێشەکە', 'Problem details', 'تفاصيل المشكلة'),
    ];
    return Scaffold(
      appBar: AppBar(
        title: Text(s.tr('پۆستی نوێ', 'New problem', 'مشكلة جديدة')),
      ),
      body: ListView(
        padding: const EdgeInsets.all(20),
        children: [
          for (var i = 0; i < fields.length; i++)
            Padding(
              padding: const EdgeInsets.only(bottom: 14),
              child: TextField(
                controller: fields.values.elementAt(i),
                maxLines: i == 4 ? 5 : 1,
                maxLength: [70, 120, 80, 100, 1800][i],
                decoration: InputDecoration(labelText: labels[i]),
              ),
            ),
          if (validationError != null)
            Padding(
              padding: const EdgeInsets.only(bottom: 12),
              child: Text(
                validationError!,
                style: const TextStyle(
                  color: Colors.redAccent,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ),
          FilledButton(
            onPressed: saving
                ? null
                : () async {
                    final minimums = {
                      'author_name': 2,
                      'title': 4,
                      'car_model': 2,
                      'neighborhood': 2,
                      'body': 10,
                    };
                    final missing = minimums.entries.any(
                      (entry) =>
                          fields[entry.key]!.text.trim().runes.length <
                          entry.value,
                    );
                    if (missing) {
                      setState(
                        () => validationError = s.tr(
                          'تکایە هەموو خانەکان پڕ بکەوە؛ وردەکاریی کێشەکە دەبێت لانیکەم ١٠ پیت بێت.',
                          'Complete every field; the problem details need at least 10 characters.',
                          'أكمل جميع الحقول؛ تفاصيل المشكلة تحتاج 10 أحرف على الأقل.',
                        ),
                      );
                      return;
                    }
                    setState(() => saving = true);
                    try {
                      final prefs = await SharedPreferences.getInstance();
                      final token = prefs.getString('community_owner');
                      final result = await s.api.call(
                        '/community',
                        method: 'POST',
                        body: {
                          for (final e in fields.entries)
                            e.key: e.value.text.trim(),
                          'owner_token': ?token,
                          'website': '',
                        },
                      );
                      await prefs.setString(
                        'community_owner',
                        result['owner_token'],
                      );
                      if (context.mounted) Navigator.pop(context);
                    } catch (e) {
                      if (mounted) {
                        setState(
                          () => validationError = s.tr(
                            'بڵاوکردنەوە سەرکەوتوو نەبوو. تکایە دووبارە هەوڵ بدەوە.',
                            'Publishing did not succeed. Please try again.',
                            'تعذر النشر. حاول مرة أخرى.',
                          ),
                        );
                      }
                    } finally {
                      if (mounted) setState(() => saving = false);
                    }
                  },
            child: Text(s.tr('بڵاوکردنەوە', 'Publish', 'نشر')),
          ),
        ],
      ),
    );
  }
}
