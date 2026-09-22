import React, { useState, useRef } from 'react';
import { parseParticipantsExcel, generateSampleExcelFile, getDemoParticipants } from '../utils/excel';
import { Participant, ExcelParseReport } from '../types';
import { formatLoanAmount } from '../utils/format';
import { FileSpreadsheet, Upload, Download, CheckCircle2, AlertCircle, Users, Search, RefreshCw, X } from 'lucide-react';

interface ExcelUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoadParticipants: (participants: Participant[], report?: ExcelParseReport) => void;
  currentCount: number;
}

export const ExcelUploadModal: React.FC<ExcelUploadModalProps> = ({
  isOpen,
  onClose,
  onLoadParticipants,
  currentCount,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [parseReport, setParseReport] = useState<ExcelParseReport | null>(null);
  const [previewParticipants, setPreviewParticipants] = useState<Participant[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  if (!isOpen) return null;

  const handleFileProcess = async (file: File) => {
    if (!file.name.match(/\.(xlsx|xls|csv)$/i)) {
      setErrorMessage('لطفاً یک فایل اکسل معتبر با فرمت xlsx، xls یا csv انتخاب فرمایید.');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const report = await parseParticipantsExcel(file);
      setParseReport(report);
      setPreviewParticipants(report.parsedParticipants);
    } catch (err: unknown) {
      setErrorMessage((err as Error)?.message || 'خطا در پردازش فایل اکسل.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileProcess(e.dataTransfer.files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleConfirmApply = () => {
    if (previewParticipants.length > 0) {
      onLoadParticipants(previewParticipants, parseReport ?? undefined);
      onClose();
    }
  };

  const handleLoadDemo459 = () => {
    setIsLoading(true);
    setTimeout(() => {
      const demoList = getDemoParticipants(459);
      setPreviewParticipants(demoList);
      setParseReport({
        fileName: 'لیست_۴۵۹_نفره_پرسنل_پیشفرض.xlsx',
        totalRawRows: 462,
        headerRowIndex: 2,
        dataStartRowIndex: 3,
        excludedLastRowIndex: 462,
        parsedParticipants: demoList,
        ignoredFooterRowText: 'جمع کل / توضیحات پایانی سازمان',
      });
      setIsLoading(false);
    }, 200);
  };

  const filteredPreview = previewParticipants.filter((p) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      p.fullName.toLowerCase().includes(q) ||
      p.personnelCode.toLowerCase().includes(q) ||
      String(p.rowNumber).includes(q)
    );
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-3xl max-h-[90vh] bg-slate-900 border border-amber-500/30 rounded-3xl p-6 shadow-2xl flex flex-col overflow-hidden text-right">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center">
              <FileSpreadsheet className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">ورودی و مدیریت فایل اکسل افراد</h3>
              <p className="text-xs text-slate-400">
                پشتیبانی از خواندن رکوردها از سطر ۳ و حذف خودکار سطر پایانی
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto py-4 space-y-4">
          {/* Rules Reminder Box */}
          <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-4 text-xs text-slate-300 space-y-1.5">
            <div className="font-bold text-amber-300 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-amber-400" />
              <span>قوانین استخراج ستون‌ها مطابق فرمت سازمان:</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1 font-mono text-[11px] text-slate-300">
              <span className="bg-slate-800/80 px-2 py-1 rounded">۱. ردیف</span>
              <span className="bg-slate-800/80 px-2 py-1 rounded">۲. نام و نام خانوادگی</span>
              <span className="bg-slate-800/80 px-2 py-1 rounded">۳. کد پرسنلی</span>
              <span className="bg-slate-800/80 px-2 py-1 rounded">۴. تلفن همراه</span>
              <span className="bg-slate-800/80 px-2 py-1 rounded text-slate-500">۵. ستون ۵ (نادیده)</span>
              <span className="bg-amber-950/80 text-amber-300 border border-amber-500/40 px-2 py-1 rounded font-bold">۶. مبلغ وام (نسیه)</span>
            </div>
            <p className="text-[11px] text-amber-200/80 pt-1">
              ✓ رکورد اول از <strong>سطر ۳</strong> اکسل آغاز می‌شود و <strong>سطر آخر اکسل</strong> به عنوان ردیف جمع‌کل نادیده گرفته خواهد شد.
            </p>
          </div>

          {/* Upload Drop Zone */}
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center gap-3 cursor-pointer transition-all ${
              isDragging
                ? 'border-amber-400 bg-amber-500/10'
                : 'border-slate-700 hover:border-amber-500/60 bg-slate-950/40 hover:bg-slate-800/30'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx, .xls, .csv"
              className="hidden"
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  handleFileProcess(e.target.files[0]);
                }
              }}
            />
            <div className="w-14 h-14 rounded-full bg-amber-500/20 border border-amber-500/40 flex items-center justify-center">
              <Upload className="w-6 h-6 text-amber-400" />
            </div>
            <div className="text-center">
              <p className="text-sm font-bold text-white">
                فایل اکسل خود را اینجا بکشید یا برای انتخاب کلیک کنید
              </p>
              <p className="text-xs text-slate-400 mt-1">فرمت‌های قابل قبول: .xlsx, .xls, .csv</p>
            </div>
          </div>

          {/* Quick Demo and Template Downloader */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-800/40 p-3 rounded-2xl border border-slate-800">
            <button
              type="button"
              onClick={handleLoadDemo459}
              disabled={isLoading}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 transition flex items-center gap-2 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              <span>بارگذاری سریع نمونه ۴۵۹ نفره آزمایشی</span>
            </button>

            <button
              type="button"
              onClick={() => generateSampleExcelFile(459)}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition flex items-center gap-2 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-slate-400" />
              <span>دانلود قالب استاندارد اکسل (۴۵۹ نفر)</span>
            </button>
          </div>

          {/* Error Message */}
          {errorMessage && (
            <div className="flex items-center gap-2 p-3.5 bg-red-950/50 border border-red-500/40 rounded-xl text-xs text-red-300">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Parse Report Details */}
          {parseReport && (
            <div className="bg-emerald-950/30 border border-emerald-500/30 rounded-2xl p-4 text-xs space-y-2">
              <div className="flex items-center justify-between font-bold text-emerald-300">
                <span className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  اطلاعات فایل پردازش شد: {parseReport.fileName}
                </span>
                <span className="bg-emerald-500/20 px-3 py-1 rounded-full text-emerald-200">
                  {parseReport.parsedParticipants.length} نفر استخراج شد
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] text-slate-300 pt-1">
                <div>کل سطرهای فایل: {parseReport.totalRawRows}</div>
                <div>شروع سطر افراد: سطر ۳</div>
                <div>سطر حذف شده پایانی: سطر {parseReport.excludedLastRowIndex}</div>
                <div>افراد آماده قرعه‌کشی: {parseReport.parsedParticipants.length} نفر</div>
              </div>
              {parseReport.ignoredFooterRowText && (
                <div className="text-[11px] text-slate-400 bg-slate-900/50 p-2 rounded border border-slate-800 truncate">
                  محتوای سطر آخرِ حذف‌شده: {parseReport.ignoredFooterRowText}
                </div>
              )}
            </div>
          )}

          {/* Preview Table if records loaded */}
          {previewParticipants.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-amber-400" />
                  پیش‌نمایش افراد ({filteredPreview.length} از {previewParticipants.length} نفر):
                </span>
                <div className="relative w-48 sm:w-64">
                  <Search className="w-3.5 h-3.5 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="جستجو نام یا کد پرسنلی..."
                    className="w-full pl-3 pr-8 py-1.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
                  />
                </div>
              </div>

              <div className="max-h-48 overflow-y-auto border border-slate-800 rounded-2xl bg-slate-950/60 divide-y divide-slate-850">
                <div className="sticky top-0 bg-slate-900 grid grid-cols-6 gap-2 p-2.5 text-[11px] font-bold text-amber-300 border-b border-slate-800">
                  <span>ردیف</span>
                  <span className="col-span-2">نام و نام خانوادگی</span>
                  <span>کد پرسنلی</span>
                  <span>تلفن همراه</span>
                  <span>مبلغ وام</span>
                </div>
                {filteredPreview.slice(0, 50).map((p, idx) => (
                  <div
                    key={p.id || idx}
                    className="grid grid-cols-6 gap-2 p-2.5 text-xs text-slate-300 hover:bg-slate-800/40"
                  >
                    <span className="font-mono text-slate-400">{p.rowNumber}</span>
                    <span className="col-span-2 font-medium text-white truncate">{p.fullName}</span>
                    <span className="font-mono text-amber-300/90">{p.personnelCode}</span>
                    <span className="font-mono text-slate-400">{p.mobile}</span>
                    <span className="text-amber-300 font-mono text-xs font-semibold">{formatLoanAmount(p.creditDeferred).numeric}</span>
                  </div>
                ))}
                {filteredPreview.length > 50 && (
                  <div className="p-2 text-center text-xs text-slate-500">
                    و {filteredPreview.length - 50} نفر دیگر...
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="pt-4 border-t border-slate-800 flex items-center justify-between gap-3">
          <span className="text-xs text-slate-400">
            تعداد فعلی شرکت‌کنندگان فعال در برنامه: {currentCount} نفر
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-xs font-medium text-slate-300 hover:bg-slate-800 transition cursor-pointer"
            >
              انصراف
            </button>
            <button
              id="btn-apply-excel"
              type="button"
              disabled={previewParticipants.length === 0}
              onClick={handleConfirmApply}
              className={`px-5 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
                previewParticipants.length > 0
                  ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-lg shadow-amber-500/20'
                  : 'bg-slate-800 text-slate-500 cursor-not-allowed'
              }`}
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>تأیید و بارگذاری در گردونه ({previewParticipants.length} نفر)</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
