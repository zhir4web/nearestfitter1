import { z } from 'zod';
import { defaultHours } from '@/lib/geo';

const normalizeDigits = (val: unknown) => {
  if (typeof val !== 'string') return val;
  const trimmed = val.trim();
  return trimmed
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 1632))
    .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 1776));
};

const phone = z.preprocess(
  normalizeDigits,
  z
    .string()
    .trim()
    .regex(/^\+?[0-9 ()-]{7,22}$/)
    .transform((s) => s.replace(/[ ()-]/g, ''))
);

const optionalPhone = z.preprocess((val) => {
  if (val === null || val === undefined) return '';
  return normalizeDigits(val);
}, z.union([phone, z.literal('')]).default(''));

const time = z
  .string()
  .regex(/^([01]?\d|2[0-3]):[0-5]\d$/)
  .transform((s) => (s.length === 4 ? '0' + s : s))
  .or(z.literal('').transform(() => '08:00'))
  .default('08:00');

export const fitterSchema = z.object({
  name: z.string().trim().min(2).max(100),
  type: z.enum(['fixed', 'mobile']),
  phone,
  phone2: optionalPhone,
  whatsapp: optionalPhone,
  neighborhood: z.string().trim().min(2).max(180),
  latitude: z.coerce.number().min(-90).max(90),
  longitude: z.coerce.number().min(-180).max(180),
  services: z
    .union([
      z.array(z.string().trim().min(1)).min(1),
      z.string().trim().min(1).transform((s) => [s]),
    ])
    .default(['puncture']),
  working_hours: z
    .array(
      z.object({
        closed: z.boolean().default(false),
        allDay: z.boolean().default(false),
        open: time,
        close: time,
      })
    )
    .min(1)
    .transform((arr) => {
      if (arr.length >= 7) return arr.slice(0, 7);
      const fill = arr[0] || {
        closed: false,
        allDay: false,
        open: '08:00',
        close: '20:00',
      };
      return Array.from({ length: 7 }, (_, i) => arr[i] || { ...fill });
    })
    .default(defaultHours()),
  website: z.string().max(0).optional(),
});
export const reviewSchema = z.object({
  reviewer_name: z.string().trim().min(2).max(60),
  rating: z.number().int().min(1).max(5),
  comment: z.string().trim().min(3).max(1500),
  website: z.string().max(0).optional(),
});
export const contactSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.string().email().max(180),
  message: z.string().trim().min(5).max(3000),
  website: z.string().max(0).optional(),
});
