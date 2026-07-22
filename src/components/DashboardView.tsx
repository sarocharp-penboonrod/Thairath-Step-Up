import React, { useMemo } from 'react';
import {
  Activity,
  Award,
  CalendarCheck2,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Footprints,
  HeartPulse,
  History,
  Send,
  Sparkles,
  Target,
  Ticket,
  TrendingUp,
  XCircle
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

type WeekDisplayStatus = 'NOT_SUBMITTED' | 'PENDING' | 'TARGET_MET' | 'VERIFIED_BELOW_TARGET' | 'REJECTED';

interface WeekDisplayItem {
  number: number;
  label: string;
  range: string;
  log?: StepLog;
  status: WeekDisplayStatus;
}

function average(values: number[]): number {
  return values.length ? Math.round(values.reduce((sum, value) => sum + value, 0) / values.length) : 0;
}

function uniqueWeekCount(logs: StepLog[]): number {
  return new Set(logs.map((log) => Number(log.weekOfMonth) || 0).filter(Boolean)).size;
}

function getWeekStatus(log?: StepLog): WeekDisplayStatus {
  if (!log) return 'NOT_SUBMITTED';
  if (log.verificationStatus === 'NEEDS_REVIEW') return 'PENDING';
  if (log.verificationStatus === 'REJECTED') return 'REJECTED';
  if (isVerifiedStatus(log.verificationStatus) && Number(log.steps) >= CAMPAIGN_WEEKLY_TARGET) return 'TARGET_MET';
  return 'VERIFIED_BELOW_TARGET';
}

const WEEK_STATUS_META: Record<WeekDisplayStatus, { label: string; className: string; dotClassName: string }> = {
  NOT_SUBMITTED: {
    label: 'ยังไม่ส่งผล',
    className: 'bg-slate-50 text-slate-500 border-slate-200',
    dotClassName: 'bg-slate-300'
  },
  PENDING: {
    label: 'รอตรวจหลักฐาน',
    className: 'bg-amber-50 text-amber-700 border-amber-200',
    dotClassName: 'bg-amber-500'
  },
  TARGET_MET: {
    label: 'ผ่านตรวจและถึงเป้าหมาย',
    className: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    dotClassName: 'bg-emerald-500'
  },
  VERIFIED_BELOW_TARGET: {
    label: 'ผ่านตรวจ แต่ยังไม่ถึงเป้าหมาย',
    className: 'bg-blue-50 text-blue-700 border-blue-200',
    dotClassName: 'bg-blue-500'
  },
  REJECTED: {
    label: 'ไม่ผ่านการตรวจ',
    className: 'bg-rose-50 text-rose-700 border-rose-200',
    dotClassName: 'bg-rose-500'
  }
};

export default function DashboardView({
  activeUser,
  stepLogs,
  currentWeek,
  setActiveTab,
  onOpenHistory,
  setCurrentWeek
}: DashboardViewProps) {
  const selectedMonth = getCampaignMonth(currentWeek);

  const selectedAll = useMemo(
    () => stepLogs.filter((log) => Number(log.week) === currentWeek),
    [stepLogs, currentWeek]
  );
  const selectedVerified = useMemo(
    () => selectedAll.filter((log) => isVerifiedStatus(log.verificationStatus)),
    [selectedAll]
  );
  const cumulativeVerified = useMemo(
    () => stepLogs.filter((log) => Number(log.week) <= currentWeek && isVerifiedStatus(log.verificationStatus)),
    [stepLogs, currentWeek]
  );
  const previousMonthVerified = useMemo(
    () => stepLogs.filter((log) => Number(log.week) === currentWeek - 1 && isVerifiedStatus(log.verificationStatus)),
    [stepLogs, currentWeek]
  );

  const submittedWeeks = uniqueWeekCount(selectedAll);
  const verifiedWeeks = uniqueWeekCount(selectedVerified);
  const targetMetLogs = selectedVerified.filter((log) => Number(log.steps) >= CAMPAIGN_WEEKLY_TARGET);
  const targetMetWeeks = uniqueWeekCount(targetMetLogs);
  const pendingLogs = selectedAll.filter((log) => log.verificationStatus === 'NEEDS_REVIEW');
  const rejectedLogs = selectedAll.filter((log) => log.verificationStatus === 'REJECTED');
  const pendingWeeks = uniqueWeekCount(pendingLogs);
  const rejectedWeeks = uniqueWeekCount(rejectedLogs);

  const monthAverage = average(selectedVerified.map((log) => Number(log.steps) || 0));
  const overallAverage = average(cumulativeVerified.map((log) => Number(log.steps) || 0));
  const previousMonthAverage = average(previousMonthVerified.map((log) => Number(log.steps) || 0));
  const successRate = verifiedWeeks ? Math.round((targetMetWeeks / verifiedWeeks) * 100) : 0;
  const pendingPotentialTickets = uniqueWeekCount(
    pendingLogs.filter((log) => Number(log.steps) >= CAMPAIGN_WEEKLY_TARGET)
  );
  const remainingToTarget = Math.max(0, CAMPAIGN_WEEKLY_TARGET - monthAverage);
  const peakLog = [...selectedVerified].sort((a, b) => Number(b.steps) - Number(a.steps))[0];
  const progressPercent = Math.min(100, Math.round((monthAverage / CAMPAIGN_WEEKLY_TARGET) * 100));
  const drawProgressPercent = Math.min(100, Math.round((targetMetWeeks / Math.max(1, selectedMonth.weeks.length)) * 100));

  const trendPercent = previousMonthAverage > 0
    ? Math.round(((monthAverage - previousMonthAverage) / previousMonthAverage) * 100)
    : null;

  const weekItems: WeekDisplayItem[] = selectedMonth.weeks.map((week) => {
    const log = selectedAll.find((item) => Number(item.weekOfMonth) === week.number);
    return {
      number: week.number,
      label: week.label,
      range: week.range,
      log,
      status: getWeekStatus(log)
    };
  });

  const healthInsight = getHealthInsight(monthAverage, previousMonthAverage, activeUser.age);

  const summaryCards = [
    {
      label: 'ส่งผลแล้ว',
      value: `${submittedWeeks}/${selectedMonth.weeks.length}`,
      suffix: 'สัปดาห์',
      helper: 'นับทุกสถานะที่ส่งเข้าระบบ',
      icon: Send,
      className: 'bg-slate-100 text-slate-700'
    },
    {
      label: 'ผ่านการตรวจ',
      value: String(verifiedWeeks),
      suffix: 'สัปดาห์',
      helper: 'ผ่านอัตโนมัติหรือ Admin อนุมัติ',
      icon: CheckCircle2,
      className: 'bg-blue-50 text-blue-600'
    },
    {
      label: 'ผ่านเป้าหมาย',
      value: String(targetMetWeeks),
      suffix: 'สัปดาห์',
      helper: `Success Rate ${successRate}%`,
      icon: CalendarCheck2,
      className: 'bg-emerald-50 text-[#00914E]'
    },
    {
      label: 'รอตรวจ',
      value: String(pendingWeeks),
      suffix: 'สัปดาห์',
      helper: pendingWeeks ? 'ยังไม่นำไปคำนวณผล' : 'ไม่มีรายการค้างตรวจ',
      icon: Clock3,
      className: 'bg-amber-50 text-amber-600'
    },
    {
      label: 'ไม่ผ่านการตรวจ',
      value: String(rejectedWeeks),
      suffix: 'สัปดาห์',
      helper: rejectedWeeks ? 'ดูเหตุผลได้ในประวัติ' : 'ไม่มีรายการไม่ผ่าน',
      icon: XCircle,
      className: 'bg-rose-50 text-rose-600'
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

      <section className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3">
        {summaryCards.map((card) => (
          <article key={card.label} className="bg-white rounded-2xl border border-slate-200 p-4 md:p-5 shadow-sm min-w-0">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${card.className}`}><card.icon className="w-5 h-5" /></div>
            <p className="text-xs text-slate-500 font-bold mt-4">{card.label}</p>
            <p className="text-2xl md:text-3xl font-black text-black mt-1 break-words">{card.value}<span className="text-xs ml-1 text-slate-500">{card.suffix}</span></p>
            <p className="text-xs text-slate-400 mt-2 leading-relaxed">{card.helper}</p>
          </article>
        ))}
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <article className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-5 md:p-6 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-black text-black">ผลเดือน{selectedMonth.label}</h2>
              <p className="text-sm text-slate-500 mt-1">ค่าเฉลี่ยคำนวณจากรายการที่ผ่านการตรวจ ส่วนจำนวนสัปดาห์ที่ส่งนับทุกสถานะ</p>
            </div>
            <Activity className="w-6 h-6 text-[#00914E]" />
          </div>

          <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Metric label="ค่าเฉลี่ยเดือนนี้" value={`${monthAverage.toLocaleString()} ก้าว/วัน`} />
            <Metric label="ค่าเฉลี่ยถึงเดือนนี้" value={`${overallAverage.toLocaleString()} ก้าว/วัน`} />
            <Metric label="สัปดาห์สูงสุด" value={peakLog ? `${Number(peakLog.steps).toLocaleString()} ก้าว/วัน` : '-'} />
          </div>

          <div className="mt-6">
            <div className="flex justify-between gap-4 text-sm font-bold">
              <span>ความคืบหน้าเทียบเป้าหมายเฉลี่ยต่อวัน</span>
              <span className="whitespace-nowrap">{monthAverage.toLocaleString()} / {CAMPAIGN_WEEKLY_TARGET.toLocaleString()}</span>
            </div>
            <div className="h-3 bg-slate-100 rounded-full mt-3 overflow-hidden">
              <div className="h-full bg-[#00914E] rounded-full transition-all" style={{ width: `${progressPercent}%` }} />
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

        <article className="relative overflow-hidden bg-gradient-to-br from-[#00914E] via-[#007f45] to-[#075d38] text-white rounded-2xl p-5 md:p-6 shadow-sm flex flex-col justify-between min-h-[310px]">
          <div className="absolute -right-8 -top-8 w-36 h-36 rounded-full border-[22px] border-white/5" />
          <div className="absolute right-5 top-5 grid grid-cols-6 gap-1 opacity-20" aria-hidden="true">
            {Array.from({ length: 30 }).map((_, index) => <span key={index} className="w-1 h-1 rounded-full bg-white" />)}
          </div>
          <div className="relative">
            <div className="flex items-center gap-2 text-emerald-100"><Sparkles className="w-5 h-5" /><p className="text-sm font-black">สิทธิ์ลุ้นรางวัล LUCKY DRAW</p></div>
            <div className="mt-5 flex items-end gap-3">
              <p className="text-6xl md:text-7xl font-black text-[#FFD400] leading-none">{activeUser.totalTickets || 0}</p>
              <p className="pb-2 text-sm font-bold text-emerald-100">ใบสะสมทั้งหมด</p>
            </div>
            <p className="text-sm text-emerald-100 leading-relaxed mt-4">ได้รับ 1 คูปอง เมื่อค่าเฉลี่ยของสัปดาห์ตั้งแต่ 7,000 ก้าว/วัน และหลักฐานผ่านการตรวจแล้ว</p>
          </div>

          <div className="relative mt-7 space-y-3">
            <div className="flex items-center justify-between text-sm font-bold"><span>ผ่านเป้าหมายเดือนนี้</span><span>{targetMetWeeks}/{selectedMonth.weeks.length} สัปดาห์</span></div>
            <div className="h-2.5 rounded-full bg-white/20 overflow-hidden"><div className="h-full rounded-full bg-[#FFD400]" style={{ width: `${drawProgressPercent}%` }} /></div>
            <div className="grid grid-cols-2 gap-2 pt-1">
              <div className="rounded-xl bg-white/10 border border-white/10 p-3"><p className="text-xs text-emerald-100">คูปองเดือนนี้</p><p className="text-xl font-black text-[#FFD400] mt-1">{targetMetWeeks} ใบ</p></div>
              <div className="rounded-xl bg-white/10 border border-white/10 p-3"><p className="text-xs text-emerald-100">อาจได้รับเพิ่ม</p><p className="text-xl font-black text-white mt-1">{pendingPotentialTickets} ใบ</p><p className="text-[11px] text-emerald-100 mt-1">จากรายการรอตรวจ</p></div>
            </div>
          </div>
        </article>
      </section>

      <section className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        <article className="xl:col-span-2 bg-white rounded-2xl border border-slate-200 p-5 md:p-6 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-black text-black">สถานะผลรายสัปดาห์</h2>
              <p className="text-sm text-slate-500 mt-1">ดูได้ทันทีว่าส่งแล้ว ผ่านตรวจ ถึงเป้าหมาย หรือยังมีรายการที่ต้องดำเนินการ</p>
            </div>
            <button onClick={onOpenHistory} className="self-start px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-sm font-bold cursor-pointer flex items-center gap-2">
              ดูรายละเอียดทั้งหมด <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-5">
            {weekItems.map((item) => {
              const status = WEEK_STATUS_META[item.status];
              return (
                <div key={item.number} className="rounded-2xl border border-slate-200 p-4 flex gap-3 items-start">
                  <span className={`w-2.5 h-2.5 rounded-full mt-1.5 flex-shrink-0 ${status.dotClassName}`} />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div><p className="font-black text-black">{item.label}</p><p className="text-xs text-slate-400 mt-1">{item.range}</p></div>
                      {item.log && <p className="font-black text-black whitespace-nowrap">{Number(item.log.steps).toLocaleString()} <span className="text-xs text-slate-500">ก้าว/วัน</span></p>}
                    </div>
                    <span className={`inline-flex mt-3 px-2.5 py-1 rounded-full border text-xs font-bold ${status.className}`}>{status.label}</span>
                    {item.log?.reviewNote && <p className="text-xs text-rose-600 mt-2 leading-relaxed">หมายเหตุ: {item.log.reviewNote}</p>}
                  </div>
                </div>
              );
            })}
          </div>

          <button onClick={() => setActiveTab('submission')} className="mt-5 w-full sm:w-auto bg-[#00914E] hover:bg-[#00703c] text-white px-5 py-3 rounded-xl text-sm font-black flex items-center justify-center gap-2 cursor-pointer">
            ส่งผลค่าเฉลี่ยก้าว <ChevronRight className="w-4 h-4" />
          </button>
        </article>

        <article className="bg-white rounded-2xl border border-slate-200 p-5 md:p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-[#00914E] flex items-center justify-center"><HeartPulse className="w-5 h-5" /></div>
            <div><h2 className="text-lg font-black text-black">Health Insight</h2><p className="text-xs text-slate-500">วิเคราะห์จากข้อมูลที่ผ่านการตรวจ</p></div>
          </div>

          <div className="mt-5 space-y-3">
            <InsightRow label="ค่าเฉลี่ยเดือนนี้" value={`${monthAverage.toLocaleString()} ก้าว/วัน`} />
            <InsightRow label="เป้าหมายโครงการ" value={`${CAMPAIGN_WEEKLY_TARGET.toLocaleString()} ก้าว/วัน`} />
            <InsightRow
              label="แนวโน้มจากเดือนก่อน"
              value={trendPercent === null ? 'ยังไม่มีข้อมูลเปรียบเทียบ' : `${trendPercent >= 0 ? '+' : ''}${trendPercent}%`}
              valueClassName={trendPercent === null ? 'text-slate-500' : trendPercent >= 0 ? 'text-[#00914E]' : 'text-rose-600'}
            />
            {activeUser.age ? <InsightRow label="ข้อมูลช่วงวัย" value={`${activeUser.age} ปี`} /> : null}
          </div>

          <div className={`mt-4 rounded-2xl border p-4 ${healthInsight.className}`}>
            <p className="font-black">{healthInsight.title}</p>
            <p className="text-sm mt-2 leading-relaxed">{healthInsight.message}</p>
          </div>

          <div className="mt-4 rounded-2xl bg-slate-50 border border-slate-200 p-4">
            <div className="flex gap-2"><Ticket className="w-4 h-4 text-[#00914E] mt-0.5 flex-shrink-0" /><p className="text-sm font-bold text-slate-700">สัปดาห์ที่ถึงเป้าหมายจะเพิ่มคูปองหลังหลักฐานผ่านการตรวจเท่านั้น</p></div>
          </div>

          <p className="text-[11px] text-slate-400 leading-relaxed mt-4">ข้อมูลนี้ใช้เพื่อส่งเสริมการขยับร่างกายทั่วไป ไม่ใช่คำวินิจฉัยหรือคำแนะนำทางการแพทย์</p>
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

function InsightRow({ label, value, valueClassName = 'text-black' }: { label: string; value: string; valueClassName?: string }) {
  return (
    <div className="bg-slate-50 rounded-xl p-3.5 flex items-center justify-between gap-3">
      <p className="text-xs text-slate-500 font-bold">{label}</p>
      <p className={`text-sm font-black text-right ${valueClassName}`}>{value}</p>
    </div>
  );
}

function getHealthInsight(monthAverage: number, previousMonthAverage: number, age?: number): { title: string; message: string; className: string } {
  const ageContext = age ? ` สำหรับข้อมูลช่วงวัย ${age} ปี` : '';

  if (!monthAverage) {
    return {
      title: 'เริ่มต้นติดตามสุขภาพของคุณ',
      message: `ส่งผลสัปดาห์แรกเพื่อให้ระบบเริ่มวิเคราะห์แนวโน้ม${ageContext}`,
      className: 'bg-slate-50 text-slate-700 border-slate-200'
    };
  }

  if (monthAverage < 5000) {
    return {
      title: 'ค่อย ๆ เพิ่มการขยับระหว่างวัน',
      message: `ลองเพิ่มช่วงเดินสั้น ๆ ระหว่างวัน เพื่อขยับเข้าใกล้เป้าหมายอีก ${(CAMPAIGN_WEEKLY_TARGET - monthAverage).toLocaleString()} ก้าว/วัน`,
      className: 'bg-amber-50 text-amber-800 border-amber-200'
    };
  }

  if (monthAverage < CAMPAIGN_WEEKLY_TARGET) {
    return {
      title: 'ใกล้ถึงเป้าหมายแล้ว',
      message: `อีกเพียงเฉลี่ย ${(CAMPAIGN_WEEKLY_TARGET - monthAverage).toLocaleString()} ก้าว/วัน ก็จะถึงเป้าหมายของโครงการ รักษาความสม่ำเสมอต่อไป`,
      className: 'bg-blue-50 text-blue-800 border-blue-200'
    };
  }

  if (previousMonthAverage > 0 && monthAverage < previousMonthAverage) {
    return {
      title: 'ถึงเป้าหมายแล้ว รักษาความสม่ำเสมอ',
      message: 'ค่าเฉลี่ยยังผ่านเป้าหมาย แม้ลดลงจากเดือนก่อนเล็กน้อย ลองรักษารูปแบบการเดินที่ทำได้ต่อเนื่องในชีวิตประจำวัน',
      className: 'bg-emerald-50 text-emerald-800 border-emerald-200'
    };
  }

  return {
    title: 'ทำได้ดีและถึงเป้าหมาย',
    message: 'ค่าเฉลี่ยของคุณอยู่ในระดับเป้าหมายแล้ว รักษาความสม่ำเสมอในแต่ละสัปดาห์เพื่อสะสมคูปองอย่างต่อเนื่อง',
    className: 'bg-emerald-50 text-emerald-800 border-emerald-200'
  };
}
