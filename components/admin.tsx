'use client';
import { useEffect, useState } from 'react';
import { ShieldCheck, Plus, LogOut, Check, Trash2, Pencil } from 'lucide-react';
import { useLanguage } from './language';
import { Footer } from './header';
import { FitterForm } from './fitter-form';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogCancel,
} from '@/components/ui/alert-dialog';
import type { Fitter, Review, Contact } from '@/types';
type Data = { fitters: Fitter[]; reviews: Review[]; contacts: Contact[] };
export function Admin() {
  const { t, lang } = useLanguage();
  const [auth, setAuth] = useState(false);
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Data>({
    fitters: [],
    reviews: [],
    contacts: [],
  });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [edit, setEdit] = useState<Fitter | 'new'>();
  const [deletion, setDeletion] = useState<{
    table: 'fitters' | 'reviews' | 'contacts';
    id: string;
  }>();
  const [tab, setTab] = useState('fitters');
  const [dashCode, setDashCode] = useState<string>();
  async function load() {
    setLoading(true);
    setError('');
    try {
      const session = await fetch('/api/admin/session');
      if (!session.ok) throw Error();
      const s = await session.json();
      setAuth(s.authenticated);
      if (s.authenticated) {
        const r = await fetch('/api/admin/data');
        if (!r.ok) throw Error();
        setData(await r.json());
      }
    } catch {
      setError(t.error);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    load();
  }, []);
  async function login(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError('');
    const password = new FormData(e.currentTarget).get('password');
    try {
      const r = await fetch('/api/admin/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      if (!r.ok) throw Error();
      await load();
    } catch {
      setError(t.error);
    } finally {
      setBusy(false);
    }
  }
  async function logout() {
    setBusy(true);
    try {
      const r = await fetch('/api/admin/session', { method: 'DELETE' });
      if (!r.ok) throw Error();
      setAuth(false);
      setData({ fitters: [], reviews: [], contacts: [] });
      setEdit(undefined);
    } catch {
      setError(t.error);
    } finally {
      setBusy(false);
    }
  }
  async function action(
    table: 'fitters' | 'reviews' | 'contacts',
    id: string,
    action: 'approve' | 'delete',
  ) {
    setBusy(true);
    setError('');
    try {
      const r = await fetch(
        table === 'fitters' ? '/api/admin/fitters' : '/api/admin/moderate',
        {
          method:
            table === 'fitters'
              ? action === 'approve'
                ? 'PATCH'
                : 'DELETE'
              : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ table, id, action }),
        },
      );
      if (!r.ok) throw Error();
      if (table === 'fitters' && action === 'approve') {
        const resData = await r.json().catch(() => ({}));
        if (resData.dashboard_code) setDashCode(resData.dashboard_code);
      }
      setDeletion(undefined);
      await load();
    } catch {
      setError(t.error);
    } finally {
      setBusy(false);
    }
  }
  if (loading)
    return (
      <main className="content-page">
        <Skeleton className="h-20 w-full mb-6" />
        <Skeleton className="h-80 w-full" />
      </main>
    );
  if (!auth)
    return (
      <main className="content-page narrow">
        <div className="page-icon">
          <ShieldCheck size={32} />
        </div>
        <h1>{t.admin}</h1>
        <form className="form-panel review-form" onSubmit={login}>
          <label className="field">
            {t.password}
            <input
              name="password"
              type="password"
              required
              maxLength={256}
              autoComplete="current-password"
            />
          </label>
          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}
          <button className="button primary" disabled={busy}>
            {busy ? t.sending : t.login}
          </button>
        </form>
        <Footer />
      </main>
    );
  return (
    <main className="content-page admin-page">
      <div className="admin-top">
        <div>
          <h1>{t.admin}</h1>
          <p className="muted">{t.adminIntro}</p>
        </div>
        <button className="button" onClick={logout} disabled={busy}>
          <LogOut size={16} />
          {t.logout}
        </button>
      </div>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      {dashCode && (
        <div className="success flex gap-4 items-center mb-6" role="alert">
          <ShieldCheck size={30} />
          <div className="flex-1">
            <strong>داشبۆردی فیتەر دروستکرا!</strong>
            <div className="flex gap-2 mt-2">
              <input
                type="text"
                readOnly
                value={`${typeof window !== 'undefined' ? window.location.origin : ''}/fitter/${dashCode}`}
                className="flex-1 p-2 border rounded"
                onFocus={(e) => e.target.select()}
              />
              <button
                className="button primary"
                onClick={() => {
                  void navigator.clipboard.writeText(`${window.location.origin}/fitter/${dashCode}`);
                  setDashCode(undefined);
                }}
              >
                کۆپی لینک
              </button>
            </div>
          </div>
        </div>
      )}
      {edit ? (
        <>
          <h2 className="field-title">
            {edit === 'new' ? t.newListing : t.edit}
          </h2>
          <FitterForm
            initial={edit === 'new' ? undefined : edit}
            admin
            onCancel={() => setEdit(undefined)}
            onSaved={(code) => {
              setEdit(undefined);
              if (code) setDashCode(code);
              void load();
            }}
          />
        </>
      ) : (
        <>
          <button
            className="button primary mb-6"
            onClick={() => setEdit('new')}
          >
            <Plus size={18} />
            {t.newListing}
          </button>
          <Tabs value={tab} onValueChange={(v) => setTab(String(v))}>
            <TabsList className="admin-tabs h-auto! flex-wrap">
              <TabsTrigger value="fitters">
                {t.listings} ({data.fitters.length})
              </TabsTrigger>
              <TabsTrigger value="pending">
                {t.pending} (
                {data.fitters.filter((f) => f.status === 'pending').length})
              </TabsTrigger>
              <TabsTrigger value="reviews">
                {t.reviews} (
                {data.reviews.filter((r) => r.status === 'pending').length})
              </TabsTrigger>
              <TabsTrigger value="contacts">
                {t.inbox} ({data.contacts.length})
              </TabsTrigger>
            </TabsList>
            {['fitters', 'pending'].map((key) => (
              <TabsContent key={key} value={key}>
                <div className="table-wrap">
                  <Table className="admin-table">
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t.shopName}</TableHead>
                        <TableHead>{t.type}</TableHead>
                        <TableHead>{t.neighborhood}</TableHead>
                        <TableHead>{t.status}</TableHead>
                        <TableHead>{t.details}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.fitters
                        .filter(
                          (f) => key !== 'pending' || f.status === 'pending',
                        )
                        .map((f) => (
                          <TableRow key={f.id}>
                            <TableCell>
                              <strong>{f.name}</strong>
                              {f.demo && (
                                <span className="demo-tag ms-2">{t.demo}</span>
                              )}
                            </TableCell>
                            <TableCell>{t[f.type]}</TableCell>
                            <TableCell>{f.neighborhood}</TableCell>
                            <TableCell>
                              <span className={'status-badge ' + f.status}>
                                {t[f.status]}
                              </span>
                            </TableCell>
                            <TableCell>
                              <div className="row-actions">
                                {f.status === 'pending' && (
                                  <button
                                    className="button"
                                    disabled={busy}
                                    onClick={() =>
                                      action('fitters', f.id, 'approve')
                                    }
                                  >
                                    <Check size={15} />
                                    {t.approve}
                                  </button>
                                )}
                                <button
                                  className="button"
                                  onClick={() => setEdit(f)}
                                >
                                  <Pencil size={15} />
                                  {t.edit}
                                </button>
                                <button
                                  className="button"
                                  onClick={() =>
                                    setDeletion({ table: 'fitters', id: f.id })
                                  }
                                >
                                  <Trash2 size={15} />
                                  {t.delete}
                                </button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                    </TableBody>
                  </Table>
                </div>
                {!data.fitters.filter(
                  (f) => key !== 'pending' || f.status === 'pending',
                ).length && <p className="empty">{t.noData}</p>}
              </TabsContent>
            ))}
            <TabsContent value="reviews">
              {data.reviews.length ? (
                data.reviews.map((r) => (
                  <article className="admin-review" key={r.id}>
                    <div className="review-head">
                      <strong>
                        {r.reviewer_name} ·{' '}
                        {data.fitters.find((f) => f.id === r.fitter_id)?.name}
                      </strong>
                      <span className={'status-badge ' + r.status}>
                        {t[r.status]}
                      </span>
                    </div>
                    <span className="stars">{'★'.repeat(r.rating)}</span>
                    <p>{r.comment}</p>
                    <div className="row-actions">
                      {r.status === 'pending' && (
                        <button
                          className="button"
                          disabled={busy}
                          onClick={() => action('reviews', r.id, 'approve')}
                        >
                          {t.approve}
                        </button>
                      )}
                      <button
                        className="button"
                        onClick={() =>
                          setDeletion({ table: 'reviews', id: r.id })
                        }
                      >
                        {t.delete}
                      </button>
                    </div>
                  </article>
                ))
              ) : (
                <p className="empty">{t.noData}</p>
              )}
            </TabsContent>
            <TabsContent value="contacts">
              {data.contacts.length ? (
                data.contacts.map((c) => (
                  <article className="message-card" key={c.id}>
                    <strong>{c.name}</strong>
                    <div>
                      <a href={'mailto:' + c.email} className="text-orange-300">
                        {c.email}
                      </a>
                    </div>
                    <p>{c.message}</p>
                    <small>
                      {new Date(c.created_at).toLocaleString(
                        lang === 'en' ? 'en-GB' : 'ar-IQ',
                      )}
                    </small>
                    <div className="form-actions">
                      <button
                        className="button"
                        onClick={() =>
                          setDeletion({ table: 'contacts', id: c.id })
                        }
                      >
                        {t.delete}
                      </button>
                    </div>
                  </article>
                ))
              ) : (
                <p className="empty">{t.noData}</p>
              )}
            </TabsContent>
          </Tabs>
        </>
      )}
      <AlertDialog
        open={!!deletion}
        onOpenChange={(o) => {
          if (!o && !busy) setDeletion(undefined);
        }}
      >
        <AlertDialogContent dir={lang === 'en' ? 'ltr' : 'rtl'}>
          <AlertDialogTitle>{t.deleteTitle}</AlertDialogTitle>
          <AlertDialogDescription>{t.deleteText}</AlertDialogDescription>
          <div className="form-actions">
            <button
              className="button primary"
              disabled={busy}
              onClick={() =>
                deletion && action(deletion.table, deletion.id, 'delete')
              }
            >
              {t.delete}
            </button>
            <AlertDialogCancel disabled={busy}>{t.cancel}</AlertDialogCancel>
          </div>
        </AlertDialogContent>
      </AlertDialog>
      <Footer />
    </main>
  );
}
