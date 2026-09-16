# Validation v2.5.6 — Weekly-Average Sum Department Ranking

## Rule
Department score = sum of each employee's verified weekly-average result in the selected period.

Example:
- Employee A: 8,000 + 9,000 + 10,000 + 11,000 = 38,000
- Employee B: 6,000 + 7,000 + 8,000 + 9,000 = 30,000
- Department = 68,000

The system does not average A's four weeks before adding B.

## Duplicate guard
At most one verified result per employee per campaign month/week-of-month is counted in Department Ranking. If duplicates exist, the latest verified record wins.

## Unchanged
- BU Ranking remains average-based.
- Participation Ranking remains percentage-based.
- DepartmentMapping and EmployeeRankingOverride remain unchanged.
- Admin sort controls remain display-only.
