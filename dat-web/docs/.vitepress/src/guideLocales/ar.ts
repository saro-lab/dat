import type { SharedGuideLocale } from './types'

export const arGuideLocale: SharedGuideLocale = {
  libraryIndex: {
    title: 'المكتبات',
    intro: 'اختر عميل DAT المناسب للغة تطبيقك. يستخدم جميع العملاء مواصفتي DAT والشهادة نفسيهما، ويوفرون إدارة محلية للشهادات ومزامنة مع DAT CMS.',
    criteriaTitle: 'طريقة الاختيار',
    criteriaBody: 'يجب أن تتمكن الخدمة التي تصدر DAT من استخدام الشهادات الكاملة. وعلى الخدمة التي تتحقق وتفك التشفير فقط استخدام شهادات ECDSA المخصصة للتحقق ودور verify-only في CMS.',
    flowTitle: 'بنية الدليل',
    flowBody: 'يتناول دليل كل مكتبة التثبيت وأبسط تدفق للإصدار والتحقق والاتصال بـ DAT CMS وسياسة المزامنة والإغلاق ومعالجة الأخطاء.',
  },
  library: {
    titleSuffix: 'مكتبة',
    install: 'التثبيت',
    quickTitle: 'بدء سريع',
    quickIntro: 'يجلب هذا التدفق الكامل الشهادات من CMS، وينشئ DAT يحتوي بيانات JSON، ثم يتحقق منه.',
    stepTitle: 'خطوة بخطوة',
    connectTitle: '1. الاتصال بـ CMS',
    connectBody: 'تستخدم خدمة الإصدار رمزًا للشهادات الكاملة. وتمنع المزامنة الفورية عند بدء التشغيل الإصدار قبل توفر الشهادات.',
    issueTitle: '2. إصدار DAT',
    issueBody: 'يضع هذا المثال JSON عامًا في `plain` ومعلومات مستخدم محمية بصيغة JSON في `secure`.',
    parseTitle: '3. التحقق من DAT',
    parseBody: 'يتحقق `parse` من انتهاء الصلاحية والتوقيع ثم يفك تشفير `secure`. لا تستخدم إلا payload أعيد بعد تحقق ناجح.',
    functionsTitle: 'الدوال الأساسية',
    functionHeader: 'الدالة',
    purposeHeader: 'الغرض',
    dataTitle: 'مناطق البيانات',
    plainBody: 'بايتات موقّعة لكنها غير مشفّرة.',
    secureBody: 'بايتات مشفّرة.',
    payloadBody: 'لا تثق به إلا بعد نجاح `parse`.',
    optionsTitle: 'خيارات غير JSON',
    optionsBody: 'تستخدم الأمثلة صيغة JSON المألوفة. وللمعالجة الأسرع، يمكن للبيانات الثنائية تجنب تسلسل JSON وتحليله مع تقليل حجم البيانات.',
    formatsBody: 'خزّن القيم البسيطة كنص، أو ضع البيانات المنظمة بصيغ ثنائية مثل Protobuf أو MessagePack داخل `plain` و`secure`.',
    verifyTitle: 'خدمات التحقق فقط',
    verifyBody: 'تستخدم الخدمة التي لا تصدر DAT خيار verify-only ورمز verify-only، ولا تستدعي إلا `parse`.',
    lifecycleTitle: 'الإغلاق والأخطاء',
    errorsBefore: 'استخدم ',
    errorsLink: 'رموز الخطأ وتصنيفات إعادة المحاولة',
    errorsAfter: ' بدلًا من رسائل الخطأ.',
  },
  guides: {
    rust: {
      binaryNote: 'لأن `issue` يقبل strings حاليًا، رمّز البايتات العشوائية بصيغة Base64Url أو Hex ثم فك ترميزها بعد التحقق.',
      lifecycle: 'تنتهي مهمة المزامنة التلقائية عند إسقاط آخر `Arc<DatCmsManager>`.',
      apiPurposes: ['يزامن الشهادات فورًا.', 'ينشئ DAT باستخدام شهادة الإصدار الحالية.', 'يتحقق من DAT ويعيد payload الخاص به.', 'يعيد آخر خطأ في المزامنة.'],
    },
    java: {
      binaryNote: 'يحفظ overload الخاص بـ `ByteArray` البايتات ويسترجعها مباشرة من دون صيغة إضافية.',
      lifecycle: '`DatCmsManager` من نوع `AutoCloseable`؛ أغلقه باستخدام `use` أو `close()`.',
      apiPurposes: ['يزامن الشهادات فورًا ويبلغ عن الفشل.', 'ينشئ DAT ويعيد DatResult.', 'يتحقق من DAT ويعيد Payload.', 'يعيد آخر خطأ في المزامنة الخلفية.'],
    },
    javascript: {
      binaryNote: 'مرّر `Uint8Array` أو `ArrayBuffer` واسترجع البايتات الأصلية عبر `plainBytes` و`secureBytes`.',
      lifecycle: 'استدعِ `stop()` عند الإغلاق لتنظيف المؤقتات والطلبات الجارية.',
      apiPurposes: ['يزامن الشهادات فورًا.', 'ينشئ string لـ DAT بصورة غير متزامنة.', 'يتحقق من DAT ويعيد DatPayload.', 'يعيد آخر خطأ في المزامنة.'],
    },
    python: {
      binaryNote: 'مرّر `bytes` مباشرة واسترجعها عبر `plain_bytes` و`secure_bytes`.',
      lifecycle: 'عند تفعيل المزامنة التلقائية، استدعِ `stop()` عند الإغلاق.',
      apiPurposes: ['يزامن الشهادات فورًا.', 'ينشئ string لـ DAT.', 'يتحقق من DAT ويعيد DatPayload.', 'يعيد آخر خطأ في المزامنة.'],
    },
    csharp: {
      binaryNote: 'استخدم overload الخاص بـ `byte[]` مع `PlainBytes` و`SecureBytes`.',
      lifecycle: 'استخدم `await using` لتنظيف المدير والمزامنة الخلفية.',
      apiPurposes: ['يزامن الشهادات فورًا.', 'ينشئ string لـ DAT.', 'يتحقق من DAT ويعيد Payload.', 'يعيد آخر خطأ في المزامنة.'],
    },
    go: {
      binaryNote: 'يمكن أن تحتوي strings في Go على بايتات. مرّر شريحة بايتات على شكل `string` ثم حوّل النتيجة إلى `[]byte` من جديد.',
      lifecycle: 'عند تفعيل المزامنة التلقائية، استخدم `defer cms.Close()` لضمان التنظيف.',
      apiPurposes: ['يزامن الشهادات فورًا.', 'يعيد string لـ DAT وخطأ.', 'يعيد Payload متحققًا منه وخطأ.', 'يعيد آخر خطأ في المزامنة.'],
    },
    ruby: {
      binaryNote: 'مرّر strings ثنائية واسترجعها عبر `plain_bytes` و`secure_bytes`.',
      lifecycle: 'عند تفعيل المزامنة التلقائية، استدعِ `stop` لإنهاء الخيط الخلفي.',
      apiPurposes: ['يزامن الشهادات فورًا.', 'ينشئ string لـ DAT.', 'يتحقق من DAT ويعيد DatPayload.', 'يعيد آخر خطأ في المزامنة.'],
    },
    c: {
      binaryNote: 'تقبل API الإصدار الحالية في C سلاسل منتهية بـ NUL. رمّز البايتات العشوائية بصيغة Base64Url أو Hex، واقرأ النتيجة باستخدام أطوال payload.',
      lifecycle: 'حرر `dat` و`payload` و`cms` بدوال التنظيف الخاصة بكل منها.',
      apiPurposes: ['يزامن الشهادات فورًا.', 'يخصص string لـ DAT ويعيده.', 'يخصص payload متحققًا منه ويعيده.', 'يعيد آخر خطأ في المزامنة.'],
      parse: `dat_payload_t *payload = NULL;
err = dat_cms_manager_parse(cms, dat, &payload);
/* استخدم plain_bytes وsecure_bytes مع طول كل منهما. */`,
      binary: `/* رمّز أولًا البيانات التي تحتوي NUL لأن issue يقبل strings في C. */
const char *secure_hex = "00ff1080";
char *dat = NULL;
err = dat_cms_manager_issue(cms, "01", secure_hex, &dat);

dat_payload_t *payload = NULL;
err = dat_cms_manager_parse(cms, dat, &payload);`,
    },
  },
  cms: {
    introBefore: 'ينشئ DAT CMS الشهادات ويحفظها في قاعدة بيانات ويسلّم الشهادات المناسبة لخدمات الإصدار والتحقق. يرد وصف سلوك البروتوكول في ',
    specLink: 'مواصفة DAT CMS',
    introAfter: '.',
    configTitle: 'إنشاء إعدادات التشغيل',
    dockerTitle: 'التشغيل باستخدام Docker',
    dockerBody: 'شغّل الحاوية كمستخدم غير root. وعند استخدام SQLite، صِل دليل بيانات قابلًا للكتابة. مرّر الرموز وكلمات مرور قاعدة البيانات عبر آلية حقن الأسرار بدلًا من سجل الأوامر.',
    databaseTitle: 'قاعدة البيانات',
    databaseBody1: 'استخدم `DB_URI` لإعداد اتصال SQLite أو PostgreSQL أو MySQL. تتصل MariaDB عبر بروتوكول MySQL. يخزّن CMS نتائج استعلامات الشهادات كلقطة مؤقتة ويواصل تقديم آخر لقطة ناجحة عند فشل تحديث المخزن مؤقتًا.',
    databaseBody2: 'يحدّد `DB_CACHE_SECS` فاصل تحديث اللقطة، بينما يضع `DB_QUERY_TIMEOUT_SECS` حدًا زمنيًا لاستعلامات التحديث. إذا لم توجد لقطة ناجحة وتعذرت قراءة المخزن، تعيد الخدمة `DAT_STORE_UNAVAILABLE`.',
    rolesTitle: 'أدوار الوصول',
    roleHeaders: ['متغير البيئة', 'الصلاحية', 'الجهة المستخدمة'],
    roleRows: [
      ['تسجيل الشهادات وجلب الإصدار المحمي', 'العمليات'],
      ['جلب الشهادات الكاملة', 'خدمات إصدار DAT'],
      ['جلب شهادات التحقق فقط', 'خدمات التحقق وفك التشفير'],
    ],
    rolesNote: 'يقبل كل متغير رموزًا أبجدية رقمية مفصولة بفواصل. إذا كانت قائمة رموز أحد الأدوار فارغة، تُفتح endpoints الخاصة به ويُسجل تحذير.',
    certificateTitle: 'إنشاء الشهادات',
    certificateBody: 'يسجّل دور master شهادة بتحديد خوارزمية التوقيع وخوارزمية التشفير وتأخير الانتشار وفترة الإصدار وTTL. وخلال تأخير الانتشار تزامن الخدمات الشهادة الجديدة قبل أن تصبح قابلة للإصدار.',
    clientTitle: 'تكامل العميل',
    clientSteps: [
      'استخدم الرمز الكامل وendpoint الشهادات الكاملة لخدمات الإصدار.',
      'استخدم رمز التحقق وخيار verify-only لخدمات التحقق.',
      'افحص نتيجة المزامنة الأولى؛ وإذا كان يجب أن يفشل بدء التشغيل، فاستدعِ API المزامنة الفورية.',
      'عند تفعيل المزامنة التلقائية، أغلق المدير أثناء إيقاف التطبيق.',
    ],
    libraryBefore: 'راجع ',
    libraryLink: 'أدلة المكتبات',
    libraryAfter: ' لمعرفة builder وسلوك الإغلاق في كل لغة.',
    operationsTitle: 'فحوص التشغيل',
    operationsItems: [
      'يبلغ `/health` و`/version/api` عن الحالة من دون مصادقة.',
      'يتطلب `/version`‏ master token عند إعداد ذلك الدور.',
      'اجمع السجلات من الإخراج القياسي وإخراج الخطأ القياسي.',
      'مرّر إشارات الإغلاق وامنح قاعدة البيانات وscheduler وقتًا للإغلاق.',
    ],
    kubernetesTitle: 'Kubernetes',
    kubernetesBody: 'طابق منفذ الحاوية وprobes مع منفذ الخدمة، وصِل دليل البيانات بصلاحية كتابة للمستخدم غير root. احقن الرموز وتفاصيل اتصال قاعدة البيانات عبر Secrets.',
  },
}
