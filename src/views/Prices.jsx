import { useState } from 'react';
import { supabase, toNum, fmtDate } from '../lib/util.js';
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
  async function upd(id, patch) { const { error } = await supabase.from('products').update({ ...patch, updated_at: new Date().toISOString() }).eq('id', id); if (error) err(error); else ctx.reloadRefs(); }
  return (
    <div className="view">
      <div className="panel">
        <h3>{t('pricesTitle')}</h3>
        <p className="hint" style={{ margin: 0 }}>{t('pricesHint')}</p>
        <div className="bar">
          <div className="seg plain" role="group">{opts('cat').map(([k, v]) => <button key={k} type="button" aria-pressed={cat === k} onClick={() => setCat(k)}>{v}</button>)}</div>
          <div className="field grow"><input className="inp" type="search" placeholder={t('search')} value={q} onChange={e => setQ(e.target.value)} aria-label={t('search')} /></div>
        </div>
        {ctx.isAdmin && <form className="bar" onSubmit={async e => { e.preventDefault(); if (!form.name.trim()) return; if (await add([{ name: form.name.trim(), price: toNum(form.price) }])) setForm({ name: '', price: '' }); }}>
          <div className="field grow"><label htmlFor="p-name">{t('pName')}</label><input id="p-name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} /></div>
          <div className="field"><label htmlFor="p-price">{t('pPrice')}</label><input id="p-price" dir="ltr" inputMode="numeric" value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} /></div>
          <button className="btn primary">{t('addProduct')}</button>
        </form>}
        <div className="scroll"><table className="mini">
          <thead><tr><th>{t('pName')}</th><th className="r">{t('pPrice')}</th><th>{t('pStock')}</th><th>{t('updatedAt')}</th>{ctx.isAdmin && <th />}</tr></thead>
          <tbody>
            {list.map(p => <tr key={p.id}>
              <td>{p.name}</td>
              <td className="r">{ctx.isAdmin
                ? <input className="inp mono" style={{ width: 120 }} inputMode="numeric" aria-label={t('pPrice')} value={edit[p.id] ?? (p.price ?? '')} onChange={e => setEdit(x => ({ ...x, [p.id]: e.target.value }))} onBlur={() => { if (edit[p.id] !== undefined && toNum(edit[p.id]) !== (p.price == null ? null : Number(p.price))) upd(p.id, { price: toNum(edit[p.id]) }); }} />
                : <span className="mono">{money(p.price)}</span>}</td>
              <td>{ctx.isAdmin ? <input type="checkbox" checked={p.in_stock} onChange={e => upd(p.id, { in_stock: e.target.checked })} aria-label={t('pStock')} /> : (p.in_stock ? t('inStock') : t('outStock'))}</td>
              <td className="hint">{fmtDate(p.updated_at, lang)}</td>
              {ctx.isAdmin && <td><button className="btn small danger" onClick={() => upd(p.id, { active: false })}>{t('remove')}</button></td>}
            </tr>)}
          </tbody>
        </table></div>
        {!list.length && <div className="empty"><b>{t('pEmpty')}</b></div>}
      </div>
      {ctx.isAdmin && <div className="panel">
        <h3>{t('bulk')} · {L('cat', cat)}</h3>
        <span className="hint">{t('bulkHint')}</span>
        <textarea className="inp" rows={5} dir="ltr" value={bulk} onChange={e => setBulk(e.target.value)} aria-label={t('bulk')} />
        <div><button className="btn primary" onClick={async () => {
          const rows = bulk.split('\n').map(l => l.trim()).filter(Boolean).map(l => { const i = l.lastIndexOf(','); return i > 0 ? { name: l.slice(0, i).trim(), price: toNum(l.slice(i + 1)) } : { name: l, price: null }; }).filter(r => r.name);
          if (rows.length && await add(rows)) setBulk('');
        }}>{t('bulkAdd')}</button></div>
      </div>}
    </div>
  );
}
