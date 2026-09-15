'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import {
  ShieldCheck,
  Plus,
  LogOut,
  Check,
  Trash2,
  Pencil,
  Wallet,
  RotateCw,
  Search,
  Users,
  BriefcaseBusiness,
  ClipboardList,
  Settings,
  Star,
  Mail,
  MessageSquare,
  Copy,
  X,
  Download,
} from 'lucide-react';
import { FitterForm } from './fitter-form';
import type { Fitter, Review, Contact } from '@/types';
import type { CommunityPost } from '@/types/community';
import type { AccountSummary, AccountDetail } from '@/types/accounts';
import './admin.css';

type Job = {
  id: string;
  fitter_id: string;
  status: string;
  created_at: string;
  accepted_at?: string | null;
  commission_iqd?: number | null;
  commission_status?: string;
};
type Data = {
  fitters: Fitter[];
  reviews: Review[];
  contacts: Contact[];
  dispatches: Job[];
  settings: { commission_fixed_iqd: number };
  accounts: AccountSummary[];
  community: CommunityPost[];
};
const empty: Data = {
  fitters: [],
  reviews: [],
  contacts: [],
  dispatches: [],
  accounts: [],
  community: [],
  settings: { commission_fixed_iqd: 0 },
};
const zero = (id: string): AccountSummary => ({
  fitter_id: id,
  accepted_count: 0,
  completed_count: 0,
  current_count: 0,
  outstanding_iqd: 0,
  settled_iqd: 0,
  total_iqd: 0,
  last_accepted_at: null,
});
const statuses: Record<string, string> = {
  pending: 'چاوەڕوان',
  accepted: 'قبوڵکراو',
  en_route: 'لە ڕێگایە',
  completed: 'تەواوکراو',
  cancelled: 'هەڵوەشاوە',
  expired: 'بەسەرچوو',
  declined: 'ڕەتکراوە',
  reassigning: 'گواستنەوە',
  approved: 'پەسەندکراو',
  due: 'حساب نەکراوە',
  settled: 'تسویەکراو',
  none: '—',
};
const tabs = [
  { id: 'fitters', label: 'فیتەرەکان', icon: Users },
  { id: 'accounts', label: 'حسابات', icon: Wallet },
  { id: 'jobs', label: 'داواکارییەکان', icon: ClipboardList },
  { id: 'reviews', label: 'هەڵسەنگاندن', icon: Star },
  { id: 'contacts', label: 'نامەکان', icon: Mail },
  { id: 'community', label: 'کێشەی سەیارە', icon: MessageSquare },
  { id: 'settings', label: 'ڕێکخستن', icon: Settings },
];
async function api<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, { cache: 'no-store', ...options });
  const body = await response.json();
  if (!response.ok)
    throw new Error(body.error || 'نەتوانرا داواکارییەکە جێبەجێ بکرێت.');
  return body as T;
}
const post = (body: unknown, method = 'POST'): RequestInit => ({
  method,
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
});
const number = (n: number) => n.toLocaleString('en-GB');
const money = (n: number) => `${number(n)} دینار`;
const date = (s?: string | null) =>
  s
    ? new Date(s).toLocaleString('en-GB', {
        dateStyle: 'medium',
        timeStyle: 'short',
      })
    : '—';
const badge = (status: string) => (
  <span className={'ad-badge ' + status}>{statuses[status] || status}</span>
);
const emptyState = (text = 'هیچ تۆمارێک نییە.') => (
  <div className="ad-empty">
    <ClipboardList size={32} />
    <h3>{text}</h3>
    <p>تۆمارە نوێیەکان لێرە پیشان دەدرێن.</p>
  </div>
);

export function Admin() {
  const [auth, setAuth] = useState(false),
    [loading, setLoading] = useState(true),
    [refreshing, setRefreshing] = useState(false);
  const [data, setData] = useState<Data>(empty),
    [error, setError] = useState(''),
    [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false),
    [tab, setTab] = useState('fitters'),
    [search, setSearch] = useState(''),
    [filter, setFilter] = useState('all');
  const [edit, setEdit] = useState<Fitter | 'new'>(),
    [dashCode, setDashCode] = useState<string>();
  const [deletion, setDeletion] = useState<{
    table: 'fitters' | 'reviews' | 'contacts' | 'community';
    id: string;
  }>();
  const [fee, setFee] = useState('0');
  const feeDirty = useRef(false),
    loadingRef = useRef(false);
  const [updated, setUpdated] = useState<string>(),
    [selected, setSelected] = useState<string>(),
    [detail, setDetail] = useState<AccountDetail>();
  const [detailLoading, setDetailLoading] = useState(false);
  const [settlement, setSettlement] = useState<{
      fitter: Fitter;
      account: AccountSummary;
      id: string;
    }>(),
    [note, setNote] = useState('');
  const account = (id: string) =>
    data.accounts.find((a) => a.fitter_id === id) || zero(id);
  async function load(initial = false) {
    if (loadingRef.current) return;
    loadingRef.current = true;
    setRefreshing(true);
    try {
      const session = await api<{ authenticated: boolean }>(
        '/api/admin/session',
      );
      setAuth(session.authenticated);
      if (session.authenticated) {
        const value = await api<Data>('/api/admin/data');
        setData(value);
        if (!feeDirty.current)
          setFee(String(value.settings.commission_fixed_iqd));
        setUpdated(new Date().toISOString());
      } else {
        setData(empty);
        setEdit(undefined);
        setSelected(undefined);
        setDetail(undefined);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'هەڵەی بارکردن');
    } finally {
      if (initial) setLoading(false);
      setRefreshing(false);
      loadingRef.current = false;
    }
  }
  useEffect(() => {
    void Promise.resolve().then(() => load(true));
    const timer = setInterval(() => {
      if (!document.hidden) void load();
    }, 15000);
    return () => clearInterval(timer);
  }, []);
  useEffect(() => {
    if (!selected || !auth) return;
    let cancelled = false;
    void Promise.resolve().then(async () => {
      if (cancelled) return;
      setDetailLoading(true);
      setDetail(undefined);
      try {
        const value = await api<AccountDetail>(
          '/api/admin/accounts?fitter_id=' + encodeURIComponent(selected),
        );
        if (!cancelled) setDetail(value);
      } catch (e) {
        if (!cancelled)
          setError(e instanceof Error ? e.message : 'هەڵەی بارکردن');
      } finally {
        if (!cancelled) setDetailLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [selected, updated, auth]);
  useEffect(() => {
    if (!deletion && !settlement) return;
    const previous = document.activeElement as HTMLElement | null;
    const dialog = document.querySelector<HTMLElement>('.ad-modal');
    dialog?.querySelector<HTMLElement>('textarea,button')?.focus();
    const key = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !busy) {
        setDeletion(undefined);
        setSettlement(undefined);
      }
      if (e.key === 'Tab' && dialog) {
        const items = Array.from(
          dialog.querySelectorAll<HTMLElement>(
            'button:not(:disabled),textarea,input',
          ),
        );
        const first = items[0],
          last = items[items.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    };
    document.addEventListener('keydown', key);
    return () => {
      document.removeEventListener('keydown', key);
      previous?.focus();
    };
  }, [deletion, settlement, busy]);
  async function mutate(
    work: () => Promise<unknown>,
    success = 'گۆڕانکارییەکە پاشەکەوت کرا.',
  ) {
    setBusy(true);
    setError('');
    setNotice('');
    try {
      await work();
      setNotice(success);
      await load();
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'هەڵەی پاشەکەوتکردن');
      return false;
    } finally {
      setBusy(false);
    }
  }
  const action = async (
    table: 'fitters' | 'reviews' | 'contacts' | 'community',
    id: string,
    operation: 'approve' | 'delete' | 'rotate',
  ) => {
    const ok = await mutate(async () => {
      if (table === 'fitters') {
        const r = await api<{ dashboard_code?: string }>(
          '/api/admin/fitters',
          post(
            { id, rotate_dashboard: operation === 'rotate' },
            operation === 'delete' ? 'DELETE' : 'PATCH',
          ),
        );
        if (r.dashboard_code) setDashCode(r.dashboard_code);
      } else if (table === 'community')
        await api('/api/admin/community', post({ id }, 'DELETE'));
      else
        await api(
          '/api/admin/moderate',
          post({ table, id, action: operation }),
        );
    });
    if (ok) setDeletion(undefined);
  };
  function exportAccounts() {
    const quote = (v: string | number) =>
      '"' + String(v).replaceAll('"', '""') + '"';
    const rows = [
      [
        'فیتەر',
        'ناوچە',
        'قبوڵکردن',
        'تەواوکراو',
        'حساب نەکراو',
        'پارەی ماوە',
        'تسویەکراو',
        'کۆی پارە',
      ],
      ...data.fitters.map((f) => {
        const a = account(f.id);
        return [
          f.name,
          f.neighborhood,
          a.accepted_count,
          a.completed_count,
          a.current_count,
          a.outstanding_iqd,
          a.settled_iqd,
          a.total_iqd,
        ];
      }),
    ];
    const url = URL.createObjectURL(
      new Blob(
        ['\uFEFF' + rows.map((r) => r.map(quote).join(',')).join('\r\n')],
        { type: 'text/csv;charset=utf-8' },
      ),
    );
    const link = document.createElement('a');
    link.href = url;
    link.download = 'fitter-accounts.csv';
    link.click();
    URL.revokeObjectURL(url);
  }
  const fitters = data.fitters
    .filter((f) =>
      `${f.name} ${f.neighborhood} ${f.phone}`
        .toLowerCase()
        .includes(search.toLowerCase().trim()),
    )
    .filter(
      (f) =>
        filter === 'all' ||
        (filter === 'due'
          ? account(f.id).current_count > 0
          : f.status === filter),
    );
  const total = data.accounts.reduce(
    (a, b) => ({
      due: a.due + b.outstanding_iqd,
      count: a.count + b.accepted_count,
      settled: a.settled + b.settled_iqd,
    }),
    { due: 0, count: 0, settled: 0 },
  );
  const alerts = (
    <>
      {error && (
        <div className="ad-notice error" role="alert">
          {error}
          <button aria-label="داخستن" onClick={() => setError('')}>
            <X size={16} />
          </button>
        </div>
      )}
      {notice && (
        <output className="ad-notice success">
          <Check size={18} />
          {notice}
          <button aria-label="داخستن" onClick={() => setNotice('')}>
            <X size={16} />
          </button>
        </output>
      )}
    </>
  );
  if (loading)
    return (
      <main className="ad-root">
        <output className="ad-loading">
          <RotateCw className="ad-spin" /> بارکردنی بەڕێوەبردن…
        </output>
      </main>
    );
  if (!auth)
    return (
      <main className="ad-root" dir="rtl">
        <section className="ad-login ad-panel">
          <span className="ad-symbol">
            <ShieldCheck size={32} />
          </span>
          <h1>بەڕێوەبردنی فیتەری خێرا</h1>
          <p>بەشی تایبەت بە تیمی بەڕێوەبردن</p>
          {alerts}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const password = new FormData(e.currentTarget).get('password');
              void mutate(
                () => api('/api/admin/session', post({ password })),
                'بەخێربێیت.',
              );
            }}
          >
            <label className="ad-field">
              وشەی نهێنی
              <input
                name="password"
                type="password"
                required
                maxLength={256}
                autoComplete="current-password"
              />
            </label>
            <button className="ad-button primary wide" disabled={busy}>
              {busy ? 'چاوەڕوان بە…' : 'چوونەژوورەوە'}
            </button>
          </form>
        </section>
      </main>
    );
  return (
    <main className="ad-root" dir="rtl">
      <header className="ad-top">
        <div>
          <div className="ad-kicker">
            <ShieldCheck size={15} /> بەشی تایبەتی تیم
          </div>
          <h1>بەڕێوەبردن</h1>
          <p>فیتەرەکان، داواکارییەکان و حسابات لە یەک شوێن.</p>
        </div>
        <div className="ad-actions">
          <button
            className="ad-button"
            disabled={busy || refreshing}
            onClick={() => {
              setError('');
              void load();
            }}
          >
            <RotateCw size={16} className={refreshing ? 'ad-spin' : ''} />{' '}
            نوێکردنەوە
          </button>
          <button
            className="ad-button"
            disabled={busy}
            onClick={() =>
              void mutate(
                () => api('/api/admin/session', { method: 'DELETE' }),
                'چوویتە دەرەوە.',
              )
            }
          >
            <LogOut size={16} /> چوونەدەرەوە
          </button>
        </div>
      </header>
      <section className="ad-stats" aria-label="پوختە">
        <div>
          <Users />
          <strong>{number(data.fitters.length)}</strong>
          <span>
            فیتەر ·{' '}
            {number(data.fitters.filter((f) => f.status === 'pending').length)}{' '}
            چاوەڕوان
          </span>
        </div>
        <div>
          <BriefcaseBusiness />
          <strong>{number(total.count)}</strong>
          <span>قبوڵکردن لە ڕێی ئێمەوە</span>
        </div>
        <div>
          <Wallet />
          <strong>{money(total.due)}</strong>
          <span>کۆی پارەی حساب نەکراو</span>
        </div>
        <div>
          <Check />
          <strong>{money(total.settled)}</strong>
          <span>کۆی پارەی تسویەکراو</span>
        </div>
      </section>
      {alerts}
      {dashCode && (
        <section className="ad-secret">
          <div>
            <ShieldCheck />
            <strong>کۆدی تایبەتی فیتەر</strong>
            <button aria-label="داخستن" onClick={() => setDashCode(undefined)}>
              <X size={18} />
            </button>
          </div>
          <p>
            ئەم کۆدە تەنها ئێستا پیشان دەدرێت. بۆ چوونەژوورەوە لە ئەپی فیتەر
            بەکاری بهێنە.
          </p>
          <input
            readOnly
            dir="ltr"
            value={dashCode}
            onFocus={(e) => e.target.select()}
          />
          <div className="ad-actions">
            <button
              className="ad-button"
              onClick={() =>
                void navigator.clipboard
                  .writeText(dashCode)
                  .then(() => setNotice('کۆدەکە کۆپی کرا.'))
                  .catch(() => setError('کۆدەکە بە دەستی کۆپی بکە.'))
              }
            >
              <Copy size={15} /> کۆپی کۆد
            </button>
            <button
              className="ad-button"
              onClick={() =>
                void navigator.clipboard
                  .writeText(`${window.location.origin}/fitter/${dashCode}`)
                  .then(() => setNotice('لینکەکە کۆپی کرا.'))
                  .catch(() => setError('نەتوانرا کۆپی بکرێت.'))
              }
            >
              کۆپی لینکی تایبەتی
            </button>
          </div>
        </section>
      )}
      {edit ? (
        <section className="ad-panel ad-editor">
          <div className="ad-section-top">
            <h2>{edit === 'new' ? 'زیادکردنی فیتەر' : 'دەستکاری فیتەر'}</h2>
            <button className="ad-button" onClick={() => setEdit(undefined)}>
              گەڕانەوە
            </button>
          </div>
          <FitterForm
            key={edit === 'new' ? 'new' : edit.id}
            initial={edit === 'new' ? undefined : edit}
            admin
            onCancel={() => setEdit(undefined)}
            onSaved={(code) => {
              setEdit(undefined);
              if (code) setDashCode(code);
              setNotice('زانیارییەکانی فیتەر پاشەکەوت کرا.');
              void load();
            }}
          />
        </section>
      ) : (
        <>
          <nav className="ad-tabs" aria-label="بەشەکانی بەڕێوەبردن">
            {tabs.map((item) => (
              <button
                key={item.id}
                aria-current={tab === item.id ? 'page' : undefined}
                onClick={() => {
                  setTab(item.id);
                  setSearch('');
                  setFilter('all');
                  setSelected(undefined);
                }}
              >
                <item.icon size={17} />
                {item.label}
                {item.id === 'reviews' &&
                  !!data.reviews.filter((r) => r.status === 'pending')
                    .length && (
                    <span>
                      {
                        data.reviews.filter((r) => r.status === 'pending')
                          .length
                      }
                    </span>
                  )}
              </button>
            ))}
          </nav>
          <section
            className="ad-content"
            aria-label={tabs.find((i) => i.id === tab)?.label}
          >
            {(tab === 'fitters' || tab === 'accounts') && (
              <>
                <div className="ad-section-top">
                  <div>
                    <h2>
                      {tab === 'fitters' ? 'فیتەرەکان' : 'حسابی فیتەرەکان'}
                    </h2>
                    <p>
                      {tab === 'accounts'
                        ? 'تسویە حسابی ئێستا سفر دەکاتەوە؛ هەموو مێژووی کار و پارە دەمێننەوە.'
                        : 'گۆڕانکارییەکان ڕاستەوخۆ لە داتابەیس پاشەکەوت دەکرێن.'}
                    </p>
                  </div>
                  <button
                    className="ad-button primary"
                    disabled={busy}
                    onClick={() =>
                      tab === 'fitters' ? setEdit('new') : exportAccounts()
                    }
                  >
                    {tab === 'fitters' ? (
                      <Plus size={17} />
                    ) : (
                      <Download size={17} />
                    )}{' '}
                    {tab === 'fitters' ? 'فیتەر زیاد بکە' : 'داگرتنی حسابات'}
                  </button>
                </div>
                <div className="ad-toolbar">
                  <label className="ad-search">
                    <Search size={18} />
                    <input
                      aria-label="گەڕان بۆ فیتەر"
                      placeholder="ناوی فیتەر، ناوچە یان ژمارە…"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                    />
                  </label>
                  <select
                    aria-label="پاڵاوتن"
                    value={filter}
                    onChange={(e) => setFilter(e.target.value)}
                  >
                    <option value="all">هەموو فیتەرەکان</option>
                    {tab === 'accounts' ? (
                      <option value="due">حساب نەکراوەکان</option>
                    ) : (
                      <>
                        <option value="approved">پەسەندکراوەکان</option>
                        <option value="pending">چاوەڕوانی پەسەندکردن</option>
                      </>
                    )}
                  </select>
                  <span>{number(fitters.length)} ئەنجام</span>
                </div>
                {fitters.length ? (
                  <div className="ad-table-wrap">
                    <table
                      className={
                        'ad-table ' +
                        (tab === 'accounts' ? 'accounts' : 'fitters')
                      }
                    >
                      <thead>
                        <tr>
                          <th>فیتەر / ناوچە</th>
                          {tab === 'fitters' ? (
                            <>
                              <th>جۆری فیتەر</th>
                              <th>دۆخ</th>
                              <th>پەیوەندی</th>
                            </>
                          ) : (
                            <>
                              <th>قبوڵکردن / تەواوکراو</th>
                              <th>حساب نەکراو</th>
                              <th>پارەی ماوە</th>
                              <th>تسویەکراو</th>
                            </>
                          )}
                          <th>کردارەکان</th>
                        </tr>
                      </thead>
                      <tbody>
                        {fitters.map((f) => {
                          const a = account(f.id);
                          return (
                            <tr key={f.id}>
                              <td>
                                <strong>{f.name}</strong>
                                <small>
                                  {f.neighborhood}
                                  {f.demo ? ' · نموونە' : ''}
                                </small>
                              </td>
                              {tab === 'fitters' ? (
                                <>
                                  <td>
                                    {f.type === 'mobile'
                                      ? 'فیتەری گەڕۆک'
                                      : 'دووکانی فیتەر'}
                                  </td>
                                  <td>{badge(f.status)}</td>
                                  <td>
                                    <span dir="ltr">{f.phone || '—'}</span>
                                  </td>
                                </>
                              ) : (
                                <>
                                  <td>
                                    <strong>{number(a.accepted_count)}</strong>
                                    <small>
                                      {number(a.completed_count)} تەواوکراو
                                    </small>
                                  </td>
                                  <td>{number(a.current_count)} قبوڵکردن</td>
                                  <td>
                                    <strong
                                      className={
                                        a.outstanding_iqd ? 'ad-money' : ''
                                      }
                                    >
                                      {money(a.outstanding_iqd)}
                                    </strong>
                                  </td>
                                  <td>{money(a.settled_iqd)}</td>
                                </>
                              )}
                              <td>
                                <div className="ad-actions">
                                  {tab === 'fitters' ? (
                                    <>
                                      {f.status === 'pending' && (
                                        <button
                                          className="ad-button small"
                                          disabled={busy}
                                          onClick={() =>
                                            void action(
                                              'fitters',
                                              f.id,
                                              'approve',
                                            )
                                          }
                                        >
                                          <Check size={14} /> پەسەند
                                        </button>
                                      )}
                                      <button
                                        className="ad-button small"
                                        disabled={busy}
                                        onClick={() => setEdit(f)}
                                      >
                                        <Pencil size={14} /> دەستکاری
                                      </button>
                                      <button
                                        className="ad-button small"
                                        disabled={busy}
                                        onClick={() =>
                                          void action('fitters', f.id, 'rotate')
                                        }
                                      >
                                        کۆدی نوێ
                                      </button>
                                      <button
                                        className="ad-button small danger"
                                        disabled={busy}
                                        onClick={() =>
                                          setDeletion({
                                            table: 'fitters',
                                            id: f.id,
                                          })
                                        }
                                        aria-label={'سڕینەوەی ' + f.name}
                                      >
                                        <Trash2 size={14} />
                                      </button>
                                    </>
                                  ) : (
                                    <>
                                      <button
                                        className="ad-button small"
                                        onClick={() => setSelected(f.id)}
                                      >
                                        وردەکاری
                                      </button>
                                      <button
                                        className="ad-button small primary"
                                        disabled={busy || !a.current_count}
                                        onClick={() => {
                                          setNote('');
                                          setSettlement({
                                            fitter: f,
                                            account: a,
                                            id: crypto.randomUUID(),
                                          });
                                        }}
                                      >
                                        تسویە / سفرکردنەوە
                                      </button>
                                    </>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  emptyState('هیچ فیتەرێک نەدۆزرایەوە.')
                )}
                {tab === 'accounts' && selected && (
                  <section className="ad-panel ad-account-detail">
                    <div className="ad-section-top">
                      <h2>
                        حسابی{' '}
                        {data.fitters.find((f) => f.id === selected)?.name}
                      </h2>
                      <button
                        className="ad-button"
                        onClick={() => setSelected(undefined)}
                      >
                        <X size={16} /> داخستن
                      </button>
                    </div>
                    {detailLoading ? (
                      <output>بارکردنی وردەکاری…</output>
                    ) : (
                      detail && (
                        <div className="ad-detail-grid">
                          <div>
                            <h3>تۆمارەکانی قبوڵکردن</h3>
                            {detail.charges.length ? (
                              <div className="ad-history">
                                {detail.charges.map((c) => (
                                  <article key={c.id}>
                                    <div>
                                      <strong dir="ltr">
                                        #{c.dispatch_id.slice(0, 8)}
                                      </strong>
                                      <small>{date(c.created_at)}</small>
                                    </div>
                                    <strong>{money(c.amount_iqd)}</strong>
                                    {badge(c.settlement_id ? 'settled' : 'due')}
                                  </article>
                                ))}
                              </div>
                            ) : (
                              emptyState()
                            )}
                          </div>
                          <div>
                            <h3>مێژووی تسویە</h3>
                            {detail.settlements.length ? (
                              <div className="ad-history">
                                {detail.settlements.map((s) => (
                                  <article key={s.id}>
                                    <div>
                                      <strong>
                                        {number(s.job_count)} قبوڵکردن
                                      </strong>
                                      <small>{date(s.created_at)}</small>
                                      <small>{s.note}</small>
                                      <small dir="ltr">
                                        #{s.id.slice(0, 8)}
                                      </small>
                                    </div>
                                    <strong>{money(s.amount_iqd)}</strong>
                                  </article>
                                ))}
                              </div>
                            ) : (
                              emptyState('هێشتا تسویە نەکراوە.')
                            )}
                          </div>
                        </div>
                      )
                    )}
                  </section>
                )}
              </>
            )}
            {tab === 'settings' && (
              <section className="ad-panel ad-settings">
                <span className="ad-symbol">
                  <Wallet size={27} />
                </span>
                <h2>پارەی جێگیر بۆ هەر قبوڵکردن</h2>
                <p>
                  لە کاتی قبوڵکردنی داواکاری، ئەم بڕە دەچێتە حسابی فیتەرەکە.
                  گۆڕینی بڕەکە تەنها بۆ قبوڵکردنەکانی دواترە؛ حسابەکانی پێشوو
                  ناگۆڕێت.
                </p>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    const amount = Number(fee);
                    if (
                      !fee.trim() ||
                      !Number.isSafeInteger(amount) ||
                      amount < 0 ||
                      amount > 1000000
                    ) {
                      setError('بڕێکی تەواو لە ٠ تا ١,٠٠٠,٠٠٠ دینار بنووسە.');
                      return;
                    }
                    void mutate(async () => {
                      await api(
                        '/api/admin/settings',
                        post({ commission_fixed_iqd: amount }, 'PATCH'),
                      );
                      feeDirty.current = false;
                    }, 'بڕی جێگیر پاشەکەوت کرا.');
                  }}
                >
                  <label className="ad-field">
                    بڕی پارە (دیناری عێراقی)
                    <input
                      type="number"
                      min="0"
                      max="1000000"
                      step="1"
                      required
                      value={fee}
                      onChange={(e) => {
                        feeDirty.current = true;
                        setFee(e.target.value);
                      }}
                    />
                  </label>
                  <button className="ad-button primary" disabled={busy}>
                    <Check size={17} />
                    {busy ? 'پاشەکەوتکردن…' : 'پاشەکەوتکردن'}
                  </button>
                </form>
                <div className="ad-note">
                  بڕی ئێستا:{' '}
                  <strong>{money(data.settings.commission_fixed_iqd)}</strong>
                  <br />
                  بڕی سفر واتە قبوڵکردنەکە بەبێ پارەی پلاتفۆرم تۆمار دەکرێت.
                </div>
              </section>
            )}
            {tab === 'jobs' && (
              <>
                <h2>داواکارییەکانی دوایی</h2>
                <p className="ad-muted">
                  دوایین ٢٠٠ داواکاری؛ حسابات و ژمارە گشتییەکان هەموو مێژوو
                  دەگرنەوە.
                </p>
                {data.dispatches.length ? (
                  <div className="ad-table-wrap">
                    <table className="ad-table">
                      <thead>
                        <tr>
                          <th>داواکاری</th>
                          <th>فیتەر</th>
                          <th>دۆخ</th>
                          <th>کاتی قبوڵکردن</th>
                          <th>پارەی تۆمارکراو</th>
                          <th>حساب</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.dispatches.map((j) => (
                          <tr key={j.id}>
                            <td>
                              <strong dir="ltr">#{j.id.slice(0, 8)}</strong>
                              <small>{date(j.created_at)}</small>
                            </td>
                            <td>
                              {data.fitters.find((f) => f.id === j.fitter_id)
                                ?.name || 'فیتەر'}
                            </td>
                            <td>{badge(j.status)}</td>
                            <td>{date(j.accepted_at)}</td>
                            <td>
                              {j.commission_iqd == null
                                ? '—'
                                : money(j.commission_iqd)}
                            </td>
                            <td>{badge(j.commission_status || 'none')}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  emptyState()
                )}
              </>
            )}
            {tab === 'reviews' && (
              <>
                <h2>هەڵسەنگاندنەکان</h2>
                <div className="ad-cards">
                  {data.reviews.map((r) => (
                    <article className="ad-panel" key={r.id}>
                      <div className="ad-card-top">
                        <strong>{r.reviewer_name}</strong>
                        {badge(r.status)}
                      </div>
                      <small>
                        {data.fitters.find((f) => f.id === r.fitter_id)?.name}
                      </small>
                      <div className="ad-stars" aria-label={`${r.rating} لە ٥`}>
                        {'★'.repeat(r.rating)}
                      </div>
                      <p>{r.comment}</p>
                      <small>{date(r.created_at)}</small>
                      <div className="ad-actions">
                        {r.status === 'pending' && (
                          <button
                            className="ad-button primary small"
                            disabled={busy}
                            onClick={() =>
                              void action('reviews', r.id, 'approve')
                            }
                          >
                            <Check size={14} /> پەسەندکردن
                          </button>
                        )}
                        <button
                          className="ad-button small danger"
                          disabled={busy}
                          onClick={() =>
                            setDeletion({ table: 'reviews', id: r.id })
                          }
                        >
                          <Trash2 size={14} /> سڕینەوە
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
                {!data.reviews.length && emptyState()}
              </>
            )}
            {tab === 'contacts' && (
              <>
                <h2>نامەکان</h2>
                <div className="ad-cards">
                  {data.contacts.map((c) => (
                    <article className="ad-panel" key={c.id}>
                      <h3>{c.name}</h3>
                      <a href={'mailto:' + c.email} dir="ltr">
                        {c.email}
                      </a>
                      <p>{c.message}</p>
                      <small>{date(c.created_at)}</small>
                      <div className="ad-actions">
                        <button
                          className="ad-button small danger"
                          disabled={busy}
                          onClick={() =>
                            setDeletion({ table: 'contacts', id: c.id })
                          }
                        >
                          <Trash2 size={14} /> سڕینەوە
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
                {!data.contacts.length && emptyState()}
              </>
            )}
            {tab === 'community' && (
              <>
                <h2>کێشەی سەیارەکان</h2>
                <div className="ad-cards">
                  {data.community.map((p) => (
                    <article className="ad-panel" key={p.id}>
                      <div className="ad-card-top">
                        <h3>{p.title}</h3>
                        <span className="ad-badge">
                          {p.status === 'resolved'
                            ? 'چارەسەرکراو'
                            : p.status === 'hidden'
                              ? 'شاردراوە'
                              : 'کراوە'}
                        </span>
                      </div>
                      <small>
                        {p.author_name} · {p.car_model} · {p.neighborhood}
                      </small>
                      <p>{p.body}</p>
                      <small>
                        {number(p.replies.length)} وەڵام · {date(p.created_at)}
                      </small>
                      <div className="ad-actions">
                        <Link className="ad-button small" href="/community">
                          بینینی کۆمەڵگا
                        </Link>
                        <button
                          className="ad-button small danger"
                          disabled={busy}
                          onClick={() =>
                            setDeletion({ table: 'community', id: p.id })
                          }
                        >
                          <Trash2 size={14} /> سڕینەوە
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
                {!data.community.length && emptyState()}
              </>
            )}
          </section>
        </>
      )}
      <footer className="ad-footer">
        <span>
          داتا لە هەمان داتابەیسی ئەپی بەکارهێنەر و فیتەر دەخوێندرێتەوە.
        </span>
        <time>نوێکراوەتەوە: {date(updated)}</time>
      </footer>
      {(deletion || settlement) && (
        <div className="ad-modal-backdrop">
          <dialog
            open
            className="ad-modal ad-panel"
            aria-modal="true"
            aria-labelledby="ad-confirm-title"
          >
            <h2 id="ad-confirm-title">
              {settlement ? 'تسویە و سفرکردنەوەی حساب' : 'دڵنیایت لە سڕینەوە؟'}
            </h2>
            {settlement ? (
              <>
                <p>
                  حسابی <strong>{settlement.fitter.name}</strong>
                </p>
                <div className="ad-note">
                  <strong>{money(settlement.account.outstanding_iqd)}</strong>
                  <br />
                  {number(settlement.account.current_count)} قبوڵکردنی حساب
                  نەکراو
                </div>
                <p>
                  ئەم کردارە تسویە تۆمار دەکات و حسابی ئێستا سفر دەکاتەوە.
                  مێژووی کار و پارە دەمێننەوە.
                </p>
                <label className="ad-field">
                  تێبینی تسویە (ئیختیاری)
                  <textarea
                    maxLength={500}
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                  />
                </label>
              </>
            ) : (
              <p>
                سڕینەوەی فیتەرێک کە مێژووی حسابی هەیە ڕێگەپێنەدراوە، بۆ پاراستنی
                تۆمارەکانی پارە.
              </p>
            )}
            {error && (
              <p className="ad-inline-error" role="alert">
                {error}
              </p>
            )}
            <div className="ad-actions">
              <button
                className="ad-button"
                disabled={busy}
                onClick={() => {
                  setDeletion(undefined);
                  setSettlement(undefined);
                }}
              >
                پاشگەزبوونەوە
              </button>
              <button
                className="ad-button primary"
                disabled={busy}
                onClick={() => {
                  if (settlement) {
                    const s = settlement;
                    void mutate(
                      () =>
                        api(
                          '/api/admin/accounts',
                          post({
                            fitter_id: s.fitter.id,
                            receipt_id: s.id,
                            note,
                            expected_amount: s.account.outstanding_iqd,
                            expected_count: s.account.current_count,
                          }),
                        ),
                      'تسویە تۆمار کرا؛ حسابی ئێستا سفر کرایەوە.',
                    ).then((ok) => {
                      if (ok) setSettlement(undefined);
                    });
                  } else if (deletion)
                    void action(deletion.table, deletion.id, 'delete');
                }}
              >
                {busy
                  ? 'چاوەڕوان بە…'
                  : settlement
                    ? 'تۆمارکردنی تسویە'
                    : 'سڕینەوە'}
              </button>
            </div>
          </dialog>
        </div>
      )}
    </main>
  );
}
