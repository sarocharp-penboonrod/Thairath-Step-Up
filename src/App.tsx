import React, { useEffect, useRef, useState } from 'react';
import { INITIAL_DEPARTMENTS, INITIAL_USER, ACTIVE_WEEKS } from './mockData';
import {
  ActiveUser,
  StepLog,
  DepartmentInfo,
  BusinessUnitInfo,
  NewStepLogInput,
  EmployeeLoginResult
} from './types';
import Header from './components/Header';
import DashboardView from './components/DashboardView';
import SubmissionView from './components/SubmissionView';
import LeaderboardView from './components/LeaderboardView';
import SettingsPanel from './components/SettingsPanel';
import HistoryDrawer from './components/HistoryDrawer';
import LoginView from './components/LoginView';
import AdminPortalView from './components/AdminPortalView';
import {
  createUserOrUpdateProfile,
  fetchUserLogs,
  saveUserLog,
  calculateSheetsLeaderboard,
  seedInitialDataIfNecessary,
  getUserProfile,
  logoutAdmin
} from './sheetsBackend';
import { getDefaultCampaignMonth } from './campaignConfig';

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(() => localStorage.getItem('thairath_is_logged_in') === 'true');
  const [activeUser, setActiveUser] = useState<ActiveUser>(() => {
    const saved = localStorage.getItem('thairath_active_user');
    try { return saved ? JSON.parse(saved) : INITIAL_USER; } catch (_err) { return INITIAL_USER; }
  });
  const [stepLogs, setStepLogs] = useState<StepLog[]>([]);
  const [departments, setDepartments] = useState<DepartmentInfo[]>(INITIAL_DEPARTMENTS);
  const [businessUnits, setBusinessUnits] = useState<BusinessUnitInfo[]>([]);
  const [currentMonth, setCurrentMonth] = useState(() => {
    const saved = Number(localStorage.getItem('thairath_current_week'));
    return saved || getDefaultCampaignMonth();
  });
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isAdminMode, setIsAdminMode] = useState(() => localStorage.getItem('thairath_is_admin_mode') === 'true');
  const [dbSyncing, setDbSyncing] = useState(false);
  const [lastRefreshedAt, setLastRefreshedAt] = useState('');
  const skipNextAutoLoad = useRef(false);

  useEffect(() => { void seedInitialDataIfNecessary(); }, []);
  useEffect(() => { localStorage.setItem('thairath_active_user', JSON.stringify(activeUser)); }, [activeUser]);
  useEffect(() => { localStorage.setItem('thairath_current_week', String(currentMonth)); }, [currentMonth]);
  useEffect(() => { localStorage.setItem('thairath_is_logged_in', isLoggedIn ? 'true' : 'false'); }, [isLoggedIn]);
  useEffect(() => { localStorage.setItem('thairath_is_admin_mode', isAdminMode ? 'true' : 'false'); }, [isAdminMode]);

  const applyLeaderboard = (data: { departments: DepartmentInfo[]; businessUnits: BusinessUnitInfo[]; generatedAt: string }) => {
    setDepartments(data.departments);
    setBusinessUnits(data.businessUnits);
    setLastRefreshedAt(data.generatedAt || new Date().toISOString());
  };

  const loadDatabaseData = async () => {
    if (!isLoggedIn || isAdminMode || !activeUser?.email) return;
    setDbSyncing(true);
    try {
      const [logs, profile, leaderboard] = await Promise.all([
        fetchUserLogs(activeUser.employeeId || activeUser.email),
        getUserProfile(activeUser.employeeId || activeUser.email),
        calculateSheetsLeaderboard(currentMonth)
      ]);
      setStepLogs(logs);
      if (profile) setActiveUser(profile);
      applyLeaderboard(leaderboard);
    } catch (error) {
      console.error('Error syncing system data:', error);
    } finally {
      setDbSyncing(false);
    }
  };

  useEffect(() => {
    if (skipNextAutoLoad.current) {
      skipNextAutoLoad.current = false;
      return;
    }
    void loadDatabaseData();
  }, [isLoggedIn, isAdminMode, activeUser?.email, currentMonth]);

  const refreshLeaderboard = async () => {
    setDbSyncing(true);
    try {
      applyLeaderboard(await calculateSheetsLeaderboard(currentMonth, true));
    } finally {
      setDbSyncing(false);
    }
  };

  const handleLoginSuccess = (user: ActiveUser, bootstrap?: EmployeeLoginResult) => {
    setActiveUser(user);
    setIsLoggedIn(true);
    setActiveTab('dashboard');
    const admin = user.employeeId === 'ADMIN';
    setIsAdminMode(admin);
    if (bootstrap) {
      setStepLogs(bootstrap.logs || []);
      if (bootstrap.leaderboard) applyLeaderboard(bootstrap.leaderboard);
      skipNextAutoLoad.current = true;
    }
  };

  const handleAddLog = async (input: NewStepLogInput) => {
    if (stepLogs.some((log) => Number(log.week) === input.week && Number(log.weekOfMonth) === input.weekOfMonth)) {
      throw new Error('คุณส่งผลของเดือนและสัปดาห์นี้แล้ว กรุณาติดต่อ Admin หากต้องการแก้ไข');
    }
    if (!activeUser?.email) throw new Error('ไม่พบข้อมูลผู้ใช้งาน กรุณาเข้าสู่ระบบใหม่');
    setDbSyncing(true);
    try {
      const saved = await saveUserLog(activeUser.employeeId || activeUser.email, input);
      setStepLogs((previous) => [saved, ...previous]);
      const [profile, leaderboard] = await Promise.all([
        getUserProfile(activeUser.employeeId || activeUser.email),
        calculateSheetsLeaderboard(currentMonth)
      ]);
      if (profile) setActiveUser(profile);
      applyLeaderboard(leaderboard);
      return saved;
    } finally {
      setDbSyncing(false);
    }
  };

  const handleUpdateActiveUser = async (updatedUser: ActiveUser) => {
    setActiveUser(updatedUser);
    if (!updatedUser.email) return;
    setDbSyncing(true);
    try {
      await createUserOrUpdateProfile(updatedUser.employeeId || updatedUser.email, updatedUser);
    } finally {
      setDbSyncing(false);
    }
  };

  const handleLogout = async () => {
    if (isAdminMode) await logoutAdmin();
    setIsLoggedIn(false);
    setIsAdminMode(false);
    setStepLogs([]);
    setBusinessUnits([]);
    localStorage.removeItem('thairath_is_logged_in');
    localStorage.removeItem('thairath_active_user');
    localStorage.removeItem('thairath_is_admin_mode');
  };

  if (!isLoggedIn) {
    return <LoginView departments={INITIAL_DEPARTMENTS} currentMonth={currentMonth} onLoginSuccess={handleLoginSuccess} />;
  }

  if (isAdminMode) {
    return <AdminPortalView departments={departments} onExit={() => void handleLogout()} />;
  }

  return (
    <div className="min-h-screen bg-[#F2F4F7] text-[#344054] font-sans overflow-x-hidden pb-12">
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        activeUser={activeUser}
        departments={departments}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onLogout={() => void handleLogout()}
      />

      <main className="max-w-7xl mx-auto px-4 md:px-6 pt-6 animate-fade-in relative">
        {dbSyncing && (
          <div className="fixed bottom-5 right-5 z-40 bg-white px-4 py-3 rounded-full border border-slate-200 shadow-lg text-sm font-bold flex items-center gap-2 text-[#00914E]">
            <div className="w-4 h-4 border-2 border-[#00914E] border-t-transparent rounded-full animate-spin" /> กำลังอัปเดตข้อมูลจากระบบ
          </div>
        )}

        {activeTab === 'dashboard' && (
          <DashboardView
            activeUser={activeUser}
            stepLogs={stepLogs}
            currentWeek={currentMonth}
            weeks={ACTIVE_WEEKS}
            setActiveTab={setActiveTab}
            onOpenHistory={() => setIsHistoryOpen(true)}
            setCurrentWeek={setCurrentMonth}
          />
        )}
        {activeTab === 'submission' && (
          <SubmissionView activeUser={activeUser} currentWeek={currentMonth} stepLogs={stepLogs} onAddLog={handleAddLog} setActiveTab={setActiveTab} />
        )}
        {activeTab === 'leaderboard' && (
          <LeaderboardView
            departments={departments}
            businessUnits={businessUnits}
            activeUser={activeUser}
            currentMonth={currentMonth}
            lastRefreshedAt={lastRefreshedAt}
            isRefreshing={dbSyncing}
            onRefresh={() => void refreshLeaderboard()}
          />
        )}
      </main>

      <SettingsPanel isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} activeUser={activeUser} setActiveUser={handleUpdateActiveUser} departments={departments} />
      <HistoryDrawer isOpen={isHistoryOpen} onClose={() => setIsHistoryOpen(false)} stepLogs={stepLogs} weeks={ACTIVE_WEEKS} />
    </div>
  );
}
