# Department Ranking Weekly Sum — v2.5.6

## New scoring rule

Department Ranking now sums every verified weekly-average result directly.

Example:

- Employee A: W1 8,000 + W2 9,000 + W3 10,000 + W4 11,000 = 38,000
- Employee B: W1 6,000 + W2 7,000 + W3 8,000 + W4 9,000 = 30,000
- Department score = 68,000

The system no longer averages W1-W4 per employee before combining employees.

## Duplicate protection

Only one verified result per employee per campaign month/week-of-month is counted in Department Ranking. When multiple verified records exist for the same employee and campaign week, the latest updated/reviewed/submitted record is used.

## Unchanged rules

- BU Ranking remains average-based.
- Participation Ranking remains percentage-based.
- DepartmentMapping and EmployeeRankingOverride continue to control competition grouping.
- Admin sort controls remain display-only and do not redefine the official rank.
