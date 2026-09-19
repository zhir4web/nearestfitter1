'use client';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { Home, Map, MessageSquare, Settings, Heart, Sun, Moon, MapPin, ShieldCheck } from 'lucide-react';
import { useLanguage } from './language';
import { usePreferences } from './preferences';
import { appCopy } from '@/lib/app-copy';

export function Header() {
  const path = usePathname();
  const { t, lang } = useLanguage();
  const copy = appCopy[lang];
  const { theme, setTheme, favorites } = usePreferences();
  const privateArea = path.startsWith('/admin') || path.startsWith('/fitter');
  const landingPage = path === '/';
  const links = [
    { href: '/find', label: copy.home, Icon: Home },
    { href: '/map', label: t.map, Icon: Map },
    { href: '/community', label: copy.community, Icon: MessageSquare },
    { href: '/favorites', label: copy.favorites, Icon: Heart },
    { href: '/settings', label: copy.settings, Icon: Settings },
  ];
  return <>
    <a className="nf-skip" href="#main-content">{lang === 'en' ? 'Skip to content' : lang === 'ar' ? 'انتقل للمحتوى' : 'چوونە ناوەڕۆک'}</a>
    <header className="nf-header">
      <div className="nf-header-inner">
        <Link href={privateArea ? (path.startsWith('/admin') ? '/admin' : '/fitter') : '/'} className="nf-brand">
          <span className="nf-brand-mark"><Image src="/logo-mark.svg" alt="" width={44} height={44} priority /></span>
          <span>{t.brand}<small>NEAREST<span>FITTER</span></small></span>
        </Link>
        {privateArea ? <span className="nf-private-label"><ShieldCheck size={17} />{path.startsWith('/admin') ? t.admin : t.mobile}</span> : !landingPage && <nav className="nf-desktop-nav" aria-label={copy.home}>
          {links.slice(0, 3).map(({ href, label, Icon }) => <Link key={href} href={href} className={path === href ? 'active' : ''} aria-current={path === href ? 'page' : undefined}><Icon size={17} />{label}</Link>)}
        </nav>}
        <div className="nf-header-actions">
          {!privateArea && !landingPage && <><span className="nf-city"><MapPin size={15} />{t.city}<i /></span><Link href="/favorites" className="nf-icon-button nf-favorite-header" aria-label={copy.favorites}><Heart size={19} />{favorites.length > 0 && <b>{favorites.length}</b>}</Link></>}
          <button className="nf-icon-button" onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')} aria-label={theme === 'light' ? copy.dark : copy.light}>{theme === 'light' ? <Moon size={19} /> : <Sun size={19} />}</button>
        </div>
      </div>
    </header>
    {!privateArea && !landingPage && <nav className="nf-bottom-nav" aria-label={copy.home}>{links.map(({ href, label, Icon }) => <Link key={href} href={href} className={path === href ? 'active' : ''} aria-current={path === href ? 'page' : undefined}><Icon size={21} /><span>{label}</span></Link>)}</nav>}
  </>;
}

export function Footer() {
  const { t, lang } = useLanguage();
  const copy = appCopy[lang];
  return <footer className="nf-footer"><span>© {new Date().getFullYear()} {t.brand}</span><div><Link href="/about">{t.about}</Link><Link href="/contact">{t.contact}</Link><Link href="/settings">{copy.settings}</Link></div></footer>;
}
