import React, { useState } from 'react';
import { Lock, User, ArrowRight, Eye, EyeOff, ShieldCheck, Building2 } from 'lucide-react';
import { ActiveUser, DepartmentInfo, EmployeeLoginResult } from '../types';
import { verifyEmployeeLogin, verifyAdminLogin, createUserOrUpdateProfile } from '../sheetsBackend';
import { CAMPAIGN_WEEKLY_TARGET } from '../campaignConfig';

interface LoginViewProps {
  departments: DepartmentInfo[];
  currentMonth: number;
  onLoginSuccess: (user: ActiveUser, bootstrap?: EmployeeLoginResult) => void;
}

export default function LoginView({ currentMonth, onLoginSuccess }: LoginViewProps) {
  const [loading, setLoading] = useState(false);
  const [isAdminLogin, setIsAdminLogin] = useState(false);
  const [employeeId, setEmployeeId] = useState('');
  const [password, setPassword] = useState('');
  const [signinError, setSigninError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [firstTimeSetupActive, setFirstTimeSetupActive] = useState(false);
  const [pendingResult, setPendingResult] = useState<EmployeeLoginResult | null>(null);
  const [newNickname, setNewNickname] = useState('');
  const [newUserError, setNewUserError] = useState('');

  const handleSignInSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSigninError('');
    setFirstTimeSetupActive(false);
    const cleanId = employeeId.trim();
    const cleanPassword = password.trim();

    if (isAdminLogin) {
      if (!cleanId || !cleanPassword) return setSigninError('กรุณากรอกชื่อบัญชีและรหัสผ่าน Admin');
      setLoading(true);
      try {
        const session = await verifyAdminLogin(cleanId, cleanPassword);
        onLoginSuccess({
          employeeId: 'ADMIN',
          email: 'admin@thairathgroup.com',
          name: session.displayName || 'ผู้ดูแลระบบ Thairath Step Up',
          nickname: 'Admin',
          buId: session.allowedBUIds.includes('ALL') ? 'ALL' : session.allowedBUIds[0] || 'ALL',
          departmentId: 'admin',
          weekTarget: CAMPAIGN_WEEKLY_TARGET,
          totalTickets: 0
        });
      } catch (error: any) {
        setSigninError(error.message || 'เกิดข้อผิดพลาดในการตรวจสอบสิทธิ์ Admin');
      } finally {
        setLoading(false);
      }
      return;
    }

    if (!/^\d{6}$/.test(cleanId)) return setSigninError('กรุณากรอกรหัสพนักงานเป็นตัวเลข 6 หลัก');
    if (!/^\d{6}$/.test(cleanPassword)) return setSigninError('กรุณากรอกรหัสผ่านวันเดือนปีเกิด 6 หลัก พ.ศ.');

    setLoading(true);
    try {
      // Login returns only this employee's profile/logs plus compact leaderboard data in one request.
      const result = await verifyEmployeeLogin(cleanId, cleanPassword, currentMonth);
      const profile: ActiveUser = {
        ...result.profile,
        employeeId: cleanId,
        email: result.profile.email || `${cleanId}@thairathgroup.com`
      };
      if (result.requiresSetup) {
        setPendingResult({ ...result, profile });
        setNewNickname(profile.nickname || '');
        setFirstTimeSetupActive(true);
        return;
      }
      onLoginSuccess(profile, { ...result, profile });
    } catch (error: any) {
      setSigninError(error.message || 'เกิดข้อผิดพลาดจากระบบฐานข้อมูล');
    } finally {
      setLoading(false);
    }
  };

  const handleFirstTimeSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setNewUserError('');
    if (!newNickname.trim()) return setNewUserError('กรุณากรอกชื่อเล่นเพื่อแสดงในระบบ');
    if (!pendingResult) return setNewUserError('ไม่พบข้อมูลยืนยันตัวตน กรุณาเข้าสู่ระบบใหม่');

    setLoading(true);
    try {
      const newUser: ActiveUser = {
        ...pendingResult.profile,
        nickname: newNickname.trim(),
        weekTarget: CAMPAIGN_WEEKLY_TARGET
      };
      await createUserOrUpdateProfile(newUser.employeeId || '', newUser, password.trim());
      onLoginSuccess(newUser, { ...pendingResult, profile: newUser, requiresSetup: false });
    } catch (error: any) {
      setNewUserError(`เกิดปัญหาในการบันทึกโปรไฟล์: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between py-10 px-4 sm:px-6 lg:px-8 font-sans relative">
      <div className="absolute top-4 right-4 z-20 md:top-6 md:right-8">
        <button
          type="button"
          onClick={() => { setIsAdminLogin((value) => !value); setSigninError(''); setFirstTimeSetupActive(false); }}
          className={`px-4 py-2.5 rounded-xl text-xs font-black flex items-center gap-2 cursor-pointer shadow-sm border ${isAdminLogin ? 'bg-[#00914E] text-white border-[#00914E]' : 'bg-white text-slate-700 border-slate-200'}`}
        >
          <ShieldCheck className="w-4 h-4" />
          {isAdminLogin ? 'สำหรับพนักงาน' : 'Admin Center'}
        </button>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="mb-3 max-w-[290px] mx-auto select-none">
          <svg viewBox="0 0 350 135" className="w-full h-auto" fill="none" xmlns="http://www.w3.org/2000/svg">
            <text x="50%" y="44" textAnchor="middle" fill="#00914E" style={{ fontSize: '38px', fontWeight: '900', fontFamily: 'Prompt, sans-serif', letterSpacing: '0.04em' }}>THAIRATH</text>
            <text x="68" y="80" fill="#000000" style={{ fontFamily: 'Prompt, sans-serif', fontWeight: '800', fontSize: '28px' }}>HEALTH</text>
            <text x="208" y="80" fill="#00914E" style={{ fontFamily: 'Prompt, sans-serif', fontWeight: '900', fontSize: '28px' }}>Up!</text>
            <path d="M 38 102 L 162 102 L 170 94 L 176 110 L 186 58 L 197 132 L 208 102 L 215 92 L 221 102 L 312 102" stroke="#E8F5E9" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" opacity="0.6" />
            <path d="M 38 102 L 162 102 L 170 94 L 176 110 L 186 58 L 197 132 L 208 102 L 215 92 L 221 102 L 312 102" stroke="#00914E" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" className="animate-ecg-line" />
          </svg>
        </div>
        <p className="text-sm text-slate-500 font-bold flex items-center justify-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[#00914E] animate-pulse" /> Step Up Together
        </p>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 shadow-xl rounded-3xl border border-slate-100 relative">
          {loading && (
            <div className="absolute inset-0 z-30 bg-white/90 rounded-3xl flex flex-col items-center justify-center">
              <div className="w-8 h-8 border-3 border-[#00914E] border-t-transparent rounded-full animate-spin" />
              <p className="text-sm font-bold text-[#00914E] mt-3">กำลังโหลดข้อมูลที่จำเป็น...</p>
            </div>
          )}

          {!firstTimeSetupActive ? (
            <form onSubmit={handleSignInSubmit} className="space-y-5">
              <div className="text-center mb-5">
                <h3 className="text-xl font-black text-black">{isAdminLogin ? 'เข้าสู่ระบบผู้ดูแล' : 'ลงชื่อเข้าใช้งาน'}</h3>
                <p className="text-xs text-slate-500 mt-1">ระบบจะโหลดเฉพาะข้อมูลที่เกี่ยวข้องกับผู้ใช้งาน</p>
              </div>
              {signinError && <div className="p-3.5 bg-red-50 text-red-600 rounded-xl border border-red-100 text-sm font-bold">⚠️ {signinError}</div>}
              <Field label={isAdminLogin ? 'ชื่อบัญชี Admin' : 'รหัสพนักงาน 6 หลัก'} icon={<User className="w-5 h-5" />}>
                <input
                  type="text"
                  value={employeeId}
                  onChange={(event) => setEmployeeId(isAdminLogin ? event.target.value : event.target.value.replace(/\D/g, '').slice(0, 6))}
                  className="field-input field-input-leading"
                  autoComplete="username"
                  required
                />
              </Field>
              <Field label={isAdminLogin ? 'รหัสผ่าน Admin' : 'วันเดือนปีเกิด 6 หลัก พ.ศ.'} icon={<Lock className="w-5 h-5" />}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(event) => setPassword(isAdminLogin ? event.target.value : event.target.value.replace(/\D/g, '').slice(0, 6))}
                  className="field-input field-input-leading field-input-trailing tracking-widest"
                  autoComplete="current-password"
                  required
                />
                <button type="button" onClick={() => setShowPassword((value) => !value)} className="absolute inset-y-0 right-0 z-10 w-12 flex items-center justify-center text-slate-400 hover:text-slate-600 cursor-pointer" aria-label={showPassword ? 'ซ่อนรหัสผ่าน' : 'แสดงรหัสผ่าน'}>
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </Field>
              <button type="submit" className="w-full bg-[#00914E] hover:bg-[#00703c] text-white font-extrabold py-4 rounded-xl text-sm flex items-center justify-center gap-2 cursor-pointer shadow-sm">
                Ready to STEP UP! <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          ) : (
            <form onSubmit={handleFirstTimeSubmit} className="space-y-5">
              <div className="text-center">
                <div className="inline-flex bg-emerald-50 p-3 rounded-full text-[#00914E] mb-3"><ShieldCheck className="w-7 h-7" /></div>
                <h3 className="text-lg font-black text-slate-900">ยืนยันตัวตนเรียบร้อย</h3>
                <p className="text-sm text-slate-500 mt-1">BU และฝ่ายอ้างอิงจากฐานพนักงาน คุณตั้งค่าเฉพาะชื่อเล่นได้</p>
              </div>
              <div className="bg-slate-50 p-4 rounded-xl text-sm border border-slate-100 space-y-2">
                <p>รหัสพนักงาน: <strong>{pendingResult?.profile.employeeId}</strong></p>
                <p className="flex items-center gap-2"><Building2 className="w-4 h-4 text-[#00914E]" /> BU: <strong>{pendingResult?.profile.buId || 'ยังไม่ระบุ'}</strong></p>
                <p>ฝ่าย: <strong>{pendingResult?.profile.departmentId || 'ยังไม่ระบุ'}</strong></p>
              </div>
              {newUserError && <div className="p-3 bg-red-50 text-red-600 rounded-xl text-sm font-bold">⚠️ {newUserError}</div>}
              <div>
                <label className="block text-sm font-bold text-slate-600 mb-2">ชื่อเล่นที่แสดงในระบบ</label>
                <input value={newNickname} onChange={(event) => setNewNickname(event.target.value)} maxLength={30} className="field-input" required />
              </div>
              <div className="flex gap-2">
                <button type="button" onClick={() => setFirstTimeSetupActive(false)} className="w-1/3 bg-slate-100 text-slate-700 font-bold py-3 rounded-xl text-sm cursor-pointer">กลับ</button>
                <button type="submit" className="w-2/3 bg-[#00914E] text-white font-extrabold py-3 rounded-xl text-sm cursor-pointer">เริ่มใช้งาน</button>
              </div>
            </form>
          )}
        </div>
      </div>
      <div className="mt-8 text-center text-xs text-slate-400 font-semibold">People Partner Division · Thairath Group</div>
    </div>
  );
}

function Field({ label, icon, children }: { label: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-bold text-slate-600 mb-2">{label}</label>
      <div className="relative">
        <span className="absolute inset-y-0 left-0 z-10 w-12 flex items-center justify-center text-slate-400 pointer-events-none">{icon}</span>
        {children}
      </div>
    </div>
  );
}
