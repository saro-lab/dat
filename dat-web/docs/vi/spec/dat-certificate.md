# Chứng chỉ

Chứng chỉ DAT biểu diễn trong một chuỗi duy nhất các khoảng thời gian, thuật toán và khóa cần thiết để phát hành và xác minh token.

<WireFormat
  hint="Chứng chỉ cũng gồm các trường ASCII theo thứ tự cố định, ngăn cách bằng dấu chấm."
  :segments="[
    {name: 'cid', type: 'uint64', kind: 'meta', note: 'ID chứng chỉ bất biến'},
    {name: 'start', type: 'uint64', kind: 'meta', note: 'Thời điểm bắt đầu phát hành'},
    {name: 'duration', type: 'uint64', kind: 'meta', note: 'Khoảng thời gian phát hành'},
    {name: 'ttl', type: 'uint64', kind: 'meta', note: 'Thời hạn DAT'},
    {name: 'sig-alg', type: 'name', kind: 'sig', note: 'Thuật toán chữ ký'},
    {name: 'crypto-alg', type: 'name', kind: 'secure', note: 'Thuật toán mã hóa'},
    {name: 'sig-key', type: 'Base64Url', kind: 'sig', note: 'Khóa ký hoặc xác minh'},
    {name: 'crypto-key', type: 'Base64Url', kind: 'secure', note: 'Khóa mã hóa'},
  ]"
/>

```text
cid.start.duration.ttl.sig-alg.crypto-alg.sig-key.crypto-key
```

## Khoảng thời gian

<CertTimeline />

- Chứng chỉ có thể phát hành DAT từ `start` đến `start + duration`, bao gồm cả hai thời điểm.
- DAT đã phát hành có hiệu lực trong `ttl` tính từ thời điểm phát hành.
- Chứng chỉ cần được giữ để xác minh đến `start + duration + ttl` và vẫn xác minh được đúng tại thời điểm đó.

Nếu xóa chứng chỉ ngay khi giai đoạn phát hành kết thúc, DAT đã phát hành sẽ không thể được xác minh. Vì vậy trình quản lý và CMS xử lý riêng khả năng phát hành và khả năng xác minh.

## ID chứng chỉ và xoay vòng khóa

`cid` là hợp đồng công khai nhận diện khóa và khoảng thời gian. Không ghi đè khóa khác lên `cid` hiện có. Khi xoay vòng khóa, hãy tạo chứng chỉ mới với `cid` mới. Các dịch vụ đồng bộ chứng chỉ mới trước, và chỉ xóa chứng chỉ cũ sau khi mọi DAT phát hành bằng chứng chỉ đó đã hết hạn.

## Thuật toán chữ ký

| Tên | Mục đích | Chứng chỉ chỉ xác minh |
| --- | --- | --- |
| `HMAC-SHA256-MFS` | HMAC SHA-256 | Không hỗ trợ |
| `HMAC-SHA384-MFS` | HMAC SHA-384 | Không hỗ trợ |
| `HMAC-SHA512-MFS` | HMAC SHA-512 | Không hỗ trợ |
| `ECDSA-P256` | ECDSA P-256 | Hỗ trợ |
| `ECDSA-P384` | ECDSA P-384 | Hỗ trợ |
| `ECDSA-P521` | ECDSA P-521 | Hỗ trợ |

HMAC dùng cùng một khóa để ký và xác minh, nên cung cấp khóa cho dịch vụ xác minh cũng trao cho dịch vụ đó khả năng phát hành. Khi cần tách quyền phát hành, hãy dùng ECDSA và chứng chỉ chỉ xác minh.

## Thuật toán mã hóa

| Tên | Khóa |
| --- | --- |
| `IV-AES128-GCM` | AES-128 |
| `IV-AES256-GCM` | AES-256 |

Tên thuật toán là một phần của hợp đồng wire. Không thay chúng bằng các bí danh dùng trong JWT.

## Chứng chỉ đầy đủ và chứng chỉ chỉ xác minh

Chứng chỉ ECDSA đầy đủ chứa khóa riêng cần để ký. Chứng chỉ chỉ xác minh chỉ giữ khóa công khai ECDSA nhưng vẫn giữ khóa AES cần để giải mã `secure`. Do đó dịch vụ chỉ xác minh có thể kiểm tra và giải mã DAT nhưng không thể phát hành DAT mới.

<script setup lang="ts">
import WireFormat from "../../.vitepress/ui/WireFormat.vue";
import CertTimeline from "../../.vitepress/ui/CertTimeline.vue";
</script>
