export interface Participant {
  id: string; // unique ID
  rowNumber: number | string; // ردیف
  fullName: string; // نام و نام خانوادگی
  personnelCode: string; // کد پرسنلی
  mobile: string; // تلفن همراه
  chargeCredit?: string | number; // اعتبار شارژی
  creditDeferred?: string | number; // اعتبار نسیه
  originalRowIndex: number; // شماره سطر در اکسل
}

export interface Winner extends Participant {
  wonAt: string; // timestamp
  drawRound: number; // شماره ترتیب برنده (1, 2, 3...)
  winnerRankTitle: string; // برنده اول، برنده دوم، برنده سوم، ...
  prizeTitle: string; // عنوان جایزه
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
  prizeTitle: string;
  spinDurationSeconds: number; // e.g. 5 to 10 seconds for suspense
  maskMobile: boolean; // hide middle digits on stage for privacy
  soundEnabled: boolean;
  bgImageUrl: string | null;
  bgDarkness: number; // 0 to 80%
  themePreset: ThemePreset;
}
