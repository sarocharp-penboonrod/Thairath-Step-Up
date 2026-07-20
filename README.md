# Thairath Step Up & Health Up

ระบบกิจกรรมส่งเสริมสุขภาพสำหรับพนักงาน Thairath Logistics ใช้สำหรับเข้าสู่ระบบด้วยรหัสพนักงาน ส่งยอดก้าวรายสัปดาห์ ติดตามความคืบหน้าส่วนบุคคล สะสมสิทธิ์ลุ้นรางวัล ดูอันดับรายฝ่าย และบริหารข้อมูลโครงการผ่าน Admin Center

> **Release ปัจจุบัน:** v2.0.0 — Google Sheets Backend / Dashboard & Admin Enhancement  
> **Production:** https://thairath-step-up.vercel.app/  
> **Repository:** https://github.com/sarocharp-penboonrod/Thairath-Step-Up

---

## 1. ภาพรวมระบบ

ระบบแบ่งเป็น 2 ส่วนหลัก

### Employee Portal

- Login ด้วยรหัสพนักงาน 6 หลัก
- Password เป็นวันเดือนปีเกิดรูปแบบ `DDMMYY`
- ลงทะเบียนครั้งแรกด้วยชื่อเล่นและฝ่าย
- ส่งยอดก้าวเป็นยอดรวมรายสัปดาห์
- เลือกเดือนและสัปดาห์ตาม Campaign Calendar
- แนบชื่อไฟล์ Screenshot เพื่อใช้เป็นหลักฐาน
- ดู Overall Journey ตลอดโครงการ
- ดูผลของเดือนที่เลือก
- ดูประวัติการส่ง
- ดู Leaderboard รายฝ่าย

### Admin Center

- Login ด้วยบัญชี Admin ที่กำหนดใน Vercel Environment Variables
- ดูภาพรวมพนักงานและ Participation Rate
- Filter เดือน สัปดาห์ และฝ่าย
- ค้นหาด้วยรหัสพนักงาน ชื่อ ชื่อเล่น หรือฝ่าย
- ดู Last Login และ Last Submit
- ตรวจสอบ Submission Logs
- ดู Department Leaderboard และ Top Walkers
- เพิ่มพนักงานใหม่
- ปรับจำนวน Lottery Tickets
- Export รายชื่อและ Submission เป็น CSV ตาม Filter ที่เลือก

---

## 2. การปรับปรุงสำคัญใน v2.0

### Employee Dashboard

- เพิ่ม Overall Journey 4 Flash Cards
  - ก้าวสะสมทั้งโครงการ
  - เป้าหมายสะสมถึงปัจจุบัน
  - ความสำเร็จรวม
  - จำนวนสัปดาห์ที่ทำเป้าหมายสำเร็จ
- แยกข้อมูล “ภาพรวมทั้งโครงการ” ออกจาก “ข้อมูลรายเดือน” อย่างชัดเจน
- แก้ Logic เป้าหมายรายเดือนให้คำนวณจากจำนวนสัปดาห์ของเดือนนั้น
- รองรับเดือนธันวาคมเฉพาะ Week 1–2
- ปรับ Health Insight ให้ใช้ค่าเฉลี่ยโดยประมาณจากจำนวนวันในช่วงสัปดาห์ที่ส่งจริง
- เพิ่มคำอธิบายว่าข้อมูลสุขภาพเป็นข้อมูลทั่วไป ไม่ใช่คำแนะนำทางการแพทย์

### Submission

- ใช้ Campaign Calendar กลางจากไฟล์เดียว
- ป้องกันการส่งซ้ำในเดือนและสัปดาห์เดียวกันทั้ง Frontend และ Backend
- รอผลบันทึกจาก Backend ก่อนแสดงรายการบนหน้าจอ
- แสดง Error ที่อ่านเข้าใจง่ายเมื่อบันทึกไม่สำเร็จ

### Admin Center

- เพิ่ม Summary Cards ตามช่วงเวลาที่เลือก
- Filter เดือนและสัปดาห์ควบคุม Summary, Logs, Leaderboard และ Top Walkers ชุดเดียวกัน
- Department Filter อ่านค่าจริงจาก Google Sheets ไม่บังคับให้ตรงกับรายการ Hardcode
- เพิ่ม Last Login และ Last Submit
- Export CSV เฉพาะข้อมูลตาม Filter
- ไม่แสดงหรือส่ง Password วันเกิดกลับมาที่หน้า Admin

### Security & Production Readiness

- ย้าย Admin Credential ออกจาก Frontend ไปตรวจที่ Vercel Serverless Function
- ตัด Hardcoded Admin/Backdoor Account ออกจาก Source Code
- ซ่อน Storyboard/Prototype Toolbar ใน Production โดยค่าเริ่มต้น
- ล็อกข้อมูลชื่อจริง ฝ่าย และ Weekly Target ในหน้า Setting
- พนักงานแก้ได้เฉพาะชื่อเล่นที่ใช้แสดงในระบบ
- ตัด Firebase และ Package ที่ไม่ได้ใช้ออกจากโปรเจกต์

### UI & Font

- ใช้ฟอนต์ `Prompt` เป็นฟอนต์หลักทั้งระบบ
- มี System Font Fallback สำหรับกรณี Google Fonts โหลดไม่ได้
- ปรับ Font Smoothing เพื่อให้ภาษาไทยและตัวเลขอ่านง่ายขึ้น
- รักษา Visual Style เดิม ได้แก่ Bento Cards, สีเขียว Thairath, Progress Ring และ Responsive Layout

---

## 3. System Architecture

```text
Employee / Admin Browser
          │
          ▼
React 19 + Vite 6 on Vercel
          │
          ▼
/api/sheets — Vercel Serverless Proxy
          │
          ▼
Google Apps Script Web App
          │
          ▼
Google Sheets
├── Employees
└── StepLogs
```

### เหตุผลที่ใช้ Vercel Proxy

- ซ่อน Google Apps Script URL จาก Logic หลักของ Frontend
- เก็บ Admin Credential เป็น Server-side Environment Variables
- ลดปัญหา CORS ระหว่าง Browser กับ Apps Script
- รองรับการเพิ่ม Validation หรือ Security Token ในอนาคต

---

## 4. Technology Stack

| Layer | Technology |
|---|---|
| Frontend | React 19 |
| Build Tool | Vite 6 |
| Language | TypeScript 5.8 |
| Styling | Tailwind CSS 4 |
| Icons | Lucide React |
| Font | Prompt |
| API Proxy | Vercel Serverless Function |
| Backend | Google Apps Script |
| Database | Google Sheets |
| Hosting | Vercel |
| Version Control | GitHub |
| Package Manager | npm |

---

## 5. Project Structure

```text
Thairath-Step-Up/
├── api/
│   └── sheets.ts
│       Vercel Serverless Proxy และ Admin Authentication
│
├── google-apps-script/
│   ├── Code.gs
│   │   Backend API สำหรับ Google Sheets
│   ├── sample-employees.csv
│   └── sample-steplogs.csv
│
├── src/
│   ├── components/
│   │   ├── LoginView.tsx
│   │   ├── DashboardView.tsx
│   │   ├── SubmissionView.tsx
│   │   ├── LeaderboardView.tsx
│   │   ├── AdminPortalView.tsx
│   │   ├── Header.tsx
│   │   ├── HistoryDrawer.tsx
│   │   └── SettingsPanel.tsx
│   ├── App.tsx
│   ├── campaignConfig.ts
│   ├── sheetsBackend.ts
│   ├── mockData.ts
│   ├── types.ts
│   ├── index.css
│   └── main.tsx
│
├── .env.example
├── index.html
├── package.json
├── package-lock.json
├── tsconfig.json
├── vite.config.ts
└── README.md
```

---

## 6. Google Sheets Database

Spreadsheet ปัจจุบัน:

```text
https://docs.google.com/spreadsheets/d/1YgxxKpP74EkzfzAJn2wnTXamrYJ9-aBZsKwcBo7v3Dk/edit
```

Apps Script จะสร้างหรือเติม Header ที่ขาดให้อัตโนมัติเมื่อมีการเรียก `setup` หรือเปิด Web App URL

### 6.1 Sheet: Employees

Header ต้องเรียงดังนี้

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

ตัวอย่าง

| employeeId | password | dateOfBirth | name | Surename | nickname | departmentId | weekTarget | totalTickets | email | status |
|---|---|---|---|---|---|---|---:|---:|---|---|
| 123456 | 020826 | 02/08/2526 | สมชาย | ใจดี | ชาย | OPERATION | 60000 | 0 | somchai.j@thairath.co.th | Active |

### หมายเหตุเรื่อง `Surename`

Header นี้สะกดเป็น `Surename` ตามฐานข้อมูลปัจจุบันเพื่อรักษา Compatibility กับข้อมูลเดิม ห้ามเปลี่ยนเป็น `Surname` โดยไม่แก้ Mapping ใน `Code.gs` และ TypeScript พร้อมกัน

### Password พนักงาน

รูปแบบคือ `DDMMYY` โดยใช้วัน เดือน และเลข 2 หลักท้ายของปี พ.ศ.

```text
02/08/2526 → 020826
15/12/2540 → 151240
```

ถ้า `dateOfBirth` อยู่ในเซลล์ `C2` และเป็น Date จริง สามารถสร้าง Password ด้วยสูตร

```excel
=IF(C2="","",TEXT(DAY(C2),"00")&TEXT(MONTH(C2),"00")&RIGHT(YEAR(C2),2))
```

ควรกำหนด Column `employeeId` และ `password` เป็น Plain text เพื่อรักษาเลขศูนย์ด้านหน้า

### Field สำคัญ

| Field | การใช้งาน |
|---|---|
| `employeeId` | Username 6 หลัก |
| `password` | วันเดือนปีเกิด 6 หลัก |
| `dateOfBirth` | ใช้คำนวณอายุอัตโนมัติ |
| `departmentId` | ใช้จัดกลุ่ม Filter และ Leaderboard |
| `weekTarget` | เป้าหมายก้าวต่อสัปดาห์ ค่าเริ่มต้น 60,000 |
| `totalTickets` | ตั๋วสะสมทั้งหมด |
| `status` | ต้องเป็น `Active` จึง Login ได้ |
| `lastLoginAt` | อัปเดตทุกครั้งที่ Login สำเร็จ |
| `lastSubmitAt` | อัปเดตเมื่อส่งยอด และคำนวณใหม่เมื่อลบ Submission |

### 6.2 Sheet: StepLogs

Header ต้องเรียงดังนี้

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
```

### ความหมายของ `week` และ `weekOfMonth`

เพื่อรักษา Compatibility กับระบบเดิม:

- `week` = ลำดับเดือนของ Campaign
  - 1 = กรกฎาคม
  - 2 = สิงหาคม
  - 3 = กันยายน
  - 4 = ตุลาคม
  - 5 = พฤศจิกายน
  - 6 = ธันวาคม
- `weekOfMonth` = สัปดาห์ภายในเดือนนั้น เช่น 1, 2, 3, 4 หรือ 5

ตัวอย่าง

```text
week = 4
weekOfMonth = 2
```

หมายถึง **ตุลาคม Week 2**

---

## 7. Campaign Calendar

กำหนดที่ไฟล์

```text
src/campaignConfig.ts
```

ไฟล์นี้เป็น Source of Truth สำหรับ

- รายชื่อเดือน
- จำนวนสัปดาห์ในแต่ละเดือน
- ช่วงวันที่
- Default Month ตามวันที่ปัจจุบัน
- Overall Target ถึงปัจจุบัน
- Monthly Target
- Duplicate Validation

จำนวนสัปดาห์ปัจจุบัน

| เดือน | จำนวนสัปดาห์ |
|---|---:|
| กรกฎาคม 2026 | 4 |
| สิงหาคม 2026 | 4 |
| กันยายน 2026 | 4 |
| ตุลาคม 2026 | 5 |
| พฤศจิกายน 2026 | 4 |
| ธันวาคม 2026 | 2 |

หาก Timeline เปลี่ยน ให้แก้ไฟล์นี้เป็นจุดแรก ไม่ควรเขียนช่วงวันที่ซ้ำในแต่ละ Component

---

## 8. Calculation Logic

### Overall Journey

```text
ก้าวสะสมทั้งโครงการ
= ผลรวม StepLogs ทุกเดือนของพนักงาน

เป้าหมายสะสมถึงปัจจุบัน
= Weekly Target × จำนวน Campaign Week ที่เริ่มแล้ว

ความสำเร็จรวม
= ก้าวสะสม ÷ เป้าหมายสะสม × 100

สัปดาห์ที่ทำสำเร็จ
= จำนวน Week ที่ Steps ≥ Weekly Target
```

### Monthly Summary

```text
ก้าวเดือนที่เลือก
= ผลรวม StepLogs ที่ week ตรงกับเดือนที่เลือก

เป้าหมายเดือน
= Weekly Target × จำนวนสัปดาห์ของเดือนนั้น

Monthly Progress
= ก้าวเดือนที่เลือก ÷ เป้าหมายเดือน × 100
```

### Department Leaderboard

```text
ก้าวเฉลี่ยต่อผู้เข้าร่วม
= ก้าวรวมของฝ่ายในเดือนที่เลือก ÷ จำนวนผู้ส่งของฝ่าย

Participation Rate
= จำนวนพนักงานที่ส่ง ÷ จำนวนพนักงาน Active ในฝ่าย × 100
```

ระบบจะแสดงเฉพาะฝ่ายที่มีอยู่จริงในฐานข้อมูล Employees หากฐานข้อมูลว่างจึงใช้โครงสร้างตัวอย่างเป็น Fallback

---

## 9. Authentication

### Employee Login

```text
Username: employeeId 6 หลัก
Password: วันเดือนปีเกิด DDMMYY
```

Flow

```text
Login
→ Apps Script ตรวจ Employees
→ เช็ก status = Active
→ อัปเดต lastLoginAt
→ ส่ง Profile กลับมา
→ ถ้ายังไม่มี nickname ให้ทำ First-time Setup
```

### Admin Login

Admin Credential ไม่ได้อยู่ใน Source Code และไม่ถูกส่งไป Google Sheets

ระบบตรวจผ่าน

```text
api/sheets.ts
```

โดยอ่านค่าจาก Vercel Environment Variables

```text
ADMIN_USERNAME
ADMIN_PASSWORD
```

ห้ามใช้ Prefix `VITE_` กับ Admin Credential เพราะตัวแปรที่ขึ้นต้นด้วย `VITE_` จะถูกฝังใน Frontend Bundle และผู้ใช้สามารถดูได้

---

## 10. Environment Variables

ตัวอย่างอยู่ใน `.env.example`

### Vercel Production

| Key | Value |
|---|---|
| `GOOGLE_APPS_SCRIPT_URL` | URL ของ Apps Script Web App |
| `VITE_SHEETS_API_URL` | `/api/sheets` |
| `VITE_ENABLE_SHOWCASE` | `false` |
| `ADMIN_USERNAME` | ชื่อผู้ใช้ Admin ที่กำหนด |
| `ADMIN_PASSWORD` | รหัสผ่าน Admin ที่กำหนด |
| `APP_URL` | `https://thairath-step-up.vercel.app` |

Apps Script URL ปัจจุบัน

```text
https://script.google.com/macros/s/AKfycbzLD67Y13eXGOtZO9PJNC9DtGe6ZDCoPxcIGe8GY2DN4RcqUiVI0mRtRiZswdGP-Cao3g/exec
```

แนะนำให้เลือก Environment ครบ

- Production
- Preview
- Development

หลังแก้ Environment Variables ต้อง Redeploy จึงจะมีผลกับ Deployment ใหม่

---

## 11. Google Apps Script Deployment

เมื่อมีการแก้ `google-apps-script/Code.gs` ต้องดำเนินการดังนี้

1. เปิด Spreadsheet
2. ไปที่ **Extensions → Apps Script**
3. นำโค้ดจาก `google-apps-script/Code.gs` ไปวางทับ
4. กด Save
5. ไปที่ **Deploy → Manage deployments**
6. เลือก Deployment เดิมแล้วกด Edit
7. เลือก **New version**
8. ตั้งค่า
   - Execute as: `Me`
   - Who has access: `Anyone with the link`
9. กด Deploy
10. ตรวจว่า Web App URL ยังตรงกับ `GOOGLE_APPS_SCRIPT_URL` ใน Vercel

การแก้ Source Code ใน GitHub อย่างเดียวจะไม่อัปเดต Apps Script ต้อง Deploy Apps Script แยกทุกครั้ง

---

## 12. Installation & Local Development

### Install

```bash
npm install
```

### Type Check / Lint

```bash
npm run lint
```

### Production Build

```bash
npm run build
```

### Vite Development Server

```bash
npm run dev
```

Vite จะเปิดที่

```text
http://localhost:3000
```

อย่างไรก็ตาม `npm run dev` เพียงอย่างเดียวจะไม่จำลอง Vercel Serverless Route `/api/sheets`

หากต้องทดสอบ Frontend + API Proxy ในเครื่อง แนะนำใช้ Vercel CLI

```bash
npx vercel dev
```

และสร้าง `.env.local` จาก `.env.example` โดยห้าม Commit `.env.local` ขึ้น GitHub

---

## 13. GitHub & Vercel Deployment

### วิธีอัปเดตทั้งก้อน

1. แตก Zip
2. Copy ไฟล์ทั้งหมดไปวางทับใน Root ของ Repository เดิม
3. อย่านำ `node_modules` หรือ `dist` ขึ้น Git
4. ตรวจสอบ

```bash
npm install
npm run lint
npm run build
```

5. Commit และ Push

```bash
git add .
git commit -m "feat: release step up v2 dashboard and admin enhancement"
git push
```

6. Vercel จะ Deploy อัตโนมัติเมื่อเชื่อม GitHub ไว้แล้ว
7. ตรวจ Environment Variables และกด Redeploy หากมีการเปลี่ยนค่า

### ลำดับ Deployment ที่แนะนำ

```text
1. Update Google Sheets Header/Data
2. Update + Deploy Apps Script
3. Update Vercel Environment Variables
4. Push GitHub
5. Verify Vercel Deployment
6. Pilot Test
```

---

## 14. Production Test Checklist

### Employee

- [ ] Login ด้วย Employee ID และ Password วันเกิดได้
- [ ] Login ผิดแสดงข้อความที่เข้าใจง่าย
- [ ] First-time Setup บันทึกชื่อเล่นได้
- [ ] Dashboard แสดง Overall Journey ถูกต้อง
- [ ] Monthly Target ตรงกับจำนวน Week ของเดือน
- [ ] ธันวาคมแสดงเฉพาะ Week 1–2
- [ ] ส่งยอดก้าวได้
- [ ] ส่งซ้ำ Week เดิมไม่ได้
- [ ] ประวัติแสดงเดือนและ Week ถูกต้อง
- [ ] Leaderboard แสดงฝ่ายจริงจาก Google Sheets
- [ ] Mobile Responsive ใช้งานได้

### Admin

- [ ] Admin Login ได้ด้วย Environment Variables
- [ ] Summary เปลี่ยนตามเดือน/Week
- [ ] Filter ฝ่ายได้
- [ ] Search รหัส ชื่อ ชื่อเล่น และฝ่ายได้
- [ ] Last Login แสดงถูกต้อง
- [ ] Last Submit แสดงถูกต้อง
- [ ] เพิ่มพนักงานใหม่ได้
- [ ] ปรับ Ticket ได้
- [ ] Export CSV ตาม Filter ได้
- [ ] ไม่มี Password วันเกิดปรากฏในหน้าจอหรือไฟล์ Export

### Backend

- [ ] Sheet Employees มี Header ครบ 15 Columns
- [ ] Sheet StepLogs มี Header ครบ 11 Columns
- [ ] Apps Script Deployment เป็น Version ล่าสุด
- [ ] Vercel `GOOGLE_APPS_SCRIPT_URL` ถูกต้อง
- [ ] `/api/sheets` ตอบสถานะ `ready: true`

---

## 15. Known Limitations

### Screenshot

เวอร์ชันนี้เก็บเฉพาะ `imageName` ใน Google Sheets และใช้ภาพ Preview เฉพาะใน Session ปัจจุบัน ยังไม่ได้ Upload ไฟล์จริงไป Google Drive

หากต้องการตรวจหลักฐานย้อนหลัง ควรพัฒนาต่อเป็น

```text
Browser Upload
→ Google Apps Script
→ Google Drive Folder
→ เก็บ Drive URL ใน StepLogs
```

### Password วันเกิด

Password แบบวันเดือนปีเกิดเหมาะกับ Pilot ที่ต้องการ Onboarding ง่าย แต่มีความปลอดภัยต่ำกว่าระบบ SSO หรือ OTP

ก่อนขยายใช้งานในวงกว้างควรพิจารณา

- Google Workspace SSO
- Microsoft Entra ID
- OTP ผ่านอีเมล/โทรศัพท์
- Password Hash และ Session Token

### Google Sheets Scalability

Google Sheets + Apps Script เหมาะกับ Pilot และจำนวนผู้ใช้ระดับหลักร้อยถึงประมาณหนึ่งพันที่ไม่ได้ส่งข้อมูลพร้อมกันจำนวนมาก แต่ไม่ใช่ Database สำหรับ High-concurrency

ก่อนเปิดใช้งานพร้อมกันทั้งองค์กรควรทำ Load Test และพิจารณา Supabase, Firebase หรือ Cloud SQL หากปริมาณ Transaction เพิ่มสูง

### Admin Authorization

ปัจจุบัน Admin Login ใช้ Credential กลาง 1 ชุดจาก Vercel Environment Variables ยังไม่มี Role-based Access Control หรือ Audit Log ราย Admin

---

## 16. Future Roadmap

ลำดับที่แนะนำ

1. Google Drive Screenshot Upload
2. Reminder ผู้ยังไม่ส่งผ่าน Email หรือ LINE OA
3. Ticket Transaction Log แยก Earned / Bonus / Adjustment
4. Admin Audit Log
5. PWA สำหรับติดตั้งบนมือถือ
6. Google Health Connect / Apple Health ผ่าน Mobile Application
7. SSO และ Role-based Access Control

### Google Fit / Apple Health

เว็บไซต์ Vercel ทั่วไปไม่สามารถอ่านข้อมูลสุขภาพในโทรศัพท์โดยตรง โดยเฉพาะ Apple Health จำเป็นต้องมี Native iOS Application หรือระบบกลางที่ผู้ใช้ให้สิทธิ์

Android รุ่นใหม่ควรพิจารณา Health Connect มากกว่าออกแบบใหม่บน Google Fit API เดิม

---

## 17. Troubleshooting

### Login แล้วขึ้นว่าไม่พบพนักงาน

ตรวจสอบ

- `employeeId` เป็น 6 หลักและไม่มีช่องว่าง
- Column ถูกตั้งเป็น Plain text
- `status` เป็น `Active`
- Apps Script เชื่อม Spreadsheet ID ถูกต้อง

### Password 0 ด้านหน้าหาย

ตั้ง Column `password` เป็น Plain text และกรอก `020826` ไม่ใช่ตัวเลขทั่วไป

### Admin Login ไม่ได้

ตรวจสอบ Vercel Environment Variables

```text
ADMIN_USERNAME
ADMIN_PASSWORD
```

จากนั้น Redeploy

### ทุกคนขึ้น “ไม่ระบุฝ่าย”

ตรวจสอบว่า `departmentId` มีข้อมูลจริง และไม่มี Header สะกดผิด Apps Script รองรับทั้งรหัสฝ่ายและชื่อฝ่ายโดยตรง

### Last Login ไม่อัปเดต

- ตรวจว่า Apps Script เป็น Version ล่าสุด
- ตรวจว่า Header `lastLoginAt` มีอยู่
- ต้อง Login สำเร็จใหม่จึงจะอัปเดต

### Last Submit ไม่อัปเดต

- ตรวจ Header `lastSubmitAt`
- ตรวจว่า Submission บันทึกเข้า StepLogs สำเร็จ
- หากลบ Log ระบบจะคำนวณ Last Submit ใหม่จากรายการที่เหลือ

### Vercel Build ผ่าน แต่ระบบเรียก Backend ไม่ได้

ตรวจ

```text
GOOGLE_APPS_SCRIPT_URL
VITE_SHEETS_API_URL=/api/sheets
```

และทดสอบ

```text
https://<your-domain>/api/sheets
```

ควรได้ JSON ที่มี `ready: true`

---

## 18. Current Build Status

เวอร์ชันนี้ผ่านการตรวจ

```bash
npm run lint
npm run build
```

ก่อน Production Pilot ควรทำ Cross-browser Test อย่างน้อยบน

- Chrome Desktop
- Safari iPhone
- Chrome Android
- Microsoft Edge

---

## 19. Handover Notes

สำหรับผู้รับช่วงต่อ ให้เริ่มอ่านตามลำดับนี้

1. `README.md`
2. `src/campaignConfig.ts`
3. `src/sheetsBackend.ts`
4. `api/sheets.ts`
5. `google-apps-script/Code.gs`
6. `src/components/DashboardView.tsx`
7. `src/components/AdminPortalView.tsx`

กฎสำคัญ

- อย่าเปลี่ยน Header ใน Google Sheets โดยไม่แก้ Apps Script
- อย่าใส่ Admin Password ใน Source Code
- อย่าใช้ Prefix `VITE_` กับ Secret
- อย่าแก้ช่วงวันที่แยกหลาย Component ให้แก้ที่ `campaignConfig.ts`
- ทุกครั้งที่แก้ `Code.gs` ต้อง Deploy Apps Script Version ใหม่
- ก่อน Push ต้องรัน `npm run lint` และ `npm run build`

---

## Recommended Commit

```bash
git commit -m "feat: release step up v2 dashboard and admin enhancement"
```
