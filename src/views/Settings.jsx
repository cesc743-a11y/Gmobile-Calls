import { useEffect, useState } from 'react';
import { supabase } from '../lib/util.js';
import { useT } from '../lib/i18n.js';

export default function Settings({ ctx }) {
  const { t } = useT();
  const [camp, setCamp] = useState('');
  const [tpl, setTpl] = useState({ whatsapp_ar: '', whatsapp_en: '' });
  useEffect(() => { setTpl({ whatsapp_ar: ctx.settings.whatsapp_ar || '', whatsapp_en: ctx.settings.whatsapp_en || '' }); }, [ctx.settings]);
  const fail = () => ctx.toast(t('errNet'));
  async function addCamp(e) {
    e.preventDefault(); if (!camp.trim()) return;
    const { error } = await supabase.from('campaigns').insert({ name: camp.trim() }); if (error) return fail();
    setCamp(''); ctx.reloadRefs();
  }
  async function toggle(c) { const { error } = await supabase.from('campaigns').update({ active: !c.active }).eq('id', c.id); if (error) fail(); ctx.reloadRefs(); }
  async function saveTpl() {
    const { error } = await supabase.from('settings').upsert([{ key: 'whatsapp_ar', value: tpl.whatsapp_ar }, { key: 'whatsapp_en', value: tpl.whatsapp_en }]);
    if (error) return fail(); ctx.toast(t('editSaved')); ctx.reloadRefs();
  }
  return (
    <div className="view">
      <div className="panel">
        <h3>{t('campTitle')}</h3>
        <p className="hint" style={{ margin: 0 }}>{t('campHint')}</p>
        <form className="bar" onSubmit={addCamp}>
          <div className="field grow"><label htmlFor="c-name">{t('campName')}</label><input id="c-name" value={camp} onChange={e => setCamp(e.target.value)} /></div>
          <button className="btn primary">{t('campAdd')}</button>
        </form>
        <div className="scroll"><table className="mini"><tbody>
          {ctx.campaigns.map(c => <tr key={c.id}><td>{c.name}</td><td><label className="actions" style={{ alignItems: 'center' }}><input type="checkbox" checked={c.active} onChange={() => toggle(c)} /> {t('campActive')}</label></td></tr>)}
        </tbody></table></div>
      </div>
      <div className="panel">
        <h3>{t('waTitle')}</h3>
        <span className="hint">{t('waHint')}</span>
        <div className="field"><label htmlFor="w-ar">عربي</label><textarea id="w-ar" value={tpl.whatsapp_ar} onChange={e => setTpl(x => ({ ...x, whatsapp_ar: e.target.value }))} /></div>
        <div className="field"><label htmlFor="w-en">English</label><textarea id="w-en" dir="ltr" value={tpl.whatsapp_en} onChange={e => setTpl(x => ({ ...x, whatsapp_en: e.target.value }))} /></div>
        <div><button className="btn primary" onClick={saveTpl}>{t('saveTpl')}</button></div>
      </div>
      <div className="panel">
        <h3>{t('metaTitle')}</h3>
        <p style={{ margin: 0 }}>{t('metaHint')}</p>
      </div>
    </div>
  );
}
