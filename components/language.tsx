'use client';
import { createContext, useContext, useEffect, useState } from 'react';
import { dictionary } from '@/lib/i18n';
import type { Language } from '@/types';
const Context = createContext({
  lang: 'ckb' as Language,
  setLang: (_l: Language) => {},
  t: dictionary.ckb,
});
export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLang] = useState<Language>('ckb');
  useEffect(() => {
    const saved = localStorage.getItem('language');
    if (saved === 'en' || saved === 'ar') setLang(saved);
  }, []);
  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === 'en' ? 'ltr' : 'rtl';
    localStorage.setItem('language', lang);
  }, [lang]);
  return (
    <Context.Provider value={{ lang, setLang, t: dictionary[lang] }}>
      {children}
    </Context.Provider>
  );
}
export const useLanguage = () => useContext(Context);
