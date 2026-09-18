import type { Metadata } from 'next';
import { LandingPage } from '@/components/landing';
export const metadata: Metadata = { title: 'نزیکترین فیتەر لە سلێمانی', description: 'فیتەری نزیکت بدۆزەوە و خێرا داوای یارمەتیی سەر ڕێگا بکە.' };
export default function Home() {
  return <LandingPage />;
}
