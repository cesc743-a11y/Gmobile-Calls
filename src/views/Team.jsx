import { useEffect, useState } from 'react';
import { supabase } from '../lib/util.js';
import { useT } from '../lib/i18n.js';

export default function Team({ ctx }) {
  const { t, opts } = useT();
  const [names, setNames] = useState({});
  async function upd(id, patch) {
    const { error } = await supabase.from('profiles').update(patch).eq('id', id);
    if (error) ctx.toast(String(error.message || '').includes('admin') ? t('lastAdmin') : t('errPerm'));
    ctx.reloadRefs(); if (id === ctx.me.id) ctx.reloadMe();
  }
  const list = [...ctx.profiles].sort((a, b) => Number(a.active) - Number(b.active) || (a.full_name || '').localeCompare(b.full_name || ''));
  return (
    <div className="view">
      <div className="note">{t('teamHint')}</div>
      {ctx.isAdmin && <Invites ctx={ctx} />}
      <div className="panel">
        <h3>{t('teamTitle')}</h3>
        <div className="scroll"><table className="mini">
          <thead><tr><th>{t('colName')}</th><th>{t('colEmail')}</th><th>{t('colJob')}</th><th>{t('colAccess')}</th><th>{t('colActive')}</th></tr></thead>
          <tbody>{list.map(p => {
            const canEditName = ctx.isAdmin || p.id === ctx.me.id;
            const v = names[p.id] ?? p.full_name;
            return <tr key={p.id}>
              <td>{canEditName
                ? <div className="actions"><input className="inp" style={{ width: 170 }} aria-label={t('colName')} value={v} onChange={e => setNames(x => ({ ...x, [p.id]: e.target.value }))} />{v !== p.full_name && <button className="btn small primary" onClick={() => upd(p.id, { full_name: v.trim() })}>{t('saveName')}</button>}</div>
                : (p.full_name || '—')}{p.id === ctx.me.id && <span className="sub">{t('you')}</span>}</td>
              <td className="mono">{p.email}</td>
              <td>{ctx.isAdmin ? <select className="inp" value={p.job || ''} onChange={e => upd(p.id, { job: e.target.value })} aria-label={t('colJob')}><option value="">—</option>{opts('job').map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select> : (opts('job').find(o => o[0] === p.job) || [, '—'])[1]}</td>
              <td>{ctx.isAdmin ? <select className="inp" value={p.role} onChange={e => upd(p.id, { role: e.target.value })} aria-label={t('colAccess')}><option value="agent">{t('agent')}</option><option value="admin">{t('admin')}</option></select> : t(p.role)}</td>
              <td>{ctx.isAdmin
                ? <button className={'btn small ' + (p.active ? '' : 'primary')} onClick={() => upd(p.id, { active: !p.active })}>{p.active ? t('deactivate') : t('activate')}</button>
                : (p.active ? '✓' : t('pending'))}{!p.active && ctx.isAdmin && <span className="sub">{t('pending')}</span>}</td>
            </tr>;
          })}</tbody>
        </table></div>
      </div>
    </div>
  );
}

function Invites({ ctx }) {
  const { t, opts } = useT();
  const [list, setList] = useState([]);
  const [f, setF] = useState({ email: '', full_name: '', job: 'sales', role: 'agent' });
  const [copied, setCopied] = useState('');
  const load = () => supabase.from('invites').select('*').is('used_at', null).order('created_at', { ascending: false }).then(({ data }) => data && setList(data));
  useEffect(() => { load(); }, []);
  async function add(e) {
    e.preventDefault();
    const email = f.email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return ctx.toast(t('invBadEmail'));
    const { error } = await supabase.from('invites').insert({ ...f, email, full_name: f.full_name.trim() });
    if (error) return ctx.toast(error.code === '23505' ? t('invExists') : t('errNet'));
    ctx.toast(t('invDone')); setF(x => ({ ...x, email: '', full_name: '' })); load(); ctx.reloadRefs();
  }
  async function copy(email) {
    try { await navigator.clipboard.writeText(t('invMsg', window.location.origin, email)); setCopied(email); setTimeout(() => setCopied(''), 1500); } catch {}
  }
  async function remove(email) { await supabase.from('invites').delete().eq('email', email); load(); }
  return (
    <div className="panel">
      <h3>{t('invTitle')}</h3>
      <p className="hint" style={{ margin: 0 }}>{t('invHint')}</p>
      <form className="bar" onSubmit={add}>
        <div className="field grow"><label htmlFor="i-email">{t('invEmail')}</label><input id="i-email" type="email" dir="ltr" autoComplete="off" value={f.email} onChange={e => setF(x => ({ ...x, email: e.target.value }))} /></div>
        <div className="field grow"><label htmlFor="i-name">{t('colName')}</label><input id="i-name" value={f.full_name} onChange={e => setF(x => ({ ...x, full_name: e.target.value }))} /></div>
        <div className="field"><label htmlFor="i-job">{t('colJob')}</label><select id="i-job" value={f.job} onChange={e => setF(x => ({ ...x, job: e.target.value }))}>{opts('job').map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></div>
        <div className="field"><label htmlFor="i-role">{t('colAccess')}</label><select id="i-role" value={f.role} onChange={e => setF(x => ({ ...x, role: e.target.value }))}><option value="agent">{t('agent')}</option><option value="admin">{t('admin')}</option></select></div>
        <button className="btn primary">{t('invAdd')}</button>
      </form>
      {list.length > 0 && <>
        <span className="lbl">{t('invPending')}</span>
        <div className="scroll"><table className="mini"><tbody>{list.map(i => <tr key={i.email}>
          <td>{i.full_name || '—'}</td><td className="mono" dir="ltr">{i.email}</td><td>{(opts('job').find(o => o[0] === i.job) || [, '—'])[1]}</td>
          <td><div className="actions"><button className="btn small primary" onClick={() => copy(i.email)}>{copied === i.email ? t('invCopied') : t('invCopy')}</button><button className="btn small" onClick={() => remove(i.email)}>{t('invRemove')}</button></div></td>
        </tr>)}</tbody></table></div>
      </>}
    </div>
  );
}
