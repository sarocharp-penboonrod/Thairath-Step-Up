# Validation v2.5.2

- Default department grouping key is now `BU + Department`; same names across BU no longer merge implicitly.
- Explicit DepartmentMapping rule changes the canonical department and owner BU.
- Specific sourceBU rule has priority over wildcard `*`.
- EmployeeRankingOverride is applied before DepartmentMapping.
- Department ranking remains based on total of each participant average.
- BU ranking remains average-based and uses actual BU.
- Platform Management explicit owner remains VG3.
- Editorial departments have no explicit mapping and therefore remain split by BU.
