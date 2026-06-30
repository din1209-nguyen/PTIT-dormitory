# UI/UX DESIGN SPEC — Healthcare Dashboard System

> Tài liệu này mô tả **design system** và **layout pattern** chuẩn được trích xuất từ ảnh mẫu (Dashboard quản lý bệnh nhân/y tế). Agent (Codex) PHẢI tuân thủ các quy tắc dưới đây khi sinh code UI cho **toàn bộ web**, không chỉ riêng trang dashboard, để đảm bảo tính nhất quán (consistency) trên mọi màn hình.

---

## 1. Tổng quan phong cách (Design Language)

- **Phong cách**: Clean, modern, rounded, "soft UI" cho ngành y tế/sức khỏe.
- **Cảm giác**: Tin cậy, sạch sẽ, chuyên nghiệp, dễ quét thông tin (scannable).
- **Mật độ thông tin**: Trung bình–cao, dùng card để chia nhóm dữ liệu.
- **Bo góc**: Bo tròn lớn (large radius) cho card, button, avatar, sidebar item.
- **Nền tổng thể**: Light gray (`#F4F6FA` hoặc tương đương), card nền trắng nổi trên nền xám nhạt.

---

## 2. Color Palette

```css
:root {
  /* Primary brand gradient (header banner, primary buttons, active states) */
  --color-primary-from: #0B6FB0;   /* xanh dương đậm */
  --color-primary-to:   #3FC1D7;   /* xanh dương ánh ngọc */
  --color-primary: #1387C9;

  /* Accent colors theo loại dữ liệu (status icons trong stat cards) */
  --color-accent-blue:   #1387C9;  /* Upcoming Appointments */
  --color-accent-red:    #FF5A6E;  /* Active Treatment Plans */
  --color-accent-teal:   #2FD0C8;  /* Dosage Taken Today */

  /* Status badges */
  --color-status-active-bg:    #E6F4FF;
  --color-status-active-text:  #1387C9;
  --color-status-completed-bg: #E5FBF1;
  --color-status-completed-text:#1FAE6A;
  --color-status-take-bg:      #1387C9;
  --color-status-take-text:    #FFFFFF;
  --color-status-taken-bg:     #EAEAEA;
  --color-status-taken-text:   #8A8F98;

  /* Neutrals */
  --color-bg-page:       #F2F5FA;
  --color-bg-card:       #FFFFFF;
  --color-bg-sidebar:    #FFFFFF;
  --color-text-primary:  #1B2330;
  --color-text-secondary:#8A8F98;
  --color-border:        #EEF1F6;

  /* Sizing radius */
  --radius-sm: 8px;
  --radius-md: 14px;
  --radius-lg: 20px;
  --radius-pill: 999px;
}
```

**Quy tắc dùng màu:**
- Chỉ dùng **1 cặp gradient chính** (`--color-primary-from` → `--color-primary-to`) cho: banner chào mừng, nút hành động chính (CTA), icon active/sidebar item đang chọn.
- Mỗi loại "stat card" có **1 icon-accent-color riêng** (đặt trong khối tròn nền nhạt cùng tông).
- Badge trạng thái dùng nền nhạt + chữ đậm cùng tông (không dùng border).
- Không dùng quá 4 màu accent trong một màn hình.

---

## 3. Typography

```css
--font-family: "Inter", "Segoe UI", system-ui, sans-serif;

--text-h1: 24px / 32px, weight 700;   /* "Hello Aziza" */
--text-h2: 16px / 22px, weight 600;   /* Card title: "Upcoming Appointments" */
--text-body: 14px / 20px, weight 400; /* nội dung bảng */
--text-small: 12px / 16px, weight 400;/* phụ chú, ngày, label */
--text-stat-number: 28px / 32px, weight 700; /* số liệu lớn trong stat card */
```

- Tiêu đề card luôn **weight 600**, màu `--color-text-primary`.
- Nhãn phụ (subtitle, ngày, email) dùng `--color-text-secondary`.

---

## 4. Layout Structure (Page Shell)

Toàn bộ trang (không riêng dashboard) dùng layout chuẩn 3 vùng:

```
┌─────────────────────────────────────────────────────────────┐
│ [Sidebar 72px]  [Topbar - Search | Icons | Avatar]          │
│                 ──────────────────────────────────────────  │
│                 [Page content area - padding 24px]           │
│                 ┌───────────────────────────────────────┐    │
│                 │ Banner / Page header (nếu có)         │    │
│                 ├───────────────────────────────────────┤    │
│                 │ Stat cards row (grid 3-4 columns)     │    │
│                 ├───────────────────────────────────────┤    │
│                 │ Content cards (grid 2 columns 60/40)  │    │
│                 └───────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
```

### 4.1 Sidebar (trái, cố định, width 72–80px, icon-only)
- Nền trắng, full height, bo góc phải lớn (`--radius-lg`) tách khỏi nền xám.
- Logo trên cùng (dạng icon tròn).
- Danh sách icon menu căn giữa theo chiều dọc, mỗi icon trong ô vuông bo góc:
  - Item **active**: nền gradient primary, icon màu trắng.
  - Item **inactive**: icon màu `--color-text-secondary`, không nền.
- Icon "back/collapse" ở cuối sidebar.

### 4.2 Topbar (trên cùng, full width còn lại)
- Trái: dropdown filter ("All") + search input bo tròn pill, nền trắng, icon kính lúp bên phải.
- Phải: icon settings (vuông bo góc, viền nhạt) + icon notification (có dot đỏ nếu có thông báo) + avatar người dùng (tròn) kèm tên + email/role bên cạnh.

### 4.3 Banner / Page Header
- Áp dụng cho mọi trang chính: 1 khối bo góc lớn, nền gradient primary, full width.
- Trái: tiêu đề chào (`text-h1`) + emoji/icon minh hoạ + dòng phụ mô tả (`text-body`, màu trắng mờ 80%).
- Phải: 1–2 nút CTA dạng pill:
  - Nút phụ: viền trắng, nền trong suốt, icon "+" + label.
  - Nút chính: nền trắng hoặc nền đậm hơn, nổi bật nhất.

### 4.4 Stat Cards Row
- Grid 3–4 cột bằng nhau, gap 16–20px.
- Mỗi card: nền trắng, bo góc `--radius-lg`, padding 16-20px, layout ngang:
  - Trái: icon tròn nền nhạt màu accent riêng + nhãn nhỏ phía trên, số liệu lớn phía dưới.
  - Phải: icon mũi tên "↗" (link tới trang chi tiết) ở góc trên-phải.

### 4.5 Content Cards (data tables / lists)
- Grid 2 cột, tỉ lệ ưu tiên ~ 45/55 hoặc 50/50 tùy nội dung.
- Mỗi card có **header chuẩn**:
  - Trái: icon nhỏ + tiêu đề card (`text-h2`) + tổng số lượng/"Today" dropdown (nếu áp dụng) + link "See All".
  - Phải: search nhỏ trong card + icon Filter + icon Sort + icon "..." (more actions).
- Nội dung card có 2 dạng:
  1. **Lịch ngang (date strip)**: dãy ô ngày (thứ + số), ô đang chọn có nền tròn primary; dưới đó là list item (avatar + tên + mô tả + thời gian + nút "...").
  2. **Bảng dữ liệu**: header cột có icon sort (↕), mỗi row gồm avatar/icon + text cột + badge trạng thái (pill) + icon "..." cuối hàng.

---

## 5. Component Specs

### 5.1 Button
```css
.btn-primary {
  background: linear-gradient(90deg, var(--color-primary-from), var(--color-primary-to));
  color: #fff;
  border-radius: var(--radius-pill);
  padding: 10px 20px;
  font-weight: 600;
  font-size: 14px;
}
.btn-secondary-outline {
  background: transparent;
  border: 1.5px solid rgba(255,255,255,0.6);
  color: #fff;
  border-radius: var(--radius-pill);
  padding: 10px 20px;
}
```

### 5.2 Status Badge (pill)
```css
.badge {
  border-radius: var(--radius-pill);
  font-size: 12px;
  font-weight: 600;
  padding: 4px 12px;
  display: inline-block;
}
.badge--active    { background: var(--color-status-active-bg); color: var(--color-status-active-text); }
.badge--completed { background: var(--color-status-completed-bg); color: var(--color-status-completed-text); }
.badge--take       { background: var(--color-status-take-bg); color: var(--color-status-take-text); }
.badge--taken      { background: var(--color-status-taken-bg); color: var(--color-status-taken-text); }
```

### 5.3 Card
```css
.card {
  background: var(--color-bg-card);
  border-radius: var(--radius-lg);
  padding: 20px;
  box-shadow: 0 4px 20px rgba(20, 40, 80, 0.04);
}
```

### 5.4 Stat Icon Circle
```css
.stat-icon {
  width: 40px; height: 40px;
  border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  /* background = màu accent nhạt 12% opacity, icon = màu accent đậm */
}
```

### 5.5 Avatar
- Hình tròn, kích thước 32–40px, có thể kèm tên + sub-text bên cạnh (2 dòng: tên đậm, mô tả nhạt nhỏ hơn).

### 5.6 Date Strip Item
```css
.date-item {
  width: 36px; height: 56px;
  border-radius: var(--radius-md);
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  font-size: 12px;
}
.date-item--active {
  background: var(--color-primary);
  color: #fff;
}
```

---

## 6. Iconography
- Dùng icon **outline/line-style**, độ dày stroke đều (gợi ý: `lucide-react` hoặc `feather-icons`).
- Icon trong sidebar: 22–24px.
- Icon trong card/table: 16–18px.
- Icon "more actions" luôn là 3 chấm ngang (`⋯`) cuối mỗi dòng/card.

---

## 7. Grid & Spacing System
```css
--space-1: 4px;
--space-2: 8px;
--space-3: 12px;
--space-4: 16px;
--space-5: 20px;
--space-6: 24px;
--space-8: 32px;

--container-padding: 24px;   /* padding toàn trang nội dung */
--card-gap: 16px;            /* khoảng cách giữa các card cùng cấp */
```
- Layout chính dùng **CSS Grid 12 cột**, gutter 16–20px.
- Page content luôn có `max-width` responsive, padding ngoài 24px trên desktop, 16px trên mobile.

---

## 8. Responsive Rules
| Breakpoint | Sidebar | Stat cards | Content cards |
|---|---|---|---|
| Desktop (≥1280px) | Hiện đầy đủ, icon-only 72px | 3–4 cột | 2 cột |
| Tablet (768–1279px) | Thu nhỏ hoặc overlay | 2 cột | 1 cột (stack) |
| Mobile (<768px) | Ẩn, thay bằng bottom nav hoặc hamburger | 1 cột | 1 cột |

---

## 9. Quy tắc áp dụng cho TOÀN BỘ WEB (không chỉ Dashboard)

Agent khi tạo bất kỳ trang mới (ví dụ: trang danh sách, trang chi tiết, trang form, trang cài đặt...) PHẢI:

1. **Tái sử dụng Page Shell** (Sidebar + Topbar) ở mục 4.1–4.2 cho mọi trang.
2. **Banner đầu trang** (mục 4.3) chỉ dùng cho trang chính/trang tổng quan; trang con dùng **page header đơn giản** (tiêu đề + breadcrumb + nút CTA, không cần gradient).
3. Mọi danh sách/bảng dữ liệu dùng **Content Card pattern** (mục 4.5) với search + filter + sort + action menu nhất quán.
4. Mọi số liệu tổng hợp hiển thị bằng **Stat Card pattern** (mục 4.4).
5. Trạng thái dữ liệu (active/completed/pending/error...) luôn hiển thị bằng **badge pill** theo bảng màu mục 5.2, KHÔNG tự tạo màu mới ngoài palette.
6. Toàn bộ bo góc, khoảng cách, font phải lấy từ token ở mục 2, 3, 7 — không hard-code giá trị mới.
7. Khi cần thêm màu accent cho loại dữ liệu mới, chọn từ palette mở rộng cùng tông pastel/nhạt-đậm tương tự (giữ độ sáng/độ bão hòa nhất quán với mục 2), tránh thêm màu chói/đối lập.

---

## 10. Cấu trúc thư mục component đề xuất (cho Codex)

```
/src/components/
  layout/
    Sidebar.tsx
    Topbar.tsx
    PageShell.tsx
  common/
    Card.tsx
    Badge.tsx
    Button.tsx
    Avatar.tsx
    StatCard.tsx
    DateStrip.tsx
    DataTable.tsx
  sections/
    WelcomeBanner.tsx
/src/styles/
  tokens.css      // chứa toàn bộ CSS variables mục 2,3,7
```

> Codex nên implement `tokens.css` TRƯỚC TIÊN, sau đó build các `common/` component dùng token này, rồi mới ghép thành `sections/` và `pages/`. Mọi page mới phải import từ `PageShell` để đảm bảo đồng bộ Sidebar/Topbar trên toàn site.
