import React, { useState, useEffect } from 'react';
import { 
  Users, 
  ShieldAlert, 
  Search, 
  Trash2, 
  Ticket, 
  Calendar, 
  Building, 
  CheckCircle, 
  RefreshCw, 
  ArrowLeft, 
  FileSpreadsheet, 
  UserPlus, 
  ExternalLink,
  ShieldCheck,
  Coins,
  Trophy,
  Download
} from 'lucide-react';
import { 
  fetchAllUsers, 
  fetchAllStepLogs, 
  deleteUserLog, 
  createUserOrUpdateProfile,
  updateUserTickets 
} from '../sheetsBackend';
import { DepartmentInfo, ActiveUser } from '../types';

interface AdminPortalViewProps {
  departments: DepartmentInfo[];
  onExit: () => void;
}

export default function AdminPortalView({ departments, onExit }: AdminPortalViewProps) {
  const [users, setUsers] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeSubTab, setActiveSubTab] = useState<'employees' | 'submissions' | 'leaderboard'>('employees');
  
  // Filtering & Search states
  const [userSearchText, setUserSearchText] = useState('');
  const [userDeptFilter, setUserDeptFilter] = useState('all');
  
  const [logSearchText, setLogSearchText] = useState('');
  const [logWeekFilter, setLogWeekFilter] = useState('all');

  // New employee inline form
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [newEmpId, setNewEmpId] = useState('');
  const [newEmpName, setNewEmpName] = useState('');
  const [newEmpSurname, setNewEmpSurname] = useState('');
  const [newEmpNickname, setNewEmpNickname] = useState('');
  const [newEmpDept, setNewEmpDept] = useState(departments[0]?.id || 'ceo');
  const [newEmpBirthDate, setNewEmpBirthDate] = useState('');
  const [newEmpError, setNewEmpError] = useState('');
  const [isSavingUser, setIsSavingUser] = useState(false);

  // Ticket Adjust Modal states
  const [adjustingUser, setAdjustingUser] = useState<any | null>(null);
  const [ticketDelta, setTicketDelta] = useState<number>(1);
  const [isUpdatingTickets, setIsUpdatingTickets] = useState(false);

  // Load all system data
  const loadAdminData = async () => {
    setIsLoading(true);
    try {
      const allUsers = await fetchAllUsers();
      const allLogs = await fetchAllStepLogs();
      setUsers(allUsers);
      setLogs(allLogs);
    } catch (err) {
      console.error('Error loading admin data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAdminData();
  }, []);

  // Delete Log handler
  const handleDeleteLogClick = async (logId: string) => {
    if (window.confirm('คุณแน่ใจหรือไม่ที่จะลบรายการก้าวตัวนี้? ข้อมูลนี้จะหายไปจากสถิติ Leaderboard และไม่สามารถกู้คืนได้')) {
      try {
        await deleteUserLog(logId);
        setLogs(prev => prev.filter(l => l.id !== logId));
        // Force refresh leaderboard calculation on next load
      } catch (err) {
        alert('เกิดข้อผิดพลาดในการลบ: ' + err);
      }
    }
  };

  // Add new employee manual
  const handleAddUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setNewEmpError('');

    const formattedId = newEmpId.trim();
    if (formattedId.length !== 6 || !/^\d+$/.test(formattedId)) {
      setNewEmpError('รหัสพนักงานต้องเป็นตัวเลข 6 หลัก');
      return;
    }

    if (!newEmpName.trim()) {
      setNewEmpError('กรุณากรอกชื่อจริง');
      return;
    }

    if (!newEmpSurname.trim()) {
      setNewEmpError('กรุณากรอกนามสกุลจริง');
      return;
    }

    if (!newEmpNickname.trim()) {
      setNewEmpError('กรุณากรอกชื่อเล่น');
      return;
    }

    if (!newEmpBirthDate) {
      setNewEmpError('กรุณาระบุวันเกิด เพื่อให้ระบบคำนวณอายุและสร้างรหัสผ่านวันเกิดอัตโนมัติ');
      return;
    }

    setIsSavingUser(true);
    try {
      const newUserObj: ActiveUser = {
        employeeId: formattedId,
        email: `${formattedId}@thairathgroup.com`,
        name: newEmpName.trim(),
        surname: newEmpSurname.trim(),
        nickname: newEmpNickname.trim(),
        departmentId: newEmpDept,
        weekTarget: 60000,
        totalTickets: 2, // starting free tickets
        dateOfBirth: newEmpBirthDate
      };

      await createUserOrUpdateProfile(formattedId, newUserObj);
      
      // Reset & load again
      setNewEmpId('');
      setNewEmpName('');
      setNewEmpSurname('');
      setNewEmpNickname('');
      setNewEmpBirthDate('');
      setShowAddUserModal(false);
      await loadAdminData();
    } catch (err: any) {
      setNewEmpError('เกิดปัญหากับระบบ Google Sheets: ' + err.message);
    } finally {
      setIsSavingUser(false);
    }
  };

  // Ticket Adjust Submit
  const handleUpdateTickets = async () => {
    if (!adjustingUser) return;
    setIsUpdatingTickets(true);
    try {
      const newTicketCount = Math.max(0, adjustingUser.totalTickets + ticketDelta);
      await updateUserTickets(adjustingUser.employeeId || adjustingUser.id, newTicketCount);
      
      // Update local state
      setUsers(prev => prev.map(u => u.id === adjustingUser.id ? { ...u, totalTickets: newTicketCount } : u));
      setAdjustingUser(null);
    } catch (err) {
      alert('เกิดข้อผิดพลาดในการอัปเดตตั๋วทอง: ' + err);
    } finally {
      setIsUpdatingTickets(false);
    }
  };

  // Excel Export Handler (CSV with BOM for Thai Excel Support)
  const handleExportToExcel = (type: 'employees' | 'submissions') => {
    let csvContent = "\uFEFF"; // UTF-8 BOM so Excel opens it with correct Thai encoding!
    let filename = "";

    if (type === 'employees') {
      csvContent += "รหัสพนักงาน,ชื่อ-นามสกุลจริง,ชื่อเล่น,ฝ่าย/แผนกงานย่อย,รหัสผ่าน(วันเกิดพ.ศ.),ตั๋วทองจับฉลากวิเศษ\n";
      users.forEach(u => {
        const dept = departments.find(d => d.id === u.departmentId);
        const deptName = dept ? dept.nameTh : 'ไม่ระบุ';
        const cleanName = ([u.name, u.surname || u.Surename].filter(Boolean).join(' ') || '').replace(/,/g, ' ');
        const cleanNickname = (u.nickname || '').replace(/,/g, ' ');
        csvContent += `${u.employeeId || ''},${cleanName},${cleanNickname},${deptName},${u.password || ''},${u.totalTickets || 0}\n`;
      });
      filename = `thairath_employees_database_${new Date().toISOString().slice(0, 10)}.csv`;
    } else {
      csvContent += "สัปดาห์,รหัสพนักงาน,ชื่อพนักงาน,ฝ่าย,วันทำกิจกรรม,จำนวนก้าว,ชื่อไฟล์รูปภาพหลักฐาน,เวลาส่งบันทึก\n";
      logs.forEach(l => {
        const userProfile = users.find(u => u.email.toLowerCase() === l.userEmail.toLowerCase());
        const empId = userProfile ? userProfile.employeeId : '';
        const empName = userProfile ? userProfile.name.replace(/,/g, ' ') : '';
        const dept = userProfile ? departments.find(d => d.id === userProfile.departmentId) : null;
        const deptName = dept ? dept.nameTh : 'ไม่ระบุ';
        const cleanImgName = (l.imageName || '').replace(/,/g, ' ');
        const formattedDate = new Date(l.submittedAt).toLocaleString('th-TH', { hour12: false }).replace(/,/g, ' ');
        csvContent += `${l.week},${empId},${empName},${deptName},${l.date},${l.steps},${cleanImgName},${formattedDate}\n`;
      });
      filename = `thairath_step_logs_history_${new Date().toISOString().slice(0, 10)}.csv`;
    }

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Calculations for stats
  const totalEmployees = users.length;
  const totalLogsCount = logs.length;
  const totalStepsSum = logs.reduce((sum, log) => sum + log.steps, 0);
  const averageSteps = totalLogsCount > 0 ? Math.round(totalStepsSum / totalLogsCount) : 0;

  // Compute department leaderboard for Admin
  const adminDeptLeaderboard = departments.map((d) => {
    // Find all users in this department
    const deptUsers = users.filter(u => u.departmentId === d.id);
    const deptUserEmails = deptUsers.map(u => u.email?.toLowerCase() || `${u.employeeId}@thairathgroup.com`.toLowerCase());
    
    // Total steps submitted by these users
    const totalSteps = logs
      .filter(l => deptUserEmails.includes(l.userEmail.toLowerCase()))
      .reduce((sum, l) => sum + l.steps, 0);
      
    // Total tickets in this department
    const totalTickets = deptUsers.reduce((sum, u) => sum + (u.totalTickets || 0), 0);
    
    return {
      id: d.id,
      nameTh: d.nameTh,
      nameEn: d.nameEn,
      memberCount: deptUsers.length,
      totalSteps,
      totalTickets
    };
  }).sort((a, b) => b.totalSteps - a.totalSteps);

  // Top 10 users with the most tickets
  const top10TicketUsers = [...users]
    .sort((a, b) => (b.totalTickets || 0) - (a.totalTickets || 0))
    .slice(0, 10);

  // Filtered Users
  const filteredUsers = users.filter(u => {
    const matchesSearch = 
      u.name.toLowerCase().includes(userSearchText.toLowerCase()) ||
      u.nickname.toLowerCase().includes(userSearchText.toLowerCase()) ||
      u.employeeId.includes(userSearchText) ||
      u.email.toLowerCase().includes(userSearchText.toLowerCase());
    
    const matchesDept = userDeptFilter === 'all' || u.departmentId === userDeptFilter;
    return matchesSearch && matchesDept;
  });

  // Filtered Logs
  const filteredLogs = logs.filter(l => {
    const userProfile = users.find(u => u.email.toLowerCase() === l.userEmail.toLowerCase());
    const userNameString = userProfile ? `${userProfile.name} ${userProfile.nickname}` : '';
    
    const matchesSearch = 
      l.userEmail.toLowerCase().includes(logSearchText.toLowerCase()) ||
      userNameString.toLowerCase().includes(logSearchText.toLowerCase()) ||
      l.imageName.toLowerCase().includes(logSearchText.toLowerCase());

    const matchesWeek = logWeekFilter === 'all' || l.week.toString() === logWeekFilter;
    return matchesSearch && matchesWeek;
  });

  return (
    <div className="min-h-screen bg-[#F2F4F7] text-[#344054] font-sans pb-24">
      
      {/* Editorial Header Block for Admin */}
      <div className="bg-black text-white py-4.5 px-6 shadow-md">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-[#00914E] text-white p-2 rounded-xl">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-black tracking-tight text-white leading-none">THAIRATH STEP UP - หลังบ้าน (Admin System)</h1>
                <span className="text-[10px] bg-red-600 text-white font-extrabold px-1.5 py-0.5 rounded uppercase font-mono animate-pulse">
                  Console
                </span>
              </div>
              <p className="text-[11px] text-gray-300 font-medium mt-1">ยินดีต้อนรับ คุณวรพงษ์ (เบ) • จัดการระบบข้อมูลก้าวพนักงานไทยรัฐอย่างเป็นส่วนตัว</p>
            </div>
          </div>
          
          <button
            onClick={onExit}
            className="flex items-center gap-1.5 bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>กลับหน้าหลักแอป</span>
          </button>
        </div>
      </div>

      {/* Main Bento Core Area */}
      <div className="max-w-7xl mx-auto px-4 md:px-6 pt-8 space-y-8">
        
        {/* Row 1: System Health Dashboard Metrics (Bento Grid) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          
          {/* Card 1: Total Users */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-[11px] text-slate-400 font-extrabold uppercase tracking-widest leading-none">จำนวนพนักงานที่จดทะเบียน</p>
              <h2 className="text-3xl font-black text-black mt-2 font-mono">{totalEmployees} <span className="text-xs text-slate-500 font-semibold font-sans">คน</span></h2>
              <p className="text-[10px] text-emerald-600 font-medium mt-1">● บูตแลบ Google Sheets เรียบร้อย</p>
            </div>
            <div className="bg-emerald-50 text-[#00914E] p-3 rounded-xl">
              <Users className="w-6 h-6" />
            </div>
          </div>

          {/* Card 2: Total Logs */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-[11px] text-slate-400 font-extrabold uppercase tracking-widest leading-none">จำนวนธุรกรรมบันทึกผลก้าว</p>
              <h2 className="text-3xl font-black text-black mt-2 font-mono">{totalLogsCount} <span className="text-xs text-slate-500 font-semibold font-sans">รายการ</span></h2>
              <p className="text-[10px] text-slate-500 font-semibold mt-1">คีย์เดี่ยว ID คอนเฟิร์มภาพแล้ว</p>
            </div>
            <div className="bg-blue-50 text-blue-600 p-3 rounded-xl">
              <CheckCircle className="w-6 h-6" />
            </div>
          </div>

          {/* Card 3: Grand Total Steps */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-[11px] text-slate-400 font-extrabold uppercase tracking-widest leading-none">ผลก้าวสะสมทั่วไทยรัฐกรุ๊ป</p>
              <h2 className="text-3xl font-black text-black mt-2 font-mono">{totalStepsSum.toLocaleString()} <span className="text-xs text-slate-500 font-semibold font-sans">ก้าว</span></h2>
              <p className="text-[10px] text-amber-600 font-medium mt-1">🔥 ก้าวสู่เป้าหมายองค์กรสีเขียว</p>
            </div>
            <div className="bg-amber-50 text-amber-600 p-3 rounded-xl">
              <Coins className="w-6 h-6" />
            </div>
          </div>

          {/* Card 4: Average daily steps */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-[11px] text-slate-400 font-extrabold uppercase tracking-widest leading-none">จำนวนก้าวเฉลี่ยต่อการรายงาน</p>
              <h2 className="text-3xl font-black text-black mt-2 font-mono">{averageSteps.toLocaleString()} <span className="text-xs text-slate-500 font-semibold font-sans">ก้าว</span></h2>
              <p className="text-[10px] text-slate-500 font-semibold mt-1">คำนวณจากฐานข้อมูล Google Sheets</p>
            </div>
            <div className="bg-purple-50 text-purple-600 p-3 rounded-xl">
              <Ticket className="w-6 h-6" />
            </div>
          </div>

        </div>

        {/* Console Navigation Tabs */}
        <div className="flex border-b border-gray-250 gap-4">
          <button
            onClick={() => setActiveSubTab('employees')}
            className={`pb-3.5 text-sm font-extrabold flex items-center gap-2 transition-all cursor-pointer ${
              activeSubTab === 'employees'
                ? 'text-[#00914E] border-b-3 border-[#00914E]'
                : 'text-slate-500 hover:text-black font-semibold'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>ฐานข้อมูลพนักงาน ({filteredUsers.length} / {totalEmployees})</span>
          </button>
          
          <button
            onClick={() => setActiveSubTab('submissions')}
            className={`pb-3.5 text-sm font-extrabold flex items-center gap-2 transition-all cursor-pointer ${
              activeSubTab === 'submissions'
                ? 'text-[#00914E] border-b-3 border-[#00914E]'
                : 'text-slate-500 hover:text-black font-semibold'
            }`}
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>ตรวจสอบหลักฐานและข้อมูลก้าว ({filteredLogs.length} / {totalLogsCount})</span>
          </button>

          <button
            onClick={() => setActiveSubTab('leaderboard')}
            className={`pb-3.5 text-sm font-extrabold flex items-center gap-2 transition-all cursor-pointer ${
              activeSubTab === 'leaderboard'
                ? 'text-[#00914E] border-b-3 border-[#00914E]'
                : 'text-slate-500 hover:text-black font-semibold'
            }`}
          >
            <Trophy className="w-4 h-4 text-amber-500" />
            <span>บอร์ดคะแนน & สถิติรวม (Admin Leaderboard)</span>
          </button>
        </div>

        {/* TAB 1: EMPLOYEES DIRECTORY */}
        {activeSubTab === 'employees' && (
          <div className="bg-white rounded-3xl border border-slate-100 shadow-xs overflow-hidden">
            
            {/* Table Controller bar */}
            <div className="p-6 bg-slate-50/50 border-b border-slate-100 flex flex-col md:flex-row gap-4 justify-between items-center">
              
              <div className="relative w-full md:w-80">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400">
                  <Search className="w-4 h-4" />
                </span>
                <input
                  type="text"
                  placeholder="ค้นหาพนักงานด้วย ชื่อ/รหัส/ชื่อเล่น..."
                  value={userSearchText}
                  onChange={(e) => setUserSearchText(e.target.value)}
                  className="w-full bg-white border border-slate-250 rounded-xl pl-10 pr-4 py-2.5 text-xs font-bold outline-none focus:border-[#00914E]"
                />
              </div>

              <div className="flex flex-wrap gap-2.5 w-full md:w-auto justify-end">
                {/* Department drop */}
                <select
                  value={userDeptFilter}
                  onChange={(e) => setUserDeptFilter(e.target.value)}
                  className="bg-white border border-slate-250 rounded-xl px-3 py-2.5 text-xs font-bold outline-none cursor-pointer"
                >
                  <option value="all">ฝ่ายทั้งหมด (All)</option>
                  {departments.map(d => (
                    <option key={d.id} value={d.id}>{d.nameTh}</option>
                  ))}
                </select>

                <button
                  onClick={() => handleExportToExcel('employees')}
                  className="bg-white border border-[#00914E] hover:bg-[#E8F5E9] text-[#00914E] px-4 py-2.5 rounded-xl text-xs font-extrabold flex items-center gap-1.5 transition-all cursor-pointer shadow-3xs"
                  title="ดาวน์โหลดฐานข้อมูลพนักงานทั้งหมดทาง Excel"
                >
                  <Download className="w-4 h-4 text-[#00914E]" />
                  <span>บันทึกเป็น Excel</span>
                </button>

                <button
                  onClick={() => setShowAddUserModal(true)}
                  className="bg-[#00914E] hover:bg-[#00703c] text-white px-4 py-2.5 rounded-xl text-xs font-extrabold flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>เพิ่มพนักงานในระบบด้วยมือ</span>
                </button>

                <button
                  onClick={loadAdminData}
                  className="bg-white border border-slate-250 hover:bg-slate-50 text-slate-700 px-3 py-2.5 rounded-xl text-xs font-bold flex items-center gap-1 cursor-pointer"
                  title="รีเฟรชข้อมูลเรียลไทม์"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>

            </div>

            {/* List Table */}
            {isLoading ? (
              <div className="p-16 text-center">
                <div className="w-8 h-8 border-3 border-[#00914E] border-t-transparent rounded-full animate-spin mx-auto"></div>
                <p className="text-xs font-extrabold text-slate-500 mt-3 font-sans">กำลังดึงฐานพนักงานจริงจาก Thairath Google Sheets...</p>
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="p-16 text-center text-slate-400 font-bold text-xs">
                ไม่พบข้อมูลพนักงานที่ตรงกับเงื่อนไขการค้นหาของคุณในขณะนี้
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-100/70 border-b border-gray-100 text-slate-500 font-extrabold">
                      <th className="py-4.5 px-6">รหัสพนักงาน</th>
                      <th className="py-4.5 px-6">ชื่อ-นามสกุล / ชื่อเล่น</th>
                      <th className="py-4.5 px-6">ฝ่ายย่อย (Department)</th>
                      <th className="py-4.5 px-6 text-center">รหัสผ่าน (วันเกิดปีพ.ศ.)</th>
                      <th className="py-4.5 px-6 text-center">ตั๋วจับฉลากวิเศษ</th>
                      <th className="py-4.5 px-6 text-right">ดำเนินการหลังบ้าน</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-150">
                    {filteredUsers.map((u) => {
                      const dept = departments.find(d => d.id === u.departmentId);
                      return (
                        <tr key={u.id} className="hover:bg-slate-50/50 transition-colors font-medium text-[#344054]">
                          <td className="py-4 px-6 font-mono font-bold text-[#00914E]">
                            {u.employeeId}
                          </td>
                          <td className="py-4 px-6">
                            <div className="font-extrabold text-black">{u.name}</div>
                            <div className="text-[10px] text-slate-400 font-semibold mt-0.5">ชื่อแสดงบอร์ด: "{u.nickname}" {u.age ? `• อายุ ${u.age} ปี` : ''}</div>
                          </td>
                          <td className="py-4 px-6">
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-[#E8F5E9] text-[#00914E] font-bold text-[10px]">
                              <Building className="w-3 h-3" />
                              {dept?.nameTh || 'ไม่ระบุฝ่าย'}
                            </span>
                          </td>
                          <td className="py-4 px-6 text-center font-mono font-extrabold text-slate-700 bg-slate-50/40">
                            {u.password || 'ไม่มี'}
                          </td>
                          <td className="py-4 px-6 text-center">
                            <div className="inline-flex items-center gap-1.5 bg-amber-50 text-amber-600 px-3 py-1.5 rounded-xl font-mono text-[13px] font-black border border-amber-100/60 shadow-2xs">
                              <Ticket className="w-4 h-4 text-amber-500" />
                              <span>{u.totalTickets} ใบ</span>
                            </div>
                          </td>
                          <td className="py-4 px-6 text-right">
                            <button
                              onClick={() => {
                                setAdjustingUser(u);
                                setTicketDelta(1);
                              }}
                              className="text-amber-700 bg-amber-50 hover:bg-amber-100 rounded-lg px-2.5 py-1.5 text-[10px] font-bold inline-flex items-center gap-1 cursor-pointer transition-all border border-amber-200"
                            >
                              <Ticket className="w-3 h-3" />
                              <span>ปรับจำนวนตั๋ว</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

          </div>
        )}

        {/* TAB 2: STEP SUBMISSIONS LIST */}
        {activeSubTab === 'submissions' && (
          <div className="bg-white rounded-3xl border border-slate-100 shadow-xs overflow-hidden">
            
            {/* Table Controller bar */}
            <div className="p-6 bg-slate-50/50 border-b border-slate-100 flex flex-col md:flex-row gap-4 justify-between items-center">
              
              <div className="relative w-full md:w-80">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400">
                  <Search className="w-4 h-4" />
                </span>
                <input
                  type="text"
                  placeholder="ค้นหาด้วยอีเมล / ชื่อพนักงาน / ชื่อไฟล์ภาพ..."
                  value={logSearchText}
                  onChange={(e) => setLogSearchText(e.target.value)}
                  className="w-full bg-white border border-slate-250 rounded-xl pl-10 pr-4 py-2.5 text-xs font-bold outline-none focus:border-[#00914E]"
                />
              </div>

              <div className="flex flex-wrap gap-2.5 w-full md:w-auto justify-end">
                {/* Week drop */}
                <select
                  value={logWeekFilter}
                  onChange={(e) => setLogWeekFilter(e.target.value)}
                  className="bg-white border border-slate-250 rounded-xl px-3 py-2.5 text-xs font-bold outline-none cursor-pointer"
                >
                  <option value="all">ทุกสัปดาห์</option>
                  <option value="1">สัปดาห์ที่ 1</option>
                  <option value="2">สัปดาห์ที่ 2</option>
                  <option value="3">สัปดาห์ที่ 3</option>
                  <option value="4">สัปดาห์ที่ 4</option>
                </select>

                <button
                  onClick={() => handleExportToExcel('submissions')}
                  className="bg-white border border-[#00914E] hover:bg-[#E8F5E9] text-[#00914E] px-4 py-2.5 rounded-xl text-xs font-extrabold flex items-center gap-1.5 transition-all cursor-pointer shadow-3xs"
                  title="ดาวน์โหลดไฟล์ประวัติรายงานก้าวทั้งหมดทาง Excel"
                >
                  <Download className="w-4 h-4 text-[#00914E]" />
                  <span>บันทึกเป็น Excel</span>
                </button>

                <button
                  onClick={loadAdminData}
                  className="bg-white border border-slate-250 hover:bg-slate-50 text-slate-700 px-3 py-2.5 rounded-xl text-xs font-bold flex items-center gap-1 cursor-pointer"
                  title="รีเฟรชข้อมูลเรียลไทม์"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>

            </div>

            {/* List Table */}
            {isLoading ? (
              <div className="p-16 text-center">
                <div className="w-8 h-8 border-3 border-[#00914E] border-t-transparent rounded-full animate-spin mx-auto"></div>
                <p className="text-xs font-extrabold text-slate-500 mt-3 font-sans">กำลังดึงรายการหลักฐานการส่งก้าวพนักงานทั้งหมดจาก Google Sheets...</p>
              </div>
            ) : filteredLogs.length === 0 ? (
              <div className="p-16 text-center text-slate-400 font-bold text-xs">
                ไม่พบรายการหลักฐานก้าวคำนวณที่สอดคล้องกับตัวกรองนี้
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-100/70 border-b border-gray-100 text-slate-500 font-extrabold">
                      <th className="py-4.5 px-6">สัปดาห์</th>
                      <th className="py-4.5 px-6">พนักงานผู้ส่งรายงาน</th>
                      <th className="py-4.5 px-6">วันทำกิจกรรม</th>
                      <th className="py-4.5 px-6 text-center">สถิติจำนวนก้าว</th>
                      <th className="py-4.5 px-6">ภาพถ่ายหลังแอป (Proof of Walk)</th>
                      <th className="py-4.5 px-6">เวลาที่ส่งเข้าระบบ</th>
                      <th className="py-4.5 px-6 text-right">ดำเนินการลบข้อมูล</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-150">
                    {filteredLogs.map((log) => {
                      const userProfile = users.find(u => u.email.toLowerCase() === log.userEmail.toLowerCase());
                      const dept = userProfile ? departments.find(d => d.id === userProfile.departmentId) : null;
                      
                      return (
                        <tr key={log.id} className="hover:bg-slate-50/50 transition-colors font-medium">
                          <td className="py-4 px-6 text-[#00914E] font-black font-mono">
                            Week {log.week}
                          </td>
                          <td className="py-4 px-6 text-[#344054]">
                            {userProfile ? (
                              <div>
                                <span className="font-extrabold text-black block">{userProfile.name}</span>
                                <span className="text-[10px] text-slate-400 font-semibold block">{userProfile.employeeId} • {dept?.nameTh || 'ไม่ระบุแผนก'}</span>
                              </div>
                            ) : (
                              <span className="font-semibold text-slate-400">{log.userEmail}</span>
                            )}
                          </td>
                          <td className="py-4 px-6 font-mono font-bold text-slate-700">
                            {log.date}
                          </td>
                          <td className="py-4 px-6 text-center font-mono text-black font-extrabold text-[14px]">
                            {log.steps.toLocaleString()} ก้าว
                          </td>
                          <td className="py-4 px-6">
                            <div className="flex items-center gap-3">
                              {log.imagePreview ? (
                                <img
                                  src={log.imagePreview}
                                  alt="Screenshot proof"
                                  referrerPolicy="no-referrer"
                                  className="w-10 h-10 object-cover rounded-md border border-slate-200/80 shadow-3xs"
                                />
                              ) : (
                                <div className="w-10 h-10 rounded-md bg-slate-100 flex items-center justify-center text-slate-300 font-bold text-[9px] text-center border leading-tight">
                                  No img
                                </div>
                              )}
                              <div className="text-left">
                                <p className="text-[10px] font-bold text-slate-600 max-w-[120px] truncate" title={log.imageName}>{log.imageName}</p>
                                <p className="text-[9px] text-slate-400 font-semibold">อัปโหลดออฟฟิเชียล</p>
                              </div>
                            </div>
                          </td>
                          <td className="py-4 px-6 font-mono text-slate-400 text-[10px]" title={log.submittedAt}>
                            {new Date(log.submittedAt).toLocaleString('th-TH', { hour12: false })}
                          </td>
                          <td className="py-4 px-6 text-right">
                            <button
                              onClick={() => handleDeleteLogClick(log.id)}
                              className="text-rose-600 hover:text-white hover:bg-rose-600 bg-rose-50 border border-rose-100 p-2 rounded-xl transition-all cursor-pointer inline-flex items-center justify-center"
                              title="ลบรายงานนี้ทิ้งถาวร"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

          </div>
        )}

        {/* TAB 3: ADMIN LEADERBOARD */}
        {activeSubTab === 'leaderboard' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            
            {/* Left Box: อันดับแต่ละฝ่าย (Department rankings by total steps) */}
            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 space-y-6">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div>
                  <h3 className="text-base font-extrabold text-black flex items-center gap-2">
                    <Building className="w-5 h-5 text-[#00914E]" />
                    สรุปอันดับก้าวสะสมรายฝ่าย (Department Rankings)
                  </h3>
                  <p className="text-[11px] text-slate-400 mt-0.5">รวมสถิติเดินก้าวสะสมเรียงอันดับจากฝ่ายย่อยทั้งหมดในไทยรัฐ</p>
                </div>
                <span className="text-[10px] bg-[#E8F5E9] text-[#00914E] px-2 py-1 rounded font-extrabold font-mono uppercase">
                  Live
                </span>
              </div>

              <div className="space-y-3">
                {adminDeptLeaderboard.map((dept, index) => {
                  const rankColors = [
                    'bg-amber-100 text-amber-800 border-amber-200', // 1st
                    'bg-slate-200 text-slate-800 border-slate-300', // 2nd
                    'bg-amber-600/10 text-amber-700 border-amber-600/20', // 3rd
                  ];
                  const rankBadge = index < 3 
                    ? `w-6 h-6 rounded-full flex items-center justify-center font-black text-xs border ${rankColors[index]}`
                    : `w-6 h-6 rounded-full flex items-center justify-center font-black text-xs text-slate-400 font-mono`;

                  return (
                    <div 
                      key={dept.id} 
                      className="flex items-center justify-between p-3.5 bg-slate-50/60 rounded-2xl border border-slate-100 hover:border-slate-300/80 transition-all"
                    >
                      <div className="flex items-center gap-3">
                        <div className={rankBadge}>
                          {index + 1}
                        </div>
                        <div className="w-2.5 h-2.5 rounded-full bg-[#00914E]" />
                        <div>
                          <p className="font-extrabold text-xs text-black">{dept.nameTh}</p>
                          <p className="text-[10px] text-slate-400 font-semibold">{dept.nameEn} • {dept.memberCount} สมาชิก</p>
                        </div>
                      </div>

                      <div className="text-right">
                        <p className="font-mono text-[13px] font-black text-[#00914E]">{dept.totalSteps.toLocaleString()} ก้าว</p>
                        <p className="text-[9px] text-[#00914E] font-bold flex items-center gap-0.5 justify-end mt-0.5">
                          <Ticket className="w-3 text-amber-500" />
                          <span>ตั๋วรวม {dept.totalTickets} ใบ</span>
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Right Box: Top 10 Employees with most tickets */}
            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 space-y-6">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div>
                  <h3 className="text-base font-extrabold text-black flex items-center gap-2">
                    <Trophy className="w-5 h-5 text-amber-500" />
                    พนักงาน Top 10 ที่ได้ตั๋วมากที่สุด (Most Tickets)
                  </h3>
                  <p className="text-[11px] text-slate-400 mt-0.5">รายชื่อสุดยอดพนักงานที่สะสมความเพียรพยายามรับจำนวนสิทธิตั๋วสะสมทองคำสูงสุด</p>
                </div>
                <span className="text-[10px] bg-amber-50 text-amber-600 px-2 py-1 rounded font-extrabold font-mono uppercase border border-amber-100">
                  Golden
                </span>
              </div>

              {top10TicketUsers.length === 0 ? (
                <div className="text-center py-12 text-slate-400 font-semibold text-xs">
                  ยังไม่มีสถิติผู้ถือตั๋วจับฉลากในระบบขณะนี้
                </div>
              ) : (
                <div className="space-y-3">
                  {top10TicketUsers.map((emp, index) => {
                    const dept = departments.find(d => d.id === emp.departmentId);
                    
                    const rankColors = [
                      'bg-amber-100 text-amber-800 border-amber-200', // 1st
                      'bg-slate-200 text-slate-800 border-slate-300', // 2nd
                      'bg-amber-600/10 text-amber-700 border-amber-600/20', // 3rd
                    ];
                    const rankBadge = index < 3 
                      ? `w-6 h-6 rounded-full flex items-center justify-center font-black text-xs border ${rankColors[index]}`
                      : `w-6 h-6 rounded-full flex items-center justify-center font-black text-xs text-slate-400 font-mono`;

                    return (
                      <div 
                        key={emp.id} 
                        className="flex items-center justify-between p-3.5 bg-slate-50/60 rounded-2xl border border-slate-100 hover:border-slate-300/80 transition-all"
                      >
                        <div className="flex items-center gap-3">
                          <div className={rankBadge}>
                            {index + 1}
                          </div>
                          <div>
                            <p className="font-extrabold text-xs text-black">{emp.name}</p>
                            <p className="text-[10px] text-slate-400 font-semibold">{emp.employeeId} • ฝ่าย{dept?.nameTh || 'ไม่ระบุ'}</p>
                          </div>
                        </div>

                        <div className="text-right">
                          <div className="inline-flex items-center gap-1.5 bg-amber-50 text-amber-600 px-3 py-1.5 rounded-xl font-mono text-[12px] font-black border border-amber-100/60 font-sans">
                            <Ticket className="w-3.5 h-3.5 text-amber-500" />
                            <span>{emp.totalTickets || 0} ใบ</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

          </div>
        )}

      </div>

      {/* MODAL 1: ADD EMPLOYEE DISCOVERY PORTAL */}
      {showAddUserModal && (
        <div className="fixed inset-0 bg-[#000000]/60 backdrop-blur-xs flex items-center justify-center z-55 p-4 animate-fade-in">
          <div className="bg-white max-w-md w-full rounded-3xl border border-slate-100 shadow-2xl p-6 relative overflow-hidden space-y-4">
            
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="text-base font-extrabold text-black font-sans flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-[#00914E]" />
                เพิ่มพนักงานคนใหม่เข้าสู่ระบบหลังบ้าน
              </h3>
              <button
                onClick={() => setShowAddUserModal(false)}
                className="text-slate-400 hover:text-black font-bold text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            {newEmpError && (
              <div className="bg-red-50 text-red-600 border border-red-100 text-xs p-3 rounded-lg font-bold">
                ⚠️ {newEmpError}
              </div>
            )}

            <form onSubmit={handleAddUserSubmit} className="space-y-4 text-xs font-semibold">
              <div>
                <label className="block text-[11px] font-bold text-slate-400 mb-1 leading-none uppercase">รหัสพนักงาน (6 หลัก)</label>
                <input
                  type="text"
                  maxLength={6}
                  value={newEmpId}
                  onChange={(e) => setNewEmpId(e.target.value.replace(/\D/g, ''))}
                  placeholder="เช่น 100344"
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3.5 py-3 outline-none focus:border-[#00914E] focus:bg-white text-sm font-bold font-mono"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 mb-1 leading-none uppercase">ชื่อจริง</label>
                  <input
                    type="text"
                    value={newEmpName}
                    onChange={(e) => setNewEmpName(e.target.value)}
                    placeholder="เช่น สมชาย"
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3.5 py-3 outline-none focus:border-[#00914E] focus:bg-white font-bold"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-400 mb-1 leading-none uppercase">นามสกุล</label>
                  <input
                    type="text"
                    value={newEmpSurname}
                    onChange={(e) => setNewEmpSurname(e.target.value)}
                    placeholder="เช่น สุขสำราญ"
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3.5 py-3 outline-none focus:border-[#00914E] focus:bg-white font-bold"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-400 mb-1 leading-none uppercase">ชื่อเล่นแสดงผล</label>
                <input
                  type="text"
                  value={newEmpNickname}
                  onChange={(e) => setNewEmpNickname(e.target.value)}
                  placeholder="เช่น หนุ่ย"
                  maxLength={15}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3.5 py-3 outline-none focus:border-[#00914E] focus:bg-white font-bold"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-400 mb-1 leading-none uppercase">ฝ่าย / แผนกงาน</label>
                <select
                  value={newEmpDept}
                  onChange={(e) => setNewEmpDept(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3.5 py-3 outline-none focus:border-[#00914E] focus:bg-white text-xs font-bold cursor-pointer"
                >
                  {departments.map(d => (
                    <option key={d.id} value={d.id}>{d.nameTh}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-400 mb-1 leading-none uppercase">วันเกิด</label>
                <input
                  type="date"
                  value={newEmpBirthDate}
                  onChange={(e) => setNewEmpBirthDate(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3.5 py-3 outline-none focus:border-[#00914E] focus:bg-white text-sm font-bold font-mono"
                  required
                />
                <p className="mt-1 text-[10px] text-slate-400 font-bold">ระบบจะคำนวณอายุและสร้างรหัสผ่านรูปแบบ DDMMYY พ.ศ. ให้อัตโนมัติ</p>
              </div>

              <div className="flex gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAddUserModal(false)}
                  className="w-1/2 bg-slate-100 hover:bg-slate-200 text-slate-700 py-3 rounded-lg text-xs font-bold transition-all cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={isSavingUser}
                  className="w-1/2 bg-[#00914E] hover:bg-[#00703c] disabled:bg-slate-350 text-white py-3 rounded-lg text-xs font-extrabold transition-all cursor-pointer shadow-sm"
                >
                  {isSavingUser ? 'กำลังบันทึกลง Sheets...' : 'เพิ่มพนักงานสำเร็จ'}
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

      {/* MODAL 2: TICKET ADJUST SELECTOR */}
      {adjustingUser && (
        <div className="fixed inset-0 bg-[#000000]/60 backdrop-blur-xs flex items-center justify-center z-55 p-4 animate-fade-in">
          <div className="bg-white max-w-sm w-full rounded-3xl border border-slate-100 shadow-2xl p-6 relative overflow-hidden space-y-4">
            
            <div className="flex items-center justify-between border-b border-gray-150 pb-3">
              <h3 className="text-sm font-extrabold text-black flex items-center gap-2">
                <Ticket className="w-5 h-5 text-amber-500" />
                ปรับยอดสิทธิ "ตั๋วทองจับฉลาก"
              </h3>
              <button
                onClick={() => setAdjustingUser(null)}
                className="text-slate-400 hover:text-black font-bold text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-3 bg-[#E8F5E9] rounded-2xl flex items-center gap-3">
              <div className="bg-[#00914E] text-white w-9 h-9 rounded-xl flex items-center justify-center font-black text-sm">
                {adjustingUser.nickname[0] || 'U'}
              </div>
              <div>
                <p className="font-extrabold text-xs text-black">{adjustingUser.name}</p>
                <p className="text-[10px] text-slate-600 font-semibold">{adjustingUser.employeeId} • ฝ่ายย่อย</p>
              </div>
            </div>

            <div className="space-y-2 text-center py-4">
              <p className="text-xs font-bold text-slate-400">ยอดตั๋วปัจจุบัน: <strong className="text-black font-mono text-sm">{adjustingUser.totalTickets} ใบ</strong></p>
              
              <div className="flex items-center justify-center gap-4 mt-3">
                <button
                  type="button"
                  onClick={() => setTicketDelta(prev => prev - 1)}
                  className="w-10 h-10 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center font-black text-lg text-slate-700 cursor-pointer transition-colors"
                >
                  -
                </button>
                <div className="text-2xl font-black font-mono w-14">
                  {ticketDelta > 0 ? `+${ticketDelta}` : ticketDelta}
                </div>
                <button
                  type="button"
                  onClick={() => setTicketDelta(prev => prev + 1)}
                  className="w-10 h-10 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center font-black text-lg text-slate-700 cursor-pointer transition-colors"
                >
                  +
                </button>
              </div>

              <div className="text-[10px] text-amber-600/90 font-bold mt-2">
                ยอดตั๋วใหม่ที่จะเซฟลงฐานข้อมูล: <span className="font-mono">{Math.max(0, adjustingUser.totalTickets + ticketDelta)} ใบ</span>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setAdjustingUser(null)}
                className="w-1/2 bg-slate-100 hover:bg-slate-200 text-slate-700 py-3 rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                ย้อนกลับ
              </button>
              <button
                onClick={handleUpdateTickets}
                disabled={isUpdatingTickets}
                className="w-1/2 bg-[#00914E] hover:bg-[#00703c] disabled:bg-slate-350 text-white py-3 rounded-xl text-xs font-extrabold transition-all cursor-pointer shadow-sm"
              >
                {isUpdatingTickets ? 'กำลังเซฟไฟล์...' : 'บันทึกยอดตั๋ว'}
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
