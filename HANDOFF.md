# HANDOFF — vue-gallery-demo

Cập nhật: 2026-10-25. Dùng file này để bắt đầu một phiên làm việc mới mà không mất ngữ cảnh.

## 1. Bối cảnh

Bài đánh giá của nhà tuyển dụng (NTD, Telegram `@Tonychick`), gồm 2 việc:

1. **Phân tích API** của trang `https://43.213.218.98:8000/?800tk#/pages/index/index`.
2. **Làm trang chủ giống trang đó** (không phải một thư viện ảnh demo chung chung). Bản đầu tôi làm sai yêu cầu (gallery Picsum), NTD đã nhắc, nên đã làm lại.

NTD sẽ đặc biệt đọc `task-homepage/api-architecture.*.md` để đánh giá cách tôi tự dựng lại trang.

Tôi (người dùng) cho phép dùng lại banner và ảnh công khai của trang gốc cho mục đích thử nghiệm cá nhân; trang sẽ bị xóa sau khi duyệt.

## 2. Trạng thái hiện tại

Phần việc đã xong, chưa có việc bắt buộc nào còn mở.

| Hạng mục | Trạng thái |
|---|---|
| `task-analys-api/analys-api.en.md` | Xong. Đã bỏ link hỏng `api-info.md` (file đó không tồn tại). |
| `task-homepage/` (trang chủ) | Xong, chạy được, đã kiểm tra thủ công trên trình duyệt. |
| `task-homepage/api-architecture.en.md` | Đã có mục 4 (quyết định thiết kế) và mục 5 (ánh xạ từ Task 1). |
| `task-homepage/api-architecture.vn.md` | Bản dịch tiếng Việt để tôi kiểm duyệt, cùng cấu trúc với bản `.en`. |
| Tin nhắn trả lời NTD | Đã soạn (bản chính + bản ngắn). **Chưa rõ đã gửi chưa.** |
| Commit / push / GitHub Pages | **Chưa xác nhận.** `git` không chạy được trong terminal của trợ lý, nên chưa commit từ phiên này. |

## 3. Cấu trúc

```
index.html                       redirect sang task-homepage/index.html
README.md                        mô tả 2 task
task-analys-api/analys-api.en.md Task 1
task-homepage/
  index.html   Vue 3.5.13 từ jsDelivr (có SRI) → api.js → app.js
  api.js       window.HomeApi (6 hàm): fetchBanners, fetchNotice, fetchDraw,
               fetchGallery, placeholderImage, nextDrawAt
  app.js       Component: AppHeader, BannerSwiper, NoticeBar, DrawTabs, DrawResult,
               MenuRow, Gallery, PillBar, TabBar, App
  styles.css   Cột 480px, header 47px, banner 180px, bóng 42px, ... (đo từ trang gốc)
  README.md, api-architecture.en.md, api-architecture.vn.md
```

Không có bước build. Chạy: mở `task-homepage/index.html` (hoặc `index.html` ở gốc). Không có test tự động.

## 4. Nguồn dữ liệu của trang chủ

| Dữ liệu | Nguồn |
|---|---|
| Ảnh lưới (gallery) | **Gọi thật**: `https://tuku-be.ptallenvery.com/api/public/pictures/{hongkong\|macau\|kl8}?sort=site&page=N&limit=20`. Lọc tên bằng `BLOCKED_TITLE` (bỏ tiêu đề gợi nội dung người lớn). Lỗi API hoặc timeout 8 s thì dùng 100 poster SVG tự sinh. Từng ảnh lỗi thì thay bằng `placeholderImage`. |
| 5 banner | Hotlink `https://res-img1.ptallenvery.com/image/` : `qxw750_280.gif`, `dc750_280.gif`, `jc750_280.gif`, `mc_800x280-tuku.gif`, `54949.jpg?3`. Mỗi banner có `fallbackUrl` là SVG tự sinh. |
| Kết quả xổ, thông báo, menu | **Dữ liệu giả** có seed. Nhóm API `/lhc` thật bị ký MD5 và mã hóa AES nên không gọi. |

Quy tắc đã khớp với trang gốc: màu bóng Mark Six theo bộ số đỏ/xanh/lục chuẩn; con giáp là `ZODIAC[(n-1)%12]`; số kỳ = ngày thứ mấy trong năm − 1; giờ kỳ kế: hk 21:32, mo 21:30, k8 20:00. Quy tắc ngũ hành `ELEMENTS[n%5]` chỉ là demo.

Loại xổ số: `hk`→`hongkong`, `mo`→`macau`, `k8`→`kl8` (các giá trị `hk`, `happy8`, `xjp` gọi thẳng sẽ trả NOT_FOUND).

## 5. Quyết định đã chốt (đừng đảo ngược khi chưa hỏi tôi)

- Banner **dùng lại** từ trang gốc (hotlink, không lưu vào repo). Ban đầu trợ lý từ chối vì đó là quảng cáo sòng bài; sau khi tôi nhắc lại phép của mình thì đã dùng. Lưu ý: chúng vẫn là quảng cáo bên thứ ba. **Nên bỏ trước khi nộp công khai thật sự.**
- Không tái tạo tab 好站 của trang gốc (liên kết tới trang cá cược).
- Không sao chép logo, văn bản, tên miền hay API riêng của trang gốc; thương hiệu trung tính là "图库.demo".
- Bản `api-architecture.en.md` cũ (mô tả gallery Picsum) đã bị viết lại hoàn toàn khi làm lại trang. Chưa khôi phục. Có thể xem lại qua `git show HEAD:task-homepage/api-architecture.en.md` nếu đã từng commit.

## 6. Việc có thể làm tiếp (tùy chọn)

1. Commit + push, chờ GitHub Pages deploy, mở link live kiểm tra:
   - Live: https://luongvantri91.github.io/vue-gallery-demo/
   - Source: https://github.com/luongvantri91/vue-gallery-demo
2. Gửi tin nhắn cho NTD (chưa rõ đã gửi).
3. Chụp ảnh so sánh trang gốc và trang của tôi, đưa vào README.
4. Viết vài test nhỏ cho `nextDrawAt`, `fetchGallery`, logic màu bóng.
5. Tạo `task-analys-api/api-info.md` nếu có dữ liệu request/response từ DevTools; hiện chưa có file.
6. Xem lại cột "Lý do" và "Điều phải từ bỏ" ở mục 4 của `api-architecture.vn.md` cho đúng ý tôi.

## 7. Điểm cần cẩn thận

- Trang phụ thuộc máy chủ ảnh của bên thứ ba khi online; có dự phòng nhưng sẽ trông khác khi offline.
- `BLOCKED_TITLE` lọc theo tên, chưa xem từng ảnh nên có thể sót.
- `api.js` có UTF-8 BOM do PowerShell `Set-Content`; vô hại.
- Công cụ trình duyệt của trợ lý: `page.click` có thể bị timeout vì tab nằm nền, dùng `page.evaluate(() => el.click())`; ảnh chụp có thể bị cũ, tin vào DOM hơn.
- Trang gốc là trang gợi ý/cá cược: chỉ dùng để thử nghiệm, và không tiếp tục phát triển thành sản phẩm thật.
