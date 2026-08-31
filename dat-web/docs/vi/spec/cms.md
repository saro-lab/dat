# DAT CMS

DAT CMS là dịch vụ tùy chọn tạo, lưu giữ và phân phối chứng chỉ cho trình quản lý máy khách. Tài liệu này mô tả hợp đồng đồng bộ giữa máy khách và máy chủ. Xem [hướng dẫn dịch vụ DAT CMS](../svc/docker-saro-lab-dat-cms) để cài đặt và vận hành.

<FlowDiagram
  title="Đồng bộ chứng chỉ"
  :actors="[
    {id: 'client', label: 'Máy khách', kind: 'client'},
    {id: 'cms', label: 'DAT CMS', kind: 'cms'},
  ]"
  :steps="[
    {from: 'client', to: 'cms', label: 'Yêu cầu phiên bản hiện tại và chứng chỉ', kind: 'req'},
    {from: 'cms', to: 'client', label: 'Phản hồi phiên bản và chứng chỉ', kind: 'res'},
    {from: 'client', label: 'Xác minh toàn bộ rồi áp dụng nguyên tử', kind: 'note'},
  ]"
/>

## Endpoint theo vai trò

| Vai trò | Đường dẫn | Mục đích |
| --- | --- | --- |
| Lấy chứng chỉ đầy đủ | `GET /v1/certs?version=<n>` | Dịch vụ phát hành DAT |
| Lấy chứng chỉ chỉ xác minh | `GET /v1/certs/verify-only?version=<n>` | Dịch vụ chỉ xác minh và giải mã |
| Đăng ký chứng chỉ | `POST /v1/cert/{signature}/{crypto}/{propagation}/{issuance}/{ttl}` | Người vận hành hoặc tác vụ tạo chứng chỉ |

Hai endpoint lấy chứng chỉ có thể được bảo vệ bằng các vai trò token khác nhau. Đặt tùy chọn `verifyOnly` của trình quản lý để dịch vụ chỉ xác minh không yêu cầu chứng chỉ đầy đủ.

## Con trỏ phiên bản

Máy khách gửi phiên bản cuối cùng đã áp dụng cho máy chủ. Nếu trạng thái máy chủ không đổi, không cần gửi lại chứng chỉ. Khi có trạng thái mới, dòng đầu chứa phiên bản và các dòng tiếp theo chứa chứng chỉ.

Nếu phản hồi thành công chỉ có phiên bản mà không có chứng chỉ, hệ thống giữ nguyên chứng chỉ và bên phát hành hiện có. Phản hồi có phiên bản máy chủ thấp hơn phiên bản máy khách không làm lùi trạng thái mà được xử lý như lỗi.

## Quy tắc áp dụng chứng chỉ

- Nếu cùng một `cid` lặp lại trong phản hồi, toàn bộ phản hồi bị từ chối.
- Nếu `cid` mới trùng với `cid` đang có, chứng chỉ hiện tại được giữ lại.
- Chỉ áp dụng trạng thái một lần sau khi phân tích và xác minh toàn bộ chứng chỉ.
- Không để lại trạng thái chỉ nhập thành công một phần chứng chỉ.
- Chọn bên phát hành phù hợp trong số chứng chỉ hiện có thể phát hành.

## Đồng bộ ban đầu và thủ công

Ở hầu hết thư viện, lần đồng bộ đầu khi tạo trình quản lý là best-effort. Dù thất bại, trình quản lý vẫn được tạo và lưu lỗi cụ thể gần nhất. Nếu ứng dụng phải dừng khởi động khi đồng bộ thất bại, hãy gọi API đồng bộ tức thời của thư viện và chuyển lỗi cho bên gọi.

Môi trường không dùng đồng bộ tự động có thể tắt interval và tự đồng bộ khi cần. Nếu dùng đồng bộ tự động, hãy đóng hoặc dừng trình quản lý khi ứng dụng tắt.

## Mạng và lỗi

Đặt thời gian chờ kết nối và toàn bộ yêu cầu phù hợp với môi trường vận hành. Chính sách chuyển hướng khác nhau theo runtime, vì vậy hãy xem tài liệu thư viện. Các phản hồi CMS không phải 2xx hiện được máy khách phân loại thành lỗi `DAT_CMS_*` theo trạng thái HTTP; mã lỗi chi tiết trong JSON máy chủ không được giữ nguyên.

Khi kho dữ liệu tạm thời gặp sự cố, máy chủ có thể cung cấp ảnh chụp chứng chỉ thành công gần nhất. Nếu chưa có ảnh chụp thành công, máy chủ trả về `DAT_STORE_UNAVAILABLE`.

## Tài liệu dịch vụ

Việc triển khai, cơ sở dữ liệu, token truy cập và cấu hình chạy được mô tả trong [hướng dẫn dịch vụ DAT CMS](../svc/docker-saro-lab-dat-cms).

<script setup lang="ts">
import FlowDiagram from "../../.vitepress/ui/FlowDiagram.vue";
</script>
