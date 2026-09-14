'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { CircleDot, MapPin, Menu, X, Moon, Sun, Globe, Map as MapIcon, Info, Phone } from 'lucide-react';
import { useLanguage } from './language';

export function Header() {
  const { t, lang, setLang } = useLanguage();
  const path = usePathname();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isDark, setIsDark] = useState(true);

  // Initialize theme from localStorage/document
  useEffect(() => {
    const isDarkMode = document.documentElement.classList.contains('dark');
    setIsDark(isDarkMode);
  }, []);

  const toggleTheme = () => {
    const newTheme = !isDark;
    setIsDark(newTheme);
    if (newTheme) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  };

  // Close menu on route change
  useEffect(() => {
    setIsMenuOpen(false);
  }, [path]);

  return (
    <>
      <header className="site-header" style={{ justifyContent: 'space-between', padding: '0 20px' }}>
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
        
        <div className="header-actions">
          <span className="city" style={{ display: 'none' /* hidden for cleaner look on small screens, can be handled by media query in CSS */ }}>
            <MapPin size={15} />
            {t.city}
          </span>
          <button 
            className="menu-button"
            onClick={() => setIsMenuOpen(true)}
            aria-label="Open menu"
            style={{ 
              background: 'transparent', 
              border: 'none', 
              color: 'var(--foreground)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '8px'
            }}
          >
            <Menu size={28} />
          </button>
        </div>
      </header>

      {/* Fullscreen Overlay Menu */}
      {isMenuOpen && (
        <div className="menu-overlay" style={{
          position: 'fixed',
          inset: 0,
          background: 'var(--background)',
          zIndex: 9999,
          display: 'flex',
          flexDirection: 'column',
          padding: '24px',
          animation: 'fade-in 0.2s ease-out'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px' }}>
            <div className="brand" style={{ fontSize: '20px' }}>
              <span className="brand-icon" style={{ width: '38px', height: '42px' }}>
                <CircleDot size={24} />
              </span>
              <span>{t.brand}</span>
            </div>
            <button 
              onClick={() => setIsMenuOpen(false)}
              style={{
                background: 'var(--muted)',
                border: 'none',
                color: 'var(--foreground)',
                borderRadius: '50%',
                width: '40px',
                height: '40px',
                display: 'grid',
                placeItems: 'center'
              }}
            >
              <X size={24} />
            </button>
          </div>

          <nav style={{ display: 'flex', flexDirection: 'column', gap: '20px', fontSize: '18px', fontWeight: '600' }}>
            <Link data-active={path === '/'} href="/" style={{ display: 'flex', alignItems: 'center', gap: '12px', color: path === '/' ? 'var(--primary)' : 'var(--foreground)' }}>
              <MapIcon size={22} />
              {t.map}
            </Link>
            <Link data-active={path === '/about'} href="/about" style={{ display: 'flex', alignItems: 'center', gap: '12px', color: path === '/about' ? 'var(--primary)' : 'var(--foreground)' }}>
              <Info size={22} />
              {t.about}
            </Link>
            <Link data-active={path === '/contact'} href="/contact" style={{ display: 'flex', alignItems: 'center', gap: '12px', color: path === '/contact' ? 'var(--primary)' : 'var(--foreground)' }}>
              <Phone size={22} />
              {t.contact}
            </Link>
          </nav>

          <div style={{ marginTop: 'auto', borderTop: '1px solid var(--border)', paddingTop: '24px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
            
            {/* Theme Toggle */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '12px', fontWeight: '500' }}>
                {isDark ? <Moon size={20} /> : <Sun size={20} />}
                {isDark ? 'تاریک' : 'ڕووناک'} {/* Localization logic can be added if translation is provided, keeping it simple for now */}
              </span>
              <button 
                onClick={toggleTheme}
                style={{
                  background: 'var(--muted)',
                  border: '1px solid var(--border)',
                  color: 'var(--foreground)',
                  padding: '8px 16px',
                  borderRadius: '20px',
                  fontSize: '14px',
                  fontWeight: '600'
                }}
              >
                {isDark ? 'گۆڕین بۆ ڕووناک' : 'گۆڕین بۆ تاریک'}
              </button>
            </div>

            {/* Language Selector */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '12px', fontWeight: '500' }}>
                <Globe size={20} />
                {t.language}
              </span>
              <div className="languages" style={{ display: 'flex', gap: '4px', background: 'var(--muted)', padding: '4px', borderRadius: '8px' }}>
                {(['ckb', 'en', 'ar'] as const).map((l) => (
                  <button
                    key={l}
                    aria-pressed={lang === l}
                    onClick={() => setLang(l)}
                    style={{
                      background: lang === l ? 'var(--primary)' : 'transparent',
                      color: lang === l ? 'var(--primary-foreground)' : 'var(--muted-foreground)',
                      border: 'none',
                      padding: '6px 12px',
                      borderRadius: '6px',
                      fontSize: '13px',
                      fontWeight: '600',
                      transition: 'all 0.2s'
                    }}
                  >
                    {l === 'ckb' ? 'کوردی' : l === 'en' ? 'EN' : 'عربي'}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
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
