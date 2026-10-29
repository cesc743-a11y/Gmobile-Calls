import { addDays, cairoHour, fmtShort, pct } from '../lib/util.js';
import { useT, money, LISTS } from '../lib/i18n.js';

const ST_COLOR = { inquiry: 'var(--s-inq)', booked: 'var(--s-book)', delivered: 'var(--s-done)', not_delivered: 'var(--s-miss)', cancelled: 'var(--s-cancel)' };
const sum = (list, f) => list.reduce((a, c) => a + (Number(f(c)) || 0), 0);

function HBars({ rows, total, empty }) {
  if (!rows.length) return <div className="hint">{empty}</div>;
  const max = Math.max(1, ...rows.map(r => r.n));
  return <div className="hb">{rows.map((r, i) => <div className="r" key={i} title={r.label + ': ' + r.n}>
    <span className="n">{r.label}</span>
    <div className="track"><div className="fill" style={{ width: (r.n / max * 100).toFixed(1) + '%' }} /></div>
    <span className="v">{r.n}{total ? ' · ' + pct(r.n, total) : ''}{r.extra ? ' · ' + r.extra : ''}</span>
  </div>)}</div>;
}

function Trend({ days, values, fmt, cls, label }) {
  const max = Math.max(1, ...values); const raw = max / 4; const mag = Math.pow(10, Math.floor(Math.log10(raw)));
  const step = Math.max(1, [1, 2, 2.5, 5, 10].map(m => m * mag).find(s => s >= raw) || raw); const top = step * Math.ceil(max / step);
  const { lang } = useT();
  const grid = []; for (let g = step; g <= top + 1e-9; g += step) grid.push(g);
  return <>
    <div className={'trend ' + (cls || '')} role="img" aria-label={label}>
      {grid.map(g => <div key={g} className="grid" style={{ bottom: (g / top * 100) + '%' }}><span>{fmt(g)}</span></div>)}
      {days.map((d, i) => <div key={d} className="col" tabIndex={0}><div className="b" style={{ height: (values[i] / top * 100).toFixed(1) + '%' }} /><div className="tip">{fmtShort(d, lang)}: {fmt(values[i])}</div></div>)}
    </div>
    <div className="axis"><span>{fmtShort(days[0], lang)}</span>{days.length > 2 && <span>{fmtShort(days[Math.floor(days.length / 2)], lang)}</span>}<span>{fmtShort(days[days.length - 1], lang)}</span></div>
  </>;
}

export default function Analysis({ ctx, calls }) {
  const { t, L, opts } = useT();
  const { from, to } = ctx.range;
  if (!calls.length) return <div className="view"><div className="panel"><div className="empty"><b>{t('aEmpty')}</b><span>{t('aEmptySub')}</span></div></div></div>;
  const n = calls.length;
  const delivered = calls.filter(c => c.status === 'delivered');
  const revenue = sum(delivered, c => c.sale_amount);
  const booked = calls.filter(c => c.ever_booked).length;
  const cancelled = calls.filter(c => c.status === 'cancelled');
  const days = []; for (let d = from; d <= to && days.length < 400; d = addDays(d, 1)) days.push(d);
  const perDay = {}, revDay = {};
  calls.forEach(c => { perDay[c.call_date] = (perDay[c.call_date] || 0) + 1; });
  delivered.forEach(c => { revDay[c.call_date] = (revDay[c.call_date] || 0) + (Number(c.sale_amount) || 0); });
  const conv = (label, items) => ({ label, n: items.length, extra: t('aDeliveredOf', items.filter(c => c.status === 'delivered').length, items.length) + (sum(items.filter(c => c.status === 'delivered'), c => c.sale_amount) ? ' · ' + money(sum(items.filter(c => c.status === 'delivered'), c => c.sale_amount)) + t('egp') : '') });
  const group = (key, list, src = calls) => { const g = {}; src.forEach(c => { const k = c[key] || ''; (g[k] = g[k] || []).push(c); }); const keys = list ? [...LISTS[list].map(r => r[0]), ''] : Object.keys(g); return keys.filter(k => g[k]).map(k => [k, g[k]]); };
  const kpi = (label, val, sub) => <div className="kpi"><span>{label}</span><b>{val}</b><small>{sub}</small></div>;

  const dev = {}; calls.forEach(c => { const k = (c.device || '').trim().replace(/\s+/g, ' '); if (!k) return; const kk = k.toLowerCase(); (dev[kk] = dev[kk] || { label: k, items: [] }).items.push(c); });
  const devRows = Object.values(dev).sort((a, b) => b.items.length - a.items.length).slice(0, 10).map(g => conv(g.label, g.items));
  const hours = Array(24).fill(0); calls.forEach(c => { hours[cairoHour(c.created_at)]++; });

  const people = {}; calls.forEach(c => { const k = c.owner_id || ''; (people[k] = people[k] || []).push(c); });
  const team = Object.entries(people).map(([id, items]) => { const del = items.filter(c => c.status === 'delivered'); return { id, name: ctx.nameOf(id), n: items.length, b: items.filter(c => c.ever_booked).length, d: del.length, rev: sum(del, c => c.sale_amount) }; })
    .sort((a, b) => b.d - a.d || b.rev - a.rev || b.n - a.n);

  const lostOos = {}; cancelled.filter(c => c.cancel_reason === 'oos').forEach(c => { const k = c.device.trim(); lostOos[k] = (lostOos[k] || 0) + 1; });
  const lostInq = {}; calls.filter(c => c.status === 'inquiry' || (c.status === 'cancelled' && c.cancel_reason !== 'oos')).forEach(c => { const k = c.device.trim(); lostInq[k] = (lostInq[k] || 0) + 1; });
  const top = o => Object.entries(o).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([label, v]) => ({ label, n: v }));
  const stRows = opts('status').map(([k, v]) => ({ k, v, n: calls.filter(c => c.status === k).length })).filter(r => r.n);

  return (
    <div className="view">
      <p className="hint" style={{ margin: 0 }}>{t('aNote')}</p>
      <div className="kpis">
        {kpi(t('aKpiCalls'), n, t('aKpiPerDay', (n / Math.max(1, days.length)).toFixed(1)))}
        {kpi(t('aKpiBooked'), pct(booked, n), booked + ' ' + t('aOf'))}
        {kpi(t('aKpiDelivered'), pct(delivered.length, n), delivered.length + ' ' + t('aOf'))}
        {kpi(t('aKpiRevenue'), money(revenue), t('aKpiAvg', delivered.length ? money(Math.round(revenue / delivered.length)) : '—'))}
        {kpi(t('aKpiCancel'), pct(cancelled.length, n), cancelled.length + ' ' + t('aOf'))}
      </div>
      <div className="panel">
        <h3>{t('aTeam')}</h3>
        <div className="scroll"><table className="mini">
          <thead><tr><th>{t('aColName')}</th><th className="r">{t('aColCalls')}</th><th className="r">{t('aColBooked')}</th><th className="r">{t('aColDelivered')}</th><th className="r">{t('aColRevenue')}</th><th className="r">{t('aColRate')}</th></tr></thead>
          <tbody>{team.map((r, i) => <tr key={r.id}><td><span className={'rank' + (i === 0 && r.d ? ' r1' : '')}>{i + 1}</span>{r.name}</td><td className="r">{r.n}</td><td className="r">{r.b}</td><td className="r">{r.d}</td><td className="r">{money(r.rev)}</td><td className="r">{pct(r.d, r.n)}</td></tr>)}</tbody>
        </table></div>
      </div>
      <div className="an-grid">
        <div className="panel"><h3>{t('aTrend')}</h3><Trend days={days} values={days.map(d => perDay[d] || 0)} fmt={v => String(v)} label={t('aTrend')} /></div>
        <div className="panel"><h3>{t('aRevTrend')}</h3><Trend cls="rev" days={days} values={days.map(d => revDay[d] || 0)} fmt={v => money(Math.round(v))} label={t('aRevTrend')} /></div>
      </div>
      <div className="panel"><h3>{t('aStatus')}</h3>
        <div className="stack">{stRows.map(r => <div key={r.k} title={`${r.v}: ${r.n} (${pct(r.n, n)})`} style={{ flex: `${r.n} 0 0`, background: ST_COLOR[r.k] }} />)}</div>
        <div className="legend">{stRows.map(r => <span key={r.k}><i style={{ background: ST_COLOR[r.k] }} />{r.v} {r.n} ({pct(r.n, n)})</span>)}</div>
      </div>
      <div className="an-grid">
        <div className="panel"><h3>{t('aByCat')}</h3><HBars total={n} empty={t('aNoData')} rows={group('category', 'cat').map(([k, items]) => conv(L('cat', k), items))} /></div>
        <div className="panel"><h3>{t('aByPrice')}</h3><HBars total={n} empty={t('aNoData')} rows={group('price_range', 'price').map(([k, items]) => conv(k ? L('price', k) : '—', items))} /></div>
        <div className="panel"><h3>{t('aCampaign')}</h3><HBars total={n} empty={t('aNoData')} rows={group('campaign_id').sort((a, b) => b[1].length - a[1].length).map(([k, items]) => conv(k ? ctx.campaignOf(k) : t('noCampaign'), items))} /></div>
        <div className="panel"><h3>{t('aSource')}</h3><HBars total={n} empty={t('aNoData')} rows={group('source', 'source').map(([k, items]) => conv(k ? L('source', k) : '—', items))} /></div>
        <div className="panel"><h3>{t('aDevices')}</h3><HBars total={n} empty={t('aNoData')} rows={devRows} /></div>
        <div className="panel"><h3>{t('aCancel')}</h3><HBars total={cancelled.length} empty={t('aNoData')} rows={group('cancel_reason', 'cancel', cancelled).map(([k, items]) => ({ label: L('cancel', k), n: items.length }))} /></div>
        <div className="panel"><h3>{t('aLost')}</h3><p className="hint" style={{ margin: 0 }}>{t('aLostHint')}</p>
          <span className="lbl">{t('aLostOos')}</span><HBars rows={top(lostOos)} empty={t('aNoData')} />
          <span className="lbl">{t('aLostInq')}</span><HBars rows={top(lostInq)} empty={t('aNoData')} /></div>
        <div className="panel"><h3>{t('aHours')}</h3><HBars total={n} empty={t('aNoData')} rows={hours.map((v, h) => ({ label: t('hourFmt', h), n: v })).filter(r => r.n)} /></div>
      </div>
    </div>
  );
}
