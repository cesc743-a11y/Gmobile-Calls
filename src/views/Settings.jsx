import { useEffect, useMemo, useState } from 'react';
import { supabase, fmtDate, fmtTime } from '../lib/util.js';
import { useT } from '../lib/i18n.js';

const isRunning = st => st === 'ACTIVE' || st === 'WITH_ISSUES';
const match = (q, ...xs) => !q || xs.some(x => String(x || '').toLowerCase().includes(q));

export default function Settings({ ctx }) {
  const { t, lang } = useT();
  const [camp, setCamp] = useState({ name: '', meta_id: '' });
  const [ad, setAd] = useState({ meta_id: '', name: '', campaign_id: '' });
  const [cq, setCq] = useState('');
  const [aq, setAq] = useState('');
  const [sync, setSync] = useState({ busy: false, msg: '', bad: false });
  const [tpl, setTpl] = useState({ whatsapp_ar: '', whatsapp_en: '' });
  useEffect(() => { setTpl({ whatsapp_ar: ctx.settings.whatsapp_ar || '', whatsapp_en: ctx.settings.whatsapp_en || '' }); }, [ctx.settings]);
  const fail = e => ctx.toast(e && e.code === '23505' ? t('idTaken') : t('errNet'));
  const digits = v => v.replace(/\D/g, '');

  const adCount = useMemo(() => { const m = {}; ctx.ads.forEach(a => { m[a.campaign_id] = (m[a.campaign_id] || 0) + 1; }); return m; }, [ctx.ads]);
  const camps = useMemo(() => {
    const q = cq.trim().toLowerCase();
    return ctx.campaigns.filter(c => match(q, c.name, c.meta_id)).sort((a, b) => Number(isRunning(b.status) || !b.meta_id) - Number(isRunning(a.status) || !a.meta_id));
  }, [ctx.campaigns, cq]);
  const ads = useMemo(() => {
    const q = aq.trim().toLowerCase();
    return ctx.ads.filter(a => match(q, a.name, a.meta_id, ctx.campaignOf(a.campaign_id))).sort((a, b) => Number(isRunning(b.status)) - Number(isRunning(a.status)));
  }, [ctx.ads, aq, ctx.campaignOf]);

  async function runSync() {
    setSync({ busy: true, msg: '', bad: false });
    const { data, error } = await supabase.functions.invoke('meta-sync', { body: {} });
    let msg, bad = true;
    if (!error && data && data.ok) { msg = t('syncDone', data.campaigns, data.ads); bad = false; }
    else {
      let body = data;
      try { if (error && error.context && error.context.json) body = await error.context.json(); } catch {}
      const status = error && error.context && error.context.status;
      msg = (status === 404 || !body || body.error === 'not_configured') ? t('syncNotSetup') : t('syncFail', body.error || (error && error.message) || '');
    }
    setSync({ busy: false, msg, bad });
    if (!bad) ctx.reloadRefs();
  }
  async function addCamp(e) {
    e.preventDefault(); if (!camp.name.trim()) return;
    const { error } = await supabase.from('campaigns').insert({ name: camp.name.trim(), meta_id: digits(camp.meta_id) || null }); if (error) return fail(error);
    setCamp({ name: '', meta_id: '' }); ctx.reloadRefs();
  }
  async function toggle(c) { const { error } = await supabase.from('campaigns').update({ active: !c.active }).eq('id', c.id); if (error) fail(error); ctx.reloadRefs(); }
  async function addAd(e) {
    e.preventDefault(); const id = digits(ad.meta_id); if (!id) return;
    const { error } = await supabase.from('ads').insert({ meta_id: id, name: ad.name.trim() || id, campaign_id: ad.campaign_id || null }); if (error) return fail(error);
    setAd(x => ({ meta_id: '', name: '', campaign_id: x.campaign_id })); ctx.reloadRefs();
  }
  async function saveTpl() {
    const { error } = await supabase.from('settings').upsert([{ key: 'whatsapp_ar', value: tpl.whatsapp_ar }, { key: 'whatsapp_en', value: tpl.whatsapp_en }]);
    if (error) return fail(error); ctx.toast(t('editSaved')); ctx.reloadRefs();
  }
  const last = ctx.settings.meta_synced_at;
  const pill = st => st ? <span className={'pill' + (isRunning(st) ? ' on' : '')}>{isRunning(st) ? t('stRunning') : t('stStopped')}</span> : null;
  const shownAds = ads.slice(0, 200);

  return (
    <div className="view">
      <div className="panel">
        <h3>{t('syncTitle')}</h3>
        <p className="hint" style={{ margin: 0 }}>{t('syncHint')}</p>
        <div className="actions" style={{ alignItems: 'center' }}>
          <button className="btn primary" disabled={sync.busy} onClick={runSync}>{sync.busy ? t('syncing') : t('syncBtn')}</button>
          <span className="hint">{last ? t('lastSync', fmtDate(last, lang) + ' ' + fmtTime(last, lang)) : t('neverSynced')}</span>
        </div>
        {sync.msg && <div className={sync.bad ? 'err' : 'note'}>{sync.msg}</div>}
      </div>

      <div className="panel">
        <h3>{t('campTitle')} <span className="hint">({ctx.campaigns.length})</span></h3>
        <p className="hint" style={{ margin: 0 }}>{t('campHint')}</p>
        <form className="bar" onSubmit={addCamp}>
          <div className="field grow"><label htmlFor="c-name">{t('campName')}</label><input id="c-name" value={camp.name} onChange={e => setCamp(x => ({ ...x, name: e.target.value }))} /></div>
          <div className="field"><label htmlFor="c-meta">{t('campMetaId')}</label><input id="c-meta" className="mono" dir="ltr" inputMode="numeric" value={camp.meta_id} onChange={e => setCamp(x => ({ ...x, meta_id: e.target.value }))} /></div>
          <button className="btn primary">{t('campAdd')}</button>
        </form>
        <input className="inp" type="search" placeholder={t('campSearch')} value={cq} onChange={e => setCq(e.target.value)} aria-label={t('campSearch')} />
        <div className="scroll tall"><table className="mini">
          <thead><tr><th>{t('campName')}</th><th>Meta ID</th><th>{t('colStatus')}</th><th className="r">{t('aAds')}</th><th>{t('campActive')}</th></tr></thead>
          <tbody>{camps.map(c => <tr key={c.id}>
            <td>{c.name}</td>
            <td className="mono hint">{c.meta_id || '—'}</td>
            <td>{pill(c.status)}</td>
            <td className="r">{adCount[c.id] || 0}</td>
            <td><input type="checkbox" checked={c.active} onChange={() => toggle(c)} aria-label={t('campActive')} /></td>
          </tr>)}</tbody>
        </table></div>
      </div>

      <div className="panel">
        <h3>{t('adsTitle')} <span className="hint">({ctx.ads.length})</span></h3>
        <p className="hint" style={{ margin: 0 }}>{t('adsHint')}</p>
        <form className="bar" onSubmit={addAd}>
          <div className="field"><label htmlFor="a-id">{t('adId')}</label><input id="a-id" className="mono" dir="ltr" inputMode="numeric" value={ad.meta_id} onChange={e => setAd(x => ({ ...x, meta_id: e.target.value }))} /></div>
          <div className="field grow"><label htmlFor="a-name">{t('adName')}</label><input id="a-name" value={ad.name} onChange={e => setAd(x => ({ ...x, name: e.target.value }))} /></div>
          <div className="field"><label htmlFor="a-camp">{t('colCampaign')}</label>
            <select id="a-camp" value={ad.campaign_id} onChange={e => setAd(x => ({ ...x, campaign_id: e.target.value }))}><option value="">—</option>{ctx.campaigns.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
          <button className="btn primary">{t('adAdd')}</button>
        </form>
        <input className="inp" type="search" placeholder={t('campSearch')} value={aq} onChange={e => setAq(e.target.value)} aria-label={t('campSearch')} />
        <div className="scroll tall"><table className="mini">
          <thead><tr><th>{t('adName')}</th><th>{t('adId')}</th><th>{t('colCampaign')}</th><th>{t('colStatus')}</th></tr></thead>
          <tbody>{shownAds.map(a => <tr key={a.id}><td>{a.name}</td><td className="mono hint">{a.meta_id}</td><td>{ctx.campaignOf(a.campaign_id) || '—'}</td><td>{pill(a.status)}</td></tr>)}</tbody>
        </table></div>
        {ads.length > shownAds.length && <span className="hint">{t('showing', shownAds.length, ads.length)}</span>}
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
