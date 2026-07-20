# Thairath Step Up & Health Up — v2.3.0

ระบบกิจกรรมส่งเสริมสุขภาพสำหรับพนักงาน Thairath Logistics รองรับการส่งยอดก้าวรายสัปดาห์ พร้อม Screenshot หลักฐาน, OCR ด้วย Tesseract.js, การเก็บไฟล์ใน Google Drive และ Workflow ตรวจหลักฐานโดย Admin

> **Release:** v2.3.0 — Free Multi-pass OCR & Evidence Verification  
> **Production:** https://thairath-step-up.vercel.app/  
> **Evidence Root Folder ID:** `1aA_KkQN8Q-x8XPO_LrCLxlKXEGNH4g4R`

---

## 1. สิ่งที่เปลี่ยนใน v2.3 — Free OCR Improvement

- ยังคงใช้ `Tesseract.js` ใน Browser เท่านั้น ไม่มีค่า API และไม่ต้องใช้ API Key
- เตรียมภาพ OCR อัตโนมัติ 3 แบบ: ภาพต้นฉบับ, ภาพเพิ่ม Contrast และภาพ Binary ขาวดำ
- OCR ภาพเดียวกัน 3 รอบด้วย Worker เดียว เพื่อลดเวลาโหลดโมเดลซ้ำ
- ใช้ Consensus เลือกเลขที่ปรากฏตรงกันข้ามหลายรอบ แทนการเลือกเลขใหญ่ที่สุดจากรอบเดียว
- ตัด Candidate ที่มีลักษณะเป็นเวลา วันที่ เปอร์เซ็นต์ หรือเลขทศนิยม เช่น `10:42`, `20/07`, `5.72`
- ลดคะแนนตัวเลขที่อยู่ใกล้คำว่า `km`, `kcal`, `distance`, `goal`, `target` และเพิ่มคะแนนเลขที่อยู่ใกล้ `steps`
- ถ้าผลตรงกันเพียง 1 รอบ ระบบจำกัด Confidence ไม่เกิน 59% และส่งเข้า `NEEDS_REVIEW`
- หน้า Submission แสดงผล `อ่านตรงกัน X/3 รอบ` และเลข Candidate อื่นที่ตรวจพบ

## 2. ฟังก์ชันหลักจาก v2.2

### 2.1 Logic เป้าหมาย 7,000 ก้าว

- ยอดที่พนักงานกรอกถูกเทียบกับเป้าหมาย `7,000 ก้าวต่อสัปดาห์` โดยตรง
- ไม่มีการหารด้วยจำนวนวันของสัปดาห์
- รายการที่ผ่านตรวจและมียอดตั้งแต่ 7,000 ก้าวขึ้นไป ได้รับ 1 คูปอง
- Dashboard, Leaderboard และคูปอง ใช้เฉพาะรายการที่มีสถานะ `AUTO_VERIFIED` หรือ `APPROVED`

### 2.2 Upload หลักฐานเข้า Google Drive

เมื่อพนักงานส่งผล ระบบจะ:

1. ลดขนาดรูปใน Browser เพื่อให้ Upload เสถียร
2. ส่ง Base64 ไปยัง Google Apps Script
3. สร้าง Folder อัตโนมัติภายใต้ Root Evidence Folder
4. บันทึก `imageFileId` และ `imageUrl` ลง Sheet `StepLogs`

โครงสร้าง Folder:

```text
Root Evidence Folder
├── Month_01
│   ├── Week_01
│   ├── Week_02
│   ├── Week_03
│   └── Week_04
├── Month_02
│   └── Week_01 ...
└── Month_06
    ├── Week_01
    └── Week_02
```

### 2.3 OCR ด้วย Tesseract.js

- OCR ทำงานใน Browser ก่อนส่งข้อมูลและไม่มีค่าใช้จ่ายต่อรูป
- ระบบอ่านภาพ 3 รูปแบบและใช้ Consensus จากหลายรอบ
- Candidate ถูกจัดคะแนนจากขนาด ตำแหน่ง Confidence และข้อความรอบตัว
- เก็บผล OCR ทั้ง 3 รอบรวมไว้ใน `ocrText` พร้อม `ocrSteps` และ `ocrConfidence`
- ถ้า OCR ล้มเหลวหรือผลไม่เห็นตรงกัน พนักงานยังส่งได้ แต่สถานะจะเป็น `NEEDS_REVIEW`

### 2.4 Verification Status

| Status | ความหมาย | นำไปคำนวณหรือไม่ |
|---|---|---|
| `AUTO_VERIFIED` | OCR อ่านยอดตรงกับค่าที่กรอก และ Confidence ≥ 60% | ใช่ |
| `NEEDS_REVIEW` | OCR อ่านไม่พบ, Confidence ต่ำ หรือยอดไม่ตรง | ไม่ใช่ |
| `APPROVED` | Admin ตรวจแล้วและอนุมัติ | ใช่ |
| `REJECTED` | Admin ตรวจแล้วและไม่อนุมัติ | ไม่ใช่ |

> Backend เป็นผู้ตัดสินสถานะเริ่มต้นอีกครั้ง ไม่เชื่อสถานะที่ Frontend ส่งมาโดยตรง

### 2.5 Admin Evidence Review

หน้า Admin เพิ่ม Tab `ตรวจหลักฐาน` พร้อมความสามารถ:

- Filter เดือน / สัปดาห์ / ฝ่าย / Verification Status
- ดูรูปหลักฐานจาก Google Drive
- เทียบยอดที่กรอกกับ OCR Result และ Confidence
- Approve / Reject พร้อม Review Note
- Export รายการหลักฐานเป็น CSV
- ลบรายการและย้ายไฟล์หลักฐานไป Trash ใน Google Drive

---

## 3. Architecture

```text
Employee / Admin Browser
          │
          ▼
React 19 + Vite 6 on Vercel
          │
          ├── Tesseract.js OCR in Browser
          │
          ▼
/api/sheets — Vercel Serverless Proxy
          │
          ▼
Google Apps Script Web App
          │
          ├── Google Sheets
          │   ├── Employees
          │   └── StepLogs
          │
          └── Google Drive
              └── Root → Month → Week → Evidence Image
```

---

## 4. Technology Stack

| Layer | Technology |
|---|---|
| Frontend | React 19 + TypeScript |
| Build | Vite 6 |
| Styling | Tailwind CSS 4 |
| OCR | Tesseract.js 6 |
| API Proxy | Vercel Serverless Function |
| Backend | Google Apps Script |
| Database | Google Sheets |
| File Storage | Google Drive |
| Hosting | Vercel |

---

## 5. Project Structure

```text
Thairath-Step-Up/
├── api/
│   └── sheets.ts
├── google-apps-script/
│   ├── Code.gs
│   ├── sample-employees.csv
│   └── sample-steplogs.csv
├── src/
│   ├── components/
│   │   ├── AdminPortalView.tsx
│   │   ├── DashboardView.tsx
│   │   ├── HistoryDrawer.tsx
│   │   ├── LeaderboardView.tsx
│   │   ├── LoginView.tsx
│   │   ├── SettingsPanel.tsx
│   │   └── SubmissionView.tsx
│   ├── App.tsx
│   ├── campaignConfig.ts
│   ├── evidenceOcr.ts
│   ├── sheetsBackend.ts
│   ├── types.ts
│   └── ...
├── .env.example
├── package.json
└── README.md
```

---

## 5. Google Sheets Schema

### 5.1 Sheet: Employees

```text
employeeId
password
dateOfBirth
name
Surename
nickname
departmentId
weekTarget
totalTickets
email
status
createdAt
updatedAt
lastLoginAt
lastSubmitAt
```

`totalTickets` ถูก Recalculate จากจำนวนรายการที่:

- Status เป็น `AUTO_VERIFIED` หรือ `APPROVED`
- `steps >= 7000`

### 5.2 Sheet: StepLogs

```text
id
userEmail
employeeId
date
steps
week
weekOfMonth
imageName
submittedAt
createdAt
updatedAt
imageFileId
imageUrl
ocrText
ocrSteps
ocrConfidence
verificationStatus
reviewNote
reviewedBy
reviewedAt
```

Apps Script จะคง 11 คอลัมน์เดิมของ v2.1 ไว้ตำแหน่งเดิม และเติมฟิลด์ OCR/Review ต่อท้ายอัตโนมัติ โดยไม่เลื่อนหรือลบข้อมูลเดิม

---

## 6. Deployment Guide

### Step 1 — ติดตั้ง Package

```bash
npm install
```

### Step 2 — Update Google Apps Script

1. เปิด Spreadsheet Database
2. ไปที่ `Extensions → Apps Script`
3. แทนที่ Code เดิมด้วยไฟล์ `google-apps-script/Code.gs`
4. Save
5. กด Run ฟังก์ชัน `migrateWeeklyTargetTo7000()` หนึ่งครั้ง
6. กด Run ฟังก์ชัน `recalculateAllVerifiedTickets()` หนึ่งครั้ง หลังจัดการสถานะข้อมูลเดิมแล้ว
7. อนุญาต Permission สำหรับ Google Sheets และ Google Drive

### Step 3 — Deploy Apps Script Web App

1. เลือก `Deploy → Manage deployments`
2. Edit Deployment เดิม หรือสร้าง New Deployment
3. Type: `Web app`
4. Execute as: `Me`
5. Who has access: ใช้ค่าที่องค์กรอนุญาตและทำให้ Vercel เรียก Endpoint ได้
6. Deploy และ Copy Web App URL

> ทุกครั้งที่แก้ `Code.gs` ต้องสร้าง Version/Deployment ใหม่ หรือ Update Deployment ให้ชี้ Version ล่าสุด

### Step 4 — Vercel Environment Variables

กำหนดใน Production และ Preview:

```text
GOOGLE_APPS_SCRIPT_URL=https://script.google.com/macros/s/.../exec
ADMIN_USERNAME=...
ADMIN_PASSWORD=...
VITE_ENABLE_SHOWCASE=false
```

ไม่ต้องกำหนด `VITE_SHEETS_API_URL` เมื่อใช้ `/api/sheets` ภายในโปรเจกต์

### Step 5 — Deploy Frontend

Push Source Code ไป GitHub แล้ว Deploy ผ่าน Vercel ตามปกติ

---

## 7. Migration จาก v2.1

ข้อมูลเดิมใน `StepLogs` ไม่มี Verification Status ระบบจะอ่านเป็น `NEEDS_REVIEW` โดยอัตโนมัติ และจะไม่นำไปคำนวณจนกว่า Admin จะ Approve

แนวทาง Migration:

1. Deploy `Code.gs` v2.2 ขึ้นไป (OCR v2.3 ไม่ต้องแก้ Backend)
2. เปิด Web App URL หนึ่งครั้ง เพื่อให้ระบบเติม Header
3. เข้า Admin → ตรวจหลักฐาน
4. Approve / Reject รายการเดิม
5. Run `recalculateAllVerifiedTickets()` เพื่อ Sync คูปองทั้งหมด

หากต้องการ Mark รายการเดิมจำนวนมากเป็น Approved สามารถกรอก `APPROVED` ใน Column `verificationStatus` โดยตรง แล้ว Run `recalculateAllVerifiedTickets()`

---

## 8. Business Rules

### Dashboard

- แสดงรายการทั้งหมดใน History พร้อมสถานะ
- ตัวเลขสรุปและ Progress ใช้เฉพาะรายการผ่านตรวจ
- ไม่มีการคำนวณ Average ต่อวันจากจำนวนวัน

### Leaderboard

- ใช้เฉพาะ `AUTO_VERIFIED` และ `APPROVED`
- Department Average = Verified Steps ÷ จำนวนพนักงานที่มีรายการผ่านตรวจ

### Coupon

```text
1 Verified Submission ที่ steps >= 7,000 = 1 Coupon
```

- `NEEDS_REVIEW` ยังไม่ได้ Coupon
- เมื่อ Admin Approve ระบบ Recalculate ให้อัตโนมัติ
- เมื่อ Reject หรือลบรายการ ระบบ Recalculate ให้อัตโนมัติ
- v2.2 ตัดการปรับคูปอง Manual ออกจากหน้า Admin เพื่อป้องกันยอดที่ไม่ผูกกับหลักฐานผ่านตรวจ

---

## 9. Local Commands

```bash
npm run dev
npm run lint
npm run build
npm run preview
```

ผลตรวจ Release นี้:

```text
npm run lint   ✅ Passed
npm run build  ✅ Passed
```

---

## 10. Operational Notes

- Account ที่ Deploy Apps Script ต้องมีสิทธิ์เข้าถึง Root Evidence Folder
- Share Root Evidence Folder ให้ผู้ดูแลที่ต้องตรวจหลักฐานอย่างน้อยสิทธิ์ Viewer มิฉะนั้น Thumbnail/ลิงก์รูปในหน้า Admin จะเปิดไม่ได้
- อย่าเปิด Root Folder เป็น Public หากไม่มีความจำเป็น เนื่องจากเป็นข้อมูลพนักงาน
- Tesseract.js โหลด OCR Worker/Language Data ตอนใช้งานครั้งแรก จึงต้องมี Internet Connection
- OCR เป็น First-pass Verification ไม่ใช่การรับรอง 100% รายการที่ไม่ชัดจะถูกส่งเข้า Admin Review
- รูปถูก Resize สูงสุดประมาณ 1,600 px ก่อน Upload เพื่อลด Payload และเวลาในการประมวลผล
