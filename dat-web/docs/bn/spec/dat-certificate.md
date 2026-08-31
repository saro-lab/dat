# সার্টিফিকেট

একটি DAT সার্টিফিকেট টোকেন ইস্যু ও যাচাইয়ের সময়সীমা, algorithms এবং কী একটি string-এ প্রকাশ করে।

<WireFormat
  hint="সার্টিফিকেটও নির্দিষ্ট ক্রমে ডট দিয়ে আলাদা ASCII ফিল্ড নিয়ে গঠিত।"
  :segments="[
    {name: 'cid', type: 'uint64', kind: 'meta', note: 'অপরিবর্তনীয় সার্টিফিকেট ID'},
    {name: 'start', type: 'uint64', kind: 'meta', note: 'ইস্যু শুরুর সময়'},
    {name: 'duration', type: 'uint64', kind: 'meta', note: 'ইস্যুর সময়কাল'},
    {name: 'ttl', type: 'uint64', kind: 'meta', note: 'DAT-এর আয়ু'},
    {name: 'sig-alg', type: 'name', kind: 'sig', note: 'স্বাক্ষর algorithm'},
    {name: 'crypto-alg', type: 'name', kind: 'secure', note: 'এনক্রিপশন algorithm'},
    {name: 'sig-key', type: 'Base64Url', kind: 'sig', note: 'স্বাক্ষর বা যাচাই কী'},
    {name: 'crypto-key', type: 'Base64Url', kind: 'secure', note: 'এনক্রিপশন কী'},
  ]"
/>

```text
cid.start.duration.ttl.sig-alg.crypto-alg.sig-key.crypto-key
```

## সময়সীমা

<CertTimeline />

- সার্টিফিকেট `start` থেকে `start + duration` পর্যন্ত, উভয় প্রান্তসহ, DAT ইস্যু করতে পারে।
- ইস্যু করা DAT ইস্যুর সময় থেকে `ttl` পর্যন্ত বৈধ।
- `start + duration + ttl` পর্যন্ত যাচাইয়ের জন্য সার্টিফিকেট প্রয়োজন এবং ঠিক সেই সময়েও যাচাইযোগ্য থাকে।

ইস্যুর সময় শেষ হলেই সার্টিফিকেট মুছলে ইতিমধ্যে ইস্যু করা DAT যাচাই অসম্ভব হয়। ম্যানেজার ও CMS ইস্যুযোগ্যতা ও যাচাইযোগ্যতা আলাদাভাবে বিবেচনা করে।

## সার্টিফিকেট ID ও কী পরিবর্তন

`cid` হলো কী এবং তার সময়সীমা শনাক্তকারী পাবলিক চুক্তি। বিদ্যমান `cid` কখনও ভিন্ন কী দিয়ে overwrite করবেন না। কী পরিবর্তনে নতুন `cid`-সহ নতুন সার্টিফিকেট তৈরি করুন। সার্ভিসগুলো আগেই নতুন সার্টিফিকেট সিঙ্ক্রোনাইজ করে এবং তার ইস্যু করা সব DAT শেষ হলেই পুরোনোটি সরায়।

## স্বাক্ষর algorithms

| নাম | উদ্দেশ্য | Verify-only সার্টিফিকেট |
| --- | --- | --- |
| `HMAC-SHA256-MFS` | HMAC SHA-256 | সমর্থিত নয় |
| `HMAC-SHA384-MFS` | HMAC SHA-384 | সমর্থিত নয় |
| `HMAC-SHA512-MFS` | HMAC SHA-512 | সমর্থিত নয় |
| `ECDSA-P256` | ECDSA P-256 | সমর্থিত |
| `ECDSA-P384` | ECDSA P-384 | সমর্থিত |
| `ECDSA-P521` | ECDSA P-521 | সমর্থিত |

HMAC একই কী দিয়ে স্বাক্ষর ও যাচাই করে, তাই যাচাইকারী সার্ভারকে সেই কী দিলে ইস্যুর ক্ষমতাও দেওয়া হয়। যেখানে ইস্যুর ক্ষমতা আলাদা রাখতে হবে সেখানে ECDSA ও verify-only সার্টিফিকেট ব্যবহার করুন।

## এনক্রিপশন algorithms

| নাম | কী |
| --- | --- |
| `IV-AES128-GCM` | AES-128 |
| `IV-AES256-GCM` | AES-256 |

Algorithm names wire contract-এর অংশ। JWT alias দিয়ে এগুলো বদলাবেন না।

## পূর্ণ ও verify-only সার্টিফিকেট

পূর্ণ ECDSA সার্টিফিকেটে স্বাক্ষরের private key থাকে। verify-only সার্টিফিকেটে শুধু ECDSA public key থাকে, তবে `secure` decrypt করার AES key বজায় থাকে। তাই verify-only সার্ভিস DAT যাচাই ও decrypt করতে পারে, কিন্তু নতুন DAT ইস্যু করতে পারে না।

<script setup lang="ts">
import WireFormat from "../../.vitepress/ui/WireFormat.vue";
import CertTimeline from "../../.vitepress/ui/CertTimeline.vue";
</script>
