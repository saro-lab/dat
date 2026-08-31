# DAT là gì?

DAT (Distributed Access Token) là đặc tả token truy cập dùng chung giữa dịch vụ phát hành và dịch vụ xác minh thông qua cùng một bộ chứng chỉ. Khi xác minh, dịch vụ không cần gọi lại dịch vụ phát hành hay kho phiên tập trung, nhờ đó có thể truyền kết quả xác thực mà giảm sự phụ thuộc giữa các dịch vụ.

<WireFormat
  hint="Các trường ngăn cách bằng dấu chấm tạo thành một DAT."
  :segments="[
    {name: 'expire', type: 'uint64', kind: 'meta', note: 'Thời gian Unix hết hạn'},
    {name: 'cid', type: 'uint64', kind: 'meta', note: 'ID chứng chỉ'},
    {name: 'plain', type: 'bytes', kind: 'plain', note: 'Dữ liệu công khai'},
    {name: 'secure', type: 'bytes', kind: 'secure', note: 'Dữ liệu mã hóa'},
    {name: 'signature', type: 'bytes', kind: 'sig', note: 'Chữ ký nội dung'},
  ]"
/>

## Thành phần

### DAT

Đây là chuỗi mà người dùng hoặc dịch vụ gửi kèm yêu cầu. Nó chứa thời điểm hết hạn, ID chứng chỉ và có thể mang cả dữ liệu công khai lẫn dữ liệu mã hóa.

### Chứng chỉ

Chứng chỉ chứa thuật toán, khóa và khoảng thời gian cần thiết để tạo và kiểm tra DAT. ID chứng chỉ `cid` là bất biến; khi thay khóa phải dùng một `cid` mới.

### Trình quản lý

Trình quản lý của thư viện máy khách lưu chứng chỉ, tạo DAT bằng chứng chỉ hiện có thể phát hành và xác minh DAT bằng chứng chỉ khớp với `cid`.

### DAT CMS

Đây là máy chủ tùy chọn để tạo, lưu giữ và phân phối chứng chỉ. Nó có thể cấp chứng chỉ đầy đủ cho dịch vụ phát hành và chứng chỉ chỉ xác minh cho dịch vụ chỉ thực hiện xác minh.

## Phát hành và xác minh

<ArchFlow
  :user="{label: 'Người dùng', icon: 'person'}"
  :cms="{label: 'DAT CMS', icon: 'workspace_premium', note: ['Quản lý chứng chỉ', 'Đồng bộ theo phiên bản']}"
  :service="{servers: [
    {label: 'Dịch vụ phát hành', kind: 'issuer', icon: 'login', request: 'Thông tin xác thực', response: 'DAT', sync: 'Chứng chỉ đầy đủ'},
    {label: 'Dịch vụ xác minh', kind: 'verifier', icon: 'apps', request: 'DAT', response: 'Chức năng được bảo vệ', sync: 'Chứng chỉ chỉ xác minh'},
  ]}"
/>

Dịch vụ phát hành xác định dữ liệu `plain` và `secure` rồi tạo DAT. Dịch vụ xác minh kiểm tra thời điểm hết hạn, chữ ký và bản mã trước khi chuyển hai vùng dữ liệu cho ứng dụng. `plain` được ký nhưng không được mã hóa, vì vậy không được chứa bí mật hoặc dữ liệu cá nhân.

## Vì sao vẫn xác minh được khi thay chứng chỉ

Khi chứng chỉ mới có thể phát hành, các DAT tiếp theo sẽ dùng `cid` mới. Chứng chỉ cũ vẫn được giữ để xác minh cho đến khi TTL của mọi DAT đã phát hành kết thúc. Nhờ đó có thể vận hành đồng thời việc xoay vòng khóa và thời gian xác minh token cũ.

## Phù hợp với môi trường nào

- Môi trường mà xác thực và chức năng thực tế do các dịch vụ khác nhau đảm nhiệm
- Môi trường có nhiều runtime cùng phát hành hoặc xác minh một loại token
- Môi trường muốn truyền quyền có thời hạn ngắn mà không tra cứu phiên tập trung
- Môi trường cần tách thông tin định tuyến công khai và dữ liệu cần bảo vệ trong cùng một token

DAT không định nghĩa chính sách phân quyền. Việc DAT hợp lệ và việc ứng dụng cho phép yêu cầu là hai quyết định khác nhau.

## Tài liệu tiếp theo

- [Đặc tả DAT](./spec/dat): các trường token và quy tắc xác minh
- [Chứng chỉ](./spec/dat-certificate): khóa và khoảng thời gian
- [Đặc tả DAT CMS](./spec/cms): hợp đồng đồng bộ
- [Thư viện](./libs/): tích hợp vào ứng dụng

<script setup lang="ts">
import WireFormat from "../.vitepress/ui/WireFormat.vue";
import ArchFlow from "../.vitepress/ui/ArchFlow.vue";
</script>
