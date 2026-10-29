import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
export const configured = Boolean(url && key);
export const supabase = configured ? createClient(url, key) : null;

export const TZ = 'Africa/Cairo';
export const dayKey = (d = new Date()) => new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
export const addDays = (k, n) => { const d = new Date(k + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
export const daysBetween = (a, b) => Math.round((new Date(b + 'T12:00:00Z') - new Date(a + 'T12:00:00Z')) / 864e5);
export const cairoHour = ts => +new Intl.DateTimeFormat('en-GB', { timeZone: TZ, hour: '2-digit', hourCycle: 'h23' }).format(new Date(ts));
const loc = lang => lang === 'ar' ? 'ar-EG-u-nu-latn' : 'en-GB';
export const fmtTime = (ts, lang) => new Intl.DateTimeFormat(loc(lang), { timeZone: TZ, hour: 'numeric', minute: '2-digit' }).format(new Date(ts));
export const fmtDate = (ts, lang) => new Intl.DateTimeFormat(loc(lang), { timeZone: TZ, day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(ts));
export const fmtDay = (k, lang) => new Intl.DateTimeFormat(loc(lang), { timeZone: 'UTC', day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(k + 'T12:00:00Z'));
export const fmtShort = (k, lang) => new Intl.DateTimeFormat(loc(lang), { timeZone: 'UTC', day: 'numeric', month: 'short' }).format(new Date(k + 'T12:00:00Z'));
export const fmtWeekday = (k, lang) => new Intl.DateTimeFormat(loc(lang), { timeZone: 'UTC', weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(k + 'T12:00:00Z'));
export const fmtMonth = (m, lang) => new Intl.DateTimeFormat(loc(lang), { timeZone: 'UTC', month: 'long', year: 'numeric' }).format(new Date(m + '-15T12:00:00Z'));

export const normPhone = s => {
  let d = String(s || '').replace(/[٠-٩]/g, c => '٠١٢٣٤٥٦٧٨٩'.indexOf(c)).replace(/[۰-۹]/g, c => '۰۱۲۳۴۵۶۷۸۹'.indexOf(c)).replace(/\D/g, '');
  if (d.startsWith('0020')) d = '0' + d.slice(4); else if (d.startsWith('20') && d.length === 12) d = '0' + d.slice(2);
  return d;
};
export const isMobile = p => /^01[0125]\d{8}$/.test(p);
export const intlPhone = p => p && p.startsWith('0') ? '20' + p.slice(1) : p;
export const toNum = v => { if (v === '' || v == null) return null; const n = Number(String(v).replace(/[,\s٬]/g, '').replace(/[٠-٩]/g, c => '٠١٢٣٤٥٦٧٨٩'.indexOf(c))); return isNaN(n) ? null : n; };
export const priceBucket = n => n == null ? '' : n < 10000 ? 'lt10' : n < 20000 ? '10-20' : n < 30000 ? '20-30' : n < 45000 ? '30-45' : n < 60000 ? '45-60' : 'gt60';
export const pct = (a, b) => b ? Math.round(a / b * 100) + '%' : '—';

export function waLink(phone, template, vals) {
  const text = (template || '').replace(/\{name\}/g, vals.name || '').replace(/\{device\}/g, vals.device || '').replace(/\{price\}/g, vals.price || '');
  return `https://wa.me/${intlPhone(phone)}?text=${encodeURIComponent(text)}`;
}

// Calendar reminder for a follow-up: 11:00-11:15 Cairo time on the follow-up day.
export function calendarLinks(c, title, details) {
  const d = c.follow_up_date.replace(/-/g, '');
  const google = 'https://calendar.google.com/calendar/render?' + new URLSearchParams({ action: 'TEMPLATE', text: title, details, dates: `${d}T110000/${d}T111500`, ctz: 'Africa/Cairo' });
  const esc = v => String(v).replace(/[\\;,]/g, m => '\\' + m).replace(/\n/g, '\\n');
  const ics = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//G Mobile//Calls//AR', 'BEGIN:VEVENT', `UID:${c.id}-${d}@gmobile-calls`,
    'DTSTAMP:' + new Date().toISOString().replace(/[-:]/g, '').slice(0, 15) + 'Z', `DTSTART;TZID=Africa/Cairo:${d}T110000`, `DTEND;TZID=Africa/Cairo:${d}T111500`,
    'SUMMARY:' + esc(title), 'DESCRIPTION:' + esc(details), 'BEGIN:VALARM', 'ACTION:DISPLAY', 'DESCRIPTION:' + esc(title), 'TRIGGER:PT0M', 'END:VALARM', 'END:VEVENT', 'END:VCALENDAR'].join('\r\n');
  return { google, ics };
}

export function rangeFor(sel, custom) {
  const td = dayKey();
  if (sel === 'today') return { from: td, to: td };
  if (sel === 'yesterday') return { from: addDays(td, -1), to: addDays(td, -1) };
  if (sel === '7') return { from: addDays(td, -6), to: td };
  if (sel === '30') return { from: addDays(td, -29), to: td };
  if (sel.startsWith('m:')) { const m = sel.slice(2); const next = addDays(m + '-28', 4).slice(0, 7); const last = addDays(next + '-01', -1); return { from: m + '-01', to: last < td ? last : td }; }
  let { from, to } = custom; if (!from) from = addDays(td, -29); if (!to) to = td; if (from > to) [from, to] = [to, from];
  return { from, to };
}

export function download(filename, data, type) {
  const blob = data instanceof Blob ? data : new Blob([data], { type });
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = filename;
  document.body.append(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
}
export const csvEsc = v => { const s = String(v ?? ''); return /[",\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
