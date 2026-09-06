import { z } from 'zod';
import { services } from '@/types';
const phone = z
  .string()
  .trim()
  .regex(/^\+?[0-9 ()-]{7,22}$/)
  .transform((s) => s.replace(/[ ()-]/g, ''));
const optionalPhone = z.union([phone, z.literal('')]).default('');
const time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);
export const fitterSchema = z.object({
  name: z.string().trim().min(2).max(100),
  type: z.enum(['fixed', 'mobile']),
  phone,
  phone2: optionalPhone,
  whatsapp: optionalPhone,
  neighborhood: z.string().trim().min(2).max(180),
  latitude: z.number().min(35.2).max(35.9),
  longitude: z.number().min(45).max(45.9),
  services: z.array(z.enum(services)).min(1).max(6),
  working_hours: z
    .array(
      z
        .object({
          closed: z.boolean(),
          allDay: z.boolean(),
          open: time,
          close: time,
        })
        .refine((h) => h.closed || h.allDay || h.open !== h.close),
    )
    .length(7),
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
