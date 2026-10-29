import { useState } from 'react';
import { supabase, dayKey, addDays, daysBetween, fmtDay, waLink, isMobile, calendarLinks, download } from '../lib/util.js';
import { useT, money } from '../lib/i18n.js';

export function waFor(c, ctx, lang) {
  const tpl = ctx.settings[lang === 'ar' ? 'whatsapp_ar' : 'whatsapp_en'] || '';
  return isMobile(c.phone) ? waLink(c.phone, tpl, { name: (c.name || '').split(' ')[0], device: c.device, price: c.quoted_price ? money(c.quoted_price) : '' }) : null;
}

export function CalButtons({ c, ctx }) {
  const { t, lang } = useT();
  if (!c.follow_up_date) return null;
  const wa = waFor(c, ctx, lang);
  const details = [c.device, c.phone, wa ? t('calWa') + wa : ''].filter(Boolean).join('\n');
  const { google, ics } = calendarLinks({ ...c, id: c.id || c.phone }, t('calTitle', c.name || c.phone), details);
  return <>
    <a className="btn small" href={google} target="_blank" rel="noopener noreferrer">📅 {t('calGoogle')}</a>
    <button type="button" className="btn small" onClick={() => download(`follow-up-${c.follow_up_date}.ics`, ics, 'text/calendar;charset=utf-8')}>📅 {t('calIcs')}</button>
  </>;
}

export async function setFollow(c, date, ctx, msg) {
  const { error } = await supabase.from('calls').update({ follow_up_date: date }).eq('id', c.id);
  if (error) ctx.toast(error.code === '42501' ? ctx.t('errPerm') : ctx.t('errNet')); else { ctx.toast(msg); ctx.reloadFollow(); }
}

export default function FollowUps({ ctx, items }) {
  const { t, L, lang } = useT();
  const [scope, setScope] = useState(() => { try { return localStorage.getItem('gm-fu-scope') || (ctx.isAdmin ? 'all' : 'mine'); } catch { return 'mine'; } });
  const pick = v => { setScope(v); try { localStorage.setItem('gm-fu-scope', v); } catch {} };
  const today = dayKey();
  const list = scope === 'mine' ? items.filter(c => c.owner_id === ctx.me.id) : items;
  const groups = [
    ['overdue', t('fuOverdue'), list.filter(c => c.follow_up_date < today), 'st-cancelled'],
    ['today', t('fuToday'), list.filter(c => c.follow_up_date === today), 'st-booked'],
    ['upcoming', t('fuUpcoming'), list.filter(c => c.follow_up_date > today), 'st-inquiry'],
  ];
  return (
    <div className="view">
      <div className="bar" style={{ alignItems: 'center' }}>
        <div className="seg plain" role="group">
          <button type="button" aria-pressed={scope === 'mine'} onClick={() => pick('mine')}>{t('fuMine')}</button>
          <button type="button" aria-pressed={scope === 'all'} onClick={() => pick('all')}>{t('fuAll')}</button>
        </div>
        <p className="hint" style={{ margin: 0, flex: 1 }}>{t('fuHint')}</p>
      </div>
      <NotifyToggle />
      {!list.length && <div className="panel"><div className="empty"><b>{t('fuNone')}</b><span>{t('fuNoneSub')}</span></div></div>}
      {groups.filter(g => g[2].length).map(([k, label, rows, cls]) => (
        <div key={k} className="panel fu-group">
          <h3>{label} <span className={'pill ' + cls}>{rows.length}</span></h3>
          <div className="fu-list">
            {rows.map(c => { const wa = waFor(c, ctx, lang); return (
              <div key={c.id} className="fu-row">
                <button type="button" className="fu-main" onClick={() => ctx.openCall(c)}>
                  <span><b>{c.name}</b> <span className="mono hint" dir="ltr">{c.phone}</span></span>
                  <span className="sub"><bdi>{c.device}</bdi> · <bdi>{c.quoted_price ? money(c.quoted_price) : L('price', c.price_range)}</bdi> · {L('status', c.status)}</span>
                  <span className="sub">{fmtDay(c.follow_up_date, lang)}{k === 'overdue' ? ' · ' + t('fuDays', daysBetween(c.follow_up_date, today)) : ''}{scope === 'all' ? ' · ' + ctx.nameOf(c.owner_id) : ''}</span>
                </button>
                <div className="actions">
                  {wa && <a className="btn small wa" target="_blank" rel="noopener noreferrer" href={wa}>{t('whatsapp')}</a>}
                  <button type="button" className="btn small" onClick={() => setFollow(c, null, ctx, t('fuDoneToast'))}>{t('fuDone')}</button>
                  {k !== 'upcoming' && <button type="button" className="btn small" onClick={() => setFollow(c, addDays(today, 1), ctx, t('fuMovedToast'))}>{t('fuTomorrow')}</button>}
                  {k === 'upcoming' && <CalButtons c={c} ctx={ctx} />}
                </div>
              </div>); })}
          </div>
        </div>
      ))}
    </div>
  );
}

function NotifyToggle() {
  const { t } = useT();
  const supported = typeof window !== 'undefined' && 'Notification' in window;
  const [perm, setPerm] = useState(supported ? Notification.permission : 'unsupported');
  if (!supported) return null;
  return (
    <div className="note fu-notify">
      {perm === 'granted' ? <b>🔔 {t('notifOk')}</b> : perm === 'denied' ? <b>{t('notifDenied')}</b>
        : <button type="button" className="btn small primary" onClick={async () => setPerm(await Notification.requestPermission())}>🔔 {t('notifOn')}</button>}
      <span className="hint">{t('notifHint')}</span>
    </div>
  );
}
