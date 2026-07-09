import React, { useState, useMemo } from 'react';
import { Award, ChevronUp, ChevronDown, Minus, Search, RefreshCw, Trophy, Target, Lightbulb, Star } from 'lucide-react';
import { DepartmentInfo, ActiveUser } from '../types';

interface LeaderboardViewProps {
  departments: DepartmentInfo[];
  activeUser: ActiveUser;
}

export default function LeaderboardView({
  departments,
  activeUser
}: LeaderboardViewProps) {
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [sortBy, setSortBy] = useState<'steps' | 'participation'>('steps');
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  // Trigger brief load effect for premium feel
  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      setIsRefreshing(false);
    }, 600);
  };

  // Compute stats sorted & filtered
  const processedDepartments = useMemo(() => {
    // Clone array
    let list = [...departments];

    // Search filter
    if (searchTerm.trim() !== '') {
      const lower = searchTerm.toLowerCase();
      list = list.filter(dept => 
        dept.nameTh.toLowerCase().includes(lower) || 
        dept.nameEn.toLowerCase().includes(lower)
      );
    }

    // Sort accordingly
    if (sortBy === 'steps') {
      list.sort((a, b) => b.averageStepsPerPerson - a.averageStepsPerPerson);
    } else {
      list.sort((a, b) => b.participationRate - a.participationRate);
    }

    return list;
  }, [departments, searchTerm, sortBy]);

  // Find user's active department's rank
  const activeUserRankIndex = useMemo(() => {
    const list = [...departments].sort((a, b) => b.averageStepsPerPerson - a.averageStepsPerPerson);
    return list.findIndex(d => d.id === activeUser.departmentId) + 1;
  }, [departments, activeUser.departmentId]);

  const activeUserDept = departments.find(d => d.id === activeUser.departmentId);

  // Gamified insight message
  const challengeInsight = useMemo(() => {
    if (activeUserRankIndex === 1) {
      return 'สุดยอดมาก! ฝ่ายของคุณกำลังครองอันดับ 1 ในตารางท้าทายสัปดาห์นี้ เดินขยับเพิ่มความโปรดักทีฟต่อไป';
    }
    
    // Find department right above user's
    const list = [...departments].sort((a, b) => b.averageStepsPerPerson - a.averageStepsPerPerson);
    const targetRankIndex = activeUserRankIndex - 1; // index above
    if (targetRankIndex > 0 && targetRankIndex <= list.length) {
      const aboveDept = list[targetRankIndex - 1];
      const gapSteps = aboveDept.averageStepsPerPerson - (activeUserDept?.averageStepsPerPerson || 0);
      return `อีกขาดเพียงประมาณ ${Math.max(10, Math.round(gapSteps))} ก้าวเฉลี่ยต่อคน แผนกของคุณจะสามารถขึ้นไปแซงอันดับอยู่อย่าง "${aboveDept.nameTh}"! 🚀`;
    }
    return 'พยายามชวนเพื่อนร่วมงานส่งผลเพิ่มขึ้นเพื่อดันก้าวเฉลี่ยสะสมด่วน!';
  }, [activeUserRankIndex, departments, activeUserDept]);

  return (
    <div className="space-y-6">
      
      {/* Page Title & Information Banner */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 id="leaderboard-title" className="text-xl md:text-2xl font-black text-[#000000] tracking-tight">
            อันดับของแต่ละหน่วยงาน
          </h2>
          <p className="text-xs md:text-sm text-[#344054] font-medium mt-1">
            การจัดอันดับคำนวณจากก้าวเฉลี่ยของสมาชิกทุกคนในฝ่าย
          </p>
        </div>
        
        {/* Real-time sync button */}
        <button
          onClick={handleRefresh}
          className="flex items-center gap-2 bg-[#F2F4F7] hover:bg-gray-200 text-[#344054] font-extrabold text-xs px-4 py-2.5 rounded-xl transition-all cursor-pointer self-start md:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
          <span>เชื่อมต่อเซิร์ฟเวอร์ Thairath Health | เรียลไทม์วันนี้</span>
        </button>
      </div>

      {/* Gamified Health Insight Widget */}
      <div className="bg-[#e6f5ee] border-l-4 border-[#00914E] p-4.5 rounded-r-2xl flex items-start gap-3 shadow-xs border border-transparent">
        <div className="bg-[#00914E]/15 p-2 rounded-xl text-[#00914E] flex-shrink-0">
          <Lightbulb className="w-5 h-5 text-[#00914E] stroke-[2.5px]" />
        </div>
        <div>
          <h4 className="text-sm font-extrabold text-[#000000] flex items-center gap-1.5">
            <Trophy className="w-4 h-4 text-amber-500" />
            วิเคราะห์โอกาสการแข่งขันสำหรับทีมของคุณ (อันดับปัจจุบัน: #{activeUserRankIndex})
          </h4>
          <p className="text-xs text-[#344054] font-medium mt-1 leading-relaxed">
            {challengeInsight}
          </p>
        </div>
      </div>

      {/* Search and Filter Panel (Bento Style layout tool) */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
        
        {/* Search */}
        <div className="relative flex-1">
          <Search className="w-4.5 h-4.5 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            id="dept-search-input"
            type="text"
            placeholder="ค้นหาแผนกหน่วยงานของคุณ..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-[#F2F4F7] border border-transparent rounded-xl pl-10 pr-4 py-2.5 text-xs md:text-sm font-semibold outline-none focus:border-[#00914E] focus:bg-white text-gray-800 transition-all border-slate-100"
          />
        </div>

      </div>

      {/* Leaderboard Table Grid Content block */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b-2 border-gray-100 text-[#344054] font-bold text-xs md:text-sm">
                <th width="100" className="py-4 px-6 text-center">อันดับ</th>
                <th className="py-4 px-4 text-left">ฝ่าย / แผนก</th>
                <th width="220" className="py-4 px-4 text-right">ก้าวเฉลี่ยรายคน / วัน</th>
                <th width="180" className="py-4 px-6 text-center">สถานะทีม</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 font-medium">
              
              {processedDepartments.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-12 text-center text-sm text-gray-400 font-medium">
                    ไม่พบข้อมูลแผนกที่คุณค้นหา
                  </td>
                </tr>
              ) : (
                processedDepartments.map((dept, index) => {
                  // Determine actual rank list indices (since default can sort representation)
                  // Find rank in the global sorted steps database to assign medals
                  const globalRankList = [...departments].sort((a, b) => b.averageStepsPerPerson - a.averageStepsPerPerson);
                  const rankIndex = globalRankList.findIndex(d => d.id === dept.id) + 1;

                  const isUserTeam = dept.id === activeUser.departmentId;

                  // Rank Badge styles
                  let rankBadgeStyle = 'bg-gray-100 text-[#2d3748]';
                  if (rankIndex === 1) rankBadgeStyle = 'bg-yellow-400 text-[#000] font-black border border-yellow-500 shadow-xs scale-105';
                  else if (rankIndex === 2) rankBadgeStyle = 'bg-slate-300 text-[#2d3748] font-black border border-slate-400 shadow-xs';
                  else if (rankIndex === 3) rankBadgeStyle = 'bg-amber-600 text-white font-extrabold shadow-none';

                  // Change status icon & color
                  let statusElement;
                  if (dept.status === 'up') {
                    statusElement = (
                      <span className="inline-flex items-center justify-center gap-1 text-emerald-600 font-extrabold text-[13px] bg-emerald-50 px-3 py-1 rounded-full border border-emerald-100/50">
                        <ChevronUp className="w-4 h-4" />
                        <span>{dept.statusText}</span>
                      </span>
                    );
                  } else if (dept.status === 'down') {
                    statusElement = (
                      <span className="inline-flex items-center justify-center gap-1 text-rose-600 font-extrabold text-[13px] bg-rose-50 px-3 py-1 rounded-full border border-rose-100/50">
                        <ChevronDown className="w-4 h-4" />
                        <span>{dept.statusText}</span>
                      </span>
                    );
                  } else {
                    statusElement = (
                      <span className="inline-flex items-center justify-center gap-1 text-gray-500 font-bold text-[13px] bg-gray-50 px-3 py-1 rounded-full border border-gray-100/50">
                        <Minus className="w-3 h-3" />
                        <span>{dept.statusText}</span>
                      </span>
                    );
                  }

                  return (
                    <tr 
                      key={dept.id} 
                      className={`transition-colors group ${
                        isUserTeam 
                          ? 'bg-[#e6f5ee]/45 hover:bg-[#e6f5ee] font-black border-l-4 border-[#00914E]' 
                          : 'hover:bg-gray-50/75'
                      }`}
                    >
                      {/* Rank Index Column */}
                      <td className="py-4.5 px-6 text-center">
                        <div className="flex items-center justify-center">
                          <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm ${rankBadgeStyle}`}>
                            {rankIndex}
                          </span>
                        </div>
                      </td>

                      {/* Department Names */}
                      <td className="py-4.5 px-4 text-left">
                        <div className="flex items-center gap-2">
                          <div className="text-left">
                            <p className="text-sm md:text-base font-extrabold text-[#000000] flex items-center gap-1.5">
                              {dept.nameTh}
                              {isUserTeam && (
                                <span className="text-[10px] bg-[#00914E] text-white px-2 py-0.5 rounded-full font-black animate-pulse flex items-center gap-0.5">
                                  <Star className="w-2.5 h-2.5 fill-current" />
                                  ทีมของคุณ
                                </span>
                              )}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Avg Steps Column */}
                      <td className="py-4.5 px-4 text-right">
                        <span className={`text-md md:text-base font-extrabold ${isUserTeam ? 'text-[#00914E] font-black' : 'text-[#000000]'}`}>
                          {dept.averageStepsPerPerson.toLocaleString()} ก้าว
                        </span>
                      </td>

                      {/* Team status change indicators */}
                      <td className="py-4.5 px-6 text-center">
                        {statusElement}
                      </td>
                    </tr>
                  );
                })
              )}

            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
