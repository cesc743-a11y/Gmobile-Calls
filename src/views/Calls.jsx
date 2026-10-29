import { useEffect, useState } from 'react';
import { supabase, normPhone, fmtTime, fmtDay, fmtWeekday, fmtMonth } from '../lib/util.js';
import { useT, money } from '../lib/i18n.js';

export default function Calls({ ctx, calls, total, status, setStatus, q }) {
  const { t, L, opts, lang } = useT();
  const counts = {}; calls.forEach(c => { counts[c.status] = (counts[c.status] || 0) + 1; });
  const list = status ? calls.filter(c => c.status === status) : calls;
  const perDay = {}, perMonth = {};
  list.forEach(c => { perDay[c.call_date] = (perDay[c.call_date] || 0) + 1; const m = c.call_date.slice(0, 7); perMonth[m] = (perMonth[m] || 0) + 1; });
  const rows = []; let lastDay = '', lastMonth = '';
  for (const c of list) {
    const m = c.call_date.slice(0, 7);
    if (m !== lastMonth) { lastMonth = m; rows.push({ kind: 'month', key: 'm' + m, text: fmtMonth(m, lang) + ' · ' + t('callsN', perMonth[m]) }); }
    if (c.call_date !== lastDay) { lastDay = c.call_date; rows.push({ kind: 'day', key: 'd' + c.call_date, text: fmtWeekday(c.call_date, lang) + ' · ' + t('callsN', perDay[c.call_date]) }); }
    rows.push({ kind: 'call', key: c.id, c });
  }
  const statusSub = c => c.status === 'cancelled' && c.cancel_reason ? [L('cancel', c.cancel_reason), c.cancel_note].filter(Boolean).join(': ') : c.status === 'delivered' && c.sale_amount ? t('soldX', c.sale_amount) : '';
  const priceText = c => c.quoted_price ? money(c.quoted_price) : L('price', c.price_range);

  return (
    <div className="view">
      <div className="strip">
        <button className="stat" aria-pressed={!status} onClick={() => setStatus('')}><b>{calls.length}</b><span>{t('allCalls')}</span></button>
        {opts('status').map(([k, v]) => <button key={k} className="stat" aria-pressed={status === k} onClick={() => setStatus(status === k ? '' : k)}><b>{counts[k] || 0}</b><span>{v}</span></button>)}
      </div>
      <PhoneLookup q={q} ctx={ctx} />
      <div className="ledger">
        <div className="scroll calls"><table>
          <thead><tr><th>{t('thTime')}</th><th>{t('thCustomer')}</th><th>{t('thAsked')}</th><th>{t('thPrice')}</th><th>{t('thStatus')}</th><th>{t('thOwner')}</th></tr></thead>
          <tbody>{rows.map(r => r.kind === 'month' ? <tr key={r.key} className="monthrow"><td colSpan={6}>{r.text}</td></tr>
            : r.kind === 'day' ? <tr key={r.key} className="dayrow"><td colSpan={6}>{r.text}</td></tr>
            : <tr key={r.key} className="call" tabIndex={0} onClick={() => ctx.openCall(r.c)} onKeyDown={e => { if (e.key === 'Enter') ctx.openCall(r.c); }}>
                <td><span className="mono">{fmtTime(r.c.created_at, lang)}</span></td>
                <td><b>{r.c.name}</b><span className="sub mono">{r.c.phone}</span></td>
                <td>{r.c.device}<span className="sub">{L('cat', r.c.category)}{r.c.campaign_id ? ' · ' + ctx.campaignOf(r.c.campaign_id) : ''}{r.c.ad_id ? ' · ' + ctx.adOf(r.c.ad_id) : ''}</span></td>
                <td>{priceText(r.c)}{r.c.quoted_price && r.c.price_range ? <span className="sub">{L('price', r.c.price_range)}</span> : null}</td>
                <td><span className={'pill st-' + r.c.status}>{L('status', r.c.status)}</span>{statusSub(r.c) && <span className="sub">{statusSub(r.c)}</span>}</td>
                <td>{ctx.nameOf(r.c.owner_id)}{r.c.created_by !== r.c.owner_id && <span className="sub">{t('loggedBy') + ctx.nameOf(r.c.created_by)}</span>}</td>
              </tr>)}</tbody>
        </table></div>
        <div className="cards">{rows.map(r => r.kind === 'month' ? <div key={r.key} className="monthrow">{r.text}</div>
          : r.kind === 'day' ? <div key={r.key} className="dayrow">{r.text}</div>
          : <button key={r.key} className="card" onClick={() => ctx.openCall(r.c)}>
              <div className="row"><b>{r.c.name}</b><span className={'pill st-' + r.c.status}>{L('status', r.c.status)}</span></div>
              <div className="row"><span><bdi>{r.c.device}</bdi> · <bdi>{priceText(r.c)}</bdi></span><span className="mono sub">{r.c.phone}</span></div>
              <div className="sub">{fmtTime(r.c.created_at, lang)} · {ctx.nameOf(r.c.owner_id)}{statusSub(r.c) ? ' · ' + statusSub(r.c) : ''}</div>
            </button>)}</div>
        {!list.length && <div className="empty"><b>{t(total ? 'emptyFilter' : 'emptyNone')}</b><span>{t(total ? 'emptyFilterSub' : 'emptyNoneSub')}</span></div>}
      </div>
      {list.length > 0 && <div className="count">{t('shown', list.length, total)}</div>}
    </div>
  );
}

export function usePhoneHistory(phone) {
  const [state, setState] = useState(null);
  useEffect(() => {
    const p = normPhone(phone); if (p.length < 10) { setState(null); return; }
    let live = true; setState({ loading: true });
    const tm = setTimeout(async () => {
      const { data } = await supabase.from('calls').select('*').eq('phone', p).order('created_at', { ascending: false }).limit(50);
      if (live) setState({ calls: data || [] });
    }, 300);
    return () => { live = false; clearTimeout(tm); };
  }, [phone]);
  return state;
}

function PhoneLookup({ q, ctx }) {
  const { t, L, lang } = useT();
  const h = usePhoneHistory(q);
  if (!h) return null;
  if (h.loading) return <div className="hint">{t('searching')}</div>;
  if (!h.calls.length) return <div className="hint">{t('noHistory')}</div>;
  return (
    <div className="prev"><b>{t('historyN', h.calls.length, h.calls[0].name)}</b>
      <ul>{h.calls.map(c => <li key={c.id}><a href="#" onClick={e => { e.preventDefault(); ctx.openCall(c); }}>{fmtDay(c.call_date, lang)}: {c.device} · {L('status', c.status)}</a></li>)}</ul>
    </div>
  );
}
