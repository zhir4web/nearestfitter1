import type { Metadata, Viewport } from 'next';
import './globals.css';
import { LanguageProvider } from '@/components/language';
import { Header } from '@/components/header';
import { PreferencesProvider } from '@/components/preferences';

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export const metadata: Metadata = {
  title: {
    default: 'نزیکترین فیتەر | NearestFitter — سلێمانی',
    template: '%s | NearestFitter',
  },
  description:
    'دووکانی فیتەر و فیتەری گەڕۆکی نزیکت لە سلێمانی بدۆزەوە. پەنچەرگیری، گۆڕینی تایە و یارمەتی لەسەر ڕێگا.',
  manifest: '/manifest.json',
  icons: {
    icon: '/favicon.svg',
    apple: '/favicon.svg',
  },
  openGraph: {
    title: 'نزیکترین فیتەر — سلێمانی',
    description: 'فیتەرێکی نزیکت بدۆزەوە.',
    type: 'website',
    locale: 'ckb_IQ',
  },
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ckb" dir="rtl" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                let theme = localStorage.getItem('theme') || 'auto';
                if (theme === 'auto') {
                  theme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
                }
                if (theme === 'dark') {
                  document.documentElement.classList.add('dark');
                } else {
                  document.documentElement.classList.remove('dark');
                }
              } catch (_) {}
            `,
          }}
        />
      </head>
      <body>
        <LanguageProvider>
          <PreferencesProvider>
            <Header />
            {children}
          </PreferencesProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}
