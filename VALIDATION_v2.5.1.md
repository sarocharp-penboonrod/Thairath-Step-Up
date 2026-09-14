# Validation v2.5.1

## Scope
- Platform Management canonical owner changed to VG3.
- Added EmployeeRankingOverride for employee-level department ranking reassignment.
- Override affects Department Ranking only; BU Ranking remains based on the employee's actual BU.

## Resolution priority
1. EmployeeRankingOverride (active row)
2. DepartmentMapping
3. Employee source department / BU

## Validation checks
- Google Apps Script JavaScript syntax check: PASS.
- TS/TSX syntax parsing of changed source files: PASS (module/type-resolution build not completed in this environment because dependency installation was incomplete).
- DepartmentMapping source sheet updated: Platform Management -> VG3.
- EmployeeRankingOverride sheet created with headers, guidance notes, and active checkbox validation.

## Deployment note
Deploy the updated `google-apps-script/Code.gs` and the v2.5.1 frontend/API bundle before expecting the live application to use employee overrides.
