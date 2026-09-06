import type { Metadata } from 'next';
import './globals.css';
import { LanguageProvider } from '@/components/language';
import { Header } from '@/components/header';
export const metadata: Metadata = {
  title: {
    default: 'نزیکترین فیتەر | NearestFitter — سلێمانی',
    template: '%s | NearestFitter',
  },
  description:
    'دووکانی فیتەر و فیتەری گەڕۆکی نزیکت لە سلێمانی بدۆزەوە. پەنچەرگیری، گۆڕینی تایە و یارمەتی لەسەر ڕێگا.',
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
    <html lang="ckb" dir="rtl" className="dark" suppressHydrationWarning>
      <body>
        <LanguageProvider>
          <Header />
          {children}
        </LanguageProvider>
      </body>
    </html>
  );
}
