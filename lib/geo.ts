import type { Hours } from '@/types';
export const CENTER: [number, number] = [35.5608, 45.4347];
export function distance(a: [number, number], b: [number, number]) {
  const r = Math.PI / 180;
  const d =
    Math.sin(((b[0] - a[0]) * r) / 2) ** 2 +
    Math.cos(a[0] * r) *
      Math.cos(b[0] * r) *
      Math.sin(((b[1] - a[1]) * r) / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(d), Math.sqrt(1 - d));
}
export function opening(hours: Hours, now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Baghdad',
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(now);
  const get = (k: string) => parts.find((p) => p.type === k)?.value || '';
  const day = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(
      get('weekday'),
    ),
    minutes = Number(get('hour')) * 60 + Number(get('minute'));
  const toMin = (s: string) => Number(s.slice(0, 2)) * 60 + Number(s.slice(3));
  const today = hours[day],
    previous = hours[(day + 6) % 7];
  if (
    previous &&
    !previous.closed &&
    !previous.allDay &&
    toMin(previous.close) < toMin(previous.open) &&
    minutes < toMin(previous.close)
  )
    return { open: true };
  if (
    today &&
    !today.closed &&
    (today.allDay ||
      (minutes >= toMin(today.open) &&
        (toMin(today.close) < toMin(today.open) ||
          minutes < toMin(today.close))))
  )
    return { open: true };
  for (let offset = 0; offset < 8; offset++) {
    const h = hours[(day + offset) % 7];
    if (h && !h.closed && (offset > 0 || toMin(h.open) > minutes))
      return {
        open: false,
        day: (day + offset) % 7,
        time: h.allDay ? '00:00' : h.open,
      };
  }
  return { open: false };
}
export const defaultHours = (): Hours =>
  Array.from({ length: 7 }, () => ({
    closed: false,
    open: '08:00',
    close: '22:00',
    allDay: false,
  }));
