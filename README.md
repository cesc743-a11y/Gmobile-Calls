# G Mobile — سجل المكالمات

سيستم داخلي للتيم يسجل كل مكالمة جاية من الإعلانات: مين اتصل، سأل على إيه، مين مسؤول عن الديل، وحصل فيها إيه. دخول بالإيميل والباسورد، وكل تعديل بيتسجل.

Internal call log for the G Mobile team. Email/password login, every change is audited, works on desktop and mobile, Arabic and English.

## المميزات / Features

- تسجيل المكالمة: الرقم، الاسم، الفئة، الجهاز (من قايمة الأسعار)، السعر، الحالة (سأل بس، حجز، استلم، ما استلمش، كنسل + السبب).
- مبلغ البيع عند الاستلام، وتحليلات المبيعات.
- مسؤول عن الديل لكل مكالمة، وترتيب التيم في قفل الديلز.
- ربط المكالمة بالكامبين، وملف Offline Conversions لميتا.
- تاريخ متابعة وقايمة متابعات النهارده.
- زرار واتساب برسالة جاهزة.
- قايمة أسعار يختار منها التيم.
- تقرير الطلب الضايع (أجهزة اتسأل عليها ومش متوفرة).
- تقسيم بالشهر واليوم بتوقيت القاهرة (التاريخ بيتحط أوتوماتيك من السيرفر).
- سجل تعديلات محمي: محدش يقدر يعدله أو يمسحه، ولا حتى الأدمن.
- تصدير Excel وCSV.
- كل كامبينز وإعلانات ميتا بأكوادها (Meta ID). الموظف يختار الكامبين والإعلان، أو يلصق كود الإعلان فيتملوا لوحدهم، والتحليل بيوريك كل إعلان جاب كام بيعة.
- مزامنة تلقائية مع ميتا (اختيارية) بتسحب الكامبينز والإعلانات الجديدة.
- التيم كله يقدر يضيف ويعدّل الأسعار، وكل تعديل بيتسجل في سجل الأسعار باسم وإيميل اللي عمله.

## التشغيل لأول مرة / First-time setup

### 1. Supabase

1. افتح المشروع في [supabase.com](https://supabase.com) ← **SQL Editor** ← New query.
2. الصق محتوى `supabase/schema.sql` كله واضغط **Run**. (الملف ممكن يتشغل أكتر من مرة بأمان.)
3. **Authentication ← URL Configuration**:
   - Site URL: رابط الموقع على Vercel، مثلاً `https://gmobile-calls.vercel.app`
   - Redirect URLs: نفس الرابط + `/**`
4. اختياري: **Authentication ← Sign In / Providers ← Email** ← اقفل *Confirm email* لو مش عايز التيم يأكد الإيميل.

### 1.1 تحديث رقم 2 (ميتا + الأسعار)

لو المشروع شغال قبل كده، شغّل في SQL Editor بالترتيب:
1. `supabase/update-2-meta-prices.sql`
2. `supabase/seed-meta-2026-10-29.sql` (الكامبينز والإعلانات الموجودة في حسابات G Mobile 2025 وGmobile 2 يوم 29 أكتوبر 2026)

لو بتعمل مشروع جديد من الأول، `schema.sql` فيه التحديث ده، وشغّل بعده ملف الـ seed بس.

### 2. Vercel

1. [vercel.com/new](https://vercel.com/new) ← Import الـ repo ده.
2. Framework: **Vite** (بيتعرف لوحده).
3. Environment Variables:
   - `VITE_SUPABASE_URL` = `https://<project-ref>.supabase.co`
   - `VITE_SUPABASE_ANON_KEY` = الـ anon key أو الـ publishable key
4. Deploy.

> متحطش الـ `service_role` / secret key في أي مكان هنا. الموقع محتاج المفتاح العام بس، والحماية كلها من قواعد الداتابيز (RLS).

### 3. أول دخول

- أول حساب يتعمل على الموقع بيبقى **أدمن** ومفعّل أوتوماتيك. اعمله بإيميل صاحب البيزنيس.
- أي حد من التيم يعمل حساب بعد كده بيستنى لحد ما الأدمن يفعّله من صفحة **التيم**، ويحدد اسمه ووظيفته (مودريتور / سيلز / مدير).

## مزامنة ميتا / Meta sync (اختياري)

بتسحب الكامبينز والإعلانات من ميتا أوتوماتيك بدل ما تتضاف بإيد. الأدمن يدوس **مزامنة دلوقتي** من الإعدادات، أو تشتغل كل ساعة لوحدها.

1. **توكن ميتا:** من [Business settings](https://business.facebook.com/settings) ← Users ← **System users** ← Add (Admin). بعدين **Assign assets** ← Ad accounts ← اختار الحسابين واديله صلاحية *View performance*. بعدين **Generate new token**، اختار الـ App (لو مفيش، اعمل App من نوع Business على [developers.facebook.com](https://developers.facebook.com/apps))، وعلّم على `ads_read`، وخلي الصلاحية *Never*.
2. **الـ Edge Function:** في Supabase ← **Edge Functions** ← Deploy a new function ← **Via Editor**. سمّيها `meta-sync`، والصق محتوى `supabase/functions/meta-sync/index.ts`، واضغط Deploy.
3. **الأسرار:** Edge Functions ← **Secrets** وضيف:
   - `META_ACCESS_TOKEN` = التوكن من الخطوة 1
   - `META_AD_ACCOUNT_IDS` = `2722557198091937,850026391409278`
   - `CRON_SECRET` = أي كلمة سر طويلة (للتشغيل كل ساعة بس)
4. جرب زرار **مزامنة دلوقتي** في الإعدادات.
5. اختياري، للتشغيل كل ساعة: عدّل الكلمتين في `supabase/schedule-meta-sync.sql` وشغّله في SQL Editor.

التوكن بيفضل في Supabase بس، ومش بيوصل للموقع ولا للمتصفح.

## التطوير المحلي / Local development

```bash
cp .env.example .env.local   # fill in the two values
npm install
npm run dev
```

## البنية / Structure

```
supabase/schema.sql      tables, RLS, triggers (Cairo date, audit logs), realtime
supabase/functions/      meta-sync Edge Function (Meta campaigns & ads)
src/App.jsx              auth gate, tabs, filters, data loading
src/views/               Calls, CallSheet, FollowUps, Analysis, ActivityLog, Prices, Team, Settings, Auth
src/lib/                 i18n (ar/en), utils, Excel/CSV/Meta exporters
```

## صلاحيات / Permissions

| | تيم (agent) | أدمن |
|---|---|---|
| يشوف ويسجل ويعدل المكالمات | ✓ | ✓ |
| يمسح مكالمة | | ✓ |
| يضيف ويعدّل الأسعار (بيتسجل باسمه) | ✓ | ✓ |
| يعدل الكامبينز والإعلانات ورسالة الواتساب ويعمل مزامنة ميتا | | ✓ |
| يفعّل الحسابات ويغير الصلاحيات | | ✓ |
| ملف ميتا | | ✓ |
| يعدل سجل التعديلات | | |
