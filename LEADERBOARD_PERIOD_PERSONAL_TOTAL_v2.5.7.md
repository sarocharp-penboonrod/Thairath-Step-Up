# Leaderboard Period + Personal Ranking Total — v2.5.7

## Why this change
Admin and employee leaderboard used the same department ranking formula but could show different totals because they were viewing different periods. The employee leaderboard was tied to the selected campaign month, while Admin could use the all-period filter.

Verified live-data example (2026-09-16):
- Engineering / TVB July: 55,998
- August: 576,334
- September: 274,699
- All-period: 907,031

## v2.5.7 behavior
- Employee Leaderboard defaults to **ภาพรวมโครงการ**.
- Employee can switch between all-period and each campaign month.
- Backend `calculateLeaderboard` accepts either a month number or `all`.
- Login bootstrap leaderboard uses all-period so first render and later refresh use the same default scope.
- Employee view shows the selected period clearly.
- Employee view adds **ก้าวสะสมที่ใช้จัดอันดับของคุณ**.
  - AUTO_VERIFIED + APPROVED only.
  - One latest verified result per campaign month + week-of-month.
  - Sum weekly-average values directly, matching department ranking contribution logic.
- Also shows counted weekly results and average per counted result.

No Google Sheet schema change is required.
