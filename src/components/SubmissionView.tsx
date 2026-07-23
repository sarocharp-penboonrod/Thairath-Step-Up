import React, { useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  Calendar,
  CheckCircle2,
  FileScan,
  HelpCircle,
  LoaderCircle,
  LockKeyhole,
  ShieldCheck,
  Upload
} from 'lucide-react';
import { ActiveUser, NewStepLogInput, StepLog, VerificationStatus } from '../types';
import {
  CAMPAIGN_MONTHS,
  CAMPAIGN_WEEKLY_TARGET,
  getCampaignMonth,
  getCampaignWeek,
  getSubmissionWindowStatus,
  SubmissionWindowStatus
} from '../campaignConfig';
import { compressEvidenceImage, EvidenceOcrResult, runEvidenceOcr } from '../evidenceOcr';

interface SubmissionViewProps {
  activeUser: ActiveUser;
  currentWeek: number;
  stepLogs: StepLog[];
  onAddLog: (input: NewStepLogInput) => Promise<StepLog>;
  setActiveTab: (tab: string) => void;
}

const STATUS_COPY: Record<VerificationStatus, { label: string; className: string; description: string }> = {
  AUTO_VERIFIED: { label: 'ผ่านตรวจอัตโนมัติ', className: 'bg-emerald-50 text-emerald-700 border-emerald-200', description: 'ระบบอ่านตัวเลขตรงกับค่าที่กรอกและนำไปคำนวณได้ทันที' },
  NEEDS_REVIEW: { label: 'รอตรวจหลักฐาน', className: 'bg-amber-50 text-amber-700 border-amber-200', description: 'ระบบอ่านไม่ชัดหรือยอดไม่ตรง รายการจะรอผู้ดูแลตรวจสอบ' },
  APPROVED: { label: 'อนุมัติแล้ว', className: 'bg-blue-50 text-blue-700 border-blue-200', description: 'หลักฐานผ่านการตรวจโดยผู้ดูแลแล้ว' },
  REJECTED: { label: 'ไม่ผ่านการตรวจ', className: 'bg-rose-50 text-rose-700 border-rose-200', description: 'รายการนี้จะไม่ถูกนำไปคำนวณ' }
};

function defaultWeekForMonth(monthNumber: number): number {
  const weeks = getCampaignMonth(monthNumber).weeks;
  const open = weeks.filter((week) => getSubmissionWindowStatus(monthNumber, week.number).isSelectable);
  return (open[open.length - 1] || weeks[0]).number;
}

function windowClass(status: SubmissionWindowStatus, selected: boolean): string {
  if (!status.isSelectable) return `bg-slate-100 text-slate-400 border-slate-200 ${selected ? 'ring-2 ring-slate-300' : ''}`;
  if (status.state === 'CLOSING_SOON') return `bg-amber-50 text-amber-800 border-amber-300 ${selected ? 'ring-2 ring-amber-400' : ''}`;
  return `bg-white text-slate-700 border-slate-200 hover:border-[#00914E] ${selected ? 'ring-2 ring-[#00914E] border-[#00914E]' : ''}`;
}

export default function SubmissionView({ activeUser, currentWeek, stepLogs, onAddLog, setActiveTab }: SubmissionViewProps) {
  const [selectedMonth, setSelectedMonth] = useState(currentWeek || 1);
  const [selectedWeek, setSelectedWeek] = useState(() => defaultWeekForMonth(currentWeek || 1));
  const [steps, setSteps] = useState('');
  const [selectedDate, setSelectedDate] = useState(() => getCampaignWeek(currentWeek || 1, defaultWeekForMonth(currentWeek || 1))?.endDate || '');
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
  const selectedWindow = getSubmissionWindowStatus(selectedMonth, selectedWeek);
  const duplicate = stepLogs.some((log) => Number(log.week) === selectedMonth && Number(log.weekOfMonth) === selectedWeek);
  const uploadLocked = !selectedWindow.isSelectable || duplicate;
  const predictedStatus: VerificationStatus = useMemo(() => {
    const exactMatch = Boolean(ocrResult?.detectedSteps && ocrResult.detectedSteps === parsedSteps && ocrResult.confidence >= 60);
    return exactMatch ? 'AUTO_VERIFIED' : 'NEEDS_REVIEW';
  }, [ocrResult, parsedSteps]);
  const statusPreview = STATUS_COPY[predictedStatus];

  const changePeriod = (month: number, week: number) => {
    setSelectedMonth(month);
    setSelectedWeek(week);
    setSelectedDate(getCampaignWeek(month, week)?.endDate || '');
    // Prevent a screenshot prepared for one period from being submitted to another period.
    setImageName('');
    setImageMimeType('');
    setImageData('');
    setImagePreview('');
    setOcrResult(null);
    setOcrProgress(0);
    setOcrStatusText('');
    setErrorMessage('');
  };

  const handleMonthChange = (month: number) => changePeriod(month, defaultWeekForMonth(month));

  const processFile = async (file: File) => {
    if (uploadLocked) return setErrorMessage(duplicate ? 'สัปดาห์นี้มีการส่งผลแล้ว กรุณาติดต่อ Admin หากต้องการแก้ไข' : selectedWindow.message);
    if (!file.type.startsWith('image/')) return setErrorMessage('กรุณาเลือกไฟล์รูปภาพ เช่น JPG, PNG หรือ WEBP');
    if (file.size > 8 * 1024 * 1024) return setErrorMessage('ไฟล์รูปภาพต้องมีขนาดไม่เกิน 8MB');
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
        setOcrStatusText('กำลังอ่านรูปต้นฉบับความละเอียดสูง');
        setOcrResult(await runEvidenceOcr(
          file,
          parsedSteps > 0 ? parsedSteps : undefined,
          (progress, status) => { setOcrProgress(progress); setOcrStatusText(status); }
        ));
      } catch (error) {
        console.warn('OCR failed:', error);
        setOcrResult({ text: '', confidence: 0, agreementCount: 0, passCount: 3, alternatives: [] });
        setOcrStatusText('อ่านตัวเลขไม่สำเร็จ รายการจะรอผู้ดูแลตรวจ');
      }
    } catch (error: any) {
      setImageName(''); setImageMimeType(''); setImageData(''); setImagePreview('');
      setErrorMessage(error?.message || 'ไม่สามารถเตรียมรูปหลักฐานได้');
    } finally {
      setIsPreparingImage(false);
    }
  };

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault();
    setDragActive(false);
    const file = event.dataTransfer.files?.[0];
    if (file) void processFile(file);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedWindow.isSelectable) return setErrorMessage(selectedWindow.message);
    if (duplicate) return setErrorMessage('คุณส่งผลของเดือนและสัปดาห์นี้แล้ว กรุณาติดต่อ Admin หากต้องการแก้ไข');
    if (!Number.isInteger(parsedSteps) || parsedSteps <= 0) return setErrorMessage('กรุณากรอกค่าเฉลี่ยก้าวเป็นเลขจำนวนเต็มที่มากกว่า 0');
    if (!imageData || !imageName || !imageMimeType) return setErrorMessage('กรุณาแนบ Screenshot ที่แสดงค่าเฉลี่ยก้าวของสัปดาห์');
    if (isPreparingImage) return setErrorMessage('กรุณารอให้ระบบอ่านรูปหลักฐานเสร็จก่อน');

    setErrorMessage('');
    setIsSubmitting(true);
    try {
      const saved = await onAddLog({
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
      setSavedStatus(saved.verificationStatus);
      window.setTimeout(() => setActiveTab('dashboard'), 2200);
    } catch (error: any) {
      setErrorMessage(error?.message || 'ไม่สามารถบันทึกข้อมูลได้');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (savedStatus) {
    const savedCopy = STATUS_COPY[savedStatus];
    return (
      <div className="bg-white rounded-3xl border border-slate-200 p-10 text-center shadow-sm">
        <CheckCircle2 className="w-14 h-14 text-[#00914E] mx-auto" />
        <h2 className="text-2xl font-black text-black mt-4">ส่งหลักฐานเรียบร้อย</h2>
        <p className="text-sm text-slate-500 mt-2">{savedCopy.description}</p>
        <span className={`inline-block mt-4 px-4 py-2 rounded-full border text-sm font-bold ${savedCopy.className}`}>{savedCopy.label}</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="bg-white p-5 md:p-6 rounded-2xl border border-slate-200 shadow-sm">
        <h2 className="text-xl md:text-2xl font-black text-black">ส่งผลค่าเฉลี่ยก้าวประจำสัปดาห์</h2>
        <p className="text-sm text-slate-500 mt-2">กรอกค่าเฉลี่ยจำนวนก้าวต่อวันตามที่แสดงใน Screenshot ของสัปดาห์นั้น</p>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <aside className="lg:col-span-2 bg-white rounded-2xl p-5 md:p-6 border border-slate-200 shadow-sm space-y-5">
          <div className="flex items-center gap-2"><HelpCircle className="w-5 h-5 text-[#00914E]" /><h3 className="font-black text-lg text-black">วิธีส่งหลักฐาน</h3></div>
          <ol className="space-y-3 text-sm text-slate-600 leading-relaxed list-decimal list-inside">
            <li>เปิดหน้าสรุปค่าเฉลี่ยก้าวของสัปดาห์ในแอปสุขภาพ</li>
            <li>จับภาพให้เห็นตัวเลขค่าเฉลี่ยอย่างชัดเจน</li>
            <li>กรอกตัวเลขเดียวกับภาพ แล้วแนบ Screenshot</li>
            <li>ระบบ OCR จะอ่านตัวเลขและส่งให้ตรวจอัตโนมัติ</li>
          </ol>
          <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4 text-sm text-emerald-800 leading-relaxed">
            ได้รับ 1 คูปอง เมื่อค่าเฉลี่ยตั้งแต่ 7,000 ก้าว/วันขึ้นไป และหลักฐานผ่านการตรวจแล้วเท่านั้น
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-slate-50 p-4 rounded-xl"><p className="text-xs text-slate-500 font-bold">คูปองผ่านตรวจ</p><p className="text-2xl font-black text-[#00914E] mt-1">{activeUser.totalTickets} ใบ</p></div>
            <div className="bg-slate-50 p-4 rounded-xl"><p className="text-xs text-slate-500 font-bold">เป้าหมายเฉลี่ย</p><p className="text-2xl font-black text-black mt-1">7,000</p><p className="text-xs text-slate-400">ก้าว/วัน</p></div>
          </div>
        </aside>

        <section className="lg:col-span-3 bg-white rounded-2xl p-5 md:p-7 border border-slate-200 shadow-sm">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-bold text-slate-600 mb-2">เดือนกิจกรรม</label>
              <select value={selectedMonth} onChange={(event) => handleMonthChange(Number(event.target.value))} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold">
                {CAMPAIGN_MONTHS.map((month) => <option key={month.number} value={month.number}>{month.label}</option>)}
              </select>
            </div>

            <div>
              <p className="text-sm font-bold text-slate-600 mb-2">เลือกสัปดาห์</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {getCampaignMonth(selectedMonth).weeks.map((week) => {
                  const status = getSubmissionWindowStatus(selectedMonth, week.number);
                  const hasSubmitted = stepLogs.some((log) => Number(log.week) === selectedMonth && Number(log.weekOfMonth) === week.number);
                  return (
                    <button key={week.number} type="button" onClick={() => changePeriod(selectedMonth, week.number)} className={`text-left border rounded-xl p-3 cursor-pointer ${windowClass(status, selectedWeek === week.number)}`}>
                      <p className="text-sm font-black">{week.label}</p>
                      <p className="text-xs mt-1">{hasSubmitted ? 'ส่งผลแล้ว' : status.state === 'CLOSED' ? 'หมดเขต' : status.state === 'NOT_OPEN' ? 'ยังไม่เปิด' : status.state === 'CLOSING_SOON' ? 'ใกล้หมดเขต' : 'เปิดรับผล'}</p>
                    </button>
                  );
                })}
              </div>
              <div className={`mt-3 rounded-xl p-3 text-sm font-bold flex items-start gap-2 ${selectedWindow.isSelectable && !duplicate ? (selectedWindow.state === 'CLOSING_SOON' ? 'bg-amber-50 text-amber-800' : 'bg-emerald-50 text-emerald-800') : 'bg-slate-100 text-slate-500'}`}>
                {!selectedWindow.isSelectable || duplicate ? <LockKeyhole className="w-4 h-4 mt-0.5 shrink-0" /> : <Calendar className="w-4 h-4 mt-0.5 shrink-0" />}
                {duplicate ? 'สัปดาห์นี้ส่งผลแล้ว ไม่สามารถส่งซ้ำได้' : selectedWindow.message}
              </div>
            </div>

            <label className="block text-sm font-bold text-slate-600">
              ค่าเฉลี่ยก้าวต่อวันตามภาพหลักฐาน
              <div className="relative mt-2">
                <input inputMode="numeric" disabled={uploadLocked} value={steps} onChange={(event) => setSteps(event.target.value.replace(/[^0-9]/g, ''))} placeholder="เช่น 7500" className="w-full bg-slate-50 disabled:bg-slate-100 disabled:text-slate-400 border border-slate-200 rounded-xl px-4 py-4 pr-24 outline-none focus:border-[#00914E] text-xl font-black" />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">ก้าว/วัน</span>
              </div>
              {parsedSteps > 0 && <span className={`block mt-2 text-sm font-bold ${parsedSteps >= CAMPAIGN_WEEKLY_TARGET ? 'text-emerald-700' : 'text-amber-700'}`}>{parsedSteps >= CAMPAIGN_WEEKLY_TARGET ? 'ถึงเกณฑ์คูปอง เมื่อหลักฐานผ่านการตรวจ' : `ยังต่ำกว่าเป้าหมาย ${(CAMPAIGN_WEEKLY_TARGET - parsedSteps).toLocaleString()} ก้าว/วัน`}</span>}
            </label>

            <div>
              <p className="text-sm font-bold text-slate-600 mb-2">Screenshot หลักฐาน</p>
              <button
                type="button"
                disabled={uploadLocked}
                onClick={() => !uploadLocked && fileInputRef.current?.click()}
                onDragEnter={(event) => { event.preventDefault(); if (!uploadLocked) setDragActive(true); }}
                onDragOver={(event) => event.preventDefault()}
                onDragLeave={(event) => { event.preventDefault(); setDragActive(false); }}
                onDrop={handleDrop}
                className={`w-full min-h-44 border-2 border-dashed rounded-2xl flex items-center justify-center p-4 transition-colors ${uploadLocked ? 'border-slate-200 bg-slate-100 text-slate-400 cursor-not-allowed' : dragActive ? 'border-[#00914E] bg-emerald-50 cursor-pointer' : 'border-slate-200 bg-slate-50 hover:border-[#00914E] cursor-pointer'}`}
              >
                {uploadLocked ? (
                  <div className="text-center"><LockKeyhole className="w-9 h-9 mx-auto" /><p className="font-black mt-3">ไม่สามารถแนบหลักฐานได้</p><p className="text-sm mt-1">{duplicate ? 'ส่งผลของสัปดาห์นี้แล้ว' : selectedWindow.message}</p></div>
                ) : imagePreview ? (
                  <div className="flex flex-col sm:flex-row items-center gap-4 w-full"><img src={imagePreview} alt="Evidence preview" className="w-32 h-32 object-contain bg-white rounded-xl border border-slate-200" /><div className="text-left min-w-0"><p className="font-black text-black truncate">{imageName}</p><p className="text-xs text-slate-400 mt-1">กดเพื่อเปลี่ยนรูป</p>{isPreparingImage && <p className="text-sm font-bold text-[#00914E] mt-3 flex items-center gap-2"><LoaderCircle className="w-4 h-4 animate-spin" />OCR {ocrProgress}% · {ocrStatusText}</p>}</div></div>
                ) : (
                  <div className="text-center"><div className="w-12 h-12 rounded-full bg-emerald-50 text-[#00914E] flex items-center justify-center mx-auto"><Upload className="w-6 h-6" /></div><p className="font-black text-black mt-3">ลากรูปมาวาง หรือกดเพื่อเลือกไฟล์</p><p className="text-sm text-slate-400 mt-1">JPG, PNG, WEBP ไม่เกิน 8MB</p><p className="text-xs text-slate-400 mt-1">OCR จะอ่านจากภาพต้นฉบับความละเอียดสูงโดยอัตโนมัติ</p></div>
                )}
              </button>
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" disabled={uploadLocked} onChange={(event) => { const file = event.target.files?.[0]; if (file) void processFile(file); event.currentTarget.value = ''; }} />
            </div>

            {ocrResult && !isPreparingImage && (
              <div className="rounded-2xl border border-slate-200 p-4 bg-slate-50 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-3"><div className="flex items-center gap-2"><FileScan className="w-5 h-5 text-[#00914E]" /><p className="font-black text-sm text-black">ผลอ่านตัวเลขจากภาพ</p></div><span className={`px-3 py-1 rounded-full border text-xs font-bold ${statusPreview.className}`}>{statusPreview.label}</span></div>
                <div className="grid grid-cols-2 gap-3"><div className="bg-white rounded-xl p-3"><p className="text-xs text-slate-500 font-bold">OCR อ่านได้</p><p className="text-xl font-black text-black mt-1">{ocrResult.detectedSteps?.toLocaleString() || 'อ่านไม่พบ'}</p></div><div className="bg-white rounded-xl p-3"><p className="text-xs text-slate-500 font-bold">ผลตรงกัน</p><p className="text-xl font-black text-black mt-1">{ocrResult.agreementCount}/{ocrResult.passCount} รอบ</p></div></div>
                <p className="text-sm text-slate-500">ความมั่นใจ {ocrResult.confidence}% · {statusPreview.description}</p>
              </div>
            )}

            {errorMessage && <div className="bg-rose-50 border border-rose-200 text-rose-700 rounded-xl p-3 text-sm font-bold flex items-start gap-2"><AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />{errorMessage}</div>}

            <button type="submit" disabled={uploadLocked || isPreparingImage || isSubmitting} className="w-full bg-[#00914E] hover:bg-[#00703c] disabled:bg-slate-300 disabled:cursor-not-allowed text-white py-4 rounded-xl font-black flex items-center justify-center gap-2 cursor-pointer">
              {isSubmitting ? <><LoaderCircle className="w-5 h-5 animate-spin" />กำลังอัปโหลดและบันทึก...</> : <><ShieldCheck className="w-5 h-5" />ยืนยันส่งหลักฐาน</>}
            </button>
          </form>
        </section>
      </div>
    </div>
  );
}
