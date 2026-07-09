import React, { useState } from 'react';
import { Flame, Send, History, Award, CheckCircle2, Trash2, Calendar, Sparkles, TrendingUp } from 'lucide-react';
import { ActiveUser, StepLog, WeekConfig } from '../types';

interface DashboardViewProps {
  activeUser: ActiveUser;
  stepLogs: StepLog[];
  currentWeek: number;
  weeks: WeekConfig[];
  setActiveTab: (tab: string) => void;
  onDeleteLog: (id: string) => void;
  onOpenHistory: () => void;
  setCurrentWeek: (week: number) => void;
}

export default function DashboardView({
  activeUser,
  stepLogs,
  currentWeek,
  weeks,
  setActiveTab,
  onDeleteLog,
  onOpenHistory,
  setCurrentWeek
}: DashboardViewProps) {
  
  // Filter logs for the active week
  const currentWeekLogs = stepLogs.filter(log => log.week === currentWeek);
  
  // Calculate total steps for this week
  const totalWeekSteps = currentWeekLogs.reduce((sum, log) => sum + log.steps, 0);
  
  // Calculate target progress percentage
  const target = activeUser.weekTarget;
  const progressPercent = Math.min(100, Math.round((totalWeekSteps / target) * 100));
  const isTargetMet = totalWeekSteps >= target;
  const stepsRemaining = Math.max(0, target - totalWeekSteps);

  // Tickets earned: 1 this week if target is met, plus user's preloaded total.
  const weekTicketCount = isTargetMet ? 1 : 0;
  
  // Dynamic display values
  const formattedSteps = totalWeekSteps.toLocaleString();
  const formattedTarget = target.toLocaleString();
  const formattedRemaining = stepsRemaining.toLocaleString();

  // Find some records
  const daysActive = currentWeekLogs.length;
  const avgSteps = daysActive > 0 ? Math.round(totalWeekSteps / daysActive) : 0;
  const maxStepDay = currentWeekLogs.length > 0 
    ? [...currentWeekLogs].sort((a, b) => b.steps - a.steps)[0] 
    : null;

  const userAge = activeUser.age || 30;

  // Age group classification
  let ageGroupText = "";
  let minStandard = 6000;
  let maxStandard = 8000;
  let recommendation = "";
  let levelText = "";
  let levelColor = "";

  if (userAge < 30) {
    ageGroupText = "อายุต่ำกว่า 30 ปี";
    minStandard = 8000;
    maxStandard = 10000;
    if (avgSteps < minStandard) {
      levelText = "ควรขยับเพิ่มขึ้น 🚶";
      levelColor = "text-amber-700 bg-amber-50 border-amber-100";
      recommendation = "ร่างกายในวัยนี้ยังฟิตกระฉับกระเฉงได้อีกมาก ลองหลีกเลี่ยงการนั่งทำงานนานๆ ขยับเดินระหว่างทำงาน หรือเลือกเดินขึ้นบันไดแทนลิฟต์เพื่อการเบิร์นที่ดีขึ้น!";
    } else if (avgSteps <= maxStandard) {
      levelText = "ดีตามเกณฑ์มาตรฐาน ✅";
      levelColor = "text-[#00914E] bg-[#E8F5E9] border-emerald-100";
      recommendation = "ยอดเยี่ยมมากค่ะ! รักษาระดับก้าวเดินที่เสถียรตามเกณฑ์ของวัยต่ำกว่า 30 ปี ช่วยพัฒนาโฟกัสสมองและการนอนหลับปุ๋ยที่มีคุณภาพ";
    } else {
      levelText = "ฟิตมาก ประสิทธิภาพสูงขีดสุด 🌟";
      levelColor = "text-indigo-700 bg-indigo-50 border-indigo-100";
      recommendation = "แอคทีฟขีดสุด! การเดินสะสมมากกว่า 10,000 ก้าวต่อวันในวัยนี้ยอดเยี่ยมยอดเยี่ยมมาก ช่วยกระตุ้นระบบหมุนเวียนและฟื้นฟูกล้ามเนื้อให้อายุยืนยาว";
    }
  } else if (userAge <= 45) {
    ageGroupText = "วัยทำงาน 30 - 45 ปี";
    minStandard = 7000;
    maxStandard = 9000;
    if (avgSteps < minStandard) {
      levelText = "ควรขยับเพิ่มขึ้น 🚶";
      levelColor = "text-amber-700 bg-amber-50 border-amber-100";
      recommendation = "หากตารางงานทำให้คุณเจอนั่งบ่อย ลองตั้งเป้าหมายขยับลุกเดิน บิดแกว่งแขน 5 นาทีในทุกชั่วโมง ช่วยหลีกเลี่ยงออฟฟิศซินโดรมกระตุ้นเมตาบอลิซึม";
    } else if (avgSteps <= maxStandard) {
      levelText = "ดีตามเกณฑ์มาตรฐาน ✅";
      levelColor = "text-[#00914E] bg-[#E8F5E9] border-emerald-100";
      recommendation = "เก่งมากเลยค่ะ! รักษาก้าวเดินได้สม่ำเสมอท่ามกลางตารางภารกิจประจำวันที่แสนยุ่งเหยิง รักษาระบบเผาผลาญและหัวใจเต้นแข็งแรง";
    } else {
      levelText = "ฟิตมาก สุขภาพยอดเยี่ยม 🌟";
      levelColor = "text-indigo-700 bg-indigo-50 border-indigo-100";
      recommendation = "สุดยอดสถิติแรงบันดาลใจ! เดินกระฉับกระเฉงหนานุ่ม ช่วยรักษาสมดุลความดัน รักษาน้ำตาลเลือด และหลั่งสารแห่งความสุขลดความล้าของสมอง";
    }
  } else if (userAge <= 59) {
    ageGroupText = "ช่วงอายุ 46 - 59 ปี";
    minStandard = 6000;
    maxStandard = 8000;
    if (avgSteps < minStandard) {
      levelText = "ควรขยับเพิ่มขึ้น 🚶";
      levelColor = "text-amber-700 bg-amber-50 border-amber-100";
      recommendation = "เพื่อป้องกันความหนาแน่นมวลกระดูกจางและโรคเส้นเอ็น ลองหาจังหวะจอดรถไกลขึ้น ลุกเดินหลังจากส่งงาน หรือหมุนเดินรอบแผนกบ่อยๆ";
    } else if (avgSteps <= maxStandard) {
      levelText = "ดีตามเกณฑ์มาตรฐาน ✅";
      levelColor = "text-[#00914E] bg-[#E8F5E9] border-emerald-100";
      recommendation = "เยี่ยมยอดเปี่ยมพลังมากค่ะ! ก้าวที่เสถียรช่วยป้องกันข้อเข่าเสื่อม ควบคุมความดันสูง และคุมไขมันพอกตับได้ชะงัด";
    } else {
      levelText = "ฟิตเนสรุ่นเก๋าระดับสูง 🌟";
      levelColor = "text-indigo-700 bg-indigo-50 border-indigo-100";
      recommendation = "ตัวอย่างแห่งความเยาว์วัย! การเดินที่มากกว่าเกณฑ์ในวัยนี้ทำความสะอาดระบบอวัยวะภายใน ย่อยอาหารคล่องแคล่ว แข็งแกร่งไม่เกรงใจวัย";
    }
  } else {
    ageGroupText = "วัย 60 ปีขึ้นไป";
    minStandard = 5000;
    maxStandard = 7000;
    if (avgSteps < minStandard) {
      levelText = "ควรขยับเพิ่มขึ้น 🚶";
      levelColor = "text-amber-700 bg-amber-50 border-amber-100";
      recommendation = "เพื่อถนอมกระดูกข้อพับกระดูกสะโพก แนะนำเดินจังหวะนุ่มนวลช้าๆ แกว่งมือเบาๆ ในพื้นที่เรียบ เช่น สนามหญ้า เพื่อป้องกันลื่นไถล";
    } else if (avgSteps <= maxStandard) {
      levelText = "ดีตามเกณฑ์มาตรฐาน ✅";
      levelColor = "text-[#00914E] bg-[#E8F5E9] border-emerald-100";
      recommendation = "ขอปรบมือให้จริงใจค่ะ! เดินกระตุ้นระบบประสาทส่วนปลาย ส่งเสริมสมองโล่งสบาย ช่วยให้กล้ามเนื้อแกนกลางและการเกาะยึดก้าวดีเลิศ";
    } else {
      levelText = "สหัสวรรษความฟิตนิรันดร์ 🌟";
      levelColor = "text-indigo-700 bg-indigo-50 border-indigo-100";
      recommendation = "ความฟิตทะลุร้อยปี! เกณฑ์กิจกรรมเข้มข้นช่วยหัวใจสูบฉีดแจ่มใส หน้าตาย้อนวัย ชนะความฝ่อตัวสมรรถภาพแบบถาวรที่สุด";
    }
  }

  return (
    <div className="space-y-6">
      
      {/* Page Title Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-5 bg-white p-6 rounded-2xl border border-slate-250 shadow-sm relative overflow-hidden">
        <div className="space-y-2">
          {/* Brand Logo Based on Reference Image */}
          <div className="h-10 select-none">
            <svg viewBox="0 0 160 55" className="h-full w-auto" fill="none" xmlns="http://www.w3.org/2000/svg">
              {/* THAIRATH Green Text */}
              <text x="0" y="20" fill="#00914E" style={{ fontSize: '20px', fontWeight: '900', fontFamily: 'system-ui, -apple-system, sans-serif', letterSpacing: '0.04em' }}>
                THAIRATH
              </text>
              
              {/* HEALTH Wordmark on Left */}
              <text x="0" y="44" fill="#000000" style={{ fontFamily: 'system-ui, -apple-system, sans-serif', fontWeight: '800', fontSize: '15px' }} letterSpacing="0.01em">
                HEALTH
              </text>

              {/* Up! Wordmark on Right */}
              <text x="88" y="44" fill="#00914E" style={{ fontFamily: 'system-ui, -apple-system, sans-serif', fontWeight: '900', fontSize: '15px' }} letterSpacing="0.01em">
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
          <h2 id="dashboard-title" className="text-lg md:text-xl font-black text-[#000000] tracking-tight">
            ยินดีต้อนรับสู่ THAIRATH STEP UP
          </h2>
          <p className="text-xs md:text-sm text-[#344054] font-medium mt-0.5">
            มาสร้างสุขภาพที่ดีและร่วมสะสมเป้าหมายไปด้วยกัน
          </p>
        </div>

        {/* Dropdown MONTH selection */}
        <div className="flex items-center gap-2 bg-[#E8F5E9] px-4 py-2.5 rounded-xl text-[#00914E] border border-emerald-100 shadow-3xs self-start md:self-auto cursor-pointer">
          <Calendar className="w-5 h-5 text-[#00914E] shrink-0" />
          <select 
            value={currentWeek} 
            onChange={(e) => setCurrentWeek(Number(e.target.value))}
            className="bg-transparent border-none py-0.5 pl-1 pr-7 text-sm font-black text-[#00914E] outline-none cursor-pointer focus:ring-0 rounded-lg appearance-none bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%2300914E%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E')] bg-[length:10px] bg-[right_4px_center] bg-no-repeat"
          >
            <option value={1}>กรกฎาคม 2026</option>
            <option value={2}>สิงหาคม 2026</option>
            <option value={3}>กันยายน 2026</option>
            <option value={4}>ตุลาคม 2026</option>
            <option value={5}>พฤศจิกายน 2026</option>
            <option value={6}>ธันวาคม 2026</option>
          </select>
        </div>
      </div>

      {/* Bento Grid Concept Header */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Side: Steps Progress Card (Spans 2 cols) */}
        <div className="lg:col-span-2 bg-white rounded-2xl p-6 md:p-8 border border-[#edf2f7] shadow-xs hover:shadow-md transition-shadow flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center mb-4">
              <span className="text-[#344054] font-extrabold text-xs uppercase tracking-wider">
                ก้าวสะสมของคุณในสัปดาห์นี้
              </span>
              <span className="text-xs font-bold px-3 py-1 rounded-full bg-[#e6f5ee] text-[#008148] border border-[#008148]/10">
                เป้าหมาย: {formattedTarget} ก้าว
              </span>
            </div>

            <div className="flex items-baseline gap-3 mt-2">
              <span className="text-5xl md:text-7xl font-black text-[#008148] tracking-tighter">{formattedSteps}</span>
              <span className="text-base md:text-lg text-[#344054] font-semibold">/ {formattedTarget} ก้าว</span>
            </div>

            {/* Progress Bar Container */}
            <div className="w-full bg-[#F2F4F7] h-5 rounded-full mt-6 overflow-hidden relative shadow-inner">
              <div 
                className="bg-gradient-to-r from-[#008148] to-[#00b162] h-full rounded-full transition-all duration-700 ease-out relative"
                style={{ width: `${progressPercent}%` }}
              >
                <div className="absolute inset-0 opacity-25 bg-[radial-gradient(circle,white_1.5px,transparent_0)] bg-[size:8px_8px]"></div>
              </div>
            </div>

            {/* Progress Bar Label Footer */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mt-4 text-xs md:text-sm">
              <span className="font-extrabold text-[#344054]">
                ความสำเร็จ: {progressPercent}%
              </span>

              {isTargetMet ? (
                <span className="text-[#008148] font-bold flex items-center gap-1.5 bg-[#e6f5ee] px-3 py-1 rounded-lg shadow-xs">
                  <CheckCircle2 className="w-4.5 h-4.5 text-[#008148]" />
                  ยินดีด้วย! คุณสะสมก้าวครบสิทธิ์รับโชคสัปดาห์นี้แล้ว 🎉
                </span>
              ) : (
                <span className="text-[#008148] font-bold flex items-center gap-1.5 bg-[#e6f5ee] px-3 py-1 rounded-lg">
                  <Flame className="w-4.5 h-4.5 animate-bounce text-amber-500" />
                  อีกเพียง {formattedRemaining} ก้าว จะได้ตั๋วนำโชค!
                </span>
              )}
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-slate-100 flex flex-wrap gap-3">
            <button 
              onClick={() => setActiveTab('submission')}
              className="btn bg-[#008148] hover:bg-[#005a32] text-white grow md:grow-0 text-sm font-bold py-3 px-6 rounded-xl flex items-center justify-center gap-2 cursor-pointer shadow-md hover:shadow-lg transition-all active:scale-95 duration-150"
            >
              <span>ส่งผลก้าวของวันนี้</span>
              <Send className="w-4 h-4" />
            </button>
            <button 
              onClick={onOpenHistory}
              className="btn bg-[#F2F4F7] hover:bg-gray-200 text-[#000000] font-bold grow md:grow-0 text-sm py-3 px-6 rounded-xl flex items-center justify-center gap-2 cursor-pointer transition-colors"
            >
              <span>ดูประวัติการส่งผล</span>
              <History className="w-4 h-4 text-[#344054]" />
            </button>
          </div>
        </div>

        {/* Right Side: Lucky Draw Reward Ticket Card */}
        <div className="bg-gradient-to-br from-[#008148] to-[#005a32] rounded-2xl p-6 md:p-8 text-white flex flex-col justify-between shadow-md relative overflow-hidden border border-[#005a32]/20">
          {/* Glowing background accents */}
          <div className="absolute -right-12 -bottom-12 w-40 h-40 bg-gradient-to-tr from-white/10 to-[#FFCC00]/20 rounded-full blur-xl pointer-events-none"></div>
          <div className="absolute top-2 right-2 w-16 h-16 bg-[radial-gradient(circle,white_0.8px,transparent_0)] bg-[size:6px_6px] opacity-15 pointer-events-none"></div>
          
          <div className="text-center md:text-left z-10">
            <p className="text-xs md:text-sm font-extrabold text-emerald-100 uppercase tracking-wider mb-2">
              สิทธิ์จับรางวัล Lucky Draw สะสมทั้งหมด
            </p>
            <div className="flex justify-center md:justify-start items-center gap-4 mt-4">
              <div className="text-6xl md:text-8xl font-black tracking-tight leading-none text-[#FFCC00] drop-shadow-sm font-mono">
                {String(activeUser.totalTickets).padStart(2, '0')}
              </div>
              <div className="text-left">
                <span className="text-[10px] bg-[#FFCC00] text-black px-2.5 py-1 rounded font-bold uppercase tracking-wider shadow-xs animate-pulse">
                  ตั๋วสะสมทั้งหมด
                </span>
                <p className="text-xs text-emerald-100 mt-2 max-w-[180px] font-medium leading-relaxed">
                  ตั๋วสะสมประวัติการทำงานและกิจกรรมสุขภาพของคุณ อัปเดตเรียลไทม์
                </p>
              </div>
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-white/10 text-center md:text-left z-10">
            <div className="inline-flex items-center gap-2 bg-white/10 px-4 py-2.5 rounded-xl w-full justify-between border border-white/5">
              <div className="flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-[#FFCC00]" />
                <span className="text-xs font-bold text-emerald-200">ตั๋วประจำสัปดาห์นี้</span>
              </div>
              <span className="font-black text-lg text-[#FFCC00]">
                {weekTicketCount} ใบ <span className="text-xs text-emerald-200 font-normal">ความสำเร็จสัปดาห์นี้</span>
              </span>
            </div>
          </div>
        </div>

      </div>

      {/* Bottom Row Dashboard Detail Bento Card */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Bottom Block: Current Week's Step Submission History List (Spans 2 cols) */}
        <button 
          id="toggle-history-details"
          onClick={onOpenHistory}
          className="lg:col-span-2 text-left bg-white rounded-2xl border border-slate-200 p-6 hover:shadow-md transition-shadow cursor-pointer block group"
        >
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-2.5 h-2.5 rounded-full bg-[#008148]" />
              <h3 className="font-extrabold text-[#000000] text-base">
                รายการส่งผลของสัปดาห์นี้ ({daysActive} วัน)
              </h3>
            </div>
            <span className="text-xs font-bold text-[#008148] flex items-center gap-1 group-hover:underline">
              ดูรายละเอียดทั้งหมด &rarr;
            </span>
          </div>

          {currentWeekLogs.length === 0 ? (
            <div className="py-8 text-center text-[#344054] text-sm">
              <p>ยังไม่มีการส่งผลก้าวสำหรับสัปดาห์นี้</p>
              <span className="text-xs text-gray-400 mt-1 block">กดปุ่ม "ส่งผลก้าวของวันนี้" เพื่อบันทึกผลภาพแรก</span>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 text-[#344054] font-bold text-xs">
                    <th className="py-2.5 text-left">วันที่ทำกิจกรรม</th>
                    <th className="py-2.5 text-right">ยอดก้าว (ก้าว)</th>
                    <th className="py-2.5 text-left pl-6">เอกสารอัปโหลด</th>
                    <th className="py-2.5 text-right">วันเวลาที่ส่งผล</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {currentWeekLogs.slice(0, 4).map((log) => (
                    <tr key={log.id} className="text-[#344054] hover:bg-gray-50 transition-colors">
                      <td className="py-3 font-semibold">
                        {new Date(log.date).toLocaleDateString('th-TH', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                      </td>
                      <td className="py-3 text-right font-black text-[#008148]">
                        {log.steps.toLocaleString()}
                      </td>
                      <td className="py-3 font-medium text-xs text-gray-500 pl-6 truncate max-w-[140px]">
                        📸 {log.imageName}
                      </td>
                      <td className="py-3 text-right text-xs text-gray-400">
                        {new Date(log.submittedAt).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })} น.
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {currentWeekLogs.length > 4 && (
                <p className="text-center text-xs text-gray-400 mt-3 font-medium cursor-pointer">
                  ยังมีรายการบันทึกอีก {currentWeekLogs.length - 4} รายการ คลิกเพื่อดูทั้งหมด
                </p>
              )}
            </div>
          )}
        </button>

        {/* Right Bottom Block: Mini Stats Insights */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 flex flex-col justify-between shadow-xs">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="w-4.5 h-4.5 text-[#00914E] stroke-[2.5px]" />
              <h3 className="font-extrabold text-[#000000] text-base">วิเคราะห์ข้อมูลสุขภาพของคุณ</h3>
            </div>

            <div className="space-y-4">
              {/* Daily Average */}
              <div className="flex justify-between items-center p-3 rounded-xl bg-[#F2F4F7]">
                <span className="text-xs font-bold text-[#344054]">เฉลี่ยรายวัน (สัปดาห์นี้)</span>
                <span className="text-sm font-extrabold text-[#000000]">{avgSteps.toLocaleString()} ก้าว/วัน</span>
              </div>

              {/* Age Info */}
              <div className="flex justify-between items-center p-3 rounded-xl bg-[#F2F4F7]">
                <span className="text-xs font-bold text-[#344054]">กลุ่มอายุของคุณ</span>
                <span className="text-sm font-extrabold text-[#000000]">{userAge} ปี ({ageGroupText})</span>
              </div>

              {/* Step Standards */}
              <div className="flex justify-between items-center p-3 rounded-xl bg-[#F2F4F7]">
                <span className="text-xs font-bold text-[#344054]">เกณฑ์แนะนำของช่วงวัย</span>
                <span className="text-sm font-extrabold text-[#000000]">{minStandard.toLocaleString()} - {maxStandard.toLocaleString()} ก้าว/วัน</span>
              </div>

              {/* Level Indicator Badge */}
              <div className={`p-3 rounded-xl text-center border font-bold text-xs ${levelColor}`}>
                ระดับคุณภาพก้าวเดิน: <span className="font-black text-sm block mt-1">{levelText}</span>
              </div>

              {/* Step Recommendations based on Age */}
              <div className="p-3.5 rounded-xl bg-[#e6f5ee]/40 border border-emerald-100 text-xs text-[#344054] leading-relaxed">
                <span className="font-extrabold text-[#000000] block mb-1">💡 คำแนะนำเพื่อสุขภาพ:</span>
                {recommendation}
              </div>

              {maxStepDay && (
                <div className="p-3 rounded-xl bg-[#F2F4F7]">
                  <p className="text-[10px] uppercase font-bold text-[#344054] tracking-wider">วันสูงสุดในสัปดาห์นี้ (Peak Day)</p>
                  <div className="flex justify-between items-end mt-1">
                    <span className="text-xs font-semibold text-gray-600">
                      {new Date(maxStepDay.date).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })}
                    </span>
                    <span className="text-sm font-black text-[#000000]">{maxStepDay.steps.toLocaleString()} ก้าว</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="pt-4 border-t border-gray-100 mt-4">
            <span className="text-[10px] text-gray-400 font-medium block text-center">
              ข้อมูลอ้างอิงสถิติจากกรมอนามัย
            </span>
          </div>
        </div>

      </div>

    </div>
  );
}
