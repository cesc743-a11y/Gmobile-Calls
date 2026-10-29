import { useState } from 'react';
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
