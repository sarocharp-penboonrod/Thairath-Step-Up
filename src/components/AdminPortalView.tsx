import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  Building,
  CheckCircle2,
  Download,
  ExternalLink,
  Eye,
  FileCheck2,
  FileSpreadsheet,
  Footprints,
  RefreshCw,
  Search,
  ShieldAlert,
  Trash2,
  Trophy,
  UserPlus,
  Users,
  UserX,
  XCircle
} from 'lucide-react';
import {
  createUserOrUpdateProfile,
  deleteUserLog,
  fetchAllStepLogs,
  fetchAllUsers,
  reviewUserLog
} from '../sheetsBackend';
import { ActiveUser, DepartmentInfo, StepLog, VerificationStatus, isVerifiedStatus } from '../types';
import { CAMPAIGN_MONTHS, CAMPAIGN_WEEKLY_TARGET, getCampaignMonth, getDefaultCampaignMonth } from '../campaignConfig';

interface AdminPortalViewProps {
  departments: DepartmentInfo[];
  onExit: () => void;
}

interface AdminUser extends ActiveUser {
  id?: string;
  status?: string;
  rawDepartmentId?: string;
  departmentName?: string;
}

interface AdminLog extends StepLog {
  userEmail: string;
  employeeId?: string;
}

type AdminTab = 'employees' | 'evidence' | 'leaderboard';

const DATABASE_URL = 'https://docs.google.com/spreadsheets/d/1YgxxKpP74EkzfzAJn2wnTXamrYJ9-aBZsKwcBo7v3Dk/edit';

const STATUS_META: Record<VerificationStatus, { label: string; className: string }> = {
  AUTO_VERIFIED: { label: 'Auto Verified', className: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  NEEDS_REVIEW: { label: 'Needs Review', className: 'bg-amber-50 text-amber-700 border-amber-200' },
  APPROVED: { label: 'Approved', className: 'bg-blue-50 text-blue-700 border-blue-200' },
  REJECTED: { label: 'Rejected', className: 'bg-rose-50 text-rose-700 border-rose-200' }
};

function normalizeText(value?: string): string {
  return String(value || '').trim().toLowerCase();
}

function normalizeDeptKey(value?: string): string {
  return normalizeText(value).replace(/^ฝ่าย\s*/i, '').replace(/\s+/g, ' ');
}

function getDisplayName(user?: Pick<AdminUser, 'name' | 'surname' | 'Surename'> | null): string {
  if (!user) return '';
  const name = String(user.name || '').trim();
  const surname = String(user.surname || user.Surename || '').trim();
  if (!surname || normalizeText(name).endsWith(normalizeText(surname))) return name;
  return [name, surname].filter(Boolean).join(' ');
}

function formatDateTime(value?: string, emptyText = 'ยังไม่มีข้อมูล') {
  if (!value) return emptyText;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('th-TH', {
    year: 'numeric', month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false
  });
}

function csvCell(value: unknown): string {
  return `"${String(value ?? '').replace(/"/g, '""')}"`;
}

function downloadCsv(filename: string, rows: unknown[][]) {
  const content = `\uFEFF${rows.map((row) => row.map(csvCell).join(',')).join('\n')}`;
  const url = URL.createObjectURL(new Blob([content], { type: 'text/csv;charset=utf-8;' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function evidenceThumbnail(log: AdminLog): string {
  return log.imageFileId ? `https://drive.google.com/thumbnail?id=${encodeURIComponent(log.imageFileId)}&sz=w600` : '';
}

export default function AdminPortalView({ departments, onExit }: AdminPortalViewProps) {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [logs, setLogs] = useState<AdminLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [activeTab, setActiveTab] = useState<AdminTab>('evidence');
  const [monthFilter, setMonthFilter] = useState(String(getDefaultCampaignMonth()));
  const [weekFilter, setWeekFilter] = useState('all');
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [searchText, setSearchText] = useState('');
  const [verificationFilter, setVerificationFilter] = useState<'all' | VerificationStatus>('NEEDS_REVIEW');
  const [reviewingId, setReviewingId] = useState('');

  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [newEmployee, setNewEmployee] = useState({ id: '', name: '', surname: '', nickname: '', departmentId: departments[0]?.id || '', birthDate: '' });
  const [newEmployeeError, setNewEmployeeError] = useState('');
  const [isSavingUser, setIsSavingUser] = useState(false);

  const loadAdminData = async () => {
    setIsLoading(true);
    setLoadError('');
    try {
      const [allUsers, allLogs] = await Promise.all([fetchAllUsers(), fetchAllStepLogs()]);
      setUsers(allUsers as AdminUser[]);
      setLogs(allLogs as AdminLog[]);
    } catch (error: any) {
      setLoadError(error?.message || 'ไม่สามารถโหลดข้อมูล Admin ได้');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadAdminData();
  }, []);

  const allDepartments = useMemo(() => {
    const map = new Map<string, DepartmentInfo>();
    departments.forEach((department) => map.set(normalizeDeptKey(department.id), department));
    users.forEach((user) => {
      const raw = String(user.departmentId || user.departmentName || user.rawDepartmentId || '').trim();
      if (!raw || map.has(normalizeDeptKey(raw))) return;
      map.set(normalizeDeptKey(raw), {
        id: raw,
        nameTh: user.departmentName || raw,
        nameEn: user.departmentName || raw,
        participationRate: 0,
        averageStepsPerPerson: 0,
        status: 'stable',
        statusText: 'ข้อมูลจาก Google Sheets'
      });
    });
    return Array.from(map.values()).sort((a, b) => a.nameTh.localeCompare(b.nameTh, 'th'));
  }, [departments, users]);

  const resolveDepartment = (departmentId?: string) => {
    const key = normalizeDeptKey(departmentId);
    return allDepartments.find((department) =>
      [department.id, department.nameTh, department.nameEn].some((value) => normalizeDeptKey(value) === key)
    );
  };

  const findUserForLog = (log: AdminLog) => users.find((user) =>
    (log.employeeId && normalizeText(user.employeeId) === normalizeText(log.employeeId)) ||
    (log.userEmail && normalizeText(user.email) === normalizeText(log.userEmail))
  );

  const periodLogs = useMemo(() => logs.filter((log) => {
    const monthMatches = monthFilter === 'all' || Number(log.week) === Number(monthFilter);
    const weekMatches = weekFilter === 'all' || Number(log.weekOfMonth) === Number(weekFilter);
    return monthMatches && weekMatches;
  }), [logs, monthFilter, weekFilter]);

  const verifiedPeriodLogs = useMemo(() => periodLogs.filter((log) => isVerifiedStatus(log.verificationStatus)), [periodLogs]);
  const activeUsers = users.filter((user) => normalizeText(user.status || 'Active') === 'active');

  const filteredEvidence = useMemo(() => periodLogs.filter((log) => {
    if (verificationFilter !== 'all' && log.verificationStatus !== verificationFilter) return false;
    const user = findUserForLog(log);
    if (departmentFilter !== 'all' && normalizeDeptKey(resolveDepartment(user?.departmentId)?.id || user?.departmentId) !== normalizeDeptKey(departmentFilter)) return false;
    const search = normalizeText(searchText);
    if (!search) return true;
    return [log.employeeId, log.userEmail, log.imageName, user?.name, user?.nickname]
      .some((value) => normalizeText(value).includes(search));
  }), [periodLogs, verificationFilter, departmentFilter, searchText, users, allDepartments]);

  const filteredUsers = useMemo(() => users.filter((user) => {
    const search = normalizeText(searchText);
    const searchMatches = !search || [user.employeeId, user.email, user.name, user.nickname, getDisplayName(user)]
      .some((value) => normalizeText(value).includes(search));
    const departmentMatches = departmentFilter === 'all' || normalizeDeptKey(resolveDepartment(user.departmentId)?.id || user.departmentId) === normalizeDeptKey(departmentFilter);
    return searchMatches && departmentMatches;
  }), [users, searchText, departmentFilter, allDepartments]);

  const participantKeys = new Set(verifiedPeriodLogs.map((log) => normalizeText(log.employeeId || log.userEmail)));
  const submittedEmployees = activeUsers.filter((user) => participantKeys.has(normalizeText(user.employeeId)) || participantKeys.has(normalizeText(user.email))).length;
  const participationRate = activeUsers.length ? Math.round((submittedEmployees / activeUsers.length) * 100) : 0;
  const totalVerifiedSteps = verifiedPeriodLogs.reduce((sum, log) => sum + Number(log.steps || 0), 0);
  const pendingCount = periodLogs.filter((log) => log.verificationStatus === 'NEEDS_REVIEW').length;

  const departmentLeaderboard = useMemo(() => allDepartments.map((department) => {
    const departmentUsers = activeUsers.filter((user) => normalizeDeptKey(resolveDepartment(user.departmentId)?.id || user.departmentId) === normalizeDeptKey(department.id));
    const keys = new Set(departmentUsers.flatMap((user) => [normalizeText(user.employeeId), normalizeText(user.email)]));
    const departmentLogs = verifiedPeriodLogs.filter((log) => keys.has(normalizeText(log.employeeId)) || keys.has(normalizeText(log.userEmail)));
    const participants = new Set(departmentLogs.map((log) => normalizeText(log.employeeId || log.userEmail))).size;
    const totalSteps = departmentLogs.reduce((sum, log) => sum + Number(log.steps || 0), 0);
    return {
      ...department,
      memberCount: departmentUsers.length,
      participantCount: participants,
      totalSteps,
      participationRate: departmentUsers.length ? Math.round((participants / departmentUsers.length) * 100) : 0,
      averageSteps: participants ? Math.round(totalSteps / participants) : 0
    };
  }).filter((department) => department.memberCount > 0).sort((a, b) => b.totalSteps - a.totalSteps), [allDepartments, activeUsers, verifiedPeriodLogs]);

  const topWalkers = useMemo(() => {
    const totals = new Map<string, number>();
    verifiedPeriodLogs.forEach((log) => {
      const key = normalizeText(log.employeeId || log.userEmail);
      totals.set(key, (totals.get(key) || 0) + Number(log.steps || 0));
    });
    return Array.from(totals.entries()).map(([key, steps]) => ({
      user: users.find((user) => normalizeText(user.employeeId) === key || normalizeText(user.email) === key),
      steps
    })).filter((item) => item.user).sort((a, b) => b.steps - a.steps).slice(0, 10);
  }, [verifiedPeriodLogs, users]);

  const selectedPeriodLabel = monthFilter === 'all'
    ? 'ทั้งโครงการ'
    : `${getCampaignMonth(Number(monthFilter)).label}${weekFilter === 'all' ? '' : ` · สัปดาห์ที่ ${weekFilter}`}`;

  const handleReview = async (log: AdminLog, nextStatus: 'APPROVED' | 'REJECTED') => {
    const note = nextStatus === 'REJECTED'
      ? window.prompt('ระบุเหตุผลที่ไม่อนุมัติหลักฐาน', log.reviewNote || '')
      : window.prompt('หมายเหตุการอนุมัติ (เว้นว่างได้)', log.reviewNote || '');
    if (note === null) return;
    setReviewingId(log.id);
    try {
      const updated = await reviewUserLog(log.id, nextStatus, note, 'Admin');
      setLogs((previous) => previous.map((item) => item.id === updated.id ? { ...item, ...updated } : item));
      const refreshedUsers = await fetchAllUsers();
      setUsers(refreshedUsers as AdminUser[]);
    } catch (error: any) {
      window.alert(error?.message || 'ไม่สามารถอัปเดตผลตรวจได้');
    } finally {
      setReviewingId('');
    }
  };

  const handleDelete = async (log: AdminLog) => {
    if (!window.confirm('ยืนยันลบรายการและย้ายไฟล์หลักฐานไปถังขยะใน Google Drive?')) return;
    try {
      await deleteUserLog(log.id);
      await loadAdminData();
    } catch (error: any) {
      window.alert(error?.message || 'ไม่สามารถลบรายการได้');
    }
  };

  const handleAddEmployee = async (event: React.FormEvent) => {
    event.preventDefault();
    setNewEmployeeError('');
    if (!/^\d{6}$/.test(newEmployee.id)) return setNewEmployeeError('รหัสพนักงานต้องเป็นตัวเลข 6 หลัก');
    if (!newEmployee.name.trim() || !newEmployee.surname.trim() || !newEmployee.nickname.trim() || !newEmployee.birthDate) return setNewEmployeeError('กรุณากรอกข้อมูลให้ครบ');
    setIsSavingUser(true);
    try {
      await createUserOrUpdateProfile(newEmployee.id, {
        employeeId: newEmployee.id,
        email: `${newEmployee.id}@thairathgroup.com`,
        name: newEmployee.name.trim(),
        surname: newEmployee.surname.trim(),
        nickname: newEmployee.nickname.trim(),
        departmentId: newEmployee.departmentId || allDepartments[0]?.id || '',
        weekTarget: CAMPAIGN_WEEKLY_TARGET,
        totalTickets: 0,
        dateOfBirth: newEmployee.birthDate
      });
      setShowAddUserModal(false);
      setNewEmployee({ id: '', name: '', surname: '', nickname: '', departmentId: allDepartments[0]?.id || '', birthDate: '' });
      await loadAdminData();
    } catch (error: any) {
      setNewEmployeeError(error?.message || 'ไม่สามารถเพิ่มพนักงานได้');
    } finally {
      setIsSavingUser(false);
    }
  };

  const exportEvidence = () => {
    downloadCsv(`thairath_step_up_evidence_${new Date().toISOString().slice(0, 10)}.csv`, [
      ['เดือน', 'สัปดาห์', 'รหัสพนักงาน', 'ชื่อ', 'ฝ่าย', 'ยอดกรอก', 'OCR', 'OCR Confidence', 'สถานะ', 'หลักฐาน', 'หมายเหตุ', 'เวลาส่ง'],
      ...filteredEvidence.map((log) => {
        const user = findUserForLog(log);
        return [getCampaignMonth(Number(log.week)).label, log.weekOfMonth, log.employeeId, getDisplayName(user), resolveDepartment(user?.departmentId)?.nameTh || user?.departmentId, log.steps, log.ocrSteps || '', log.ocrConfidence || 0, log.verificationStatus, log.imageUrl, log.reviewNote || '', formatDateTime(log.submittedAt)];
      })
    ]);
  };

  const metricCards = [
    { label: 'พนักงาน Active', value: activeUsers.length, suffix: 'คน', helper: 'ฐานพนักงาน', icon: Users, className: 'bg-emerald-50 text-[#00914E]' },
    { label: 'ผ่านตรวจแล้ว', value: verifiedPeriodLogs.length, suffix: 'รายการ', helper: selectedPeriodLabel, icon: FileCheck2, className: 'bg-blue-50 text-blue-600' },
    { label: 'รอตรวจ', value: pendingCount, suffix: 'รายการ', helper: 'ยังไม่นับผล', icon: ShieldAlert, className: 'bg-amber-50 text-amber-600' },
    { label: 'Participation', value: participationRate, suffix: '%', helper: `${totalVerifiedSteps.toLocaleString()} ก้าวที่ผ่านตรวจ`, icon: Footprints, className: 'bg-violet-50 text-violet-600' }
  ];

  return (
    <div className="min-h-screen bg-[#F2F4F7] text-[#344054] font-sans pb-24">
      <header className="bg-black text-white sticky top-0 z-40 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 md:px-6 py-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button onClick={onExit} className="p-2 rounded-lg bg-white/10 hover:bg-white/20 cursor-pointer"><ArrowLeft className="w-5 h-5" /></button>
            <div><p className="font-black text-lg">Thairath Step Up Admin</p><p className="text-[10px] text-slate-400">Evidence Verification · OCR v2.3</p></div>
          </div>
          <div className="flex gap-2">
            <a href={DATABASE_URL} target="_blank" rel="noreferrer" className="bg-white/10 hover:bg-white/20 px-3 py-2 rounded-lg text-xs font-bold flex items-center gap-2"><FileSpreadsheet className="w-4 h-4" />Google Sheets<ExternalLink className="w-3 h-3" /></a>
            <button onClick={() => void loadAdminData()} className="bg-[#00914E] hover:bg-[#00703c] px-3 py-2 rounded-lg text-xs font-bold flex items-center gap-2 cursor-pointer"><RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />Refresh</button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 md:px-6 py-6 space-y-6">
        {loadError && <div className="bg-rose-50 border border-rose-200 text-rose-700 p-4 rounded-xl text-xs font-bold">{loadError}</div>}

        <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {metricCards.map((card) => <article key={card.label} className="bg-white rounded-2xl border border-slate-200 p-4 md:p-5 shadow-xs"><div className={`w-9 h-9 rounded-xl flex items-center justify-center ${card.className}`}><card.icon className="w-5 h-5" /></div><p className="text-[10px] text-slate-400 font-bold mt-3">{card.label}</p><p className="text-2xl md:text-3xl font-black text-black mt-1">{card.value}<span className="text-xs ml-1 text-slate-500">{card.suffix}</span></p><p className="text-[9px] text-slate-400 mt-1">{card.helper}</p></article>)}
        </section>

        <section className="bg-white rounded-2xl border border-slate-200 p-4 flex flex-wrap gap-3 items-center">
          <select value={monthFilter} onChange={(event) => { setMonthFilter(event.target.value); setWeekFilter('all'); }} className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-bold">
            <option value="all">ทุกเดือน</option>{CAMPAIGN_MONTHS.map((month) => <option key={month.number} value={month.number}>{month.label}</option>)}
          </select>
          <select value={weekFilter} onChange={(event) => setWeekFilter(event.target.value)} className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-bold">
            <option value="all">ทุกสัปดาห์</option>{monthFilter !== 'all' && getCampaignMonth(Number(monthFilter)).weeks.map((week) => <option key={week.number} value={week.number}>{week.label}</option>)}
          </select>
          <select value={departmentFilter} onChange={(event) => setDepartmentFilter(event.target.value)} className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-bold max-w-[240px]">
            <option value="all">ทุกฝ่าย</option>{allDepartments.map((department) => <option key={department.id} value={department.id}>{department.nameTh}</option>)}
          </select>
          <div className="relative flex-1 min-w-[220px]"><Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><input value={searchText} onChange={(event) => setSearchText(event.target.value)} placeholder="ค้นหารหัส ชื่อ ชื่อเล่น หรือไฟล์" className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2.5 text-xs font-bold outline-none focus:border-[#00914E]" /></div>
        </section>

        <nav className="flex gap-2 overflow-x-auto">
          {([
            ['evidence', `ตรวจหลักฐาน (${pendingCount})`, ShieldAlert],
            ['employees', `พนักงาน (${filteredUsers.length})`, Users],
            ['leaderboard', 'Leaderboard', Trophy]
          ] as const).map(([id, label, Icon]) => <button key={id} onClick={() => setActiveTab(id)} className={`px-4 py-2.5 rounded-xl text-xs font-extrabold flex items-center gap-2 whitespace-nowrap cursor-pointer ${activeTab === id ? 'bg-black text-white' : 'bg-white border border-slate-200 text-slate-600'}`}><Icon className="w-4 h-4" />{label}</button>)}
        </nav>

        {activeTab === 'evidence' && (
          <section className="space-y-4">
            <div className="bg-white rounded-2xl border border-slate-200 p-4 flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap gap-2">{(['NEEDS_REVIEW', 'AUTO_VERIFIED', 'APPROVED', 'REJECTED', 'all'] as const).map((status) => <button key={status} onClick={() => setVerificationFilter(status)} className={`px-3 py-2 rounded-lg text-[10px] font-extrabold border cursor-pointer ${verificationFilter === status ? 'bg-black text-white border-black' : 'bg-white text-slate-600 border-slate-200'}`}>{status === 'all' ? 'ทั้งหมด' : STATUS_META[status].label}</button>)}</div>
              <button onClick={exportEvidence} className="px-3 py-2 rounded-lg bg-slate-100 text-xs font-bold flex items-center gap-2 cursor-pointer"><Download className="w-4 h-4" />Export</button>
            </div>

            {isLoading ? <div className="bg-white rounded-2xl p-16 text-center"><RefreshCw className="w-7 h-7 animate-spin mx-auto text-[#00914E]" /></div> : filteredEvidence.length === 0 ? <div className="bg-white rounded-2xl p-16 text-center text-slate-400 text-sm font-bold">ไม่พบหลักฐานตามตัวกรอง</div> : (
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                {filteredEvidence.map((log) => {
                  const user = findUserForLog(log);
                  const status = STATUS_META[log.verificationStatus];
                  const exactMatch = Number(log.ocrSteps) === Number(log.steps) && Number(log.ocrSteps) > 0;
                  return <article key={log.id} className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
                    <div className="grid grid-cols-1 sm:grid-cols-[190px_1fr] min-h-[260px]">
                      <div className="bg-slate-100 flex items-center justify-center p-3">
                        {evidenceThumbnail(log) ? <img src={evidenceThumbnail(log)} alt="Evidence" className="w-full h-52 object-contain bg-white rounded-xl border border-slate-200" referrerPolicy="no-referrer" /> : <div className="text-slate-400 text-xs font-bold">ไม่มี Preview</div>}
                      </div>
                      <div className="p-5 space-y-4">
                        <div className="flex items-start justify-between gap-3"><div><p className="font-black text-black">{getDisplayName(user) || log.userEmail}</p><p className="text-[10px] text-slate-400 mt-1">{log.employeeId} · {resolveDepartment(user?.departmentId)?.nameTh || user?.departmentId || 'ไม่ระบุฝ่าย'}</p></div><span className={`px-2.5 py-1 rounded-full border text-[9px] font-extrabold ${status.className}`}>{status.label}</span></div>
                        <div className="grid grid-cols-2 gap-2"><div className="bg-slate-50 rounded-xl p-3"><p className="text-[9px] text-slate-400 font-bold">ยอดที่กรอก</p><p className="text-xl font-black text-black">{Number(log.steps).toLocaleString()}</p></div><div className={`rounded-xl p-3 ${exactMatch ? 'bg-emerald-50' : 'bg-amber-50'}`}><p className="text-[9px] text-slate-500 font-bold">OCR · {log.ocrConfidence || 0}%</p><p className={`text-xl font-black ${exactMatch ? 'text-emerald-700' : 'text-amber-700'}`}>{log.ocrSteps?.toLocaleString() || 'อ่านไม่พบ'}</p></div></div>
                        <div className="text-[10px] text-slate-500 space-y-1"><p>{getCampaignMonth(Number(log.week)).label} · สัปดาห์ที่ {log.weekOfMonth}</p><p>ส่งเมื่อ {formatDateTime(log.submittedAt)}</p>{log.reviewNote && <p className="text-rose-600">หมายเหตุ: {log.reviewNote}</p>}</div>
                        <div className="flex flex-wrap gap-2">
                          {log.imageUrl && <a href={log.imageUrl} target="_blank" rel="noreferrer" className="px-3 py-2 rounded-lg bg-slate-100 text-slate-700 text-[10px] font-bold flex items-center gap-1"><Eye className="w-3.5 h-3.5" />เปิดรูปเต็ม</a>}
                          <button disabled={reviewingId === log.id} onClick={() => void handleReview(log, 'APPROVED')} className="px-3 py-2 rounded-lg bg-[#00914E] text-white text-[10px] font-bold flex items-center gap-1 cursor-pointer disabled:opacity-50"><CheckCircle2 className="w-3.5 h-3.5" />Approve</button>
                          <button disabled={reviewingId === log.id} onClick={() => void handleReview(log, 'REJECTED')} className="px-3 py-2 rounded-lg bg-rose-600 text-white text-[10px] font-bold flex items-center gap-1 cursor-pointer disabled:opacity-50"><XCircle className="w-3.5 h-3.5" />Reject</button>
                          <button onClick={() => void handleDelete(log)} className="ml-auto p-2 rounded-lg bg-rose-50 text-rose-600 cursor-pointer"><Trash2 className="w-4 h-4" /></button>
                        </div>
                      </div>
                    </div>
                  </article>;
                })}
              </div>
            )}
          </section>
        )}

        {activeTab === 'employees' && (
          <section className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between"><div><h3 className="font-black text-black">ฐานพนักงาน</h3><p className="text-[10px] text-slate-400">คูปองคำนวณจากรายการผ่านตรวจ ≥ 7,000 เท่านั้น</p></div><button onClick={() => setShowAddUserModal(true)} className="bg-[#00914E] text-white px-3 py-2 rounded-lg text-xs font-bold flex items-center gap-2 cursor-pointer"><UserPlus className="w-4 h-4" />เพิ่มพนักงาน</button></div>
            <div className="overflow-x-auto"><table className="w-full min-w-[900px] text-xs"><thead><tr className="bg-slate-50 text-slate-500"><th className="p-4 text-left">รหัส</th><th className="p-4 text-left">ชื่อ</th><th className="p-4 text-left">ฝ่าย</th><th className="p-4 text-left">Login ล่าสุด</th><th className="p-4 text-left">ส่งล่าสุด</th><th className="p-4 text-center">คูปองผ่านตรวจ</th></tr></thead><tbody className="divide-y divide-slate-100">{filteredUsers.map((user) => <tr key={user.employeeId} className="hover:bg-slate-50"><td className="p-4 font-black text-[#00914E]">{user.employeeId}</td><td className="p-4"><p className="font-bold text-black">{getDisplayName(user)}</p><p className="text-[9px] text-slate-400">{user.nickname}</p></td><td className="p-4 font-bold text-slate-600">{resolveDepartment(user.departmentId)?.nameTh || user.departmentId}</td><td className="p-4 text-[10px]">{formatDateTime(user.lastLoginAt)}</td><td className="p-4 text-[10px]">{formatDateTime(user.lastSubmitAt)}</td><td className="p-4 text-center"><span className="bg-amber-50 text-amber-700 px-3 py-1 rounded-full font-black">{user.totalTickets || 0} ใบ</span></td></tr>)}</tbody></table></div>
          </section>
        )}

        {activeTab === 'leaderboard' && (
          <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <article className="bg-white rounded-2xl border border-slate-200 p-5"><h3 className="font-black text-black flex items-center gap-2"><Building className="w-5 h-5 text-[#00914E]" />อันดับรายฝ่าย</h3><p className="text-[10px] text-slate-400 mt-1">ใช้เฉพาะข้อมูลที่ผ่านตรวจ · {selectedPeriodLabel}</p><div className="space-y-3 mt-5">{departmentLeaderboard.map((department, index) => <div key={department.id} className="flex justify-between gap-3 bg-slate-50 rounded-xl p-3"><div><p className="font-bold text-black text-xs">#{index + 1} {department.nameTh}</p><p className="text-[9px] text-slate-400">{department.participantCount}/{department.memberCount} คน · {department.participationRate}%</p></div><div className="text-right"><p className="font-black text-[#00914E] text-xs">{department.totalSteps.toLocaleString()} ก้าว</p><p className="text-[9px] text-slate-400">เฉลี่ย {department.averageSteps.toLocaleString()}</p></div></div>)}</div></article>
            <article className="bg-white rounded-2xl border border-slate-200 p-5"><h3 className="font-black text-black flex items-center gap-2"><Trophy className="w-5 h-5 text-amber-500" />Top Walkers</h3><p className="text-[10px] text-slate-400 mt-1">ยอดรวมที่ผ่านตรวจ</p><div className="space-y-3 mt-5">{topWalkers.map(({ user, steps }, index) => <div key={user?.employeeId || index} className="flex justify-between gap-3 bg-slate-50 rounded-xl p-3"><div><p className="font-bold text-black text-xs">#{index + 1} {user?.name} ({user?.nickname})</p><p className="text-[9px] text-slate-400">{user?.employeeId}</p></div><p className="font-black text-[#00914E] text-xs">{steps.toLocaleString()} ก้าว</p></div>)}</div></article>
          </section>
        )}
      </main>

      {showAddUserModal && <div className="fixed inset-0 z-[70] bg-black/60 flex items-center justify-center p-4"><form onSubmit={handleAddEmployee} className="bg-white w-full max-w-md rounded-2xl p-6 space-y-4"><div className="flex justify-between"><h3 className="font-black text-black">เพิ่มพนักงาน</h3><button type="button" onClick={() => setShowAddUserModal(false)}>✕</button></div>{newEmployeeError && <div className="bg-rose-50 text-rose-700 p-3 rounded-xl text-xs font-bold">{newEmployeeError}</div>}<input value={newEmployee.id} onChange={(event) => setNewEmployee({ ...newEmployee, id: event.target.value.replace(/\D/g, '').slice(0, 6) })} placeholder="รหัสพนักงาน 6 หลัก" className="w-full bg-slate-50 border rounded-xl p-3 text-xs font-bold" /><div className="grid grid-cols-2 gap-3"><input value={newEmployee.name} onChange={(event) => setNewEmployee({ ...newEmployee, name: event.target.value })} placeholder="ชื่อ" className="bg-slate-50 border rounded-xl p-3 text-xs font-bold" /><input value={newEmployee.surname} onChange={(event) => setNewEmployee({ ...newEmployee, surname: event.target.value })} placeholder="นามสกุล" className="bg-slate-50 border rounded-xl p-3 text-xs font-bold" /></div><input value={newEmployee.nickname} onChange={(event) => setNewEmployee({ ...newEmployee, nickname: event.target.value })} placeholder="ชื่อเล่น" className="w-full bg-slate-50 border rounded-xl p-3 text-xs font-bold" /><select value={newEmployee.departmentId} onChange={(event) => setNewEmployee({ ...newEmployee, departmentId: event.target.value })} className="w-full bg-slate-50 border rounded-xl p-3 text-xs font-bold">{allDepartments.map((department) => <option key={department.id} value={department.id}>{department.nameTh}</option>)}</select><input type="date" value={newEmployee.birthDate} onChange={(event) => setNewEmployee({ ...newEmployee, birthDate: event.target.value })} className="w-full bg-slate-50 border rounded-xl p-3 text-xs font-bold" /><div className="flex gap-2"><button type="button" onClick={() => setShowAddUserModal(false)} className="w-1/2 bg-slate-100 rounded-xl py-3 text-xs font-bold">ยกเลิก</button><button disabled={isSavingUser} className="w-1/2 bg-[#00914E] text-white rounded-xl py-3 text-xs font-bold disabled:opacity-50">{isSavingUser ? 'กำลังบันทึก...' : 'บันทึก'}</button></div></form></div>}
    </div>
  );
}
