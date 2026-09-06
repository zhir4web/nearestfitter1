'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { CircleDot, Plus, MapPin } from 'lucide-react';
import { useLanguage } from './language';
export function Header() {
  const { t, lang, setLang } = useLanguage();
  const path = usePathname();
  return (
    <header className="site-header">
      <Link href="/" className="brand">
        <span className="brand-icon">
          <CircleDot size={29} />
        </span>
        <span>
          {t.brand}
          <small>
            NEAREST<span>FITTER</span>
          </small>
        </span>
      </Link>
      <nav aria-label={t.map}>
        <Link data-active={path === '/'} href="/">
          {t.map}
        </Link>
        <Link data-active={path === '/about'} href="/about">
          {t.about}
        </Link>
        <Link data-active={path === '/contact'} href="/contact">
          {t.contact}
        </Link>
      </nav>
      <div className="header-actions">
        <span className="city">
          <MapPin size={15} />
          {t.city}
        </span>
        <div className="languages" aria-label={t.language}>
          {(['ckb', 'en', 'ar'] as const).map((l) => (
            <button
              key={l}
              aria-pressed={lang === l}
              onClick={() => setLang(l)}
            >
              {l === 'ckb' ? 'کوردی' : l === 'en' ? 'EN' : 'عربي'}
            </button>
          ))}
        </div>
      </div>
    </header>
  );
}
export function Footer() {
  const { t } = useLanguage();
  return (
    <footer className="site-footer">
      <Link href="/">{t.map}</Link>
      <Link href="/about">{t.about}</Link>
      <Link href="/contact">{t.contact}</Link>
      <Link href="/admin">{t.admin}</Link>
    </footer>
  );
}
