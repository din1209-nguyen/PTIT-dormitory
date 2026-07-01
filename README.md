# PTIT Dormitory - Hệ thống quản lý ký túc xá

<div align="center">

![Node.js](https://img.shields.io/badge/Node.js-20+-339933?style=flat-square&logo=node.js&logoColor=white)
![Next.js](https://img.shields.io/badge/Next.js-16.2.9-000000?style=flat-square&logo=next.js&logoColor=white)
![React](https://img.shields.io/badge/React-19.2.7-61DAFB?style=flat-square&logo=react&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=flat-square&logo=typescript&logoColor=white)
![Express](https://img.shields.io/badge/Express-4.21.2-000000?style=flat-square&logo=express&logoColor=white)
![MongoDB](https://img.shields.io/badge/MongoDB-Mongoose-47A248?style=flat-square&logo=mongodb&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-38BDF8?style=flat-square&logo=tailwind-css&logoColor=white)
![Vercel](https://img.shields.io/badge/Frontend-Vercel-000000?style=flat-square&logo=vercel&logoColor=white)

**PTIT Dormitory** là hệ thống quản lý sinh viên lưu trú ký túc xá, được xây dựng theo kiến trúc fullstack TypeScript gồm frontend Next.js và backend Express/MongoDB.

[Production](https://neethgie-plus-frontend.vercel.app/) · [Tính năng](#tính-năng-chính) · [Kiến trúc](#kiến-trúc-tổng-quan) · [Cài đặt](#cài-đặt-local) · [API](#api-overview) · [Gitflow](#gitflow--production-release)

</div>

---

## Truy cập nhanh Production

> Frontend production: **[https://neethgie-plus-frontend.vercel.app/](https://neethgie-plus-frontend.vercel.app/)**

## Tổng quan

Dự án phục vụ nghiệp vụ quản lý sinh viên ở ký túc xá theo từng kỳ lưu trú. Hệ thống hỗ trợ cán bộ quản lý tiếp nhận danh sách sinh viên, import Excel, phân phòng/giường, theo dõi lịch sử lưu trú, phát hành thông báo, quản lý đơn từ, vi phạm, hóa đơn điện nước và thanh toán VNPay sandbox.

Mục tiêu thiết kế là tách rõ trách nhiệm giữa giao diện và nghiệp vụ: frontend chỉ hiển thị, thu thập thao tác và gọi API; backend là nguồn sự thật cho xác thực, phân quyền, kiểm tra dữ liệu, transaction, xếp phòng, tính hóa đơn, thanh toán và audit log.


## Vai trò người dùng

| Vai trò | Mục đích |
|---|---|
| `ADMIN` | Quản trị tài khoản, phân quyền, xem báo cáo hệ thống và audit log. |
| `MANAGER` | Vận hành nghiệp vụ ký túc xá: sinh viên, kỳ lưu trú, phòng/giường, xếp phòng, nội quy, thông báo, đơn từ, hóa đơn, vi phạm và báo cáo. |
| `STUDENT` | Xem hồ sơ cá nhân, phòng ở, lịch sử lưu trú, thông báo, nội quy, đơn từ, vi phạm và hóa đơn; thực hiện thanh toán khi có quyền. |

## Tính năng chính

### Quản trị và phân quyền

- Đăng nhập, đăng xuất, refresh token, đổi mật khẩu, quên mật khẩu và xác minh OTP.
- RBAC theo vai trò `ADMIN`, `MANAGER`, `STUDENT` kết hợp permission code chi tiết.
- Khóa/mở khóa tài khoản, reset mật khẩu người dùng.
- Audit log tự động cho các thao tác ghi quan trọng.

### Quản lý sinh viên và kỳ lưu trú

- Quản lý hồ sơ sinh viên, trạng thái cư trú và thông tin học vụ.
- Import danh sách sinh viên từ Excel, lưu batch import và lỗi từng dòng.
- Xuất dữ liệu sinh viên/lịch sử lưu trú ra Excel.
- Quản lý kỳ lưu trú với trạng thái chuẩn bị, đang hoạt động và đã kết thúc.
- Lưu lịch sử lưu trú theo kỳ để không mất dữ liệu phòng/giường cũ.

### Quản lý ký túc xá và xếp phòng

- Quản lý tòa nhà, tầng, phòng và giường.
- Xếp phòng tự động theo kỳ lưu trú.
- Xếp phòng thủ công, chuyển phòng, hủy gán giường và quản lý sinh viên chưa được xếp phòng.
- Kiểm tra các ràng buộc quan trọng: đúng giới tính phòng, không vượt sức chứa, không trùng giường, không trùng sinh viên trong cùng kỳ.

### Nội quy, thông báo, đơn từ và vi phạm

- Tạo, cập nhật, công bố và lưu trữ nội quy ký túc xá.
- Gửi thông báo chung hoặc thông báo riêng cho sinh viên.
- Sinh viên tạo đơn từ; cán bộ quản lý xử lý và cập nhật trạng thái.
- Ghi nhận, cập nhật và tra cứu vi phạm theo sinh viên/kỳ lưu trú.

### Điện nước, thanh toán và báo cáo

- Nhập chỉ số điện nước theo phòng.
- Tạo hóa đơn điện nước theo kỳ/tháng, có thành viên hóa đơn để theo dõi từng sinh viên.
- Cấu hình giá điện theo bậc, đơn giá nước và tham số hệ thống.
- Thanh toán VNPay sandbox, return URL, IPN và xác nhận tiền mặt.
- Báo cáo lưu trú, sức chứa ký túc xá, điện nước, thanh toán, đơn từ, vi phạm và xu hướng vận hành.

## Kiến trúc tổng quan

```mermaid
flowchart LR
  User[Người dùng] --> FE[Next.js Frontend]
  FE -->|REST /api| BE[Express API]
  BE --> Auth[Auth + RBAC]
  BE --> Modules[Business Modules]
  Modules --> DB[(MongoDB)]
  BE --> SMTP[SMTP Email]
  BE --> VNPAY[VNPay Sandbox]
  BE --> Jobs[Node Cron Jobs]
```

### Nguyên tắc thiết kế

- Backend là nguồn sự thật cho nghiệp vụ, phân quyền và validation cuối cùng.
- Dữ liệu lưu trú xoay quanh `Semester`, `ResidenceRecord` và `RoomAssignment`; sinh viên không giữ giường trực tiếp.
- Các nghiệp vụ nhiều bước như import Excel, xếp phòng, chuyển kỳ và thanh toán cần transaction/idempotency ở backend.
- Email và thông báo được tách khỏi transaction chính để tránh làm hỏng dữ liệu hợp lệ khi provider bên ngoài lỗi.
- Response API được chuẩn hóa, lỗi đi qua middleware tập trung.

## Database Schema

Database sử dụng MongoDB thông qua Mongoose. Thiết kế schema đầy đủ được lưu tại [`docs/data-model.dbml`](docs/data-model.dbml) để có thể xem bằng dbdiagram.io; các bảng trong DBML được map sang collection/model MongoDB tương ứng trong `backend/src/models`.

### Nhóm collection chính

| Nhóm dữ liệu | Collection / model | Vai trò |
|---|---|---|
| Auth & RBAC | `User`, `Permission`, `RolePermission`, `RefreshToken`, `PasswordResetToken` | Xác thực, phiên đăng nhập, phân quyền và reset mật khẩu. |
| Sinh viên & lưu trú | `Student`, `Semester`, `ResidenceRecord`, `RoomAssignment` | Hồ sơ sinh viên, kỳ lưu trú, lịch sử cư trú và gán phòng/giường theo kỳ. |
| Cấu trúc ký túc xá | `Building`, `Floor`, `Room`, `Bed` | Mô hình vật lý của ký túc xá từ tòa nhà đến từng giường. |
| Nội quy & giao tiếp | `Regulation`, `Notification`, `NotificationReceiver`, `StudentRequest`, `Violation` | Nội quy, thông báo, đơn từ sinh viên và vi phạm. |
| Điện nước & thanh toán | `UtilityUsage`, `UtilityBill`, `UtilityBillMember`, `Payment` | Chỉ số điện nước, hóa đơn phòng, trạng thái từng thành viên và giao dịch VNPay/tiền mặt. |
| Cấu hình & vận hành | `SystemConfig`, `ElectricPriceTier`, `ImportBatch`, `ImportRowError`, `EmailLog`, `ActivityLog` | Tham số hệ thống, giá điện, import Excel, email queue/log và audit log. |

### ERD có thuộc tính

Sơ đồ dưới đây dùng cú pháp Mermaid `erDiagram`, bản đầy đủ hơn nằm trong [`docs/data-model.dbml`](docs/data-model.dbml).

```mermaid
erDiagram
  USER {
    ObjectId id PK
    string username UK
    string email UK
    string passwordHash
    enum role
    enum status
    number tokenVersion
    datetime lastLoginAt
    datetime createdAt
    datetime updatedAt
  }

  PERMISSION {
    ObjectId id PK
    string code UK
    string description
    datetime createdAt
    datetime updatedAt
  }

  ROLE_PERMISSION {
    ObjectId id PK
    enum role
    ObjectId permissionId FK
  }

  REFRESH_TOKEN {
    ObjectId id PK
    ObjectId userId FK
    string tokenHash UK
    datetime expiresAt
    datetime revokedAt
    string replacedByTokenHash
    string ipAddress
    string userAgent
  }

  PASSWORD_RESET_TOKEN {
    ObjectId id PK
    ObjectId userId FK
    string tokenHash UK
    string otpHash
    datetime expiresAt
    datetime usedAt
  }

  STUDENT {
    ObjectId id PK
    ObjectId userId FK
    string studentCode UK
    string fullName
    date dateOfBirth
    enum gender
    string email
    string phone
    string address
    string className
    string major
    string department
    string academicYear
    boolean isFreshman
    enum residenceType
  }

  SEMESTER {
    ObjectId id PK
    string name
    enum term
    string academicYear
    date startDate
    date endDate
    enum status
    ObjectId createdBy FK
  }

  RESIDENCE_RECORD {
    ObjectId id PK
    ObjectId studentId FK
    ObjectId semesterId FK
    date registeredAt
    date startDate
    date endDate
    enum status
  }

  BUILDING {
    ObjectId id PK
    string name UK
    string description
    enum status
  }

  FLOOR {
    ObjectId id PK
    ObjectId buildingId FK
    number floorNumber
    string description
  }

  ROOM {
    ObjectId id PK
    ObjectId floorId FK
    string roomNumber
    number capacity
    enum genderType
    enum status
    boolean isFreshmanPriority
  }

  BED {
    ObjectId id PK
    ObjectId roomId FK
    string bedNumber
    enum status
  }

  ROOM_ASSIGNMENT {
    ObjectId id PK
    ObjectId residenceRecordId FK
    ObjectId studentId FK
    ObjectId semesterId FK
    ObjectId roomId FK
    ObjectId bedId FK
    ObjectId assignedBy FK
    datetime assignedAt
    enum status
    json studentSnapshot
    json roomSnapshot
  }

  REGULATION {
    ObjectId id PK
    string title
    text content
    enum status
    ObjectId createdBy FK
    ObjectId publishedBy FK
    datetime publishedAt
  }

  NOTIFICATION {
    ObjectId id PK
    string title
    text content
    enum scope
    enum type
    ObjectId createdBy FK
    datetime createdAt
  }

  NOTIFICATION_RECEIVER {
    ObjectId id PK
    ObjectId notificationId FK
    ObjectId studentId FK
    boolean isRead
    datetime readAt
  }

  STUDENT_REQUEST {
    ObjectId id PK
    ObjectId studentId FK
    enum type
    string title
    text content
    enum status
    text managerNote
    ObjectId processedBy FK
    datetime processedAt
  }

  VIOLATION {
    ObjectId id PK
    ObjectId studentId FK
    ObjectId semesterId FK
    text description
    string penalty
    date violationDate
    enum status
    ObjectId createdBy FK
  }

  UTILITY_USAGE {
    ObjectId id PK
    ObjectId roomId FK
    number month
    number year
    number oldElectricity
    number newElectricity
    number oldWater
    number newWater
    ObjectId recordedBy FK
    datetime recordedAt
  }

  UTILITY_BILL {
    ObjectId id PK
    ObjectId roomId FK
    ObjectId semesterId FK
    ObjectId usageId FK
    number month
    number year
    number electricityUsage
    number waterUsage
    number electricityCost
    number waterCost
    number vatAmount
    number totalCost
    enum status
    date dueDate
    datetime paymentDate
    json priceConfigSnapshot
    json roomMemberSnapshot
    ObjectId createdBy FK
  }

  UTILITY_BILL_MEMBER {
    ObjectId id PK
    ObjectId billId FK
    ObjectId studentId FK
    number amountShare
    enum status
    datetime paidAt
  }

  PAYMENT {
    ObjectId id PK
    ObjectId billId FK
    ObjectId studentId FK
    enum method
    number amount
    enum status
    string vnpTxnRef UK
    string vnpTransactionNo
    string vnpResponseCode
    string vnpPayDate
    string vnpSecureHash
    json vnpRawData
    ObjectId cashConfirmedBy FK
    datetime paidAt
  }

  SYSTEM_CONFIG {
    ObjectId id PK
    string configKey UK
    string configValue
    enum valueType
    string description
    ObjectId updatedBy FK
  }

  ELECTRIC_PRICE_TIER {
    ObjectId id PK
    number tierOrder UK
    number fromKwh
    number toKwh
    number unitPrice
    boolean isActive
  }

  IMPORT_BATCH {
    ObjectId id PK
    ObjectId semesterId FK
    string fileName
    number totalRows
    number successRows
    number failedRows
    enum status
    string errorMessage
    ObjectId importedBy FK
    datetime finishedAt
  }

  IMPORT_ROW_ERROR {
    ObjectId id PK
    ObjectId importBatchId FK
    number rowNumber
    string fieldName
    string errorMessage
    json rawData
  }

  EMAIL_LOG {
    ObjectId id PK
    string recipientEmail
    string subject
    text content
    enum status
    string errorMessage
    number retryCount
    datetime sentAt
  }

  ACTIVITY_LOG {
    ObjectId id PK
    ObjectId userId FK
    string action
    string entityName
    ObjectId entityId
    text description
    json oldValue
    json newValue
    string ipAddress
    datetime createdAt
  }

  USER ||--o| STUDENT : owns
  USER ||--o{ REFRESH_TOKEN : has
  USER ||--o{ PASSWORD_RESET_TOKEN : resets
  USER ||--o{ ROLE_PERMISSION : maps_role
  PERMISSION ||--o{ ROLE_PERMISSION : grants
  USER ||--o{ ACTIVITY_LOG : writes

  STUDENT ||--o{ RESIDENCE_RECORD : registers
  SEMESTER ||--o{ RESIDENCE_RECORD : contains
  RESIDENCE_RECORD ||--o| ROOM_ASSIGNMENT : assigned_by

  BUILDING ||--o{ FLOOR : has
  FLOOR ||--o{ ROOM : has
  ROOM ||--o{ BED : has

  STUDENT ||--o{ ROOM_ASSIGNMENT : receives
  SEMESTER ||--o{ ROOM_ASSIGNMENT : scopes
  ROOM ||--o{ ROOM_ASSIGNMENT : hosts
  BED ||--o{ ROOM_ASSIGNMENT : allocated

  USER ||--o{ REGULATION : creates
  REGULATION }o--o{ NOTIFICATION : announced_by
  NOTIFICATION ||--o{ NOTIFICATION_RECEIVER : delivered_to
  STUDENT ||--o{ NOTIFICATION_RECEIVER : receives

  STUDENT ||--o{ STUDENT_REQUEST : creates
  USER ||--o{ STUDENT_REQUEST : processes
  STUDENT ||--o{ VIOLATION : has
  SEMESTER ||--o{ VIOLATION : scopes

  ROOM ||--o{ UTILITY_USAGE : records
  ROOM ||--o{ UTILITY_BILL : billed
  SEMESTER ||--o{ UTILITY_BILL : scopes
  UTILITY_USAGE ||--o| UTILITY_BILL : generates
  UTILITY_BILL ||--o{ UTILITY_BILL_MEMBER : splits_to
  STUDENT ||--o{ UTILITY_BILL_MEMBER : pays_share
  UTILITY_BILL ||--o{ PAYMENT : paid_by
  STUDENT ||--o{ PAYMENT : makes

  SEMESTER ||--o{ IMPORT_BATCH : imports
  IMPORT_BATCH ||--o{ IMPORT_ROW_ERROR : has_errors
  USER ||--o{ EMAIL_LOG : triggers
  USER ||--o{ SYSTEM_CONFIG : updates
```

## Tech Stack

| Layer | Công nghệ |
|---|---|
| Monorepo | npm workspaces |
| Frontend | Next.js 16.2.9 App Router, React 19.2.7, TypeScript |
| UI | Tailwind CSS 4, lucide-react, Recharts, Sonner |
| State/Data | Zustand, TanStack Query, Axios |
| Backend | Node.js 20+, Express 4.21.2, TypeScript, tsx |
| Database | MongoDB, Mongoose 8 |
| Auth | JWT access token, refresh token, HTTP-only cookie |
| Validation | Zod |
| Security | Helmet, CORS credentials, cookie-parser, express-rate-limit |
| Excel | ExcelJS, XLSX |
| Email | Nodemailer / SMTP |
| Jobs | node-cron |
| Payment | VNPay sandbox |
| Logging | Winston |
| Testing | Node test runner qua `tsx --test` |

## Cấu trúc thư mục

```text
ptit-dormitory/
├── backend/
│   ├── src/
│   │   ├── app.ts
│   │   ├── server.ts
│   │   ├── config/
│   │   ├── common/
│   │   ├── integrations/
│   │   ├── jobs/
│   │   ├── models/
│   │   ├── modules/
│   │   └── routes/
│   ├── scripts/
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   ├── components/
│   │   ├── config/
│   │   ├── features/
│   │   ├── lib/
│   │   └── types/
│   ├── public/
│   └── package.json
├── docs/
├── package.json
├── package-lock.json
└── README.md
```

## Cài đặt local

### Yêu cầu

- Node.js `>=20`
- npm `>=10`
- MongoDB local hoặc MongoDB Atlas
- Tài khoản VNPay sandbox nếu muốn kiểm thử thanh toán thật
- SMTP account nếu muốn kiểm thử email

### 1. Cài dependencies

```bash
npm install
```

### 2. Tạo biến môi trường

Backend:

```bash
cp backend/.env.example backend/.env
```

Frontend:

```bash
cp frontend/.env.local.example frontend/.env.local
```

Trên Windows PowerShell:

```powershell
Copy-Item backend/.env.example backend/.env
Copy-Item frontend/.env.local.example frontend/.env.local
```

### 3. Cấu hình môi trường backend

```env
NODE_ENV=development
PORT=5000
CLIENT_URL=http://localhost:3000
SERVER_URL=http://localhost:5000
LOG_LEVEL=debug

MONGODB_URI=mongodb+srv://<user>:<password>@<cluster>.mongodb.net/ptit_dormitory?retryWrites=true&w=majority

JWT_ACCESS_SECRET=change_me_access_secret
JWT_REFRESH_SECRET=change_me_refresh_secret
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
COOKIE_SECRET=change_me_cookie_secret

SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password
SMTP_FROM=PTIT Dormitory <your_email@gmail.com>
SMTP_TIMEOUT_MS=10000

VNPAY_TMN_CODE=your_sandbox_tmn_code
VNPAY_HASH_SECRET=your_sandbox_hash_secret
VNPAY_URL=https://sandbox.vnpayment.vn/paymentv2/vpcpay.html
VNPAY_API_URL=https://sandbox.vnpayment.vn/merchant_webapi/api/transaction
VNPAY_RETURN_URL=http://localhost:3000/payment/vnpay-return
VNPAY_IPN_URL=http://localhost:5000/api/payments/vnpay/ipn
```

### 4. Cấu hình môi trường frontend

```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:5000/api
NEXT_PUBLIC_APP_NAME=PTIT Dormitory
```

Production trên Vercel:

```env
NEXT_PUBLIC_API_BASE_URL=https://neethgie-plus-frontend.vercel.app/api
NEXT_PUBLIC_APP_NAME=PTIT Dormitory
```

### 5. Chạy dự án

Chạy cả frontend và backend từ root:

```bash
npm run dev
```

Hoặc chạy riêng từng phần:

```bash
npm run dev:be
npm run dev:fe
```

| Dịch vụ | URL local |
|---|---|
| Frontend | http://localhost:3000 |
| Backend API | http://localhost:5000/api |
| Health check | http://localhost:5000/api/health |

## Seed dữ liệu

Backend có các script seed phục vụ dữ liệu demo và cấu hình hệ thống:

```bash
npm run seed -w backend
```

Script trên chạy lần lượt:

- `seed:permissions`
- `seed:users`
- `seed:configs`
- `seed:dormitory`
- `seed:electric`

Tài khoản demo mặc định:

| Vai trò | Username / Email | Mật khẩu |
|---|---|---|
| Admin | `admin` / `admin@ptit.edu.vn` | giá trị `SEED_ADMIN_PASSWORD` hoặc `admin123` khi chưa cấu hình |
| Manager | `manager` / `manager@ptithcm.edu.vn` | `manager123` |
| Student | mã sinh viên được seed, ví dụ `N24DCCN001` | `student123` |

Không chạy seed trên production nếu database đã có dữ liệu thật.

## API Overview

Base URL local: `http://localhost:5000/api`

Base URL production: `https://neethgie-plus-frontend.vercel.app/api` hoặc giá trị public tương ứng trong `NEXT_PUBLIC_API_BASE_URL`.

| Nhóm API | Endpoint chính | Mô tả |
|---|---|---|
| Health | `GET /health` | Kiểm tra uptime và trạng thái database. |
| Auth | `/auth/*` | Login, refresh, logout, forgot/reset/change password, `/me`. |
| Users | `/users/*` | Quản lý tài khoản, khóa/mở khóa, reset password. |
| Students | `/students/*` | Hồ sơ sinh viên, thống kê, export Excel, lịch sử lưu trú. |
| Import | `/students/import-excel`, `/import-batches/*` | Import Excel và tra cứu lỗi import. |
| Semesters | `/semesters/*` | Danh sách, cập nhật, kích hoạt và revert kỳ lưu trú. |
| Dormitory | `/buildings`, `/floors`, `/rooms`, `/beds` | Quản lý cấu trúc ký túc xá. |
| Room assignments | `/room-assignments/*` | Xếp phòng tự động/thủ công, lịch sử, chuyển phòng, danh sách chưa xếp. |
| Regulations | `/regulations/*` | Nội quy, publish/archive, danh sách đã công bố. |
| Notifications | `/notifications/*` | Thông báo chung, riêng, thông báo của sinh viên, unread count. |
| Requests | `/student-requests/*` | Sinh viên tạo đơn, cán bộ xử lý trạng thái. |
| Violations | `/violations/*` | Ghi nhận và tra cứu vi phạm. |
| Utility usage | `/utility-usages/*` | Nhập và tra cứu chỉ số điện nước. |
| Utility bills | `/utility-bills/*` | Tạo hóa đơn, xem hóa đơn, quá hạn, hủy hóa đơn. |
| Payments | `/payments/*` | VNPay create/return/IPN, kiểm tra trạng thái, xác nhận tiền mặt. |
| Reports | `/reports/*` | Báo cáo lưu trú, sức chứa, điện nước, thanh toán, vi phạm, đơn từ. |
| Configs | `/configs/*`, `/electric-price-tiers/*` | Cấu hình hệ thống và bậc giá điện. |
| Audit logs | `/audit-logs/*` | Nhật ký thao tác hệ thống. |
| Dashboard | `/dashboard/admin`, `/dashboard/student` | Dữ liệu dashboard theo vai trò. |

## Testing và chất lượng

Chạy toàn bộ kiểm tra từ root:

```bash
npm run typecheck
npm run lint
npm test
npm run build
```

Chạy riêng từng workspace:

```bash
npm run typecheck -w backend
npm run lint -w backend
npm run test -w backend
npm run build -w backend

npm run typecheck -w frontend
npm run lint -w frontend
npm run build -w frontend
```

## Deployment

### Frontend - Vercel

- Root Directory: `frontend`
- Framework Preset: Next.js
- Build Command: `npm run build`
- Output: mặc định của Next.js
- Production domain: `https://neethgie-plus-frontend.vercel.app/`

Biến môi trường:

```env
NEXT_PUBLIC_API_BASE_URL=https://neethgie-plus-frontend.vercel.app/api
NEXT_PUBLIC_APP_NAME=PTIT Dormitory
```

### Backend - Node service

Backend có thể deploy lên Render, Railway, VPS hoặc nền tảng Node.js tương đương.

- Root Directory: `backend`
- Build Command: `npm install --include=dev && npm run build`
- Start Command: `npm start`
- Health Check Path: `/api/health`

Khi deploy trên Render, vẫn đặt `NODE_ENV=production` cho runtime nhưng phải cài `devDependencies` trong bước build, vì `tsc` cần `typescript` và các package `@types/*`. Repo đã có `.npmrc` với `include=dev` để tránh lỗi missing declaration file khi Render build.

Biến môi trường production tối thiểu:

```env
NODE_ENV=production
PORT=5000
CLIENT_URL=https://neethgie-plus-frontend.vercel.app
SERVER_URL=https://neethgie-plus-frontend.vercel.app
MONGODB_URI=<mongodb-atlas-uri>
JWT_ACCESS_SECRET=<strong-secret>
JWT_REFRESH_SECRET=<strong-secret>
COOKIE_SECRET=<strong-secret>
```

Biến tùy chọn theo tính năng:

- SMTP: `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`, `SMTP_TIMEOUT_MS`
- VNPay: `VNPAY_TMN_CODE`, `VNPAY_HASH_SECRET`, `VNPAY_URL`, `VNPAY_API_URL`, `VNPAY_RETURN_URL`, `VNPAY_IPN_URL`
- Seed admin: `SEED_ADMIN_USERNAME`, `SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD`

SMTP production checklist:

- Gmail SSL: `SMTP_HOST=smtp.gmail.com`, `SMTP_PORT=465`, `SMTP_SECURE=true`.
- Gmail STARTTLS: `SMTP_HOST=smtp.gmail.com`, `SMTP_PORT=587`, `SMTP_SECURE=false`.
- Use a Gmail App Password, not the regular account password. If the app password is copied with spaces, the backend removes spaces for Gmail before authentication.
- Run `npm run smtp:verify -w backend` with production env values to verify SMTP without using the UI.
