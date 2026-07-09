import React, { useState, useEffect } from 'react';
import { Lock, User, Building2, ArrowRight, Eye, EyeOff, ShieldCheck } from 'lucide-react';
import { ActiveUser, DepartmentInfo } from '../types';
import { 
  seedInitialDataIfNecessary, 
  getUserProfile, 
  createUserOrUpdateProfile,
  db
} from '../firebase';
import { getDoc, doc } from 'firebase/firestore';

interface LoginViewProps {
  departments: DepartmentInfo[];
  onLoginSuccess: (user: ActiveUser) => void;
}

export default function LoginView({ departments, onLoginSuccess }: LoginViewProps) {
  const [loading, setLoading] = useState(false);
  const [isAdminLogin, setIsAdminLogin] = useState(false);
  
  // Login Form States (6-digit ID and Birthdate)
  const [employeeId, setEmployeeId] = useState('');
  const [password, setPassword] = useState('');
  const [signinError, setSigninError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // New-user First-time Sync-up States (To keep "no manual registration needed" but support custom profiles)
  const [firstTimeSetupActive, setFirstTimeSetupActive] = useState(false);
  const [newName, setNewName] = useState('');
  const [newNickname, setNewNickname] = useState('');
  const [newDept, setNewDept] = useState(departments[0]?.id || 'ceo');
  const [newAge, setNewAge] = useState<number>(30);
  const [newUserError, setNewUserError] = useState('');

  // Seed on initial mount
  useEffect(() => {
    async function initDb() {
      await seedInitialDataIfNecessary();
    }
    initDb();
  }, []);

  const handleSignInSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSigninError('');
    setFirstTimeSetupActive(false);
    
    const cleanId = employeeId.trim();
    const cleanPassword = password.trim();

    if (isAdminLogin) {
      if (!cleanId) {
        setSigninError('กรุณากรอกรหัสแอดมินหรือบัญชีผู้ดูแลระบบ');
        return;
      }
      if (!cleanPassword) {
        setSigninError('กรุณากรอกรหัสผ่านสำหรับแอดมิน');
        return;
      }

      setLoading(true);
      try {
        // Universal Back-end Access Code: Bay's employee ID 100202, or "admin", bypass pin 240845 / 999999
        if (
          (cleanId === '100202' || cleanId.toLowerCase() === 'admin' || cleanId.toLowerCase() === 'bay') && 
          (cleanPassword === '240845' || cleanPassword === '999999')
        ) {
          onLoginSuccess({
            employeeId: '100202',
            email: 'worapong.b@thairathgroup.com',
            name: 'คุณวรพงษ์ (เบ) - ผู้ดูแลระบบ',
            nickname: 'Admin',
            departmentId: 'prod_tech_tech',
            weekTarget: 60000,
            totalTickets: 99
          });
        } else {
          setSigninError('รหัสผู้ดูแลหลังบ้าน (Admin Logins / Passcode) ไม่ถูกต้อง กรุณาลองอีกครั้ง');
        }
      } catch (err: any) {
        setSigninError('เกิดข้อผิดพลาดในการตรวจสอบสิทธิ์แอดมิน: ' + err.message);
      } finally {
        setLoading(false);
      }
      return;
    }

    if (cleanId.length !== 6 || !/^\d+$/.test(cleanId)) {
      setSigninError('กรุณากรอกรหัสพนักงานเป็นตัวเลข 6 หลัก');
      return;
    }
    
    if (cleanPassword.length !== 6 || !/^\d+$/.test(cleanPassword)) {
      setSigninError('กรุณากรอกรหัสผ่านวันเดือนปีเกิดเป็นตัวเลข 6 หลัก (เช่น 120342)');
      return;
    }

    setLoading(true);
    try {
      // 1. Verify if user profile exists in Firestore
      const profile = await getUserProfile(cleanId);
      
      if (!profile) {
        // If not found in seed, since they don't have to register, let's open first-time profile creation!
        setFirstTimeSetupActive(true);
        setLoading(false);
        return;
      }

      // 2. Fetch specific document to check passphrase (password)
      const userRef = doc(db, 'users', cleanId);
      const userSnap = await getDoc(userRef);
      if (userSnap.exists()) {
        const dbData = userSnap.data();
        if (dbData.password && dbData.password !== cleanPassword) {
          setSigninError('รหัสผ่านประจำตัว (วันเดือนปีเกิด) ไม่ถูกต้อง กรุณาลองใหม่อีกครั้ง');
          setLoading(false);
          return;
        }
      }

      // 3. Complete login successfully!
      onLoginSuccess({
        ...profile,
        employeeId: cleanId,
        email: profile.email || `${cleanId}@thairathgroup.com`
      });

    } catch (err: any) {
      console.error(err);
      setSigninError('เกิดข้อผิดพลาดจากเครือข่ายฐานข้อมูลหรือ Firebase: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleFirstTimeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setNewUserError('');

    const cleanId = employeeId.trim();
    const cleanPassword = password.trim();

    if (!newNickname.trim()) {
      setNewUserError('กรุณากรอกชื่อเล่นเพื่อแสดงในระบบบอร์ด');
      return;
    }
    if (!newAge || newAge < 1 || newAge > 120) {
      setNewUserError('กรุณากรอกอายุที่ถูกต้อง (1-120 ปี)');
      return;
    }

    setLoading(true);
    try {
      const displayNickname = newNickname.trim();
      const newUser: ActiveUser = {
        name: `คุณ${displayNickname}`,
        nickname: displayNickname,
        departmentId: newDept,
        weekTarget: 60000, // Default goal is 60,000 steps per week standard
        totalTickets: 2, // 2 initial free tickets welcome gift for logging in first time!
        email: `${cleanId}@thairathgroup.com`,
        employeeId: cleanId,
        age: newAge
      };

      // Save user profile to Live Firebase Database
      await createUserOrUpdateProfile(cleanId, newUser, cleanPassword);
      onLoginSuccess(newUser);
    } catch (err: any) {
      console.error(err);
      setNewUserError('เกิดปัญหาในการสร้างโปรไฟล์พนักงานใหม่: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between py-12 px-4 sm:px-6 lg:px-8 font-sans relative">
      
      {/* Admin Center Button inside Top-Right Corner */}
      <div className="absolute top-4 right-4 z-25 md:top-6 md:right-8">
        <button
          type="button"
          onClick={() => {
            setIsAdminLogin(!isAdminLogin);
            setSigninError('');
            setFirstTimeSetupActive(false);
          }}
          className={`px-4 py-2.5 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer shadow-3xs border transition-transform active:scale-95 ${
            isAdminLogin
              ? 'bg-[#00914E] text-white border-[#00914E] hover:bg-[#00703c]'
              : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50 hover:text-black hover:border-slate-300'
          }`}
        >
          <ShieldCheck className="w-4 h-4" />
          <span>{isAdminLogin ? '👤 สำหรับพนักงาน (Employee Center)' : '🔑 Admin Center'}</span>
        </button>
      </div>
      
      {/* Spacer Header / Logo container rendering Thairath Health Up vector logo */}
      <div className="mt-4 sm:mx-auto sm:w-full sm:max-w-md text-center">
        
        {/* THAIRATH HEALTH Up! Direct animated SVG with transparent background */}
        <div className="mb-4 max-w-[290px] mx-auto select-none">
          <svg viewBox="0 0 350 135" className="w-full h-auto filter drop-shadow-[0_2px_4px_rgba(0,0,0,0.01)]" fill="none" xmlns="http://www.w3.org/2000/svg">
            {/* THAIRATH Green Text */}
            <text x="50%" y="44" textAnchor="middle" fill="#00914E" style={{ fontSize: '38px', fontWeight: '900', fontFamily: 'system-ui, -apple-system, sans-serif', letterSpacing: '0.04em' }}>
              THAIRATH
            </text>
            
            {/* HEALTH Wordmark on Left */}
            <text x="68" y="80" fill="#000000" style={{ fontFamily: 'system-ui, -apple-system, sans-serif', fontWeight: '800', fontSize: '28px' }} letterSpacing="0.01em">
              HEALTH
            </text>

            {/* Up! Wordmark on Right */}
            <text x="208" y="80" fill="#00914E" style={{ fontFamily: 'system-ui, -apple-system, sans-serif', fontWeight: '900', fontSize: '28px' }} letterSpacing="0.01em">
              Up!
            </text>

            {/* Glowing heartbeat ECG background guide line (static faint mint-silver) */}
            <path 
              d="M 38 102 L 162 102 L 170 94 L 176 110 L 186 58 L 197 132 L 208 102 L 215 92 L 221 102 L 312 102" 
              stroke="#E8F5E9" 
              strokeWidth="4" 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              opacity="0.6"
            />

            {/* Pulsating heartbeat ECG line extending as an underline and spike under the word Up! - animated! */}
            <path 
              d="M 38 102 L 162 102 L 170 94 L 176 110 L 186 58 L 197 132 L 208 102 L 215 92 L 221 102 L 312 102" 
              stroke="#00914E" 
              strokeWidth="4.5" 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              className="animate-ecg-line"
            />
          </svg>
        </div>

        <p className="mt-2 text-sm text-slate-500 font-extrabold flex items-center justify-center gap-2 text-center tracking-wide">
          <span className="w-2 h-2 rounded-full bg-[#00914E] animate-pulse"></span>
          วันนี้คุณก้าวแล้วหรือยัง?
        </p>
      </div>

      {/* Main Login Form Box in Modern Web Design style matching Thairath Careers recruitment design */}
      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-10 px-8 sm:px-10 rounded-3xl border border-slate-100 shadow-[0_12px_44px_rgba(0,0,0,0.04)] relative overflow-hidden">
          
          {loading && (
            <div className="absolute inset-0 bg-white/75 backdrop-blur-xs flex flex-col items-center justify-center z-50">
              <div className="w-10 h-10 border-4 border-[#00914E] border-t-transparent rounded-full animate-spin"></div>
              <p className="text-xs font-bold text-[#00914E] mt-3">กำลังยืนยันข้อมูลพนักงาน...</p>
            </div>
          )}

          {!firstTimeSetupActive ? (
            /* Sign In flow via Employee ID */
            <form onSubmit={handleSignInSubmit} className="space-y-6">
              
              <div className="text-center mb-6">
                <h3 className="text-[20px] font-black tracking-tight text-black">
                  {isAdminLogin ? 'สำหรับผู้ดูแลระบบ (Admin Center)' : 'ลงชื่อเข้าใช้งาน'}
                </h3>
              </div>

              {signinError && (
                <div className="p-3.5 bg-red-50 text-red-600 rounded-xl border border-red-100 text-xs font-bold leading-relaxed">
                  ⚠️ {signinError}
                </div>
              )}

              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-2">
                  {isAdminLogin ? 'ชื่อบัญชีแอดมิน (Admin ID / Email)' : 'รหัสพนักงาน (6 หลัก)'}
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-4 flex items-center text-slate-400">
                    <User className="w-4.5 h-4.5" />
                  </span>
                  <input
                    type="text"
                    value={employeeId}
                    onChange={(e) => {
                      if (isAdminLogin) {
                        setEmployeeId(e.target.value);
                      } else {
                        const val = e.target.value.replace(/\D/g, '');
                        setEmployeeId(val);
                      }
                    }}
                    placeholder=""
                    className="w-full bg-[#F8FAFC] border border-slate-250 rounded-xl pl-11 pr-4 py-4 text-sm font-semibold outline-none focus:border-[#00914E] focus:bg-white text-gray-900 transition-all font-mono focus:ring-4 focus:ring-emerald-50"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-2">
                  {isAdminLogin ? 'รหัสผ่านแอดมิน (Admin Passcode)' : 'Password (วันเดือนปีเกิด 6 หลัก พ.ศ.)'}
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-4 flex items-center text-slate-400">
                    <Lock className="w-4.5 h-4.5" />
                  </span>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => {
                      if (isAdminLogin) {
                        setPassword(e.target.value);
                      } else {
                        const val = e.target.value.replace(/\D/g, '');
                        setPassword(val);
                      }
                    }}
                    placeholder=""
                    className="w-full bg-[#F8FAFC] border border-slate-250 rounded-xl pl-11 pr-12 py-4 text-sm font-semibold outline-none focus:border-[#00914E] focus:bg-white text-gray-900 transition-all font-mono tracking-widest focus:ring-4 focus:ring-emerald-50"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-[#000000] cursor-pointer/10 transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4.5 h-4.5" /> : <Eye className="w-4.5 h-4.5" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                className="w-full mt-4 bg-[#00914E] hover:bg-[#00703c] text-white font-extrabold py-4 px-4 rounded-xl text-sm flex items-center justify-center gap-2 cursor-pointer shadow-sm hover:shadow-md transition-all active:scale-[0.98] duration-150 uppercase tracking-wider"
              >
                <span>Ready to STEP UP!</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          ) : (
            /* First-time setup dynamic wizard flow (Eliminating need for traditional register/sign-up tab) */
            <form onSubmit={handleFirstTimeSubmit} className="space-y-4">
              <div className="text-center mb-1">
                <div className="inline-flex bg-[#E8F5E9] p-3 rounded-full text-[#00914E] mb-3">
                  <ShieldCheck className="w-7 h-7" />
                </div>
                <h3 className="text-lg font-black text-slate-900">ตรวจพบผู้ใช้งานครั้งแรก! ✨</h3>
                <p className="text-xs text-slate-500 mt-1 font-medium leading-relaxed">ระบบอัตโนมัติพร้อมให้เริ่มบันทึกก้าวได้ทันที เพียงระบุข้อมูลของคุณ</p>
              </div>

              <div className="bg-slate-50 p-3 rounded-xl text-xs border border-slate-100 space-y-1.5 text-[#344054] font-medium">
                <div>รหัสพนักงาน: <strong className="font-mono text-[#00914E] bg-white px-2 py-0.5 rounded text-xs border border-slate-100">{employeeId}</strong></div>
                <div>รหัสผ่านวันเกิด: <strong className="font-mono text-gray-800 bg-white px-2 py-0.5 rounded text-xs border border-slate-100">{password}</strong></div>
              </div>

              {newUserError && (
                <div className="p-3 bg-red-50 text-red-600 rounded-xl border border-red-100 text-xs font-bold">
                  ⚠️ {newUserError}
                </div>
              )}

              <div>
                <label className="block text-[11px] font-bold text-slate-500 mb-1 tracking-wider">
                  ชื่อเล่น (สำหรับแสดงบนบอร์ดและรายการก้าว)
                </label>
                <input
                  type="text"
                  value={newNickname}
                  onChange={(e) => setNewNickname(e.target.value)}
                  placeholder="เช่น ยอด"
                  maxLength={15}
                  className="w-full bg-[#F8FAFC] border border-slate-200 rounded-xl px-4 py-3 text-xs sm:text-sm font-semibold outline-none focus:border-[#00914E] focus:bg-white text-gray-800 transition-all"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-500 mb-1 tracking-wider">
                  ฝ่าย
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400">
                    <Building2 className="w-4 h-4" />
                  </span>
                  <select
                    value={newDept}
                    onChange={(e) => setNewDept(e.target.value)}
                    className="w-full bg-[#F8FAFC] border border-slate-200 rounded-xl pl-10 pr-3 py-3 text-xs sm:text-sm font-bold text-slate-700 outline-none focus:border-[#00914E] focus:bg-white transition-all cursor-pointer"
                  >
                    {departments.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.nameTh}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-500 mb-1 tracking-wider">
                  อายุ (ปี)
                </label>
                <input
                  type="number"
                  min={1}
                  max={120}
                  value={newAge}
                  onChange={(e) => setNewAge(Number(e.target.value))}
                  placeholder="เช่น 30"
                  className="w-full bg-[#F8FAFC] border border-slate-200 rounded-xl px-4 py-3 text-xs sm:text-sm font-semibold outline-none focus:border-[#00914E] focus:bg-white text-gray-800 transition-all font-mono"
                  required
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setFirstTimeSetupActive(false)}
                  className="w-1/3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3 px-3 rounded-xl text-xs transition-all cursor-pointer"
                >
                  กลับ
                </button>
                <button
                  type="submit"
                  className="w-2/3 bg-[#00914E] hover:bg-[#00703c] text-white font-extrabold py-3 px-4 rounded-xl text-xs flex items-center justify-center gap-1 cursor-pointer shadow-sm transition-all active:scale-[0.98] duration-150"
                >
                  <span>เริ่มใช้งานระบบ</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </form>
          )}

        </div>
      </div>

      {/* Footer credits in Thairath Style */}
      <div className="mt-8 text-center text-[10px] text-slate-400 font-bold tracking-wider uppercase">
        People Partner Division, People Department Thairath Group
      </div>
    </div>
  );
}
