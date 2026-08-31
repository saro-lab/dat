# AI ভাইব কোডিং

বর্তমান প্রকল্প ও চাওয়া আচরণ AI-কে জানিয়ে DAT ইন্টিগ্রেশন সহজ করুন। নিচের উদাহরণে শুধু URL ও environment variable-এর নাম আপনার প্রকল্প অনুযায়ী বদলান।

## সহজ বাস্তবায়ন

দ্রুত মৌলিক কাঠামো তৈরি করতে এই prompt ব্যবহার করুন।

```text
আমি Kotlin ও Spring Boot ব্যবহার করছি।
Spring Security-তে DAT authentication যোগ করুন।

প্রথমে https://dat.saro.me/llms.txt পড়ে
DAT specification ও official library documentation পর্যালোচনা করুন।

Authorization header-এর Bearer token যাচাই করুন,
এবং authentication সফল হলে user information SecurityContext-এ রাখুন।

এই server DAT ইস্যু করে না; শুধু যাচাই করে।
এটি DAT CMS থেকে verify-only certificates নেবে।

প্রথমে project-এ CMS server URL ও token settings খুঁজুন।
না পেলে আমাকে জিজ্ঞাসা করুন। মান উদ্ভাবন করবেন না।

official Java/Kotlin DAT library ব্যবহার করুন,
এবং project-এর বর্তমান structure ও coding style অনুসরণ করুন।
```

## বিস্তারিত বাস্তবায়ন

authentication flow ও error handling নির্ভুলভাবে নির্ধারণ করতে এই prompt ব্যবহার করুন।

```text
এই project Kotlin, Spring Boot ও Spring Security ব্যবহার করে।
বর্তমান security configuration পর্যালোচনা করে DAT authentication যোগ করুন।

প্রথমে https://dat.saro.me/llms.txt পড়ে
DAT specification, certificate synchronization ও official library API পর্যালোচনা করুন।

নিচের প্রয়োজনীয়তা বাস্তবায়ন করুন।

- Authorization: Bearer header থেকে DAT পড়ুন।
- DAT না থাকলে anonymous request হিসেবে চালিয়ে যান।
- DAT invalid বা expired হলে 401 দিন।
- যাচাই সফল হলে user ID ও permissions SecurityContext-এ রাখুন।
- plain থেকে শুধু প্রকাশ করা নিরাপদ এমন মান পড়ুন।
- যাচাই করা secure data থেকে user ID ও permissions পড়ুন।
- এই server verify-only, তাই DAT CMS-এর verify-only certificates ব্যবহার করুন।
- CMS URL ও token environment variables থেকে পড়ুন।
- startup-এ certificate synchronization ব্যর্থ হলে application startup-ও ব্যর্থ করুন।
- চলার সময় certificates স্বয়ংক্রিয়ভাবে refresh করুন এবং shutdown-এ manager বন্ধ করুন।
- error messages নয়, DAT error codes দিয়ে failure causes আলাদা করুন।
- মূল DAT, CMS token বা personal data log করবেন না।

প্রথমে project-এর Spring Security configuration ও user/permission model পরীক্ষা করুন।
CMS URL, token environment variable বা secure data format অস্পষ্ট হলে বাস্তবায়নের আগে জিজ্ঞাসা করুন।
official Java/Kotlin DAT library-এর শুধু public API ব্যবহার করুন।

code সম্পাদনার আগে authentication flow ও পরিবর্তনযোগ্য files সংক্ষেপে ব্যাখ্যা করুন।
```

## কোন উদাহরণ বেছে নেব?

- আগে কার্যকর code চাইলে **সহজ বাস্তবায়ন** ব্যবহার করুন।
- production environment-এর authentication flow দরকার হলে **বিস্তারিত বাস্তবায়ন** ব্যবহার করুন।

AI প্রশ্ন করলে প্রথমে CMS URL, token রাখা environment variable এবং `secure`-এ সংরক্ষিত user information দিন।
