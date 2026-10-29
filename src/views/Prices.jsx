import { useEffect, useState } from 'react';
import { supabase, toNum, fmtDate, fmtTime } from '../lib/util.js';
import { useT, money } from '../lib/i18n.js';

export default function Prices({ ctx }) {
  const { t, L, opts, lang } = useT();
  const [cat, setCat] = useState('iphone');
  const [q, setQ] = useState('');
  const [form, setForm] = useState({ name: '', price: '' });
  const [bulk, setBulk] = useState('');
  const [edit, setEdit] = useState({});
  const list = ctx.products.filter(p => p.active && p.category === cat && (!q || p.name.toLowerCase().includes(q.toLowerCase())));
  const err = e => ctx.toast(e && e.code === '42501' ? t('errPerm') : t('errNet'));
  async function add(rows) {
    const { error } = await supabase.from('products').insert(rows.map(r => ({ ...r, category: cat })));
    if (error) return err(error); ctx.reloadRefs(); return true;
  }
  async function upd(id, patch) { const { error } = await supabase.from('products').update(patch).eq('id', id); if (error) err(error); else ctx.reloadRefs(); }
  return (
    <div className="view">
      <div className="panel">
        <h3>{t('pricesTitle')}</h3>
        <p className="hint" style={{ margin: 0 }}>{t('pricesHint')}</p>
        <div className="bar">
          <div className="seg plain" role="group">{opts('cat').map(([k, v]) => <button key={k} type="button" aria-pressed={cat === k} onClick={() => setCat(k)}>{v}</button>)}</div>
          <div className="field grow"><input className="inp" type="search" placeholder={t('search')} value={q} onChange={e => setQ(e.target.value)} aria-label={t('search')} /></div>
        </div>
        <form className="bar" onSubmit={async e => { e.preventDefault(); if (!form.name.trim()) return; if (await add([{ name: form.name.trim(), price: toNum(form.price) }])) setForm({ name: '', price: '' }); }}>
          <div className="field grow"><label htmlFor="p-name">{t('pName')}</label><input id="p-name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} /></div>
          <div className="field"><label htmlFor="p-price">{t('pPrice')}</label><input id="p-price" dir="ltr" inputMode="numeric" value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} /></div>
          <button className="btn primary">{t('addProduct')}</button>
        </form>
        <div className="scroll"><table className="mini">
          <thead><tr><th>{t('pName')}</th><th className="r">{t('pPrice')}</th><th>{t('pStock')}</th><th>{t('updatedAt')}</th><th /></tr></thead>
          <tbody>
            {list.map(p => <tr key={p.id}>
              <td>{p.name}</td>
              <td className="r"><input className="inp mono" style={{ width: 120 }} inputMode="numeric" aria-label={t('pPrice')} value={edit[p.id] ?? (p.price ?? '')} onChange={e => setEdit(x => ({ ...x, [p.id]: e.target.value }))} onBlur={() => { if (edit[p.id] !== undefined && toNum(edit[p.id]) !== (p.price == null ? null : Number(p.price))) upd(p.id, { price: toNum(edit[p.id]) }); }} /></td>
              <td><input type="checkbox" checked={p.in_stock} onChange={e => upd(p.id, { in_stock: e.target.checked })} aria-label={t('pStock')} /></td>
              <td className="hint">{fmtDate(p.updated_at, lang)}{p.updated_by ? ' · ' + ctx.nameOf(p.updated_by) : ''}</td>
              <td><button className="btn small danger" onClick={() => upd(p.id, { active: false })}>{t('remove')}</button></td>
            </tr>)}
          </tbody>
        </table></div>
        {!list.length && <div className="empty"><b>{t('pEmpty')}</b></div>}
      </div>
      <div className="panel">
        <h3>{t('bulk')} · {L('cat', cat)}</h3>
        <span className="hint">{t('bulkHint')}</span>
        <textarea className="inp" rows={5} dir="ltr" value={bulk} onChange={e => setBulk(e.target.value)} aria-label={t('bulk')} />
        <div><button className="btn primary" onClick={async () => {
          const rows = bulk.split('\n').map(l => l.trim()).filter(Boolean).map(l => { const i = l.lastIndexOf(','); return i > 0 ? { name: l.slice(0, i).trim(), price: toNum(l.slice(i + 1)) } : { name: l, price: null }; }).filter(r => r.name);
          if (rows.length && await add(rows)) setBulk('');
        }}>{t('bulkAdd')}</button></div>
      </div>
      <PriceLog ctx={ctx} />
    </div>
  );
}

function PriceLog({ ctx }) {
  const { t, L, lang } = useT();
  const [rows, setRows] = useState([]);
  const [limit, setLimit] = useState(50);
  useEffect(() => {
    const load = () => supabase.from('product_events').select('*').order('at', { ascending: false }).limit(limit).then(({ data }) => data && setRows(data));
    load();
    const ch = supabase.channel('price-log').on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'product_events' }, load).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [limit]);
  const val = (k, v) => v === null || v === undefined ? t('emptyVal') : k === 'price' ? money(v) : k === 'in_stock' ? (v ? t('inStock') : t('outStock')) : k === 'category' ? L('cat', v) : String(v);
  const label = { price: t('pPrice'), in_stock: t('pStock'), name: t('pName'), category: t('fCategory') };
  const detail = ev => {
    if (ev.action === 'delete') return '';
    return Object.entries(ev.changes || {}).filter(([k]) => label[k]).map(([k, [a, b]]) => ev.action === 'create' ? `${label[k]}: ${val(k, b)}` : `${label[k]}: ${val(k, a)} ${lang === 'ar' ? '←' : '→'} ${val(k, b)}`).join(' · ');
  };
  return (
    <div className="panel">
      <h3>{t('priceLog')}</h3>
      <p className="hint" style={{ margin: 0 }}>{t('priceLogHint')}</p>
      {!rows.length ? <div className="hint">{t('plEmpty')}</div> : <div className="plog">{rows.map(ev => <div key={ev.id} className="pev">
        <time>{fmtDate(ev.at, lang)} {fmtTime(ev.at, lang)}</time>
        <span className="who"><b>{ev.by_name || ctx.nameOf(ev.by)}</b> <span className="mono hint" dir="ltr">{ev.by_email}</span></span>
        <span>{t('pl' + ev.action)} <b>{ev.product_name}</b></span>
        <span className="ch" dir="auto">{detail(ev)}</span>
      </div>)}</div>}
      {rows.length >= limit && <div><button className="btn small" onClick={() => setLimit(l => l + 100)}>{t('plMore')}</button></div>}
    </div>
  );
}
