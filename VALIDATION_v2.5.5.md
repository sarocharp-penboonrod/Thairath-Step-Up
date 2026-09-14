# Validation v2.5.5 — Participation Ranking by Percentage

## Scope

ปรับ Admin > Leaderboard > Participation Ranking ให้ Rank จาก Participation % และเพิ่ม Sort control โดยไม่เปลี่ยนข้อมูลต้นทางหรือ Backend

## Ranking rule

1. `participationRate = participantCount / memberCount × 100`
2. Rank มาตรฐานเรียง `participationRate` มาก → น้อย
3. Tie-breaker: `participantCount` มาก → น้อย, `memberCount` มาก → น้อย, ชื่อฝ่าย
4. ตัวอย่าง 4/18 = 22.2% จะอยู่เหนือ 10/100 = 10.0% แม้จำนวนคนดิบจะน้อยกว่า

## Sort behavior

- Default: มาก → น้อย ตาม Participation %
- Toggle: น้อย → มาก
- Sort เป็น Display-only
- เลข `#อันดับ` สร้างจาก Ranking มาตรฐาน (% มาก → น้อย) ก่อน แล้วจึงสลับลำดับแสดงผล

## Regression guard

- Department Step Ranking ยังจัดอันดับจากก้าวรวม
- BU Ranking ยังจัดอันดับจากค่าเฉลี่ยต่อคน
- Participation ยังนับผู้ส่งผลไม่ซ้ำทุกสถานะในช่วง Filter ที่เลือก
- DepartmentMapping / EmployeeRankingOverride ยังทำงานเหมือนเดิม
- ไม่ต้องแก้ Google Sheets หรือ Apps Script

## Validation

- `AdminPortalView.tsx` parse ด้วย TypeScript compiler: 0 parse diagnostics
- ตรวจ state, ranking sort และ JSX ของปุ่ม Sort ใหม่แล้ว
