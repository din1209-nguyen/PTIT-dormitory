# 03 — Quyết định triển khai & dữ liệu cần chốt

> File này ghi lại các quyết định đã chốt (kèm lý do) để bổ sung cho phần kiến trúc.
> Khi mâu thuẫn với mô tả chung trong [00-business-context.md](00-business-context.md) / [01-architecture.md](01-architecture.md),
> ưu tiên file này vì đây là phần đã được chủ dự án xác nhận.
>
> Trạng thái: ✅ đã chốt · 🔧 dùng tạm, sẽ chỉnh khi có dữ liệu thật.

---

## 1. Branding ✅

- Sản phẩm dùng nhận diện **PTIT — Học viện Công nghệ Bưu chính Viễn thông** (không dùng "HVCS").
- `NEXT_PUBLIC_APP_NAME = "PTIT Dormitory"` (hoặc "Quản lý KTX PTIT").
- Logo: đặt file logo PTIT chính thức tại `frontend/public/logo-ptit.svg` (hoặc `.png`) và tham chiếu từ `Sidebar`/`Topbar`. Tông màu UI giữ theo [02-ui-design-system.md](02-ui-design-system.md).

## 2. Cấu trúc dự án ✅

- **Monorepo** với npm workspaces:
  ```
  /
  ├── package.json          (workspaces: ["backend", "frontend"])
  ├── backend/
  └── frontend/
  ```
- Đầu ra mục tiêu: **app chạy được và đúng nghiệp vụ** (không chỉ tài liệu).

## 3. Thông báo in-app ✅

- Không cần real-time. Thông báo **load khi mở trang** (gọi API khi vào, badge số chưa đọc lấy từ response). Không cần WebSocket/SSE.

---

## 4. Mẫu Excel import sinh viên ✅

File `.xlsx`, dòng 1 là header, dữ liệu từ dòng 2. Cột chuẩn (tên hiển thị tiếng Việt → field nội bộ):

| # | Header (cột Excel) | Field | Bắt buộc | Quy tắc |
|---|---|---|---|---|
| 1 | Mã sinh viên | `student_code` | ✓ | Không rỗng, unique toàn hệ thống |
| 2 | Họ và tên | `full_name` | ✓ | Không rỗng |
| 3 | Giới tính | `gender` | ✓ | `Nam` → `MALE`, `Nữ` → `FEMALE` |
| 4 | Email | `email` | ✓ | Đúng định dạng email, unique |
| 5 | Lớp | `class_name` | ✓ | Không rỗng |
| 6 | Ngành | `major` | ✓ | Không rỗng |
| 7 | Khóa | `cohort` | ✓ | VD: `D21`, `2021` |
| 8 | Khoa | `faculty` | ✓ | Phải thuộc danh mục khoa (mục 6) |
| 9 | Tân sinh viên | `is_freshman` | ✗ | `Có`/`Không`, mặc định `Không` |

Quy tắc import (theo [00-business-context.md](00-business-context.md) §8.3–8.4):
- Validate **toàn bộ file trước**, gom lỗi theo từng dòng vào `import_row_errors`.
- Sai header / sai cấu trúc nghiêm trọng → từ chối cả file.
- Toàn bộ thao tác (upsert student + tạo residence record + xếp phòng nếu chọn) nằm trong **một transaction**; lỗi/không đủ giường → **rollback toàn bộ**.
- Giới hạn: chỉ nhận `.xlsx`, kiểm tra MIME, dung lượng và số dòng tối đa.

## 5. Cấu trúc KTX để seed 🔧

(Giá trị tạm để chạy/test; chỉnh lại khi có sơ đồ KTX thật.)

- **Dãy nhà (building):** J, K, L, M.
- **Mỗi dãy:** 20 phòng, chia **5 tầng × 4 phòng/tầng**.
- **Số giường/phòng:** tùy dãy — J, K = **8 giường**; L, M = **12 giường**.
- **Giới tính phòng (tạm):** J, K = `MALE`; L, M = `FEMALE`.
- **Phòng ưu tiên tân sinh viên (tạm):** **dãy J** (cấu hình `freshman_priority_buildings` + số phòng đầu mỗi tầng — chỉnh sau).
- **Quy ước mã:** phòng `J101` (J = dãy, 1 = tầng, 01 = số phòng); giường `J101-01`.

## 6. Danh mục Khoa ✅ (có thể bổ sung sau)

```
Công nghệ thông tin
Viễn thông
Đa phương tiện
Kế toán
Điện tử
```
- Lưu thành danh mục cấu hình được (seed sẵn 5 khoa trên), validate `faculty` khi import.
- Ngành/lớp/khóa: **free-text** (chỉ kiểm tra không rỗng), không validate theo danh sách cố định.

---

## 7. Quy tắc xếp phòng — làm rõ chỗ mơ hồ ✅

Bổ sung cho thuật toán trong [00-business-context.md](00-business-context.md) §11:

- **"Phòng gần nhau"** = khi phòng đang gom nhóm đã đầy, xếp sinh viên còn lại vào **phòng trống gần nhất** (ưu tiên: cùng tầng → cùng dãy → dãy khác cùng giới tính). Không yêu cầu khoảng cách vật lý phức tạp; dựa trên thứ tự mã phòng trong cùng tầng/dãy.
- **Không gom đủ nhóm** (hết phòng cùng lớp/ngành/khóa/khoa): **được phép xếp chung sinh viên khác ngành**, nhưng **bắt buộc đúng giới tính phòng**. Giới tính là ràng buộc cứng, các tiêu chí lớp/ngành/khóa/khoa chỉ là ưu tiên mềm.
- Thứ tự ưu tiên tổng thể giữ nguyên: phòng ưu tiên tân SV (kỳ 1) → đúng giới tính (cứng) → giữ phòng cũ → cùng lớp → cùng ngành → cùng khóa → cùng khoa.

---

## 8. Giá trị config mặc định cho `system_configs` / `electric_price_tiers` 🔧

Seed sẵn các giá trị dưới đây; tất cả đều chỉnh được trong app (mục Cấu hình).

### 8.1. Giá điện — bậc thang EVN (QĐ 1279/QĐ-BCT, áp dụng từ 10/5/2025)

| Bậc | Khoảng kWh | Đơn giá (đồng/kWh, chưa VAT) |
|---|---:|---:|
| 1 | 0 – 50 | 1.984 |
| 2 | 51 – 100 | 2.050 |
| 3 | 101 – 200 | 2.380 |
| 4 | 201 – 300 | 2.998 |
| 5 | 301 – 400 | 3.350 |
| 6 | 401+ | 3.460 |

- `electric_vat_rate = 0.10` (VAT 10%).

### 8.2. Giá nước (tham chiếu giá nước sinh hoạt Hà Nội 2025, hộ dân cư, bậc 1)

| Key | Giá trị mặc định | Ghi chú |
|---|---:|---|
| `water_unit_price` | `8500` đồng/m³ | Giá bậc 1 hộ dân cư Hà Nội (chưa VAT) |
| `free_water_quota` | `3` m³/phòng/tháng | 🔧 Quota miễn phí — xác nhận lại theo chính sách KTX |

Công thức (giữ theo docs): `nước phải trả = max(tiêu thụ - free_water_quota, 0) × water_unit_price`.

### 8.3. Thời hạn & nhắc nhở

| Key | Giá trị mặc định | Ý nghĩa |
|---|---:|---|
| `payment_due_days` | `10` | Số ngày hạn đóng tiền tính từ đầu tháng sau |
| `residence_end_reminder_days` | `7` | Nhắc trước khi hết hạn lưu trú |
| `freshman_priority_buildings` | `["J"]` | Dãy ưu tiên tân sinh viên |
| `freshman_priority_room_count` | `2` | 🔧 Số phòng đầu mỗi tầng giữ cho tân SV — chỉnh sau |

> Nguồn tham khảo giá: EVN — QĐ 1279/QĐ-BCT (10/5/2025); giá nước Hà Nội — QĐ 3541/QĐ-UBND. Đây là số tham chiếu để demo; cập nhật theo biểu giá thực tế khi triển khai.

---

## 9. Tài khoản admin khởi tạo (seed) 🔧

- Tạo qua script `seedAdmin.ts`, đọc từ biến môi trường (không hard-code):
  `SEED_ADMIN_USERNAME`, `SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD`.
- Chủ dự án điền giá trị thật trong `.env` trước khi chạy seed.

## 10. Credentials còn chờ chủ dự án cấp (điền vào `.env`) ⏳

- `MONGODB_URI` — **MongoDB Atlas** (cần replica set cho transaction; local 1-node không chạy được import/xếp phòng/thanh toán).
- `VNPAY_TMN_CODE`, `VNPAY_HASH_SECRET` — đăng ký tại sandbox.vnpayment.vn.
- `SMTP_*` — Gmail App Password hoặc Resend API key.

Xem file mẫu: [`backend/.env.example`](../backend/.env.example) và [`frontend/.env.local.example`](../frontend/.env.local.example).
