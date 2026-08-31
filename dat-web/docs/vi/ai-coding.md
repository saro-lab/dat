# Lập trình vibe với AI

Khi cho AI biết dự án hiện tại và hành vi mong muốn, bạn có thể tích hợp DAT dễ dàng hơn. Trong các ví dụ dưới đây, hãy thay địa chỉ và tên biến môi trường cho phù hợp với dự án.

## Triển khai đơn giản

Dùng yêu cầu này khi muốn nhanh chóng tạo cấu trúc cơ bản.

```text
Tôi đang dùng Kotlin và Spring Boot.
Hãy thêm xác thực DAT vào Spring Security.

Trước tiên, đọc https://dat.saro.me/llms.txt
và kiểm tra đặc tả DAT cùng cách dùng thư viện chính thức.

Xác minh Bearer token trong header Authorization;
nếu xác thực thành công, đưa thông tin người dùng vào SecurityContext.

Máy chủ này không phát hành DAT mà chỉ xác minh.
Nó phải nhận chứng chỉ chỉ xác minh từ DAT CMS.

Trước tiên hãy tìm địa chỉ máy chủ CMS và cấu hình token trong dự án.
Nếu không tìm thấy, hãy hỏi tôi. Không tự tạo giá trị.

Dùng thư viện DAT chính thức cho Java/Kotlin
và triển khai theo cấu trúc cùng phong cách mã hiện có của dự án.
```

## Triển khai chi tiết

Dùng yêu cầu này khi muốn chỉ định chính xác phương thức xác thực và xử lý lỗi.

```text
Đây là dự án dùng Kotlin, Spring Boot và Spring Security.
Hãy kiểm tra cấu hình bảo mật hiện tại rồi thêm xác thực DAT.

Trước tiên, đọc https://dat.saro.me/llms.txt
và kiểm tra đặc tả DAT, cách đồng bộ chứng chỉ cùng API thư viện chính thức.

Điều kiện triển khai:

- Đọc DAT từ header Authorization: Bearer.
- Nếu không có DAT, tiếp tục như yêu cầu ẩn danh.
- Nếu DAT không hợp lệ hoặc hết hạn, phản hồi 401.
- Nếu xác minh thành công, đưa ID người dùng và quyền vào SecurityContext.
- Chỉ đọc từ plain những giá trị có thể công khai.
- Đọc ID người dùng và quyền từ dữ liệu secure đã xác minh.
- Máy chủ chỉ xác minh nên dùng chứng chỉ verify-only của DAT CMS.
- Nhận địa chỉ CMS và token qua biến môi trường.
- Nếu đồng bộ chứng chỉ lúc khởi động thất bại, ứng dụng cũng phải khởi động thất bại.
- Tự động cập nhật chứng chỉ khi chạy và đóng trình quản lý khi tắt.
- Phân biệt nguyên nhân bằng mã lỗi DAT, không bằng thông báo lỗi.
- Không ghi DAT gốc, token CMS hoặc dữ liệu cá nhân vào log.

Trước tiên hãy kiểm tra cấu hình Spring Security và cấu trúc người dùng, quyền của dự án.
Nếu không xác định được địa chỉ CMS, biến môi trường token hoặc định dạng dữ liệu secure, hãy hỏi trước khi triển khai.
Chỉ dùng API công khai của thư viện DAT chính thức cho Java/Kotlin.

Trước khi sửa mã, mô tả ngắn gọn luồng xác thực và các tệp sẽ thay đổi.
```

## Nên chọn ví dụ nào?

- Nếu muốn nhanh chóng có mã chạy được, dùng **Triển khai đơn giản**.
- Nếu cần luồng xác thực cho môi trường vận hành, dùng **Triển khai chi tiết**.

Khi AI đặt câu hỏi, hãy trả lời trước về địa chỉ CMS, tên biến môi trường chứa token và thông tin người dùng trong `secure`.
