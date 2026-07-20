import React from 'react';
import {
  Activity,
  Calendar,
  CalendarCheck2,
  CheckCircle2,
  Flame,
  Footprints,
  History,
  Send,
  Sparkles,
  Target,
  Ticket,
  TrendingUp
} from 'lucide-react';
import { ActiveUser, StepLog, WeekConfig } from '../types';
import {
  CAMPAIGN_MONTHS,
  countDaysInclusive,
  getCampaignMonth,
  getCampaignWeek,
  getOpenedCampaignWeeks,
  periodKey
} from '../campaignConfig';

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

interface PeriodSummary {
  key: string;
  monthNumber: number;
  weekNumber: number;
  steps: number;
  logs: StepLog[];
}

function buildPeriodSummaries(logs: StepLog[]): PeriodSummary[] {
  const grouped = new Map<string, PeriodSummary>();

  logs.forEach((log, index) => {
    const fallbackWeek = log.weekOfMonth || -(index + 1);
    const key = periodKey(log.week, fallbackWeek);
    const existing = grouped.get(key);

    if (existing) {
      existing.steps += Number(log.steps) || 0;
      existing.logs.push(log);
    } else {
      grouped.set(key, {
        key,
        monthNumber: Number(log.week) || 1,
        weekNumber: fallbackWeek,
        steps: Number(log.steps) || 0,
        logs: [log]
      });
    }
  });

  return Array.from(grouped.values());
}

export default function DashboardView({
  activeUser,
  stepLogs,
  currentWeek,
  setActiveTab,
  onOpenHistory,
  setCurrentWeek
}: DashboardViewProps) {
  const selectedMonth = getCampaignMonth(currentWeek);
  const weeklyTarget = Number(activeUser.weekTarget) || 60000;
  const allPeriods = buildPeriodSummaries(stepLogs);
  const selectedPeriods = allPeriods.filter((period) => period.monthNumber === currentWeek);
  const selectedMonthLogs = stepLogs.filter((log) => Number(log.week) === currentWeek);

  const monthlySteps = selectedPeriods.reduce((sum, period) => sum + period.steps, 0);
  const monthlyTarget = selectedMonth.weeks.length * weeklyTarget;
  const monthlyProgress = monthlyTarget > 0 ? Math.min(100, Math.round((monthlySteps / monthlyTarget) * 100)) : 0;
  const monthlyRemaining = Math.max(0, monthlyTarget - monthlySteps);
  const submittedWeeks = selectedPeriods.filter((period) => period.weekNumber > 0).length;
  const completedMonthWeeks = selectedPeriods.filter((period) => period.steps >= weeklyTarget).length;

  const totalSteps = allPeriods.reduce((sum, period) => sum + period.steps, 0);
  const submittedPeriodKeys = new Set(allPeriods.map((period) => period.key));
  const openedPeriods = getOpenedCampaignWeeks();
  const targetPeriodKeys = new Set(openedPeriods.map(({ monthNumber, week }) => periodKey(monthNumber, week.number)));
  submittedPeriodKeys.forEach((key) => targetPeriodKeys.add(key));
  const targetWeeksToDate = Math.max(1, targetPeriodKeys.size);
  const targetToDate = targetWeeksToDate * weeklyTarget;
  const overallProgress = targetToDate > 0 ? Math.round((totalSteps / targetToDate) * 100) : 0;
  const completedWeeks = allPeriods.filter((period) => period.steps >= weeklyTarget).length;

  const coveredDays = selectedPeriods.reduce((sum, period) => {
    const campaignWeek = getCampaignWeek(period.monthNumber, period.weekNumber);
    return sum + (campaignWeek ? countDaysInclusive(campaignWeek.startDate, campaignWeek.endDate) : 7);
  }, 0);
  const estimatedDailyAverage = coveredDays > 0 ? Math.round(monthlySteps / coveredDays) : 0;
  const peakPeriod = [...selectedPeriods].sort((a, b) => b.steps - a.steps)[0];
  const userAge = Number(activeUser.age) || 30;

  let ageGroupText = 'วัยทำงาน 30 - 45 ปี';
  let minStandard = 7000;
  let maxStandard = 9000;

  if (userAge < 30) {
    ageGroupText = 'อายุต่ำกว่า 30 ปี';
    minStandard = 8000;
    maxStandard = 10000;
  } else if (userAge <= 45) {
    ageGroupText = 'วัยทำงาน 30 - 45 ปี';
  } else if (userAge <= 59) {
    ageGroupText = 'ช่วงอายุ 46 - 59 ปี';
    minStandard = 6000;
    maxStandard = 8000;
  } else {
    ageGroupText = 'วัย 60 ปีขึ้นไป';
    minStandard = 5000;
    maxStandard = 7000;
  }

  const healthLevel = estimatedDailyAverage === 0
    ? { text: 'รอข้อมูลการส่งผล', className: 'text-slate-600 bg-slate-50 border-slate-200' }
    : estimatedDailyAverage < minStandard
      ? { text: 'ลองเพิ่มการเคลื่อนไหวระหว่างวัน', className: 'text-amber-700 bg-amber-50 border-amber-100' }
      : estimatedDailyAverage <= maxStandard
        ? { text: 'อยู่ในช่วงเป้าหมายที่เหมาะสม', className: 'text-[#00914E] bg-[#E8F5E9] border-emerald-100' }
        : { text: 'ทำได้สูงกว่าเป้าหมายของช่วงวัย', className: 'text-indigo-700 bg-indigo-50 border-indigo-100' };

  const recommendation = estimatedDailyAverage === 0
    ? 'เริ่มส่งยอดก้าวประจำสัปดาห์ เพื่อให้ระบบคำนวณค่าเฉลี่ยและแสดงแนวโน้มของคุณได้แม่นยำขึ้น'
    : estimatedDailyAverage < minStandard
      ? 'ลองแบ่งเวลาลุกเดินสั้น ๆ ทุกชั่วโมง ใช้บันไดเมื่อเหมาะสม หรือเดินเพิ่มหลังมื้ออาหาร เพื่อเพิ่มกิจกรรมอย่างค่อยเป็นค่อยไป'
      : estimatedDailyAverage <= maxStandard
        ? 'รักษาความสม่ำเสมอของการเดิน และสลับวันพักหรือกิจกรรมเบา ๆ เพื่อให้ทำได้ต่อเนื่องตลอดโครงการ'
        : 'ยอดก้าวอยู่ในระดับสูง ควรฟังสัญญาณร่างกาย พักให้เพียงพอ และไม่เพิ่มความหนักรวดเร็วจนเกินไป';

  const journeyCards = [
    {
      label: 'ก้าวสะสมทั้งโครงการ',
      value: totalSteps.toLocaleString(),
      suffix: 'ก้าว',
      helper: `จาก ${submittedPeriodKeys.size} สัปดาห์ที่ส่งผล`,
      icon: Footprints,
      iconClass: 'bg-emerald-50 text-[#00914E]'
    },
    {
      label: 'เป้าหมายสะสมถึงปัจจุบัน',
      value: targetToDate.toLocaleString(),
      suffix: 'ก้าว',
      helper: `${targetWeeksToDate} สัปดาห์ × ${weeklyTarget.toLocaleString()}`,
      icon: Target,
      iconClass: 'bg-blue-50 text-blue-600'
    },
    {
      label: 'ความสำเร็จภาพรวม',
      value: `${overallProgress}`,
      suffix: '%',
      helper: totalSteps >= targetToDate ? 'ทำได้ตามเป้าหมายสะสมแล้ว' : `เหลือ ${(targetToDate - totalSteps).toLocaleString()} ก้าว`,
      icon: TrendingUp,
      iconClass: 'bg-amber-50 text-amber-600'
    },
    {
      label: 'สัปดาห์ที่ทำสำเร็จ',
      value: `${completedWeeks}`,
      suffix: 'สัปดาห์',
      helper: `จาก ${submittedPeriodKeys.size} สัปดาห์ที่ส่งผล`,
      icon: CalendarCheck2,
      iconClass: 'bg-violet-50 text-violet-600'
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-5 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
        <div className="space-y-2">
          <div className="h-10 select-none" aria-label="Thairath Health Up">
            <svg viewBox="0 0 160 55" className="h-full w-auto" fill="none" xmlns="http://www.w3.org/2000/svg">
              <text x="0" y="20" fill="#00914E" style={{ fontSize: '20px', fontWeight: '900', fontFamily: 'Prompt, sans-serif', letterSpacing: '0.04em' }}>THAIRATH</text>
              <text x="0" y="44" fill="#000000" style={{ fontFamily: 'Prompt, sans-serif', fontWeight: '800', fontSize: '15px' }}>HEALTH</text>
              <text x="88" y="44" fill="#00914E" style={{ fontFamily: 'Prompt, sans-serif', fontWeight: '900', fontSize: '15px' }}>Up!</text>
              <path d="M 2 52 L 72 52 L 76 48 L 79 56 L 84 32 L 89 64 L 94 52 L 97 48 L 100 52 L 150 52" stroke="#00914E" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <h2 id="dashboard-title" className="text-lg md:text-xl font-black text-black tracking-tight">
            ยินดีต้อนรับสู่ THAIRATH STEP UP
          </h2>
          <p className="text-xs md:text-sm text-[#475467] font-medium">
            ดูภาพรวมทั้งโครงการ พร้อมติดตามผลงานรายเดือนและรายสัปดาห์ของคุณ
          </p>
        </div>

        <div className="flex items-center gap-2 bg-[#E8F5E9] px-4 py-2.5 rounded-xl text-[#00914E] border border-emerald-100 self-start md:self-auto">
          <Calendar className="w-5 h-5 shrink-0" />
          <label htmlFor="dashboard-month" className="sr-only">เลือกเดือนที่ต้องการดู</label>
          <select
            id="dashboard-month"
            value={currentWeek}
            onChange={(event) => setCurrentWeek(Number(event.target.value))}
            className="bg-transparent border-none py-0.5 pl-1 pr-2 text-sm font-black text-[#00914E] outline-none cursor-pointer"
          >
            {CAMPAIGN_MONTHS.map((month) => (
              <option key={month.number} value={month.number}>{month.label}</option>
            ))}
          </select>
        </div>
      </div>

      <section aria-labelledby="overall-journey-title" className="space-y-3">
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-[#00914E]">Overall Journey</p>
            <h3 id="overall-journey-title" className="text-base md:text-lg font-black text-black">ภาพรวมสะสมทั้งโครงการ</h3>
          </div>
          <p className="hidden md:block text-xs text-slate-500 font-medium">อัปเดตจากรายการส่งผลทั้งหมดของคุณ</p>
        </div>

        <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 md:gap-4">
          {journeyCards.map((card) => {
            const Icon = card.icon;
            return (
              <article key={card.label} className="bg-white rounded-2xl border border-slate-200 p-4 md:p-5 shadow-xs min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-[10px] md:text-xs font-extrabold text-slate-500 leading-relaxed">{card.label}</p>
                  <div className={`p-2 rounded-xl shrink-0 ${card.iconClass}`}><Icon className="w-4 h-4" /></div>
                </div>
                <div className="mt-3 flex flex-wrap items-baseline gap-x-1.5">
                  <span className="text-xl md:text-3xl font-black text-black tabular-nums break-all">{card.value}</span>
                  <span className="text-[10px] md:text-xs font-bold text-slate-500">{card.suffix}</span>
                </div>
                <p className="text-[9px] md:text-[10px] text-slate-400 font-semibold mt-1.5 leading-relaxed">{card.helper}</p>
              </article>
            );
          })}
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <section className="lg:col-span-2 bg-white rounded-2xl p-6 md:p-8 border border-slate-200 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
              <div>
                <p className="text-[#00914E] font-extrabold text-[11px] uppercase tracking-wider">Monthly Performance</p>
                <h3 className="text-base font-black text-black">ผลงานเดือน{selectedMonth.label}</h3>
              </div>
              <span className="text-xs font-bold px-3 py-1.5 rounded-full bg-[#E8F5E9] text-[#008148] border border-emerald-100 self-start">
                เป้าหมายเดือน: {monthlyTarget.toLocaleString()} ก้าว
              </span>
            </div>

            <div className="flex flex-wrap items-baseline gap-3 mt-2">
              <span className="text-5xl md:text-7xl font-black text-[#008148] tracking-tighter tabular-nums">{monthlySteps.toLocaleString()}</span>
              <span className="text-sm md:text-base text-[#475467] font-semibold">/ {monthlyTarget.toLocaleString()} ก้าว</span>
            </div>

            <div className="w-full bg-[#F2F4F7] h-4 rounded-full mt-6 overflow-hidden relative shadow-inner" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={monthlyProgress}>
              <div className="bg-gradient-to-r from-[#008148] to-[#00b162] h-full rounded-full transition-all duration-700 ease-out" style={{ width: `${monthlyProgress}%` }} />
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mt-4 text-xs md:text-sm">
              <span className="font-extrabold text-[#344054]">ความสำเร็จของเดือน: {monthlyProgress}%</span>
              {monthlySteps >= monthlyTarget ? (
                <span className="text-[#008148] font-bold flex items-center gap-1.5 bg-[#E8F5E9] px-3 py-1.5 rounded-lg">
                  <CheckCircle2 className="w-4 h-4" /> ทำครบเป้าหมายของเดือนแล้ว
                </span>
              ) : (
                <span className="text-[#008148] font-bold flex items-center gap-1.5 bg-[#E8F5E9] px-3 py-1.5 rounded-lg">
                  <Flame className="w-4 h-4 text-amber-500" /> เหลือ {monthlyRemaining.toLocaleString()} ก้าวถึงเป้าหมายเดือน
                </span>
              )}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-6">
              <div className="rounded-xl bg-slate-50 border border-slate-100 p-3">
                <p className="text-[10px] font-bold text-slate-400">ส่งผลแล้ว</p>
                <p className="text-base font-black text-black mt-1">{submittedWeeks}/{selectedMonth.weeks.length} สัปดาห์</p>
              </div>
              <div className="rounded-xl bg-slate-50 border border-slate-100 p-3">
                <p className="text-[10px] font-bold text-slate-400">ทำถึงเป้า</p>
                <p className="text-base font-black text-black mt-1">{completedMonthWeeks} สัปดาห์</p>
              </div>
              <div className="rounded-xl bg-slate-50 border border-slate-100 p-3 col-span-2 sm:col-span-1">
                <p className="text-[10px] font-bold text-slate-400">เฉลี่ยโดยประมาณ</p>
                <p className="text-base font-black text-black mt-1">{estimatedDailyAverage.toLocaleString()} ก้าว/วัน</p>
              </div>
            </div>
          </div>

          <div className="mt-7 pt-5 border-t border-slate-100 flex flex-wrap gap-3">
            <button onClick={() => setActiveTab('submission')} className="btn bg-[#008148] hover:bg-[#005a32] text-white grow md:grow-0 text-sm font-bold py-3 px-6 rounded-xl flex items-center justify-center gap-2 cursor-pointer shadow-md active:scale-95">
              <span>ส่งผลก้าวประจำสัปดาห์</span><Send className="w-4 h-4" />
            </button>
            <button onClick={onOpenHistory} className="btn bg-[#F2F4F7] hover:bg-gray-200 text-black font-bold grow md:grow-0 text-sm py-3 px-6 rounded-xl flex items-center justify-center gap-2 cursor-pointer">
              <span>ดูประวัติการส่งผล</span><History className="w-4 h-4 text-[#344054]" />
            </button>
          </div>
        </section>

        <section className="bg-gradient-to-br from-[#008148] to-[#005a32] rounded-2xl p-6 md:p-8 text-white flex flex-col justify-between shadow-md relative overflow-hidden border border-[#005a32]/20">
          <div className="absolute -right-12 -bottom-12 w-40 h-40 bg-gradient-to-tr from-white/10 to-[#FFCC00]/20 rounded-full blur-xl pointer-events-none" />
          <div className="relative z-10">
            <div className="flex items-center gap-2 text-emerald-100">
              <Ticket className="w-5 h-5 text-[#FFCC00]" />
              <p className="text-xs md:text-sm font-extrabold uppercase tracking-wider">Lucky Draw</p>
            </div>
            <p className="text-xs text-emerald-100 mt-2">สิทธิ์จับรางวัลสะสมทั้งหมด</p>
            <div className="flex items-end gap-3 mt-5">
              <span className="text-6xl md:text-8xl font-black tracking-tight leading-none text-[#FFCC00] tabular-nums">{String(activeUser.totalTickets).padStart(2, '0')}</span>
              <span className="text-sm font-bold text-emerald-100 pb-2">ใบ</span>
            </div>
          </div>

          <div className="relative z-10 mt-8 pt-5 border-t border-white/10 space-y-3">
            <div className="flex items-center justify-between bg-white/10 px-4 py-3 rounded-xl border border-white/5">
              <div className="flex items-center gap-2"><Sparkles className="w-4 h-4 text-[#FFCC00]" /><span className="text-xs font-bold text-emerald-100">เดือนนี้ทำถึงเป้า</span></div>
              <span className="font-black text-lg text-[#FFCC00]">{completedMonthWeeks} สัปดาห์</span>
            </div>
            <p className="text-[10px] text-emerald-100/80 leading-relaxed">จำนวนตั๋วจริงอ้างอิงจากฐานข้อมูลพนักงาน และอาจรวมตั๋วโบนัสที่ Admin ปรับให้เพิ่มเติม</p>
          </div>
        </section>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <button onClick={onOpenHistory} className="lg:col-span-2 text-left bg-white rounded-2xl border border-slate-200 p-6 hover:shadow-md transition-shadow cursor-pointer block group">
          <div className="flex justify-between items-center mb-4 gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-2.5 h-2.5 rounded-full bg-[#008148]" />
              <h3 className="font-extrabold text-black text-base">รายการส่งผลเดือนนี้ ({selectedMonthLogs.length} รายการ)</h3>
            </div>
            <span className="text-xs font-bold text-[#008148] group-hover:underline shrink-0">ดูทั้งหมด →</span>
          </div>

          {selectedMonthLogs.length === 0 ? (
            <div className="py-8 text-center text-[#475467] text-sm">
              <p>ยังไม่มีการส่งผลสำหรับเดือนนี้</p>
              <span className="text-xs text-gray-400 mt-1 block">เลือก “ส่งผลก้าวประจำสัปดาห์” เพื่อเริ่มบันทึกข้อมูล</span>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[620px]">
                <thead>
                  <tr className="border-b border-gray-100 text-[#475467] font-bold text-xs">
                    <th className="py-2.5 text-left">รอบที่ส่ง</th>
                    <th className="py-2.5 text-left">ช่วงวันที่</th>
                    <th className="py-2.5 text-right">จำนวนก้าว</th>
                    <th className="py-2.5 text-right">เวลาที่ส่ง</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {selectedMonthLogs.slice(0, 5).map((log) => {
                    const week = getCampaignWeek(log.week, log.weekOfMonth);
                    return (
                      <tr key={log.id} className="text-[#344054] hover:bg-gray-50 transition-colors">
                        <td className="py-3 font-extrabold text-[#008148]">{week?.label || `รายการเดิม`}</td>
                        <td className="py-3 font-semibold">{week?.range || new Date(log.date).toLocaleDateString('th-TH')}</td>
                        <td className="py-3 text-right font-black text-black tabular-nums">{log.steps.toLocaleString()}</td>
                        <td className="py-3 text-right text-xs text-gray-400">{new Date(log.submittedAt).toLocaleString('th-TH', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </button>

        <section className="bg-white rounded-2xl border border-slate-200 p-6 flex flex-col justify-between shadow-xs">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Activity className="w-5 h-5 text-[#00914E]" />
              <h3 className="font-extrabold text-black text-base">Health Insight</h3>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between items-center p-3 rounded-xl bg-[#F2F4F7] gap-3">
                <span className="text-xs font-bold text-[#475467]">ค่าเฉลี่ยโดยประมาณ</span>
                <span className="text-sm font-extrabold text-black text-right">{estimatedDailyAverage.toLocaleString()} ก้าว/วัน</span>
              </div>
              <div className="flex justify-between items-center p-3 rounded-xl bg-[#F2F4F7] gap-3">
                <span className="text-xs font-bold text-[#475467]">กลุ่มอายุ</span>
                <span className="text-xs font-extrabold text-black text-right">{userAge} ปี · {ageGroupText}</span>
              </div>
              <div className="flex justify-between items-center p-3 rounded-xl bg-[#F2F4F7] gap-3">
                <span className="text-xs font-bold text-[#475467]">ช่วงเป้าหมายอ้างอิง</span>
                <span className="text-xs font-extrabold text-black text-right">{minStandard.toLocaleString()}–{maxStandard.toLocaleString()} ก้าว/วัน</span>
              </div>
              <div className={`p-3 rounded-xl text-center border font-bold text-xs ${healthLevel.className}`}>
                {healthLevel.text}
              </div>
              <div className="p-3.5 rounded-xl bg-[#E8F5E9]/50 border border-emerald-100 text-xs text-[#344054] leading-relaxed">
                <span className="font-extrabold text-black block mb-1">คำแนะนำทั่วไป</span>{recommendation}
              </div>
              {peakPeriod && (
                <div className="p-3 rounded-xl bg-[#F2F4F7]">
                  <p className="text-[10px] uppercase font-bold text-[#475467] tracking-wider">สัปดาห์ที่ทำได้สูงสุด</p>
                  <div className="flex justify-between items-end mt-1 gap-2">
                    <span className="text-xs font-semibold text-gray-600">{getCampaignWeek(peakPeriod.monthNumber, peakPeriod.weekNumber)?.label || 'ข้อมูลเดิม'}</span>
                    <span className="text-sm font-black text-black">{peakPeriod.steps.toLocaleString()} ก้าว</span>
                  </div>
                </div>
              )}
            </div>
          </div>
          <p className="pt-4 border-t border-gray-100 mt-4 text-[10px] text-gray-400 font-medium text-center">ข้อมูลนี้เป็นคำแนะนำทั่วไป ไม่ใช่คำแนะนำทางการแพทย์</p>
        </section>
      </div>
    </div>
  );
}
