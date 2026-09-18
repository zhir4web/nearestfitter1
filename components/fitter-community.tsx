'use client';

import { useCallback, useEffect, useState } from 'react';
import { CheckCircle2, MessageCircle, Send } from 'lucide-react';
import type { CommunityPost } from '@/types/community';
import { useLanguage } from './language';

export function FitterCommunity({ fitterCode }: { fitterCode: string }) {
  const { lang } = useLanguage();
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [replyFor, setReplyFor] = useState<string>();
  const [reply, setReply] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const load = useCallback(async () => {
    try {
      const response = await fetch('/api/community', { cache: 'no-store' });
      if (!response.ok) throw new Error();
      setPosts((await response.json()) as CommunityPost[]);
      setError('');
    } catch {
      setError(
        lang === 'en'
          ? 'Questions could not be loaded.'
          : lang === 'ar'
            ? 'تعذر تحميل الأسئلة.'
            : 'کێشەکان بار نەکران.',
      );
    } finally {
      setLoading(false);
    }
  }, [lang]);

  useEffect(() => {
    void load();
  }, [load]);

  async function send(postId: string) {
    if (reply.trim().length < 10) return;
    setBusy(true);
    setError('');
    try {
      const response = await fetch(`/api/community/${postId}/replies`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fitter_code: fitterCode, body: reply }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Unable to reply.');
      setReply('');
      setReplyFor(undefined);
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to reply.');
    } finally {
      setBusy(false);
    }
  }

  const text =
    lang === 'en'
      ? {
          eyebrow: 'Community questions',
          title: 'Help drivers with a useful answer',
          intro:
            'Read public car problems and reply as your verified fitter profile. Publishing new questions stays in the customer app.',
          open: 'Open',
          resolved: 'Resolved',
          replies: 'replies',
          answer: 'Reply',
          placeholder: 'Write a clear, practical answer',
          send: 'Send reply',
          empty: 'There are no questions yet.',
        }
      : lang === 'ar'
        ? {
            eyebrow: 'أسئلة المجتمع',
            title: 'ساعد السائقين بإجابة مفيدة',
            intro:
              'اقرأ مشاكل السيارات العامة وأجب بحساب الفني الموثق. نشر الأسئلة الجديدة متاح للعملاء فقط.',
            open: 'مفتوح',
            resolved: 'تم الحل',
            replies: 'ردود',
            answer: 'الرد',
            placeholder: 'اكتب إجابة واضحة وعملية',
            send: 'إرسال الرد',
            empty: 'لا توجد أسئلة حالياً.',
          }
        : {
            eyebrow: 'پرسیارەکانی کۆمەڵگە',
            title: 'بە وەڵامێکی بەسوود یارمەتی شۆفێرەکان بدە',
            intro:
              'کێشە گشتییەکانی سەیارە بخوێنەوە و بە پرۆفایلی پشتڕاستکراوی فیتەر وەڵام بدەرەوە. بڵاوکردنەوەی پرسیاری نوێ تەنها بۆ کڕیارە.',
            open: 'کراوە',
            resolved: 'چارەسەرکراوە',
            replies: 'وەڵام',
            answer: 'وەڵام بدەرەوە',
            placeholder: 'وەڵامێکی ڕوون و کرداری بنووسە',
            send: 'وەڵام بنێرە',
            empty: 'ئێستا هیچ پرسیارێک نییە.',
          };

  return (
    <section
      className="nf-shell nf-fitter-community"
      aria-labelledby="fitter-community-title"
    >
      <div className="nf-section-heading">
        <div>
          <span className="nf-eyebrow">
            <MessageCircle size={14} />
            {text.eyebrow}
          </span>
          <h2 id="fitter-community-title">{text.title}</h2>
          <p>{text.intro}</p>
        </div>
      </div>
      {error && (
        <p className="nf-inline-error" role="alert">
          {error}
        </p>
      )}
      {loading ? (
        <div className="nf-community-loading">
          <span />
          <span />
        </div>
      ) : posts.length ? (
        <div className="nf-fitter-community-list">
          {posts.map((post) => (
            <article className={`nf-post-card ${post.status}`} key={post.id}>
              <div className="nf-post-meta">
                <span className={`nf-post-status ${post.status}`}>
                  <i />
                  {post.status === 'resolved' ? text.resolved : text.open}
                </span>
                <time dateTime={post.created_at}>
                  {new Date(post.created_at).toLocaleDateString(
                    lang === 'en' ? 'en-GB' : 'ar-IQ',
                  )}
                </time>
              </div>
              <h3>{post.title}</h3>
              <p className="nf-post-car">
                {post.car_model} <span>·</span> {post.neighborhood}
              </p>
              <p className="nf-post-body">{post.body}</p>
              {post.replies.length > 0 && (
                <div className="nf-reply-list">
                  {post.replies.map((item) => (
                    <div className="nf-reply" key={item.id}>
                      <span className={`nf-reply-icon ${item.fitter_type}`}>
                        {item.fitter_type === 'mobile' ? '↗' : '⌂'}
                      </span>
                      <div>
                        <div className="nf-reply-head">
                          <strong>{item.fitter_name}</strong>
                        </div>
                        <p>{item.body}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <div className="nf-post-actions">
                <span>
                  <MessageCircle size={14} />
                  {post.replies.length} {text.replies}
                </span>
                {post.status === 'open' && (
                  <button
                    type="button"
                    onClick={() => {
                      setReplyFor(replyFor === post.id ? undefined : post.id);
                      setReply('');
                    }}
                  >
                    {text.answer}
                  </button>
                )}
              </div>
              {replyFor === post.id && (
                <div className="nf-reply-composer">
                  <textarea
                    aria-label={text.placeholder}
                    value={reply}
                    onChange={(event) => setReply(event.target.value)}
                    placeholder={text.placeholder}
                    minLength={10}
                    maxLength={1200}
                    rows={3}
                  />
                  <button
                    type="button"
                    className="nf-button primary small"
                    onClick={() => void send(post.id)}
                    disabled={busy || reply.trim().length < 10}
                  >
                    <Send size={14} />
                    {text.send}
                  </button>
                </div>
              )}
            </article>
          ))}
        </div>
      ) : (
        <div className="nf-empty">
          <CheckCircle2 size={24} />
          <p>{text.empty}</p>
        </div>
      )}
    </section>
  );
}
