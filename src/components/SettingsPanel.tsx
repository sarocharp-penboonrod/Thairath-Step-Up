import React, { useEffect, useMemo, useState } from 'react';
import { X, Sliders, UserCheck, Check, Building, Goal, BadgeInfo } from 'lucide-react';
import { ActiveUser, DepartmentInfo } from '../types';
import { CAMPAIGN_WEEKLY_TARGET } from '../campaignConfig';

interface SettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  activeUser: ActiveUser;
  setActiveUser: (user: ActiveUser) => Promise<void> | void;
  departments: DepartmentInfo[];
}

export default function SettingsPanel({
  isOpen,
  onClose,
  activeUser,
  setActiveUser,
  departments
}: SettingsPanelProps) {
  const [userNickname, setUserNickname] = useState<string>(activeUser.nickname);
  const [showSavedMsg, setShowSavedMsg] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen) setUserNickname(activeUser.nickname || '');
  }, [isOpen, activeUser.nickname]);

  const departmentName = useMemo(() => {
    return departments.find((department) => department.id === activeUser.departmentId)?.nameTh
      || activeUser.departmentId
      || 'ยังไม่ระบุฝ่าย';
  }, [departments, activeUser.departmentId]);

  if (!isOpen) return null;

  const handleSaveProfile = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsSaving(true);
    try {
      await setActiveUser({
        ...activeUser,
        nickname: userNickname.trim() || activeUser.nickname || 'ผู้ใช้'
      });
      setShowSavedMsg(true);
      window.setTimeout(() => setShowSavedMsg(false), 1500);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex justify-end z-50 animate-fade-in animate-duration-200">
      <div className="bg-white w-full max-w-md h-full shadow-2xl flex flex-col overflow-hidden relative border-l border-gray-100">
        <div className="p-5 border-b border-gray-100 flex items-center justify-between bg-white sticky top-0 z-10">
          <div className="flex items-center gap-2 text-[#00914E]">
            <Sliders className="w-5 h-5 stroke-[2.5px]" />
            <h3 className="font-extrabold text-lg text-black">ตั้งค่าโปรไฟล์</h3>
          </div>
          <button
            id="close-settings-btn"
            onClick={onClose}
            className="p-1.5 hover:bg-[#F2F4F7] rounded-lg text-[#344054] transition-colors cursor-pointer"
            aria-label="ปิดหน้าตั้งค่า"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          <div className="rounded-2xl border border-emerald-100 bg-emerald-50/60 p-4">
            <div className="flex items-start gap-2.5">
              <BadgeInfo className="w-5 h-5 text-[#00914E] mt-0.5 shrink-0" />
              <p className="text-xs text-gray-600 leading-relaxed">
                ข้อมูลชื่อ ฝ่าย และเป้าหมายประจำสัปดาห์อ้างอิงจากฐานข้อมูลพนักงาน เพื่อให้การคำนวณผลและ Leaderboard เป็นมาตรฐานเดียวกัน
              </p>
            </div>
          </div>

          <section className="space-y-3 bg-[#F8FAFC] rounded-2xl p-4 border border-gray-100">
            <h4 className="text-xs font-bold text-black flex items-center gap-1.5 uppercase tracking-wide border-b border-gray-200/60 pb-2">
              <UserCheck className="w-4 h-4 text-[#00914E]" />
              ข้อมูลพนักงาน
            </h4>

            <InfoRow label="รหัสพนักงาน" value={activeUser.employeeId || '-'} />
            <InfoRow label="ชื่อ-นามสกุล" value={activeUser.name || '-'} />
            <InfoRow
              label="ฝ่าย / หน่วยงาน"
              value={departmentName}
              icon={<Building className="w-3.5 h-3.5 text-emerald-600" />}
            />
            <InfoRow
              label="เป้าหมายต่อสัปดาห์"
              value={`${CAMPAIGN_WEEKLY_TARGET.toLocaleString('th-TH')} ก้าว`}
              icon={<Goal className="w-3.5 h-3.5 text-orange-500" />}
            />
          </section>

          <form onSubmit={handleSaveProfile} className="space-y-4 bg-white rounded-2xl p-4 border border-gray-200">
            <div>
              <label htmlFor="settings-nickname" className="block text-xs font-bold text-gray-600 mb-1.5">
                ชื่อเล่นที่แสดงในระบบ
              </label>
              <input
                id="settings-nickname"
                type="text"
                value={userNickname}
                onChange={(event) => setUserNickname(event.target.value)}
                placeholder="เช่น ฟิช"
                maxLength={30}
                className="w-full bg-white border border-gray-200 rounded-xl px-3.5 py-3 text-sm font-semibold outline-none focus:border-[#00914E] focus:ring-2 focus:ring-[#00914E]/10 transition-all"
              />
              <p className="text-[11px] text-gray-400 mt-1.5">ใช้แสดงบน Dashboard และ Leaderboard เท่านั้น</p>
            </div>

            <button
              id="save-profile-btn"
              type="submit"
              disabled={isSaving}
              className="w-full bg-[#00914E] hover:bg-[#00733d] disabled:bg-gray-300 text-white font-bold py-3 rounded-xl text-sm flex items-center justify-center gap-1.5 cursor-pointer disabled:cursor-not-allowed shadow-xs transition-colors"
            >
              <span>{isSaving ? 'กำลังบันทึก...' : 'บันทึกชื่อเล่น'}</span>
              {!isSaving && <Check className="w-4 h-4" />}
            </button>
          </form>
        </div>

        {showSavedMsg && (
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-black/85 text-white py-3 px-6 rounded-2xl text-xs font-bold flex items-center gap-2 shadow-xl z-30">
            <Check className="w-4 h-4 text-emerald-400" />
            <span>บันทึกชื่อเล่นเรียบร้อย</span>
          </div>
        )}

        <div className="p-4 bg-[#F2F4F7] border-t border-gray-100 text-center">
          <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider">
            Thairath Step Up Workspace
          </p>
        </div>
      </div>
    </div>
  );
}

function InfoRow({ label, value, icon }: { label: string; value: string; icon?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 py-1.5">
      <span className="text-xs text-gray-500 flex items-center gap-1.5">
        {icon}
        {label}
      </span>
      <span className="text-xs font-bold text-gray-800 text-right">{value}</span>
    </div>
  );
}
