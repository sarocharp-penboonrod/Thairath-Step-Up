# Validation v2.5.3 — Department Participation Ranking

## Scope

เพิ่มตาราง Admin > Leaderboard สำหรับจัดอันดับฝ่ายตามจำนวนพนักงานที่ส่งผลเข้าร่วมกิจกรรม

## Formula

- `memberCount` = พนักงานสถานะ Active ในทีม Ranking หลังผ่าน EmployeeRankingOverride + DepartmentMapping
- `participantCount` = จำนวนพนักงานไม่ซ้ำที่มี StepLog อย่างน้อย 1 รายการในช่วง Month/Week Filter ที่เลือก
- `participationRate` = `(participantCount / memberCount) × 100` แสดง 1 decimal
- Sort = participantCount DESC → participationRate DESC → memberCount DESC → department name

## Evidence status rule

Participation วัดพฤติกรรมการส่งผล จึงนับ StepLog ทุกสถานะที่ยังมีอยู่ในฐาน รวม NEEDS_REVIEW, AUTO_VERIFIED, APPROVED และ REJECTED. การลบรายการออกจากฐานจะไม่ถูกนับ

## Live database spot check — 2026-09-14

Google Sheet `Database_Thairath-Step-Run`:

- Employees ที่ `departmentId = ฝ่ายทรัพยากรบุคคล` = 18 คน
- StepLogs เดือน 3 มีผู้ส่งไม่ซ้ำ = 4 คน (`007750`, `007812`, `003909`, `007639`)
- Participation = 4 / 18 × 100 = 22.222...% → **22.2%**

## UI

ตารางแสดง Rank / ฝ่าย / BU / ส่งผล-ทั้งหมด / Participation % พร้อม progress bar และใช้ Filter เดิมของ Admin ทุกตัว

## Syntax check

`AdminPortalView.tsx` ผ่าน TypeScript `transpileModule` syntax check. Full `npm run lint/build` ยังไม่เป็น final gate ใน environment นี้เพราะ dependency install ไม่ครบ
