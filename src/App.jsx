import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { supabase, configured, dayKey, addDays, rangeFor, fmtMonth } from './lib/util.js';
import { LangContext, DICT, useT } from './lib/i18n.js';
import { Login, SetPassword, Pending, NotConfigured } from './views/Auth.jsx';
import Calls from './views/Calls.jsx';
import FollowUps from './views/FollowUps.jsx';
import Analysis from './views/Analysis.jsx';
import ActivityLog from './views/ActivityLog.jsx';
import Prices from './views/Prices.jsx';
import Team from './views/Team.jsx';
import Settings from './views/Settings.jsx';
import CallSheet from './views/CallSheet.jsx';
import { exportExcel, exportCsv, exportMeta } from './lib/exporters.js';

const FU_OPEN = ['inquiry', 'booked', 'not_delivered'];

export default function App() {
  const [lang, setLang] = useState(() => { try { return localStorage.getItem('gm-lang') === 'en' ? 'en' : 'ar'; } catch { return 'ar'; } });
  const toggleLang = () => setLang(l => { const n = l === 'ar' ? 'en' : 'ar'; try { localStorage.setItem('gm-lang', n); } catch {} return n; });
  useEffect(() => { document.documentElement.lang = lang; document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr'; document.title = DICT[lang].appName; }, [lang]);
  const ctx = useMemo(() => ({ lang }), [lang]);
  if (!configured) return <NotConfigured />;
  return <LangContext.Provider value={ctx}><Gate onLang={toggleLang} /></LangContext.Provider>;
}

function Gate({ onLang }) {
  const [session, setSession] = useState(undefined);
  const [recovery, setRecovery] = useState(false);
  const [me, setMe] = useState(undefined);
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data } = supabase.auth.onAuthStateChange((ev, s) => { setSession(s); if (ev === 'PASSWORD_RECOVERY') setRecovery(true); });
    return () => data.subscription.unsubscribe();
  }, []);
  const loadMe = useCallback(async () => {
    if (!session) { setMe(undefined); return; }
    const { data } = await supabase.from('profiles').select('*').eq('id', session.user.id).maybeSingle();
    setMe(data || null);
  }, [session]);
  useEffect(() => { loadMe(); }, [loadMe]);
  if (session === undefined) return null;
  if (recovery && session) return <SetPassword onLang={onLang} onDone={() => setRecovery(false)} />;
  if (!session) return <Login onLang={onLang} />;
  if (me === undefined) return null;
  if (!me || !me.active) return <Pending onLang={onLang} onRefresh={loadMe} />;
  return <Main me={me} onLang={onLang} reloadMe={loadMe} />;
}

function Main({ me, onLang, reloadMe }) {
  const { t, opts, lang } = useT();
  const isAdmin = me.role === 'admin';
  const [view, setView] = useState('calls');
  const [rangeSel, setRangeSel] = useState('30');
  const [custom, setCustom] = useState({ from: '', to: '' });
  const range = useMemo(() => rangeFor(rangeSel, custom), [rangeSel, custom]);
  const [filters, setFilters] = useState({ cat: '', owner: '', q: '', status: '' });
  const [calls, setCalls] = useState([]);
  const [truncated, setTruncated] = useState(false);
  const [follow, setFollow] = useState([]);
  const [profiles, setProfiles] = useState([]);
  const [products, setProducts] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [settings, setSettings] = useState({});
  const [sheet, setSheet] = useState(null);
  const [toastMsg, setToastMsg] = useState('');
  const toastT = useRef();
  const toast = m => { setToastMsg(m); clearTimeout(toastT.current); toastT.current = setTimeout(() => setToastMsg(''), 2600); };

  const loadCalls = useCallback(async () => {
    const { data, error } = await supabase.from('calls').select('*').gte('call_date', range.from).lte('call_date', range.to).order('created_at', { ascending: false }).limit(5000);
    if (!error) { setCalls(data); setTruncated(data.length >= 5000); }
  }, [range.from, range.to]);
  const loadFollow = useCallback(async () => {
    const { data } = await supabase.from('calls').select('*').not('follow_up_date', 'is', null).in('status', FU_OPEN).lte('follow_up_date', addDays(dayKey(), 14)).order('follow_up_date').limit(1000);
    if (data) setFollow(data);
  }, []);
  const loadRefs = useCallback(async () => {
    const [p, pr, c, s] = await Promise.all([
      supabase.from('profiles').select('*').order('created_at'),
      supabase.from('products').select('*').order('name'),
      supabase.from('campaigns').select('*').order('created_at', { ascending: false }),
      supabase.from('settings').select('*'),
    ]);
    if (p.data) setProfiles(p.data); if (pr.data) setProducts(pr.data); if (c.data) setCampaigns(c.data);
    if (s.data) setSettings(Object.fromEntries(s.data.map(r => [r.key, r.value])));
  }, []);
  useEffect(() => { loadCalls(); }, [loadCalls]);
  useEffect(() => { loadFollow(); loadRefs(); }, [loadFollow, loadRefs]);
  useEffect(() => {
    let tm;
    const ch = supabase.channel('calls-live').on('postgres_changes', { event: '*', schema: 'public', table: 'calls' }, () => { clearTimeout(tm); tm = setTimeout(() => { loadCalls(); loadFollow(); }, 400); }).subscribe();
    const onFocus = () => { loadCalls(); loadFollow(); loadRefs(); };
    window.addEventListener('focus', onFocus);
    return () => { supabase.removeChannel(ch); window.removeEventListener('focus', onFocus); clearTimeout(tm); };
  }, [loadCalls, loadFollow, loadRefs]);

  const nameOf = useMemo(() => { const m = Object.fromEntries(profiles.map(p => [p.id, p.full_name || p.email])); return id => m[id] || t('someone'); }, [profiles, lang]);
  const campaignOf = useMemo(() => { const m = Object.fromEntries(campaigns.map(c => [c.id, c.name])); return id => id ? (m[id] || '—') : ''; }, [campaigns]);
  const filtered = useMemo(() => {
    const q = filters.q.trim().toLowerCase(); const qp = q.replace(/\D/g, '');
    return calls.filter(c => {
      if (filters.cat && c.category !== filters.cat) return false;
      if (filters.owner && c.owner_id !== filters.owner) return false;
      if (q) { const hay = [c.name, c.device, c.notes].join(' ').toLowerCase(); if (!hay.includes(q) && !(qp.length >= 3 && (c.phone || '').includes(qp))) return false; }
      return true;
    });
  }, [calls, filters.cat, filters.owner, filters.q]);
  const today = dayKey();
  const dueCount = follow.filter(c => c.follow_up_date <= today).length;
  const after = async (fn) => { await fn; loadCalls(); loadFollow(); };
  const ctx = { me, isAdmin, t, lang, nameOf, campaignOf, profiles, products, campaigns, settings, toast, openCall: c => setSheet(c || 'new'), range, reloadRefs: loadRefs, reloadMe };

  const months = []; { let m = today.slice(0, 7); for (let i = 0; i < 36; i++) { months.push(m); m = addDays(m + '-01', -1).slice(0, 7); } }
  const tabs = [['calls', t('tabCalls')], ['follow', t('tabFollow')], ['analysis', t('tabAnalysis')], ['log', t('tabLog')], ['prices', t('tabPrices')], ['team', t('tabTeam')], ...(isAdmin ? [['settings', t('tabSettings')]] : [])];
  const showFilters = ['calls', 'analysis', 'log'].includes(view);

  return (
    <>
      <header className="top"><div className="wrap">
        <div className="brand"><b>{t('appName')}</b><span>{t('tagline')}</span></div>
        <nav className="tabs" role="tablist">
          {tabs.map(([k, label]) => <button key={k} role="tab" aria-selected={view === k} onClick={() => setView(k)}>{label}{k === 'follow' && dueCount > 0 && <span className="badge">{dueCount}</span>}</button>)}
        </nav>
        <button className="lang" type="button" onClick={onLang}>{lang === 'ar' ? 'English' : 'عربي'}</button>
        <div className="me"><span>{me.full_name || me.email}</span><button className="btn small" onClick={() => supabase.auth.signOut()}>{t('signOut')}</button></div>
      </div></header>
      <main className="wrap">
        {showFilters && (
          <div className="bar">
            <button className="btn primary newcall" onClick={() => setSheet('new')}>{t('newCall')}</button>
            <div className="field"><label htmlFor="f-range">{t('period')}</label>
              <select id="f-range" value={rangeSel} onChange={e => setRangeSel(e.target.value)}>
                <option value="today">{t('today')}</option><option value="yesterday">{t('yesterday')}</option><option value="7">{t('last7')}</option><option value="30">{t('last30')}</option>
                <optgroup label={t('byMonth')}>{months.map((m, i) => <option key={m} value={'m:' + m}>{(i === 0 ? t('thisMonth') : '') + fmtMonth(m, lang)}</option>)}</optgroup>
                <option value="custom">{t('custom')}</option>
              </select></div>
            {rangeSel === 'custom' && <>
              <div className="field"><label htmlFor="f-from">{t('from')}</label><input id="f-from" type="date" value={custom.from || range.from} onChange={e => setCustom(c => ({ ...c, from: e.target.value }))} /></div>
              <div className="field"><label htmlFor="f-to">{t('to')}</label><input id="f-to" type="date" value={custom.to || range.to} onChange={e => setCustom(c => ({ ...c, to: e.target.value }))} /></div>
            </>}
            <div className="field"><label htmlFor="f-cat">{t('category')}</label>
              <select id="f-cat" value={filters.cat} onChange={e => setFilters(f => ({ ...f, cat: e.target.value }))}><option value="">{t('all')}</option>{opts('cat').map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></div>
            <div className="field"><label htmlFor="f-owner">{t('owner')}</label>
              <select id="f-owner" value={filters.owner} onChange={e => setFilters(f => ({ ...f, owner: e.target.value }))}><option value="">{t('all')}</option>{profiles.filter(p => p.active).map(p => <option key={p.id} value={p.id}>{p.full_name || p.email}</option>)}</select></div>
            <div className="field grow"><label htmlFor="f-q">{t('search')}</label><input id="f-q" type="search" placeholder={t('searchPh')} value={filters.q} onChange={e => setFilters(f => ({ ...f, q: e.target.value }))} /></div>
            <button className="btn" onClick={() => exportExcel(filtered, ctx)}>{t('excel')}</button>
            <button className="btn" onClick={() => exportCsv(filtered, ctx)}>CSV</button>
            {isAdmin && <button className="btn" onClick={() => exportMeta(filtered, ctx)}>{t('metaCsv')}</button>}
          </div>
        )}
        {truncated && showFilters && <div className="warn">{t('more')}</div>}
        {view === 'calls' && <Calls ctx={ctx} calls={filtered} total={calls.length} status={filters.status} setStatus={s => setFilters(f => ({ ...f, status: s }))} q={filters.q} />}
        {view === 'follow' && <FollowUps ctx={ctx} items={follow} />}
        {view === 'analysis' && <Analysis ctx={ctx} calls={filtered} />}
        {view === 'log' && <ActivityLog ctx={ctx} />}
        {view === 'prices' && <Prices ctx={ctx} />}
        {view === 'team' && <Team ctx={ctx} />}
        {view === 'settings' && isAdmin && <Settings ctx={ctx} />}
      </main>
      <button className="btn primary fab" type="button" onClick={() => setSheet('new')}>{t('newCall')}</button>
      {sheet && <CallSheet ctx={ctx} call={sheet === 'new' ? null : sheet} onClose={() => setSheet(null)} onSaved={() => after(Promise.resolve())} />}
      {toastMsg && <div className="toast" role="status">{toastMsg}</div>}
    </>
  );
}

