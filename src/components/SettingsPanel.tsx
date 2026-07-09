import React, { useState } from 'react';
import { X, Sliders, RefreshCw, UserCheck, Trash2, Check, Sparkles, Building, Goal } from 'lucide-react';
import { ActiveUser, DepartmentInfo } from '../types';

interface SettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  activeUser: ActiveUser;
  setActiveUser: (user: ActiveUser) => void;
  departments: DepartmentInfo[];
  resetAllData: () => void;
  onAutoPopulate: () => void;
  currentWeek: number;
  weeks: { number: number; startDate: string; endDate: string }[];
  setCurrentWeek: (week: number) => void;
}

export default function SettingsPanel({
  isOpen,
  onClose,
  activeUser,
  setActiveUser,
  departments,
  resetAllData,
  onAutoPopulate,
  currentWeek,
  weeks,
  setCurrentWeek
}: SettingsPanelProps) {
  
  const [userName, setUserName] = useState<string>(activeUser.name);
  const [userNickname, setUserNickname] = useState<string>(activeUser.nickname);
  const [userDeptId, setUserDeptId] = useState<string>(activeUser.departmentId);
  const [userTarget, setUserTarget] = useState<number>(activeUser.weekTarget);
  const [showSavedMsg, setShowSavedMsg] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    setActiveUser({
      ...activeUser,
      name: userName || 'ผู้ใช้ทั่วไป',
      nickname: userNickname || 'ผู้ใช้',
      departmentId: userDeptId,
      weekTarget: userTarget || 60000
    });
    
    setShowSavedMsg(true);
    setTimeout(() => {
      setShowSavedMsg(false);
    }, 1500);
  };

  const handleInstantAutoFill = () => {
    onAutoPopulate();
    setShowSavedMsg(true);
    setTimeout(() => {
      setShowSavedMsg(false);
      onClose();
    }, 1500);
  };

  return (
    <div className="fixed inset-0 bg-[#000000]/60 backdrop-blur-xs flex justify-end z-50 animate-fade-in animate-duration-200">
      
      {/* Slide Drawer Content container */}
      <div className="bg-white w-full max-w-md h-full shadow-2xl flex flex-col justify-between overflow-hidden relative border-l border-gray-100">
        
        {/* Modal Header */}
        <div className="p-5 border-b border-gray-100 flex items-center justify-between bg-white sticky top-0 z-10">
          <div className="flex items-center gap-2 text-[#00914E]">
            <Sliders className="w-5 h-5 stroke-[2.5px]" />
            <h3 className="font-extrabold text-lg text-[#000000]">Setting</h3>
          </div>
          <button 
            id="close-settings-btn"
            onClick={onClose}
            className="p-1 px-1.5 hover:bg-[#F2F4F7] rounded-lg text-[#344054] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Scrollable Content Body */}
        <div className="p-6 overflow-y-auto space-y-7 flex-1">
          
          {/* Section 1: Active User Profile settings */}
          <form onSubmit={handleSaveProfile} className="space-y-4 bg-[#F2F4F7]/50 rounded-2xl p-4 border border-gray-150/40">
            <h4 className="text-xs font-bold text-[#000000] flex items-center gap-1.5 uppercase tracking-wide border-b border-gray-200/50 pb-2 mb-3">
              <UserCheck className="w-4 h-4 text-[#00914E]" />
              <span>1. ข้อมูลพนักงานและเป้าหมายก้าวสะสม</span>
            </h4>

            {/* Input name */}
            <div className="space-y-1">
              <label htmlFor="settings-name" className="block text-xs font-bold text-gray-500">ชื่อ-นามสกุล ของพนักงาน</label>
              <input
                id="settings-name"
                type="text"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                placeholder="ชื่อ-นามสกุลจริง..."
                className="w-full bg-white border border-gray-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold outline-none focus:border-[#00914E] transition-all"
              />
            </div>

            {/* Input Nickname */}
            <div className="space-y-1">
              <label htmlFor="settings-nickname" className="block text-xs font-bold text-gray-500">ชื่อเล่น (ใช้ขึ้น Badge)</label>
              <input
                id="settings-nickname"
                type="text"
                value={userNickname}
                onChange={(e) => setUserNickname(e.target.value)}
                placeholder="เช่น: เบ"
                className="w-full bg-white border border-gray-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold outline-none focus:border-[#00914E] transition-all"
              />
            </div>

            {/* Select Department */}
            <div className="space-y-1">
              <label htmlFor="settings-dept" className="block text-xs font-bold text-gray-400">
                <Building className="w-3 h-3 text-emerald-600 inline mr-1" />
                ฝ่าย / แผนกงานย่อย
              </label>
              <select
                id="settings-dept"
                value={userDeptId}
                onChange={(e) => setUserDeptId(e.target.value)}
                className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2.5 text-xs font-bold text-[#344054] outline-none focus:border-[#00914E] transition-all cursor-pointer"
              >
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.nameTh}
                  </option>
                ))}
              </select>
            </div>

            {/* Select target */}
            <div className="space-y-1">
              <label htmlFor="settings-target" className="block text-xs font-bold text-gray-500">
                <Goal className="w-3.5 h-3.5 text-orange-500 inline mr-1" />
                เป้าหมายก้าวสะสมต่อสัปดาห์ (ก้าว)
              </label>
              <input
                id="settings-target"
                type="number"
                value={userTarget}
                step="5000"
                onChange={(e) => setUserTarget(parseInt(e.target.value))}
                className="w-full bg-white border border-gray-200 rounded-xl px-3.5 py-2.5 text-xs font-bold outline-none focus:border-[#00914E] transition-all"
              />
            </div>

            <button
              id="save-profile-btn"
              type="submit"
              className="btn w-full bg-[#00914E] hover:bg-[#00733d] text-white font-bold py-2.5 rounded-xl text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-xs transition-colors"
            >
              <span>บันทึกข้อมูลพนักงาน</span>
              <Check className="w-3.5 h-3.5" />
            </button>
          </form>

          {/* Section 2: Reset system */}
          <div className="space-y-4 bg-rose-50/40 rounded-2xl p-4 border border-rose-100/30">
            <h4 className="text-xs font-bold text-rose-800 flex items-center gap-1.5 uppercase tracking-wide border-b border-rose-100 pb-2">
              <Trash2 className="w-4 h-4 text-rose-600" />
              <span>2. คืนค่าระบบ (Factory Reset)</span>
            </h4>
            
            <p className="text-[11px] text-gray-500 leading-relaxed">
              ต้องการลบประวัติการส่งผลจำลองทั้งหมด และเรียกคืนค่าเริ่มต้นของทาง Thairath Step Up ดั้งเดิมกดปุ่มด้านล่าง
            </p>

            <button
              id="reset-all-btn"
              onClick={() => {
                resetAllData();
                setShowSavedMsg(true);
                setTimeout(() => {
                  setShowSavedMsg(false);
                  onClose();
                }, 1500);
              }}
              className="btn w-full bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 font-bold py-2.5 px-4 rounded-xl text-xs flex items-center justify-center gap-2 cursor-pointer transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>ล้างฐานข้อมูลและคืนค่าหลัก</span>
            </button>
          </div>

        </div>

        {/* Toast confirmation overlays */}
        {showSavedMsg && (
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-black/85 text-white py-3 px-6 rounded-2xl text-xs font-bold flex items-center gap-2 shadow-xl z-30 animate-pulse">
            <Check className="w-4 h-4 text-emerald-400" />
            <span>อัปเดตการตั้งค่าเรียบร้อย!</span>
          </div>
        )}

        {/* Drawer footer */}
        <div className="p-4 bg-[#F2F4F7] border-t border-gray-100 text-center">
          <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider">
            Thairath Step Up Workspace
          </p>
        </div>

      </div>

    </div>
  );
}
