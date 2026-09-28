export interface Participant {
  id: string; // unique ID
  rowNumber: number | string; // ردیف
  fullName: string; // نام و نام خانوادگی
  personnelCode: string; // کد پرسنلی
  mobile: string; // تلفن همراه
  employmentDate?: string; // تاریخ استخدام حکم کارگزینی
  chargeCredit?: string | number;
  creditDeferred?: string | number; // مبلغ وام (ریال)
  originalRowIndex: number; // شماره سطر در اکسل
}

export interface Winner extends Participant {
  wonAt: string; // timestamp
  drawRound: number; // شماره ترتیب برنده (1, 2, 3...)
  winnerRankTitle: string; // برنده اول، برنده دوم، برنده سوم، ...
  prizeTitle: string; // عنوان جایزه
  loanAmount?: string; // مبلغ وام (ریال)
  loanWords?: string; // مبلغ وام به حروف
}

export interface LotterySession {
  id: string;
  title: string; // نام قرعه‌کشی
  date: string; // تاریخ قرعه‌کشی (مثلاً ۱۴۰۴/۰۷/۰۳)
  loanAmount: string; // مبلغ وام (مثلاً ۵۰,۰۰۰,۰۰۰ ریال)
  maxWinnersCount: number; // سقف تعداد برندگان این قرعه‌کشی (مثلاً ۵۰ یا ۱۵۰ نفر)
  status: 'active' | 'completed'; // وضعیت (در حال اجرا / پایان یافته)
  totalParticipantsCount: number; // تعداد کل افراد وارد شده با اکسل (مثلاً ۳۲۰ نفر)
  winners: Winner[]; // لیست نهایی برندگان این قرعه‌کشی
  participants?: Participant[]; // لیست اختصاصی شرکت‌کنندگان این قرعه‌کشی
  excelFileName?: string; // نام فایل اکسل اختصاصی بارگذاری شده
  createdAt: string;
  completedAt?: string;
}

export interface CustomBackground {
  id: string;
  name: string;
  imageBase64: string;
  isActive: boolean;
  createdAt?: string;
}

export interface ExcelParseReport {
  fileName: string;
  totalRawRows: number;
  headerRowIndex: number; // typically 1 or 2
  dataStartRowIndex: number; // typically 3
  excludedLastRowIndex: number;
  parsedParticipants: Participant[];
  ignoredFooterRowText?: string;
}

export type ThemePreset = 'royal-gold' | 'midnight-stage' | 'emerald-gala' | 'neon-festive';

export interface AppSettings {
  lotteryTitle: string; // عنوان قرعه‌کشی (متن بالای صفحه)
  prizeTitle: string; // عنوان جایزه
  loanAmount: string; // مقدار وام قرعه‌کشی (مثلاً ۵۰,۰۰۰,۰۰۰ ریال)
  useSettingsLoanAmount: boolean; // اعمال این مبلغ وام برای کلیه برندگان
  spinDurationSeconds: number; // e.g. 5 to 10 seconds for suspense
  maskMobile: boolean; // hide middle digits on stage for privacy
  soundEnabled: boolean;
  bgImageUrl: string | null;
  bgDarkness: number; // 0 to 80%
  themePreset: ThemePreset;
}
