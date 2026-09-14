import { ActiveUser, DepartmentMappingRule, EmployeeRankingOverride } from './types';

export interface CanonicalDepartment {
  id: string;
  buId: string;
}

function normalize(value?: string): string {
  return String(value || '').trim().toLowerCase();
}

function normalizeBU(value?: string): string {
  return String(value || '').trim().toUpperCase();
}

function ruleKey(sourceBU: string, departmentId: string): string {
  return `${normalizeBU(sourceBU) || '*'}::${normalize(departmentId)}`;
}

export function buildDepartmentResolver(
  users: Array<Pick<ActiveUser, 'departmentId' | 'buId' | 'employeeId' | 'email'>>,
  rules: DepartmentMappingRule[],
  employeeOverrides: EmployeeRankingOverride[] = []
): (departmentId?: string, buId?: string, employeeKey?: string) => CanonicalDepartment {
  void users; // kept in the signature for backwards compatibility with existing callers.

  const activeRules = new Map<string, DepartmentMappingRule>();
  rules.filter((rule) => rule.active !== false).forEach((rule) => {
    const department = String(rule.sourceDepartmentId || '').trim();
    if (!department) return;
    const sourceBU = normalizeBU(rule.sourceBU) || '*';
    activeRules.set(ruleKey(sourceBU, department), rule);
  });

  const overridesByEmployee = new Map<string, EmployeeRankingOverride>();
  employeeOverrides.filter((item) => item.active !== false).forEach((item) => {
    const key = normalize(item.employeeId);
    if (key && String(item.targetDepartmentId || '').trim()) overridesByEmployee.set(key, item);
  });

  const findRule = (departmentId: string, buId: string) => {
    const department = String(departmentId || '').trim();
    const bu = normalizeBU(buId) || 'UNASSIGNED';
    return activeRules.get(ruleKey(bu, department)) || activeRules.get(ruleKey('*', department));
  };

  return (departmentId?: string, buId?: string, employeeKey?: string) => {
    const override = overridesByEmployee.get(normalize(employeeKey));
    const sourceDepartment = String(override?.targetDepartmentId || departmentId || 'UNASSIGNED').trim() || 'UNASSIGNED';
    const sourceBU = normalizeBU(override?.targetBU || buId) || 'UNASSIGNED';
    const rule = findRule(sourceDepartment, sourceBU);

    // Default = DO NOT merge same department names across BU.
    // Cross-BU consolidation only happens when DepartmentMapping explicitly points
    // the source team(s) to the same canonicalDepartmentId + canonicalBU.
    const canonicalDepartment = String(rule?.canonicalDepartmentId || sourceDepartment).trim() || sourceDepartment;
    const canonicalBU = normalizeBU(rule?.canonicalBU) || sourceBU;
    return { id: canonicalDepartment, buId: canonicalBU };
  };
}
