'use client';
import { useLanguage } from '@/components/language';
export default function ErrorPage({ reset }: { reset: () => void }) {
  const { t } = useLanguage();
  return (
    <main className="content-page empty">
      <h1>{t.error}</h1>
      <button className="button primary" onClick={reset}>
        {t.retry}
      </button>
    </main>
  );
}
