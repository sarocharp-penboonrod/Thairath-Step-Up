# Employee Dashboard Ranking Summary — v2.5.8

## Purpose
Bring the same personal ranking contribution logic into the employee Dashboard so employees can see both the selected-month score and all-project score without opening Leaderboard.

## Dashboard additions
- Selected month: **คะแนนก้าวสะสมเดือน...**
- All project: **คะแนนก้าวสะสมทั้งโครงการ**
- Counted verified weekly results
- Average per counted weekly result
- Month-by-month score breakdown through the latest month with data

## Calculation rule
- Count only `AUTO_VERIFIED` and `APPROVED`.
- At most one counted result per campaign month + week-of-month.
- If multiple verified rows exist in the same campaign week, use the latest verified row.
- Sum weekly-average step values directly.

Example:
- W1 = 8,000
- W2 = 9,000
- W3 = 10,000
- W4 = 11,000
- Month ranking score = **38,000**

This is a **ranking score made from weekly-average values**, not the physical total number of steps walked across all days.

## Technical note
`src/rankingSteps.ts` is shared by Employee Dashboard and Employee Leaderboard to reduce calculation drift.

No Google Sheets schema or Apps Script backend change is required.
