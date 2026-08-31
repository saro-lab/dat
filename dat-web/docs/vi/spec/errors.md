# Mã lỗi

Các triển khai DAT cung cấp mã lỗi ổn định tách biệt với thông báo dành cho con người. Chương trình phải quyết định cách xử lý bằng mã lỗi và loại thử lại, không so sánh chuỗi thông báo.

## Cách đọc

```text
DAT_<phạm_vi>_<nguyên_nhân>
```

| Tiền tố | Phạm vi |
| --- | --- |
| `DAT_TOKEN_` | Chuỗi DAT và thời hạn |
| `DAT_CERT_` | Chuỗi và trạng thái chứng chỉ |
| `DAT_SIG_` | Chữ ký và xác minh |
| `DAT_CRYPTO_` | Mã hóa và giải mã |
| `DAT_KEY_` | Định dạng và quyền của khóa |
| `DAT_MANAGER_` | Trình quản lý chứng chỉ |
| `DAT_CONFIG_` | Đối số gọi và cấu hình |
| `DAT_INTERNAL_` | Chức năng nội bộ của runtime |
| `DAT_CMS_` | Đồng bộ máy khách CMS |
| `DAT_AUTH_`, `DAT_REQ_`, `DAT_STORE_` | Máy chủ CMS |

`_UNKNOWN` chỉ dùng cho lỗi không thể phân loại bằng mã khác trong cùng phạm vi. Cùng một nguyên nhân dùng cùng một tên dù xuất hiện ở phạm vi khác.

## Phân loại thử lại

| Loại | Ý nghĩa | Cách xử lý |
| --- | --- | --- |
| Tạm thời | Có thể thành công khi trạng thái bên ngoài phục hồi | Thử lại có giới hạn sau khi chờ lùi |
| Trạng thái | Có thể thành công khi đồng bộ chứng chỉ hoặc thời gian thay đổi | Cập nhật trạng thái cần thiết rồi thử lại |
| Vĩnh viễn | Vẫn thất bại với cùng đầu vào | Sửa đầu vào, cấu hình hoặc mã |

## Token và chứng chỉ

<ErrorCode code="DAT_TOKEN_MALFORMED" impact="none" retry="permanent">
Số trường, số hoặc biểu diễn Base64Url của DAT không đúng đặc tả. Hãy loại bỏ đầu vào.
</ErrorCode>

<ErrorCode code="DAT_TOKEN_EXPIRED" impact="none" retry="permanent">
Thời điểm hết hạn của DAT bằng hoặc sớm hơn thời gian hiện tại. Cần lấy DAT mới.
</ErrorCode>

<ErrorCode code="DAT_CERT_MALFORMED" impact="none" retry="permanent">
Cấu trúc hoặc biểu diễn trường của chuỗi chứng chỉ không hợp lệ.
</ErrorCode>

<ErrorCode code="DAT_CERT_NOT_FOUND" impact="none" retry="state">
Không có chứng chỉ ứng với `cid` của DAT. Hãy kiểm tra trạng thái đồng bộ chứng chỉ.
</ErrorCode>

<ErrorCode code="DAT_CERT_NOT_SYNCED" impact="none" retry="state">
Chứng chỉ cần dùng có thể chưa đến dịch vụ. Hãy đồng bộ ngay rồi đánh giá lại.
</ErrorCode>

<ErrorCode code="DAT_CERT_NOT_YET_VALID" impact="none" retry="state">
Chưa đến thời điểm bắt đầu của chứng chỉ. Hãy kiểm tra đồng hồ hệ thống và thời điểm phân phối.
</ErrorCode>

<ErrorCode code="DAT_CERT_EXPIRED" impact="none" retry="permanent">
Thời gian có thể xác minh của chứng chỉ đã kết thúc.
</ErrorCode>

<ErrorCode code="DAT_CERT_DUPLICATE" impact="partial" retry="permanent">
Cùng một `cid` lặp lại trong một danh sách nhập. Toàn bộ lần nhập bị từ chối.
</ErrorCode>

## Chữ ký, mã hóa và khóa

<ErrorCode code="DAT_SIG_MISMATCH" impact="none" suspect retry="permanent">
Chữ ký không khớp nội dung. DAT đã bị sửa đổi hoặc được ký bằng khóa khác.
</ErrorCode>

<ErrorCode code="DAT_CRYPTO_TAG_MISMATCH" impact="none" suspect retry="permanent">
Thẻ xác thực AES-GCM không khớp. Hãy kiểm tra bản mã bị sửa đổi hoặc chứng chỉ không khớp.
</ErrorCode>

<ErrorCode code="DAT_KEY_INVALID" impact="none" retry="permanent">
Độ dài, định dạng khóa hoặc tổ hợp thuật toán không hợp lệ.
</ErrorCode>

<ErrorCode code="DAT_SIG_KEY_MISSING" impact="none" retry="permanent">
Đã cố phát hành DAT bằng chứng chỉ chỉ xác minh. Dịch vụ phát hành cần chứng chỉ đầy đủ.
</ErrorCode>

`DAT_SIG_MISMATCH` và `DAT_CRYPTO_TAG_MISMATCH` là các lỗi được API sự kiện bảo mật công khai phân loại là sự kiện. Một đầu vào sai đơn lẻ không phải sự cố dịch vụ, nhưng nếu lặp lại thì phải coi là tín hiệu cần theo dõi bảo mật.

## Trình quản lý và cấu hình

<ErrorCode code="DAT_MANAGER_NO_CERTIFICATE" impact="partial" retry="state">
Trình quản lý không có chứng chỉ. Hãy nhập chứng chỉ hoặc hoàn tất đồng bộ CMS.
</ErrorCode>

<ErrorCode code="DAT_MANAGER_NO_ISSUABLE_CERTIFICATE" impact="partial" retry="state">
Có chứng chỉ nhưng hiện không có chứng chỉ đầy đủ nào có thể phát hành. Kiểm tra thời hạn, thời điểm bắt đầu hoặc trạng thái verify-only trong chuỗi nguyên nhân.
</ErrorCode>

<ErrorCode code="DAT_CONFIG_ARGUMENT_INVALID" impact="none" retry="permanent">
Đối số gọi hoặc giá trị cấu hình nằm ngoài phạm vi cho phép.
</ErrorCode>

<ErrorCode code="DAT_INTERNAL_UNAVAILABLE" impact="critical" retry="permanent">
Nền tảng hiện tại không có chức năng mã hóa hoặc mạng cần thiết.
</ErrorCode>

## Máy khách CMS

| Mã | Ý nghĩa | Cách xử lý thông thường |
| --- | --- | --- |
| `DAT_CMS_URI_INVALID` | URI CMS sai định dạng | Sửa cấu hình |
| `DAT_CMS_UNAUTHORIZED` | Xác thực thất bại | Sửa token |
| `DAT_CMS_FORBIDDEN` | Vai trò không có quyền | Kiểm tra vai trò token |
| `DAT_CMS_ENDPOINT_NOT_FOUND` | Không có hoặc sai đường dẫn | Kiểm tra địa chỉ và đường dẫn CMS |
| `DAT_CMS_NETWORK` | Kết nối hoặc truyền dữ liệu thất bại | Kiểm tra mạng rồi chờ lùi |
| `DAT_CMS_TIMEOUT` | Quá thời gian chờ | Điều chỉnh mạng và thời gian chờ |
| `DAT_CMS_SERVER_ERROR` | Lỗi máy chủ CMS | Kiểm tra trạng thái máy chủ rồi chờ lùi |
| `DAT_CMS_RESPONSE_INVALID` | Phản hồi thành công sai định dạng | Kiểm tra hợp đồng máy chủ–máy khách |
| `DAT_CMS_VERSION_RESET` | Phiên bản máy chủ bị lùi | Kiểm tra dữ liệu và trạng thái triển khai CMS |
| `DAT_CMS_IMPORT_FAILED` | Không áp dụng được chứng chỉ nhận về | Kiểm tra chuỗi nguyên nhân |
| `DAT_CMS_STOPPED` | Dùng trình quản lý đã dừng | Tạo trình quản lý mới hoặc sửa thứ tự gọi |

Thư viện đồng bộ ban đầu theo kiểu best-effort lưu lỗi vào trường lỗi gần nhất. Nếu cần làm ứng dụng khởi động thất bại, hãy dùng API đồng bộ tức thời trả về hoặc ném lỗi trực tiếp.

## Máy chủ CMS

| Mã | HTTP | Ý nghĩa |
| --- | --- | --- |
| `DAT_AUTH_UNAUTHORIZED` | 401 | Thiếu token hoặc token không hợp lệ |
| `DAT_AUTH_FORBIDDEN` | 403 | Vai trò token không khớp quyền yêu cầu |
| `DAT_REQ_ALG_UNSUPPORTED` | 400 | Tên thuật toán không được hỗ trợ |
| `DAT_REQ_NOT_FOUND` | 404·405 | Đường dẫn hoặc phương thức không khớp |
| `DAT_REQ_TOO_LARGE` | 413 | Mã dành trước cho yêu cầu vượt giới hạn nội dung |
| `DAT_STORE_UNAVAILABLE` | 503 | Kho dữ liệu tạm thời không dùng được |
| `DAT_STORE_UNKNOWN` | 500 | Lỗi chưa phân loại khi xử lý kho dữ liệu |

Máy khách hiện tại không để lộ nguyên mã máy chủ trong JSON không phải 2xx mà chuyển trạng thái HTTP thành mã `DAT_CMS_*`. Vì vậy mã trong log máy chủ có thể khác mã lỗi máy khách.

## Cách kiểm tra theo ngôn ngữ

| Môi trường | Mã lỗi | Loại thử lại |
| --- | --- | --- |
| Rust | `err.code()` | `err.retry()` |
| Go | `dat.Code(err)` | `dat.Retry(err)` |
| JavaScript / TypeScript | `error.code` | `error.retry` |
| Python | `error.code` | `error.retry` |
| Ruby | `error.code` | `error.retry` |
| Java / Kotlin | `error.code` | `error.retry` |
| C# | `error.Code` | `error.Retry` |
| C / C++ | `dat_error_code(error)` | `dat_error_retry(error)` |

Với lỗi có nguyên nhân bên dưới, hãy kiểm tra chuỗi ngoại lệ hoặc API truy vấn nguyên nhân của từng ngôn ngữ.

<script setup lang="ts">
import ErrorCode from '../../.vitepress/ui/ErrorCode.vue';
</script>
