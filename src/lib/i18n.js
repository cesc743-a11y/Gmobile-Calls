import { createContext, useContext } from 'react';

export const LISTS = {
  cat: [['android', 'أندرويد', 'Android'], ['iphone', 'آيفون', 'iPhone'], ['accessories', 'إكسسوارات', 'Accessories']],
  price: [['lt10', 'أقل من 10 آلاف', 'Under 10K'], ['10-20', '10 لـ 20 ألف', '10K–20K'], ['20-30', '20 لـ 30 ألف', '20K–30K'], ['30-45', '30 لـ 45 ألف', '30K–45K'], ['45-60', '45 لـ 60 ألف', '45K–60K'], ['gt60', 'أكتر من 60 ألف', 'Over 60K']],
  status: [['inquiry', 'سأل بس', 'Inquiry only'], ['booked', 'حجز', 'Booked'], ['delivered', 'استلم', 'Delivered'], ['not_delivered', 'ما استلمش', 'Not delivered'], ['cancelled', 'كنسل', 'Cancelled']],
  cancel: [['price_high', 'السعر غالي', 'Price too high'], ['cheaper', 'لقاه أرخص في مكان تاني', 'Found it cheaper elsewhere'], ['oos', 'الجهاز مش متوفر', 'Out of stock'], ['changed_mind', 'غيّر رأيه', 'Changed their mind'], ['no_answer', 'مش بيرد', 'Not answering'], ['delivery', 'مشكلة في التوصيل', 'Delivery problem'], ['other', 'سبب تاني', 'Other reason']],
  branch: [['dokki', 'الدقي', 'Dokki'], ['nasr', 'مدينة نصر', 'Nasr City'], ['ainshams', 'عين شمس', 'Ain Shams'], ['delivery', 'توصيل', 'Delivery']],
  source: [['facebook', 'إعلان فيسبوك', 'Facebook ad'], ['instagram', 'إعلان إنستجرام', 'Instagram ad'], ['tiktok', 'تيك توك', 'TikTok'], ['returning', 'عميل قديم', 'Returning customer'], ['referral', 'ترشيح من حد', 'Referral'], ['other', 'تاني', 'Other']],
  job: [['moderator', 'مودريتور', 'Moderator'], ['sales', 'سيلز', 'Sales'], ['manager', 'مدير', 'Manager']],
};

const ar = {
  appName: 'سجل مكالمات G\u00a0Mobile', tagline: 'كل مكالمة من الإعلانات، مين مسؤول عنها، وحصل فيها إيه',
  tabCalls: 'المكالمات', tabFollow: 'المتابعات', tabAnalysis: 'التحليلات', tabLog: 'سجل التعديلات', tabPrices: 'الأسعار', tabTeam: 'التيم', tabSettings: 'الإعدادات',
  newCall: '+ تسجيل مكالمة', period: 'الفترة', from: 'من', to: 'لحد', category: 'الفئة', owner: 'مسؤول عن الديل', all: 'الكل',
  search: 'بحث بالاسم أو الرقم أو الجهاز', searchPh: 'مثلًا 0111 أو S26 Ultra', excel: 'Excel', metaCsv: 'ملف Offline لميتا',
  today: 'النهارده', yesterday: 'امبارح', last7: 'آخر 7 أيام', last30: 'آخر 30 يوم', byMonth: 'بالشهر', thisMonth: 'الشهر ده: ', custom: 'من تاريخ لتاريخ',
  thTime: 'الوقت', thCustomer: 'العميل', thAsked: 'سأل على', thPrice: 'السعر', thStatus: 'الحالة', thOwner: 'المسؤول',
  allCalls: 'كل المكالمات', callsN: n => n + ' مكالمة', quotedX: v => 'اتقاله ' + money(v), soldX: v => 'اتباع بـ ' + money(v), loggedBy: 'سجلها: ',
  emptyNone: 'مفيش مكالمات متسجلة في الفترة دي', emptyNoneSub: 'أول ما حد من التيم يدوس "تسجيل مكالمة" ويحفظ، هتظهر هنا لكل الناس على طول.',
  emptyFilter: 'مفيش نتايج بالفلتر ده', emptyFilterSub: 'غيّر الفلتر أو امسح البحث.',
  shown: (a, b) => `معروض ${a} من ${b} مكالمة`, more: 'الفترة فيها مكالمات كتير، اللي معروض أول 5000. اختار فترة أصغر.',
  searching: 'بدوّر على الرقم ده في كل التاريخ...', noHistory: 'الرقم ده مالوش مكالمات قبل كده.',
  historyN: (n, name) => `الرقم ده كلمنا ${n} مرة${name ? ' (' + name + ')' : ''}:`,
  logTitle: 'كل التعديلات في الفترة المختارة', logHint: 'أي تسجيل أو تعديل أو تغيير حالة بيتحفظ هنا تلقائي باسم اللي عمله ووقته، ومحدش يقدر يمسحه.',
  logEmpty: 'مفيش تعديلات في الفترة دي', logEmptySub: 'أي تسجيل أو تعديل هيظهر هنا بالاسم والوقت.',
  evCreate: ' سجّل مكالمة جديدة', evStatus: ' غيّر الحالة', evEdit: ' عدّل', evDelete: ' مسح المكالمة', on: ' على ', someone: 'حد من التيم', customer: 'عميل', emptyVal: 'فاضي',
  newTitle: 'تسجيل مكالمة جديدة', detailTitle: 'تفاصيل المكالمة', close: 'قفل', saveNew: 'حفظ المكالمة', saveEdit: 'حفظ التعديلات', cancel: 'إلغاء', saving: 'بيتحفظ...',
  fPhone: 'رقم التليفون', fName: 'الاسم بالكامل', fDevice: 'الجهاز اللي سأل عليه', fDevicePh: 'اكتب أو اختار من ليستة الأسعار', fPrice: 'الفئة السعرية', choose: 'اختار',
  fQuoted: 'السعر اللي اتقاله', fSale: 'اتباع بكام', fSaleHint: 'المبلغ اللي العميل دفعه فعلًا', fSource: 'عرف منين', fCampaign: 'الكامبين', fStatus: 'الحالة', fCancel: 'سبب الكنسلة', fCancelPick: 'اختار السبب', fCancelNote: 'تفاصيل أكتر (اختياري)',
  fBranch: 'الفرع أو التوصيل', fNotes: 'ملاحظات', history: 'اللي حصل في المكالمة دي', fCategory: 'الفئة', fFollow: 'أكلمه تاني يوم', fOwner: 'مسؤول عن الديل', optional: ' (اختياري)',
  fromList: 'من ليستة الأسعار', inStock: 'متوفر', outStock: 'مش متوفر',
  notMobile: 'الرقم ده مش شكل موبايل مصري (01xxxxxxxxx). اتأكد منه.', calledBefore: (n, name) => `العميل ده كلمنا ${n} مرة قبل كده${name ? ' باسم ' + name : ''}`,
  mustFill: 'لازم تكتب: ', saved: 'المكالمة اتسجلت', editSaved: 'التعديلات اتحفظت', noChange: 'مفيش حاجة اتغيرت', deleted: 'المكالمة اتمسحت',
  del: 'مسح المكالمة', delConfirm: 'متأكد؟ دوس تاني للمسح', whatsapp: 'واتساب', copyPhone: 'نسخ الرقم', copied: 'اتنسخ',
  errNet: 'الحفظ ما تمّش. اتأكد من النت وجرّب تاني.', errPerm: 'مش مسموح لك تعمل كده.',
  // follow ups
  fuTitle: 'المتابعات', fuHint: 'العملاء اللي ليهم ميعاد متابعة ولسه ما استلموش ولا كنسلوا.', fuOverdue: 'متأخرة', fuToday: 'النهارده', fuUpcoming: 'جاية', fuNone: 'مفيش متابعات', fuNoneSub: 'لما تحدد "أكلمه تاني يوم" في أي مكالمة هتظهر هنا في ميعادها.', fuDays: n => n === 1 ? 'من يوم' : `من ${n} أيام`,
  // auth
  signIn: 'تسجيل الدخول', signUp: 'حساب جديد', email: 'الإيميل', password: 'الباسورد', fullName: 'اسمك بالكامل', doSignIn: 'دخول', doSignUp: 'اعمل الحساب',
  forgot: 'نسيت الباسورد؟', sendReset: 'ابعت لينك تغيير الباسورد', resetSent: 'بعتنالك لينك على الإيميل. افتحه من نفس الجهاز.', newPass: 'الباسورد الجديد', savePass: 'حفظ الباسورد', passSaved: 'الباسورد اتغير',
  badLogin: 'الإيميل أو الباسورد غلط.', signUpDone: 'الحساب اتعمل. لو طلب منك تأكيد الإيميل، افتح الرسالة الأول. بعد كده الأدمن لازم يفعّل حسابك.', authErr: 'حصلت مشكلة: ',
  pendingTitle: 'حسابك مستني التفعيل', pendingSub: 'الأدمن لازم يفعّل حسابك من صفحة التيم علشان تقدر تدخل. ابعتله إنك عملت الحساب.', signOut: 'خروج', refresh: 'تحديث',
  passMin: 'الباسورد لازم يبقى 8 حروف أو أكتر.', configMissing: 'الموقع لسه مش متوصل بقاعدة البيانات. ضيف VITE_SUPABASE_URL و VITE_SUPABASE_ANON_KEY.',
  // team
  teamTitle: 'التيم', teamHint: 'أي حد يعمل حساب من صفحة الدخول بيظهر هنا ومستني التفعيل. فعّله واختار دوره علشان يقدر يدخل.',
  colName: 'الاسم', colEmail: 'الإيميل', colJob: 'الدور', colAccess: 'الصلاحية', colActive: 'مفعّل',
  admin: 'أدمن', agent: 'موظف', activate: 'فعّل', deactivate: 'وقّف', pending: 'مستني', you: 'إنت', saveName: 'حفظ', lastAdmin: 'لازم يفضل أدمن واحد مفعّل على الأقل.',
  // prices
  pricesTitle: 'ليستة الأسعار', pricesHint: 'الموظف بيختار الجهاز من هنا وهو بيسجل المكالمة، فالسعر يتقال واحد عند الكل.', addProduct: 'إضافة جهاز', pName: 'اسم الجهاز', pPrice: 'السعر', pStock: 'متوفر', bulk: 'إضافة كذا جهاز مرة واحدة', bulkHint: 'كل سطر: اسم الجهاز، السعر. مثلًا: iPhone 17 Pro Max 256, 61999', bulkAdd: 'ضيف الكل', pEmpty: 'لسه مفيش أجهزة في الليستة', remove: 'شيل', updatedAt: 'آخر تحديث',
  // settings
  setTitle: 'الإعدادات', campTitle: 'الكامبينز', campHint: 'اكتب أسماء الكامبينز زي ما هي في Ads Manager علشان الموظف يختار منها والتحليل يقولك كل كامبين جاب كام بيعة.', campAdd: 'إضافة كامبين', campName: 'اسم الكامبين', campActive: 'شغال',
  waTitle: 'رسالة الواتساب الجاهزة', waHint: 'استخدم {name} للاسم و {device} للجهاز و {price} للسعر.', saveTpl: 'حفظ الرسالة',
  metaTitle: 'ربط البيعات بميتا', metaHint: 'من صفحة المكالمات دوس "ملف Offline لميتا". هيطلعلك ملف فيه البيعات اللي استلمت في الفترة المختارة. ارفعه في Events Manager ← Offline events (أو Data sources ← Upload) علشان ميتا تعرف مين اشترى فعلًا.',
  // analysis
  aKpiCalls: 'المكالمات', aKpiPerDay: n => `متوسط ${n} في اليوم`, aKpiBooked: 'وصلوا لحجز', aKpiDelivered: 'استلموا', aKpiRevenue: 'المبيعات', aKpiAvg: n => `متوسط البيعة ${n}`, aKpiCancel: 'كنسلوا', aOf: 'من المكالمات',
  aTrend: 'المكالمات في اليوم', aRevTrend: 'المبيعات في اليوم (جنيه)', aStatus: 'الحالات', aByCat: 'حسب الفئة', aByPrice: 'حسب الفئة السعرية', aDevices: 'أكتر أجهزة اتسأل عليها', aCancel: 'أسباب الكنسلة', aSource: 'عرفونا منين', aCampaign: 'الكامبينز', aHours: 'المكالمات حسب الساعة',
  aTeam: 'ترتيب التيم في قفل الديلز', aColName: 'الاسم', aColCalls: 'مكالمات', aColBooked: 'حجز', aColDelivered: 'استلم', aColRevenue: 'المبيعات', aColRate: 'نسبة القفل',
  aLost: 'الطلب الضايع', aLostHint: 'أجهزة الناس سألت عليها ومش لاقيينها أو مشيوا من غير ما يحجزوا. ده بيقولك تجيب إيه في المخزن.', aLostOos: 'كنسل علشان مش متوفر', aLostInq: 'سأل بس وما حجزش', aColDevice: 'الجهاز', aColTimes: 'مرات',
  aEmpty: 'مفيش داتا كفاية في الفترة دي', aEmptySub: 'التحليلات بتتحسب من المكالمات المتسجلة في الفترة اللي مختارها فوق.', aNote: 'محسوب على الفترة والفلاتر اللي فوق. "وصلوا لحجز" يعني المكالمة اتعمل فيها حجز في أي وقت. نسبة القفل = اللي استلم ÷ كل المكالمات اللي الشخص مسؤول عنها.',
  aDeliveredOf: (a, b) => `${a} استلم من ${b}`, aNoData: 'مفيش', hourFmt: h => h + ':00', noCampaign: 'من غير كامبين', egp: ' ج',
  sheetName: 'المكالمات', fileBase: 'مكالمات-GMobile', noRows: 'مفيش مكالمات في الفلتر ده', noSales: 'مفيش بيعات استلمت في الفترة دي',
  fAd: 'الإعلان', fAdCode: 'كود الإعلان أو الكامبين (ID)', fAdCodePh: 'الصق الـ ID من Ads Manager', adFound: n => 'لقيته: ' + n, adNotFound: 'الكود ده مش موجود عندنا. الأدمن يعمل مزامنة أو يضيفه من الإعدادات.',
  grpActive: 'شغالة دلوقتي', grpPaused: 'متوقفة', pickCampFirst: 'اختار الكامبين الأول', aAds: 'الإعلانات', noAd: 'من غير إعلان',
  syncTitle: 'المزامنة مع ميتا', syncHint: 'بتسحب كل الكامبينز والإعلانات من حسابات الإعلانات بأسمائها وأكوادها، من غير ما حد يكتبها بإيده.', syncBtn: 'مزامنة دلوقتي', syncing: 'بيسحب من ميتا...',
  syncDone: (c, a) => `اتسحب ${c} كامبين و ${a} إعلان`, syncNotSetup: 'المزامنة التلقائية لسه مش متفعّلة. خطواتها في ملف README تحت "مزامنة ميتا".', syncFail: m => 'المزامنة فشلت: ' + m, lastSync: d => 'آخر مزامنة: ' + d, neverSynced: 'لسه ما حصلش مزامنة',
  campMetaId: 'Meta ID (اختياري)', campSearch: 'دور باسم أو ID', adsTitle: 'الإعلانات وأكوادها', adsHint: 'لو في إعلان مش ظاهر، ضيف الـ Ad ID بتاعه من Ads Manager واختار الكامبين بتاعه.', adId: 'Ad ID', adName: 'اسم الإعلان', adAdd: 'إضافة إعلان', adsCount: n => n + ' إعلان', showing: (a, b) => `معروض ${a} من ${b}`, stRunning: 'شغال', stStopped: 'متوقف', colCampaign: 'الكامبين', colStatus: 'الحالة', idTaken: 'الكود ده متضاف قبل كده',
  priceLog: 'سجل تعديلات الأسعار', priceLogHint: 'أي إضافة أو تعديل أو مسح بيتسجل باسم وإيميل اللي عمله، ومحدش يقدر يعدّل السجل ده.', plcreate: 'أضاف', pledit: 'عدّل', pldelete: 'شال', plEmpty: 'لسه مفيش تعديلات', plMore: 'عرض أكتر', yes: 'أيوه', no: 'لأ',
  xCols: ['التاريخ', 'الوقت', 'الاسم', 'التليفون', 'الفئة', 'الجهاز', 'الفئة السعرية', 'السعر اللي اتقال', 'اتباع بكام', 'عرف منين', 'الكامبين', 'الإعلان', 'كود الإعلان', 'الحالة', 'سبب الكنسلة', 'تفاصيل الكنسلة', 'الفرع', 'متابعة يوم', 'ملاحظات', 'سجلها', 'مسؤول عن الديل', 'آخر تعديل', 'عدّلها'],
};

const en = {
  appName: 'G\u00a0Mobile Call Log', tagline: 'Every call from the ads, who owns it, and what happened next',
  tabCalls: 'Calls', tabFollow: 'Follow-ups', tabAnalysis: 'Analysis', tabLog: 'Activity log', tabPrices: 'Prices', tabTeam: 'Team', tabSettings: 'Settings',
  newCall: '+ Log a call', period: 'Period', from: 'From', to: 'To', category: 'Category', owner: 'Deal owner', all: 'All',
  search: 'Search name, number or device', searchPh: 'e.g. 0111 or S26 Ultra', excel: 'Excel', metaCsv: 'Meta offline file',
  today: 'Today', yesterday: 'Yesterday', last7: 'Last 7 days', last30: 'Last 30 days', byMonth: 'By month', thisMonth: 'This month: ', custom: 'Custom dates',
  thTime: 'Time', thCustomer: 'Customer', thAsked: 'Asked about', thPrice: 'Price', thStatus: 'Status', thOwner: 'Owner',
  allCalls: 'All calls', callsN: n => n + (n === 1 ? ' call' : ' calls'), quotedX: v => 'Quoted ' + money(v), soldX: v => 'Sold for ' + money(v), loggedBy: 'Logged by: ',
  emptyNone: 'No calls logged in this period', emptyNoneSub: 'When someone on the team clicks "Log a call" and saves, it shows up here for everyone right away.',
  emptyFilter: 'No calls match this filter', emptyFilterSub: 'Change the filters or clear the search.',
  shown: (a, b) => `Showing ${a} of ${b} calls`, more: 'This period has a lot of calls; showing the first 5,000. Pick a shorter period.',
  searching: 'Looking up this number across all history...', noHistory: 'No earlier calls from this number.',
  historyN: (n, name) => `This number called ${n} time${n === 1 ? '' : 's'}${name ? ' (' + name + ')' : ''}:`,
  logTitle: 'All changes in the selected period', logHint: 'Every new call, edit and status change is recorded automatically with who did it and when. Nobody can delete it.',
  logEmpty: 'No changes in this period', logEmptySub: 'New calls and edits will show up here with names and times.',
  evCreate: ' logged a new call', evStatus: ' changed the status', evEdit: ' edited', evDelete: ' deleted the call', on: ' on ', someone: 'A team member', customer: 'customer', emptyVal: 'empty',
  newTitle: 'Log a new call', detailTitle: 'Call details', close: 'Close', saveNew: 'Save call', saveEdit: 'Save changes', cancel: 'Cancel', saving: 'Saving...',
  fPhone: 'Phone number', fName: 'Full name', fDevice: 'Device asked about', fDevicePh: 'Type or pick from the price list', fPrice: 'Price range', choose: 'Choose',
  fQuoted: 'Price quoted', fSale: 'Sold for', fSaleHint: 'What the customer actually paid', fSource: 'How they found us', fCampaign: 'Campaign', fStatus: 'Status', fCancel: 'Cancellation reason', fCancelPick: 'Choose a reason', fCancelNote: 'More detail (optional)',
  fBranch: 'Branch or delivery', fNotes: 'Notes', history: 'History of this call', fCategory: 'Category', fFollow: 'Call back on', fOwner: 'Deal owner', optional: ' (optional)',
  fromList: 'From the price list', inStock: 'In stock', outStock: 'Out of stock',
  notMobile: 'This doesn’t look like an Egyptian mobile number (01xxxxxxxxx). Please check it.', calledBefore: (n, name) => `This customer called ${n} time${n === 1 ? '' : 's'} before${name ? ' as ' + name : ''}`,
  mustFill: 'Please fill in: ', saved: 'Call saved', editSaved: 'Changes saved', noChange: 'Nothing changed', deleted: 'Call deleted',
  del: 'Delete call', delConfirm: 'Sure? Click again to delete', whatsapp: 'WhatsApp', copyPhone: 'Copy number', copied: 'Copied',
  errNet: 'Couldn’t save. Check the connection and try again.', errPerm: 'You don’t have permission to do that.',
  fuTitle: 'Follow-ups', fuHint: 'Customers with a call-back date who haven’t been delivered or cancelled.', fuOverdue: 'Overdue', fuToday: 'Today', fuUpcoming: 'Upcoming', fuNone: 'No follow-ups', fuNoneSub: 'Set "Call back on" on any call and it shows up here on that day.', fuDays: n => n === 1 ? '1 day late' : `${n} days late`,
  signIn: 'Sign in', signUp: 'New account', email: 'Email', password: 'Password', fullName: 'Your full name', doSignIn: 'Sign in', doSignUp: 'Create account',
  forgot: 'Forgot your password?', sendReset: 'Send reset link', resetSent: 'We sent you a link. Open it on this device.', newPass: 'New password', savePass: 'Save password', passSaved: 'Password changed',
  badLogin: 'Wrong email or password.', signUpDone: 'Account created. If asked to confirm your email, open that message first. Then an admin needs to activate your account.', authErr: 'Something went wrong: ',
  pendingTitle: 'Your account is waiting for activation', pendingSub: 'An admin needs to activate your account from the Team page. Let them know you signed up.', signOut: 'Sign out', refresh: 'Refresh',
  passMin: 'Password must be at least 8 characters.', configMissing: 'The site isn’t connected to the database yet. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.',
  teamTitle: 'Team', teamHint: 'Anyone who creates an account on the sign-in page shows up here waiting for activation. Activate them and pick their role.',
  colName: 'Name', colEmail: 'Email', colJob: 'Role', colAccess: 'Access', colActive: 'Active',
  admin: 'Admin', agent: 'Staff', activate: 'Activate', deactivate: 'Deactivate', pending: 'Waiting', you: 'You', saveName: 'Save', lastAdmin: 'At least one active admin is required.',
  pricesTitle: 'Price list', pricesHint: 'Staff pick the device from here when logging a call, so everyone quotes the same price.', addProduct: 'Add device', pName: 'Device name', pPrice: 'Price', pStock: 'In stock', bulk: 'Add several devices at once', bulkHint: 'One per line: device name, price. e.g. iPhone 17 Pro Max 256, 61999', bulkAdd: 'Add all', pEmpty: 'No devices in the list yet', remove: 'Remove', updatedAt: 'Updated',
  setTitle: 'Settings', campTitle: 'Campaigns', campHint: 'Enter campaign names as they appear in Ads Manager so staff can pick them and the analysis shows sales per campaign.', campAdd: 'Add campaign', campName: 'Campaign name', campActive: 'Running',
  waTitle: 'WhatsApp message template', waHint: 'Use {name} for the name, {device} for the device and {price} for the price.', saveTpl: 'Save message',
  metaTitle: 'Send sales to Meta', metaHint: 'On the Calls page, click "Meta offline file". You get a file with the delivered sales in the selected period. Upload it in Events Manager → Offline events (or Data sources → Upload) so Meta learns who actually bought.',
  aKpiCalls: 'Calls', aKpiPerDay: n => `${n} per day on average`, aKpiBooked: 'Reached booking', aKpiDelivered: 'Delivered', aKpiRevenue: 'Sales', aKpiAvg: n => `Average sale ${n}`, aKpiCancel: 'Cancelled', aOf: 'of calls',
  aTrend: 'Calls per day', aRevTrend: 'Sales per day (EGP)', aStatus: 'Statuses', aByCat: 'By category', aByPrice: 'By price range', aDevices: 'Most asked-about devices', aCancel: 'Cancellation reasons', aSource: 'How they found us', aCampaign: 'Campaigns', aHours: 'Calls by hour',
  aTeam: 'Team ranking by closed deals', aColName: 'Name', aColCalls: 'Calls', aColBooked: 'Booked', aColDelivered: 'Delivered', aColRevenue: 'Sales', aColRate: 'Close rate',
  aLost: 'Lost demand', aLostHint: 'Devices people asked for but couldn’t get, or left without booking. Use it to decide what to stock.', aLostOos: 'Cancelled: out of stock', aLostInq: 'Asked but didn’t book', aColDevice: 'Device', aColTimes: 'Times',
  aEmpty: 'Not enough data in this period', aEmptySub: 'Analysis is calculated from the calls logged in the period selected above.', aNote: 'Calculated for the period and filters above. "Reached booking" counts any call that was booked at some point. Close rate = delivered ÷ all calls the person owns.',
  aDeliveredOf: (a, b) => `${a} delivered of ${b}`, aNoData: 'None', hourFmt: h => h + ':00', noCampaign: 'No campaign', egp: ' EGP',
  sheetName: 'Calls', fileBase: 'GMobile-calls', noRows: 'No calls in this filter', noSales: 'No delivered sales in this period',
  fAd: 'Ad', fAdCode: 'Ad or campaign ID', fAdCodePh: 'Paste the ID from Ads Manager', adFound: n => 'Found: ' + n, adNotFound: "That ID isn't in the list. An admin can sync or add it in Settings.",
  grpActive: 'Running now', grpPaused: 'Paused', pickCampFirst: 'Pick the campaign first', aAds: 'Ads', noAd: 'No ad',
  syncTitle: 'Sync with Meta', syncHint: 'Pulls every campaign and ad from the ad accounts with their names and IDs, so nobody types them by hand.', syncBtn: 'Sync now', syncing: 'Pulling from Meta…',
  syncDone: (c, a) => `Pulled ${c} campaigns and ${a} ads`, syncNotSetup: 'Automatic sync isn\'t switched on yet. The steps are in the README under "Meta sync".', syncFail: m => 'Sync failed: ' + m, lastSync: d => 'Last sync: ' + d, neverSynced: 'Not synced yet',
  campMetaId: 'Meta ID (optional)', campSearch: 'Search by name or ID', adsTitle: 'Ads and their IDs', adsHint: "If an ad is missing, add its Ad ID from Ads Manager and pick its campaign.", adId: 'Ad ID', adName: 'Ad name', adAdd: 'Add ad', adsCount: n => n + ' ads', showing: (a, b) => `Showing ${a} of ${b}`, stRunning: 'Running', stStopped: 'Paused', colCampaign: 'Campaign', colStatus: 'Status', idTaken: 'That ID is already in the list',
  priceLog: 'Price change log', priceLogHint: "Every add, edit or removal is recorded with the person's name and email, and nobody can edit this log.", plcreate: 'added', pledit: 'edited', pldelete: 'removed', plEmpty: 'No changes yet', plMore: 'Show more', yes: 'Yes', no: 'No',
  xCols: ['Date', 'Time', 'Name', 'Phone', 'Category', 'Device', 'Price range', 'Price quoted', 'Sold for', 'Source', 'Campaign', 'Ad', 'Ad ID', 'Status', 'Cancel reason', 'Cancel detail', 'Branch', 'Call back on', 'Notes', 'Logged by', 'Deal owner', 'Last edited', 'Edited by'],
};

export const DICT = { ar, en };
export function money(v) { if (v === null || v === undefined || v === '') return ''; const n = Number(v); return isNaN(n) ? String(v) : n.toLocaleString('en-US'); }
export const LangContext = createContext({ lang: 'ar' });
export function useT() {
  const { lang } = useContext(LangContext);
  const t = (k, ...a) => { const v = DICT[lang][k]; return typeof v === 'function' ? v(...a) : (v ?? k); };
  const L = (list, v) => { if (!v) return '—'; const r = LISTS[list].find(x => x[0] === v); return r ? r[lang === 'ar' ? 1 : 2] : v; };
  const opts = list => LISTS[list].map(r => [r[0], r[lang === 'ar' ? 1 : 2]]);
  return { t, L, opts, lang };
}
