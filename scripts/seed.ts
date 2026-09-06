import { PrismaClient } from '@prisma/client';
import { createClient } from '@supabase/supabase-js';
const samples = [
  ['فیتەری شەقامی سالم', 'شەقامی سالم / Salim Street', 35.5575, 45.432],
  ['فیتەری سەرچنار', 'سەرچنار / Sarchinar', 35.586, 45.389],
  ['فیتەری مەلیک مەحمود', 'مەلیک مەحمود / Malik Mahmud', 35.549, 45.47],
  ['فیتەری ڕاپەڕین', 'ڕاپەڕین / Raparin', 35.589, 45.443],
  ['فیتەری بەختیاری', 'بەختیاری / Bakhtiary', 35.575, 45.419],
  ['فیتەری زەرگەتە', 'زەرگەتە / Zargata', 35.539, 45.439],
  ['فیتەری گەڕۆکی سلێمانی', 'ناوەندی شار / City center', 35.563, 45.432],
  ['فیتەری گەڕۆکی سەرچنار', 'سەرچنار / Sarchinar', 35.577, 45.4],
  ['فیتەری گەڕۆکی ڕاپەڕین', 'ڕاپەڕین / Raparin', 35.582, 45.458],
] as const;
const data = samples.map((s, i) => ({
  id: `demo-${i + 1}`,
  name: s[0],
  neighborhood: s[1],
  latitude: s[2],
  longitude: s[3],
  type: i >= 6 ? 'mobile' : 'fixed',
  phone: '+9640000000000',
  phone2: '',
  whatsapp: '',
  photo_url: '',
  services:
    i >= 6
      ? ['puncture', 'change', 'roadside']
      : i % 2
        ? ['puncture', 'change', 'balance', 'sales']
        : ['puncture', 'change', 'alignment'],
  working_hours: Array.from({ length: 7 }, (_, day) => ({
    closed: day === 5 && i < 3,
    allDay: i >= 6,
    open: '08:00',
    close: '22:00',
  })),
  status: 'approved',
  demo: true,
  created_at: new Date().toISOString(),
}));
if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
  const s = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
  );
  const { error } = await s
    .from('fitters')
    .upsert(data, { onConflict: 'id', ignoreDuplicates: true });
  if (error) throw error;
} else {
  const p = new PrismaClient();
  for (const f of data)
    await p.fitter.upsert({ where: { id: f.id }, create: f, update: {} });
  await p.$disconnect();
}
console.log(
  '9 clearly labeled demo fitters seeded. No working contact numbers.',
);
