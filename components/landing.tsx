'use client';

import Link from 'next/link';
import Image from 'next/image';
import {
  ArrowLeft,
  CheckCircle2,
  Clock3,
  MapPin,
  ShieldCheck,
  Wrench,
} from 'lucide-react';
import { useLanguage } from './language';
import { Footer } from './header';

const words = {
  ckb: {
    kicker: 'یارمەتیی سەیارە لە نزیکترین شوێن',
    title: 'فیتەری نزیکت بدۆزەوە، پێش ئەوەی کێشەکە گەورە بێت.',
    text: 'نزیکترین فیتەر دووکان و فیتەری گەڕۆک لە سلێمانی لە یەک شوێن کۆدەکاتەوە؛ بگەڕێ، بەراورد بکە و خێرا داوای یارمەتی بنێرە.',
    enter: 'فیتەرێک بدۆزەوە',
    request: 'داوای یارمەتی بکە',
    verified: 'زانیاری و هەڵسەنگاندنی ڕوون',
    available: 'فیتەری بەردەست و خزمەتگوزاریی ٢٤/٧',
    fast: 'داواکاریی ڕاستەوخۆ و شوێنکەوتنی زیندوو',
    directory: 'نەخشە، گەڕان و پاڵاوتنی ورد',
    community: 'پرسیار و وەڵامی کێشەی سەیارە',
    features: [
      'فیتەرەکان بە ناوچە و خزمەتگوزاری بپشکنە',
      'داواکارییەکەت بە پارێزراوی بنێرە',
      'دوای قبوڵکردن، شوێنی فیتەر ببینە',
    ],
  },
  en: {
    kicker: 'Roadside help, close to you',
    title: 'Find a nearby fitter before a small problem becomes a long delay.',
    text: 'NearestFitter brings workshops and mobile tire fitters in Sulaymaniyah into one trusted place. Search, compare, and request help quickly.',
    enter: 'Find a fitter',
    request: 'Request roadside help',
    verified: 'Clear details and moderated reviews',
    available: 'Available fitters and 24/7 services',
    fast: 'Direct requests with live tracking',
    directory: 'Detailed map, search, and filters',
    community: 'Community car-problem questions',
    features: [
      'Compare nearby fitters by area and service',
      'Send a private help request',
      'Track the fitter after acceptance',
    ],
  },
  ar: {
    kicker: 'مساعدة على الطريق بالقرب منك',
    title: 'اعثر على فني إطارات قريب قبل أن تتحول المشكلة إلى تأخير طويل.',
    text: 'يجمع NearestFitter الورش والفنيين المتنقلين في السليمانية في مكان موثوق واحد. ابحث وقارن واطلب المساعدة بسرعة.',
    enter: 'ابحث عن فني',
    request: 'اطلب مساعدة الطريق',
    verified: 'بيانات واضحة وتقييمات خاضعة للمراجعة',
    available: 'فنيون متاحون وخدمات على مدار الساعة',
    fast: 'طلبات مباشرة وتتبع حي',
    directory: 'خريطة وبحث وفلاتر دقيقة',
    community: 'أسئلة المجتمع عن مشاكل السيارات',
    features: [
      'قارن الفنيين حسب المنطقة والخدمة',
      'أرسل طلب مساعدة خاصاً',
      'تتبع الفني بعد قبول الطلب',
    ],
  },
};

export function LandingPage() {
  const { lang } = useLanguage();
  const copy = words[lang];
  return (
    <main id="main-content" className="nf-main nf-landing">
      <section className="nf-shell nf-landing-hero">
        <div className="nf-landing-copy">
          <span className="nf-eyebrow">
            <span className="nf-live-dot" />
            {copy.kicker}
          </span>
          <h1>{copy.title}</h1>
          <p>{copy.text}</p>
          <div className="nf-landing-actions">
            <Link className="nf-button primary" href="/find">
              <MapPin size={18} />
              {copy.enter}
              <ArrowLeft size={16} />
            </Link>
            <Link className="nf-button ghost" href="/request-help">
              <Wrench size={18} />
              {copy.request}
            </Link>
          </div>
          <div className="nf-landing-trust">
            <span>
              <ShieldCheck size={17} />
              {copy.verified}
            </span>
            <span>
              <Clock3 size={17} />
              {copy.available}
            </span>
            <span>
              <CheckCircle2 size={17} />
              {copy.fast}
            </span>
          </div>
        </div>
        <div className="nf-landing-mark" aria-hidden="true">
          <Image
            src="/logo-mark.svg"
            alt=""
            width={128}
            height={128}
            priority
          />
          <span className="one">
            <MapPin size={18} />
            {copy.directory}
          </span>
          <span className="two">
            <Wrench size={18} />
            {copy.community}
          </span>
        </div>
      </section>
      <section className="nf-shell nf-landing-features" aria-label={copy.kicker}>
        {copy.features.map((feature, index) => (
          <div key={feature}>
            <span>{String(index + 1).padStart(2, '0')}</span>
            <p>{feature}</p>
          </div>
        ))}
      </section>
      <Footer />
    </main>
  );
}
