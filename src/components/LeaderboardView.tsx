import React, { useMemo, useState } from 'react';
import { Building2, RefreshCw, Search, Trophy, Users } from 'lucide-react';
import { ActiveUser, BusinessUnitInfo, DepartmentInfo } from '../types';
import { getCampaignMonth } from '../campaignConfig';

interface LeaderboardViewProps {
  departments: DepartmentInfo[];
  businessUnits: BusinessUnitInfo[];
  activeUser: ActiveUser;
  currentMonth: number;
  lastRefreshedAt: string;
  isRefreshing: boolean;
  onRefresh: () => void;
}

type RankingMode = 'bu' | 'department';

function formatRefreshTime(value: string): string {
  if (!value) return 'ยังไม่อัปเดต';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('th-TH', {
    timeZone: 'Asia/Bangkok',
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });
}

export default function LeaderboardView({
  departments,
  businessUnits,
  activeUser,
  currentMonth,
  lastRefreshedAt,
  isRefreshing,
  onRefresh
}: LeaderboardViewProps) {
  const [mode, setMode] = useState<RankingMode>('bu');
  const [selectedBU, setSelectedBU] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  const buRows = useMemo(() => {
    const search = searchTerm.trim().toLowerCase();
    return [...businessUnits]
      .filter((item) => !search || item.nameTh.toLowerCase().includes(search) || item.id.toLowerCase().includes(search))
      .sort((a, b) => b.averageStepsPerPerson - a.averageStepsPerPerson);
  }, [businessUnits, searchTerm]);

  const departmentRows = useMemo(() => {
    const search = searchTerm.trim().toLowerCase();
    return [...departments]
      .filter((item) => selectedBU === 'all' || item.buId === selectedBU)
      .filter((item) => !search || item.nameTh.toLowerCase().includes(search) || item.id.toLowerCase().includes(search))
      .sort((a, b) => b.totalSteps - a.totalSteps || b.participationRate - a.participationRate);
  }, [departments, selectedBU, searchTerm]);

  const rows = mode === 'bu' ? buRows : departmentRows;
  const currentRank = mode === 'bu'
    ? buRows.findIndex((item) => item.id === activeUser.buId) + 1
    : departmentRows.findIndex((item) => item.id === activeUser.departmentId) + 1;

  return (
    <div className="space-y-6">
      <section className="bg-white p-5 md:p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl md:text-2xl font-black text-black">Leaderboard Step Up</h2>
          <p className="text-sm text-slate-500 mt-2">อันดับ BU ใช้ค่าเฉลี่ยต่อคน · อันดับฝ่ายรวมค่าก้าวเฉลี่ยรายสัปดาห์ของทุกคน · ข้าม BU เฉพาะทีมที่ Admin กำหนด</p>
        </div>
        <button onClick={onRefresh} disabled={isRefreshing} className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 disabled:opacity-60 text-slate-700 font-bold text-sm px-4 py-3 rounded-xl cursor-pointer">
          <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          <span>อัปเดตล่าสุด {formatRefreshTime(lastRefreshedAt)}</span>
        </button>
      </section>

      <section className="bg-white rounded-2xl border border-slate-200 p-4 md:p-5 shadow-sm space-y-4">
        <div className="flex flex-wrap gap-2">
          <button onClick={() => setMode('bu')} className={`px-4 py-2.5 rounded-xl text-sm font-black flex items-center gap-2 cursor-pointer ${mode === 'bu' ? 'bg-black text-white' : 'bg-slate-100 text-slate-600'}`}><Building2 className="w-4 h-4" />อันดับราย BU</button>
          <button onClick={() => setMode('department')} className={`px-4 py-2.5 rounded-xl text-sm font-black flex items-center gap-2 cursor-pointer ${mode === 'department' ? 'bg-black text-white' : 'bg-slate-100 text-slate-600'}`}><Users className="w-4 h-4" />อันดับรายฝ่าย</button>
        </div>

        <div className="flex flex-col md:flex-row gap-3">
          {mode === 'department' && (
            <select value={selectedBU} onChange={(event) => setSelectedBU(event.target.value)} className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold min-w-[220px]">
              <option value="all">ทุก BU</option>
              {businessUnits.map((bu) => <option key={bu.id} value={bu.id}>{bu.nameTh}</option>)}
            </select>
          )}
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
            <input value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} placeholder={mode === 'bu' ? 'ค้นหา BU' : 'ค้นหาฝ่าย'} className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-11 pr-4 py-3 text-sm font-semibold outline-none focus:border-[#00914E]" />
          </div>
        </div>
      </section>

      {currentRank > 0 && (
        <section className="bg-emerald-50 border border-emerald-100 rounded-2xl p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#00914E] text-white flex items-center justify-center"><Trophy className="w-5 h-5" /></div>
          <div><p className="text-sm font-black text-black">อันดับของคุณในมุมมองนี้: #{currentRank}</p><p className="text-sm text-slate-600 mt-1">{mode === 'department' ? 'ผลก้าวเฉลี่ยที่ผ่านตรวจของแต่ละสัปดาห์จะถูกบวกเข้าคะแนนรวมของทีมโดยตรง' : 'ชวนทีมส่งผลอย่างสม่ำเสมอ เพื่อเพิ่มทั้งค่าเฉลี่ยและ Participation Rate'}</p></div>
        </section>
      )}

      <section className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-sm">
            <thead className="bg-slate-50 text-slate-500">
              <tr>
                <th className="p-4 text-center w-20">อันดับ</th>
                <th className="p-4 text-left">{mode === 'bu' ? 'BU' : 'ฝ่าย / BU'}</th>
                <th className="p-4 text-center">ผู้เข้าร่วม</th>
                <th className="p-4 text-center">Participation</th>
                <th className="p-4 text-right">{mode === 'department' ? 'ก้าวรวมของทีม' : 'ค่าเฉลี่ยก้าว/วัน'}</th>
                <th className="p-4 text-left">สถานะ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((row, index) => {
                const isCurrent = mode === 'bu'
                  ? row.id === activeUser.buId
                  : row.id === activeUser.departmentId;
                return (
                  <tr key={mode === 'bu' ? row.id : `${(row as DepartmentInfo).buId}:${row.id}`} className={isCurrent ? 'bg-emerald-50/70' : 'hover:bg-slate-50'}>
                    <td className="p-4 text-center"><span className={`inline-flex w-9 h-9 rounded-full items-center justify-center font-black ${index < 3 ? 'bg-amber-50 text-amber-700' : 'bg-slate-100 text-slate-600'}`}>{index + 1}</span></td>
                    <td className="p-4"><p className="font-black text-black">{row.nameTh}</p>{mode === 'department' && <p className="text-xs text-slate-400 mt-1">BU {(row as DepartmentInfo).buId}</p>}</td>
                    <td className="p-4 text-center font-bold">{row.participantCount || 0}/{row.memberCount || 0}</td>
                    <td className="p-4 text-center font-bold">{row.participationRate}%</td>
                    <td className="p-4 text-right">
                      <p className="text-lg font-black text-[#00914E]">{(mode === 'department' ? (row as DepartmentInfo).totalSteps : row.averageStepsPerPerson).toLocaleString()}</p>
                      <p className="text-xs text-slate-400">{mode === 'department' ? 'ก้าวรวม' : 'ก้าว/วัน'}</p>
                      {mode === 'department' && <p className="text-[10px] text-slate-400 mt-1">เฉลี่ย {row.averageStepsPerPerson.toLocaleString()}/คน</p>}
                    </td>
                    <td className="p-4 text-slate-500">{row.statusText || 'ข้อมูลจากระบบ'}</td>
                  </tr>
                );
              })}
              {rows.length === 0 && <tr><td colSpan={6} className="p-12 text-center text-slate-400 font-bold">ยังไม่มีข้อมูลที่ผ่านตรวจสำหรับตัวกรองนี้</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
      <p className="text-xs text-slate-400 text-center">ข้อมูลเดือน{getCampaignMonth(currentMonth).label} · ข้อมูลล่าสุดจากระบบ</p>
    </div>
  );
}
