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
    {icon: '⏱️', title: 'Thời hạn là một phần của đặc tả', desc: 'Mọi DAT đều có thời điểm hết hạn. Mỗi ứng dụng không tự diễn giải tuổi thọ token theo cách riêng.'},
    {icon: '🔏', title: 'Tách dữ liệu công khai và dữ liệu mã hóa', desc: 'Đặt giá trị cần cho định tuyến vào plain và giá trị không được để lộ vào secure.'},
    {icon: '🔑', title: 'Chứng chỉ lựa chọn khóa', desc: 'cid của token chỉ tới chứng chỉ cần xác minh. Token cũ vẫn xác minh được trong quá trình xoay vòng khóa.'},
    {icon: '🌐', title: 'Các dịch vụ không cần gọi trực tiếp lẫn nhau', desc: 'Khi mỗi dịch vụ có cùng bộ chứng chỉ, dịch vụ phát hành và xác minh có thể vận hành riêng.'},
];
</script>

<div class="g-glass rd-box md hero">
<div class="hero-title"><a :href="`${root}/intro`">DAT</a></div>
<div class="hero-sub">Distributed Access Token</div>
<div class="hero-desc">
DAT là token truy cập được nhiều dịch vụ phát hành và xác minh theo cùng một đặc tả. Token chứa thời điểm hết hạn, ID chứng chỉ,
dữ liệu công khai, dữ liệu mã hóa và chữ ký. Dịch vụ xác minh dùng chứng chỉ của chính mình để kiểm tra token mà không phải hỏi lại dịch vụ phát hành mỗi lần.
</div>
<div class="hero-desc">
Chứng chỉ gộp phương thức và khóa ký, mã hóa, thời gian phát hành và TTL. Với DAT CMS, mỗi dịch vụ có thể đồng bộ
chứng chỉ phát hành hoặc chứng chỉ chỉ xác minh mà không cần tự phân phối.
</div>
<div class="feature-grid">
    <div class="feature-card" v-for="f in features" :key="f.title">
        <div class="feature-icon">{{f.icon}}</div>
        <div class="feature-title">{{f.title}}</div>
        <div class="feature-desc">{{f.desc}}</div>
    </div>
</div>
<div class="section-title">Luồng sử dụng</div>
<ArchFlow
    :user="{label: 'Người dùng', icon: 'person'}"
    :cms="{label: 'DAT CMS', icon: 'workspace_premium', note: ['Tạo và lưu chứng chỉ', 'Phân phối chứng chỉ cho dịch vụ']}"
    :service="{servers: [
        {label: 'Dịch vụ phát hành', kind: 'issuer', icon: 'login', request: 'Yêu cầu xác thực', response: 'Phát hành DAT', sync: 'Đồng bộ chứng chỉ có thể phát hành'},
        {label: 'Dịch vụ xác minh', kind: 'verifier', icon: 'apps', request: 'Yêu cầu kèm DAT', response: 'Phản hồi sau xác minh', sync: 'Đồng bộ chứng chỉ chỉ xác minh'},
    ]}"
/>
<div class="hero-desc">
Dịch vụ phát hành tạo DAT bằng chứng chỉ đầy đủ, còn dịch vụ xác minh kiểm tra DAT bằng chứng chỉ chỉ xác minh.
DAT CMS là tùy chọn; môi trường tự phân phối chứng chỉ có thể chỉ dùng trình quản lý cục bộ của thư viện máy khách.
</div>
<div class="section-title">Cấu trúc DAT</div>
<WireFormat
    hint="Di chuột lên từng trường để xem mô tả."
    :segments="[
        {name: 'expire', type: 'uint64 (thập phân)', kind: 'meta', note: 'Thời gian Unix khi DAT hết hạn.'},
        {name: 'cid', type: 'uint64 (thập lục phân)', kind: 'meta', note: 'ID chứng chỉ dùng để xác minh.'},
        {name: 'plain', type: 'Base64Url', kind: 'plain', note: 'Byte công khai không mã hóa.'},
        {name: 'secure', type: 'Base64Url', kind: 'secure', note: 'Byte được bảo vệ bằng AES-GCM.'},
        {name: 'signature', type: 'Base64Url', kind: 'sig', note: 'Chữ ký xác minh toàn bộ các trường phía trước.'},
    ]"
/>
<a :href="`${root}/intro`" class="cta-banner">
    <div class="cta-icon">📘</div>
    <div class="cta-text">
        <div class="cta-title">Bắt đầu tìm hiểu DAT</div>
        <div class="cta-desc">Tìm hiểu lần lượt vai trò của token, chứng chỉ, dịch vụ phát hành và dịch vụ xác minh.</div>
    </div>
    <div class="cta-arrow">→</div>
</a>
<div class="section-title">Thư viện</div>
<div>
    <a v-for="tag in tags" :key="tag.link" :href="tag.link" class="g-chip">
        <span v-if="tagIcon(tag.name)">{{tagIcon(tag.name)}}</span>{{tag.name}}
    </a>
</div>
</div>
<DatExample />
