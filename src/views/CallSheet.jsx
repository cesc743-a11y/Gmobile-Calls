import { useEffect, useMemo, useRef, useState } from 'react';
import { supabase, normPhone, isMobile, toNum, priceBucket, waLink, dayKey, addDays, fmtDay, fmtTime, fmtDate } from '../lib/util.js';
import { useT, money } from '../lib/i18n.js';
import { usePhoneHistory } from './Calls.jsx';
import { describeEvent } from './ActivityLog.jsx';
import { CalButtons } from './FollowUps.jsx';

const EMPTY = { phone: '', name: '', email: '', address: '', category: 'iphone', device: '', product_id: null, price_range: '', quoted_price: '', sale_amount: '', source: '', campaign_id: '', ad_id: '', branch: '', status: 'inquiry', cancel_reason: '', cancel_note: '', follow_up_date: '', notes: '', owner_id: '' };
const EDITABLE = Object.keys(EMPTY);

export default function CallSheet({ ctx, call, onClose, onSaved }) {
  const { t, L, opts, lang } = useT();
  const isNew = !call;
  const [d, setD] = useState(() => {
    const base = { ...EMPTY, owner_id: ctx.me.id };
    if (call) for (const k of EDITABLE) base[k] = call[k] ?? EMPTY[k];
    for (const k of ['quoted_price', 'sale_amount']) base[k] = base[k] === null || base[k] === undefined ? '' : String(base[k]);
    return base;
  });
  const set = (k, v) => setD(x => ({ ...x, [k]: v }));
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [confirmDel, setConfirmDel] = useState(false);
  const [events, setEvents] = useState([]);
  const [copied, setCopied] = useState(false);
  const phone = normPhone(d.phone);
  const hist = usePhoneHistory(phone);
  const prevCalls = (hist && hist.calls || []).filter(c => !call || c.id !== call.id);
  const firstRef = useRef();

  useEffect(() => { firstRef.current && firstRef.current.focus(); }, []);
  useEffect(() => {
    if (isNew) return;
    supabase.from('call_events').select('*').eq('call_id', call.id).order('at').then(({ data }) => setEvents(data || []));
  }, [call, isNew]);
  useEffect(() => { if (isNew && prevCalls.length) { const p = prevCalls[0]; setD(x => ({ ...x, name: x.name || p.name, email: x.email || p.email || '', address: x.address || p.address || '' })); } }, [hist]); // eslint-disable-line
  useEffect(() => { const onKey = e => { if (e.key === 'Escape') onClose(); }; window.addEventListener('keydown', onKey); return () => window.removeEventListener('keydown', onKey); }, [onClose]);

  const waTpl = ctx.settings[lang === 'ar' ? 'whatsapp_ar' : 'whatsapp_en'] || '';
  const waHref = isMobile(phone) ? waLink(phone, waTpl, { name: d.name.split(' ')[0], device: d.device, price: d.quoted_price ? money(toNum(d.quoted_price)) : '' }) : null;
  const ownerOptions = ctx.profiles.filter(p => p.active || p.id === d.owner_id);

  async function save() {
    const data = { ...d, phone, name: d.name.trim(), device: d.device.trim(), notes: d.notes.trim(), cancel_note: d.cancel_note.trim(), email: d.email.trim().toLowerCase(), address: d.address.trim() };
    data.quoted_price = toNum(d.quoted_price); data.sale_amount = toNum(d.sale_amount);
    for (const k of ['email', 'address', 'price_range', 'source', 'campaign_id', 'ad_id', 'branch', 'cancel_reason', 'follow_up_date', 'owner_id']) if (!data[k]) data[k] = null;
    if (!data.price_range && data.quoted_price) data.price_range = priceBucket(data.quoted_price);
    if (data.status !== 'cancelled') { data.cancel_reason = null; data.cancel_note = null; }
    if (data.status !== 'delivered') data.sale_amount = data.sale_amount ?? null;
    const miss = [];
    if (phone.length < 8) miss.push(t('fPhone')); if (!data.name) miss.push(t('fName')); if (!data.device) miss.push(t('fDevice'));
    if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) { setErr(t('badEmail')); return; }
    if (data.status === 'cancelled' && !data.cancel_reason) miss.push(t('fCancel'));
    if (data.status === 'delivered' && data.sale_amount == null) miss.push(t('fSale'));
    if (miss.length) { setErr(t('mustFill') + miss.join(lang === 'ar' ? '، ' : ', ')); return; }
    setBusy(true); setErr('');
    try {
      if (isNew) {
        for (const k of ['ad_id', 'email', 'address']) if (!data[k]) delete data[k]; // empty optional columns are left out so saving works before the latest SQL update is run
        const { error } = await supabase.from('calls').insert(data); if (error) throw error;
        ctx.toast(t('saved'));
      } else {
        const patch = {};
        for (const k of EDITABLE) { const a = call[k] ?? null, b = data[k] ?? null; if (String(a ?? '') !== String(b ?? '')) patch[k] = b; }
        if (!Object.keys(patch).length) { ctx.toast(t('noChange')); onClose(); return; }
        const { error } = await supabase.from('calls').update(patch).eq('id', call.id); if (error) throw error;
        ctx.toast(t('editSaved'));
      }
      onSaved(); onClose();
    } catch (e) { setErr(e && e.code === '42501' ? t('errPerm') : t('errNet')); }
    finally { setBusy(false); }
  }
  async function del() {
    if (!confirmDel) { setConfirmDel(true); return; }
    const { error } = await supabase.from('calls').delete().eq('id', call.id);
    if (error) { setErr(t('errPerm')); return; }
    ctx.toast(t('deleted')); onSaved(); onClose();
  }
  async function copy() { try { await navigator.clipboard.writeText(phone); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch {} }
  const quick = n => set('follow_up_date', addDays(dayKey(), n));

  return (
    <>
      <div className="scrim" onClick={onClose} />
      <div className="sheet" role="dialog" aria-modal="true" aria-label={t(isNew ? 'newTitle' : 'detailTitle')}>
        <div className="sheet-head">
          <h2>{isNew ? t('newTitle') : (call.name || t('detailTitle'))}</h2>
          {!isNew && <span className="hint">{fmtDay(call.call_date, lang)} {fmtTime(call.created_at, lang)}</span>}
          <button className="btn" onClick={onClose} aria-label={t('close')}>✕</button>
        </div>
        <div className="sheet-body">
          <div className="grid2">
            <div className="field"><label htmlFor="s-phone">{t('fPhone')}<span className="req"> *</span></label>
              <input id="s-phone" ref={isNew ? firstRef : null} className="mono" dir="ltr" inputMode="tel" placeholder="01xxxxxxxxx" value={d.phone} onChange={e => set('phone', e.target.value)} /></div>
            <div className="field"><label htmlFor="s-name">{t('fName')}<span className="req"> *</span></label>
              <input id="s-name" value={d.name} onChange={e => set('name', e.target.value)} /></div>
          </div>
          <div className="grid2">
            <div className="field"><label htmlFor="s-email">{t('fEmail')}{t('optional')}</label>
              <input id="s-email" type="email" dir="ltr" autoComplete="off" placeholder="name@gmail.com" value={d.email} onChange={e => set('email', e.target.value)} /></div>
            <div className="field"><label htmlFor="s-addr">{t('fAddress')}{t('optional')}</label>
              <input id="s-addr" placeholder={t('fAddressPh')} value={d.address} onChange={e => set('address', e.target.value)} /></div>
          </div>
          {phone.length >= 8 && !isMobile(phone) && <div className="hint">{t('notMobile')}</div>}
          {isMobile(phone) && <div className="actions">
            <a className="btn small wa" href={waHref} target="_blank" rel="noopener noreferrer">{t('whatsapp')}</a>
            <button type="button" className="btn small" onClick={copy}>{copied ? t('copied') : t('copyPhone')}</button>
          </div>}
          {prevCalls.length > 0 && <div className="prev"><b>{t('calledBefore', prevCalls.length, prevCalls[0].name)}</b>
            <ul>{prevCalls.slice(0, 6).map(x => <li key={x.id}>{fmtDay(x.call_date, lang)}: {x.device} · {L('status', x.status)}</li>)}</ul></div>}

          <div className="field"><span className="lbl">{t('fCategory')}</span>
            <div className="seg plain" role="group">{opts('cat').map(([k, v]) => <button key={k} type="button" aria-pressed={d.category === k} onClick={() => set('category', k)}>{v}</button>)}</div></div>
          <ProductPicker ctx={ctx} d={d} setD={setD} firstRef={isNew ? null : firstRef} />
          <div className="grid2">
            <div className="field"><label htmlFor="s-quoted">{t('fQuoted')}{t('optional')}</label>
              <input id="s-quoted" inputMode="numeric" dir="ltr" placeholder="61,999" value={d.quoted_price} onChange={e => { const v = e.target.value; setD(x => ({ ...x, quoted_price: v, price_range: priceBucket(toNum(v)) || x.price_range })); }} /></div>
            <div className="field"><label htmlFor="s-range">{t('fPrice')}</label>
              <select id="s-range" value={d.price_range || ''} onChange={e => set('price_range', e.target.value)}><option value="">{t('choose')}</option>{opts('price').map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></div>
          </div>

          <div className="field"><span className="lbl">{t('fStatus')}</span>
            <div className="seg" role="group">{opts('status').map(([k, v]) => <button key={k} type="button" className={'st-' + k} aria-pressed={d.status === k} onClick={() => set('status', k)}>{v}</button>)}</div></div>
          {d.status === 'delivered' && <div className="field"><label htmlFor="s-sale">{t('fSale')}<span className="req"> *</span></label>
            <input id="s-sale" inputMode="numeric" dir="ltr" value={d.sale_amount} onChange={e => set('sale_amount', e.target.value)} placeholder={d.quoted_price || ''} /><span className="hint">{t('fSaleHint')}</span></div>}
          {d.status === 'cancelled' && <div className="grid2">
            <div className="field"><label htmlFor="s-cancel">{t('fCancel')}<span className="req"> *</span></label>
              <select id="s-cancel" value={d.cancel_reason || ''} onChange={e => set('cancel_reason', e.target.value)}><option value="">{t('fCancelPick')}</option>{opts('cancel').map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></div>
            <div className="field"><label htmlFor="s-cnote">{t('fCancelNote')}</label><input id="s-cnote" value={d.cancel_note || ''} onChange={e => set('cancel_note', e.target.value)} /></div>
          </div>}
          {['inquiry', 'booked', 'not_delivered'].includes(d.status) && <div className="field"><label htmlFor="s-follow">{t('fFollow')}{t('optional')}</label>
            <div className="actions" style={{ alignItems: 'center' }}>
              <input id="s-follow" type="date" className="inp" style={{ width: 'auto' }} value={d.follow_up_date || ''} onChange={e => set('follow_up_date', e.target.value)} />
              {[[1, lang === 'ar' ? 'بكرة' : 'Tomorrow'], [3, lang === 'ar' ? 'بعد 3 أيام' : 'In 3 days'], [7, lang === 'ar' ? 'بعد أسبوع' : 'In a week']].map(([n, l]) => <button key={n} type="button" className="btn small" onClick={() => quick(n)}>{l}</button>)}
              {d.follow_up_date && <button type="button" className="btn small" onClick={() => set('follow_up_date', '')}>✕</button>}
            </div>
            {d.follow_up_date && <><span className="hint">{t('fuCal')}: {t('calHint')}</span>
              <div className="actions"><CalButtons c={{ ...d, id: call && call.id, phone, quoted_price: toNum(d.quoted_price) }} ctx={ctx} /></div></>}
          </div>}

          <div className="grid2">
            <div className="field"><label htmlFor="s-owner">{t('fOwner')}</label>
              <select id="s-owner" value={d.owner_id || ''} onChange={e => set('owner_id', e.target.value)}>{ownerOptions.map(p => <option key={p.id} value={p.id}>{p.full_name || p.email}</option>)}</select></div>
            <div className="field"><label htmlFor="s-branch">{t('fBranch')}{t('optional')}</label>
              <select id="s-branch" value={d.branch || ''} onChange={e => set('branch', e.target.value)}><option value="">—</option>{opts('branch').map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></div>
          </div>
          <div className="field"><label htmlFor="s-source">{t('fSource')}{t('optional')}</label>
            <select id="s-source" value={d.source || ''} onChange={e => set('source', e.target.value)}><option value="">—</option>{opts('source').map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></div>
          <AdPicker ctx={ctx} d={d} setD={setD} />
          <div className="field"><label htmlFor="s-notes">{t('fNotes')}</label><textarea id="s-notes" value={d.notes || ''} onChange={e => set('notes', e.target.value)} /></div>

          {!isNew && <section style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <h3>{t('history')}</h3>
            <div className="timeline">{events.map(ev => { const [who, verb, rest] = describeEvent(ev, ctx, t, L, lang); return <div key={ev.id} className="ev"><time>{fmtDate(ev.at, lang)} {fmtTime(ev.at, lang)}</time><span className="who">{who}</span>{verb}<span className="ch">{rest}</span></div>; })}</div>
          </section>}
        </div>
        {err && <div style={{ padding: '0 18px' }}><div className="err">{err}</div></div>}
        <div className="sheet-foot">
          <button className="btn primary" disabled={busy} onClick={save}>{busy ? t('saving') : t(isNew ? 'saveNew' : 'saveEdit')}</button>
          <button className="btn" onClick={onClose}>{t('cancel')}</button>
          {!isNew && ctx.isAdmin && <button className="btn danger" style={{ marginInlineStart: 'auto' }} onClick={del}>{confirmDel ? t('delConfirm') : t('del')}</button>}
        </div>
      </div>
    </>
  );
}

function ProductPicker({ ctx, d, setD, firstRef }) {
  const { t } = useT();
  const [open, setOpen] = useState(false);
  const [hi, setHi] = useState(0);
  const list = useMemo(() => {
    const q = d.device.trim().toLowerCase();
    return ctx.products.filter(p => p.active && p.category === d.category && (!q || p.name.toLowerCase().includes(q))).slice(0, 30);
  }, [ctx.products, d.device, d.category]);
  const pick = p => { setD(x => ({ ...x, device: p.name, product_id: p.id, quoted_price: p.price != null ? String(p.price) : x.quoted_price, price_range: p.price != null ? priceBucket(Number(p.price)) : x.price_range })); setOpen(false); };
  return (
    <div className="field picker"><label htmlFor="s-device">{t('fDevice')}<span className="req"> *</span></label>
      <input id="s-device" ref={firstRef} autoComplete="off" placeholder={t('fDevicePh')} value={d.device}
        onFocus={() => setOpen(true)} onBlur={() => setTimeout(() => setOpen(false), 150)}
        onChange={e => { const v = e.target.value; setD(x => ({ ...x, device: v, product_id: null })); setOpen(true); setHi(0); }}
        onKeyDown={e => { if (!open || !list.length) return; if (e.key === 'ArrowDown') { e.preventDefault(); setHi(h => Math.min(h + 1, list.length - 1)); } else if (e.key === 'ArrowUp') { e.preventDefault(); setHi(h => Math.max(h - 1, 0)); } else if (e.key === 'Enter') { e.preventDefault(); pick(list[hi]); } }} />
      {open && list.length > 0 && <div className="menu" role="listbox">
        {list.map((p, i) => <button key={p.id} type="button" className={i === hi ? 'on' : ''} onMouseDown={e => e.preventDefault()} onClick={() => pick(p)}>
          <span>{p.name}{!p.in_stock && <span className="sub">{t('outStock')}</span>}</span><span className="mono">{p.price != null ? money(p.price) : ''}</span></button>)}
      </div>}
      {d.product_id && <span className="hint">{t('fromList')}</span>}
    </div>
  );
}

const isRunning = st => st === 'ACTIVE' || st === 'WITH_ISSUES';

// Campaign -> ad, or paste an ad / campaign ID from Ads Manager and both get filled in.
function AdPicker({ ctx, d, setD }) {
  const { t } = useT();
  const [code, setCode] = useState('');
  const camps = ctx.campaigns.filter(c => c.active || c.id === d.campaign_id);
  const running = camps.filter(c => !c.meta_id || isRunning(c.status)), paused = camps.filter(c => c.meta_id && !isRunning(c.status));
  const ads = d.campaign_id ? ctx.ads.filter(a => a.campaign_id === d.campaign_id).sort((a, b) => Number(isRunning(b.status)) - Number(isRunning(a.status))) : [];
  const q = code.replace(/\D/g, '');
  const hitAd = q.length >= 6 ? ctx.ads.find(a => a.meta_id === q) : null;
  const hitCamp = q.length >= 6 && !hitAd ? ctx.campaigns.find(c => c.meta_id === q) : null;
  function onCode(v) {
    setCode(v);
    const id = v.replace(/\D/g, ''); if (id.length < 6) return;
    const ad = ctx.ads.find(a => a.meta_id === id);
    if (ad) { setD(x => ({ ...x, ad_id: ad.id, campaign_id: ad.campaign_id || x.campaign_id })); return; }
    const c = ctx.campaigns.find(x => x.meta_id === id);
    if (c) setD(x => ({ ...x, campaign_id: c.id, ad_id: '' }));
  }
  const opt = c => <option key={c.id} value={c.id}>{c.name}</option>;
  return (
    <div className="adbox">
      <div className="field"><label htmlFor="s-adcode">{t('fAdCode')}{t('optional')}</label>
        <input id="s-adcode" className="mono" dir="ltr" inputMode="numeric" autoComplete="off" placeholder={t('fAdCodePh')} value={code} onChange={e => onCode(e.target.value)} />
        {hitAd && <span className="hint ok">{t('adFound', hitAd.name)}</span>}
        {hitCamp && <span className="hint ok">{t('adFound', hitCamp.name)}</span>}
        {q.length >= 6 && !hitAd && !hitCamp && <span className="hint warn">{t('adNotFound')}</span>}
      </div>
      <div className="grid2">
        <div className="field"><label htmlFor="s-camp">{t('fCampaign')}{t('optional')}</label>
          <select id="s-camp" value={d.campaign_id || ''} onChange={e => setD(x => ({ ...x, campaign_id: e.target.value, ad_id: '' }))}>
            <option value="">—</option>
            {paused.length ? <><optgroup label={t('grpActive')}>{running.map(opt)}</optgroup><optgroup label={t('grpPaused')}>{paused.map(opt)}</optgroup></> : running.map(opt)}
          </select></div>
        <div className="field"><label htmlFor="s-ad">{t('fAd')}{t('optional')}</label>
          <select id="s-ad" value={d.ad_id || ''} disabled={!d.campaign_id} onChange={e => setD(x => ({ ...x, ad_id: e.target.value }))}>
            <option value="">{d.campaign_id ? '—' : t('pickCampFirst')}</option>
            {ads.map(a => <option key={a.id} value={a.id}>{a.name}{isRunning(a.status) ? '' : ' · ' + t('stStopped')}</option>)}
          </select></div>
      </div>
    </div>
  );
}
