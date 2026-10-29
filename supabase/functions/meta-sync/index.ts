// Pulls campaigns and ads from Meta into the campaigns / ads tables.
//
// Secrets (Supabase → Edge Functions → Secrets):
//   META_ACCESS_TOKEN    system-user token with ads_read on the ad accounts
//   META_AD_ACCOUNT_IDS  comma-separated numeric ids, e.g. 2722557198091937,850026391409278
//   CRON_SECRET          optional; lets a scheduled job call this without a signed-in admin
// SUPABASE_URL, SUPABASE_ANON_KEY and SUPABASE_SERVICE_ROLE_KEY are provided by Supabase.
import { createClient } from 'npm:@supabase/supabase-js@2.45.4';

const API = 'https://graph.facebook.com/' + (Deno.env.get('META_API_VERSION') || 'v23.0');
const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-cron-secret',
};
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

async function fetchAll(path: string, params: Record<string, string>, token: string) {
  const out: any[] = [];
  let url: string | null = `${API}/${path}?` + new URLSearchParams({ ...params, limit: '500', access_token: token });
  while (url) {
    const r = await fetch(url);
    const body = await r.json();
    if (!r.ok || body.error) throw new Error(body.error?.message || `Meta API ${r.status}`);
    out.push(...(body.data || []));
    url = body.paging?.next || null;
  }
  return out;
}

Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  const url = Deno.env.get('SUPABASE_URL')!;
  const token = Deno.env.get('META_ACCESS_TOKEN');
  const accounts = (Deno.env.get('META_AD_ACCOUNT_IDS') || '').split(',').map(s => s.trim().replace(/^act_/, '')).filter(Boolean);
  if (!token || !accounts.length) return json({ error: 'not_configured' }, 400);

  // Only a signed-in admin, or the scheduled job holding CRON_SECRET, may sync.
  const cron = Deno.env.get('CRON_SECRET');
  if (!(cron && req.headers.get('x-cron-secret') === cron)) {
    const caller = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: req.headers.get('Authorization') || '' } } });
    const { data: isAdmin } = await caller.rpc('is_admin');
    if (!isAdmin) return json({ error: 'forbidden' }, 403);
  }

  const db = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const now = new Date().toISOString();
  const skip = new Set(['DELETED', 'ARCHIVED']);
  let campaigns = 0, ads = 0;
  try {
    for (const acc of accounts) {
      const cs = (await fetchAll(`act_${acc}/campaigns`, { fields: 'id,name,objective,effective_status' }, token)).filter(c => !skip.has(c.effective_status));
      if (cs.length) {
        const { error } = await db.from('campaigns').upsert(cs.map(c => ({ meta_id: c.id, name: c.name, account_id: acc, objective: c.objective, status: c.effective_status, synced_at: now })), { onConflict: 'meta_id' });
        if (error) throw error;
        campaigns += cs.length;
      }
      const as = (await fetchAll(`act_${acc}/ads`, { fields: 'id,name,campaign_id,effective_status' }, token)).filter(a => !skip.has(a.effective_status));
      const { data: map, error: mapErr } = await db.from('campaigns').select('id,meta_id').eq('account_id', acc);
      if (mapErr) throw mapErr;
      const byMeta = new Map((map || []).map(r => [r.meta_id, r.id]));
      for (let i = 0; i < as.length; i += 500) {
        const { error } = await db.from('ads').upsert(as.slice(i, i + 500).map(a => ({ meta_id: a.id, name: a.name, campaign_id: byMeta.get(a.campaign_id) ?? null, status: a.effective_status, synced_at: now })), { onConflict: 'meta_id' });
        if (error) throw error;
      }
      ads += as.length;
    }
    await db.from('settings').upsert({ key: 'meta_synced_at', value: now });
    return json({ ok: true, campaigns, ads, synced_at: now });
  } catch (e) {
    return json({ error: String((e as Error).message || e) }, 502);
  }
});
