import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  Building,
  CalendarDays,
  CheckCircle2,
  Download,
  ExternalLink,
  FileSpreadsheet,
  Footprints,
  RefreshCw,
  Search,
  ShieldAlert,
  Ticket,
  Trash2,
  Trophy,
  UserPlus,
  Users,
  UserX
} from 'lucide-react';
import {
  createUserOrUpdateProfile,
  deleteUserLog,
  fetchAllStepLogs,
  fetchAllUsers,
  updateUserTickets
} from '../sheetsBackend';
import { ActiveUser, DepartmentInfo, StepLog } from '../types';
import { CAMPAIGN_MONTHS, getDefaultCampaignMonth, getCampaignMonth } from '../campaignConfig';

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

const DATABASE_URL = 'https://docs.google.com/spreadsheets/d/1YgxxKpP74EkzfzAJn2wnTXamrYJ9-aBZsKwcBo7v3Dk/edit';

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

function csvCell(value: unknown): string {
  const text = String(value ?? '').replace(/"/g, '""');
  return `"${text}"`;
}

function downloadCsv(filename: string, rows: string[][]) {
  const content = `\uFEFF${rows.map((row) => row.map(csvCell).join(',')).join('\n')}`;
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export default function AdminPortalView({ departments, onExit }: AdminPortalViewProps) {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [logs, setLogs] = useState<AdminLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [activeSubTab, setActiveSubTab] = useState<'employees' | 'submissions' | 'leaderboard'>('employees');

  const [reportMonthFilter, setReportMonthFilter] = useState(String(getDefaultCampaignMonth()));
  const [reportWeekFilter, setReportWeekFilter] = useState('all');
  const [userSearchText, setUserSearchText] = useState('');
  const [userDeptFilter, setUserDeptFilter] = useState('all');
  const [logSearchText, setLogSearchText] = useState('');

  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [newEmpId, setNewEmpId] = useState('');
  const [newEmpName, setNewEmpName] = useState('');
  const [newEmpSurname, setNewEmpSurname] = useState('');
  const [newEmpNickname, setNewEmpNickname] = useState('');
  const [newEmpDept, setNewEmpDept] = useState(departments[0]?.id || 'ceo');
  const [newEmpBirthDate, setNewEmpBirthDate] = useState('');
  const [newEmpError, setNewEmpError] = useState('');
  const [isSavingUser, setIsSavingUser] = useState(false);

  const [adjustingUser, setAdjustingUser] = useState<AdminUser | null>(null);
  const [ticketDelta, setTicketDelta] = useState(1);
  const [isUpdatingTickets, setIsUpdatingTickets] = useState(false);

  const loadAdminData = async () => {
    setIsLoading(true);
    setLoadError('');
    try {
      const [allUsers, allLogs] = await Promise.all([fetchAllUsers(), fetchAllStepLogs()]);
      setUsers(allUsers as AdminUser[]);
      setLogs(allLogs as AdminLog[]);
    } catch (error: any) {
      console.error('Error loading admin data:', error);
      setLoadError(error?.message || 'ไม่สามารถโหลดข้อมูลจาก Google Sheets ได้');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAdminData();
  }, []);

  const allDepartments = useMemo<DepartmentInfo[]>(() => {
    const departmentMap = new Map<string, DepartmentInfo>();

    departments.forEach((department) => {
      if (department?.id) departmentMap.set(normalizeDeptKey(department.id), department);
    });

    users.forEach((user) => {
      const rawDepartment = String(user.departmentId || user.departmentName || user.rawDepartmentId || '').trim();
      if (!rawDepartment) return;
      const key = normalizeDeptKey(rawDepartment);
      const existing = Array.from(departmentMap.values()).find((department) =>
        [department.id, department.nameTh, department.nameEn].some((value) => normalizeDeptKey(value) === key)
      );
      if (!existing) {
        departmentMap.set(key, {
          id: rawDepartment,
          nameTh: user.departmentName || rawDepartment,
          nameEn: user.departmentName || rawDepartment,
          participationRate: 0,
          averageStepsPerPerson: 0,
          status: 'stable',
          statusText: 'ข้อมูลจาก Google Sheets'
        });
      }
    });

    return Array.from(departmentMap.values()).sort((a, b) => a.nameTh.localeCompare(b.nameTh, 'th'));
  }, [departments, users]);

  useEffect(() => {
    if (!newEmpDept && allDepartments[0]?.id) setNewEmpDept(allDepartments[0].id);
  }, [allDepartments, newEmpDept]);

  const resolveDepartment = (departmentId?: string) => {
    const key = normalizeDeptKey(departmentId);
    if (!key) return null;
    return allDepartments.find((department) =>
      [department.id, department.nameTh, department.nameEn].some((value) => normalizeDeptKey(value) === key)
    ) || null;
  };

  const isSameDepartment = (departmentId?: string, filterDepartmentId?: string) => {
    if (!filterDepartmentId || filterDepartmentId === 'all') return true;
    const userDepartment = resolveDepartment(departmentId);
    const filterDepartment = resolveDepartment(filterDepartmentId);
    return normalizeDeptKey(userDepartment?.id || departmentId) === normalizeDeptKey(filterDepartment?.id || filterDepartmentId);
  };

  const findUserForLog = (log: AdminLog) => users.find((user) => {
    const employeeMatches = log.employeeId && normalizeText(user.employeeId) === normalizeText(log.employeeId);
    const emailMatches = log.userEmail && normalizeText(user.email) === normalizeText(log.userEmail);
    return employeeMatches || emailMatches;
  });

  const formatDateTime = (value?: string, emptyText = 'ยังไม่มีข้อมูล') => {
    if (!value) return emptyText;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleString('th-TH', {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
  };

  const logsInSelectedPeriod = useMemo(() => logs.filter((log) => {
    const matchesMonth = reportMonthFilter === 'all' || Number(log.week) === Number(reportMonthFilter);
    const matchesWeek = reportWeekFilter === 'all' || Number(log.weekOfMonth) === Number(reportWeekFilter);
    return matchesMonth && matchesWeek;
  }), [logs, reportMonthFilter, reportWeekFilter]);

  const latestSubmitByEmployee = useMemo(() => {
    const result = new Map<string, string>();
    logs.forEach((log) => {
      const key = normalizeText(log.employeeId || log.userEmail);
      const current = result.get(key);
      if (!current || String(log.submittedAt || '') > current) result.set(key, String(log.submittedAt || ''));
    });
    return result;
  }, [logs]);

  const activeUsers = users.filter((user) => normalizeText(user.status || 'Active') === 'active');
  const participantKeys = new Set(logsInSelectedPeriod.map((log) => normalizeText(log.employeeId || log.userEmail)).filter(Boolean));
  const submittedEmployees = activeUsers.filter((user) =>
    participantKeys.has(normalizeText(user.employeeId)) || participantKeys.has(normalizeText(user.email))
  ).length;
  const notSubmittedEmployees = Math.max(0, activeUsers.length - submittedEmployees);
  const participationRate = activeUsers.length > 0 ? Math.round((submittedEmployees / activeUsers.length) * 100) : 0;
  const scopedTotalSteps = logsInSelectedPeriod.reduce((sum, log) => sum + (Number(log.steps) || 0), 0);

  const filteredUsers = users.filter((user) => {
    const search = normalizeText(userSearchText);
    const fullName = getDisplayName(user);
    const matchesSearch = !search || [fullName, user.nickname, user.employeeId, user.email]
      .some((value) => normalizeText(value).includes(search));
    return matchesSearch && isSameDepartment(user.departmentId, userDeptFilter);
  });

  const filteredLogs = logsInSelectedPeriod.filter((log) => {
    const search = normalizeText(logSearchText);
    if (!search) return true;
    const user = findUserForLog(log);
    return [
      log.userEmail,
      log.employeeId,
      log.imageName,
      user?.name,
      user?.nickname,
      user?.employeeId
    ].some((value) => normalizeText(value).includes(search));
  });

  const departmentLeaderboard = useMemo(() => allDepartments.map((department) => {
    const departmentUsers = activeUsers.filter((user) => isSameDepartment(user.departmentId, department.id));
    const departmentUserKeys = new Set(departmentUsers.flatMap((user) => [normalizeText(user.employeeId), normalizeText(user.email)]));
    const departmentLogs = logsInSelectedPeriod.filter((log) =>
      departmentUserKeys.has(normalizeText(log.employeeId)) || departmentUserKeys.has(normalizeText(log.userEmail))
    );
    const participants = new Set(departmentLogs.map((log) => normalizeText(log.employeeId || log.userEmail))).size;
    const totalSteps = departmentLogs.reduce((sum, log) => sum + (Number(log.steps) || 0), 0);
    const rate = departmentUsers.length > 0 ? Math.round((participants / departmentUsers.length) * 100) : 0;

    return {
      ...department,
      memberCount: departmentUsers.length,
      participantCount: participants,
      participationRate: rate,
      totalSteps,
      averageSteps: participants > 0 ? Math.round(totalSteps / participants) : 0
    };
  }).filter((department) => department.memberCount > 0).sort((a, b) => b.totalSteps - a.totalSteps), [allDepartments, activeUsers, logsInSelectedPeriod]);

  const topWalkers = useMemo(() => {
    const totals = new Map<string, number>();
    logsInSelectedPeriod.forEach((log) => {
      const key = normalizeText(log.employeeId || log.userEmail);
      totals.set(key, (totals.get(key) || 0) + (Number(log.steps) || 0));
    });

    return Array.from(totals.entries())
      .map(([key, steps]) => {
        const user = users.find((item) => normalizeText(item.employeeId) === key || normalizeText(item.email) === key);
        return { user, steps };
      })
      .filter((item) => item.user)
      .sort((a, b) => b.steps - a.steps)
      .slice(0, 10);
  }, [logsInSelectedPeriod, users]);

  const selectedPeriodLabel = reportMonthFilter === 'all'
    ? 'ทั้งโครงการ'
    : `${getCampaignMonth(Number(reportMonthFilter)).label}${reportWeekFilter === 'all' ? '' : ` · สัปดาห์ที่ ${reportWeekFilter}`}`;

  const handleDeleteLogClick = async (logId: string) => {
    if (!window.confirm('ยืนยันลบรายการนี้? ข้อมูลจะถูกนำออกจาก Dashboard และ Leaderboard และไม่สามารถกู้คืนได้')) return;
    try {
      await deleteUserLog(logId);
      setLogs((previous) => previous.filter((log) => log.id !== logId));
    } catch (error: any) {
      window.alert(error?.message || 'ไม่สามารถลบรายการได้');
    }
  };

  const handleAddUserSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setNewEmpError('');
    const formattedId = newEmpId.trim();

    if (!/^\d{6}$/.test(formattedId)) return setNewEmpError('รหัสพนักงานต้องเป็นตัวเลข 6 หลัก');
    if (!newEmpName.trim()) return setNewEmpError('กรุณากรอกชื่อจริง');
    if (!newEmpSurname.trim()) return setNewEmpError('กรุณากรอกนามสกุล');
    if (!newEmpNickname.trim()) return setNewEmpError('กรุณากรอกชื่อเล่น');
    if (!newEmpBirthDate) return setNewEmpError('กรุณาระบุวันเกิด เพื่อคำนวณอายุและสร้างรหัสผ่านอัตโนมัติ');

    setIsSavingUser(true);
    try {
      const newUser: ActiveUser = {
        employeeId: formattedId,
        email: `${formattedId}@thairathgroup.com`,
        name: newEmpName.trim(),
        surname: newEmpSurname.trim(),
        nickname: newEmpNickname.trim(),
        departmentId: newEmpDept,
        weekTarget: 60000,
        totalTickets: 0,
        dateOfBirth: newEmpBirthDate
      };
      await createUserOrUpdateProfile(formattedId, newUser);
      setNewEmpId('');
      setNewEmpName('');
      setNewEmpSurname('');
      setNewEmpNickname('');
      setNewEmpBirthDate('');
      setShowAddUserModal(false);
      await loadAdminData();
    } catch (error: any) {
      setNewEmpError(error?.message || 'ไม่สามารถบันทึกข้อมูลพนักงานได้');
    } finally {
      setIsSavingUser(false);
    }
  };

  const handleUpdateTickets = async () => {
    if (!adjustingUser?.employeeId) return;
    setIsUpdatingTickets(true);
    try {
      const newTicketCount = Math.max(0, Number(adjustingUser.totalTickets || 0) + ticketDelta);
      await updateUserTickets(adjustingUser.employeeId, newTicketCount);
      setUsers((previous) => previous.map((user) =>
        user.employeeId === adjustingUser.employeeId ? { ...user, totalTickets: newTicketCount } : user
      ));
      setAdjustingUser(null);
    } catch (error: any) {
      window.alert(error?.message || 'ไม่สามารถปรับจำนวนตั๋วได้');
    } finally {
      setIsUpdatingTickets(false);
    }
  };

  const exportEmployees = () => {
    const rows = [
      ['รหัสพนักงาน', 'ชื่อ-นามสกุล', 'ชื่อเล่น', 'ฝ่าย', 'อายุ', 'Login ล่าสุด', 'ส่งผลล่าสุด', 'ตั๋วสะสม', 'สถานะ'],
      ...filteredUsers.map((user) => [
        user.employeeId || '',
        getDisplayName(user),
        user.nickname || '',
        resolveDepartment(user.departmentId)?.nameTh || user.departmentId || 'ไม่ระบุฝ่าย',
        user.age || '',
        formatDateTime(user.lastLoginAt),
        formatDateTime(user.lastSubmitAt || latestSubmitByEmployee.get(normalizeText(user.employeeId)) || latestSubmitByEmployee.get(normalizeText(user.email))),
        user.totalTickets || 0,
        user.status || 'Active'
      ])
    ];
    downloadCsv(`thairath_step_up_employees_${new Date().toISOString().slice(0, 10)}.csv`, rows);
  };

  const exportSubmissions = () => {
    const rows = [
      ['เดือน', 'สัปดาห์', 'รหัสพนักงาน', 'ชื่อพนักงาน', 'ฝ่าย', 'วันที่อ้างอิง', 'จำนวนก้าว', 'ไฟล์หลักฐาน', 'เวลาที่ส่ง'],
      ...filteredLogs.map((log) => {
        const user = findUserForLog(log);
        return [
          getCampaignMonth(Number(log.week)).label,
          log.weekOfMonth ? `สัปดาห์ที่ ${log.weekOfMonth}` : 'ข้อมูลเดิม',
          user?.employeeId || log.employeeId || '',
          getDisplayName(user),
          resolveDepartment(user?.departmentId)?.nameTh || user?.departmentId || 'ไม่ระบุฝ่าย',
          log.date,
          log.steps,
          log.imageName,
          formatDateTime(log.submittedAt)
        ];
      })
    ];
    downloadCsv(`thairath_step_up_submissions_${new Date().toISOString().slice(0, 10)}.csv`, rows);
  };

  const metricCards = [
    { label: 'พนักงาน Active', value: activeUsers.length, suffix: 'คน', helper: 'ฐานพนักงานที่เปิดใช้งาน', icon: Users, className: 'bg-emerald-50 text-[#00914E]' },
    { label: 'ส่งผลแล้ว', value: submittedEmployees, suffix: 'คน', helper: selectedPeriodLabel, icon: CheckCircle2, className: 'bg-blue-50 text-blue-600' },
    { label: 'ยังไม่ส่งผล', value: notSubmittedEmployees, suffix: 'คน', helper: 'เทียบกับพนักงาน Active', icon: UserX, className: 'bg-rose-50 text-rose-600' },
    { label: 'Participation Rate', value: participationRate, suffix: '%', helper: `${scopedTotalSteps.toLocaleString()} ก้าวในช่วงที่เลือก`, icon: Footprints, className: 'bg-amber-50 text-amber-600' }
  ];

  return (
    <div className="min-h-screen bg-[#F2F4F7] text-[#344054] font-sans pb-24">
      <header className="bg-black text-white py-4 px-5 shadow-md">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="bg-[#00914E] text-white p-2.5 rounded-xl"><ShieldAlert className="w-5 h-5" /></div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-base md:text-lg font-black tracking-tight">THAIRATH STEP UP · Admin Center</h1>
                <span className="text-[9px] bg-[#00914E] text-white font-extrabold px-2 py-0.5 rounded uppercase tracking-wider">Google Sheets Live</span>
              </div>
              <p className="text-[11px] text-gray-300 font-medium mt-1">บริหารผู้ใช้งาน ตรวจสอบการส่งผล และติดตาม Participation ของโครงการ</p>
            </div>
          </div>
          <div className="flex items-center gap-2 self-end sm:self-auto">
            <a href={DATABASE_URL} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 bg-white/10 hover:bg-white/20 px-3 py-2 rounded-xl text-xs font-bold transition-colors">
              <ExternalLink className="w-4 h-4" /> เปิด Google Sheets
            </a>
            <button onClick={onExit} className="flex items-center gap-1.5 bg-white text-black hover:bg-slate-100 px-3 py-2 rounded-xl text-xs font-bold cursor-pointer">
              <ArrowLeft className="w-4 h-4" /> กลับหน้าหลัก
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 md:px-6 pt-7 space-y-7">
        <section className="bg-white border border-slate-200 rounded-2xl p-4 md:p-5 shadow-xs">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-[#00914E]">Reporting Scope</p>
              <h2 className="font-black text-black mt-1">ช่วงข้อมูลที่ใช้คำนวณ Dashboard และ Leaderboard</h2>
              <p className="text-xs text-slate-500 mt-1">ปัจจุบันเลือก: {selectedPeriodLabel}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <select value={reportMonthFilter} onChange={(event) => { setReportMonthFilter(event.target.value); setReportWeekFilter('all'); }} className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-bold outline-none focus:border-[#00914E]">
                <option value="all">ทุกเดือน · ทั้งโครงการ</option>
                {CAMPAIGN_MONTHS.map((month) => <option key={month.number} value={month.number}>{month.label}</option>)}
              </select>
              <select value={reportWeekFilter} onChange={(event) => setReportWeekFilter(event.target.value)} disabled={reportMonthFilter === 'all'} className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-bold outline-none focus:border-[#00914E] disabled:opacity-50">
                <option value="all">ทุกสัปดาห์ในเดือน</option>
                {(reportMonthFilter === 'all' ? [] : getCampaignMonth(Number(reportMonthFilter)).weeks).map((week) => <option key={week.number} value={week.number}>{week.label} · {week.range}</option>)}
              </select>
              <button onClick={loadAdminData} className="bg-[#00914E] text-white hover:bg-[#00703c] px-3 py-2.5 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer">
                <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} /> รีเฟรชข้อมูล
              </button>
            </div>
          </div>
        </section>

        {loadError && <div className="bg-rose-50 border border-rose-100 text-rose-700 rounded-xl px-4 py-3 text-xs font-bold">{loadError}</div>}

        <section className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-5">
          {metricCards.map((card) => {
            const Icon = card.icon;
            return (
              <article key={card.label} className="bg-white p-4 md:p-5 rounded-2xl border border-slate-200 shadow-xs min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-[10px] md:text-[11px] text-slate-500 font-extrabold leading-relaxed">{card.label}</p>
                  <div className={`p-2 rounded-xl ${card.className}`}><Icon className="w-4 h-4" /></div>
                </div>
                <div className="mt-3 flex items-baseline gap-1.5"><span className="text-2xl md:text-3xl font-black text-black tabular-nums">{card.value}</span><span className="text-xs font-bold text-slate-500">{card.suffix}</span></div>
                <p className="text-[9px] md:text-[10px] text-slate-400 font-semibold mt-1.5 truncate" title={card.helper}>{card.helper}</p>
              </article>
            );
          })}
        </section>

        <nav className="flex gap-2 overflow-x-auto border-b border-slate-200 scrollbar-none">
          {[
            { id: 'employees', label: `ฐานข้อมูลพนักงาน (${filteredUsers.length}/${users.length})`, icon: Users },
            { id: 'submissions', label: `รายการส่งผล (${filteredLogs.length}/${logsInSelectedPeriod.length})`, icon: FileSpreadsheet },
            { id: 'leaderboard', label: 'Leaderboard & Participation', icon: Trophy }
          ].map((tab) => {
            const Icon = tab.icon;
            const active = activeSubTab === tab.id;
            return (
              <button key={tab.id} onClick={() => setActiveSubTab(tab.id as typeof activeSubTab)} className={`pb-3 px-2 text-xs md:text-sm font-extrabold flex items-center gap-2 whitespace-nowrap border-b-3 cursor-pointer ${active ? 'text-[#00914E] border-[#00914E]' : 'text-slate-500 border-transparent hover:text-black'}`}>
                <Icon className="w-4 h-4" /> {tab.label}
              </button>
            );
          })}
        </nav>

        {activeSubTab === 'employees' && (
          <section className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-4 md:p-5 bg-slate-50 border-b border-slate-200 flex flex-col lg:flex-row gap-3 justify-between">
              <div className="relative w-full lg:w-96">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input value={userSearchText} onChange={(event) => setUserSearchText(event.target.value)} placeholder="ค้นหาด้วยชื่อ รหัสพนักงาน ชื่อเล่น หรืออีเมล" className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-xs font-bold outline-none focus:border-[#00914E]" />
              </div>
              <div className="flex flex-wrap gap-2">
                <select value={userDeptFilter} onChange={(event) => setUserDeptFilter(event.target.value)} className="bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-bold outline-none">
                  <option value="all">ทุกฝ่าย</option>
                  {allDepartments.map((department) => <option key={department.id} value={department.id}>{department.nameTh}</option>)}
                </select>
                <button onClick={exportEmployees} className="bg-white border border-[#00914E] text-[#00914E] hover:bg-[#E8F5E9] px-3 py-2.5 rounded-xl text-xs font-extrabold flex items-center gap-1.5 cursor-pointer"><Download className="w-4 h-4" /> Export CSV</button>
                <button onClick={() => setShowAddUserModal(true)} className="bg-[#00914E] text-white hover:bg-[#00703c] px-3 py-2.5 rounded-xl text-xs font-extrabold flex items-center gap-1.5 cursor-pointer"><UserPlus className="w-4 h-4" /> เพิ่มพนักงาน</button>
              </div>
            </div>

            {isLoading ? (
              <div className="p-14 text-center"><RefreshCw className="w-7 h-7 animate-spin mx-auto text-[#00914E]" /><p className="text-xs font-bold text-slate-500 mt-3">กำลังโหลดฐานข้อมูลพนักงาน...</p></div>
            ) : filteredUsers.length === 0 ? (
              <div className="p-14 text-center text-slate-400 text-xs font-bold">ไม่พบพนักงานที่ตรงกับตัวกรอง</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[1050px] text-left text-xs border-collapse">
                  <thead><tr className="bg-slate-100/80 text-slate-500 font-extrabold border-b border-slate-200">
                    <th className="py-4 px-5">รหัสพนักงาน</th><th className="py-4 px-5">ชื่อ-นามสกุล / ชื่อเล่น</th><th className="py-4 px-5">ฝ่าย</th><th className="py-4 px-5">Login ล่าสุด</th><th className="py-4 px-5">ส่งผลล่าสุด</th><th className="py-4 px-5 text-center">ตั๋วสะสม</th><th className="py-4 px-5 text-right">ดำเนินการ</th>
                  </tr></thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredUsers.map((user) => {
                      const department = resolveDepartment(user.departmentId);
                      const latestSubmit = user.lastSubmitAt || latestSubmitByEmployee.get(normalizeText(user.employeeId)) || latestSubmitByEmployee.get(normalizeText(user.email));
                      return (
                        <tr key={user.employeeId || user.email} className="hover:bg-slate-50 transition-colors">
                          <td className="py-4 px-5 font-bold text-[#00914E] tabular-nums">{user.employeeId}</td>
                          <td className="py-4 px-5"><p className="font-extrabold text-black">{getDisplayName(user)}</p><p className="text-[10px] text-slate-400 mt-0.5">ชื่อเล่น: {user.nickname || '-'} {user.age ? `· อายุ ${user.age} ปี` : ''}</p></td>
                          <td className="py-4 px-5"><span className="inline-flex items-center gap-1.5 bg-[#E8F5E9] text-[#00914E] px-2.5 py-1.5 rounded-lg font-bold text-[10px]"><Building className="w-3 h-3" />{department?.nameTh || user.departmentId || 'ไม่ระบุฝ่าย'}</span></td>
                          <td className="py-4 px-5 text-[10px] font-bold text-slate-600 whitespace-nowrap">{formatDateTime(user.lastLoginAt, 'ยังไม่เคย Login')}</td>
                          <td className="py-4 px-5 text-[10px] font-bold text-slate-600 whitespace-nowrap">{formatDateTime(latestSubmit, 'ยังไม่เคยส่งผล')}</td>
                          <td className="py-4 px-5 text-center"><span className="inline-flex items-center gap-1.5 bg-amber-50 text-amber-700 px-3 py-1.5 rounded-xl font-black border border-amber-100"><Ticket className="w-4 h-4" />{user.totalTickets || 0} ใบ</span></td>
                          <td className="py-4 px-5 text-right"><button onClick={() => { setAdjustingUser(user); setTicketDelta(1); }} className="bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100 px-2.5 py-1.5 rounded-lg text-[10px] font-bold cursor-pointer">ปรับตั๋ว</button></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}

        {activeSubTab === 'submissions' && (
          <section className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-4 md:p-5 bg-slate-50 border-b border-slate-200 flex flex-col md:flex-row gap-3 justify-between">
              <div className="relative w-full md:w-96">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input value={logSearchText} onChange={(event) => setLogSearchText(event.target.value)} placeholder="ค้นหาชื่อ รหัสพนักงาน อีเมล หรือชื่อไฟล์" className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-xs font-bold outline-none focus:border-[#00914E]" />
              </div>
              <button onClick={exportSubmissions} className="bg-white border border-[#00914E] text-[#00914E] hover:bg-[#E8F5E9] px-3 py-2.5 rounded-xl text-xs font-extrabold flex items-center justify-center gap-1.5 cursor-pointer"><Download className="w-4 h-4" /> Export ตามตัวกรอง</button>
            </div>

            {isLoading ? (
              <div className="p-14 text-center"><RefreshCw className="w-7 h-7 animate-spin mx-auto text-[#00914E]" /><p className="text-xs font-bold text-slate-500 mt-3">กำลังโหลดรายการส่งผล...</p></div>
            ) : filteredLogs.length === 0 ? (
              <div className="p-14 text-center text-slate-400 text-xs font-bold">ไม่พบรายการส่งผลในช่วงที่เลือก</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[1050px] text-left text-xs border-collapse">
                  <thead><tr className="bg-slate-100/80 text-slate-500 font-extrabold border-b border-slate-200">
                    <th className="py-4 px-5">เดือน / สัปดาห์</th><th className="py-4 px-5">พนักงาน</th><th className="py-4 px-5">ฝ่าย</th><th className="py-4 px-5 text-right">จำนวนก้าว</th><th className="py-4 px-5">หลักฐาน</th><th className="py-4 px-5">เวลาที่ส่ง</th><th className="py-4 px-5 text-right">ลบ</th>
                  </tr></thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredLogs.map((log) => {
                      const user = findUserForLog(log);
                      const department = resolveDepartment(user?.departmentId);
                      return (
                        <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                          <td className="py-4 px-5"><p className="font-extrabold text-[#00914E]">{getCampaignMonth(Number(log.week)).shortLabel}</p><p className="text-[10px] text-slate-400 mt-0.5">{log.weekOfMonth ? `สัปดาห์ที่ ${log.weekOfMonth}` : 'ข้อมูลเดิม'}</p></td>
                          <td className="py-4 px-5"><p className="font-extrabold text-black">{user ? getDisplayName(user) : log.userEmail}</p><p className="text-[10px] text-slate-400 mt-0.5">{user?.employeeId || log.employeeId || '-'}</p></td>
                          <td className="py-4 px-5 text-[10px] font-bold text-slate-600">{department?.nameTh || user?.departmentId || 'ไม่ระบุฝ่าย'}</td>
                          <td className="py-4 px-5 text-right font-black text-black text-sm tabular-nums">{Number(log.steps).toLocaleString()} ก้าว</td>
                          <td className="py-4 px-5"><p className="max-w-[180px] truncate text-[10px] font-semibold text-slate-500" title={log.imageName}>{log.imageName || 'ไม่มีชื่อไฟล์'}</p></td>
                          <td className="py-4 px-5 text-[10px] font-bold text-slate-500 whitespace-nowrap">{formatDateTime(log.submittedAt)}</td>
                          <td className="py-4 px-5 text-right"><button onClick={() => handleDeleteLogClick(log.id)} className="bg-rose-50 text-rose-600 hover:bg-rose-600 hover:text-white border border-rose-100 p-2 rounded-lg cursor-pointer"><Trash2 className="w-4 h-4" /></button></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}

        {activeSubTab === 'leaderboard' && (
          <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <article className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 md:p-6">
              <div className="flex items-start justify-between gap-3 pb-4 border-b border-slate-100">
                <div><h3 className="font-black text-black flex items-center gap-2"><Building className="w-5 h-5 text-[#00914E]" />อันดับรายฝ่าย</h3><p className="text-[10px] text-slate-400 mt-1">คำนวณจาก {selectedPeriodLabel}</p></div>
                <span className="text-[9px] bg-[#E8F5E9] text-[#00914E] px-2 py-1 rounded font-extrabold">LIVE</span>
              </div>
              <div className="space-y-3 mt-5">
                {departmentLeaderboard.length === 0 ? <p className="text-center py-10 text-xs text-slate-400 font-bold">ยังไม่มีข้อมูลในช่วงที่เลือก</p> : departmentLeaderboard.map((department, index) => (
                  <div key={department.id} className="flex items-center justify-between gap-3 p-3.5 bg-slate-50 rounded-xl border border-slate-100">
                    <div className="flex items-center gap-3 min-w-0"><span className={`w-7 h-7 rounded-full flex items-center justify-center font-black text-xs shrink-0 ${index < 3 ? 'bg-amber-100 text-amber-800' : 'bg-white text-slate-500 border border-slate-200'}`}>{index + 1}</span><div className="min-w-0"><p className="font-extrabold text-xs text-black truncate">{department.nameTh}</p><p className="text-[9px] text-slate-400 mt-0.5">ส่ง {department.participantCount}/{department.memberCount} คน · {department.participationRate}%</p></div></div>
                    <div className="text-right shrink-0"><p className="font-black text-[#00914E] text-xs tabular-nums">{department.totalSteps.toLocaleString()} ก้าว</p><p className="text-[9px] text-slate-400 mt-0.5">เฉลี่ย {department.averageSteps.toLocaleString()}/คน</p></div>
                  </div>
                ))}
              </div>
            </article>

            <article className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 md:p-6">
              <div className="flex items-start justify-between gap-3 pb-4 border-b border-slate-100">
                <div><h3 className="font-black text-black flex items-center gap-2"><Trophy className="w-5 h-5 text-amber-500" />Top Walkers</h3><p className="text-[10px] text-slate-400 mt-1">ยอดก้าวรวมรายบุคคลใน {selectedPeriodLabel}</p></div>
                <span className="text-[9px] bg-amber-50 text-amber-700 px-2 py-1 rounded font-extrabold">TOP 10</span>
              </div>
              <div className="space-y-3 mt-5">
                {topWalkers.length === 0 ? <p className="text-center py-10 text-xs text-slate-400 font-bold">ยังไม่มีข้อมูลในช่วงที่เลือก</p> : topWalkers.map(({ user, steps }, index) => (
                  <div key={user?.employeeId || index} className="flex items-center justify-between gap-3 p-3.5 bg-slate-50 rounded-xl border border-slate-100">
                    <div className="flex items-center gap-3 min-w-0"><span className={`w-7 h-7 rounded-full flex items-center justify-center font-black text-xs shrink-0 ${index < 3 ? 'bg-amber-100 text-amber-800' : 'bg-white text-slate-500 border border-slate-200'}`}>{index + 1}</span><div className="min-w-0"><p className="font-extrabold text-xs text-black truncate">{user?.name} ({user?.nickname || '-'})</p><p className="text-[9px] text-slate-400 mt-0.5">{user?.employeeId} · {resolveDepartment(user?.departmentId)?.nameTh || user?.departmentId || 'ไม่ระบุฝ่าย'}</p></div></div>
                    <p className="font-black text-[#00914E] text-xs tabular-nums shrink-0">{steps.toLocaleString()} ก้าว</p>
                  </div>
                ))}
              </div>
            </article>
          </section>
        )}
      </main>

      {showAddUserModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[70] p-4">
          <div className="bg-white max-w-md w-full rounded-2xl shadow-2xl p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100"><h3 className="font-black text-black flex items-center gap-2"><UserPlus className="w-5 h-5 text-[#00914E]" />เพิ่มพนักงาน</h3><button onClick={() => setShowAddUserModal(false)} className="text-slate-400 hover:text-black cursor-pointer">✕</button></div>
            {newEmpError && <div className="mt-4 bg-rose-50 border border-rose-100 text-rose-700 p-3 rounded-xl text-xs font-bold">{newEmpError}</div>}
            <form onSubmit={handleAddUserSubmit} className="space-y-4 mt-5 text-xs font-semibold">
              <div><label className="block text-[10px] font-extrabold text-slate-500 mb-1">รหัสพนักงาน 6 หลัก</label><input value={newEmpId} onChange={(event) => setNewEmpId(event.target.value.replace(/\D/g, ''))} maxLength={6} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-3 outline-none focus:border-[#00914E] font-bold" placeholder="เช่น 100344" /></div>
              <div className="grid grid-cols-2 gap-3"><div><label className="block text-[10px] font-extrabold text-slate-500 mb-1">ชื่อจริง</label><input value={newEmpName} onChange={(event) => setNewEmpName(event.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-3 outline-none focus:border-[#00914E] font-bold" /></div><div><label className="block text-[10px] font-extrabold text-slate-500 mb-1">นามสกุล</label><input value={newEmpSurname} onChange={(event) => setNewEmpSurname(event.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-3 outline-none focus:border-[#00914E] font-bold" /></div></div>
              <div><label className="block text-[10px] font-extrabold text-slate-500 mb-1">ชื่อเล่น</label><input value={newEmpNickname} onChange={(event) => setNewEmpNickname(event.target.value)} maxLength={20} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-3 outline-none focus:border-[#00914E] font-bold" /></div>
              <div><label className="block text-[10px] font-extrabold text-slate-500 mb-1">ฝ่าย</label><select value={newEmpDept} onChange={(event) => setNewEmpDept(event.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-3 outline-none focus:border-[#00914E] font-bold">{allDepartments.map((department) => <option key={department.id} value={department.id}>{department.nameTh}</option>)}</select></div>
              <div><label className="block text-[10px] font-extrabold text-slate-500 mb-1">วันเกิด</label><input type="date" value={newEmpBirthDate} onChange={(event) => setNewEmpBirthDate(event.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-3 outline-none focus:border-[#00914E] font-bold" /><p className="text-[9px] text-slate-400 mt-1">ระบบจะคำนวณอายุและสร้าง Password รูปแบบ DDMMYY ปี พ.ศ. อัตโนมัติ</p></div>
              <div className="flex gap-2 pt-2"><button type="button" onClick={() => setShowAddUserModal(false)} className="w-1/2 bg-slate-100 hover:bg-slate-200 py-3 rounded-xl font-bold cursor-pointer">ยกเลิก</button><button type="submit" disabled={isSavingUser} className="w-1/2 bg-[#00914E] hover:bg-[#00703c] disabled:opacity-50 text-white py-3 rounded-xl font-extrabold cursor-pointer">{isSavingUser ? 'กำลังบันทึก...' : 'บันทึกพนักงาน'}</button></div>
            </form>
          </div>
        </div>
      )}

      {adjustingUser && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[70] p-4">
          <div className="bg-white max-w-sm w-full rounded-2xl shadow-2xl p-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100"><h3 className="font-black text-black flex items-center gap-2"><Ticket className="w-5 h-5 text-amber-500" />ปรับจำนวนตั๋ว</h3><button onClick={() => setAdjustingUser(null)} className="text-slate-400 hover:text-black cursor-pointer">✕</button></div>
            <div className="mt-5 bg-[#E8F5E9] rounded-xl p-4"><p className="font-extrabold text-black text-sm">{adjustingUser.name} ({adjustingUser.nickname})</p><p className="text-[10px] text-slate-500 mt-1">{adjustingUser.employeeId} · ปัจจุบัน {adjustingUser.totalTickets || 0} ใบ</p></div>
            <div className="flex items-center justify-center gap-5 py-8"><button onClick={() => setTicketDelta((value) => value - 1)} className="w-10 h-10 rounded-full bg-slate-100 text-lg font-black cursor-pointer">−</button><span className="text-3xl font-black tabular-nums w-20 text-center">{ticketDelta > 0 ? `+${ticketDelta}` : ticketDelta}</span><button onClick={() => setTicketDelta((value) => value + 1)} className="w-10 h-10 rounded-full bg-slate-100 text-lg font-black cursor-pointer">+</button></div>
            <p className="text-center text-xs font-bold text-amber-700">ยอดใหม่: {Math.max(0, Number(adjustingUser.totalTickets || 0) + ticketDelta)} ใบ</p>
            <div className="flex gap-2 mt-5"><button onClick={() => setAdjustingUser(null)} className="w-1/2 bg-slate-100 py-3 rounded-xl font-bold text-xs cursor-pointer">ยกเลิก</button><button onClick={handleUpdateTickets} disabled={isUpdatingTickets} className="w-1/2 bg-[#00914E] text-white py-3 rounded-xl font-extrabold text-xs cursor-pointer disabled:opacity-50">{isUpdatingTickets ? 'กำลังบันทึก...' : 'ยืนยัน'}</button></div>
          </div>
        </div>
      )}
    </div>
  );
}
