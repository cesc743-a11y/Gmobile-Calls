import { useEffect, useState } from 'react';
import { supabase, fmtDate, fmtTime } from '../lib/util.js';
import { useT, money } from '../lib/i18n.js';

const FIELD = {
  phone: ['التليفون', 'Phone'], name: ['الاسم', 'Name'], category: ['الفئة', 'Category', 'cat'], device: ['الجهاز', 'Device'], product_id: null,
  price_range: ['الفئة السعرية', 'Price range', 'price'], quoted_price: ['السعر اللي اتقال', 'Price quoted', 'money'], sale_amount: ['اتباع بكام', 'Sold for', 'money'],
  source: ['عرف منين', 'Source', 'source'], campaign_id: ['الكامبين', 'Campaign', 'campaign'], ad_id: ['الإعلان', 'Ad', 'ad'], branch: ['الفرع', 'Branch', 'branch'], status: ['الحالة', 'Status', 'status'],
  cancel_reason: ['سبب الكنسلة', 'Cancel reason', 'cancel'], cancel_note: ['تفاصيل الكنسلة', 'Cancel detail'], follow_up_date: ['متابعة يوم', 'Call back on'], notes: ['ملاحظات', 'Notes'], owner_id: ['مسؤول عن الديل', 'Deal owner', 'person'],
};

export function describeEvent(ev, ctx, t, L, lang) {
  const who = ctx.nameOf(ev.by);
  if (ev.action === 'create') return [who, t('evCreate') + (ev.changes && ev.changes.status ? ' (' + L('status', ev.changes.status[1]) + ')' : ''), ''];
  if (ev.action === 'delete') return [who, t('evDelete'), ''];
  const val = (kind, v) => {
    if (v === null || v === '' || v === undefined) return t('emptyVal');
    if (kind === 'money') return money(v); if (kind === 'campaign') return ctx.campaignOf(v); if (kind === 'ad') return ctx.adOf(v) || '—'; if (kind === 'person') return ctx.nameOf(v);
    if (kind) return L(kind, v); return String(v);
  };
  const parts = Object.entries(ev.changes || {}).filter(([k]) => FIELD[k]).map(([k, [a, b]]) => `${FIELD[k][lang === 'ar' ? 0 : 1]}: ${val(FIELD[k][2], a)} ${lang === 'ar' ? '←' : '→'} ${val(FIELD[k][2], b)}`);
  return [who, ev.action === 'status' ? t('evStatus') : t('evEdit'), parts.length ? ' — ' + parts.join(lang === 'ar' ? '، ' : ', ') : ''];
}

export default function ActivityLog({ ctx }) {
  const { t, L, lang } = useT();
  const [events, setEvents] = useState(null);
  const { from, to } = ctx.range;
  useEffect(() => {
    let live = true;
    const load = () => supabase.from('call_events').select('*').gte('call_date', from).lte('call_date', to).order('at', { ascending: false }).limit(1000)
      .then(({ data }) => { if (live) setEvents(data || []); });
    load();
    const ch = supabase.channel('events-live').on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'call_events' }, load).subscribe();
    return () => { live = false; supabase.removeChannel(ch); };
  }, [from, to]);
  const open = async id => { const { data } = await supabase.from('calls').select('*').eq('id', id).maybeSingle(); if (data) ctx.openCall(data); };
  return (
    <div className="view"><div className="panel">
      <h3>{t('logTitle')}</h3>
      <p className="hint" style={{ margin: 0 }}>{t('logHint')}</p>
      <div className="feed">
        {events && !events.length && <div className="empty"><b>{t('logEmpty')}</b><span>{t('logEmptySub')}</span></div>}
        {(events || []).map(ev => {
          const [who, verb, rest] = describeEvent(ev, ctx, t, L, lang);
          return <div key={ev.id} className="ev"><time>{fmtDate(ev.at, lang)} {fmtTime(ev.at, lang)}</time>
            <div><span className="who">{who}</span>{verb}{t('on')}{ev.action === 'delete' ? <span>{ev.call_name || t('customer')} </span> : <a href="#" onClick={e => { e.preventDefault(); open(ev.call_id); }}>{ev.call_name || t('customer')} </a>}<span className="mono">{ev.call_phone}</span><span className="ch">{rest}</span></div></div>;
        })}
      </div>
    </div></div>
  );
}
