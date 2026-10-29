import { utils, write } from 'xlsx';
import { download, csvEsc, fmtTime, fmtDate, intlPhone, isMobile } from './util.js';
import { DICT, LISTS, money } from './i18n.js';

function rows(calls, ctx) {
  const { lang } = ctx; const L = (list, v) => { if (!v) return ''; const r = LISTS[list].find(x => x[0] === v); return r ? r[lang === 'ar' ? 1 : 2] : v; };
  return calls.map(c => [c.call_date, fmtTime(c.created_at, lang), c.name, c.phone, L('cat', c.category), c.device, L('price', c.price_range), c.quoted_price ?? '', c.sale_amount ?? '',
    L('source', c.source), ctx.campaignOf(c.campaign_id), L('status', c.status), L('cancel', c.cancel_reason), c.cancel_note || '', L('branch', c.branch), c.follow_up_date || '', c.notes || '',
    ctx.nameOf(c.created_by), ctx.nameOf(c.owner_id), c.updated_at ? fmtDate(c.updated_at, lang) + ' ' + fmtTime(c.updated_at, lang) : '', ctx.nameOf(c.updated_by)]);
}
const fname = (ctx, ext, base) => `${base || DICT[ctx.lang].fileBase}-${ctx.range.from}-${ctx.range.to}.${ext}`;

export function exportExcel(calls, ctx) {
  if (!calls.length) return ctx.toast(ctx.t('noRows'));
  const cols = DICT[ctx.lang].xCols;
  const ws = utils.aoa_to_sheet([cols, ...rows(calls, ctx)]);
  ws['!cols'] = cols.map(k => ({ wch: Math.max(12, k.length + 4) }));
  const wb = utils.book_new(); if (ctx.lang === 'ar') wb.Workbook = { Views: [{ RTL: true }] };
  utils.book_append_sheet(wb, ws, DICT[ctx.lang].sheetName);
  download(fname(ctx, 'xlsx'), new Blob([write(wb, { bookType: 'xlsx', type: 'array' })], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
}

export function exportCsv(calls, ctx) {
  if (!calls.length) return ctx.toast(ctx.t('noRows'));
  const cols = DICT[ctx.lang].xCols;
  const body = rows(calls, ctx).map(r => r.map((v, i) => csvEsc(i === 3 && v ? '="' + v + '"' : v)).join(','));
  download(fname(ctx, 'csv'), '﻿' + [cols.map(csvEsc).join(','), ...body].join('\r\n'), 'text/csv;charset=utf-8');
}

// Offline conversions file for Meta Events Manager (manual upload). Meta hashes the
// phone and names itself on upload; only delivered sales with a mobile number are included.
export function exportMeta(calls, ctx) {
  const sales = calls.filter(c => c.status === 'delivered' && isMobile(c.phone));
  if (!sales.length) return ctx.toast(ctx.t('noSales'));
  const head = ['event_name', 'event_time', 'phone', 'fn', 'ln', 'country', 'value', 'currency', 'order_id', 'content_name'];
  const body = sales.map(c => {
    const parts = (c.name || '').trim().split(/\s+/);
    return ['Purchase', new Date(c.delivered_at || c.updated_at).toISOString(), '+' + intlPhone(c.phone), parts[0] || '', parts.slice(1).join(' '), 'EG', c.sale_amount ?? '', 'EGP', c.id, c.device].map(csvEsc).join(',');
  });
  download(fname(ctx, 'csv', 'meta-offline-purchases'), [head.join(','), ...body].join('\r\n'), 'text/csv;charset=utf-8');
}
export { money };
