import React, { useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  Calendar,
  CheckCircle2,
  CircleCheck,
  FileScan,
  HelpCircle,
  LoaderCircle,
  ShieldCheck,
  Sparkles,
  Upload
} from 'lucide-react';
import { ActiveUser, NewStepLogInput, StepLog, VerificationStatus } from '../types';
import { CAMPAIGN_MONTHS, CAMPAIGN_WEEKLY_TARGET, getCampaignMonth, getCampaignWeek } from '../campaignConfig';
import { compressEvidenceImage, EvidenceOcrResult, runEvidenceOcr } from '../evidenceOcr';

interface SubmissionViewProps {
  activeUser: ActiveUser;
  currentWeek: number;
  stepLogs: StepLog[];
  onAddLog: (input: NewStepLogInput) => Promise<StepLog>;
  setActiveTab: (tab: string) => void;
}

const STATUS_COPY: Record<VerificationStatus, { label: string; className: string; description: string }> = {
  AUTO_VERIFIED: {
    label: 'ตรวจผ่านอัตโนมัติ',
    className: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    description: 'OCR อ่านยอดตรงกับค่าที่กรอก ข้อมูลจะถูกนำไปคำนวณทันที'
  },
  NEEDS_REVIEW: {
    label: 'รอ Admin ตรวจ',
    className: 'bg-amber-50 text-amber-700 border-amber-200',
    description: 'OCR อ่านไม่ชัดหรือยอดไม่ตรง ข้อมูลยังไม่ถูกนำไปคำนวณ'
  },
  APPROVED: {
    label: 'Admin อนุมัติ',
    className: 'bg-blue-50 text-blue-700 border-blue-200',
    description: 'หลักฐานผ่านการตรวจโดย Admin แล้ว'
  },
  REJECTED: {
    label: 'ไม่ผ่านการตรวจ',
    className: 'bg-rose-50 text-rose-700 border-rose-200',
    description: 'หลักฐานถูกปฏิเสธและไม่นำไปคำนวณ'
  }
};

export default function SubmissionView({
  activeUser,
  currentWeek,
  stepLogs,
  onAddLog,
  setActiveTab
}: SubmissionViewProps) {
  const [selectedMonth, setSelectedMonth] = useState(currentWeek || 1);
  const [selectedWeek, setSelectedWeek] = useState(1);
  const [steps, setSteps] = useState('');
  const [selectedDate, setSelectedDate] = useState(
    getCampaignWeek(currentWeek || 1, 1)?.endDate || getCampaignMonth(currentWeek || 1).weeks[0].endDate
  );

  const [imageName, setImageName] = useState('');
  const [imageMimeType, setImageMimeType] = useState('');
  const [imageData, setImageData] = useState('');
  const [imagePreview, setImagePreview] = useState('');
  const [ocrResult, setOcrResult] = useState<EvidenceOcrResult | null>(null);
  const [ocrProgress, setOcrProgress] = useState(0);
  const [ocrStatusText, setOcrStatusText] = useState('');
  const [isPreparingImage, setIsPreparingImage] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [savedStatus, setSavedStatus] = useState<VerificationStatus | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const parsedSteps = Number(steps.replace(/,/g, ''));
  const predictedStatus: VerificationStatus = useMemo(() => {
    const exactMatch = Boolean(
      ocrResult?.detectedSteps &&
      Number.isFinite(parsedSteps) &&
      ocrResult.detectedSteps === parsedSteps &&
      ocrResult.confidence >= 60
    );
    return exactMatch ? 'AUTO_VERIFIED' : 'NEEDS_REVIEW';
  }, [ocrResult, parsedSteps]);

  const duplicate = stepLogs.some((log) =>
    Number(log.week) === selectedMonth && Number(log.weekOfMonth) === selectedWeek
  );

  const setPeriodDate = (month: number, week: number) => {
    const campaignWeek = getCampaignWeek(month, week);
    setSelectedDate(campaignWeek?.endDate || getCampaignMonth(month).weeks[0].endDate);
  };

  const handleMonthChange = (month: number) => {
    setSelectedMonth(month);
    const availableWeeks = getCampaignMonth(month).weeks;
    const nextWeek = selectedWeek > availableWeeks.length ? 1 : selectedWeek;
    if (nextWeek !== selectedWeek) setSelectedWeek(nextWeek);
    setPeriodDate(month, nextWeek);
  };

  const handleWeekChange = (week: number) => {
    setSelectedWeek(week);
    setPeriodDate(selectedMonth, week);
  };

  const processFile = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      setErrorMessage('กรุณาเลือกไฟล์รูปภาพเท่านั้น เช่น JPG, PNG หรือ WEBP');
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      setErrorMessage('ไฟล์รูปภาพต้องมีขนาดไม่เกิน 8MB');
      return;
    }

    setErrorMessage('');
    setIsPreparingImage(true);
    setOcrProgress(0);
    setOcrStatusText('กำลังเตรียมรูปหลักฐาน');
    setOcrResult(null);

    try {
      const prepared = await compressEvidenceImage(file);
      setImageName(prepared.fileName);
      setImageMimeType(prepared.mimeType);
      setImageData(prepared.dataUrl);
      setImagePreview(prepared.dataUrl);

      try {
        const result = await runEvidenceOcr(prepared.dataUrl, (progress, status) => {
          setOcrProgress(progress);
          setOcrStatusText(status);
        });
        setOcrResult(result);
      } catch (ocrError) {
        console.warn('OCR failed, submission will require review:', ocrError);
        setOcrResult({ text: '', confidence: 0 });
        setOcrStatusText('OCR อ่านรูปไม่สำเร็จ ระบบจะส่งให้ Admin ตรวจ');
      }
    } catch (error: any) {
      setImageName('');
      setImageMimeType('');
      setImageData('');
      setImagePreview('');
      setErrorMessage(error?.message || 'ไม่สามารถเตรียมรูปหลักฐานได้');
    } finally {
      setIsPreparingImage(false);
    }
  };

  const handleDrag = (event: React.DragEvent) => {
    event.preventDefault();
    event.stopPropagation();
    setDragActive(event.type === 'dragenter' || event.type === 'dragover');
  };

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault();
    event.stopPropagation();
    setDragActive(false);
    const file = event.dataTransfer.files?.[0];
    if (file) void processFile(file);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!Number.isFinite(parsedSteps) || parsedSteps <= 0 || !Number.isInteger(parsedSteps)) {
      setErrorMessage('กรุณากรอกจำนวนก้าวเป็นเลขจำนวนเต็มที่มากกว่า 0');
      return;
    }
    if (!imageData || !imageName || !imageMimeType) {
      setErrorMessage('กรุณาแนบภาพ Screenshot เพื่อใช้เป็นหลักฐาน');
      return;
    }
    if (isPreparingImage) {
      setErrorMessage('กรุณารอให้ระบบอ่านรูปหลักฐานเสร็จก่อน');
      return;
    }
    if (duplicate) {
      setErrorMessage('คุณส่งข้อมูลของเดือนและสัปดาห์นี้แล้ว หากต้องการแก้ไข กรุณาติดต่อ Admin');
      return;
    }

    setErrorMessage('');
    setIsSubmitting(true);
    try {
      const savedLog = await onAddLog({
        steps: parsedSteps,
        date: selectedDate,
        week: selectedMonth,
        weekOfMonth: selectedWeek,
        imageName,
        imageData,
        imageMimeType,
        ocrText: ocrResult?.text || '',
        ocrSteps: ocrResult?.detectedSteps,
        ocrConfidence: ocrResult?.confidence || 0
      });
      setSavedStatus(savedLog.verificationStatus);
      window.setTimeout(() => {
        setSavedStatus(null);
        setSteps('');
        setImageName('');
        setImageMimeType('');
        setImageData('');
        setImagePreview('');
        setOcrResult(null);
        setActiveTab('dashboard');
      }, 2600);
    } catch (error: any) {
      setErrorMessage(error?.message || 'ไม่สามารถบันทึกข้อมูลได้ กรุณาลองใหม่อีกครั้ง');
    } finally {
      setIsSubmitting(false);
    }
  };

  const statusPreview = STATUS_COPY[predictedStatus];

  return (
    <div className="space-y-6">
      <div className="bg-white p-5 rounded-2xl border border-[#edf2f7] shadow-xs">
        <h2 className="text-xl md:text-2xl font-bold text-black">ส่งรายงานผลการนับก้าวประจำสัปดาห์</h2>
        <p className="text-xs md:text-sm text-[#344054] font-medium mt-1">
          ระบบเทียบยอดที่กรอกกับเป้าหมาย <strong>{CAMPAIGN_WEEKLY_TARGET.toLocaleString()} ก้าวโดยตรง</strong> ไม่มีการหารเฉลี่ยตามจำนวนวัน
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <aside className="lg:col-span-2 bg-[#F2F4F7] rounded-2xl p-6 border border-[#edf2f7] flex flex-col justify-between">
          <div className="space-y-5">
            <div className="flex items-center gap-2">
              <HelpCircle className="w-5 h-5 text-[#008148]" />
              <h3 className="font-extrabold text-lg text-black">วิธีส่งหลักฐาน</h3>
            </div>
            <ol className="space-y-3 text-xs md:text-sm text-[#344054] font-medium leading-relaxed list-decimal list-inside">
              <li>เปิดหน้าสรุปยอดก้าวประจำสัปดาห์ในแอปสุขภาพ</li>
              <li>จับภาพให้เห็นตัวเลขยอดรวมขนาดใหญ่ชัดเจน</li>
              <li>กรอกยอดเดียวกับที่ปรากฏในภาพ โดยไม่หารจำนวนวัน</li>
              <li>แนบรูป ระบบจะ OCR และเก็บไฟล์ใน Google Drive อัตโนมัติ</li>
            </ol>
            <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-r-xl">
              <div className="flex items-center gap-2 text-amber-800 font-bold text-xs md:text-sm">
                <AlertTriangle className="w-4 h-4" /> ภายในวันศุกร์ เวลา 24.00 น.
              </div>
              <p className="text-[10px] text-amber-700 mt-1 pl-6">เลือกเดือนและสัปดาห์ให้ตรงกับภาพหลักฐาน</p>
            </div>
          </div>

          <div className="mt-8 pt-5 border-t border-gray-200 grid grid-cols-2 gap-2 text-xs">
            <div className="bg-white p-3 rounded-xl border border-gray-100">
              <span className="text-gray-400 block font-semibold">คูปองผ่านตรวจ</span>
              <span className="font-black text-[#008148] text-lg">{activeUser.totalTickets} ใบ</span>
            </div>
            <div className="bg-white p-3 rounded-xl border border-gray-100">
              <span className="text-gray-400 block font-semibold">เป้าหมายต่อสัปดาห์</span>
              <span className="font-black text-black text-lg">{CAMPAIGN_WEEKLY_TARGET.toLocaleString()}</span>
            </div>
          </div>
        </aside>

        <section className="lg:col-span-3 bg-white rounded-2xl p-6 md:p-8 border border-[#edf2f7] shadow-xs relative">
          {savedStatus && (
            <div className="absolute inset-0 bg-white/95 rounded-2xl flex flex-col items-center justify-center text-center p-6 z-20 animate-fade-in">
              <div className="bg-[#e6f5ee] p-4 rounded-full text-[#008148] mb-4"><CircleCheck className="w-16 h-16" /></div>
              <h3 className="text-2xl font-black text-black">ส่งหลักฐานสำเร็จ</h3>
              <div className={`mt-3 px-4 py-2 rounded-full border text-xs font-extrabold ${STATUS_COPY[savedStatus].className}`}>
                {STATUS_COPY[savedStatus].label}
              </div>
              <p className="text-sm text-[#344054] mt-3 max-w-md">{STATUS_COPY[savedStatus].description}</p>
              <p className="text-xs text-[#008148] font-bold mt-5 flex items-center gap-2"><Sparkles className="w-4 h-4" />กำลังกลับหน้าสรุปผล</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <label className="text-xs font-extrabold text-[#344054]">
                เดือน
                <select value={selectedMonth} onChange={(event) => handleMonthChange(Number(event.target.value))} className="mt-1.5 w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-3 outline-none focus:border-[#008148]">
                  {CAMPAIGN_MONTHS.map((month) => <option key={month.number} value={month.number}>{month.label}</option>)}
                </select>
              </label>
              <label className="text-xs font-extrabold text-[#344054]">
                สัปดาห์
                <select value={selectedWeek} onChange={(event) => handleWeekChange(Number(event.target.value))} className="mt-1.5 w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-3 outline-none focus:border-[#008148]">
                  {getCampaignMonth(selectedMonth).weeks.map((week) => <option key={week.number} value={week.number}>{week.label} · {week.range}</option>)}
                </select>
              </label>
            </div>

            {duplicate && <div className="bg-rose-50 border border-rose-200 text-rose-700 rounded-xl p-3 text-xs font-bold">เดือนและสัปดาห์นี้มีรายการส่งแล้ว</div>}

            <label className="block text-xs font-extrabold text-[#344054]">
              จำนวนก้าวตามภาพหลักฐาน
              <div className="relative mt-1.5">
                <input
                  inputMode="numeric"
                  value={steps}
                  onChange={(event) => setSteps(event.target.value.replace(/[^0-9]/g, ''))}
                  placeholder="เช่น 7500"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-4 pr-20 outline-none focus:border-[#008148] text-xl font-black tabular-nums"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">ก้าว</span>
              </div>
              {Number.isFinite(parsedSteps) && parsedSteps > 0 && (
                <span className={`block mt-2 text-[11px] font-bold ${parsedSteps >= CAMPAIGN_WEEKLY_TARGET ? 'text-emerald-700' : 'text-amber-700'}`}>
                  {parsedSteps >= CAMPAIGN_WEEKLY_TARGET
                    ? `ถึงเป้าหมาย ${CAMPAIGN_WEEKLY_TARGET.toLocaleString()} ก้าว เมื่อหลักฐานผ่านตรวจจะได้รับ 1 คูปอง`
                    : `ยังขาด ${(CAMPAIGN_WEEKLY_TARGET - parsedSteps).toLocaleString()} ก้าว และจะยังไม่ได้รับคูปอง`}
                </span>
              )}
            </label>

            <div>
              <p className="text-xs font-extrabold text-[#344054] mb-1.5">ภาพ Screenshot หลักฐาน</p>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                onDragEnter={handleDrag}
                onDragOver={handleDrag}
                onDragLeave={handleDrag}
                onDrop={handleDrop}
                className={`w-full min-h-44 border-2 border-dashed rounded-2xl flex items-center justify-center p-4 transition-colors cursor-pointer ${dragActive ? 'border-[#008148] bg-emerald-50' : 'border-slate-200 bg-slate-50 hover:border-[#008148]'}`}
              >
                {imagePreview ? (
                  <div className="flex flex-col sm:flex-row items-center gap-4 w-full">
                    <img src={imagePreview} alt="Evidence preview" className="w-32 h-32 object-contain bg-white rounded-xl border border-slate-200" />
                    <div className="text-left min-w-0">
                      <p className="font-extrabold text-black truncate">{imageName}</p>
                      <p className="text-[10px] text-slate-400 mt-1">กดเพื่อเปลี่ยนรูป</p>
                      {isPreparingImage && <p className="text-xs font-bold text-[#008148] mt-3 flex items-center gap-2"><LoaderCircle className="w-4 h-4 animate-spin" />OCR {ocrProgress}% · {ocrStatusText}</p>}
                    </div>
                  </div>
                ) : (
                  <div className="text-center">
                    <div className="w-12 h-12 rounded-full bg-[#E8F5E9] text-[#008148] flex items-center justify-center mx-auto"><Upload className="w-6 h-6" /></div>
                    <p className="font-extrabold text-black mt-3">ลากรูปมาวาง หรือกดเพื่อเลือกไฟล์</p>
                    <p className="text-[10px] text-slate-400 mt-1">รองรับ JPG, PNG, WEBP ไม่เกิน 8MB</p>
                  </div>
                )}
              </button>
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={(event) => { const file = event.target.files?.[0]; if (file) void processFile(file); event.currentTarget.value = ''; }} />
            </div>

            {ocrResult && !isPreparingImage && (
              <div className="rounded-2xl border border-slate-200 p-4 bg-slate-50 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2"><FileScan className="w-5 h-5 text-[#008148]" /><p className="font-extrabold text-sm text-black">ผลอ่านตัวเลขจากภาพ</p></div>
                  <span className={`px-3 py-1 rounded-full border text-[10px] font-extrabold ${statusPreview.className}`}>{statusPreview.label}</span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-white rounded-xl p-3 border border-slate-100"><p className="text-[10px] text-slate-400 font-bold">OCR พบยอด</p><p className="text-xl font-black text-black mt-1">{ocrResult.detectedSteps?.toLocaleString() || 'อ่านไม่พบ'}</p></div>
                  <div className="bg-white rounded-xl p-3 border border-slate-100"><p className="text-[10px] text-slate-400 font-bold">ความมั่นใจ</p><p className="text-xl font-black text-black mt-1">{ocrResult.confidence}%</p></div>
                </div>
                <p className="text-[10px] text-slate-500">{statusPreview.description}</p>
              </div>
            )}

            {errorMessage && <div className="bg-rose-50 border border-rose-200 text-rose-700 rounded-xl p-3 text-xs font-bold flex items-start gap-2"><AlertTriangle className="w-4 h-4 shrink-0" />{errorMessage}</div>}

            <button
              type="submit"
              disabled={isPreparingImage || isSubmitting || duplicate}
              className="w-full bg-[#008148] hover:bg-[#005a32] disabled:opacity-50 disabled:cursor-not-allowed text-white py-4 rounded-xl font-extrabold flex items-center justify-center gap-2 shadow-md cursor-pointer"
            >
              {isSubmitting ? <><LoaderCircle className="w-5 h-5 animate-spin" />กำลังอัปโหลดและบันทึก...</> : <><ShieldCheck className="w-5 h-5" />ยืนยันส่งหลักฐาน</>}
            </button>

            <div className="flex items-center justify-center gap-2 text-[10px] text-slate-400 font-semibold">
              <Calendar className="w-3.5 h-3.5" /> วันที่อ้างอิง {new Date(selectedDate).toLocaleDateString('th-TH')}
              <span>•</span><CheckCircle2 className="w-3.5 h-3.5" />ไฟล์จะจัดเก็บตาม Month → Week
            </div>
          </form>
        </section>
      </div>
    </div>
  );
}
