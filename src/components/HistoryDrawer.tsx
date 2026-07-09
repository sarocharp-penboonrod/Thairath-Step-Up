import React, { useMemo } from 'react';
import { X, History, Trash2, Calendar, Award, ExternalLink, Sliders } from 'lucide-react';
import { StepLog, WeekConfig } from '../types';

interface HistoryDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  stepLogs: StepLog[];
  weeks: WeekConfig[];
  onDeleteLog: (id: string) => void;
}

export default function HistoryDrawer({
  isOpen,
  onClose,
  stepLogs,
  weeks,
  onDeleteLog
}: HistoryDrawerProps) {
  
  if (!isOpen) return null;

  // Sort logs: newest first
  const sortedLogs = useMemo(() => {
    return [...stepLogs].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [stepLogs]);

  return (
    <div className="fixed inset-0 bg-[#000000]/60 backdrop-blur-xs flex items-center justify-center z-50 animate-fade-in">
      <div className="bg-white w-full max-w-2xl rounded-2xl max-h-[85vh] shadow-2xl flex flex-col overflow-hidden m-4 border border-[#edf2f7]">
        
        {/* Header */}
        <div className="p-5 border-b border-gray-150 flex items-center justify-between bg-white sticky top-0 z-15">
          <div className="flex items-center gap-2 text-[#008148]">
            <History className="w-5 h-5 stroke-[2.5px]" />
            <h3 className="font-extrabold text-lg text-black">ประวัติการส่งรายงานก้าวสะสม</h3>
          </div>
          <button 
            id="close-history-btn"
            onClick={onClose}
            className="p-1 px-1.5 hover:bg-[#F2F4F7] rounded-lg text-[#344054] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* List Body */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1">
          {sortedLogs.length === 0 ? (
            <div className="py-20 text-center text-gray-400 font-medium space-y-2">
              <History className="w-12 h-12 text-gray-300 mx-auto" />
              <p className="text-sm">ยังไม่มีประวัติการส่งรายงานหน้าจอก้าวเดิน</p>
              <p className="text-xs text-gray-400">กรุณาบันทึกข้อมูลก้าวที่เมนู "ส่งผลก้าว" ก่อน</p>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-xs text-[#344054] font-semibold">
                * รายการประวัติทั้งหมดของคุณ ({sortedLogs.length} บันทึก) คุณสามารถลบประวัติเพื่อทดสอบการลดระดับคะแนนได้
              </p>
              
              <div className="divide-y divide-gray-100 border border-[#edf2f7] rounded-xl overflow-hidden bg-white">
                {sortedLogs.map((log) => {
                  const MONTH_NAMES = [
                    "",
                    "กรกฎาคม 2026",
                    "สิงหาคม 2026",
                    "กันยายน 2026",
                    "ตุลาคม 2026",
                    "พฤศจิกายน 2026",
                    "ธันวาคม 2026"
                  ];
                  const mText = MONTH_NAMES[log.week] || "กรกฎาคม 2026";
                  const wText = log.weekOfMonth ? `สัปดาห์ที่ ${log.weekOfMonth}` : "สัปดาห์ที่ 1";
                  
                  return (
                    <div key={log.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-gray-50/50 transition-colors">
                      
                      {/* Left: Metadata */}
                      <div className="flex items-start gap-3">
                        {log.imagePreview ? (
                          <img 
                            src={log.imagePreview} 
                            alt="Screenshot Proof" 
                            className="w-12 h-12 rounded-lg object-cover border border-gray-200/50 flex-shrink-0"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-lg bg-[#e6f5ee] text-[#008148] flex items-center justify-center font-bold text-xs flex-shrink-0">
                            IMG
                          </div>
                        )}
                        <div className="text-left space-y-0.5">
                          <p className="font-bold text-sm text-[#000000]">
                            {new Date(log.date).toLocaleDateString('th-TH', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                          </p>
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-[10px] font-bold bg-[#e6f5ee] text-[#008148] px-2 py-0.5 rounded-md">
                              {mText} • {wText}
                            </span>
                            <span className="text-[10px] text-[#344054] font-medium max-w-[130px] truncate" title={log.imageName}>
                              📸 {log.imageName}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Right: Steps & Delete Action */}
                      <div className="flex items-center justify-between sm:justify-end gap-6 border-t sm:border-0 pt-3 sm:pt-0">
                        <div className="text-left sm:text-right">
                          <span className="text-[10px] font-bold text-gray-400 block uppercase">ปริมาณก้าวส่งผล</span>
                          <span className="text-lg font-black text-[#008148]">
                            {log.steps.toLocaleString()} <span className="text-xs font-normal text-gray-500">ก้าว</span>
                          </span>
                        </div>

                        <button
                          onClick={() => onDeleteLog(log.id)}
                          className="p-2.5 bg-rose-50 hover:bg-rose-100 text-rose-600 hover:text-rose-700 rounded-xl transition-all cursor-pointer"
                          title="ลบรายงานนี้"
                        >
                          <Trash2 className="w-4.5 h-4.5" />
                        </button>
                      </div>

                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-[#F2F4F7] border-t border-gray-150 flex items-center justify-between">
          <span className="text-[10px] text-[#344054] font-semibold">
            Thairath Logistics Health System
          </span>
          <button
            onClick={onClose}
            className="text-xs font-bold bg-[#008148] hover:bg-[#005a32] text-white px-5 py-2 rounded-xl cursor-pointer shadow-xs transition-colors"
          >
            ปิดหน้าบัญชี
          </button>
        </div>

      </div>
    </div>
  );
}
