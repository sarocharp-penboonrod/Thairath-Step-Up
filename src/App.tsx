import React, { useState, useEffect } from 'react';
import { 
  INITIAL_DEPARTMENTS, 
  INITIAL_USER, 
  ACTIVE_WEEKS 
} from './mockData';
import { ActiveUser, StepLog, DepartmentInfo } from './types';
import Header from './components/Header';
import DashboardView from './components/DashboardView';
import SubmissionView from './components/SubmissionView';
import LeaderboardView from './components/LeaderboardView';
import SettingsPanel from './components/SettingsPanel';
import HistoryDrawer from './components/HistoryDrawer';
import LoginView from './components/LoginView';
import AdminPortalView from './components/AdminPortalView';
import { LayoutGrid, Trophy, Cloud, RefreshCw } from 'lucide-react';
import { 
  createUserOrUpdateProfile, 
  fetchUserLogs, 
  saveUserLog, 
  deleteUserLog, 
  calculateSheetsLeaderboard 
} from './sheetsBackend';
import { getDefaultCampaignMonth } from './campaignConfig';

export default function App() {
  // 1. Core States
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(() => {
    const saved = localStorage.getItem('thairath_is_logged_in');
    return saved === 'true';
  });

  const [activeUser, setActiveUser] = useState<ActiveUser>(() => {
    const saved = localStorage.getItem('thairath_active_user');
    return saved ? JSON.parse(saved) : INITIAL_USER;
  });

  // Keep a local replica of stepLogs and departments that match Google Sheets backend
  const [stepLogs, setStepLogs] = useState<StepLog[]>([]);
  const [departments, setDepartments] = useState<DepartmentInfo[]>(INITIAL_DEPARTMENTS);
  const [currentWeek, setCurrentWeek] = useState<number>(() => {
    const saved = localStorage.getItem('thairath_current_week');
    return saved ? parseInt(saved) : getDefaultCampaignMonth();
  });

  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const showcaseEnabled = import.meta.env.VITE_ENABLE_SHOWCASE === 'true';
  const [layoutMode, setLayoutMode] = useState<'single' | 'storyboard'>('single');
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [isAdminMode, setIsAdminMode] = useState<boolean>(() => {
    const saved = localStorage.getItem('thairath_is_admin_mode');
    return saved === 'true';
  });

  useEffect(() => {
    localStorage.setItem('thairath_is_admin_mode', isAdminMode ? 'true' : 'false');
  }, [isAdminMode]);
  const [isHistoryOpen, setIsHistoryOpen] = useState<boolean>(false);
  const [dbSyncing, setDbSyncing] = useState<boolean>(false);

  // Sync to LocalStorage (Identity mapping)
  useEffect(() => {
    localStorage.setItem('thairath_active_user', JSON.stringify(activeUser));
  }, [activeUser]);

  useEffect(() => {
    localStorage.setItem('thairath_current_week', currentWeek.toString());
  }, [currentWeek]);

  useEffect(() => {
    localStorage.setItem('thairath_is_logged_in', isLoggedIn ? 'true' : 'false');
  }, [isLoggedIn]);

  // Load user logs and leaderboard from Google Sheets
  const loadDatabaseData = async () => {
    if (isLoggedIn && activeUser?.email) {
      setDbSyncing(true);
      try {
        const fetchedLogs = await fetchUserLogs(activeUser.email);
        setStepLogs(fetchedLogs);

        const lb = await calculateSheetsLeaderboard(currentWeek);
        setDepartments(lb);
      } catch (err) {
        console.error('Error syncing with live Google Sheets:', err);
      } finally {
        setDbSyncing(false);
      }
    } else {
      setDepartments(INITIAL_DEPARTMENTS);
    }
  };

  useEffect(() => {
    loadDatabaseData();
  }, [isLoggedIn, activeUser?.email, currentWeek]);

  const refreshLeaderboardOnly = async () => {
    try {
      const lb = await calculateSheetsLeaderboard(currentWeek);
      setDepartments(lb);
    } catch (err) {
      console.error(err);
    }
  };

  // 3. Callback handlers with Cloud persistence
  const handleAddLog = async (
    steps: number, 
    date: string, 
    imageName: string, 
    imagePreview?: string,
    weekNumber?: number,
    weekOfMonth?: number
  ) => {
    const targetWeek = weekNumber || currentWeek;
    const newLog: StepLog = {
      id: `log-${Date.now()}`,
      steps,
      date,
      week: targetWeek,
      weekOfMonth,
      imageName,
      imagePreview,
      submittedAt: new Date().toISOString()
    };

    const isDuplicate = stepLogs.some((log) =>
      Number(log.week) === Number(targetWeek) && Number(log.weekOfMonth) === Number(weekOfMonth)
    );
    if (isDuplicate) {
      throw new Error('คุณส่งข้อมูลของเดือนและสัปดาห์นี้แล้ว กรุณาติดต่อ Admin หากต้องการแก้ไข');
    }

    if (!activeUser?.email) {
      throw new Error('ไม่พบข้อมูลผู้ใช้งาน กรุณาออกจากระบบและเข้าสู่ระบบใหม่');
    }

    setDbSyncing(true);
    try {
      await saveUserLog(activeUser.email, newLog);
      setStepLogs(prev => [newLog, ...prev]);
      setActiveUser(prev => ({ ...prev, lastSubmitAt: newLog.submittedAt }));
      await refreshLeaderboardOnly();
    } catch (err) {
      console.error(err);
      throw err;
    } finally {
      setDbSyncing(false);
    }
  };

  const handleDeleteLog = async (id: string) => {
    if (window.confirm('คุณต้องการลบรายงานตัวนี้ออกจากการคำนวณจริงในระบบ Google Sheetsหรือไม่?')) {
      setDbSyncing(true);
      try {
        await deleteUserLog(id);
        setStepLogs(prev => prev.filter(log => log.id !== id));
        await refreshLeaderboardOnly();
      } catch (err) {
        console.error(err);
        window.alert('ไม่สามารถลบรายการได้ กรุณาลองใหม่อีกครั้ง');
      } finally {
        setDbSyncing(false);
      }
    }
  };

  const handleUpdateActiveUser = async (updatedUser: ActiveUser) => {
    setActiveUser(updatedUser);
    if (updatedUser.email) {
      setDbSyncing(true);
      try {
        await createUserOrUpdateProfile(updatedUser.email, updatedUser);
        await refreshLeaderboardOnly();
      } catch (err) {
        console.error(err);
      } finally {
        setDbSyncing(false);
      }
    }
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setIsAdminMode(false);
    localStorage.removeItem('thairath_is_logged_in');
    localStorage.removeItem('thairath_active_user');
    localStorage.removeItem('thairath_is_admin_mode');
    setStepLogs([]);
  };


  return (
    <div className="min-h-screen bg-[#F2F4F7] text-[#344054] font-sans overflow-x-hidden pb-12">
      
      {/* Optional showcase controls. Hidden in production unless VITE_ENABLE_SHOWCASE=true. */}
      {showcaseEnabled && (
      <div className="bg-[#000000] text-white py-2.5 px-4 sticky top-0 z-50 shadow-xs">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3 text-xs md:text-sm font-semibold">
          <div className="flex items-center gap-2">
            <LayoutGrid className="w-4 h-4 text-emerald-400" />
            <span className="text-gray-200">โหมดการแสดงภาพหน้าจอ:</span>
            <div className="inline-flex bg-white/10 p-0.5 rounded-lg border border-white/15">
              <button
                id="layout-single-btn"
                onClick={() => setLayoutMode('single')}
                className={`px-3 py-1 rounded-md text-xs font-bold transition-all cursor-pointer ${
                  layoutMode === 'single'
                    ? 'bg-white text-black shadow-xs'
                    : 'text-gray-300 hover:text-white'
                }`}
              >
                🎮 แท็บเดี่ยวสะดวกรวดเร็ว (Interactive)
              </button>
              <button
                id="layout-storyboard-btn"
                onClick={() => setLayoutMode('storyboard')}
                className={`px-3 py-1 rounded-md text-xs font-bold transition-all cursor-pointer ${
                  layoutMode === 'storyboard'
                    ? 'bg-white text-black shadow-xs'
                    : 'text-gray-300 hover:text-white'
                }`}
              >
                📱 สตอรี่บอร์ด 3 หน้าจอพร้อมกัน (Showcase)
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {dbSyncing && (
              <span className="flex items-center gap-1 text-[11px] bg-emerald-950 text-emerald-300 px-2 py-0.5 rounded border border-emerald-500/20 animate-pulse font-mono">
                <RefreshCw className="w-3 h-3 animate-spin text-emerald-400" />
                SHEETS SYNCING...
              </span>
            )}
            <span className="text-[11px] bg-emerald-900/40 text-emerald-300 px-2.5 py-0.5 rounded border border-emerald-500/30 font-extrabold flex items-center gap-1.5 uppercase font-mono">
              <Cloud className="w-3.5 h-3.5" />
              Live DB
            </span>
          </div>
        </div>
      </div>
      )}

      {/* Render Main App Header */}
      {(!showcaseEnabled || layoutMode === 'single') && isLoggedIn && !isAdminMode ? (
        <Header 
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          activeUser={activeUser}
          departments={departments}
          onOpenSettings={() => setIsSettingsOpen(true)}
          onLogout={handleLogout}
          onOpenAdmin={() => setIsAdminMode(true)}
        />
      ) : null}

      {/* Primary Display Content */}
      {!isLoggedIn ? (
        <LoginView 
          departments={INITIAL_DEPARTMENTS}
          onLoginSuccess={(user) => {
            setActiveUser(user);
            setIsLoggedIn(true);
            setActiveTab('dashboard');
            if (user.nickname === 'Admin') {
              setIsAdminMode(true);
            }
          }}
        />
      ) : (
        isAdminMode ? (
          <div className="animate-fade-in">
            <AdminPortalView 
              departments={departments}
              onExit={() => setIsAdminMode(false)}
            />
          </div>
        ) : (
          <main className="max-w-7xl mx-auto px-4 md:px-6 pt-6 animate-fade-in relative">
          
          {dbSyncing && stepLogs.length === 0 && (
            <div className="absolute inset-x-0 top-12 flex justify-center z-40">
              <div className="bg-white px-4 py-2.5 rounded-full border border-slate-200 shadow-lg text-xs font-bold flex items-center gap-2.5 text-[#008148]">
                <div className="w-4.5 h-4.5 border-2 border-[#008148] border-t-transparent rounded-full animate-spin"></div>
                กำลังโหลดข้อมูลพนักงานจริงจาก Thairath Google Sheets...
              </div>
            </div>
          )}

          {!showcaseEnabled || layoutMode === 'single' ? (
          
          /* ------------------- INTERACTIVE MODE ------------------- */
          <div className="space-y-6">
            {activeTab === 'dashboard' && (
              <DashboardView 
                activeUser={activeUser}
                stepLogs={stepLogs}
                currentWeek={currentWeek}
                weeks={ACTIVE_WEEKS}
                setActiveTab={setActiveTab}
                onDeleteLog={handleDeleteLog}
                onOpenHistory={() => setIsHistoryOpen(true)}
                setCurrentWeek={setCurrentWeek}
              />
            )}
            
            {activeTab === 'submission' && (
              <SubmissionView 
                activeUser={activeUser}
                currentWeek={currentWeek}
                stepLogs={stepLogs}
                onAddLog={handleAddLog}
                setActiveTab={setActiveTab}
              />
            )}

            {activeTab === 'leaderboard' && (
              <LeaderboardView 
                departments={departments}
                activeUser={activeUser}
                currentMonth={currentWeek}
              />
            )}
          </div>

        ) : (

          /* ------------------- STORYBOARD SHOWCASE MODE ------------------- */
          <div className="space-y-12">
            
            {/* Notification */}
            <div className="bg-[#e6f5ee] border-l-4 border-[#008148] p-4.5 rounded-r-2xl border border-transparent">
              <h3 className="text-sm font-extrabold text-[#000000] flex items-center gap-2">
                <Trophy className="w-4.5 h-4.5 text-amber-500" />
                โหมดดึงดูดสายตา: สตอรี่บอร์ดรีวิว 3 หน้าจอเชื่อมต่อฐานข้อมูล Google Sheets จริง
              </h3>
              <p className="text-xs text-[#344054] font-medium leading-relaxed mt-1">
                เพื่อตอบรับการใช้งานจริง ทุกการกระทำบนจำลองทั้ง 3 หน้านี้ เช่นการรายงานภาพก้าวหรือสลับแผนก จะถูกเซฟเข้าสู่คลาวด์ดาต้าเบสของไทยรัฐโดยตรง และคำนวณสถิติเฉลี่ยร่วมส่งต่อพร้อมเพรียงกันทันที!
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  onClick={() => setIsSettingsOpen(true)}
                  className="bg-[#008148] hover:bg-[#005a32] text-white text-xs font-bold px-4 py-2 rounded-xl transition-all cursor-pointer shadow-xs"
                >
                  ⚙️ ตั้งค่าความท้าทาย (Settings)
                </button>
                <button
                  onClick={() => setIsHistoryOpen(true)}
                  className="bg-white border border-gray-200 text-[#344054] hover:bg-gray-100 text-xs font-bold px-4 py-2 rounded-xl transition-all cursor-pointer shadow-xs"
                >
                  📋 ตรวจสอบประวัติทั้งหมด (History)
                </button>
                <button
                  onClick={loadDatabaseData}
                  className="bg-emerald-500/10 hover:bg-emerald-500/20 text-[#008148] border border-emerald-500/20 text-xs font-bold px-4 py-2 rounded-xl transition-all cursor-pointer"
                >
                  🔄 ดึงข้อมูลล่าสุด (Force Sync)
                </button>
              </div>
            </div>

            {/* SCREEN 1: DASHBOARD BOX */}
            <div className="space-y-3">
              <div className="inline-flex bg-slate-800 text-white px-4 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wide">
                หน้าจอที่ 1: หน้าหลักพนักงาน (Dashboard - Live Stream)
              </div>
              <div className="bg-[#F2F4F7] border border-gray-300 rounded-3xl p-1 shadow-md bg-radial-gradient">
                {/* Simulated browser header */}
                <div className="bg-white border-b-2 border-gray-100 px-6 py-4.5 rounded-t-3xl flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="font-extrabold text-[#008148] text-base font-sans leading-none">Thairath Logistics</span>
                    <span className="text-gray-300">|</span>
                    <span className="text-[10px] bg-[#e6f5ee] text-[#008148] font-black px-2 py-0.5 rounded border border-[#008148]/10">Cloud Sync Active</span>
                  </div>
                  <div className="flex items-center gap-4 text-xs font-bold text-gray-500">
                    <span className="text-[#008148] font-black underline decoration-[#FFCC00] decoration-2 underline-offset-4">Dashboard</span>
                    <span>ส่งผลก้าว</span>
                    <span>Leaderboard</span>
                  </div>
                </div>
                <div className="bg-[#f8fafc] px-6 py-8 rounded-b-3xl">
                  <DashboardView 
                    activeUser={activeUser}
                    stepLogs={stepLogs}
                    currentWeek={currentWeek}
                    weeks={ACTIVE_WEEKS}
                    setActiveTab={setActiveTab}
                    onDeleteLog={handleDeleteLog}
                    onOpenHistory={() => setIsHistoryOpen(true)}
                    setCurrentWeek={setCurrentWeek}
                  />
                </div>
              </div>
            </div>

            {/* SCREEN 2: SUBMISSIONS BOX */}
            <div className="space-y-3">
              <div className="inline-flex bg-slate-800 text-white px-4 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wide">
                หน้าจอที่ 2: ฟอร์มรายงานตัวภาพสกรีนช็อตก้าว (Live Input Form)
              </div>
              <div className="bg-[#F2F4F7] border border-gray-300 rounded-3xl p-1 shadow-md">
                {/* Simulated Browser Header */}
                <div className="bg-white border-b-2 border-gray-100 px-6 py-4.5 rounded-t-3xl flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="font-extrabold text-[#008148] text-base font-sans leading-none">Thairath Logistics</span>
                    <span className="text-gray-300">|</span>
                    <span className="text-[10px] bg-[#e6f5ee] text-[#008148] font-black px-2 py-0.5 rounded border border-[#008148]/10">Submission Form</span>
                  </div>
                  <div className="flex items-center gap-4 text-xs font-bold text-gray-500">
                    <span>Dashboard</span>
                    <span className="text-[#008148] font-black underline decoration-[#FFCC00] decoration-2 underline-offset-4">ส่งผลก้าว</span>
                    <span>Leaderboard</span>
                  </div>
                </div>
                <div className="bg-[#f8fafc] px-6 py-8 rounded-b-3xl">
                  <SubmissionView 
                    activeUser={activeUser}
                    currentWeek={currentWeek}
                    stepLogs={stepLogs}
                    onAddLog={handleAddLog}
                    setActiveTab={setActiveTab}
                  />
                </div>
              </div>
            </div>

            {/* SCREEN 3: LEADERBOARD BOX */}
            <div className="space-y-3">
              <div className="inline-flex bg-slate-800 text-white px-4 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wide">
                หน้าจอที่ 3: บอร์ดรวมคะแนนเฉลี่ยพนักงานเรียลไทม์ (Unified Leaderboard)
              </div>
              <div className="bg-[#F2F4F7] border border-gray-300 rounded-3xl p-1 shadow-md">
                {/* Simulated Browser Header */}
                <div className="bg-white border-b-2 border-gray-100 px-6 py-4.5 rounded-t-3xl flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="font-extrabold text-[#008148] text-base font-sans leading-none">Thairath Logistics</span>
                    <span className="text-gray-300">|</span>
                    <span className="text-[10px] bg-[#e6f5ee] text-[#008148] font-black px-2 py-0.5 rounded border border-[#008148]/10">Leaderboard Active</span>
                  </div>
                  <div className="flex items-center gap-4 text-xs font-bold text-gray-500">
                    <span>Dashboard</span>
                    <span>ส่งผลก้าว</span>
                    <span className="text-[#008148] font-black underline decoration-[#FFCC00] decoration-2 underline-offset-4">Leaderboard</span>
                  </div>
                </div>
                <div className="bg-[#f8fafc] px-6 py-8 rounded-b-3xl">
                  <LeaderboardView 
                    departments={departments}
                    activeUser={activeUser}
                    currentMonth={currentWeek}
                  />
                </div>
              </div>
            </div>

          </div>
        )}

      </main>
        )
      )}

      {/* 4. Common Overlays */}
      <SettingsPanel 
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        activeUser={activeUser}
        setActiveUser={handleUpdateActiveUser}
        departments={departments}
      />

      <HistoryDrawer 
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        stepLogs={stepLogs}
        weeks={ACTIVE_WEEKS}
        onDeleteLog={handleDeleteLog}
      />

    </div>
  );
}
