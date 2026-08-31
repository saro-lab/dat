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
    {icon: '⏱️', title: 'Sona erme standarda dahildir', desc: 'Her DAT bir sona erme zamanı içerir. Token ömrü her uygulamada ayrıca yorumlanmaz.'},
    {icon: '🔏', title: 'Açık ve şifreli alanlar ayrılır', desc: 'Yönlendirme için gereken değerleri plain alanına, dışa açıklanmaması gerekenleri secure alanına koyun.'},
    {icon: '🔑', title: 'Anahtar sertifikayla seçilir', desc: 'Tokenın cid değeri doğrulamada kullanılacak sertifikayı gösterir. Anahtar değiştirilirken eski tokenlar da doğrulanabilir.'},
    {icon: '🌐', title: 'Servisler birbirini doğrudan sorgulamaz', desc: 'Her servis aynı sertifikalara sahipse tokenı veren ve doğrulayan sunucular ayrı işletilebilir.'},
];
</script>

<div class="g-glass rd-box md hero">

<div class="hero-title"><a :href="`${root}/intro`">DAT</a></div>
<div class="hero-sub">Distributed Access Token</div>

<div class="hero-desc">
DAT, birden fazla servisin aynı standarda göre verdiği ve doğruladığı bir erişim tokenıdır. Token; sona erme zamanını, sertifika kimliğini,
açık veriyi, şifreli veriyi ve imzayı içerir. Doğrulama sunucusu her seferinde tokenı veren sunucuya sormadan kendi sertifikasıyla tokenı denetler.
</div>

<div class="hero-desc">
Sertifika; imzalama ve şifreleme yöntemlerini, anahtarları, verme süresini ve TTL'i bir araya getirir. DAT CMS kullanıldığında sertifikalar
her servise elle dağıtılmadan tam veya yalnızca doğrulama amaçlı olarak eşitlenebilir.
</div>

<div class="feature-grid">
    <div class="feature-card" v-for="f in features" :key="f.title">
        <div class="feature-icon">{{f.icon}}</div>
        <div class="feature-title">{{f.title}}</div>
        <div class="feature-desc">{{f.desc}}</div>
    </div>
</div>

<div class="section-title">Kullanım akışı</div>

<ArchFlow
    :user="{label: 'Kullanıcı', icon: 'person'}"
    :cms="{label: 'DAT CMS', icon: 'workspace_premium', note: ['Sertifika oluşturma ve saklama', 'Sertifikaları servislere iletme']}"
    :service="{servers: [
        {label: 'Token veren servis', kind: 'issuer', icon: 'login', request: 'Kimlik doğrulama isteği', response: 'DAT verme', sync: 'Token verebilen sertifikaları eşitleme'},
        {label: 'Doğrulama servisi', kind: 'verifier', icon: 'apps', request: 'DAT ile istek', response: 'Doğrulamadan sonra yanıt', sync: 'Yalnızca doğrulama sertifikalarını eşitleme'},
    ]}"
/>

<div class="hero-desc">
Token veren servis tam sertifikayla DAT oluşturur; doğrulama servisi ise yalnızca doğrulama sertifikasıyla DAT'yi denetler.
DAT CMS isteğe bağlıdır; sertifikaların doğrudan dağıtıldığı ortamlarda yalnızca istemcinin yerel yöneticisi kullanılabilir.
</div>

<div class="section-title">DAT yapısı</div>

<WireFormat
    hint="Açıklamayı görmek için imleci bir alanın üzerine getirin."
    :segments="[
        {name: 'expire', type: 'uint64 (ondalık)', kind: 'meta', note: 'DAT\'nin sona erdiği Unix time.'},
        {name: 'cid', type: 'uint64 (onaltılık)', kind: 'meta', note: 'Doğrulamada kullanılacak sertifika kimliği.'},
        {name: 'plain', type: 'Base64Url', kind: 'plain', note: 'Şifrelenmeyen açık baytlar.'},
        {name: 'secure', type: 'Base64Url', kind: 'secure', note: 'AES-GCM ile korunan baytlar.'},
        {name: 'signature', type: 'Base64Url', kind: 'sig', note: 'Önceki alanların tamamını doğrulayan imza.'},
    ]"
/>

<a :href="`${root}/intro`" class="cta-banner">
    <div class="cta-icon">📘</div>
    <div class="cta-text">
        <div class="cta-title">DAT'yi tanımaya başlayın</div>
        <div class="cta-desc">Tokenın, sertifikanın, token veren ve doğrulayan servislerin rollerini sırasıyla açıklar.</div>
    </div>
    <div class="cta-arrow">→</div>
</a>

<div class="section-title">Kütüphaneler</div>
<div>
    <a v-for="tag in tags" :key="tag.link" :href="tag.link" class="g-chip">
        <span v-if="tagIcon(tag.name)">{{tagIcon(tag.name)}}</span>{{tag.name}}
    </a>
</div>

</div>

<DatExample />
