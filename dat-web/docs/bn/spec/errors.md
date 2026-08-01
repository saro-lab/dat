# এরর কোড

এগুলো DAT-এ আনুষ্ঠানিকভাবে সমর্থিত সার্ভিস লাইব্রেরিগুলোর সাধারণ এরর কোড।

প্রতিটি কোডের সঙ্গে **প্রভাব** ও **পুনঃচেষ্টা** দুটি মান থাকে, আর কিছু কোডে বাড়তি **সন্দেহ** ট্যাগও যুক্ত হয়।

## প্রভাব — সার্ভিসের কতটা ক্ষতি

এটাই অ্যালার্ট বসানোর মানদণ্ড। কেবল একটাই দেখা হয়: "এই মুহূর্তে কি সার্ভিস থেমে গেছে?"

| প্রভাব | অর্থ | উদাহরণ |
| --- | --- | --- |
| <span class="lg lg-critical">গুরুতর</span> | সার্ভিস বা কোনো নির্দিষ্ট কার্যক্রম **থেমে যায়।** ইস্যু করা অসম্ভব, সিঙ্কের স্থায়ী ব্যর্থতা, ইনিশিয়ালাইজেশন ব্যর্থতা | ইস্যু করা সার্ভারে ব্যবহারযোগ্য একটিও সার্টিফিকেট নেই |
| <span class="lg lg-partial">আংশিক</span> | কিছু অনুরোধ বা চক্র ব্যর্থ হয় কিন্তু সার্ভিস চলতে থাকে। সাধারণত নিজে থেকেই সেরে ওঠে | CMS-এর এক চক্র ব্যর্থ। বিদ্যমান সার্টিফিকেট দিয়ে কাজ চলতে থাকে |
| <span class="lg lg-none">প্রভাব নেই</span> | একটি অনুরোধ প্রত্যাখ্যান করলেই শেষ | কারসাজি করা টোকেন এসেছে। ছেঁকে ফেলে দিলেই হলো |

**প্রভাব নেই** অ্যালার্টের লক্ষ্য নয়। একবার ভুল ইনপুট এসেছে বলে যদি সব দায়িত্বপ্রাপ্তকে দেখতে হয়, তাহলে অ্যালার্ট অর্থহীন হয়ে পড়ে।

## সন্দেহ — চলতে থাকলে তদন্ত

<span class="lg lg-suspect">সন্দেহ</span> ট্যাগ লাগানো কোডগুলো **একবার এলে স্বাভাবিক পরিচালনারই অংশ**। ক্লায়েন্ট যেকোনো সময় ভুল মান পাঠাতে পারে, আর সেটা ছেঁকে ফেলাই লাইব্রেরির কাজ।

তবে এই এররগুলো যদি **ধারাবাহিকভাবে, কিংবা নির্দিষ্ট উৎস থেকে ঝাঁক বেঁধে** আসে, তাহলে দুটোর একটা।

- **কনফিগারেশনের গোলমাল** — ডিপ্লয়মেন্ট ভুল হয়েছে, পুরোনো সংস্করণের ক্লায়েন্ট রয়ে গেছে, কিংবা সার্টিফিকেট মিলছে না।
- **হ্যাকিংয়ের চেষ্টা** — টোকেন বা কী কারসাজি করে যাচাই পার করার চেষ্টা, অথবা বৈধ মান খুঁজে বের করার অনুসন্ধান।

তাই এই কোডগুলোর ক্ষেত্রে **সংখ্যাকে মেট্রিক হিসেবে রাখাই** ঠিক। কেবল থ্রেশহোল্ড ছাড়ালে জানালেই যথেষ্ট।

## পুনঃচেষ্টা

| পুনঃচেষ্টা | অর্থ |
| --- | --- |
| <span class="lg lg-transient">সাময়িক</span> | ব্যাকঅফের পর আবার চেষ্টা করলে মিটে যায় |
| <span class="lg">স্থায়ী</span> | পুনঃচেষ্টা নিষেধ। কনফিগারেশন বা ইনপুট ঠিক করতে হবে |
| <span class="lg">অবস্থা</span> | এটি এরর নয়, একটি সংকেত |

---

## টোকেন

প্রাপ্ত টোকেন স্ট্রিংয়েরই সমস্যা।

<ErrorCode code="DAT_TOKEN_MALFORMED" impact="none" suspect retry="permanent" action="অনুরোধ প্রত্যাখ্যান">
বিন্দু দিয়ে আলাদা করা অংশ পাঁচটি নয়, বা <code>expire</code> বিশুদ্ধ দশমিক সংখ্যা নয়, বা <code>cid</code> বিশুদ্ধ ষোলোভিত্তিক নয়, বা <code>plain</code>·<code>secure</code> base64url নয়, অথবা কোনো সংখ্যাসূচক ফিল্ড পূর্ণসংখ্যার সীমা ছাড়িয়ে গেছে।
</ErrorCode>

<ErrorCode code="DAT_TOKEN_EXPIRED" impact="none" retry="permanent" action="টোকেন পুনরায় ইস্যুতে উৎসাহ">
<code>expire &lt;= now</code>। <strong>ঠিক সেই মুহূর্তটিও মেয়াদোত্তীর্ণ</strong> — অর্থাৎ <code>expire == now</code> হলে ইতিমধ্যেই মেয়াদ শেষ ধরা হয়।
</ErrorCode>

<ErrorCode code="DAT_TOKEN_UNKNOWN" impact="partial" retry="permanent" action="লগ দেখুন">
উপরের কোনো শ্রেণিতে পড়ে না এমন টোকেন এরর।
</ErrorCode>

::: tip মেয়াদোত্তীর্ণ আর ফরম্যাট এরর অবশ্যই আলাদা
প্রতিক্রিয়া একেবারে বিপরীত — মেয়াদোত্তীর্ণ হওয়া আয়ুর স্বাভাবিক সমাপ্তি, তাই টোকেন নবায়ন করালেই চলে; আর ফরম্যাট এরর মানে টোকেনটা আসলে ইস্যুই করা হয়নি, তাই প্রত্যাখ্যান করতে হবে।

পার্সিং **আগে গঠন নিশ্চিত করে, তারপর মান দেখে**। `"1.2.3"`-এর মতো অংশ কম থাকা স্ট্রিং মেয়াদোত্তীর্ণ টোকেন নয়, বরং আদৌ টোকেনই নয় — তাই এটি `DAT_TOKEN_MALFORMED`।

`expire` ফিল্ডে `+100`-এর মতো চিহ্ন থাকলেও সেটা মেয়াদ নয়, ফরম্যাট এরর। কেবল বিশুদ্ধ ASCII অঙ্কই গ্রহণযোগ্য।
:::

---

## সার্টিফিকেট

সার্টিফিকেট স্ট্রিংয়ের ফরম্যাট, এবং সেই সার্টিফিকেট এই মুহূর্তে ব্যবহার করা যাবে কি না — তার সমস্যা।

<ErrorCode code="DAT_CERT_MALFORMED" impact="critical" retry="permanent" action="সার্টিফিকেট পুনরায় বিতরণ">
বিন্দু দিয়ে আলাদা করা অংশ আটটি নয়, বা <code>cid</code>·<code>start</code>·<code>duration</code>·<code>ttl</code> পার্স করা যায়নি, বা কী ফিল্ড base64url নয়, অথবা <code>start + duration + ttl</code> u64-এর সীমা ছাড়িয়ে গেছে।
</ErrorCode>

<ErrorCode code="DAT_CERT_EXPIRED" impact="critical" retry="permanent" action="সার্টিফিকেট নবায়ন">
<code>start + duration + ttl &lt; now</code>। সম্পূর্ণ মেয়াদোত্তীর্ণ অবস্থা, যেখানে ইস্যু বা যাচাই কোনোটিই সম্ভব নয়।
</ErrorCode>

<ErrorCode code="DAT_CERT_NOT_YET_ISSUABLE" impact="critical" retry="transient" action="অপেক্ষা">
<code>now &lt; start</code>। ইস্যুর জানালা এখনো খোলেনি।
</ErrorCode>

<ErrorCode code="DAT_CERT_ISSUANCE_ENDED" impact="critical" retry="permanent" action="নতুন সার্টিফিকেট বিতরণ">
<code>now &gt; start + duration</code> কিন্তু ttl এখনো বাকি। ইস্যু করা যায় না, কেবল যাচাই সম্ভব।
</ErrorCode>

<ErrorCode code="DAT_CERT_VERIFY_ONLY" impact="critical" retry="permanent" action="বিতরণ সেটিং দেখুন">
স্বাক্ষরের প্রাইভেট কী ছাড়া কেবল পাবলিক কী ধারণ করা সার্টিফিকেট। যাচাই হয়, কিন্তু ইস্যু করা অসম্ভব।
</ErrorCode>

<ErrorCode code="DAT_CERT_NOT_FOUND" impact="none" suspect retry="permanent" action="অনুরোধ প্রত্যাখ্যান">
টোকেনের <code>cid</code>-এর সঙ্গে মিল থাকা কোনো সার্টিফিকেট নেই। হয় জাল টোকেন, নয়তো ভুল বিতরণ।
</ErrorCode>

<ErrorCode code="DAT_CERT_NOT_SYNCED" impact="partial" retry="transient" action="সিঙ্কের পর পুনঃচেষ্টা">
সেই <code>cid</code> এখনো CMS থেকে পাওয়া যায়নি। নতুন সার্টিফিকেট বিতরণের ঠিক পরে অল্প সময়ের জন্য ঘটে।
</ErrorCode>

<ErrorCode code="DAT_CERT_DUPLICATE_CID" impact="critical" retry="permanent" action="সার্ভারের উত্তর দেখুন">
import করা তালিকার ভেতরে একই <code>cid</code> দুইবার বা তার বেশি আছে।
</ErrorCode>

<ErrorCode code="DAT_CERT_UNKNOWN" impact="partial" retry="permanent" action="লগ দেখুন">
উপরের কোনো শ্রেণিতে পড়ে না এমন সার্টিফিকেট এরর।
</ErrorCode>

`DAT_CERT_NOT_FOUND` আর `DAT_CERT_NOT_SYNCED`-এর বাহ্যিক উপসর্গ এক হলেও প্রতিক্রিয়া আলাদা। প্রথমটি এমন `cid` যা কখনো ইস্যুই করা হয়নি, তাই অপেক্ষা করে লাভ নেই; দ্বিতীয়টি সিঙ্ক হলেই মিটে যায়।

`DAT_CERT_NOT_FOUND` একবার এলে কেবল ছেঁকে ফেললেই হয়, কিন্তু হঠাৎ বেড়ে গেলে বুঝতে হবে বিতরণ এলোমেলো হয়েছে বা জাল টোকেন ঘুরে বেড়াচ্ছে।

---

## স্বাক্ষর

<ErrorCode code="DAT_SIG_MISMATCH" impact="none" suspect retry="permanent" action="সেশন বন্ধ, নিরাপত্তা লগ">
স্বাক্ষর যাচাই <strong>অমিল</strong> হয়ে শেষ হয়েছে। HMAC মান ভিন্ন, অথবা ECDSA verify false দিয়েছে।
</ErrorCode>

<ErrorCode code="DAT_SIG_MALFORMED" impact="none" suspect retry="permanent" action="অনুরোধ প্রত্যাখ্যান">
স্বাক্ষরের অংশ ফাঁকা, বা base64url নয়, বা ECDSA-র <code>r‖s</code> দৈর্ঘ্য বক্ররেখার সঙ্গে মেলে না, অথবা DER রূপান্তর ব্যর্থ হয়েছে।
</ErrorCode>

<ErrorCode code="DAT_SIG_KEY_MISSING" impact="critical" retry="permanent" action="ইস্যু সার্ভারের সেটিং দেখুন">
verify-only কী দিয়ে স্বাক্ষরের চেষ্টা হয়েছে। অর্থাৎ রানটাইমে প্রাইভেট কী নেই।
</ErrorCode>

<ErrorCode code="DAT_SIG_BACKEND" impact="partial" retry="permanent" action="কী-এর ধরন ও লাইব্রেরি দেখুন">
স্বাক্ষর বা যাচাইয়ের <strong>ক্রিয়াটিই চালানো যায়নি।</strong> ভুল কী-এর ধরন, মুক্ত করে দেওয়া হ্যান্ডল, কিংবা ক্রিপ্টো লাইব্রেরির অভ্যন্তরীণ ত্রুটি।
</ErrorCode>

<ErrorCode code="DAT_SIG_UNKNOWN" impact="partial" retry="permanent" action="লগ দেখুন">
উপরের কোনো শ্রেণিতে পড়ে না এমন স্বাক্ষর এরর।
</ErrorCode>

::: warning অমিল আর ব্যাকএন্ড ব্যর্থতা গুলিয়ে ফেলবেন না
দুটি কোডের অক্ষ একেবারে বিপরীত।

- `DAT_SIG_MISMATCH` — আসা স্বাক্ষরটা কেবল মেলেনি, তাই **সার্ভিসে কোনো প্রভাব নেই**; বরং চলতে থাকলে **সন্দেহ**-এর বিষয় হয়ে ওঠে।
- `DAT_SIG_BACKEND` — যাচাইয়ের ক্রিয়াটাই চলেনি, তাই এটি **লাইব্রেরির দিকের সমস্যা**, সন্দেহের বিষয় নয়।

ভুল কী-এর ধরন বা লাইব্রেরির বাগকে "স্বাক্ষরের অমিল" বলে রিপোর্ট করলে, আসলে কোড নষ্ট হওয়ার ঘটনাটাই আক্রমণের সূচকে মিশে যায়। উল্টোদিকে সত্যিকারের জালিয়াতি ব্যাকএন্ড এরর হিসেবে শ্রেণিবদ্ধ হলে সন্দেহের সূচক থেকে পুরোপুরি বাদ পড়ে যায়।
:::

---

## এনক্রিপশন

secure পেলোডের এনক্রিপশন ও ডিক্রিপশনের সমস্যা।

<ErrorCode code="DAT_CRYPTO_TAG_MISMATCH" impact="none" suspect retry="permanent" action="সেশন বন্ধ, নিরাপত্তা লগ">
AES-GCM প্রমাণীকরণ ট্যাগ মিলছে না। হয় secure-এ কারসাজি হয়েছে, নয়তো সার্টিফিকেটের কী ভিন্ন।
</ErrorCode>

<ErrorCode code="DAT_CRYPTO_DATA_INVALID" impact="none" suspect retry="permanent" action="অনুরোধ প্রত্যাখ্যান">
সাইফারটেক্সট ফাঁকা নয় অথচ IV (12 বাইট)-এর সমান বা তার চেয়ে ছোট, অথবা ইনপুট বাস্তবায়নের সীমা (<code>INT_MAX</code> ইত্যাদি) ছাড়িয়ে গেছে।
</ErrorCode>

<ErrorCode code="DAT_CRYPTO_BACKEND" impact="partial" retry="permanent" action="প্ল্যাটফর্ম সাপোর্ট দেখুন">
এনক্রিপশন বা ডিক্রিপশনের ক্রিয়া চালানো যায়নি। GCM সমর্থন না করা প্ল্যাটফর্ম, কিংবা কনটেক্সট ইনিশিয়ালাইজেশন ব্যর্থতা।
</ErrorCode>

<ErrorCode code="DAT_CRYPTO_UNKNOWN" impact="partial" retry="permanent" action="লগ দেখুন">
উপরের কোনো শ্রেণিতে পড়ে না এমন এনক্রিপশন/ডিক্রিপশন এরর।
</ErrorCode>

**ফাঁকা secure পেলোড এরর নয়।** ফাঁকা ইনপুট ফাঁকা আউটপুট হয় এবং কোনো কোডই দেয় না।

স্বাক্ষর যাচাই এড়িয়ে যাওয়া পথে GCM ট্যাগই **একমাত্র অখণ্ডতা পরীক্ষা**। সে কারণেই `DAT_CRYPTO_TAG_MISMATCH`-কে অন্যান্য ডিক্রিপশন ব্যর্থতার সঙ্গে একই কোডে বাঁধা হয় না।

---

## কী ম্যাটেরিয়াল

<ErrorCode code="DAT_KEY_INVALID" impact="none" suspect retry="permanent" action="কী প্রতিস্থাপন">
ঘোষিত অ্যালগরিদম ও কী-এর দৈর্ঘ্যের অমিল (HMAC 32/48/64, AES 16/32), বা বক্ররেখার বাইরের বিন্দু, বা <code>d ∉ [1,n-1]</code>, বা অসংকুচিত (0x04) ফরম্যাট না হওয়া, অথবা প্রাইভেট ও পাবলিক কী পরস্পরের জোড়া না হওয়া।
</ErrorCode>

<ErrorCode code="DAT_KEY_VERIFY_ONLY_UNSUPPORTED" impact="critical" retry="permanent" action="অ্যালগরিদম পরিবর্তন">
HMAC পরিবার থেকে verify-only এক্সপোর্টের অনুরোধ করা হয়েছে।
</ErrorCode>

<ErrorCode code="DAT_KEY_UNKNOWN" impact="partial" retry="permanent" action="লগ দেখুন">
উপরের কোনো শ্রেণিতে পড়ে না এমন কী এরর।
</ErrorCode>

**দেখতে একরকম কিন্তু আলাদা তিনটি:**

| কোড | অর্থ |
| --- | --- |
| `DAT_KEY_VERIFY_ONLY_UNSUPPORTED` | **অ্যালগরিদমের কাঠামোগত সীমা।** HMAC প্রতিসম কী, তাই এতে পাবলিক কী-এর ধারণাই নেই |
| `DAT_SIG_KEY_MISSING` | **রানটাইম অবস্থা।** এই মুহূর্তে এই কী-তে প্রাইভেট কী নেই |
| `DAT_CERT_VERIFY_ONLY` | **বিতরণের রূপ।** এই সার্টিফিকেটটি কেবল যাচাইয়ের জন্য বিতরণ করা হয়েছে |

---

## ম্যানেজার

সার্টিফিকেট ধরে রাখা এবং ইস্যু ও যাচাইয়ে ব্যবহৃত অবজেক্টের অবস্থা।

<ErrorCode code="DAT_MANAGER_NO_CERTIFICATE" impact="critical" retry="transient" action="CMS সংযোগ দেখুন">
একটিও সার্টিফিকেট নেই। হয় import-এর আগে, নয়তো CMS-এর প্রথম সিঙ্ক ব্যর্থ হয়েছে।
</ErrorCode>

<ErrorCode code="DAT_MANAGER_NO_ISSUABLE_CERTIFICATE" impact="critical" retry="permanent" action="কারণ (cause) দেখে সিদ্ধান্ত — নিচের টেবিল">
সার্টিফিকেট আছে, কিন্তু এই মুহূর্তে ইস্যুতে ব্যবহারযোগ্য কোনোটি নেই। <strong>কারণ সঙ্গে পাঠানো হয়।</strong>
</ErrorCode>

<ErrorCode code="DAT_MANAGER_DISPOSED" impact="critical" retry="permanent" action="কলিং কোড সংশোধন">
ইতিমধ্যে মুক্ত করে দেওয়া ম্যানেজার বা সার্টিফিকেট ব্যবহার করা হয়েছে।
</ErrorCode>

<ErrorCode code="DAT_MANAGER_UNKNOWN" impact="partial" retry="permanent" action="লগ দেখুন">
উপরের কোনো শ্রেণিতে পড়ে না এমন ম্যানেজার এরর।
</ErrorCode>

`DAT_MANAGER_NO_ISSUABLE_CERTIFICATE`-এর কারণ (`cause`) চারটির একটি। **কারণভেদে করণীয় সম্পূর্ণ আলাদা।**

| কারণ | অর্থ | পুনঃচেষ্টা | প্রতিক্রিয়া |
| --- | --- | --- | --- |
| `DAT_CERT_NOT_YET_ISSUABLE` | ইস্যুর জানালা শুরুর আগে | **সাময়িক** | অপেক্ষা করলেই মিটে যায় |
| `DAT_CERT_ISSUANCE_ENDED` | ইস্যুর জানালা শেষ, কেবল যাচাই সম্ভব | স্থায়ী | নতুন সার্টিফিকেট বিতরণ করতে হবে |
| `DAT_CERT_EXPIRED` | সংরক্ষিত সবগুলোই মেয়াদোত্তীর্ণ | স্থায়ী | সার্টিফিকেট নবায়ন প্রয়োজন |
| `DAT_CERT_VERIFY_ONLY` | সংরক্ষিত সবগুলোই কেবল যাচাইয়ের | স্থায়ী | **বিতরণ সেটিংয়ের ভুল** |

ইস্যু করা সার্ভার যদি কেবল যাচাইয়ের সার্টিফিকেট নিতে সেট করা থাকে, তাহলে `DAT_CERT_VERIFY_ONLY` আসে। অপেক্ষা করে এটি কখনোই মেটে না, তাই পুনঃচেষ্টার লক্ষ্য নয়।

---

## কনফিগারেশন

কলার যে মান দিয়েছে তার সমস্যা। `CONFIG` পরিবারের সবগুলোই **কোড সংশোধন করতে হয় এমন এরর**, আর পরিচালনার সময় দেখা দিলে বুঝতে হবে ডিপ্লয়মেন্ট ভুল হয়েছে।

<ErrorCode code="DAT_CONFIG_ALG_UNSUPPORTED" impact="critical" retry="permanent" action="অ্যালগরিদমের নাম দেখুন">
অজানা অ্যালগরিদমের নাম। ওয়্যার নোটেশনের (<code>ECDSA-P256</code>, <code>IV-AES256-GCM</code>) সঙ্গে হুবহু মিলতে হবে।
</ErrorCode>

<ErrorCode code="DAT_CONFIG_ARGUMENT_INVALID" impact="critical" retry="permanent" action="কলিং কোড সংশোধন">
আবশ্যক আর্গুমেন্ট null, বা অনুমোদিত সীমার বাইরে (ঋণাত্মক সময়ের মান, <code>interval &lt;= 0</code>), বা অসমর্থিত ধরন (ডায়নামিক টাইপের ভাষায় payload-এ সংখ্যা বা বুলিয়ান দেওয়া), অথবা স্বাক্ষরের লক্ষ্য body ফাঁকা।
</ErrorCode>

<ErrorCode code="DAT_CONFIG_URI_INVALID" impact="critical" retry="permanent" action="URI সংশোধন">
CMS সার্ভারের URI মান অনুযায়ী নয়। পার্স করা যাচ্ছে না, স্কিম http/https নয়, অথবা এর সঙ্গে পাথ বা কোয়েরি জুড়ে আছে।
</ErrorCode>

<ErrorCode code="DAT_CONFIG_UNKNOWN" impact="critical" retry="permanent" action="লগ দেখুন">
উপরের কোনো শ্রেণিতে পড়ে না এমন কনফিগারেশন এরর।
</ErrorCode>

---

## অভ্যন্তরীণ

কার্যকরী পরিবেশ ও রানটাইমের সমস্যা।

<ErrorCode code="DAT_INTERNAL_UNAVAILABLE" impact="critical" retry="permanent" action="ডিপ্লয়মেন্ট ও প্ল্যাটফর্ম দেখুন">
ক্রিপ্টো ব্যাকএন্ড বা রানটাইম API আদৌ নেই। <code>crypto.subtle</code>-এর অনুপস্থিতি, AES-GCM সমর্থন না করা প্ল্যাটফর্ম, কিংবা রানটাইম সংস্করণ কম হওয়া।
</ErrorCode>

<ErrorCode code="DAT_INTERNAL_UNKNOWN" impact="critical" retry="permanent" action="লগ দেখুন">
মেমরি বরাদ্দে ব্যর্থতা, র‍্যান্ডম সংখ্যা তৈরিতে ব্যর্থতা, লক অর্জনে ব্যর্থতা, অথবা অগম্য হিসেবে নকশা করা শাখায় পৌঁছে যাওয়া।
</ErrorCode>

`DAT_INTERNAL_UNAVAILABLE` ডিপ্লয়মেন্ট পরিবেশ ঠিক করলে মিটে যায়, আর `DAT_INTERNAL_UNKNOWN` সাধারণত রানটাইম বিভ্রাট বা লাইব্রেরির বাগ।

---

## CMS সিঙ্ক

CMS সিঙ্ক ব্যবহার না করলে এই কোডগুলো আসে না।

<ErrorCode code="DAT_CMS_UNREACHABLE" impact="partial" retry="transient" action="ব্যাকঅফের পর পুনঃচেষ্টা">
DNS ব্যর্থতা, সংযোগ প্রত্যাখ্যান, TLS ব্যর্থতা, <strong>টাইমআউট</strong>। টাইমআউট আলাদা কোড নয়, এখানেই অন্তর্ভুক্ত — কারণ প্রতিক্রিয়া একই।
</ErrorCode>

<ErrorCode code="DAT_CMS_UNAUTHORIZED" impact="critical" retry="permanent" http="401" action="টোকেন সেটিং দেখুন">
সার্ভার 401 দিয়ে উত্তর দিয়েছে। টোকেন নেই বা ভুল।
</ErrorCode>

<ErrorCode code="DAT_CMS_FORBIDDEN" impact="critical" retry="permanent" http="403" action="টোকেনের স্তর দেখুন">
সার্ভার 403 দিয়ে উত্তর দিয়েছে। টোকেন বৈধ, কিন্তু এই এন্ডপয়েন্টের অনুমতি নেই।
</ErrorCode>

<ErrorCode code="DAT_CMS_ENDPOINT_NOT_FOUND" impact="critical" retry="permanent" http="404" action="URL সেটিং দেখুন">
সার্ভার 404 দিয়ে উত্তর দিয়েছে। URL ভুল।
</ErrorCode>

<ErrorCode code="DAT_CMS_SERVER_ERROR" impact="partial" retry="transient" http="5xx" action="ব্যাকঅফের পর পুনঃচেষ্টা">
সার্ভার 5xx দিয়ে উত্তর দিয়েছে।
</ErrorCode>

<ErrorCode code="DAT_CMS_HTTP_STATUS" impact="critical" retry="permanent" action="স্ট্যাটাস কোড দেখুন">
উপরের কোনোটিতে না পড়া 2xx-বহির্ভূত উত্তর।
</ErrorCode>

<ErrorCode code="DAT_CMS_MALFORMED" impact="critical" retry="permanent" action="সার্ভারের সংস্করণ দেখুন">
উত্তরে সংস্করণের লাইন নেই, বা সংস্করণের লাইন বিশুদ্ধ দশমিক সংখ্যা নয়, অথবা সীমা ছাড়িয়ে গেছে।
</ErrorCode>

<ErrorCode code="DAT_CMS_IMPORT_FAILED" impact="critical" retry="permanent" action="cause-এর CERT_* / KEY_* দেখুন">
উত্তর পাওয়া গেছে কিন্তু সার্টিফিকেট প্রয়োগ করা যায়নি। <strong>কারণ <code>cause</code>-এ থাকে।</strong>
</ErrorCode>

<ErrorCode code="DAT_CMS_VERSION_RESET" impact="none" retry="state" http="200" action="স্বয়ংক্রিয়ভাবে সামলানো হয়">
সার্ভার ক্লায়েন্টের চেয়ে পুরোনো সংস্করণ ফেরত দিয়েছে। এটি পূর্ণ পুনঃসিঙ্কের নির্দেশ।
</ErrorCode>

<ErrorCode code="DAT_CMS_NOT_SYNCED" impact="critical" retry="transient" action="প্রথম সিঙ্কের অপেক্ষা">
এখন পর্যন্ত একবারও সিঙ্ক সফল হয়নি এমন অবস্থা।
</ErrorCode>

<ErrorCode code="DAT_CMS_SYNC_IN_PROGRESS" impact="none" retry="state">
আগের সিঙ্ক এখনো চলছে বলে এই চক্রটি এড়িয়ে যাওয়া হয়েছে। এটি এরর নয়।
</ErrorCode>

<ErrorCode code="DAT_CMS_NOT_SUPPORTED" impact="critical" retry="permanent" action="বিল্ড অপশন দেখুন">
CMS সুবিধা বিল্ডে অন্তর্ভুক্ত হয়নি। হয় ফিচার সক্রিয় নয়, নয়তো CURL যুক্ত নেই।
</ErrorCode>

<ErrorCode code="DAT_CMS_UNKNOWN" impact="partial" retry="permanent" action="লগ দেখুন">
উপরের কোনো শ্রেণিতে পড়ে না এমন CMS এরর।
</ErrorCode>

সিঙ্ক যেসব কোডে **স্থায়ী ব্যর্থতা** হিসেবে গণ্য হয় (`UNAUTHORIZED`·`FORBIDDEN`·`ENDPOINT_NOT_FOUND`·`MALFORMED`·`IMPORT_FAILED`) সেগুলো সবই গুরুতর। পুনঃচেষ্টায় মেটে না অথচ সার্টিফিকেট মেয়াদোত্তীর্ণ হতেই থাকে, তাই অবহেলা করলে সার্ভিস অবশ্যই থেমে যাবে।

উল্টোদিকে `UNREACHABLE`·`SERVER_ERROR` আংশিক। বিদ্যমান সার্টিফিকেট দিয়ে কাজ চলতে থাকে এবং পরের চক্রে নিজেই সেরে ওঠে — **তবে ব্যর্থতা চলতেই থাকলে শেষ পর্যন্ত গুরুতরে গড়ায়।** তাই পরপর ব্যর্থতার সংখ্যার ভিত্তিতে অ্যালার্ট বসান।

::: tip সিঙ্ক ব্যর্থতা এক্সেপশন হিসেবে ছোড়া হয় না
প্রথম সিঙ্ক ব্যর্থ হলেও ম্যানেজার স্বাভাবিকভাবেই ফেরত আসে — কারণ দেরিতে হলেও সিঙ্ক হওয়াটাই ভালো। তার বদলে ব্যর্থতা **অনুসন্ধানযোগ্য অবস্থা** হিসেবে থেকে যায়।

| ক্লায়েন্ট | অনুসন্ধানের পদ্ধতি |
| --- | --- |
| Rust | `manager.last_error().await` |
| Go | `manager.LastError()` |
| JavaScript | `manager.lastError()` |
| Python | `manager.last_error()` |
| Ruby | `manager.last_error` |
| Java/Kotlin | `manager.lastError` |
| C# | `manager.LastError` |
| C/C++ | `dat_cms_manager_last_error(m)` |

একবারও সফল না হলে `DAT_CMS_NOT_SYNCED`, আর স্বাভাবিক থাকলে ফাঁকা।
:::

---

## সার্ভার

এগুলো CMS সার্ভারের দেওয়া কোড। ক্লায়েন্ট এগুলো **তৈরি করে না, কেবল গ্রহণ করে**।

<ErrorCode code="DAT_AUTH_UNAUTHORIZED" impact="none" suspect retry="permanent" http="401">
<code>Authorization</code> হেডার নেই, অথবা টোকেন কোনো স্তরেই নিবন্ধিত নয়।
</ErrorCode>

<ErrorCode code="DAT_AUTH_FORBIDDEN" impact="none" suspect retry="permanent" http="403">
টোকেন নিবন্ধিত আছে, কিন্তু এই এন্ডপয়েন্ট যে স্তর চায় সেটি নয়।
</ErrorCode>

<ErrorCode code="DAT_AUTH_DISABLED" impact="critical" retry="state" action="এখনই টোকেন সেট করুন">
একটিও টোকেন সেট না থাকায় প্রমাণীকরণ পুরোপুরি নিষ্ক্রিয়। <strong>সার্টিফিকেট ইস্যুর API পর্যন্ত প্রমাণীকরণ ছাড়াই খোলা।</strong> এটি উত্তরে যায় না, কেবল বুট লগে লেখা হয়।
</ErrorCode>

<ErrorCode code="DAT_REQ_MALFORMED" impact="none" suspect retry="permanent" http="400">
পাথ বা কোয়েরি প্যারামিটার বোঝা যায়নি, অথবা আর্গুমেন্ট অনুমোদিত সীমার বাইরে (ঋণাত্মক delay, দশ বছরের বেশি ইত্যাদি)।
</ErrorCode>

<ErrorCode code="DAT_REQ_ALG_UNSUPPORTED" impact="none" retry="permanent" http="400">
অনুরোধের পাথে দেওয়া অ্যালগরিদমের নাম অজানা।
</ErrorCode>

<ErrorCode code="DAT_REQ_NOT_FOUND" impact="none" suspect retry="permanent" http="404·405">
এমন কোনো রুট নেই, অথবা মেথড ভিন্ন।
</ErrorCode>

<ErrorCode code="DAT_REQ_TOO_LARGE" impact="none" suspect retry="permanent" http="413">
অনুরোধের body-র আকার সীমা ছাড়িয়ে গেছে।
</ErrorCode>

<ErrorCode code="DAT_REQ_UNKNOWN" impact="none" retry="permanent" http="400">
উপরের কোনো শ্রেণিতে পড়ে না এমন অনুরোধ এরর।
</ErrorCode>

<ErrorCode code="DAT_STORE_UNAVAILABLE" impact="partial" retry="transient" http="503" action="ব্যাকঅফের পর পুনঃচেষ্টা">
DB সংযোগ বিচ্ছিন্ন, কানেকশন পুল নিঃশেষ, লক প্রতিযোগিতা, টাইমআউট। এটি <strong>503 ব্যবহার করা একমাত্র কোড</strong>, যার মাধ্যমে ক্লায়েন্ট জানতে পারে "এটা অপেক্ষা করলে ঠিক হয়ে যাবে"।
</ErrorCode>

<ErrorCode code="DAT_STORE_UNKNOWN" impact="critical" retry="permanent" http="500" action="DB-র অবস্থা দেখুন">
পড়া বা লেখার ব্যর্থতা, টেবিল না থাকা, স্কিমার অমিল, সংরক্ষিত সার্টিফিকেট সারির ক্ষতিগ্রস্ততা।
</ErrorCode>

উত্তরের খাম:

```json
{
  "code": "DAT_REQ_ALG_UNSUPPORTED",
  "details": { "algorithm": "BOGUS-ALG" }
}
```

সার্টিফিকেট তৈরি ও পরিচালনার সময় যেসব এরর হয়, সার্ভারও সেগুলোর জন্য উপরের সাধারণ কোডই (`DAT_CERT_*`, `DAT_KEY_*`, `DAT_CONFIG_*`) ব্যবহার করে।

### সার্ভারের কোড পেলে

ক্লায়েন্ট সার্ভারের কোডকে নিজের `CMS` কোড দিয়ে মুড়ে দেয়, আর মূলটি `cause`-এ সংরক্ষণ করে।

| যা পাওয়া গেল | HTTP | ক্লায়েন্ট যে কোড দেয় |
| --- | --- | --- |
| `DAT_AUTH_UNAUTHORIZED` | 401 | `DAT_CMS_UNAUTHORIZED` |
| `DAT_AUTH_FORBIDDEN` | 403 | `DAT_CMS_FORBIDDEN` |
| `DAT_REQ_NOT_FOUND` | 404 | `DAT_CMS_ENDPOINT_NOT_FOUND` |
| `DAT_REQ_*` (অন্যান্য) | 400·405·413 | `DAT_CMS_HTTP_STATUS` |
| `DAT_STORE_UNAVAILABLE` | 503 | `DAT_CMS_SERVER_ERROR` |
| `DAT_STORE_UNKNOWN` | 500 | `DAT_CMS_SERVER_ERROR` |
| (সংস্করণ অবনমন) | 200 | `DAT_CMS_VERSION_RESET` |

---

## উপসর্গ দিয়ে খোঁজা

| উপসর্গ | কোড |
| --- | --- |
| লগইনের ঠিক পরে চলে, কিছুক্ষণ পর প্রত্যাখ্যাত হয় | `DAT_TOKEN_EXPIRED` — টোকেনের আয়ু ফুরিয়েছে। পুনরায় ইস্যু করলেই চলবে |
| কেবল নির্দিষ্ট সার্ভারে যাচাই ব্যর্থ | `DAT_CERT_NOT_SYNCED` — সেই সার্ভার এখনো নতুন CID পায়নি |
| সব সার্ভারেই একই টোকেন প্রত্যাখ্যাত | `DAT_CERT_NOT_FOUND` — এটি এমন CID যা কখনো ইস্যু করা হয়নি |
| ইস্যু করা সার্ভার টোকেন বানাতে পারছে না | `DAT_MANAGER_NO_ISSUABLE_CERTIFICATE` + `DAT_CERT_VERIFY_ONLY` — **verify-only হিসেবে বিতরণ হয়েছে** |
| কেবল বুটের ঠিক পরেই ইস্যু ব্যর্থ | `DAT_MANAGER_NO_CERTIFICATE` — প্রথম সিঙ্কের আগে। কিছুক্ষণ পরেই মিটে যাবে |
| CMS সিঙ্ক বারবার ব্যর্থ | `DAT_CMS_UNAUTHORIZED` — টোকেন ভুল। পুনঃচেষ্টাতেও মিটবে না |
| একটিও সার্টিফিকেট আসছে না | `DAT_CMS_ENDPOINT_NOT_FOUND` — URL-এ বানান ভুল |
| কেবল নির্দিষ্ট প্ল্যাটফর্মে ব্যর্থ | `DAT_INTERNAL_UNAVAILABLE` — ক্রিপ্টো ব্যাকএন্ড নেই |
| যাচাই ব্যর্থতা হঠাৎ বেড়ে গেছে | `DAT_SIG_MISMATCH` — একটি ঘটনা নিরীহ, কিন্তু **ঝাঁক বেঁধে এলে জালিয়াতির চেষ্টা** |
| secure ডিক্রিপশন হঠাৎ ব্যর্থ | `DAT_CRYPTO_TAG_MISMATCH` — হয় সার্টিফিকেট মিলছে না, নয়তো **কারসাজির চেষ্টা** |
| CMS বুট লগে সতর্কবার্তা | `DAT_AUTH_DISABLED` — **প্রমাণীকরণ বন্ধ।** ইস্যুর API খোলা পড়ে আছে |

---

## পরিশিষ্ট

### কোডের গঠন

```
DAT_<ক্ষেত্র>_<কারণ>
```

- একই কারণ ভিন্ন ক্ষেত্রে দেখা দিলে **কারণের নাম একই থাকে।** `DAT_TOKEN_MALFORMED` আর `DAT_CERT_MALFORMED`-এ কেবল লক্ষ্যবস্তু আলাদা, অর্থ এক।
- `_UNKNOWN` প্রতিটি ক্ষেত্রের **কেবল ফলব্যাক**। "অজানা অ্যালগরিদম"-এর মতো অন্য অর্থে ব্যবহৃত হয় না (সেটি `_UNSUPPORTED`)।
- কোড স্ট্রিং একটি প্রকাশ্য চুক্তি। বার্তা স্বাধীনভাবে বদলানো গেলেও কোড বদলানো হয় না।

| শ্রেণি | কোডের উপসর্গ |
| --- | --- |
| টোকেন | `DAT_TOKEN_` |
| সার্টিফিকেট | `DAT_CERT_` |
| স্বাক্ষর | `DAT_SIG_` |
| এনক্রিপশন | `DAT_CRYPTO_` |
| কী ম্যাটেরিয়াল | `DAT_KEY_` |
| ম্যানেজার | `DAT_MANAGER_` |
| কনফিগারেশন | `DAT_CONFIG_` |
| অভ্যন্তরীণ | `DAT_INTERNAL_` |
| CMS সিঙ্ক | `DAT_CMS_` |
| সার্ভার | `DAT_AUTH_` · `DAT_REQ_` · `DAT_STORE_` |

### ক্লায়েন্ট অনুযায়ী অ্যাক্সেসের পদ্ধতি

| ক্লায়েন্ট | এররের ধরন | কোড | পুনঃচেষ্টার শ্রেণি | নিরাপত্তা ইভেন্ট |
| --- | --- | --- | --- | --- |
| Rust | `DatError` enum | `err.code()` | `err.retry()` | `err.security_event()` |
| Go | `*dat.Error` | `err.Code` | `dat.Retry(err)` | `dat.SecurityEvent(err)` |
| JavaScript | `DatError extends Error` | `e.code` | `e.retry` | `e.securityEvent` |
| Python | `DatError(ValueError, RuntimeError)` | `e.code` | `e.retry` | `e.security_event` |
| Ruby | `Saro::Dat::Error` | `e.code` | `e.retry` | `e.security_event?` |
| Java/Kotlin | `DatException` | `e.code` | `e.retry` | `e.securityEvent` |
| C# | `DatException` | `e.Code` | `e.Retry` | `e.SecurityEvent` |
| C/C++ | `dat_error_t` | `dat_error_code(e)` | `dat_error_retry(e)` | `dat_error_is_security_event(e)` |
| CMS সার্ভার | JSON খাম | `code` ফিল্ড | — | — |

`নিরাপত্তা ইভেন্ট` কেবল জালিয়াতি ও কারসাজি নিশ্চিত এমন দুটি ক্ষেত্রেই (`DAT_SIG_MISMATCH`, `DAT_CRYPTO_TAG_MISMATCH`) `true` ফেরত দেয়। এই ডকুমেন্টের **সন্দেহ** ট্যাগের পরিধি তার চেয়ে বিস্তৃত (কারসাজি করা টোকেন, কী ও অনুরোধ পর্যন্ত), এবং এটি এখন কেবল ডকুমেন্টেশনের শ্রেণিবিভাগ — ক্লায়েন্ট API-তে প্রকাশ করা হয় না।

**প্রভাব**-এর মাত্রাও একইভাবে ডকুমেন্টেশনের শ্রেণিবিভাগ। কারণ একই কোড কোথায় দেখা দিল তার উপর ক্ষতির মাত্রা বদলায় — যেমন `DAT_KEY_INVALID` আসা টোকেন ছেঁকে ফেলার সময় প্রভাবহীন, কিন্তু CMS সিঙ্কের সময় সার্টিফিকেট পড়তে গিয়ে দেখা দিলে গোটা সিঙ্কই ব্যর্থ করে দেয়।

**অধস্তন কারণ ফেলে দেওয়া হয় না।** `DAT_MANAGER_NO_ISSUABLE_CERTIFICATE` ও `DAT_CMS_IMPORT_FAILED` প্রতিটি ভাষার এক্সেপশন চেইনের (`cause` / `__cause__` / `InnerException` / `Unwrap()`) মাধ্যমে কারণ পৌঁছে দেয়।

::: warning C/C++ সংখ্যাসূচক মানও ধরে রাখে
`dat_error_t`-এর পুরোনো সংখ্যাসূচক মানগুলো ABI সামঞ্জস্যের জন্য অপরিবর্তিত রাখা হয়েছে, তবে **টেক্সট কোডই মূল**। লাইব্রেরি আর পুরোনো মান ফেরত দেয় না, তাই `err == DAT_ERROR_INVALID_DAT`-এর মতো তুলনা আর সঠিক নয়। `dat_error_code(e)` দিয়ে মিলিয়ে দেখুন।

C-তে এক্সেপশন চেইন নেই, তাই কারণ আলাদাভাবে `dat_manager_issuable_cause()` দিয়ে দেখা হয়।
:::

<script setup lang="ts">
import ErrorCode from '../../.vitepress/ui/ErrorCode.vue';
</script>

<style scoped>
/* 범례 배지 — ErrorCode 컴포넌트의 배지와 같은 모양이라 눈으로 바로 이어진다. */
.lg {
    padding: 2px 6px;
    border-radius: 4px;
    font-size: 0.85em;
    font-weight: 500;
    white-space: nowrap;
}
.lg          { background: color-mix(in srgb, currentColor 8%, transparent); opacity: 0.7; }
.lg-critical { background: color-mix(in srgb, #dc2626 16%, transparent); color: #dc2626; opacity: 1; }
.lg-partial  { background: color-mix(in srgb, #ea580c 16%, transparent); color: #ea580c; opacity: 1; }
.lg-none     { background: color-mix(in srgb, currentColor 8%, transparent); color: var(--c-muted); opacity: 1; }
.lg-suspect  { background: none; border: 1px solid color-mix(in srgb, var(--c-accent-2) 55%, transparent); color: var(--c-accent-2); opacity: 1; }
.lg-transient { background: color-mix(in srgb, var(--c-link-1) 16%, transparent); color: var(--c-link-1); opacity: 1; }
</style>
