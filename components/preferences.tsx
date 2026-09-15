'use client';
import { createContext, useCallback, useContext, useEffect, useState } from 'react';

type Theme = 'dark' | 'light' | 'auto';
type Preferences = {
  theme: Theme;
  setTheme: (value: Theme) => void;
  favorites: string[];
  toggleFavorite: (id: string) => void;
  user?: [number, number];
  locate: () => void;
  locating: boolean;
  geoError: boolean;
  clearLocation: () => void;
};
const Context = createContext<Preferences>({
  theme: 'dark', setTheme() {}, favorites: [], toggleFavorite() {}, locate() {},
  locating: false, geoError: false, clearLocation() {},
});

export function PreferencesProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>('dark');
  const [favorites, setFavorites] = useState<string[]>([]);
  const [user, setUser] = useState<[number, number]>();
  const [locating, setLocating] = useState(false);
  const [geoError, setGeoError] = useState(false);
  useEffect(() => {
    const read = () => {
      try {
        const storedTheme = localStorage.getItem('theme');
        if (storedTheme === 'auto' || storedTheme === 'light' || storedTheme === 'dark') setThemeState(storedTheme);
        const saved: unknown = JSON.parse(localStorage.getItem('nf-favorites') || '[]');
        if (Array.isArray(saved)) setFavorites(saved.filter((item): item is string => typeof item === 'string'));
      } catch { /* local storage can be disabled */ }
    };
    read();
    window.addEventListener('storage', read);
    return () => window.removeEventListener('storage', read);
  }, []);
  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const apply = () => document.documentElement.classList.toggle('dark', theme === 'dark' || (theme === 'auto' && media.matches));
    apply();
    media.addEventListener('change', apply);
    return () => media.removeEventListener('change', apply);
  }, [theme]);
  const setTheme = (value: Theme) => {
    setThemeState(value);
    try { localStorage.setItem('theme', value); } catch { /* ignore */ }
  };
  const toggleFavorite = (id: string) => setFavorites((current) => {
    const next = current.includes(id) ? current.filter((item) => item !== id) : [...current, id];
    try { localStorage.setItem('nf-favorites', JSON.stringify(next)); } catch { /* ignore */ }
    return next;
  });
  const locate = useCallback(() => {
    setGeoError(false); setLocating(true);
    if (!navigator.geolocation) { setGeoError(true); setLocating(false); return; }
    navigator.geolocation.getCurrentPosition(
      (position) => { setUser([position.coords.latitude, position.coords.longitude]); setLocating(false); },
      () => { setGeoError(true); setLocating(false); },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 30000 },
    );
  }, []);
  return <Context.Provider value={{ theme, setTheme, favorites, toggleFavorite, user, locate, locating, geoError, clearLocation: () => setUser(undefined) }}>{children}</Context.Provider>;
}
export const usePreferences = () => useContext(Context);
