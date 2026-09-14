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
  const [theme, setTheme] = useState<'light' | 'dark' | 'auto'>('auto');

  // Initialize theme from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('theme') as 'light' | 'dark' | 'auto';
    if (saved) setTheme(saved);
  }, []);

  const changeTheme = (newTheme: 'light' | 'dark' | 'auto') => {
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    
    let isDark = false;
    if (newTheme === 'auto') {
      isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    } else {
      isDark = newTheme === 'dark';
    }
    
    document.documentElement.classList.toggle('dark', isDark);
    window.dispatchEvent(new CustomEvent('theme-change', { detail: newTheme }));
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

      {/* Premium Fullscreen Menu Overlay */}
      {isMenuOpen && (
        <div className="menu-overlay">
          <div className="menu-header">
            <div className="brand" style={{ fontSize: '20px' }}>
              <span className="brand-icon" style={{ width: '38px', height: '42px' }}>
                <CircleDot size={24} />
              </span>
              <span>{t.brand}</span>
            </div>
            <button 
              className="menu-close-btn"
              onClick={() => setIsMenuOpen(false)}
              aria-label="Close menu"
            >
              <X size={24} />
            </button>
          </div>

          <nav className="menu-nav">
            <Link data-active={path === '/'} href="/">
              <MapIcon size={22} />
              {t.map}
            </Link>
            <Link data-active={path === '/about'} href="/about">
              <Info size={22} />
              {t.about}
            </Link>
            <Link data-active={path === '/contact'} href="/contact">
              <Phone size={22} />
              {t.contact}
            </Link>
            <Link data-active={path === '/admin'} href="/admin">
              <CircleDot size={22} />
              {t.admin || 'Admin'}
            </Link>
          </nav>

          <div className="menu-bottom">
            {/* Theme Toggle */}
            <div className="menu-setting-row" style={{ flexWrap: 'wrap', gap: '10px' }}>
              <span className="menu-setting-label">
                {theme === 'dark' ? <Moon size={20} /> : theme === 'light' ? <Sun size={20} /> : <CircleDot size={20} />}
                {(t as any).theme || 'ڕووکار'}
              </span>
              <div className="menu-lang-selector">
                <button 
                  className="menu-lang-btn" 
                  aria-pressed={theme === 'auto'} 
                  onClick={() => changeTheme('auto')}
                >
                  {(t as any).auto || 'ئۆتۆماتیک'}
                </button>
                <button 
                  className="menu-lang-btn" 
                  aria-pressed={theme === 'light'} 
                  onClick={() => changeTheme('light')}
                >
                  {(t as any).light || 'ڕووناک'}
                </button>
                <button 
                  className="menu-lang-btn" 
                  aria-pressed={theme === 'dark'} 
                  onClick={() => changeTheme('dark')}
                >
                  {(t as any).dark || 'تاریک'}
                </button>
              </div>
            </div>

            {/* Language Selector */}
            <div className="menu-setting-row">
              <span className="menu-setting-label">
                <Globe size={20} />
                {t.language}
              </span>
              <div className="menu-lang-selector">
                {(['ckb', 'en', 'ar'] as const).map((l) => (
                  <button
                    key={l}
                    aria-pressed={lang === l}
                    onClick={() => setLang(l)}
                    className="menu-lang-btn"
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
