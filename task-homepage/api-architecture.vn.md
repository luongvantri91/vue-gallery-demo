# Luồng dữ liệu của trang chủ

## 1. Tổng quan

```
 app.js (UI)                         api.js (tầng dữ liệu)
 ┌──────────────────────┐            ┌─────────────────────────────┐
 │ App                  │ ─ mount ─► │ fetchBanners()  → slides    │
 │  ├ BannerSwiper      │            │ fetchNotice()   → text      │
 │  ├ NoticeBar         │            │ fetchDraw(id)   → balls,    │
 │  ├ DrawTabs/Result   │ ◄───────── │                   next time │
 │  ├ MenuRow x2        │            │ fetchGallery({lottery,page})│
 │  ├ Gallery (infinite)│            │                 → cards+meta│
 │  ├ PillBar, TabBar   │            └─────────────────────────────┘
 └──────────────────────┘      gallery: API ảnh công khai (dự phòng: tự sinh)
                               phần còn lại: sinh cục bộ, có seed cố định
```

UI chỉ gọi 6 hàm của `window.HomeApi`. Không thành phần nào khác biết dữ liệu đến từ đâu.

## 2. Hợp đồng dữ liệu (contract)

| Hàm | Trả về (`data`) | Ghi chú |
|---|---|---|
| `fetchBanners()` | `[{ id, imageUrl, fallbackUrl }]` | 5 banner công khai (hotlink), dự phòng là SVG tự sinh |
| `fetchNotice()` | `{ text }` | Dòng thông báo chạy ngang |
| `fetchDraw(id)` | `{ lottery, issue, numbers[7], nextIssue, nextDrawAt }` | `numbers[i]`: `{ value, color, zodiac, element, elementClass }`; số thứ 7 là bóng đặc biệt |
| `fetchGallery({ lottery, page })` | `[{ id, title, ratio, imageUrl }]` + `meta` | Ưu tiên API ảnh công khai (`hk`→`hongkong`, `mo`→`macau`, `k8`→`kl8`); `ratio` = chiều cao / chiều rộng lấy từ API, nên bố cục được xác định trước khi ảnh tải xong. Nếu lỗi thì dùng ảnh tự sinh |
| `placeholderImage(item)` | data URL | Poster tự sinh, hiển thị khi một ảnh đơn lẻ tải lỗi |
| `nextDrawAt(id)` | `Date` | Dùng cho ngày hiển thị dưới mỗi tab và cho đồng hồ đếm ngược |

`meta` theo cùng cấu trúc phân trang đã thấy trong task phân tích API: `{ page, perPage, total, totalPages, hasMore }`.

## 3. Quy tắc nghiệp vụ

- **Màu bóng** theo các bộ số cố định (đỏ, xanh dương, xanh lá), cùng quy tắc với trang gốc.
- **Con giáp** là `(n - 1) mod 12` trên một danh sách cố định; **ngũ hành** là `n mod 5`. Cả hai chỉ là quy tắc demo.
- **Đếm ngược** chạy mỗi giây về phía `nextDrawAt`. Khi về 0, trang tải kỳ quay kế tiếp.
- **Masonry**: mỗi thẻ mới được đặt vào cột có chiều cao ước tính nhỏ hơn (tổng `ratio`), giúp hai cột luôn cân bằng.
- **Cuộn vô hạn**: một phần tử canh (sentinel) dùng `IntersectionObserver` (cách cuối trang 400 px) sẽ gọi `loadMore`. Có chốt chặn gọi trùng, và phản hồi đến muộn sau khi đã đổi loại xổ số sẽ bị bỏ qua (bộ đếm `generation`).
- **Lỗi**: trang tải lỗi hiện "tap to retry" (chạm để thử lại); khi hết dữ liệu hiện "没有更多了" (không còn nữa).

## 4. Quyết định thiết kế và đánh đổi

| Quyết định | Lý do | Điều phải từ bỏ |
|---|---|---|
| **Vue 3 qua CDN, không có bước build** (nạp kèm mã băm SRI) | Người chấm mở `index.html` bằng cách nhấp đôi (`file://`) mà không cần Node, cài đặt hay build. Trang đủ nhỏ để bundler tốn công cấu hình hơn giá trị mang lại. | Không có TypeScript, tree-shaking, hot reload hay single-file component. |
| **Một tầng dữ liệu duy nhất, `window.HomeApi`** (`api.js`) | Trang gốc trộn 3 nhóm API với 3 kiểu phản hồi. Giấu chúng sau một hợp đồng 6 hàm giúp UI không phụ thuộc nguồn dữ liệu, nên đổi giữa dữ liệu giả và backend thật rất dễ (mục 6). | Thêm một lớp trung gian cho một trang nhỏ. |
| **Phong bì JSON đơn giản `{ success, data, meta }`** cho mọi hàm | Đây là kiểu gọn nhất trong 3 kiểu thấy ở Task 1 và đã có sẵn phân trang. | Nhóm `/lhc` thật sẽ cần một lớp ánh xạ. |
| **API ảnh công khai trước, ảnh tự sinh làm dự phòng** | Ảnh thật làm trang giống trang gốc. Bộ 100 poster tự sinh và `placeholderImage` cho từng thẻ giúp trang vẫn dùng được khi mạng hoặc một ảnh bị lỗi. | Khi chạy online, trang phụ thuộc vào máy chủ bên thứ ba. |
| **Masonry theo `ratio` (cao / rộng)** | API trả về `width` và `height`, nên chiều cao mỗi thẻ biết trước khi ảnh tải xong. Thẻ được đặt mà không bị nhảy bố cục, không cần thư viện masonry. | Việc chọn cột chỉ là ước lượng (tổng các `ratio`), không phải chiều cao đo thật. |
| **Sentinel `IntersectionObserver` cho cuộn vô hạn** | Không cần lắng nghe scroll hay throttle. Bộ đếm `generation` loại bỏ phản hồi cũ sau khi đổi loại xổ số, và sentinel được kiểm tra lại sau mỗi lần tải vì một trang ngắn có thể khiến nó vẫn nằm trong vùng nhìn thấy. | Không đáng kể. |
| **Dữ liệu kỳ xổ tự sinh, có seed cố định** | Kết quả xổ nằm ở nhóm `/lhc` bị mã hóa, ngoài phạm vi (mục 5). Bộ sinh xác định cho số ổn định, dễ kiểm thử và cùng số kỳ với trang gốc (ngày thứ mấy trong năm − 1). | Số không phải kết quả thật; quy tắc ngũ hành chỉ là demo. |
| **CSS thuần, giá trị đo từ trang gốc** (cột 480 px, header 47 px, banner 180 px, bóng 42 px) | Khớp đến từng pixel mà không cần framework CSS, và mỗi con số đều truy được về một phép đo. | Không có design token hay theme. |

## 5. Ánh xạ từ phân tích API (Task 1)

| Nhóm ở Task 1 | Trang chủ có dùng? | Cách dùng |
|---|---|---|
| **B. API ảnh** (`tuku-be.ptallenvery.com`, JSON thường) | **Có, gọi thật** | `fetchGallery` gọi `GET /api/public/pictures/{hongkong\|macau\|kl8}?sort=site&page=N&limit=20`. Trang gốc dùng `limit=100`; tôi dùng 20 mỗi trang để hiển thị lần đầu nhanh hơn, và dùng `meta` (`hasMore`) để điều khiển cuộn vô hạn. |
| **A. Nghiệp vụ `/lhc`** (ký MD5, mã hóa AES, `_data`) | **Không, mô phỏng** | Kết quả xổ (`draws`, `draw/lastdraw`) là các endpoint suy ra từ code, tôi chưa quan sát được và không thể gọi nếu chưa cài đặt cơ chế ký và AES. `fetchDraw` trả dữ liệu tự sinh theo đúng cấu trúc một API như vậy sẽ trả. |
| **C. Danh sách site** (`api.edgoalb.com/sites`, mã hóa) | **Không** | Nó phục vụ tab 好站, nằm ngoài phạm vi của tab trang chủ. |
| Banner | URL tĩnh | 5 URL được đọc từ DOM của trang gốc, không phải từ một lần gọi API. Chúng nằm trên máy chủ ảnh công khai và được hotlink chỉ cho thử nghiệm cá nhân này. |
| Nội dung thông báo, hàng menu | Hằng số cục bộ | Không quan sát được API nào cho chúng. |

Vì vậy chỉ 1 trong 3 nhóm API được gọi thật. Dữ liệu còn lại được tạo đúng hình dạng của dữ liệu thật, nên khi chuyển sang backend thật chỉ cần sửa `api.js`.

## 6. Kết nối backend thật

Chỉ thay phần thân của các hàm trong `api.js`. Nếu API thật trả về cấu trúc khác (ví dụ `_data` được mã hóa như nhóm `/lhc` trong Task 1), hãy ánh xạ về các cấu trúc ở mục 2 ngay trong `api.js`; các component giữ nguyên.
