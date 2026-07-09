import React, { useState, useRef } from 'react';
import { Upload, CircleCheck, AlertTriangle, Image as ImageIcon, Flame, Calendar, RefreshCw, Sparkles, HelpCircle } from 'lucide-react';
import { ActiveUser, StepLog, WeekConfig } from '../types';

interface SubmissionViewProps {
  activeUser: ActiveUser;
  currentWeek: number;
  weeks: WeekConfig[];
  onAddLog: (steps: number, date: string, imageName: string, imagePreview?: string, weekNumber?: number, weekOfMonth?: number) => void;
  setActiveTab: (tab: string) => void;
}

export default function SubmissionView({
  activeUser,
  currentWeek,
  weeks,
  onAddLog,
  setActiveTab
}: SubmissionViewProps) {
  // Month selector options based on user requirement
  const MONTHS_LIST = [
    { number: 1, label: 'กรกฎาคม 2026' },
    { number: 2, label: 'สิงหาคม 2026' },
    { number: 3, label: 'กันยายน 2026' },
    { number: 4, label: 'ตุลาคม 2026' },
    { number: 5, label: 'พฤศจิกายน 2026' },
    { number: 6, label: 'ธันวาคม 2026' }
  ];

  // Friday-ending week ranges based on exact 2026 calendar
  const CALENDAR_DATA: Record<number, { number: number; label: string; range: string; endDateString: string }[]> = {
    1: [ // กรกฎาคม 2026
      { number: 1, label: 'สัปดาห์ที่ 1', range: '1 ก.ค. - 10 ก.ค. 2026', endDateString: '2026-07-10' },
      { number: 2, label: 'สัปดาห์ที่ 2', range: '11 ก.ค. - 17 ก.ค. 2026', endDateString: '2026-07-17' },
      { number: 3, label: 'สัปดาห์ที่ 3', range: '18 ก.ค. - 24 ก.ค. 2026', endDateString: '2026-07-24' },
      { number: 4, label: 'สัปดาห์ที่ 4', range: '25 ก.ค. - 31 ก.ค. 2026', endDateString: '2026-07-31' }
    ],
    2: [ // สิงหาคม 2026
      { number: 1, label: 'สัปดาห์ที่ 1', range: '1 ส.ค. - 7 ส.ค. 2026', endDateString: '2026-08-07' },
      { number: 2, label: 'สัปดาห์ที่ 2', range: '8 ส.ค. - 14 ส.ค. 2026', endDateString: '2026-08-14' },
      { number: 3, label: 'สัปดาห์ที่ 3', range: '15 ส.ค. - 21 ส.ค. 2026', endDateString: '2026-08-21' },
      { number: 4, label: 'สัปดาห์ที่ 4', range: '22 ส.ค. - 28 ส.ค. 2026', endDateString: '2026-08-28' }
    ],
    3: [ // กันยายน 2026
      { number: 1, label: 'สัปดาห์ที่ 1', range: '29 ส.ค. - 4 ก.ย. 2026', endDateString: '2026-09-04' },
      { number: 2, label: 'สัปดาห์ที่ 2', range: '5 ก.ย. - 11 ก.ย. 2026', endDateString: '2026-09-11' },
      { number: 3, label: 'สัปดาห์ที่ 3', range: '12 ก.ย. - 18 ก.ย. 2026', endDateString: '2026-09-18' },
      { number: 4, label: 'สัปดาห์ที่ 4', range: '19 ก.ย. - 25 ก.ย. 2026', endDateString: '2026-09-25' }
    ],
    4: [ // ตุลาคม 2026
      { number: 1, label: 'สัปดาห์ที่ 1', range: '26 ก.ย. - 2 ต.ค. 2026', endDateString: '2026-10-02' },
      { number: 2, label: 'สัปดาห์ที่ 2', range: '3 ต.ค. - 9 ต.ค. 2026', endDateString: '2026-10-09' },
      { number: 3, label: 'สัปดาห์ที่ 3', range: '10 ต.ค. - 16 ต.ค. 2026', endDateString: '2026-10-16' },
      { number: 4, label: 'สัปดาห์ที่ 4', range: '17 ต.ค. - 23 ต.ค. 2026', endDateString: '2026-10-23' },
      { number: 5, label: 'สัปดาห์ที่ 5', range: '24 ต.ค. - 30 ต.ค. 2026', endDateString: '2026-10-30' }
    ],
    5: [ // พฤศจิกายน 2026
      { number: 1, label: 'สัปดาห์ที่ 1', range: '31 ต.ค. - 6 พ.ย. 2026', endDateString: '2026-11-06' },
      { number: 2, label: 'สัปดาห์ที่ 2', range: '7 พ.ย. - 13 พ.ย. 2026', endDateString: '2026-11-13' },
      { number: 3, label: 'สัปดาห์ที่ 3', range: '14 พ.ย. - 20 พ.ย. 2026', endDateString: '2026-11-20' },
      { number: 4, label: 'สัปดาห์ที่ 4', range: '21 พ.ย. - 27 พ.ย. 2026', endDateString: '2026-11-27' }
    ],
    6: [ // ธันวาคม 2026
      { number: 1, label: 'สัปดาห์ที่ 1', range: '28 พ.ย. - 4 ธ.ค. 2026', endDateString: '2026-12-04' },
      { number: 2, label: 'สัปดาห์ที่ 2', range: '5 ธ.ค. - 11 ธ.ค. 2026', endDateString: '2026-12-11' }
    ]
  };

  // Helper to get week ranges dynamically
  const getWeeksForMonth = (monthNum: number, _monthLabel: string) => {
    return CALENDAR_DATA[monthNum] || CALENDAR_DATA[1];
  };

  // Custom sync helper to initialize the date within the selected month range
  const getInitialSyncDate = (mNum: number, wNum: number) => {
    const list = CALENDAR_DATA[mNum] || CALENDAR_DATA[1];
    const match = list.find(w => w.number === wNum) || list[0];
    return match.endDateString;
  };

  // Form States
  const [selectedMonth, setSelectedMonth] = useState<number>(currentWeek || 1);
  const [selectedWeek, setSelectedWeek] = useState<number>(1);
  const [steps, setSteps] = useState<string>('');

  const [selectedDate, setSelectedDate] = useState<string>(() => getInitialSyncDate(currentWeek || 1, 1));
  const [imageName, setImageName] = useState<string>('');
  const [imagePreview, setImagePreview] = useState<string>('');
  
  // Custom states
  const [dragActive, setDragActive] = useState<boolean>(false);
  const [isSubmitted, setIsSubmitted] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync date when month or week changes
  const handleMonthChange = (monthNum: number) => {
    setSelectedMonth(monthNum);
    const availableWeeks = CALENDAR_DATA[monthNum] || CALENDAR_DATA[1];
    let nextWeek = selectedWeek;
    if (selectedWeek > availableWeeks.length) {
      nextWeek = 1;
      setSelectedWeek(1);
    }
    setSelectedDate(getInitialSyncDate(monthNum, nextWeek));
  };

  const handleWeekChange = (weekNum: number) => {
    setSelectedWeek(weekNum);
    setSelectedDate(getInitialSyncDate(selectedMonth, weekNum));
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const processFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      setErrorMessage('กรุณาเลือกไฟล์รูปภาพเท่านั้น (JPG, PNG)');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setErrorMessage('ขนาดไฟล์รูปภาพเกิน 5MB! กรุณาเลือกรูปอื่น');
      return;
    }

    setErrorMessage('');
    setImageName(file.name);
    
    const reader = new FileReader();
    reader.onload = (e) => {
      if (e.target?.result) {
        setImagePreview(e.target.result as string);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedSteps = parseInt(steps);
    if (isNaN(parsedSteps) || parsedSteps <= 0) {
      setErrorMessage('กรุณากรอกยอดจำนวนก้าวที่ถูกต้อง (มากกว่า 0)');
      return;
    }
    if (!imageName) {
      setErrorMessage('กรุณาแนบภาพหน้าจอ Screenshot เพื่อยืนยันผลการก้าวของคุณ');
      return;
    }

    onAddLog(parsedSteps, selectedDate, imageName, imagePreview, selectedMonth, selectedWeek);
    setIsSubmitted(true);
    
    // Reset form after delay
    setTimeout(() => {
      setIsSubmitted(false);
      setSteps('');
      setImageName('');
      setImagePreview('');
      setActiveTab('dashboard'); // Redirect back to show success
    }, 2800);
  };

  return (
    <div className="space-y-6">
      
      {/* Page Title */}
      <div className="bg-white p-5 rounded-2xl border border-[#edf2f7] shadow-xs">
        <h2 id="submission-title" className="text-xl md:text-2xl font-bold text-[#000000]">
          ส่งรายงานผลการนับก้าวประจำสัปดาห์
        </h2>
        <p className="text-xs md:text-sm text-[#344054] font-medium mt-1">
          บันทึกผลการเดินทางสะสมเพื่อก้าวผ่านเป้าหมายสัปดาห์นี้และลุ้นรับตั๋วจับรางวัล Lucky Draw
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        
        {/* Left Hand: Guidance & Rule Panel (Spans 2 cols) */}
        <div className="lg:col-span-2 bg-[#F2F4F7] rounded-2xl p-6 border border-[#edf2f7] flex flex-col justify-between">
          <div className="space-y-5">
            <div className="flex items-center gap-2 text-[#008148]">
              <HelpCircle className="w-5 h-5 stroke-[2.5px]" />
              <h3 className="font-extrabold text-lg text-[#000000]">คำแนะนำในการส่งผล</h3>
            </div>

            <ol className="space-y-4 text-xs md:text-sm text-[#344054] font-medium leading-relaxed list-decimal list-inside pl-1">
              <li className="pl-1">
                เปิดแอปนับก้าวในโทรศัพท์มือถือของคุณ 
                <span className="block text-gray-400 text-xs mt-0.5 ml-5">
                  เช่น Apple Health (iOS), Google Fit หรือ Garmin Connect (Android)
                </span>
              </li>
              <li className="pl-1">
                บันทึกภาพหน้าจอ (Screenshot) หน้าหลักที่แสดงจำนวนก้าวสะสมในระยะสัปดาห์นี้ชัดเจน
              </li>
              <li className="pl-1">
                กรอกตัวเลขจำนวนก้าวยอดสะสมดังกล่าวลงในกล่องฟอร์มช่องขวามือ
              </li>
              <li className="pl-1">
                ลากรูปภาพมาวางหรือกดแนบไฟล์แล้วกดปุ่มยืนยันส่งผล
              </li>
            </ol>

            {/* Alert Time frame section */}
            <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-r-xl space-y-1">
              <div className="flex items-center gap-2 text-amber-800 font-bold text-xs md:text-sm">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                <span>ช่วงเวลาเปิดรับส่งผล</span>
              </div>
              <p className="text-xs text-amber-700 leading-normal pl-6 font-medium">
                ภายใน <strong>วันศุกร์ เวลา 24.00 น.</strong> ของสัปดาห์นั้น ๆ
              </p>
              <p className="text-[10px] text-amber-600/80 leading-normal pl-6 italic">
                * สำหรับโหมดทดสอบระบบ (Simulator Mode) ตัวแอปอนุญาตให้ทำรายการได้ตลอดเวลา
              </p>
            </div>
          </div>

          <div className="mt-8 pt-5 border-t border-gray-200">
            <h4 className="text-xs font-bold text-[#000000] mb-2 uppercase tracking-wide">สถิติของคุณประจำสัปดาห์นี้</h4>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="bg-white p-2.5 rounded-xl border border-gray-100">
                <span className="text-gray-400 block font-semibold">สิทธิ์ลุ้นนำโชคสะสม</span>
                <span className="font-black text-[#008148] text-base">{activeUser.totalTickets} ดรอป</span>
              </div>
              <div className="bg-white p-2.5 rounded-xl border border-gray-100">
                <span className="text-gray-400 block">อัตราก้าวเป้าหมาย</span>
                <span className="font-extrabold text-[#000000] text-base">{activeUser.weekTarget.toLocaleString()} ก้าว</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Hand: Submissions Form Panel (Spans 3 cols) */}
        <div className="lg:col-span-3 bg-white rounded-2xl p-6 md:p-8 border border-[#edf2f7] shadow-xs relative">
          
          {isSubmitted ? (
            /* Submission Success Overlay Animation */
            <div className="absolute inset-0 bg-white/95 rounded-2xl flex flex-col items-center justify-center text-center p-6 z-20 animate-fade-in">
              <div className="bg-[#e6f5ee] p-4 rounded-full text-[#008148] mb-4 shadow-sm border border-[#008148]/10">
                <CircleCheck className="w-16 h-16 stroke-[2.5px]" />
              </div>
              <h3 className="text-2xl font-black text-[#000000] tracking-tight">บันทึกยอดส่งผลก้าวสำเร็จ!</h3>
              <p className="text-sm text-[#344054] font-medium mt-2 max-w-sm">
                อัปเดตระดับความสำเร็จและตั๋วนำโชคของคุณแล้ว ยอดก้าวจะคำนวณและเฉลี่ยขึ้นสู่ Leaderboard แผนก {activeUser.nickname} โดยอัตโนมัติ
              </p>
              <div className="mt-6 flex items-center gap-2 text-xs font-bold text-[#008148] bg-[#e6f5ee] px-4 py-1.5 rounded-full border border-[#008148]/15">
                <Sparkles className="w-4 h-4 text-[#008148] animate-spin" />
                <span>กำลังกลับหน้าสรุปผลหลัก...</span>
              </div>
            </div>
          ) : null}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Month and Week Selectors */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-[#303133] mb-1.5 flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-[#00914E]" />
                  <span>1. เลือกเดือนที่ส่งผล</span>
                </label>
                <select
                  id="submit-month-select"
                  value={selectedMonth}
                  onChange={(e) => handleMonthChange(parseInt(e.target.value))}
                  className="w-full bg-[#F2F4F7] border border-transparent rounded-xl px-3.5 py-3 text-xs md:text-sm font-semibold outline-none focus:border-[#00914E] focus:bg-white text-gray-800 transition-all cursor-pointer"
                >
                  {MONTHS_LIST.map((m) => (
                    <option key={m.number} value={m.number}>
                      {m.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#303133] mb-1.5 flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-[#00914E]" />
                  <span>2. เลือกสัปดาห์</span>
                </label>
                <select
                  id="submit-week-select"
                  value={selectedWeek}
                  onChange={(e) => handleWeekChange(parseInt(e.target.value))}
                  className="w-full bg-[#F2F4F7] border border-transparent rounded-xl px-3.5 py-3 text-xs md:text-sm font-semibold outline-none focus:border-[#00914E] focus:bg-white text-gray-800 transition-all cursor-pointer"
                >
                  {getWeeksForMonth(selectedMonth, MONTHS_LIST.find(m => m.number === selectedMonth)?.label || '').map((w) => (
                    <option key={w.number} value={w.number}>
                      {w.label} ({w.range})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Auto sync info representation */}
            <div className="bg-[#E8F5E9] border border-emerald-100 p-3 rounded-xl text-center text-xs text-[#00914E] font-extrabold flex items-center justify-center gap-1.5">
              <span>📅 ระบบระบุวันที่ทำรายการโดยสอดคล้องกับสัปดาห์นี้:</span>
              <span className="underline font-black">{new Date(selectedDate).toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
            </div>

            {/* Steps Input */}
            <div className="space-y-1.5">
              <label htmlFor="step-count-input" className="block text-xs font-bold text-[#303133] flex items-center gap-1">
                <Flame className="w-3.5 h-3.5 text-[#008148] animate-pulse" />
                <span>1. ระบุจำนวนก้าวยอดสะสมล่าสุด (ก้าว)</span>
              </label>
              <input
                id="step-count-input"
                type="number"
                min="1"
                placeholder="ตัวอย่างเช่น: 45210"
                value={steps}
                onChange={(e) => setSteps(e.target.value)}
                className="w-full border-2 border-gray-200 focus:border-[#008148] rounded-xl px-4 py-3.5 font-black text-[#000000] text-lg outline-none transition-all"
                required
              />
            </div>

            {/* Screenshots Drag-and-Drop Area */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-[#303133]">
                2. แนบรูปภาพ Screenshot หน้าจอนับก้าวในมือถือ
              </label>
              
              <div 
                onDragEnter={handleDrag}
                onDragOver={handleDrag}
                onDragLeave={handleDrag}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-6 text-center transition-all cursor-pointer flex flex-col items-center justify-center ${
                  dragActive 
                    ? 'border-[#008148] bg-[#e6f5ee]/40' 
                    : imageName 
                      ? 'border-[#008148]/70 bg-[#e6f5ee]/20' 
                      : 'border-gray-300 hover:border-[#008148] hover:bg-[#F2F4F7]/40'
                }`}
              >
                <input 
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden" 
                />

                {imagePreview ? (
                  <div className="space-y-3 w-full max-w-[200px]">
                    <img 
                      src={imagePreview} 
                      alt="Step proof preview" 
                      className="h-28 mx-auto rounded-lg object-cover shadow-xs border border-gray-100"
                      referrerPolicy="no-referrer"
                    />
                    <div>
                      <p className="text-xs font-bold text-[#303133] truncate">{imageName}</p>
                      <span className="text-[10px] text-[#008148] font-bold">แนบเรียบร้อย (คลิกเพื่อแก้ไข)</span>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="mx-auto w-12 h-12 rounded-xl bg-[#e6f5ee] text-[#008148] flex items-center justify-center shadow-xs border border-[#008148]/10">
                      <Upload className="w-5.5 h-5.5 stroke-[2px]" />
                    </div>
                    <div>
                      <p className="text-xs font-extrabold text-[#303133]">
                        คลิกเพื่ออัปโหลดเลือกรูปภาพยืนยัน หรือ ลากรูปที่นี่
                      </p>
                      <p className="text-[10px] text-gray-400 mt-1">
                        รองรับไฟล์รูปภาพ JPG, PNG (ขนาดไฟล์แนะนำไม่เกิน 5MB)
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Error notifications */}
            {errorMessage && (
              <div className="bg-red-50 text-red-700 text-xs font-bold py-2.5 px-4 rounded-xl border border-red-100 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Confirm buttons */}
            <button
              id="confirm-submit-btn"
              type="submit"
              className="btn w-full bg-[#008148] hover:bg-[#005a32] text-white font-bold py-3.5 rounded-xl justify-center text-sm md:text-base flex items-center gap-2 cursor-pointer shadow-md hover:shadow-lg transition-all active:scale-95 duration-150"
            >
              <span>ยืนยันการส่งข้อมูลและรับตั๋ว</span>
              <CircleCheck className="w-5 h-5" />
            </button>
          </form>

        </div>

      </div>

    </div>
  );
}
