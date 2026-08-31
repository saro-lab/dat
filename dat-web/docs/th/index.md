---
layout: home
---

<script setup lang="ts">
import {useRoot} from "../.vitepress/src/langs";
import {getLibTags} from "../.vitepress/src/libs";
import DatExample from "../.vitepress/ui/DatExample.vue";
import ArchFlow from "../.vitepress/ui/ArchFlow.vue";
import WireFormat from "../.vitepress/ui/WireFormat.vue";

const root = useRoot();
const tags = getLibTags(root.value);
const TAG_ICON: Record<string, string> = {
    Rust: '🦀', Cargo: '📦', Java: '☕', Kotlin: '🟣', Maven: '📦',
    JavaScript: '🟨', TypeScript: '🔷', Npm: '📦', Python: '🐍', Pypi: '📦',
    'C#': '🟩', Nuget: '📦', Go: '🐹', Ruby: '💎', Gems: '📦',
    'C++': '🔧', C: '🔧', Vcpkg: '📦',
};
function tagIcon(name: string): string {
    return TAG_ICON[name] || (name === '...' ? '' : '📦');
}
const features = [
    {icon: '⏱️', title: 'การหมดอายุเป็นส่วนหนึ่งของข้อกำหนด', desc: 'DAT ทุกอันมีเวลาหมดอายุ ไม่จำเป็นต้องตีความอายุโทเค็นแยกกันในแต่ละแอปพลิเคชัน'},
    {icon: '🔏', title: 'แยกพื้นที่สาธารณะและพื้นที่เข้ารหัส', desc: 'ใส่ค่าที่จำเป็นต่อการกำหนดเส้นทางไว้ใน plain และใส่ค่าที่ไม่ควรเปิดเผยภายนอกไว้ใน secure'},
    {icon: '🔑', title: 'เลือกคีย์ด้วยใบรับรอง', desc: 'cid ของโทเค็นชี้ไปยังใบรับรองที่ใช้ตรวจสอบ จึงยังตรวจสอบโทเค็นเดิมได้ระหว่างการเปลี่ยนคีย์'},
    {icon: '🌐', title: 'บริการไม่ต้องค้นหากันโดยตรง', desc: 'หากแต่ละบริการมีใบรับรองชุดเดียวกัน ก็สามารถแยกเซิร์ฟเวอร์ออกโทเค็นออกจากเซิร์ฟเวอร์ตรวจสอบได้'},
];
</script>

<div class="g-glass rd-box md hero">

<div class="hero-title"><a :href="`${root}/intro`">DAT</a></div>
<div class="hero-sub">Distributed Access Token</div>

<div class="hero-desc">
DAT คือโทเค็นการเข้าถึงที่บริการหลายตัวสามารถออกและตรวจสอบด้วยข้อกำหนดเดียวกัน ภายในโทเค็นประกอบด้วยเวลาหมดอายุ ID ใบรับรอง
ข้อมูลสาธารณะ ข้อมูลเข้ารหัส และลายเซ็น เซิร์ฟเวอร์ตรวจสอบจะตรวจโทเค็นด้วยใบรับรองที่ตนมีอยู่ โดยไม่ต้องถามเซิร์ฟเวอร์ผู้ออกทุกครั้ง
</div>

<div class="hero-desc">
ใบรับรองรวมวิธีลงนามและเข้ารหัสโทเค็น คีย์ ระยะเวลาออก และ TTL ไว้ด้วยกัน เมื่อใช้ DAT CMS แต่ละบริการสามารถ
ซิงค์ใบรับรองสำหรับออกหรือสำหรับตรวจสอบเท่านั้นได้ โดยไม่ต้องแจกจ่ายใบรับรองให้แต่ละบริการโดยตรง
</div>

<div class="feature-grid">
    <div class="feature-card" v-for="f in features" :key="f.title">
        <div class="feature-icon">{{f.icon}}</div>
        <div class="feature-title">{{f.title}}</div>
        <div class="feature-desc">{{f.desc}}</div>
    </div>
</div>

<div class="section-title">ลำดับการใช้งาน</div>

<ArchFlow
    :user="{label: 'ผู้ใช้', icon: 'person'}"
    :cms="{label: 'DAT CMS', icon: 'workspace_premium', note: ['สร้างและเก็บรักษาใบรับรอง', 'ส่งใบรับรองให้บริการ']}"
    :service="{servers: [
        {label: 'บริการออกโทเค็น', kind: 'issuer', icon: 'login', request: 'คำขอยืนยันตัวตน', response: 'ออก DAT', sync: 'ซิงค์ใบรับรองที่ออกได้'},
        {label: 'บริการตรวจสอบ', kind: 'verifier', icon: 'apps', request: 'คำขอที่แนบ DAT', response: 'ตอบกลับหลังตรวจสอบ', sync: 'ซิงค์ใบรับรองสำหรับตรวจสอบเท่านั้น'},
    ]}"
/>

<div class="hero-desc">
บริการออกโทเค็นสร้าง DAT ด้วยใบรับรองแบบเต็ม ส่วนบริการตรวจสอบจะตรวจ DAT ด้วยใบรับรองสำหรับตรวจสอบเท่านั้น
DAT CMS เป็นทางเลือก และในสภาพแวดล้อมที่แจกจ่ายใบรับรองโดยตรง สามารถใช้เฉพาะตัวจัดการแบบโลคัลของไคลเอนต์ได้
</div>

<div class="section-title">โครงสร้าง DAT</div>

<WireFormat
    hint="วางเมาส์เหนือแต่ละฟิลด์เพื่อดูคำอธิบาย"
    :segments="[
        {name: 'expire', type: 'uint64 (ฐานสิบ)', kind: 'meta', note: 'Unix time ที่ DAT หมดอายุ'},
        {name: 'cid', type: 'uint64 (ฐานสิบหก)', kind: 'meta', note: 'ID ใบรับรองที่ใช้ตรวจสอบ'},
        {name: 'plain', type: 'Base64Url', kind: 'plain', note: 'ไบต์สาธารณะที่ไม่เข้ารหัส'},
        {name: 'secure', type: 'Base64Url', kind: 'secure', note: 'ไบต์ที่ป้องกันด้วย AES-GCM'},
        {name: 'signature', type: 'Base64Url', kind: 'sig', note: 'ลายเซ็นที่ตรวจสอบฟิลด์ก่อนหน้าทั้งหมด'},
    ]"
/>

<a :href="`${root}/intro`" class="cta-banner">
    <div class="cta-icon">📘</div>
    <div class="cta-text">
        <div class="cta-title">เริ่มทำความรู้จัก DAT</div>
        <div class="cta-desc">อธิบายบทบาทของโทเค็น ใบรับรอง บริการออกโทเค็น และบริการตรวจสอบตามลำดับ</div>
    </div>
    <div class="cta-arrow">→</div>
</a>

<div class="section-title">ไลบรารี</div>
<div>
    <a v-for="tag in tags" :key="tag.link" :href="tag.link" class="g-chip">
        <span v-if="tagIcon(tag.name)">{{tagIcon(tag.name)}}</span>{{tag.name}}
    </a>
</div>

</div>

<DatExample />
