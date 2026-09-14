# v2.5.1 — Manual Ranking Override

## Changes

1. `ฝ่าย Platform Management` canonical owner changed from `TVB` to `VG3` in `DepartmentMapping`.
2. Added `EmployeeRankingOverride` sheet for employee-level ranking reassignment without changing HR source department.
3. Department ranking assignment priority:
   - EmployeeRankingOverride (if active)
   - DepartmentMapping
   - Employee source department / BU
4. BU ranking remains based on the employee's real BU and is not changed by the ranking override.

## EmployeeRankingOverride columns

- `employeeId` — employee ID to reassign
- `targetDepartmentId` — ranking team/department to join
- `targetBU` — optional fallback owner BU; normally leave blank when DepartmentMapping already defines the target team's canonical BU
- `active` — TRUE/FALSE
- `note` — HR/Admin reason
- `updatedBy` — optional audit note
- `updatedAt` — optional audit timestamp

### Example

If employee `123456` is the only person in their HR department but should compete with `ฝ่ายการตลาด`, add:

`123456 | ฝ่ายการตลาด | [blank] | TRUE | รวม Ranking กับฝ่ายการตลาด | Admin | 2026-09-14`

The employee's actual department in `Employees.departmentId` remains unchanged. Department ranking will count the employee under `ฝ่ายการตลาด`; BU ranking remains under the employee's real BU.
