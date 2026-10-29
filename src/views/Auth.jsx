import { useState } from 'react';
import { supabase } from '../lib/util.js';
import { useT } from '../lib/i18n.js';

function Shell({ children, onLang }) {
  const { t, lang } = useT();
  return (
    <div className="auth">
      <div className="box">
        <div className="logo">
          <img src="/icon.svg" alt="" />
          <div style={{ marginInlineEnd: 'auto' }}><h1>{t('appName')}</h1><span className="hint">{t('tagline')}</span></div>
          <button className="lang" type="button" onClick={onLang}>{lang === 'ar' ? 'English' : 'عربي'}</button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function Login({ onLang }) {
  const { t } = useT();
  const [mode, setMode] = useState('in');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [msg, setMsg] = useState(null);
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault(); setMsg(null); setBusy(true);
    try {
      if (mode === 'in') {
        const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (error) setMsg(['err', error.message.includes('Invalid') ? t('badLogin') : t('authErr') + error.message]);
      } else if (mode === 'up') {
        if (password.length < 8) { setMsg(['err', t('passMin')]); return; }
        const { error } = await supabase.auth.signUp({ email: email.trim(), password, options: { data: { full_name: fullName.trim() }, emailRedirectTo: window.location.origin } });
        setMsg(error ? ['err', t('authErr') + error.message] : ['ok', t('signUpDone')]);
      } else {
        const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: window.location.origin });
        setMsg(error ? ['err', t('authErr') + error.message] : ['ok', t('resetSent')]);
      }
    } finally { setBusy(false); }
  }

  return (
    <Shell onLang={onLang}>
      <div className="seg plain" role="tablist">
        <button type="button" aria-pressed={mode === 'in'} onClick={() => { setMode('in'); setMsg(null); }}>{t('signIn')}</button>
        <button type="button" aria-pressed={mode === 'up'} onClick={() => { setMode('up'); setMsg(null); }}>{t('signUp')}</button>
      </div>
      <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {mode === 'up' && <div className="field"><label htmlFor="a-name">{t('fullName')}</label><input id="a-name" required value={fullName} onChange={e => setFullName(e.target.value)} autoComplete="name" /></div>}
        <div className="field"><label htmlFor="a-email">{t('email')}</label><input id="a-email" type="email" required dir="ltr" value={email} onChange={e => setEmail(e.target.value)} autoComplete="email" /></div>
        {mode !== 'reset' && <div className="field"><label htmlFor="a-pass">{t('password')}</label><input id="a-pass" type="password" required dir="ltr" value={password} onChange={e => setPassword(e.target.value)} autoComplete={mode === 'up' ? 'new-password' : 'current-password'} /></div>}
        {msg && <div className={msg[0]}>{msg[1]}</div>}
        <button className="btn primary" disabled={busy}>{mode === 'in' ? t('doSignIn') : mode === 'up' ? t('doSignUp') : t('sendReset')}</button>
      </form>
      {mode === 'in' && <button type="button" className="btn small" style={{ alignSelf: 'flex-start', border: 0 }} onClick={() => { setMode('reset'); setMsg(null); }}>{t('forgot')}</button>}
      {mode === 'reset' && <button type="button" className="btn small" style={{ alignSelf: 'flex-start', border: 0 }} onClick={() => { setMode('in'); setMsg(null); }}>{t('signIn')}</button>}
    </Shell>
  );
}

export function SetPassword({ onLang, onDone }) {
  const { t } = useT();
  const [password, setPassword] = useState('');
  const [msg, setMsg] = useState(null);
  async function submit(e) {
    e.preventDefault();
    if (password.length < 8) { setMsg(['err', t('passMin')]); return; }
    const { error } = await supabase.auth.updateUser({ password });
    if (error) setMsg(['err', t('authErr') + error.message]); else onDone();
  }
  return (
    <Shell onLang={onLang}>
      <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div className="field"><label htmlFor="n-pass">{t('newPass')}</label><input id="n-pass" type="password" dir="ltr" value={password} onChange={e => setPassword(e.target.value)} autoComplete="new-password" /></div>
        {msg && <div className={msg[0]}>{msg[1]}</div>}
        <button className="btn primary">{t('savePass')}</button>
      </form>
    </Shell>
  );
}

export function Pending({ onLang, onRefresh }) {
  const { t } = useT();
  return (
    <Shell onLang={onLang}>
      <div className="warn"><b>{t('pendingTitle')}</b><br />{t('pendingSub')}</div>
      <div className="actions"><button className="btn primary" onClick={onRefresh}>{t('refresh')}</button><button className="btn" onClick={() => supabase.auth.signOut()}>{t('signOut')}</button></div>
    </Shell>
  );
}

export function NotConfigured() {
  return <div className="auth"><div className="box"><div className="err">{'الموقع لسه مش متوصل بقاعدة البيانات. / The site isn’t connected to the database yet.'}<br /><span className="mono">VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY</span></div></div></div>;
}
