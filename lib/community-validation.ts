import { z } from 'zod';

// Public posts never need phone numbers, links or markup. React also escapes all
// displayed text; this validation keeps contact details out of the public feed.
const contactPattern = /(?:[0-9٠-٩۰-۹][\s().+\-]*){7,}|(?:https?:\/\/|www\.|wa\.me\/)|[\w.+-]+@[\w.-]+\.[a-z]{2,}/i;
const publicText = (min: number, max: number) => z.string().trim().min(min).max(max)
  .refine((value) => !contactPattern.test(value), 'Do not publish contact details')
  .refine((value) => !/[<>\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(value), 'Use plain text');

export const communityPostSchema = z.object({
  author_name: publicText(2, 60),
  title: publicText(5, 100),
  car_model: publicText(2, 80),
  neighborhood: publicText(2, 120),
  body: publicText(15, 2000),
  website: z.string().max(0).optional(),
}).strict();

export const communityReplySchema = z.object({
  fitter_code: z.string().min(12).max(180),
  body: publicText(5, 1500),
}).strict();

export const communityOwnerSchema = z.object({
  owner_token: z.string().regex(/^[a-f0-9]{64}$/).optional(),
  status: z.enum(['open', 'resolved']).optional(),
}).strict();

export const communityIdSchema = z.string().uuid();
