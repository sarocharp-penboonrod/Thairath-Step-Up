# Thairath Step Up & Health Up — v2.5.4

ระบบกิจกรรมสุขภาพสำหรับบันทึก **ค่าเฉลี่ยจำนวนก้าวต่อวันของแต่ละสัปดาห์** พร้อม Screenshot, Tesseract.js OCR, Google Drive Evidence, Approval Workflow, Multi-BU Dashboard และ Leaderboard


## สิ่งที่ปรับใน v2.5.4

- Admin > Leaderboard > **อันดับรายฝ่าย** เพิ่มปุ่ม Sort
- สลับได้ระหว่าง **มาก → น้อย** และ **น้อย → มาก** ตามก้าวรวมของฝ่าย
- ค่าเริ่มต้นยังเป็นมาก → น้อย เพื่อคงนิยาม Ranking มาตรฐาน
- เมื่อเรียงน้อย → มาก เลข `#อันดับ` ยังคงเป็น Rank จริงจากการเรียงมาก → น้อย เพื่อไม่ให้ความหมายของอันดับเปลี่ยน
- Sort เป็น Display-only: ไม่กระทบ Export Ranking, RankingHistory หรือสูตรคำนวณ

## สิ่งที่ปรับใน v2.5.3

- Admin > Leaderboard เพิ่มตาราง **Ranking ฝ่ายที่มีผู้เข้าร่วมมากที่สุด**
- `participantCount` = จำนวนพนักงาน Active ที่ส่งผลอย่างน้อย 1 ครั้งในช่วง Filter ที่เลือก (นับคนไม่ซ้ำ)
- `participationRate` = `participantCount / memberCount × 100` แสดงทศนิยม 1 ตำแหน่ง
- Ranking ตาราง Participation เรียง `participantCount` มากไปน้อย; ถ้าเท่ากันใช้ Participation % เป็น tie-breaker
- Participation นับการส่งทุกสถานะ (รอตรวจ / ผ่าน / ไม่ผ่าน) เพราะวัดการเข้าร่วม ไม่ใช่ผลการตรวจหลักฐาน
- ใช้ DepartmentMapping และ EmployeeRankingOverride ชุดเดียวกับ Department Ranking
- ตัวอย่างจากฐานจริง: ฝ่ายทรัพยากรบุคคล 4/18 คน = **22.2%**

## สิ่งที่ปรับใน v2.5.2

- Department Ranking เปลี่ยนจากค่าเฉลี่ยของพนักงานในฝ่าย เป็น **ผลรวมของค่าเฉลี่ยรายพนักงาน**
- พนักงานยังส่งค่าเฉลี่ยก้าว/วันเหมือนเดิม; ถ้า A = 8,000 และ B = 6,000 ทีมได้ 14,000 ก้าว
- ฝ่ายชื่อเดียวกันแต่คนละ BU **ไม่รวมกันโดยอัตโนมัติ**
- การรวมข้าม BU เกิดเฉพาะรายการที่ Admin กำหนดใน `DepartmentMapping`
- `DepartmentMapping.sourceBU` รองรับ `*` = ทุก BU หรือระบุ BU ต้นทางเพื่อควบคุมเฉพาะจุด
- ค่าเริ่มต้น: ไทยรัฐบันเทิง→TVB, จป./Safety→TR, การตลาด→TVB, Platform Management→VG3, Thairath Creative→VG3
- Admin เพิ่ม Export Ranking CSV และบันทึก Snapshot ลง `RankingHistory`
- BU Ranking ยังใช้ค่าเฉลี่ยต่อคนเหมือนเดิม


## สิ่งที่ปรับใน v2.4

### Data Model และ BU

- เพิ่ม `buId` ต่อท้าย Sheet `Employees`
- ใช้โครงสร้าง `BU → Department → Employee`
- ไม่จำเป็นต้องสร้าง BU Master เพื่อเริ่มใช้งาน ระบบสามารถสร้างตัวกรองจากค่า `buId` ที่พบใน Employees ได้ทันที
- เพิ่ม Snapshot ใน `StepLogs` อัตโนมัติ:
  - `buIdAtSubmission`
  - `departmentIdAtSubmission`
- Snapshot ป้องกันไม่ให้รายงานย้อนหลังเปลี่ยน BU/ฝ่าย เมื่อพนักงานย้ายหน่วยงานภายหลัง

### Login Performance

การ Login พนักงานถูกปรับให้:

1. ค้นหาเฉพาะ Column `employeeId` หรือ `email`
2. อ่านข้อมูลเฉพาะ Row ของพนักงานคนนั้น
3. ส่ง Profile, Logs ส่วนตัว และ Leaderboard ขนาดย่อกลับมาใน Request เดียว
4. Frontend ไม่ยิง Request ชุดเดิมซ้ำทันทีหลัง Login

จึงไม่จำเป็นต้องโหลดฐานพนักงานทั้งหมด 1,000–1,600 คนมาที่ Browser ของพนักงาน

### Submission Window

- เปิดส่งตั้งแต่วันเริ่มต้นของสัปดาห์
- ส่งย้อนหลังได้ถึง 21 วันหลังวันสิ้นสุดของสัปดาห์
- เทียบเท่ากับย้อนหลังได้ไม่เกิน 3 สัปดาห์
- ตัวอย่าง Week 1 ปิดรับเมื่อจบ Week 4
- สัปดาห์อนาคตและสัปดาห์หมดเขตแสดงสีเทา
- ช่องกรอก, Upload และปุ่ม Submit ถูก Disable
- Backend ตรวจ Deadline ซ้ำ ป้องกันการยิง API ข้ามหน้าเว็บ

### Average Step Logic

นิยามมาตรฐานในระบบ:

> ค่าเฉลี่ยจำนวนก้าวต่อวันของสัปดาห์

เป้าหมาย:

> อย่างน้อย 7,000 ก้าว/วัน ในแต่ละสัปดาห์

Dashboard ไม่บวกค่าเฉลี่ยรายสัปดาห์เป็น “ก้าวสะสม” อีกต่อไป แต่แสดง:

- ค่าเฉลี่ยเดือนที่เลือก
- ค่าเฉลี่ยรวมถึงเดือนที่เลือก
- จำนวนสัปดาห์ที่ถึงเป้าหมาย
- Success Rate
- คูปองสะสม
- รายการรอตรวจ

### Coupon Logic

ได้รับ 1 คูปองเมื่อรายการ:

- สถานะ `AUTO_VERIFIED` หรือ `APPROVED`
- ค่าเฉลี่ยอย่างน้อย 7,000 ก้าว/วัน

ข้อความฝั่ง User ใช้คำว่า “ผ่านตรวจแล้ว” แทน Technical Status

### Leaderboard

เพิ่ม 2 มุมมอง:

- อันดับราย BU
- อันดับรายฝ่าย พร้อม BU Filter

สูตรใหม่:

1. เฉลี่ยค่ารายสัปดาห์ของพนักงานแต่ละคนก่อน
2. นำค่าเฉลี่ยรายพนักงานมาเฉลี่ยเป็นทีม

จึงไม่ทำให้พนักงานที่ส่งหลายสัปดาห์มี Weight มากกว่าคนอื่น

### Admin

- BU Filter และ Department Filter ใช้ร่วมกันในทุก Tab
- Evidence, Employees และ Leaderboard ใช้ตัวกรองชุดเดียวกัน
- เพิ่ม BU Column ในฐานพนักงาน
- เพิ่ม BU Leaderboard
- Export Evidence มี BU และ Department
- Font Helper/Status เพิ่มขนาดให้อ่านง่ายขึ้น
- Admin Login ออก HttpOnly Session Cookie อายุ 8 ชั่วโมง
- Admin Action ตรวจ Session ทุก Request
- รองรับ `ADMIN_ALLOWED_BU_IDS` สำหรับจำกัด BU ของบัญชี Admin

## Employees Schema

เก็บ 15 Column เดิมไว้ตำแหน่งเดิม และเพิ่ม `buId` ต่อท้าย:

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
buId
```

### ช่องที่ต้องเพิ่มเอง

สำหรับฐานพนักงานเดิม ต้องกรอกเพิ่มเพียง:

```text
buId
```

ตัวอย่าง:

```text
TRL
TRO
TVB
YOD
```

ใช้ Code ที่องค์กรกำหนดเองได้ ขอเพียงใช้รูปแบบเดียวกันทั้งฐานข้อมูล

`departmentId` ใช้ Column เดิมต่อได้ ไม่ต้องเพิ่มใหม่

## StepLogs Schema

ระบบ Append 2 Column ใหม่ต่อท้ายโดยอัตโนมัติ:

```text
buIdAtSubmission
departmentIdAtSubmission
```

ไม่ต้องกรอกเอง ระบบบันทึกจาก Profile ตอนส่งผล

## Google Apps Script Deployment

1. นำ `google-apps-script/Code.gs` ไปแทน Code เดิม
2. Run `authorizeDriveAccess()` หากยังไม่เคยให้สิทธิ์ Drive
3. Deploy → Manage deployments → Edit
4. เลือก New version
5. ตั้ง:
   - Execute as: Me
   - Who has access: Anyone
6. กด Deploy

### Script Properties

แนะนำให้เพิ่ม:

```text
APP_PROXY_SECRET=<ค่าเดียวกับ Vercel>
```

หากยังไม่พร้อม สามารถเว้น Property นี้ไว้ก่อน ระบบจะทำงานได้ แต่การตั้งค่าจะปลอดภัยกว่า

## Vercel Environment Variables

```text
GOOGLE_APPS_SCRIPT_URL=https://script.google.com/macros/s/.../exec
ADMIN_USERNAME=admin
ADMIN_PASSWORD=<เปลี่ยนรหัสผ่านจริง>
ADMIN_DISPLAY_NAME=Step Up Admin
ADMIN_ALLOWED_BU_IDS=ALL
SESSION_SECRET=<random secret ยาว>
APP_PROXY_SECRET=<ค่าเดียวกับ Apps Script>
```

จำกัด Admin ให้เห็นบาง BU:

```text
ADMIN_ALLOWED_BU_IDS=TRL,TRO
```

บัญชี Admin เดียวจะเห็นเฉพาะ BU ที่กำหนด แต่ถ้าหลายคนใช้ Username เดียวกัน ระบบยังไม่สามารถระบุตัวบุคคลผู้อนุมัติแยกกันได้ ควรแยก Admin Account ในระยะถัดไป หากต้องการ Audit Trail รายบุคคล

## Migration

1. Deploy Apps Script ใหม่
2. เปิด Web App URL `/exec` หนึ่งครั้ง เพื่อให้ Header ใหม่ถูกสร้าง
3. เปิด Sheet `Employees`
4. กรอก `buId` ให้พนักงานทุกคน
5. Deploy Frontend v2.4 บน Vercel
6. ทดสอบ Login พนักงาน
7. ทดสอบ BU Filter ใน Admin
8. ทดสอบ Week ที่เปิดรับและหมดเขต

ไม่จำเป็นต้อง Run `recalculateAllVerifiedTickets()` หากจำนวนคูปองเดิมถูกต้องอยู่แล้ว

ฟังก์ชัน v2.4 ถูกปรับเป็น Batch แล้ว หากจำเป็นต้อง Sync คูปองทั้งหมดจะเร็วกว่าเวอร์ชันเดิม

## Submission Deadline

กำหนดในสองไฟล์เพื่อป้องกันทั้ง Frontend และ Backend:

```text
src/campaignConfig.ts
google-apps-script/Code.gs
```

ค่าปัจจุบัน:

```text
SUBMISSION_GRACE_DAYS = 21
```

หากเปลี่ยนเป็น 14 วัน ต้องแก้ทั้งสองไฟล์ให้ตรงกัน

## Verification Status

| Status | ความหมาย | นำไปคำนวณ |
|---|---|---|
| AUTO_VERIFIED | OCR อ่านตรงและผ่านเกณฑ์ | ใช่ |
| NEEDS_REVIEW | รอ Admin ตรวจ | ไม่ใช่ |
| APPROVED | Admin อนุมัติ | ใช่ |
| REJECTED | ไม่ผ่านการตรวจ | ไม่ใช่ |

## Build Commands

```bash
npm ci
npm run lint
npm run build
```

Node.js แนะนำ: `22.x`

## v2.4.3 Mobile OCR

- OCR reads the original mobile image instead of the 1,600px upload copy.
- Portrait screenshots use a high-resolution full pass plus two broad upper/centre crop passes.
- The Google Drive upload remains compressed.
- The entered step value only boosts a candidate when OCR actually detects that number.
- No paid OCR service or additional environment variable is required.

