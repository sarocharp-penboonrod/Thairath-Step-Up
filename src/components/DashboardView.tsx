import React, { useMemo } from 'react';
import {
  Activity,
  Award,
  CalendarCheck2,
  ChevronRight,
  Clock3,
  Footprints,
  History,
  Target,
  TrendingUp
} from 'lucide-react';
import { ActiveUser, StepLog, WeekConfig, isVerifiedStatus } from '../types';
import { CAMPAIGN_MONTHS, CAMPAIGN_WEEKLY_TARGET, getCampaignMonth } from '../campaignConfig';

interface DashboardViewProps {
  activeUser: ActiveUser;
  stepLogs: StepLog[];
  currentWeek: number;
  weeks: WeekConfig[];
  setActiveTab: (tab: string) => void;
  onOpenHistory: () => void;
  setCurrentWeek: (month: number) => void;
}

function average(values: number[]): number {
  return values.length ? Math.round(values.reduce((sum, value) => sum + value, 0) / values.length) : 0;
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
  const verifiedLogs = useMemo(() => stepLogs.filter((log) => isVerifiedStatus(log.verificationStatus)), [stepLogs]);
  const selectedVerified = verifiedLogs.filter((log) => Number(log.week) === currentWeek);
  const selectedAll = stepLogs.filter((log) => Number(log.week) === currentWeek);
  const cumulativeVerified = verifiedLogs.filter((log) => Number(log.week) <= currentWeek);

  const monthAverage = average(selectedVerified.map((log) => Number(log.steps) || 0));
  const overallAverage = average(cumulativeVerified.map((log) => Number(log.steps) || 0));
  const completedWeeks = selectedVerified.filter((log) => Number(log.steps) >= CAMPAIGN_WEEKLY_TARGET).length;
  const submittedWeeks = new Set(selectedVerified.map((log) => log.weekOfMonth)).size;
  const successRate = submittedWeeks ? Math.round((completedWeeks / submittedWeeks) * 100) : 0;
  const pendingCount = selectedAll.filter((log) => log.verificationStatus === 'NEEDS_REVIEW').length;
  const remainingToTarget = Math.max(0, CAMPAIGN_WEEKLY_TARGET - monthAverage);
  const peakLog = [...selectedVerified].sort((a, b) => b.steps - a.steps)[0];

  const cards = [
    {
      label: 'ค่าเฉลี่ยเดือนที่เลือก',
      value: monthAverage.toLocaleString(),
      suffix: 'ก้าว/วัน',
      helper: selectedVerified.length ? `จาก ${submittedWeeks} สัปดาห์ที่ผ่านตรวจ` : 'รอข้อมูลที่ผ่านการตรวจ',
      icon: Footprints,
      className: 'bg-emerald-50 text-[#00914E]'
    },
    {
      label: 'สัปดาห์ที่ถึงเป้าหมาย',
      value: String(completedWeeks),
      suffix: 'สัปดาห์',
      helper: `Success Rate ${successRate}%`,
      icon: CalendarCheck2,
      className: 'bg-blue-50 text-blue-600'
    },
    {
      label: 'คูปองสะสม',
      value: String(activeUser.totalTickets || 0),
      suffix: 'ใบ',
      helper: 'เฉพาะรายการ ≥ 7,000 และผ่านตรวจ',
      icon: Award,
      className: 'bg-amber-50 text-amber-600'
    },
    {
      label: 'รายการรอตรวจ',
      value: String(pendingCount),
      suffix: 'รายการ',
      helper: pendingCount ? 'ยังไม่ถูกนำไปคำนวณ' : 'ไม่มีรายการค้างตรวจ',
      icon: Clock3,
      className: 'bg-violet-50 text-violet-600'
    }
  ];

  return (
    <div className="space-y-6">
      <section className="bg-white p-5 md:p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <p className="text-sm font-bold text-[#00914E]">สวัสดี {activeUser.nickname || activeUser.name}</p>
          <h1 className="text-2xl md:text-3xl font-black text-black mt-1">ภาพรวมค่าเฉลี่ยก้าว</h1>
          <p className="text-sm text-slate-500 mt-2">เป้าหมายคือค่าเฉลี่ยอย่างน้อย 7,000 ก้าวต่อวันในแต่ละสัปดาห์</p>
        </div>
        <select
          value={currentWeek}
          onChange={(event) => setCurrentWeek(Number(event.target.value))}
          className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-700"
        >
          {CAMPAIGN_MONTHS.map((month) => <option key={month.number} value={month.number}>{month.label}</option>)}
        </select>
      </section>

      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {cards.map((card) => (
          <article key={card.label} className="bg-white rounded-2xl border border-slate-200 p-4 md:p-5 shadow-sm">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${card.className}`}><card.icon className="w-5 h-5" /></div>
            <p className="text-xs text-slate-500 font-bold mt-4">{card.label}</p>
            <p className="text-2xl md:text-3xl font-black text-black mt-1">{card.value}<span className="text-xs ml-1 text-slate-500">{card.suffix}</span></p>
            <p className="text-xs text-slate-400 mt-2 leading-relaxed">{card.helper}</p>
          </article>
        ))}
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <article className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-5 md:p-6 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-black text-black">ผลเดือน{selectedMonth.label}</h2>
              <p className="text-sm text-slate-500 mt-1">ระบบใช้ค่าเฉลี่ยของแต่ละสัปดาห์ ไม่ได้นำค่าเฉลี่ยมาบวกเป็นก้าวสะสม</p>
            </div>
            <Activity className="w-6 h-6 text-[#00914E]" />
          </div>

          <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Metric label="ค่าเฉลี่ยเดือนนี้" value={`${monthAverage.toLocaleString()} ก้าว/วัน`} />
            <Metric label="ค่าเฉลี่ยถึงเดือนนี้" value={`${overallAverage.toLocaleString()} ก้าว/วัน`} />
            <Metric label="สัปดาห์สูงสุด" value={peakLog ? `${Number(peakLog.steps).toLocaleString()} ก้าว/วัน` : '-'} />
          </div>

          <div className="mt-6">
            <div className="flex justify-between text-sm font-bold">
              <span>เป้าหมายเฉลี่ยต่อวัน</span>
              <span>{monthAverage.toLocaleString()} / {CAMPAIGN_WEEKLY_TARGET.toLocaleString()}</span>
            </div>
            <div className="h-3 bg-slate-100 rounded-full mt-3 overflow-hidden">
              <div className="h-full bg-[#00914E] rounded-full transition-all" style={{ width: `${Math.min(100, Math.round(monthAverage / CAMPAIGN_WEEKLY_TARGET * 100))}%` }} />
            </div>
            <p className="text-sm text-slate-500 mt-3">
              {monthAverage >= CAMPAIGN_WEEKLY_TARGET
                ? 'ยอดเฉลี่ยถึงเป้าหมายแล้ว รักษาความสม่ำเสมอในสัปดาห์ถัดไป'
                : monthAverage > 0
                  ? `เพิ่มอีกเฉลี่ย ${remainingToTarget.toLocaleString()} ก้าว/วัน เพื่อถึงเป้าหมาย`
                  : 'ส่งค่าเฉลี่ยก้าวพร้อมหลักฐานเพื่อเริ่มติดตามผล'}
            </p>
          </div>
        </article>

        <article className="bg-black text-white rounded-2xl p-5 md:p-6 shadow-sm flex flex-col justify-between">
          <div>
            <Target className="w-7 h-7 text-emerald-400" />
            <h2 className="text-xl font-black mt-4">กติกาคูปอง</h2>
            <p className="text-sm text-slate-300 leading-relaxed mt-3">
              ได้รับ 1 คูปอง เมื่อค่าเฉลี่ยของสัปดาห์นั้นตั้งแต่ 7,000 ก้าว/วันขึ้นไป และหลักฐานผ่านการตรวจแล้วเท่านั้น
            </p>
            <p className="text-xs text-slate-400 leading-relaxed mt-3">รายการรอตรวจหรือไม่ผ่านการตรวจ จะยังไม่ถูกนำมาคำนวณ Dashboard, Leaderboard และคูปอง</p>
          </div>
          <button onClick={() => setActiveTab('submission')} className="mt-6 w-full bg-[#00914E] hover:bg-[#00703c] py-3 rounded-xl text-sm font-black flex items-center justify-center gap-2 cursor-pointer">
            ส่งผลค่าเฉลี่ยก้าว <ChevronRight className="w-4 h-4" />
          </button>
        </article>
      </section>

      <section className="bg-white rounded-2xl border border-slate-200 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center"><History className="w-5 h-5 text-slate-600" /></div>
          <div><p className="font-black text-black">ประวัติการส่งผล</p><p className="text-sm text-slate-500">ดูสถานะหลักฐานและค่าเฉลี่ยของแต่ละสัปดาห์</p></div>
        </div>
        <button onClick={onOpenHistory} className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-sm font-bold cursor-pointer flex items-center gap-2">เปิดประวัติ <TrendingUp className="w-4 h-4" /></button>
      </section>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return <div className="bg-slate-50 rounded-xl p-4"><p className="text-xs text-slate-500 font-bold">{label}</p><p className="text-lg font-black text-black mt-1">{value}</p></div>;
}
