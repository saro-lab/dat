# DAT

DAT là chuỗi ASCII được phân tách bằng dấu chấm (`.`). Mỗi trường xuất hiện đúng một lần theo thứ tự cố định; chữ ký bảo đảm các byte của những trường phía trước đúng như khi được truyền đi.

<WireFormat
  hint="Thứ tự trường và ký tự phân tách là một phần của đặc tả."
  :segments="[
    {name: 'expire', type: 'uint64 (thập phân)', kind: 'meta', note: 'Thời gian Unix hết hạn'},
    {name: 'cid', type: 'uint64 (thập lục phân)', kind: 'meta', note: 'ID chứng chỉ'},
    {name: 'plain', type: 'Base64Url', kind: 'plain', note: 'Byte công khai'},
    {name: 'secure', type: 'Base64Url', kind: 'secure', note: 'Byte mã hóa'},
    {name: 'signature', type: 'Base64Url', kind: 'sig', note: 'Chữ ký của bốn trường phía trước'},
  ]"
/>

```text
expire.cid.plain.secure.signature
```

## Các trường

| Trường | Biểu diễn | Ý nghĩa |
| --- | --- | --- |
| `expire` | Số thập phân của số nguyên không dấu | Thời gian Unix khi DAT hết hạn |
| `cid` | Số thập lục phân chữ thường của số nguyên không dấu | ID chứng chỉ dùng để xác minh |
| `plain` | Base64Url không đệm | Byte không mã hóa |
| `secure` | Base64Url không đệm | Byte được bảo vệ bằng thuật toán mã hóa của chứng chỉ |
| `signature` | Base64Url không đệm | Chữ ký trên các byte ASCII gốc của `expire.cid.plain.secure` |

`plain` nằm trong phạm vi chữ ký nên không thể bị sửa đổi, nhưng ai cũng có thể giải mã nó. Hãy đặt bí mật, dữ liệu cá nhân và giá trị dùng trực tiếp cho quyết định phân quyền vào `secure`. `secure` rỗng vẫn hợp lệ.

## Biểu diễn chuẩn

- Toàn bộ DAT phải là ASCII.
- Số không có dấu, khoảng trắng, tiền tố hoặc số `0` thừa ở đầu. Chỉ giá trị không được viết là `0`.
- Base64Url dùng bảng chữ cái an toàn cho URL và không cho phép phần đệm `=` hay khoảng trắng.
- Biểu diễn Base64Url không chuẩn của cùng một dãy byte sẽ bị từ chối.
- Nếu số lượng hoặc thứ tự trường khác đi, chuỗi đó không phải DAT.

Các quy tắc này ngăn những triển khai khác nhau chấp nhận các chuỗi khác nhau như cùng một DAT.

## Phát hành

1. Chọn chứng chỉ hiện có thể phát hành.
2. Cộng TTL của chứng chỉ vào thời gian hiện tại để tạo `expire`.
3. Mã hóa `plain` bằng Base64Url.
4. Mã hóa `secure` bằng thuật toán mã hóa của chứng chỉ.
5. Nối các trường phía trước bằng dấu chấm và ký các byte ASCII đó.

Chỉ được phát hành trong khoảng bao gồm hai đầu `start <= now <= start + duration` của chứng chỉ.

## Xác minh

1. Phân tích DAT theo quy tắc chuẩn.
2. Kiểm tra `expire > now`. Nếu `expire == now` thì DAT đã hết hạn.
3. Tìm chứng chỉ ứng với `cid` và kiểm tra chứng chỉ còn có thể xác minh.
4. Xác minh chữ ký trên các byte gốc `expire.cid.plain.secure`.
5. Xác thực và giải mã `secure` rồi trả về cùng `plain`.

API phân tích không xác minh chữ ký chỉ dùng để quan sát hoặc chẩn đoán. Không được dùng kết quả đó để xác thực hay phân quyền.

## Trách nhiệm ngoài đặc tả

DAT không quy định kho người dùng, phương thức đăng nhập, mô hình phân quyền, header truyền token hay danh sách thu hồi. Ứng dụng quyết định payload đã xác minh được phép dùng cho yêu cầu nào.

<script setup lang="ts">
import WireFormat from "../../.vitepress/ui/WireFormat.vue";
</script>
