import type { Metadata } from 'next';
import { HomeDashboard } from '@/components/marketplace';

export const metadata: Metadata = {
  title: 'فیتەر بدۆزەوە',
  description:
    'لە نەخشە و لیستی فیتەرەکانی سلێمانی بگەڕێ و نزیکترین خزمەتگوزاری بدۆزەوە.',
};

export default function FindPage() {
  return <HomeDashboard />;
}
