# รหัสข้อผิดพลาด

การนำ DAT ไปใช้จะมอบรหัสข้อผิดพลาดที่เสถียรแยกต่างหากจากข้อความที่มนุษย์อ่านได้ โปรแกรมจะไม่เปรียบเทียบสตริงข้อความ แต่จะตัดสินการทำงานจากรหัสและการจำแนกการลองใหม่

## วิธีอ่าน

```text
DAT_<ขอบเขต>_<สาเหตุ>
```

| คำนำหน้า | ขอบเขต |
| --- | --- |
| `DAT_TOKEN_` | สตริง DAT และการหมดอายุ |
| `DAT_CERT_` | สตริงใบรับรองและสถานะ |
| `DAT_SIG_` | ลายเซ็นและการตรวจสอบ |
| `DAT_CRYPTO_` | การเข้ารหัสและการถอดรหัส |
| `DAT_KEY_` | รูปแบบคีย์และสิทธิ์ |
| `DAT_MANAGER_` | ตัวจัดการใบรับรอง |
| `DAT_CONFIG_` | อาร์กิวเมนต์การเรียกและการกำหนดค่า |
| `DAT_INTERNAL_` | ฟังก์ชันภายในรันไทม์ |
| `DAT_CMS_` | การซิงค์ไคลเอนต์ CMS |
| `DAT_AUTH_`, `DAT_REQ_`, `DAT_STORE_` | เซิร์ฟเวอร์ CMS |

`_UNKNOWN` ใช้เฉพาะกับข้อผิดพลาดที่ไม่สามารถจัดเข้ารหัสอื่นในแต่ละขอบเขตได้เท่านั้น สาเหตุเดียวกันจะใช้ชื่อเดียวกันแม้จะอยู่คนละขอบเขต

## การจำแนกการลองใหม่

| ประเภท | ความหมาย | การจัดการ |
| --- | --- | --- |
| ชั่วคราว | อาจสำเร็จได้หากสถานะภายนอกกลับคืน | ลองใหม่แบบจำกัดหลังจากหน่วงเวลาเพิ่มขึ้น |
| สถานะ | อาจสำเร็จได้เมื่อการซิงค์ใบรับรองหรือเวลาเปลี่ยนไป | อัปเดตสถานะที่จำเป็นแล้วลองใหม่ |
| ถาวร | ล้มเหลวแม้จะลองใหม่ด้วยอินพุตเดิม | แก้ไขอินพุต·การกำหนดค่า·โค้ด |

## โทเค็นและใบรับรอง

<ErrorCode code="DAT_TOKEN_MALFORMED" impact="none" retry="permanent">
จำนวนฟิลด์ ตัวเลข หรือการแสดง Base64Url ของ DAT แตกต่างจากข้อกำหนด ให้ทิ้งอินพุต
</ErrorCode>

<ErrorCode code="DAT_TOKEN_EXPIRED" impact="none" retry="permanent">
เวลาหมดอายุของ DAT เท่ากับเวลาปัจจุบันหรืออยู่ในอดีต ต้องรับ DAT ใหม่
</ErrorCode>

<ErrorCode code="DAT_CERT_MALFORMED" impact="none" retry="permanent">
โครงสร้างหรือการแสดงฟิลด์ของสตริงใบรับรองไม่ถูกต้อง
</ErrorCode>

<ErrorCode code="DAT_CERT_NOT_FOUND" impact="none" retry="state">
ไม่มีใบรับรองที่ตรงกับ `cid` ของ DAT ให้ตรวจสอบสถานะการซิงค์ใบรับรอง
</ErrorCode>

<ErrorCode code="DAT_CERT_NOT_SYNCED" impact="none" retry="state">
มีความเป็นไปได้ว่าใบรับรองที่จะใช้ยังมาไม่ถึงบริการ ให้ซิงค์ทันทีแล้วพิจารณาอีกครั้ง
</ErrorCode>

<ErrorCode code="DAT_CERT_NOT_YET_VALID" impact="none" retry="state">
ยังไม่ถึงเวลาเริ่มต้นของใบรับรอง ให้ตรวจสอบเวลาระบบและเวลาแจกจ่ายใบรับรอง
</ErrorCode>

<ErrorCode code="DAT_CERT_EXPIRED" impact="none" retry="permanent">
ระยะเวลาที่ใช้ใบรับรองตรวจสอบได้สิ้นสุดลงแล้ว
</ErrorCode>

<ErrorCode code="DAT_CERT_DUPLICATE" impact="partial" retry="permanent">
มี `cid` เดียวกันซ้ำกันในรายการนำเข้าครั้งเดียว ให้ปฏิเสธการนำเข้าทั้งหมด
</ErrorCode>

## ลายเซ็น การเข้ารหัส และคีย์

<ErrorCode code="DAT_SIG_MISMATCH" impact="none" suspect retry="permanent">
ลายเซ็นไม่ตรงกับเนื้อหา อาจเป็น DAT ที่ถูกดัดแปลงหรือ DAT ที่ลงนามด้วยคีย์อื่น
</ErrorCode>

<ErrorCode code="DAT_CRYPTO_TAG_MISMATCH" impact="none" suspect retry="permanent">
แท็กการยืนยัน AES-GCM ไม่ตรงกัน ให้ตรวจสอบการดัดแปลงข้อความเข้ารหัสหรือใบรับรองไม่ตรงกัน
</ErrorCode>

<ErrorCode code="DAT_KEY_INVALID" impact="none" retry="permanent">
ความยาว รูปแบบ หรือชุดอัลกอริทึมของคีย์ไม่ถูกต้อง
</ErrorCode>

<ErrorCode code="DAT_SIG_KEY_MISSING" impact="none" retry="permanent">
มีการพยายามออก DAT ด้วยใบรับรองสำหรับตรวจสอบเท่านั้น บริการออกโทเค็นต้องใช้ใบรับรองแบบเต็ม
</ErrorCode>

`DAT_SIG_MISMATCH` และ `DAT_CRYPTO_TAG_MISMATCH` คือข้อผิดพลาดที่ API เหตุการณ์ความปลอดภัยสาธารณะจัดประเภทว่าเป็นจริง อินพุตที่ไม่ถูกต้องหนึ่งรายการไม่ใช่เหตุขัดข้องของบริการ แต่หากเกิดซ้ำๆ ให้ถือเป็นเป้าหมายของการเฝ้าสังเกตด้านความปลอดภัย

## ตัวจัดการและการกำหนดค่า

<ErrorCode code="DAT_MANAGER_NO_CERTIFICATE" impact="partial" retry="state">
ไม่มีใบรับรองในตัวจัดการ ให้นำเข้าใบรับรองหรือซิงค์ CMS ให้เสร็จสิ้น
</ErrorCode>

<ErrorCode code="DAT_MANAGER_NO_ISSUABLE_CERTIFICATE" impact="partial" retry="state">
มีใบรับรอง แต่ไม่มีใบรับรองแบบเต็มที่สามารถออกได้ในปัจจุบัน ให้ตรวจสอบการหมดอายุ เวลาเริ่มต้น หรือว่าเป็น verify-only หรือไม่จากห่วงโซ่สาเหตุ
</ErrorCode>

<ErrorCode code="DAT_CONFIG_ARGUMENT_INVALID" impact="none" retry="permanent">
อาร์กิวเมนต์การเรียกหรือค่ากำหนดอยู่นอกช่วงที่อนุญาต
</ErrorCode>

<ErrorCode code="DAT_INTERNAL_UNAVAILABLE" impact="critical" retry="permanent">
แพลตฟอร์มปัจจุบันไม่มีฟังก์ชันเข้ารหัสหรือเครือข่ายที่จำเป็น
</ErrorCode>

## ไคลเอนต์ CMS

| รหัส | ความหมาย | การจัดการทั่วไป |
| --- | --- | --- |
| `DAT_CMS_URI_INVALID` | รูปแบบ URI ของ CMS ผิดพลาด | แก้ไขการกำหนดค่า |
| `DAT_CMS_UNAUTHORIZED` | การยืนยันตัวตนล้มเหลว | แก้ไขโทเค็น |
| `DAT_CMS_FORBIDDEN` | บทบาทไม่มีสิทธิ์ | ตรวจสอบบทบาทโทเค็น |
| `DAT_CMS_ENDPOINT_NOT_FOUND` | ไม่มีพาธหรือพาธแตกต่าง | ตรวจสอบที่อยู่และพาธ CMS |
| `DAT_CMS_NETWORK` | การเชื่อมต่อหรือการส่งล้มเหลว | ตรวจสอบเครือข่ายแล้วหน่วงเวลาก่อนลองใหม่ |
| `DAT_CMS_TIMEOUT` | เกินกำหนดเวลา | ปรับเครือข่ายและกำหนดเวลา |
| `DAT_CMS_SERVER_ERROR` | ข้อผิดพลาดของเซิร์ฟเวอร์ CMS | ตรวจสอบสถานะเซิร์ฟเวอร์แล้วหน่วงเวลาก่อนลองใหม่ |
| `DAT_CMS_RESPONSE_INVALID` | รูปแบบการตอบกลับที่สำเร็จไม่ถูกต้อง | ตรวจสอบสัญญาระหว่างเซิร์ฟเวอร์และไคลเอนต์ |
| `DAT_CMS_VERSION_RESET` | เวอร์ชันเซิร์ฟเวอร์ย้อนกลับ | ตรวจสอบข้อมูล CMS และสถานะการปรับใช้ |
| `DAT_CMS_IMPORT_FAILED` | นำใบรับรองที่ได้รับไปใช้ล้มเหลว | ตรวจสอบห่วงโซ่สาเหตุ |
| `DAT_CMS_STOPPED` | ใช้ตัวจัดการที่ปิดแล้ว | สร้างตัวจัดการใหม่หรือแก้ไขลำดับการเรียก |

ไลบรารีที่การซิงค์ครั้งแรกเป็นแบบ best-effort จะเก็บข้อผิดพลาดไว้ในฟิลด์ข้อผิดพลาดล่าสุด หากต้องให้การเริ่มต้นล้มเหลว ให้ใช้ API ซิงค์ทันทีซึ่งส่งคืนหรือโยนข้อผิดพลาดโดยตรง

## เซิร์ฟเวอร์ CMS

| รหัส | HTTP | ความหมาย |
| --- | --- | --- |
| `DAT_AUTH_UNAUTHORIZED` | 401 | ไม่มีโทเค็นหรือโทเค็นไม่ถูกต้อง |
| `DAT_AUTH_FORBIDDEN` | 403 | บทบาทโทเค็นไม่ตรงกับสิทธิ์ของคำขอ |
| `DAT_REQ_ALG_UNSUPPORTED` | 400 | ชื่ออัลกอริทึมที่ไม่รองรับ |
| `DAT_REQ_NOT_FOUND` | 404·405 | พาธหรือเมธอดไม่ตรงกัน |
| `DAT_REQ_TOO_LARGE` | 413 | รหัสสำรองสำหรับกรณีเกินขีดจำกัดเนื้อหาคำขอ |
| `DAT_STORE_UNAVAILABLE` | 503 | ไม่สามารถใช้ที่เก็บได้ชั่วคราว |
| `DAT_STORE_UNKNOWN` | 500 | ข้อผิดพลาดที่ไม่ได้จัดประเภทระหว่างประมวลผลที่เก็บ |

ปัจจุบันไคลเอนต์ไม่ได้เปิดเผยรหัสเซิร์ฟเวอร์ใน JSON ที่ไม่ใช่ 2xx ตามเดิม แต่จะแปลงสถานะ HTTP เป็นรหัส `DAT_CMS_*` รหัสข้อผิดพลาดในล็อกเซิร์ฟเวอร์และรหัสข้อผิดพลาดของไคลเอนต์อาจแตกต่างกัน

## วิธีตรวจสอบในแต่ละภาษา

| สภาพแวดล้อม | รหัสข้อผิดพลาด | การจำแนกการลองใหม่ |
| --- | --- | --- |
| Rust | `err.code()` | `err.retry()` |
| Go | `dat.Code(err)` | `dat.Retry(err)` |
| JavaScript / TypeScript | `error.code` | `error.retry` |
| Python | `error.code` | `error.retry` |
| Ruby | `error.code` | `error.retry` |
| Java / Kotlin | `error.code` | `error.retry` |
| C# | `error.Code` | `error.Retry` |
| C / C++ | `dat_error_code(error)` | `dat_error_retry(error)` |

สำหรับข้อผิดพลาดที่มีสาเหตุย่อย ให้ตรวจสอบผ่านห่วงโซ่ข้อยกเว้นหรือ API ค้นหาสาเหตุของแต่ละภาษา

<script setup lang="ts">
import ErrorCode from '../../.vitepress/ui/ErrorCode.vue';
</script>
