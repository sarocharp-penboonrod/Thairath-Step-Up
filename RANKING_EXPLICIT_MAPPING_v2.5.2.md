# v2.5.2 — Explicit Department Consolidation

## Rule
- Department ranking remains TOTAL-based.
- Same department names across different BUs are separate teams by default.
- Cross-BU consolidation happens only through `DepartmentMapping`.

## DepartmentMapping columns
`sourceBU | sourceDepartmentId | canonicalDepartmentId | canonicalBU | active | note`

- `sourceBU = *` applies the rule to that department from every BU.
- A specific `sourceBU` applies only to that BU.
- Rows with `active = FALSE` are ignored.
- Multiple source rows can point to the same canonical department + canonical BU to merge differently named departments.

## Examples
- `* | ฝ่ายไทยรัฐบันเทิง | ฝ่ายไทยรัฐบันเทิง | TVB | TRUE` => merge entertainment from all BU into TVB.
- No mapping for editorial => editorial remains separated by its actual BU.
- `TVB | ฝ่าย X | ฝ่ายกลาง | TR | TRUE` plus `VG3 | ฝ่าย Y | ฝ่ายกลาง | TR | TRUE` => merge only those two source teams.

## Priority
EmployeeRankingOverride > DepartmentMapping (specific BU first, then `*`) > actual HR department/BU.
