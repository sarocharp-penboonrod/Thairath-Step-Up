import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  ArrowUpDown,
  Building2,
  CheckCircle2,
  Download,
  ExternalLink,
  Eye,
  FileCheck2,
  FileSpreadsheet,
  Footprints,
  RefreshCw,
  Search,
  Save,
  ShieldAlert,
  Trash2,
  Trophy,
  UserPlus,
  Users,
  XCircle
} from 'lucide-react';
import {
  adminCreateUserOrUpdateProfile,
  deleteUserLog,
  fetchAllStepLogs,
  fetchAllUsers,
  fetchDepartmentMapping,
  fetchEmployeeRankingOverrides,
  reviewUserLog,
  saveRankingSnapshot
} from '../sheetsBackend';
import {
  ActiveUser,
  DepartmentInfo,
  DepartmentMappingRule,
  EmployeeRankingOverride,
  RankingSnapshotRow,
  StepLog,
  VerificationStatus,
  isVerifiedStatus
} from '../types';
import { buildDepartmentResolver } from '../departmentGrouping';
import { CAMPAIGN_MONTHS, CAMPAIGN_WEEKLY_TARGET, getCampaignMonth, getDefaultCampaignMonth } from '../campaignConfig';

interface AdminPortalViewProps {
  departments: DepartmentInfo[];
  onExit: () => void;
}

interface AdminUser extends ActiveUser {
  id?: string;
  status?: string;
  rawDepartmentId?: string;
  rawBuId?: string;
}

interface AdminLog extends StepLog {
  userEmail: string;
  employeeId?: string;
}

type AdminTab = 'employees' | 'evidence' | 'leaderboard';

const DATABASE_URL = 'https://docs.google.com/spreadsheets/d/1YgxxKpP74EkzfzAJn2wnTXamrYJ9-aBZsKwcBo7v3Dk/edit';
const STATUS_META: Record<VerificationStatus, { label: string; className: string }> = {
  AUTO_VERIFIED: { label: 'ผ่านอัตโนมัติ', className: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  NEEDS_REVIEW: { label: 'รอตรวจ', className: 'bg-amber-50 text-amber-700 border-amber-200' },
  APPROVED: { label: 'อนุมัติแล้ว', className: 'bg-blue-50 text-blue-700 border-blue-200' },
  REJECTED: { label: 'ไม่ผ่าน', className: 'bg-rose-50 text-rose-700 border-rose-200' }
};

function normalize(value?: string): string { return String(value || '').trim().toLowerCase(); }
function average(values: number[]): number { return values.length ? Math.round(values.reduce((sum, value) => sum + value, 0) / values.length) : 0; }
function displayName(user?: AdminUser | null): string {
  if (!user) return '';
  const name = String(user.name || '').trim();
  const surname = String(user.surname || user.Surename || '').trim();
  return surname && !normalize(name).endsWith(normalize(surname)) ? `${name} ${surname}`.trim() : name;
}
function formatDateTime(value?: string, empty = 'ยังไม่มีข้อมูล'): string {
  if (!value) return empty;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('th-TH', { timeZone: 'Asia/Bangkok', year: 'numeric', month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false });
}
function csvCell(value: unknown): string { return `"${String(value ?? '').replace(/"/g, '""')}"`; }
function downloadCsv(filename: string, rows: unknown[][]) {
  const content = `\uFEFF${rows.map((row) => row.map(csvCell).join(',')).join('\n')}`;
  const url = URL.createObjectURL(new Blob([content], { type: 'text/csv;charset=utf-8;' }));
  const link = document.createElement('a'); link.href = url; link.download = filename; document.body.appendChild(link); link.click(); link.remove(); URL.revokeObjectURL(url);
}
function thumbnail(log: AdminLog): string { return log.imageFileId ? `https://drive.google.com/thumbnail?id=${encodeURIComponent(log.imageFileId)}&sz=w600` : ''; }
function departmentScopeValue(buId?: string, departmentId?: string): string {
  return `${buId || 'UNASSIGNED'}::${departmentId || 'UNASSIGNED'}`;
}

export default function AdminPortalView({ departments: fallbackDepartments, onExit }: AdminPortalViewProps) {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [logs, setLogs] = useState<AdminLog[]>([]);
  const [departmentMapping, setDepartmentMapping] = useState<DepartmentMappingRule[]>([]);
  const [employeeRankingOverrides, setEmployeeRankingOverrides] = useState<EmployeeRankingOverride[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [activeTab, setActiveTab] = useState<AdminTab>('evidence');
  const [monthFilter, setMonthFilter] = useState(String(getDefaultCampaignMonth()));
  const [weekFilter, setWeekFilter] = useState('all');
  const [buFilter, setBuFilter] = useState('all');
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [searchText, setSearchText] = useState('');
  const [verificationFilter, setVerificationFilter] = useState<'all' | VerificationStatus>('NEEDS_REVIEW');
  const [reviewingId, setReviewingId] = useState('');
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [newEmployee, setNewEmployee] = useState({ id: '', name: '', surname: '', nickname: '', buId: '', departmentId: '', birthDate: '' });
  const [newEmployeeError, setNewEmployeeError] = useState('');
  const [isSavingUser, setIsSavingUser] = useState(false);
  const [isSavingRanking, setIsSavingRanking] = useState(false);
  const [departmentSortDirection, setDepartmentSortDirection] = useState<'desc' | 'asc'>('desc');

  const loadAdminData = async () => {
    setIsLoading(true); setLoadError('');
    try {
      const [allUsers, allLogs, mapping, overrides] = await Promise.all([
        fetchAllUsers(),
        fetchAllStepLogs(),
        fetchDepartmentMapping(),
        fetchEmployeeRankingOverrides()
      ]);
      setUsers(allUsers as AdminUser[]);
      setLogs(allLogs as AdminLog[]);
      setDepartmentMapping(mapping);
      setEmployeeRankingOverrides(overrides);
    } catch (error: any) {
      setLoadError(error?.message || 'ไม่สามารถโหลดข้อมูล Admin ได้');
    } finally { setIsLoading(false); }
  };
  useEffect(() => { void loadAdminData(); }, []);

  const buIds = useMemo(() => Array.from(new Set(users.map((user) => user.buId || 'UNASSIGNED'))).sort((a, b) => a.localeCompare(b, 'th')), [users]);
  const departmentCatalog = useMemo(() => {
    const map = new Map<string, { id: string; buId: string; name: string }>();
    users.forEach((user) => {
      const buId = user.buId || 'UNASSIGNED';
      const departmentId = user.departmentId || 'UNASSIGNED';
      map.set(`${buId}::${departmentId}`, { id: departmentId, buId, name: departmentId });
    });
    departmentMapping.forEach((rule) => {
      const buId = rule.canonicalBU || 'UNASSIGNED';
      const id = rule.canonicalDepartmentId || rule.sourceDepartmentId;
      const key = `${buId}::${id}`;
      if (id && !map.has(key)) map.set(key, { id, buId, name: id });
    });
    employeeRankingOverrides.filter((item) => item.active !== false).forEach((item) => {
      const id = item.targetDepartmentId || 'UNASSIGNED';
      const targetBU = item.targetBU || 'UNASSIGNED';
      const matchedRule = departmentMapping.find((rule) => normalize(rule.sourceDepartmentId) === normalize(id) && (!rule.sourceBU || rule.sourceBU === '*' || normalize(rule.sourceBU) === normalize(targetBU)));
      const buId = item.targetBU || matchedRule?.canonicalBU || 'UNASSIGNED';
      const key = `${buId}::${id}`;
      if (!map.has(key)) map.set(key, { id, buId, name: id });
    });
    fallbackDepartments.forEach((department) => {
      const buId = department.buId || 'UNASSIGNED';
      const key = `${buId}::${department.id}`;
      if (!map.has(key)) map.set(key, { id: department.id, buId, name: department.nameTh });
    });
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name, 'th'));
  }, [users, fallbackDepartments, departmentMapping, employeeRankingOverrides]);
  const visibleDepartments = departmentCatalog.filter((department) => buFilter === 'all' || department.buId === buFilter);

  const usersByKey = useMemo(() => {
    const map = new Map<string, AdminUser>();
    users.forEach((user) => { map.set(normalize(user.employeeId), user); map.set(normalize(user.email), user); });
    return map;
  }, [users]);
  const findUser = (log: AdminLog) => usersByKey.get(normalize(log.employeeId)) || usersByKey.get(normalize(log.userEmail));
  const logBU = (log: AdminLog) => log.buIdAtSubmission || findUser(log)?.buId || 'UNASSIGNED';
  const logDepartment = (log: AdminLog) => log.departmentIdAtSubmission || findUser(log)?.departmentId || 'UNASSIGNED';
  const resolveDepartment = useMemo(
    () => buildDepartmentResolver(users, departmentMapping, employeeRankingOverrides),
    [users, departmentMapping, employeeRankingOverrides]
  );

  const periodLogs = useMemo(() => logs.filter((log) => {
    const monthMatches = monthFilter === 'all' || Number(log.week) === Number(monthFilter);
    const weekMatches = weekFilter === 'all' || Number(log.weekOfMonth) === Number(weekFilter);
    return monthMatches && weekMatches;
  }), [logs, monthFilter, weekFilter]);

  const scopedLogs = useMemo(() => periodLogs.filter((log) => {
    if (buFilter !== 'all' && logBU(log) !== buFilter) return false;
    if (departmentFilter !== 'all' && departmentScopeValue(logBU(log), logDepartment(log)) !== departmentFilter) return false;
    const search = normalize(searchText);
    if (!search) return true;
    const user = findUser(log);
    return [log.employeeId, log.userEmail, log.imageName, user?.name, user?.nickname, logBU(log), logDepartment(log)].some((value) => normalize(value).includes(search));
  }), [periodLogs, buFilter, departmentFilter, searchText, usersByKey]);

  const filteredEvidence = useMemo(() => scopedLogs.filter((log) =>
    verificationFilter === 'all' || log.verificationStatus === verificationFilter
  ), [scopedLogs, verificationFilter]);

  const filteredUsers = useMemo(() => users.filter((user) => {
    if (buFilter !== 'all' && user.buId !== buFilter) return false;
    if (departmentFilter !== 'all' && departmentScopeValue(user.buId, user.departmentId) !== departmentFilter) return false;
    const search = normalize(searchText);
    return !search || [user.employeeId, user.email, user.name, user.nickname, displayName(user), user.buId, user.departmentId].some((value) => normalize(value).includes(search));
  }), [users, buFilter, departmentFilter, searchText]);

  const verifiedFilteredLogs = scopedLogs.filter((log) => isVerifiedStatus(log.verificationStatus));
  const participantAverages = useMemo(() => {
    const values = new Map<string, number[]>();
    verifiedFilteredLogs.forEach((log) => {
      const key = normalize(log.employeeId || log.userEmail);
      values.set(key, [...(values.get(key) || []), Number(log.steps) || 0]);
    });
    return Array.from(values.values()).map(average);
  }, [verifiedFilteredLogs]);
  const pendingCount = scopedLogs.filter((log) => log.verificationStatus === 'NEEDS_REVIEW').length;

  type AdminRankingRow = {
    id: string;
    buId: string;
    memberCount: number;
    participantCount: number;
    participationRate: number;
    averageSteps: number;
    totalSteps: number;
  };

  const buildRanking = (mode: 'bu' | 'department'): AdminRankingRow[] => {
    const groups = new Map<string, {
      id: string;
      buId: string;
      memberIds: Set<string>;
      participantValues: Map<string, number[]>;
    }>();

    users.filter((user) => normalize(user.status || 'Active') === 'active').forEach((user) => {
      const rawBU = user.buId || 'UNASSIGNED';
      const group = mode === 'bu'
        ? { id: rawBU, buId: rawBU }
        : resolveDepartment(user.departmentId, rawBU, user.employeeId || user.email);
      const key = mode === 'bu' ? group.id : `${normalize(group.buId)}::${normalize(group.id)}`;
      if (!groups.has(key)) {
        groups.set(key, { id: group.id || 'UNASSIGNED', buId: group.buId || 'UNASSIGNED', memberIds: new Set(), participantValues: new Map() });
      }
      groups.get(key)!.memberIds.add(normalize(user.employeeId || user.email));
    });

    periodLogs.filter((log) => isVerifiedStatus(log.verificationStatus)).forEach((log) => {
      const rawBU = logBU(log);
      const group = mode === 'bu'
        ? { id: rawBU, buId: rawBU }
        : resolveDepartment(logDepartment(log), rawBU, findUser(log)?.employeeId || log.employeeId || log.userEmail);
      const key = mode === 'bu' ? group.id : `${normalize(group.buId)}::${normalize(group.id)}`;
      if (!groups.has(key)) {
        groups.set(key, { id: group.id || 'UNASSIGNED', buId: group.buId || 'UNASSIGNED', memberIds: new Set(), participantValues: new Map() });
      }
      const employeeKey = normalize(log.employeeId || log.userEmail);
      const values = groups.get(key)!.participantValues.get(employeeKey) || [];
      values.push(Number(log.steps) || 0);
      groups.get(key)!.participantValues.set(employeeKey, values);
    });

    const selectedCanonicalDepartment = departmentFilter === 'all'
      ? null
      : (() => {
          const [rawBU, ...rawDepartmentParts] = departmentFilter.split('::');
          return resolveDepartment(rawDepartmentParts.join('::'), rawBU);
        })();

    const search = normalize(searchText);
    return Array.from(groups.values()).map((group) => {
      const employeeAverages = Array.from(group.participantValues.values()).map(average).filter((value) => value > 0);
      return {
        id: group.id,
        buId: group.buId,
        memberCount: group.memberIds.size,
        participantCount: employeeAverages.length,
        participationRate: group.memberIds.size ? Math.round(employeeAverages.length / group.memberIds.size * 100) : 0,
        averageSteps: average(employeeAverages),
        totalSteps: employeeAverages.reduce((sum, value) => sum + value, 0)
      };
    }).filter((row) => {
      if (buFilter !== 'all' && row.buId !== buFilter) return false;
      if (mode === 'department' && selectedCanonicalDepartment && (normalize(row.id) !== normalize(selectedCanonicalDepartment.id) || normalize(row.buId) !== normalize(selectedCanonicalDepartment.buId))) return false;
      if (mode === 'bu' && selectedCanonicalDepartment && row.buId !== selectedCanonicalDepartment.buId) return false;
      if (search && ![row.id, row.buId].some((value) => normalize(value).includes(search))) return false;
      return true;
    }).sort((a, b) => {
      if (mode === 'department') {
        return b.totalSteps - a.totalSteps || b.participationRate - a.participationRate || a.id.localeCompare(b.id, 'th');
      }
      return b.averageSteps - a.averageSteps || b.participationRate - a.participationRate || a.id.localeCompare(b.id, 'th');
    });
  };
  const buRanking = useMemo(
    () => buildRanking('bu'),
    [users, periodLogs, buFilter, departmentFilter, searchText, resolveDepartment, usersByKey, employeeRankingOverrides]
  );
  const departmentRanking = useMemo(
    () => buildRanking('department'),
    [users, periodLogs, buFilter, departmentFilter, searchText, resolveDepartment, usersByKey, employeeRankingOverrides]
  );
  const displayedDepartmentRanking = useMemo(() => {
    const ranked = departmentRanking.map((row, index) => ({ ...row, rank: index + 1 }));
    return [...ranked].sort((a, b) => {
      if (departmentSortDirection === 'asc') {
        return a.totalSteps - b.totalSteps || a.participationRate - b.participationRate || a.id.localeCompare(b.id, 'th');
      }
      return b.totalSteps - a.totalSteps || b.participationRate - a.participationRate || a.id.localeCompare(b.id, 'th');
    });
  }, [departmentRanking, departmentSortDirection]);

  const participationRanking = useMemo(() => {
    const groups = new Map<string, {
      id: string;
      buId: string;
      memberIds: Set<string>;
      participantIds: Set<string>;
    }>();

    users.filter((user) => normalize(user.status || 'Active') === 'active').forEach((user) => {
      const rawBU = user.buId || 'UNASSIGNED';
      const group = resolveDepartment(user.departmentId, rawBU, user.employeeId || user.email);
      const key = `${normalize(group.buId)}::${normalize(group.id)}`;
      if (!groups.has(key)) {
        groups.set(key, {
          id: group.id || 'UNASSIGNED',
          buId: group.buId || 'UNASSIGNED',
          memberIds: new Set(),
          participantIds: new Set()
        });
      }
      groups.get(key)!.memberIds.add(normalize(user.employeeId || user.email));
    });

    // Participation = submitted at least once in the selected period.
    // It intentionally counts all submission statuses (pending / verified / rejected),
    // because this table measures participation behavior, not evidence quality.
    periodLogs.forEach((log) => {
      const user = findUser(log);
      const employeeKey = normalize(user?.employeeId || log.employeeId || log.userEmail);
      if (!employeeKey) return;
      const rawBU = logBU(log);
      const group = resolveDepartment(logDepartment(log), rawBU, user?.employeeId || log.employeeId || log.userEmail);
      const key = `${normalize(group.buId)}::${normalize(group.id)}`;
      const target = groups.get(key);
      if (!target || !target.memberIds.has(employeeKey)) return;
      target.participantIds.add(employeeKey);
    });

    const selectedCanonicalDepartment = departmentFilter === 'all'
      ? null
      : (() => {
          const [rawBU, ...rawDepartmentParts] = departmentFilter.split('::');
          return resolveDepartment(rawDepartmentParts.join('::'), rawBU);
        })();
    const search = normalize(searchText);

    return Array.from(groups.values()).map((group) => {
      const memberCount = group.memberIds.size;
      const participantCount = group.participantIds.size;
      return {
        id: group.id,
        buId: group.buId,
        memberCount,
        participantCount,
        participationRate: memberCount ? Number(((participantCount / memberCount) * 100).toFixed(1)) : 0
      };
    }).filter((row) => {
      if (buFilter !== 'all' && row.buId !== buFilter) return false;
      if (selectedCanonicalDepartment && (normalize(row.id) !== normalize(selectedCanonicalDepartment.id) || normalize(row.buId) !== normalize(selectedCanonicalDepartment.buId))) return false;
      if (search && ![row.id, row.buId].some((value) => normalize(value).includes(search))) return false;
      return true;
    }).sort((a, b) =>
      b.participantCount - a.participantCount ||
      b.participationRate - a.participationRate ||
      b.memberCount - a.memberCount ||
      a.id.localeCompare(b.id, 'th')
    );
  }, [users, periodLogs, buFilter, departmentFilter, searchText, resolveDepartment, usersByKey, employeeRankingOverrides]);

  const handleReview = async (log: AdminLog, status: 'APPROVED' | 'REJECTED') => {
    const note = status === 'REJECTED' ? window.prompt('ระบุเหตุผลที่ไม่อนุมัติหลักฐาน', log.reviewNote || '') : window.prompt('หมายเหตุการอนุมัติ (เว้นว่างได้)', log.reviewNote || '');
    if (note === null) return;
    setReviewingId(log.id);
    try {
      const updated = await reviewUserLog(log.id, status, note);
      setLogs((previous) => previous.map((item) => item.id === updated.id ? { ...item, ...updated } : item));
      setUsers(await fetchAllUsers() as AdminUser[]);
    } catch (error: any) { window.alert(error?.message || 'ไม่สามารถอัปเดตผลตรวจได้'); }
    finally { setReviewingId(''); }
  };

  const handleDelete = async (log: AdminLog) => {
    if (!window.confirm('ยืนยันลบรายการและย้ายไฟล์หลักฐานไปถังขยะใน Google Drive?')) return;
    try { await deleteUserLog(log.id); await loadAdminData(); }
    catch (error: any) { window.alert(error?.message || 'ไม่สามารถลบรายการได้'); }
  };

  const handleAddEmployee = async (event: React.FormEvent) => {
    event.preventDefault(); setNewEmployeeError('');
    if (!(/^\d{6}$/.test(newEmployee.id) || /^[A-Z][A-Z0-9]{1,11}$/i.test(newEmployee.id))) return setNewEmployeeError('รหัสพนักงานไม่ถูกต้อง');
    if (![newEmployee.name, newEmployee.surname, newEmployee.nickname, newEmployee.departmentId, newEmployee.birthDate].every((value) => value.trim())) return setNewEmployeeError('กรุณากรอกข้อมูลให้ครบ');
    setIsSavingUser(true);
    try {
      await adminCreateUserOrUpdateProfile(newEmployee.id, {
        employeeId: newEmployee.id,
        email: `${newEmployee.id}@thairathgroup.com`,
        name: newEmployee.name.trim(),
        surname: newEmployee.surname.trim(),
        nickname: newEmployee.nickname.trim(),
        buId: newEmployee.buId.trim(),
        departmentId: newEmployee.departmentId.trim(),
        weekTarget: CAMPAIGN_WEEKLY_TARGET,
        totalTickets: 0,
        dateOfBirth: newEmployee.birthDate
      });
      setShowAddUserModal(false);
      setNewEmployee({ id: '', name: '', surname: '', nickname: '', buId: '', departmentId: '', birthDate: '' });
      await loadAdminData();
    } catch (error: any) { setNewEmployeeError(error?.message || 'ไม่สามารถเพิ่มพนักงานได้'); }
    finally { setIsSavingUser(false); }
  };

  const exportEvidence = () => downloadCsv(`thairath_step_up_evidence_${new Date().toISOString().slice(0, 10)}.csv`, [
    ['เดือน', 'สัปดาห์', 'BU', 'ฝ่าย', 'รหัสพนักงาน', 'ชื่อ', 'ค่าเฉลี่ยที่กรอก', 'OCR', 'Confidence', 'สถานะ', 'หลักฐาน', 'หมายเหตุ', 'เวลาส่ง'],
    ...filteredEvidence.map((log) => { const user = findUser(log); return [getCampaignMonth(Number(log.week)).label, log.weekOfMonth, logBU(log), logDepartment(log), log.employeeId, displayName(user), log.steps, log.ocrSteps || '', log.ocrConfidence || 0, log.verificationStatus, log.imageUrl, log.reviewNote || '', formatDateTime(log.submittedAt)]; })
  ]);

  const selectedPeriod = monthFilter === 'all' ? 'ทั้งโครงการ' : `${getCampaignMonth(Number(monthFilter)).label}${weekFilter === 'all' ? '' : ` · สัปดาห์ที่ ${weekFilter}`}`;

  const rankingSnapshotRows = useMemo<RankingSnapshotRow[]>(() => [
    ...buRanking.map((row, index) => ({
      rankingType: 'BU' as const,
      rank: index + 1,
      buId: row.buId,
      memberCount: row.memberCount,
      participantCount: row.participantCount,
      participationRate: row.participationRate,
      totalSteps: row.totalSteps,
      averageStepsPerPerson: row.averageSteps,
      metricUsed: 'AVERAGE_STEPS_PER_PERSON' as const
    })),
    ...departmentRanking.map((row, index) => ({
      rankingType: 'DEPARTMENT' as const,
      rank: index + 1,
      buId: row.buId,
      departmentId: row.id,
      memberCount: row.memberCount,
      participantCount: row.participantCount,
      participationRate: row.participationRate,
      totalSteps: row.totalSteps,
      averageStepsPerPerson: row.averageSteps,
      metricUsed: 'TOTAL_STEPS' as const
    }))
  ], [buRanking, departmentRanking]);

  const exportRanking = () => downloadCsv(`thairath_step_up_ranking_${new Date().toISOString().slice(0, 10)}.csv`, [
    ['ช่วงข้อมูล', 'ประเภท Ranking', 'อันดับ', 'BU', 'ฝ่าย', 'สมาชิก', 'ผู้เข้าร่วม', 'Participation %', 'ก้าวรวม', 'ค่าเฉลี่ยต่อคน', 'เกณฑ์จัดอันดับ'],
    ...rankingSnapshotRows.map((row) => [
      selectedPeriod,
      row.rankingType,
      row.rank,
      row.buId,
      row.departmentId || '',
      row.memberCount,
      row.participantCount,
      row.participationRate,
      row.totalSteps,
      row.averageStepsPerPerson,
      row.metricUsed
    ])
  ]);

  const handleSaveRanking = async () => {
    if (!rankingSnapshotRows.length) return window.alert('ยังไม่มีข้อมูล Ranking สำหรับบันทึก');
    setIsSavingRanking(true);
    try {
      const result = await saveRankingSnapshot({
        periodLabel: selectedPeriod,
        monthFilter,
        weekFilter,
        rows: rankingSnapshotRows
      });
      window.alert(`บันทึก Ranking ลง Google Sheets แล้ว ${result.rowsSaved} แถว\nSnapshot: ${result.snapshotId}`);
    } catch (error: any) {
      window.alert(error?.message || 'ไม่สามารถบันทึก Ranking ลง Google Sheets ได้');
    } finally {
      setIsSavingRanking(false);
    }
  };

  const cards = [
    { label: 'พนักงานในตัวกรอง', value: filteredUsers.length, suffix: 'คน', helper: buFilter === 'all' ? 'ทุก BU' : `BU ${buFilter}`, icon: Users, className: 'bg-emerald-50 text-[#00914E]' },
    { label: 'ผ่านตรวจแล้ว', value: verifiedFilteredLogs.length, suffix: 'รายการ', helper: selectedPeriod, icon: FileCheck2, className: 'bg-blue-50 text-blue-600' },
    { label: 'รอตรวจ', value: pendingCount, suffix: 'รายการ', helper: 'ยังไม่ถูกนำไปคำนวณ', icon: ShieldAlert, className: 'bg-amber-50 text-amber-600' },
    { label: 'ค่าเฉลี่ยที่ผ่านตรวจ', value: average(participantAverages), suffix: 'ก้าว/วัน', helper: `${participantAverages.length} ผู้เข้าร่วม`, icon: Footprints, className: 'bg-violet-50 text-violet-600' }
  ];

  return (
    <div className="min-h-screen bg-[#F2F4F7] text-[#344054] font-sans pb-24">
      <header className="bg-black text-white sticky top-0 z-40 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 md:px-6 py-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3"><button onClick={onExit} className="p-2 rounded-lg bg-white/10 hover:bg-white/20 cursor-pointer"><ArrowLeft className="w-5 h-5" /></button><div><p className="font-black text-lg">Thairath Step Up Admin</p><p className="text-xs text-slate-400">BU Management · Evidence Verification · v2.5.2</p></div></div>
          <div className="flex gap-2"><a href={DATABASE_URL} target="_blank" rel="noreferrer" className="bg-white/10 hover:bg-white/20 px-3 py-2 rounded-lg text-sm font-bold flex items-center gap-2"><FileSpreadsheet className="w-4 h-4" />ฐานข้อมูล<ExternalLink className="w-3 h-3" /></a><button onClick={() => void loadAdminData()} className="bg-[#00914E] hover:bg-[#00703c] px-3 py-2 rounded-lg text-sm font-bold flex items-center gap-2 cursor-pointer"><RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />Refresh</button></div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 md:px-6 py-6 space-y-6">
        {loadError && <div className="bg-rose-50 border border-rose-200 text-rose-700 p-4 rounded-xl text-sm font-bold">{loadError}</div>}
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">{cards.map((card) => <article key={card.label} className="bg-white rounded-2xl border border-slate-200 p-4 md:p-5 shadow-sm"><div className={`w-10 h-10 rounded-xl flex items-center justify-center ${card.className}`}><card.icon className="w-5 h-5" /></div><p className="text-xs text-slate-500 font-bold mt-3">{card.label}</p><p className="text-2xl md:text-3xl font-black text-black mt-1">{card.value}<span className="text-xs ml-1 text-slate-500">{card.suffix}</span></p><p className="text-xs text-slate-400 mt-1">{card.helper}</p></article>)}</section>

        <section className="bg-white rounded-2xl border border-slate-200 p-4 flex flex-wrap gap-3 items-center sticky top-[76px] z-30 shadow-sm">
          <select value={buFilter} onChange={(event) => { setBuFilter(event.target.value); setDepartmentFilter('all'); }} className="filter-input"><option value="all">ทุก BU</option>{buIds.map((bu) => <option key={bu} value={bu}>{bu}</option>)}</select>
          <select value={departmentFilter} onChange={(event) => setDepartmentFilter(event.target.value)} className="filter-input max-w-[230px]"><option value="all">ทุกฝ่าย</option>{visibleDepartments.map((department) => <option key={`${department.buId}:${department.id}`} value={departmentScopeValue(department.buId, department.id)}>{department.name}</option>)}</select>
          <select value={monthFilter} onChange={(event) => { setMonthFilter(event.target.value); setWeekFilter('all'); }} className="filter-input"><option value="all">ทุกเดือน</option>{CAMPAIGN_MONTHS.map((month) => <option key={month.number} value={month.number}>{month.label}</option>)}</select>
          <select value={weekFilter} onChange={(event) => setWeekFilter(event.target.value)} className="filter-input"><option value="all">ทุกสัปดาห์</option>{monthFilter !== 'all' && getCampaignMonth(Number(monthFilter)).weeks.map((week) => <option key={week.number} value={week.number}>{week.label}</option>)}</select>
          <div className="relative flex-1 min-w-[220px]"><Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><input value={searchText} onChange={(event) => setSearchText(event.target.value)} placeholder={activeTab === 'leaderboard' ? 'ค้นหา BU หรือฝ่าย' : 'ค้นหารหัส ชื่อ ชื่อเล่น ฝ่าย หรือไฟล์'} className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2.5 text-sm font-semibold outline-none focus:border-[#00914E]" /></div>
        </section>

        <nav className="flex gap-2 overflow-x-auto">{([['evidence', `ตรวจหลักฐาน (${pendingCount})`, ShieldAlert], ['employees', `พนักงาน (${filteredUsers.length})`, Users], ['leaderboard', 'Leaderboard', Trophy]] as const).map(([id, label, Icon]) => <button key={id} onClick={() => setActiveTab(id)} className={`px-4 py-2.5 rounded-xl text-sm font-black flex items-center gap-2 whitespace-nowrap cursor-pointer ${activeTab === id ? 'bg-black text-white' : 'bg-white border border-slate-200 text-slate-600'}`}><Icon className="w-4 h-4" />{label}</button>)}</nav>

        {activeTab === 'evidence' && (
          <section className="space-y-4">
            <div className="bg-white rounded-2xl border border-slate-200 p-4 flex flex-wrap items-center justify-between gap-3"><div className="flex flex-wrap gap-2">{(['NEEDS_REVIEW', 'AUTO_VERIFIED', 'APPROVED', 'REJECTED', 'all'] as const).map((status) => <button key={status} onClick={() => setVerificationFilter(status)} className={`px-3 py-2 rounded-lg text-xs font-black border cursor-pointer ${verificationFilter === status ? 'bg-black text-white border-black' : 'bg-white text-slate-600 border-slate-200'}`}>{status === 'all' ? 'ทั้งหมด' : STATUS_META[status].label}</button>)}</div><button onClick={exportEvidence} className="px-3 py-2 rounded-lg bg-slate-100 text-sm font-bold flex items-center gap-2 cursor-pointer"><Download className="w-4 h-4" />Export</button></div>
            {isLoading ? <Loading /> : filteredEvidence.length === 0 ? <Empty text="ไม่พบหลักฐานตามตัวกรอง" /> : <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">{filteredEvidence.map((log) => { const user = findUser(log); const exact = Number(log.ocrSteps) === Number(log.steps) && Number(log.ocrSteps) > 0; const status = STATUS_META[log.verificationStatus]; return <article key={log.id} className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm"><div className="grid grid-cols-1 sm:grid-cols-[190px_1fr] min-h-[270px]"><div className="bg-slate-100 flex items-center justify-center p-3">{thumbnail(log) ? <img src={thumbnail(log)} alt="Evidence" className="w-full h-52 object-contain bg-white rounded-xl border border-slate-200" referrerPolicy="no-referrer" /> : <div className="text-slate-400 text-sm font-bold">ไม่มี Preview</div>}</div><div className="p-5 space-y-4"><div className="flex items-start justify-between gap-3"><div><p className="font-black text-black">{displayName(user) || log.userEmail}</p><p className="text-xs text-slate-400 mt-1">{log.employeeId} · BU {logBU(log)} · {logDepartment(log)}</p></div><span className={`px-2.5 py-1 rounded-full border text-xs font-black ${status.className}`}>{status.label}</span></div><div className="grid grid-cols-2 gap-2"><DataBox label="ค่าเฉลี่ยที่กรอก" value={Number(log.steps).toLocaleString()} /><DataBox label={`OCR · ${log.ocrConfidence || 0}%`} value={log.ocrSteps?.toLocaleString() || 'อ่านไม่พบ'} className={exact ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'} /></div><div className="text-xs text-slate-500 space-y-1"><p>{getCampaignMonth(Number(log.week)).label} · สัปดาห์ที่ {log.weekOfMonth}</p><p>ส่งเมื่อ {formatDateTime(log.submittedAt)}</p>{log.reviewNote && <p className="text-rose-600">หมายเหตุ: {log.reviewNote}</p>}</div><div className="flex flex-wrap gap-2 items-center">{log.imageUrl && <a href={log.imageUrl} target="_blank" rel="noreferrer" className="action-secondary"><Eye className="w-4 h-4" />เปิดรูปเต็ม</a>}{log.verificationStatus === 'NEEDS_REVIEW' ? <><button disabled={reviewingId === log.id} onClick={() => void handleReview(log, 'APPROVED')} className="action-approve"><CheckCircle2 className="w-4 h-4" />Approve</button><button disabled={reviewingId === log.id} onClick={() => void handleReview(log, 'REJECTED')} className="action-reject"><XCircle className="w-4 h-4" />Reject</button></> : <span className={`px-3 py-2 rounded-lg text-xs font-black ${log.verificationStatus === 'AUTO_VERIFIED' ? 'bg-emerald-50 text-emerald-700' : log.verificationStatus === 'APPROVED' ? 'bg-blue-50 text-blue-700' : 'bg-rose-50 text-rose-700'}`}>{log.verificationStatus === 'AUTO_VERIFIED' ? 'ผ่านอัตโนมัติแล้ว · ไม่ต้องกด Approve' : log.verificationStatus === 'APPROVED' ? 'Admin อนุมัติแล้ว' : 'รายการไม่ผ่านการตรวจ'}</span>}<button onClick={() => void handleDelete(log)} className="ml-auto p-2 rounded-lg bg-rose-50 text-rose-600 cursor-pointer"><Trash2 className="w-4 h-4" /></button></div></div></div></article>; })}</div>}
          </section>
        )}

        {activeTab === 'employees' && (
          <section className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm"><div className="p-4 border-b border-slate-200 flex items-center justify-between"><div><h3 className="font-black text-black">ฐานพนักงาน</h3><p className="text-xs text-slate-400 mt-1">BU และฝ่ายใช้ Filter และ Snapshot รายการส่งผล</p></div><button onClick={() => setShowAddUserModal(true)} className="bg-[#00914E] text-white px-3 py-2 rounded-lg text-sm font-bold flex items-center gap-2 cursor-pointer"><UserPlus className="w-4 h-4" />เพิ่มพนักงาน</button></div><div className="overflow-x-auto"><table className="w-full min-w-[1050px] text-sm"><thead><tr className="bg-slate-50 text-slate-500"><th className="p-4 text-left">รหัส</th><th className="p-4 text-left">ชื่อ</th><th className="p-4 text-left">BU</th><th className="p-4 text-left">ฝ่าย</th><th className="p-4 text-left">Login ล่าสุด</th><th className="p-4 text-left">ส่งล่าสุด</th><th className="p-4 text-center">คูปอง</th></tr></thead><tbody className="divide-y divide-slate-100">{filteredUsers.map((user) => <tr key={user.employeeId} className="hover:bg-slate-50"><td className="p-4 font-black text-[#00914E]">{user.employeeId}</td><td className="p-4"><p className="font-bold text-black">{displayName(user)}</p><p className="text-xs text-slate-400">{user.nickname}</p></td><td className="p-4 font-bold">{user.buId}</td><td className="p-4 font-bold text-slate-600">{user.departmentId}</td><td className="p-4 text-xs">{formatDateTime(user.lastLoginAt)}</td><td className="p-4 text-xs">{formatDateTime(user.lastSubmitAt)}</td><td className="p-4 text-center"><span className="bg-amber-50 text-amber-700 px-3 py-1 rounded-full font-black">{user.totalTickets || 0} ใบ</span></td></tr>)}</tbody></table></div></section>
        )}

        {activeTab === 'leaderboard' && (
          <section className="space-y-4">
            <div className="bg-white rounded-2xl border border-slate-200 p-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-black text-black">Ranking · {selectedPeriod}</p>
                <p className="text-xs text-slate-400 mt-1">BU ใช้ค่าเฉลี่ยต่อคน · ฝ่ายใช้ผลรวมค่าเฉลี่ยรายพนักงาน · ข้าม BU เฉพาะที่กำหนดใน DepartmentMapping</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button onClick={exportRanking} className="px-3 py-2 rounded-lg bg-slate-100 text-sm font-bold flex items-center gap-2 cursor-pointer">
                  <Download className="w-4 h-4" />Export Ranking
                </button>
                <button disabled={isSavingRanking} onClick={() => void handleSaveRanking()} className="px-3 py-2 rounded-lg bg-[#00914E] text-white text-sm font-bold flex items-center gap-2 cursor-pointer disabled:opacity-50">
                  <Save className="w-4 h-4" />{isSavingRanking ? 'กำลังบันทึก...' : 'บันทึกลง Google Sheets'}
                </button>
              </div>
            </div>
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
              <RankingCard title="อันดับราย BU" icon={<Building2 className="w-5 h-5 text-[#00914E]" />} rows={buRanking} showBU={false} metric="average" />
              <RankingCard
                title="อันดับรายฝ่าย"
                icon={<Trophy className="w-5 h-5 text-[#00914E]" />}
                rows={displayedDepartmentRanking}
                showBU
                metric="total"
                sortControl={
                  <button
                    type="button"
                    onClick={() => setDepartmentSortDirection((current) => current === 'desc' ? 'asc' : 'desc')}
                    className="px-3 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center gap-2 cursor-pointer transition-colors"
                    title="สลับการเรียงก้าวรวมของฝ่าย"
                  >
                    <ArrowUpDown className="w-4 h-4" />
                    {departmentSortDirection === 'desc' ? 'มาก → น้อย' : 'น้อย → มาก'}
                  </button>
                }
              />
            </div>

            <article className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-5 border-b border-slate-200 flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="font-black text-black flex items-center gap-2"><Users className="w-5 h-5 text-[#00914E]" />Ranking ฝ่ายที่มีผู้เข้าร่วมมากที่สุด</h3>
                  <p className="text-xs text-slate-400 mt-1">นับพนักงานที่ส่งผลอย่างน้อย 1 ครั้งในช่วงที่เลือก ÷ พนักงาน Active ทั้งหมดในทีม · เรียงจากจำนวนผู้ส่งมากที่สุด</p>
                </div>
                <span className="text-xs font-bold text-slate-500 bg-slate-100 px-3 py-2 rounded-lg">{participationRanking.length} ฝ่าย</span>
              </div>
              <div className="overflow-x-auto max-h-[560px]">
                <table className="w-full min-w-[760px] text-sm">
                  <thead className="sticky top-0 z-10 bg-slate-50 text-slate-500">
                    <tr>
                      <th className="p-4 text-center w-20">อันดับ</th>
                      <th className="p-4 text-left">ฝ่าย</th>
                      <th className="p-4 text-left w-24">BU</th>
                      <th className="p-4 text-center w-36">ส่งผล / ทั้งหมด</th>
                      <th className="p-4 text-right w-40">Participation</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {participationRanking.map((row, index) => (
                      <tr key={`participation:${row.buId}:${row.id}`} className="hover:bg-slate-50">
                        <td className="p-4 text-center font-black text-slate-500">#{index + 1}</td>
                        <td className="p-4"><p className="font-bold text-black">{row.id}</p></td>
                        <td className="p-4 font-bold text-slate-500">{row.buId}</td>
                        <td className="p-4 text-center"><span className="font-black text-black">{row.participantCount}</span><span className="text-slate-400"> / {row.memberCount} คน</span></td>
                        <td className="p-4">
                          <div className="flex items-center justify-end gap-3">
                            <div className="w-24 h-2 rounded-full bg-slate-100 overflow-hidden"><div className="h-full bg-[#00914E] rounded-full" style={{ width: `${Math.min(100, row.participationRate)}%` }} /></div>
                            <span className="w-14 text-right font-black text-[#00914E]">{row.participationRate.toFixed(1)}%</span>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {participationRanking.length === 0 && <tr><td colSpan={5} className="p-10 text-center text-slate-400 font-bold">ยังไม่มีข้อมูลการเข้าร่วม</td></tr>}
                  </tbody>
                </table>
              </div>
            </article>
          </section>
        )}
      </main>

      {showAddUserModal && <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4"><form onSubmit={handleAddEmployee} className="bg-white rounded-2xl p-6 w-full max-w-xl space-y-4 shadow-2xl"><div className="flex justify-between"><div><h3 className="text-xl font-black text-black">เพิ่มพนักงาน</h3><p className="text-sm text-slate-500 mt-1">กรอก BU ID และฝ่ายตามฐานข้อมูลจริง</p></div><button type="button" onClick={() => setShowAddUserModal(false)} className="text-slate-400 cursor-pointer"><XCircle /></button></div>{newEmployeeError && <div className="bg-rose-50 text-rose-700 p-3 rounded-xl text-sm font-bold">{newEmployeeError}</div>}<div className="grid grid-cols-1 sm:grid-cols-2 gap-3"><ModalInput label="รหัสพนักงาน" value={newEmployee.id} onChange={(value) => setNewEmployee({ ...newEmployee, id: value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 12) })} /><ModalInput label="วันเกิด" type="date" value={newEmployee.birthDate} onChange={(value) => setNewEmployee({ ...newEmployee, birthDate: value })} /><ModalInput label="ชื่อ" value={newEmployee.name} onChange={(value) => setNewEmployee({ ...newEmployee, name: value })} /><ModalInput label="นามสกุล" value={newEmployee.surname} onChange={(value) => setNewEmployee({ ...newEmployee, surname: value })} /><ModalInput label="ชื่อเล่น" value={newEmployee.nickname} onChange={(value) => setNewEmployee({ ...newEmployee, nickname: value })} /><ModalInput label="BU ID (เว้นว่างเพื่อคำนวณอัตโนมัติ)" value={newEmployee.buId} onChange={(value) => setNewEmployee({ ...newEmployee, buId: value })} /><div className="sm:col-span-2"><ModalInput label="ฝ่าย / Department ID" value={newEmployee.departmentId} onChange={(value) => setNewEmployee({ ...newEmployee, departmentId: value })} /></div></div><div className="flex gap-2 pt-2"><button type="button" onClick={() => setShowAddUserModal(false)} className="flex-1 bg-slate-100 py-3 rounded-xl font-bold cursor-pointer">ยกเลิก</button><button disabled={isSavingUser} type="submit" className="flex-1 bg-[#00914E] text-white py-3 rounded-xl font-black cursor-pointer disabled:opacity-50">{isSavingUser ? 'กำลังบันทึก...' : 'บันทึกพนักงาน'}</button></div></form></div>}
    </div>
  );
}

function Loading() { return <div className="bg-white rounded-2xl p-16 text-center"><RefreshCw className="w-7 h-7 animate-spin mx-auto text-[#00914E]" /></div>; }
function Empty({ text }: { text: string }) { return <div className="bg-white rounded-2xl p-16 text-center text-slate-400 text-sm font-bold">{text}</div>; }
function DataBox({ label, value, className = 'bg-slate-50 text-black' }: { label: string; value: string; className?: string }) { return <div className={`rounded-xl p-3 ${className}`}><p className="text-xs text-slate-500 font-bold">{label}</p><p className="text-xl font-black mt-1">{value}</p></div>; }
function ModalInput({ label, value, onChange, type = 'text' }: { label: string; value: string; onChange: (value: string) => void; type?: string }) { return <label className="block text-sm font-bold text-slate-600">{label}<input type={type} value={value} onChange={(event) => onChange(event.target.value)} className="w-full mt-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-3 text-sm outline-none focus:border-[#00914E]" required /></label>; }
function RankingCard({ title, icon, rows, showBU, metric, sortControl }: { title: string; icon: React.ReactNode; rows: Array<{ id: string; buId: string; memberCount: number; participantCount: number; participationRate: number; averageSteps: number; totalSteps: number; rank?: number }>; showBU: boolean; metric: 'average' | 'total'; sortControl?: React.ReactNode }) { return <article className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm"><div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="font-black text-black flex items-center gap-2">{icon}{title}</h3><p className="text-xs text-slate-400 mt-1">{metric === 'total' ? 'จัดอันดับจากผลรวมค่าเฉลี่ยรายพนักงานที่ผ่านตรวจ' : 'จัดอันดับจากค่าเฉลี่ยรายพนักงานที่ผ่านตรวจ'}</p></div>{sortControl}</div><div className="space-y-3 mt-5">{rows.map((row, index) => <div key={`${row.buId}:${row.id}`} className="flex justify-between gap-3 bg-slate-50 rounded-xl p-3"><div><p className="font-bold text-black text-sm">#{row.rank ?? index + 1} {row.id}</p><p className="text-xs text-slate-400 mt-1">{showBU ? `BU ${row.buId} · ` : ''}{row.participantCount}/{row.memberCount} คน · {row.participationRate}%</p></div><div className="text-right"><p className="font-black text-[#00914E] text-sm">{(metric === 'total' ? row.totalSteps : row.averageSteps).toLocaleString()}</p><p className="text-xs text-slate-400">{metric === 'total' ? 'ก้าวรวม' : 'ก้าว/วัน'}</p>{metric === 'total' && <p className="text-[10px] text-slate-400 mt-1">เฉลี่ย {row.averageSteps.toLocaleString()}/คน</p>}</div></div>)}{rows.length === 0 && <p className="text-sm text-slate-400 text-center py-8">ยังไม่มีข้อมูล</p>}</div></article>; }
