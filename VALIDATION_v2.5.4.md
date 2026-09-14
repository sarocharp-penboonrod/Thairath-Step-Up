# Validation v2.5.4 — Department Ranking Sort

## Scope

เพิ่ม Sort control ที่ Admin > Leaderboard > อันดับรายฝ่าย โดยไม่เปลี่ยนสูตร Ranking หรือข้อมูล Snapshot/Export

## Behavior

- Default: `DESC` = ก้าวรวมมาก → น้อย
- Toggle: `ASC` = ก้าวรวมน้อย → มาก
- ค่าที่ใช้ sort = `totalSteps` ของ Department Ranking
- Tie-breaker ใช้ participationRate และชื่อฝ่ายตามทิศทางที่กำหนด
- เลข Rank จริงสร้างจาก Department Ranking มาตรฐาน (DESC) ก่อน แล้วค่อยเปลี่ยนลำดับแสดงผล
- Export Ranking และ RankingHistory ยังคงใช้ Department Ranking มาตรฐาน DESC

## Regression guard

- ไม่เปลี่ยน BU Ranking
- ไม่เปลี่ยน Participation Ranking
- ไม่เปลี่ยน DepartmentMapping / EmployeeRankingOverride
- ไม่ต้องแก้ Google Sheets หรือ Apps Script
