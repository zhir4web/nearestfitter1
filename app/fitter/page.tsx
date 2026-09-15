'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, KeyRound, ShieldCheck, Truck } from 'lucide-react';
import Link from 'next/link';
import { useLanguage } from '@/components/language';
export default function FitterPortalEntry() {
  const { lang, t } = useLanguage(); const router = useRouter(); const [code, setCode] = useState('');
  const submit = (event: React.FormEvent) => { event.preventDefault(); if (code.trim()) router.push(`/fitter/${encodeURIComponent(code.trim())}`); };
  return <main id="main-content" className="nf-main"><div className="nf-portal-entry"><span className="nf-settings-icon amber"><Truck size={23} /></span><span className="nf-eyebrow"><ShieldCheck size={14} />{lang === 'en' ? 'Private fitter portal' : lang === 'ar' ? 'بوابة الفني الخاصة' : 'پۆرتاڵی تایبەتی فیتەر'}</span><h1>{lang === 'en' ? 'Your service desk, in one place.' : lang === 'ar' ? 'مكتب خدمتك في مكان واحد.' : 'هەموو خزمەتگوزارییەکەت لە یەک شوێن.'}</h1><p>{lang === 'en' ? 'Enter the private access code provided by the NearestFitter team.' : lang === 'ar' ? 'أدخل رمز الوصول الخاص الذي زودك به فريق أقرب فني.' : 'کۆدی چوونەژوورەوەی تایبەت بنووسە کە تیمی نزیکترین فیتەر پێیداوویت.'}</p><form onSubmit={submit}><label>{lang === 'en' ? 'Private access code' : lang === 'ar' ? 'رمز الوصول الخاص' : 'کۆدی تایبەت'}<span className="nf-entry-input"><KeyRound size={17} /><input value={code} onChange={(event) => setCode(event.target.value)} pattern="[a-fA-F0-9]{32,48}" minLength={32} maxLength={48} required inputMode="text" autoComplete="off" /></span></label><button className="nf-button primary"><ShieldCheck size={17} />{lang === 'en' ? 'Open my portal' : lang === 'ar' ? 'فتح البوابة' : 'پۆرتاڵەکەم بکەرەوە'}</button></form><Link className="nf-back-link" href="/">{lang === 'en' ? 'Back to NearestFitter' : lang === 'ar' ? 'العودة إلى أقرب فني' : 'گەڕانەوە بۆ نزیکترین فیتەر'}<ArrowRight size={15} /></Link></div></main>;
}
