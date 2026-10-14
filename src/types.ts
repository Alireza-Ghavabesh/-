export type LotteryMode = 'personnel' | 'instagram';

export interface Participant {
  id: string; // unique ID
  rowNumber: number | string; // ردیف
  fullName: string; // نام و نام خانوادگی یا آیدی اینستاگرام
  personnelCode: string; // کد پرسنلی (در قرعه‌کشی اینستاگرام ---)
  mobile: string; // تلفن همراه (در قرعه‌کشی اینستاگرام ---)
  instagramUsername?: string; // آیدی اینستاگرام (مثلاً @username)
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
  prizeType?: 'monetary' | 'item'; // نوع جایزه (مبلغی/نقدی یا غیرنقدی/کالایی)
  prizeLabel?: string; // برچسب جایزه نقدی (مثلا وام، تسهیلات، سکه، پاداش نقدی)
  prizeItemName?: string; // عنوان جایزه غیرنقدی (مثلا سفر حج عمره، یک دستگاه خودرو)
  lotteryMode?: LotteryMode; // حالت قرعه‌کشی (سازمانی یا اینستاگرامی)
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
  prizeType?: 'monetary' | 'item'; // نوع جایزه: نقدی/مبلغی یا کالایی/غیرنقدی
  prizeLabel?: string; // عنوان برچسب جایزه نقدی (پیش‌فرض: وام)
  prizeItemName?: string; // عنوان جایزه کالایی/غیرنقدی (مثلا سفر حج، خودرو)
  showExcelRow?: boolean; // نمایش ردیف اکسل در استیج و پنجره برنده
  showPersonnelCode?: boolean; // نمایش کد پرسنلی در استیج و پنجره برنده
  lotteryMode?: LotteryMode; // حالت قرعه‌کشی: سازمانی یا اینستاگرامی
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
  detectedMode?: LotteryMode;
}

export type ThemePreset = 'royal-gold' | 'midnight-stage' | 'emerald-gala' | 'neon-festive';

export interface AdminUser {
  id: string;
  username: string;
  name: string;
  isSuperAdmin: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface AuthorizedDevice {
  id: string;
  deviceFingerprint: string;
  deviceName: string;
  details?: Record<string, unknown>;
  isPrimary: boolean;
  createdAt: string;
  lastUsedAt?: string;
}

export interface MachineStatus {
  isAuthorized: boolean;
  totalAuthorizedDevices: number;
  primaryDeviceName?: string | null;
  currentFingerprint: string;
}

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
  // Prize Configuration
  prizeType?: 'monetary' | 'item'; // 'monetary' | 'item'
  prizeLabel?: string; // e.g. 'وام', 'تسهیلات', 'سکه', 'پاداش'
  prizeItemName?: string; // e.g. 'سفر حج عمره', 'یک دستگاه خودرو'
  // Display Options for Stage & Winner Modal
  showExcelRow?: boolean; // نمایش ردیف اکسل در استیج و پنجره برنده
  showPersonnelCode?: boolean; // نمایش کد پرسنلی در استیج و پنجره برنده
  lotteryMode?: LotteryMode; // حالت قرعه‌کشی: سازمانی یا اینستاگرامی
  // Login Screen Customization
  loginHeaderTitle: string; // "ورود به پنل مدیریت"
  loginSubTitle: string; // "سامانه قرعه‌کشی و اعطای تسهیلات"
  loginLogoUrl: string | null; // Custom uploaded image logo/icon (base64)
}

export interface BackupStats {
  participantsCount: number;
  winnersCount: number;
  sessionsCount: number;
  backgroundsCount: number;
  settingsCount: number;
  adminsCount?: number;
}

export interface BackupInspectionResult {
  isValid: boolean;
  version: string;
  formatVersion: number;
  exportedAt: string | null;
  persianDate: string;
  stats: BackupStats;
  notes?: string[];
}

export interface BackupSnapshot {
  filename: string;
  sizeBytes: number;
  sizeKb: number;
  createdAt: string;
  persianDate: string;
}

