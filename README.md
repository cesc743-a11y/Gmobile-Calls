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

## التشغيل لأول مرة / First-time setup

### 1. Supabase

1. افتح المشروع في [supabase.com](https://supabase.com) ← **SQL Editor** ← New query.
2. الصق محتوى `supabase/schema.sql` كله واضغط **Run**. (الملف ممكن يتشغل أكتر من مرة بأمان.)
3. **Authentication ← URL Configuration**:
   - Site URL: رابط الموقع على Vercel، مثلاً `https://gmobile-calls.vercel.app`
   - Redirect URLs: نفس الرابط + `/**`
4. اختياري: **Authentication ← Sign In / Providers ← Email** ← اقفل *Confirm email* لو مش عايز التيم يأكد الإيميل.

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

## التطوير المحلي / Local development

```bash
cp .env.example .env.local   # fill in the two values
npm install
npm run dev
```

## البنية / Structure

```
supabase/schema.sql      tables, RLS, triggers (Cairo date, audit log), realtime
src/App.jsx              auth gate, tabs, filters, data loading
src/views/               Calls, CallSheet, FollowUps, Analysis, ActivityLog, Prices, Team, Settings, Auth
src/lib/                 i18n (ar/en), utils, Excel/CSV/Meta exporters
```

## صلاحيات / Permissions

| | تيم (agent) | أدمن |
|---|---|---|
| يشوف ويسجل ويعدل المكالمات | ✓ | ✓ |
| يمسح مكالمة | | ✓ |
| يعدل الأسعار والكامبينز ورسالة الواتساب | | ✓ |
| يفعّل الحسابات ويغير الصلاحيات | | ✓ |
| ملف ميتا | | ✓ |
| يعدل سجل التعديلات | | |
