import React from 'react';
import { Activity, ShieldCheck, Award, Sliders, LogOut } from 'lucide-react';
import { ActiveUser, DepartmentInfo } from '../types';

interface HeaderProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  activeUser: ActiveUser;
  departments: DepartmentInfo[];
  onOpenSettings: () => void;
  onLogout?: () => void;
  onOpenAdmin: () => void;
}

export default function Header({
  activeTab,
  setActiveTab,
  activeUser,
  departments,
  onOpenSettings,
  onLogout,
  onOpenAdmin
}: HeaderProps) {
  const userDept = departments.find(d => d.id === activeUser.departmentId);

  return (
    <header className="bg-white border-b-2 border-[#edf2f7] sticky top-0 z-40 px-6 py-3 md:py-4 shadow-sm">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
        
        {/* Logo and App Title */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Logo vector from the uploaded brand image */}
            <div className="h-11 select-none flex items-center pr-1">
              <svg viewBox="0 0 160 55" className="h-full w-auto" fill="none" xmlns="http://www.w3.org/2000/svg">
                {/* THAIRATH Green Text */}
                <text x="0" y="20" fill="#00914E" style={{ fontSize: '20px', fontWeight: '900', fontFamily: 'Prompt, sans-serif', letterSpacing: '0.04em' }}>
                  THAIRATH
                </text>
                
                {/* HEALTH Wordmark on Left */}
                <text x="0" y="44" fill="#000000" style={{ fontFamily: 'Prompt, sans-serif', fontWeight: '800', fontSize: '15px' }} letterSpacing="0.01em">
                  HEALTH
                </text>

                {/* Up! Wordmark on Right */}
                <text x="88" y="44" fill="#00914E" style={{ fontFamily: 'Prompt, sans-serif', fontWeight: '900', fontSize: '15px' }} letterSpacing="0.01em">
                  Up!
                </text>

                {/* Pulsating heartbeat ECG line connecting them */}
                <path 
                  d="M 2 52 L 72 52 L 76 48 L 79 56 L 84 32 L 89 64 L 94 52 L 97 48 L 100 52 L 150 52" 
                  stroke="#00914E" 
                  strokeWidth="2.2" 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                />
              </svg>
            </div>
            <div className="hidden xs:block border-l border-slate-200 pl-3">
              <span className="text-[10px] bg-[#E8F5E9] text-[#00914E] px-2.5 py-1 rounded-md font-extrabold uppercase tracking-widest shadow-2xs border border-emerald-100">
                CHALLENGE
              </span>
            </div>
          </div>

          {/* Settings icon for mobile */}
          <button 
            onClick={onOpenSettings}
            className="md:hidden bg-[#F2F4F7] hover:bg-[#e6f5ee] p-2.5 rounded-xl text-[#344054] hover:text-[#008148] transition-colors"
            title="Setting"
          >
            <Sliders className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <nav className="flex items-center border-b border-gray-100 md:border-0 overflow-x-auto gap-1 md:gap-2 pt-1 md:pt-0 scrollbar-none [scrollbar-width:none]">
          {[
            { id: 'dashboard', label: 'Dashboard', icon: Activity },
            { id: 'submission', label: 'ส่งผลก้าว', icon: ShieldCheck },
            { id: 'leaderboard', label: 'Leaderboard', icon: Award }
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                id={`nav-tab-${tab.id}`}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-[14px] transition-all whitespace-nowrap cursor-pointer ${
                  isActive
                    ? 'text-[#008148] bg-[#e6f5ee] border-b-2 border-[#008148] md:border-b-0 shadow-xs'
                    : 'text-[#344054] hover:bg-[#F2F4F7] hover:text-[#000000]'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'stroke-[2.5px]' : ''}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>

        {/* User Badge & Simulator Control */}
        <div className="flex items-center justify-between md:justify-end gap-3 border-t border-gray-100 md:border-t-0 pt-3 md:pt-0">

          {/* Setting Trigger & Profile */}
          <div className="flex items-center gap-3">
            {/* Admin Console Entry */}
            {activeUser.nickname === 'Admin' && (
              <button
                onClick={onOpenAdmin}
                className="flex items-center gap-1.5 bg-[#E8F5E9] border border-emerald-300 text-[#00914E] hover:bg-[#d4edd9] px-3.5 py-2 rounded-xl font-extrabold text-xs transition-all cursor-pointer shadow-3xs"
                title="เข้าสู่ระบบผู้ดูแลหลังบ้าน (Admin Console)"
              >
                <ShieldCheck className="w-4 h-4 text-[#00914E] animate-pulse" />
                <span>ระบบหลังบ้าน Admin</span>
              </button>
            )}

            <button
              onClick={onOpenSettings}
              className="hidden md:flex items-center gap-2 bg-[#F2F4F7] hover:bg-[#e6f5ee] px-3.5 py-2 rounded-xl text-[#344054] hover:text-[#00914E] font-bold text-xs transition-colors cursor-pointer"
              title="Setting"
            >
              <Sliders className="w-4 h-4" />
              <span>Setting</span>
            </button>

            {/* Profile Circle */}
            <div className="flex items-center gap-2.5 bg-white border border-[#edf2f7] p-1.5 pr-1.5 md:pr-2.5 rounded-xl shadow-xs">
              <div className="w-8 h-8 rounded-lg bg-[#008148] flex items-center justify-center text-white font-black text-sm">
                {activeUser.nickname[0] || 'U'}
              </div>
              <div className="text-left hidden xs:block">
                <p className="font-bold text-xs text-[#000000]">{activeUser.name}</p>
                <p className="text-[10px] text-[#344054] font-medium leading-none">
                  {userDept?.nameTh || activeUser.departmentId || 'ไม่ระบุฝ่าย'}
                </p>
              </div>

              {onLogout && (
                <button
                  onClick={onLogout}
                  className="ml-1 p-1.5 hover:bg-rose-50 text-[#344054] hover:text-rose-600 rounded-lg transition-colors cursor-pointer"
                  title="ออกจากระบบ (Log Out)"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

        </div>

      </div>
    </header>
  );
}
