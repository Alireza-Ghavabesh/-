export interface Participant {
  id: string; // unique ID
  rowNumber: number | string; // ردیف
  fullName: string; // نام و نام خانوادگی
  personnelCode: string; // کد پرسنلی
  mobile: string; // تلفن همراه
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
