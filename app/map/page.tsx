import type { Metadata } from 'next';
import { MapDirectory } from '@/components/marketplace';
export const metadata: Metadata = { title: 'نەخشەی فیتەرەکان', description: 'دووکان و فیتەری گەڕۆک لەسەر نەخشەی سلێمانی بدۆزەوە.' };
export const dynamic = 'force-dynamic';
export default function MapPage() { return <MapDirectory />; }
