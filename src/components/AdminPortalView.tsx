import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
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

  const loadAdminData = async () => {
    setIsLoading(true); setLoadError('');
    try {
      const [allUsers, allLogs] = await Promise.all([fetchAllUsers(), fetchAllStepLogs()]);
      setUsers(allUsers as AdminUser[]);
      setLogs(allLogs as AdminLog[]);
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
    fallbackDepartments.forEach((department) => {
      const buId = department.buId || 'UNASSIGNED';
      const key = `${buId}::${department.id}`;
      if (!map.has(key)) map.set(key, { id: department.id, buId, name: department.nameTh });
    });
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name, 'th'));
  }, [users, fallbackDepartments]);
  const visibleDepartments = departmentCatalog.filter((department) => buFilter === 'all' || department.buId === buFilter);

  const usersByKey = useMemo(() => {
    const map = new Map<string, AdminUser>();
    users.forEach((user) => { map.set(normalize(user.employeeId), user); map.set(normalize(user.email), user); });
    return map;
  }, [users]);
  const findUser = (log: AdminLog) => usersByKey.get(normalize(log.employeeId)) || usersByKey.get(normalize(log.userEmail));
  const logBU = (log: AdminLog) => log.buIdAtSubmission || findUser(log)?.buId || 'UNASSIGNED';
  const logDepartment = (log: AdminLog) => log.departmentIdAtSubmission || findUser(log)?.departmentId || 'UNASSIGNED';

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
    return [log.employeeId, log.userEmail, log.imageName, user?.name, user?.nickname].some((value) => normalize(value).includes(search));
  }), [periodLogs, buFilter, departmentFilter, searchText, usersByKey]);

  const filteredEvidence = useMemo(() => scopedLogs.filter((log) =>
    verificationFilter === 'all' || log.verificationStatus === verificationFilter
  ), [scopedLogs, verificationFilter]);

  const filteredUsers = useMemo(() => users.filter((user) => {
    if (buFilter !== 'all' && user.buId !== buFilter) return false;
    if (departmentFilter !== 'all' && departmentScopeValue(user.buId, user.departmentId) !== departmentFilter) return false;
    const search = normalize(searchText);
    return !search || [user.employeeId, user.email, user.name, user.nickname, displayName(user)].some((value) => normalize(value).includes(search));
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

  const buildRanking = (mode: 'bu' | 'department') => {
    const groups = new Map<string, { id: string; buId: string; memberIds: Set<string>; participantValues: Map<string, number[]> }>();
    filteredUsers.filter((user) => normalize(user.status || 'Active') === 'active').forEach((user) => {
      const id = mode === 'bu' ? user.buId : user.departmentId;
      const buId = user.buId || 'UNASSIGNED';
      const key = mode === 'bu' ? id : `${buId}::${id}`;
      if (!groups.has(key)) groups.set(key, { id: id || 'UNASSIGNED', buId, memberIds: new Set(), participantValues: new Map() });
      groups.get(key)!.memberIds.add(normalize(user.employeeId || user.email));
    });
    verifiedFilteredLogs.forEach((log) => {
      const id = mode === 'bu' ? logBU(log) : logDepartment(log);
      const buId = logBU(log);
      const key = mode === 'bu' ? id : `${buId}::${id}`;
      if (!groups.has(key)) groups.set(key, { id, buId, memberIds: new Set(), participantValues: new Map() });
      const employeeKey = normalize(log.employeeId || log.userEmail);
      const values = groups.get(key)!.participantValues.get(employeeKey) || [];
      values.push(Number(log.steps) || 0);
      groups.get(key)!.participantValues.set(employeeKey, values);
    });
    return Array.from(groups.values()).map((group) => {
      const employeeAverages = Array.from(group.participantValues.values()).map(average);
      return {
        id: group.id,
        buId: group.buId,
        memberCount: group.memberIds.size,
        participantCount: employeeAverages.length,
        participationRate: group.memberIds.size ? Math.round(employeeAverages.length / group.memberIds.size * 100) : 0,
        averageSteps: average(employeeAverages)
      };
    }).sort((a, b) => b.averageSteps - a.averageSteps);
  };
  const buRanking = useMemo(() => buildRanking('bu'), [filteredUsers, verifiedFilteredLogs]);
  const departmentRanking = useMemo(() => buildRanking('department'), [filteredUsers, verifiedFilteredLogs]);

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
          <div className="flex items-center gap-3"><button onClick={onExit} className="p-2 rounded-lg bg-white/10 hover:bg-white/20 cursor-pointer"><ArrowLeft className="w-5 h-5" /></button><div><p className="font-black text-lg">Thairath Step Up Admin</p><p className="text-xs text-slate-400">BU Management · Evidence Verification · v2.4.4</p></div></div>
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
          <div className="relative flex-1 min-w-[220px]"><Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><input value={searchText} onChange={(event) => setSearchText(event.target.value)} placeholder="ค้นหารหัส ชื่อ ชื่อเล่น หรือไฟล์" className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2.5 text-sm font-semibold outline-none focus:border-[#00914E]" /></div>
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
          <section className="grid grid-cols-1 xl:grid-cols-2 gap-5"><RankingCard title="อันดับราย BU" icon={<Building2 className="w-5 h-5 text-[#00914E]" />} rows={buRanking} showBU={false} /><RankingCard title="อันดับรายฝ่าย" icon={<Trophy className="w-5 h-5 text-[#00914E]" />} rows={departmentRanking} showBU /></section>
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
function RankingCard({ title, icon, rows, showBU }: { title: string; icon: React.ReactNode; rows: Array<{ id: string; buId: string; memberCount: number; participantCount: number; participationRate: number; averageSteps: number }>; showBU: boolean }) { return <article className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm"><h3 className="font-black text-black flex items-center gap-2">{icon}{title}</h3><p className="text-xs text-slate-400 mt-1">ใช้ค่าเฉลี่ยรายพนักงานจากรายการที่ผ่านตรวจ</p><div className="space-y-3 mt-5">{rows.map((row, index) => <div key={`${row.buId}:${row.id}`} className="flex justify-between gap-3 bg-slate-50 rounded-xl p-3"><div><p className="font-bold text-black text-sm">#{index + 1} {row.id}</p><p className="text-xs text-slate-400 mt-1">{showBU ? `BU ${row.buId} · ` : ''}{row.participantCount}/{row.memberCount} คน · {row.participationRate}%</p></div><div className="text-right"><p className="font-black text-[#00914E] text-sm">{row.averageSteps.toLocaleString()}</p><p className="text-xs text-slate-400">ก้าว/วัน</p></div></div>)}{rows.length === 0 && <p className="text-sm text-slate-400 text-center py-8">ยังไม่มีข้อมูล</p>}</div></article>; }
