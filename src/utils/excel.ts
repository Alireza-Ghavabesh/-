import * as XLSX from 'xlsx';
import { Participant, ExcelParseReport, Winner, LotteryMode } from '../types';
import { formatLoanAmount } from './format';

/**
 * Normalizes an Instagram username:
 * - Removes URL prefixes (e.g. https://instagram.com/user -> user)
 * - Removes leading @ symbol for storage in instagramUsername
 * - Strips whitespace and quotes
 */
export function cleanInstagramHandle(raw: string): { cleanUsername: string; displayWithAt: string } {
  let u = String(raw || '').trim();
  // Strip url prefixes
  u = u.replace(/^https?:\/\/(www\.)?instagram\.com\//i, '');
  u = u.replace(/\?.*$/, ''); // remove query params
  u = u.replace(/\/+$/, ''); // remove trailing slash
  // Remove leading @ or double @
  u = u.replace(/^@+/, '').trim();
  // Remove surrounding quotes
  u = u.replace(/^["']|["']$/g, '').trim();

  const cleanUsername = u;
  const displayWithAt = cleanUsername ? `@${cleanUsername}` : '';
  return { cleanUsername, displayWithAt };
}

/**
 * Checks whether a cell string matches common header titles in Instagram lists
 */
function isInstagramHeaderCell(cell: string): boolean {
  const c = cell.toLowerCase().trim();
  const headerKeywords = [
    'یوزرنیم',
    'نام کاربری',
    'آیدی',
    'ایدی',
    'کاربر',
    'اینستاگرام',
    'صفحه',
    'پیج',
    'اکانت',
    'username',
    'user',
    'instagram',
    'id',
    'handle',
    'account',
    'profile',
    'نام و نام خانوادگی',
    'مشخصات',
  ];
  return headerKeywords.some((kw) => c === kw || c.startsWith(kw) || c.includes(kw));
}

/**
 * Parses an Excel or CSV file supporting TWO MODES:
 * 1. Organizational / Personnel mode:
 *    - Columns: 1. ردیف, 2. نام و نام خانوادگی, 3. کد پرسنلی, 4. تلفن همراه, 5. ستون اضافی, 6. مبلغ وام
 *    - Records start from Row 3 (1-based), excludes summary/footer row at the end.
 * 2. Instagram Single-Column mode:
 *    - A single column (or column A/B) containing Instagram usernames / handles.
 *    - Auto-detects or enforces requestedMode.
 *    - Preserves all rows (handles optional header row 1, keeps all actual participants).
 */
export async function parseParticipantsExcel(
  file: File,
  requestedMode?: LotteryMode
): Promise<ExcelParseReport> {
  const arrayBuffer = await file.arrayBuffer();
  const workbook = XLSX.read(arrayBuffer, { type: 'array' });

  if (workbook.SheetNames.length === 0) {
    throw new Error('فایل اکسل انتخاب شده فاقد شیت معتبر است.');
  }

  // Use the first sheet
  const firstSheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[firstSheetName];

  // Convert to array of arrays (rows)
  const rawRows = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
    header: 1,
    defval: '',
    blankrows: false,
  });

  if (!rawRows || rawRows.length === 0) {
    throw new Error('فایل اکسل خالی است یا اطلاعات معتبری در آن یافت نشد.');
  }

  // Filter out completely empty rows
  const cleanedRows: { rowData: unknown[]; originalExcelRowNumber: number }[] = [];
  rawRows.forEach((r, idx) => {
    const hasContent = Array.isArray(r) && r.some((cell) => cell !== '' && cell !== null && cell !== undefined);
    if (hasContent) {
      cleanedRows.push({
        rowData: r,
        originalExcelRowNumber: idx + 1, // 1-based Excel row number
      });
    }
  });

  if (cleanedRows.length === 0) {
    throw new Error('هیچ سطر حاوی اطلاعاتی در فایل اکسل یافت نشد.');
  }

  // Determine mode (personnel vs instagram)
  // If requestedMode is specified, respect it. Otherwise, auto-detect by column count and headers.
  let isInstagramMode = requestedMode === 'instagram';

  if (!requestedMode) {
    // Inspect the rows: calculate maximum columns with content
    const maxCols = cleanedRows.reduce((max, r) => {
      if (!Array.isArray(r.rowData)) return max;
      const nonEmpties = r.rowData.filter((c) => c !== '' && c !== null && c !== undefined).length;
      return Math.max(max, nonEmpties);
    }, 0);

    // Check first 3 rows for personnel keywords
    const sampleHeaders = cleanedRows
      .slice(0, 3)
      .flatMap((r) => (Array.isArray(r.rowData) ? r.rowData : []))
      .map((c) => String(c).trim());

    const hasPersonnelKeyword = sampleHeaders.some((h) =>
      h.includes('پرسنل') || h.includes('کارگزینی') || h.includes('حکم') || h.includes('شارژی') || h.includes('نسیه')
    );

    // If maxCols is 1 or 2 (and no personnel keywords), or if file has single column
    if (maxCols <= 2 && !hasPersonnelKeyword) {
      isInstagramMode = true;
    } else {
      isInstagramMode = false;
    }
  }

  // ----------------------------------------------------
  // MODE 1: INSTAGRAM (SINGLE COLUMN OF USERNAMES)
  // ----------------------------------------------------
  if (isInstagramMode) {
    // Determine which column contains the usernames (column 0, or column 1 if column 0 is sequential row numbers)
    let usernameColIdx = 0;
    if (cleanedRows.length > 2) {
      const row0 = cleanedRows[0].rowData;
      const row1 = cleanedRows[1].rowData;
      // If col 0 looks like pure numbers (1, 2, 3...) and col 1 has strings, use col 1
      if (
        Array.isArray(row1) &&
        row1.length > 1 &&
        (typeof row1[0] === 'number' || /^\d+$/.test(String(row1[0]).trim())) &&
        typeof row1[1] === 'string' &&
        row1[1].trim() !== ''
      ) {
        usernameColIdx = 1;
      }
    }

    // Check if the very first row is a header title
    let startIndex = 0;
    const firstCellVal = String(cleanedRows[0]?.rowData[usernameColIdx] || '').trim();
    if (
      isInstagramHeaderCell(firstCellVal) ||
      (cleanedRows.length > 1 && firstCellVal.length > 0 && !firstCellVal.startsWith('@') && isInstagramHeaderCell(firstCellVal))
    ) {
      startIndex = 1;
    }

    // Check if the last row is a summary / footer row (e.g. "جمع کل", "total", "summary")
    let endIndex = cleanedRows.length;
    const lastRowCell = String(cleanedRows[cleanedRows.length - 1]?.rowData[usernameColIdx] || '').trim().toLowerCase();
    let ignoredFooterRowText: string | undefined = undefined;

    if (
      lastRowCell.includes('جمع') ||
      lastRowCell.includes('total') ||
      lastRowCell.includes('summary') ||
      lastRowCell.includes('تعداد کل') ||
      lastRowCell.includes('پاورقی')
    ) {
      endIndex = cleanedRows.length - 1;
      ignoredFooterRowText = lastRowCell;
    }

    const participantsSlice = cleanedRows.slice(startIndex, endIndex);
    const participants: Participant[] = [];

    participantsSlice.forEach((item, index) => {
      const row = item.rowData;
      if (!Array.isArray(row)) return;

      const rawVal = row[usernameColIdx] !== undefined ? String(row[usernameColIdx]).trim() : '';
      if (!rawVal) return;

      const { cleanUsername, displayWithAt } = cleanInstagramHandle(rawVal);
      if (!cleanUsername) return;

      const rowNumber = index + 1;

      participants.push({
        id: `insta-${item.originalExcelRowNumber}-${Math.random().toString(36).substring(2, 7)}`,
        rowNumber,
        fullName: displayWithAt || cleanUsername,
        personnelCode: '---',
        mobile: '---',
        instagramUsername: cleanUsername,
        creditDeferred: '0',
        originalRowIndex: item.originalExcelRowNumber,
      });
    });

    if (participants.length === 0) {
      throw new Error('هیچ نام کاربری معتبری در ستون اکسل یافت نشد. لطفاً از وجود نام‌های کاربری اینستاگرام اطمینان حاصل کنید.');
    }

    return {
      fileName: file.name,
      totalRawRows: cleanedRows.length,
      headerRowIndex: startIndex > 0 ? 1 : 0,
      dataStartRowIndex: startIndex > 0 ? 2 : 1,
      excludedLastRowIndex: endIndex < cleanedRows.length ? cleanedRows[cleanedRows.length - 1].originalExcelRowNumber : 0,
      parsedParticipants: participants,
      ignoredFooterRowText,
      detectedMode: 'instagram',
    };
  }

  // ----------------------------------------------------
  // MODE 2: ORGANIZATIONAL / PERSONNEL (6 COLUMNS)
  // ----------------------------------------------------
  if (cleanedRows.length < 3) {
    throw new Error(
      `فایل پرسنلی دارای سطرهای کافی نیست (حداقل ۳ سطر: سطر ۱ و ۲ عناوین و سطر ۳ به بعد اطلاعات افراد). تعداد سطور: ${cleanedRows.length}`
    );
  }

  const participantsSlice = cleanedRows.slice(2, cleanedRows.length - 1);
  const footerRowObj = cleanedRows[cleanedRows.length - 1];
  const ignoredFooterRowText = Array.isArray(footerRowObj?.rowData)
    ? footerRowObj.rowData.filter(Boolean).join(' | ')
    : '';

  const participants: Participant[] = [];

  participantsSlice.forEach((item, index) => {
    const row = item.rowData;
    if (!Array.isArray(row)) return;

    // Col 0: ردیف
    // Col 1: نام و نام خانوادگی
    // Col 2: کد پرسنلی
    // Col 3: تلفن همراه
    // Col 4: تاریخ استخدام حکم کارگزینی (یا ستون اضافی)
    // Col 5: مبلغ وام (در صورت وجود)
    const rawRowNumber = row[0] !== undefined && row[0] !== '' ? String(row[0]).trim() : String(index + 1);
    const fullName = row[1] !== undefined ? String(row[1]).trim() : '';
    const personnelCode = row[2] !== undefined ? String(row[2]).trim() : '';
    const mobile = row[3] !== undefined ? String(row[3]).trim() : '';
    const employmentDate = row[4] !== undefined ? String(row[4]).trim() : '';
    const creditDeferred = row[5] !== undefined ? String(row[5]).trim() : '';

    // If there is no name and no personnel code, ignore this row
    if (!fullName && !personnelCode && !rawRowNumber) {
      return;
    }

    participants.push({
      id: `p-${item.originalExcelRowNumber}-${Math.random().toString(36).substring(2, 7)}`,
      rowNumber: rawRowNumber || index + 1,
      fullName: fullName || `پرسنل ردیف ${rawRowNumber || index + 1}`,
      personnelCode: personnelCode || '---',
      mobile: mobile || '---',
      employmentDate: employmentDate || undefined,
      creditDeferred: creditDeferred || '0',
      originalRowIndex: item.originalExcelRowNumber,
    });
  });

  if (participants.length === 0) {
    throw new Error('هیچ فردی در سطرهای ۳ تا یکی مانده به آخر یافت نشد. لطفاً از صحت چیدمان ستون‌ها اطمینان حاصل کنید.');
  }

  return {
    fileName: file.name,
    totalRawRows: cleanedRows.length,
    headerRowIndex: 2,
    dataStartRowIndex: 3,
    excludedLastRowIndex: footerRowObj?.originalExcelRowNumber || cleanedRows.length,
    parsedParticipants: participants,
    ignoredFooterRowText,
    detectedMode: 'personnel',
  };
}

/**
 * Creates and downloads a sample Excel file for ORGANIZATIONAL personnel (459 participants)
 */
export function generateSampleExcelFile(participantCount = 459): void {
  const firstNames = [
    'علی', 'محمد', 'حسین', 'امیر', 'رضا', 'مهدی', 'علیرضا', 'احمد', 'محسن', 'امید',
    'احسان', 'سعید', 'وحید', 'میلاد', 'سامان', 'فرزاد', 'آرش', 'پیمان', 'نیما', 'سینا',
    'فاطمه', 'زهرا', 'مریم', 'نرگس', 'سارا', 'زینب', 'مهسا', 'الهام', 'شیرین', 'نگار',
    'رویا', 'بهاره', 'سمیرا', 'پریسا', 'سمانه', 'ندا', 'آرزو', 'مونا', 'لیلا', 'مینا'
  ];

  const lastNames = [
    'محمدی', 'حسینی', 'احمدی', 'رضایی', 'کریمی', 'موسوی', 'جعفری', 'قاسمی', 'مرادی',
    'ابراهیمی', 'حیدری', 'صادقی', 'کاظمی', 'نجفی', 'مظفری', 'باقری', 'طاهری', 'شریفی',
    'اکبری', 'فتحی', 'رستمی', 'دهقان', 'نوری', 'رحمانی', 'سلیمانی', 'فرهادی', 'یوسفی',
    'خسروی', 'جلالی', 'صالحی', 'محمودی', 'افشار', 'نصیری', 'وفایی', 'مقدم', 'امامی'
  ];

  const rows: (string | number)[][] = [
    // Row 1 (Excel Row 1): Document Title
    ['فهرست پرسنل شرکت - مراسم قرعه‌کشی سالانه و گردونه شانس', '', '', '', '', ''],
    // Row 2 (Excel Row 2): Column Headers
    ['ردیف', 'نام و نام خانوادگی', 'کد پرسنلی', 'تلفن همراه', 'ستون اضافی', 'مبلغ وام (ریال)'],
  ];

  for (let i = 1; i <= participantCount; i++) {
    const fn = firstNames[Math.floor(Math.random() * firstNames.length)];
    const ln = lastNames[Math.floor(Math.random() * lastNames.length)];
    const code = (1000 + i).toString();
    const mobile = `09${Math.floor(10 + Math.random() * 89)}${Math.floor(1000000 + Math.random() * 8999999)}`;
    const charge = (Math.floor(Math.random() * 20) + 5) * 100000;
    const deferred = (Math.floor(Math.random() * 15) + 2) * 200000;

    rows.push([i, `${fn} ${ln}`, code, mobile, charge.toLocaleString('fa-IR'), deferred.toLocaleString('fa-IR')]);
  }

  // Final row (Row 462): Summary row that should be EXCLUDED as specified
  rows.push(['جمع کل / توضیحات پایانی', `مجموع ${participantCount} نفر پرسنل شاغل در سازمان`, '', '', '---', '---']);

  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws['!views'] = [{ rightToLeft: true }];
  ws['!cols'] = [
    { wch: 8 },  // ردیف
    { wch: 26 }, // نام و نام خانوادگی
    { wch: 14 }, // کد پرسنلی
    { wch: 16 }, // تلفن همراه
    { wch: 16 }, // اعتبار شارژی
    { wch: 16 }, // اعتبار نسیه
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'لیست پرسنل');
  XLSX.writeFile(wb, `لیست_پرسنل_${participantCount}_نفره_قرعه_کشی.xlsx`);
}

/**
 * Creates and downloads a sample Excel file for INSTAGRAM raffle (single column of handles)
 */
export function generateInstagramSampleExcelFile(participantCount = 300): void {
  const handles = [
    'ali_reza_official', 'sara.designer', 'mohammad_dev', 'maryam.art', 'tehran_photography',
    'hosein_music', 'niloufar.lifestyle', 'omid.fitness', 'zahra_cake_studio', 'pouya_tech',
    'fatemeh_cooks', 'amir.travels', 'elnaz_books', 'shayan_vlog', 'narges_accessories',
    'mehdi_coffee', 'taraneh_poetry', 'farhad.gaming', 'bahar_boutique', 'saeed_barista',
    'pegah_graphic', 'navid_sketch', 'samira_plants', 'kian_cinema', 'marjan_ceramic',
    'behnaz_nature', 'arash_coder', 'diana_cosmetics', 'babak_runner', 'arezoo_psychology'
  ];

  const rows: (string | number)[][] = [
    ['نام کاربری اینستاگرام (Instagram Username)'],
  ];

  for (let i = 1; i <= participantCount; i++) {
    const base = handles[(i - 1) % handles.length];
    const suffix = i > handles.length ? `_${Math.floor(i / handles.length) + 1}` : '';
    rows.push([`@${base}${suffix}`]);
  }

  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws['!views'] = [{ rightToLeft: false }];
  ws['!cols'] = [{ wch: 32 }];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'یوزرنیم‌های اینستاگرام');
  XLSX.writeFile(wb, `لیست_اینستاگرام_${participantCount}_نفره_قرعه_کشی.xlsx`);
}

/**
 * Generate 459 in-memory sample participants for organizational mode
 */
export function getDemoParticipants(count = 459): Participant[] {
  const firstNames = [
    'علی', 'محمد', 'حسین', 'امیر', 'رضا', 'مهدی', 'علیرضا', 'احمد', 'محسن', 'امید',
    'احسان', 'سعید', 'وحید', 'میلاد', 'سامان', 'فرزاد', 'آرش', 'پیمان', 'نیما', 'سینا',
    'فاطمه', 'زهرا', 'مریم', 'نرگس', 'سارا', 'زینب', 'مهسا', 'الهام', 'شیرین', 'نگار',
    'رویا', 'بهاره', 'سمیرا', 'پریسا', 'سمانه', 'ندا', 'آرزو', 'مونا', 'لیلا', 'مینا'
  ];

  const lastNames = [
    'محمدی', 'حسینی', 'احمدی', 'رضایی', 'کریمی', 'موسوی', 'جعفری', 'قاسمی', 'مرادی',
    'ابراهیمی', 'حیدری', 'صادقی', 'کاظمی', 'نجفی', 'مظفری', 'باقری', 'طاهری', 'شریفی',
    'اکبری', 'فتحی', 'رستمی', 'دهقان', 'نوری', 'رحمانی', 'سلیمانی', 'فرهادی', 'یوسفی',
    'خسروی', 'جلالی', 'صالحی', 'محمودی', 'افشار', 'نصیری', 'وفایی', 'مقدم', 'امامی'
  ];

  const participants: Participant[] = [];
  for (let i = 1; i <= count; i++) {
    const fn = firstNames[(i * 3) % firstNames.length];
    const ln = lastNames[(i * 7) % lastNames.length];
    const code = (2000 + i).toString();
    const mobile = `0912${String(1000000 + i * 371).slice(-7)}`;
    const charge = ((i % 15) + 5) * 100000;
    const deferred = ((i % 10) + 2) * 200000;

    participants.push({
      id: `demo-${i}`,
      rowNumber: i,
      fullName: `${fn} ${ln}`,
      personnelCode: code,
      mobile,
      chargeCredit: charge.toLocaleString('fa-IR'),
      creditDeferred: deferred.toLocaleString('fa-IR'),
      originalRowIndex: i + 2,
    });
  }
  return participants;
}

/**
 * Generate 300 in-memory sample Instagram participants directly without file upload
 */
export function getInstagramDemoParticipants(count = 300): Participant[] {
  const sampleHandles = [
    'ali_reza_official', 'sara.designer', 'mohammad_dev', 'maryam.art', 'tehran_photography',
    'hosein_music', 'niloufar.lifestyle', 'omid.fitness', 'zahra_cake_studio', 'pouya_tech',
    'fatemeh_cooks', 'amir.travels', 'elnaz_books', 'shayan_vlog', 'narges_accessories',
    'mehdi_coffee', 'taraneh_poetry', 'farhad.gaming', 'bahar_boutique', 'saeed_barista',
    'pegah_graphic', 'navid_sketch', 'samira_plants', 'kian_cinema', 'marjan_ceramic',
    'behnaz_nature', 'arash_coder', 'diana_cosmetics', 'babak_runner', 'arezoo_psychology'
  ];

  const participants: Participant[] = [];
  for (let i = 1; i <= count; i++) {
    const base = sampleHandles[(i - 1) % sampleHandles.length];
    const suffix = i > sampleHandles.length ? `_${Math.floor(i / sampleHandles.length) + 1}` : '';
    const username = `${base}${suffix}`;

    participants.push({
      id: `insta-demo-${i}`,
      rowNumber: i,
      fullName: `@${username}`,
      personnelCode: '---',
      mobile: '---',
      instagramUsername: username,
      creditDeferred: '0',
      originalRowIndex: i + 1,
    });
  }
  return participants;
}

/**
 * Export the list of winners to an Excel file (.xlsx)
 * Supports both organizational and Instagram winners gracefully.
 */
export function exportWinnersToExcel(winners: Winner[]): void {
  if (winners.length === 0) return;

  const hasInstagramWinners = winners.some((w) => w.lotteryMode === 'instagram' || Boolean(w.instagramUsername));

  const rows: (string | number)[][] = [
    ['گزارش نهایی برندگان مراسم قرعه‌کشی و گردونه شانس', '', '', '', '', '', '', '', '', ''],
    hasInstagramWinners
      ? ['رتبه برنده', 'عنوان / شرح جایزه', 'نوع جایزه', 'ردیف اکسل', 'نام و آیدی اینستاگرام', 'کد پرسنلی / وضعیت', 'تلفن همراه', 'مبلغ / مشخصات جایزه', 'مبلغ به حروف / توضیحات', 'زمان ثبت']
      : ['رتبه برنده', 'عنوان / شرح جایزه', 'نوع جایزه', 'ردیف اکسل', 'نام و نام خانوادگی', 'کد پرسنلی', 'تلفن همراه', 'مبلغ / مشخصات جایزه', 'مبلغ به حروف / توضیحات', 'زمان ثبت'],
  ];

  winners.forEach((w) => {
    const isItem = w.prizeType === 'item';
    const loan = formatLoanAmount(w.creditDeferred);
    const prizeLabelText = w.prizeLabel || (isItem ? 'جایزه غیرنقدی' : 'وام');
    const prizeTitleText = isItem ? (w.prizeItemName || w.prizeTitle || 'جایزه غیرنقدی') : (w.prizeTitle || prizeLabelText);
    const amountVal = isItem ? (w.prizeItemName || 'کالایی / غیرنقدی') : (w.loanAmount || loan.numeric);
    const amountWordsVal = isItem ? 'جایزه غیرنقدی (بدون وجه نقدی)' : (w.loanWords || loan.words);

    const displayName = w.instagramUsername
      ? `@${w.instagramUsername}`
      : w.fullName;

    const displayPersonnel = w.lotteryMode === 'instagram' || w.instagramUsername
      ? 'اینستاگرام (بدون کد پرسنلی)'
      : (w.personnelCode || '---');

    const displayMobile = w.lotteryMode === 'instagram' || w.instagramUsername
      ? '---'
      : (w.mobile || '---');

    rows.push([
      w.winnerRankTitle || `برنده ${w.drawRound}`,
      prizeTitleText,
      isItem ? 'کالایی / غیرنقدی' : `نقدی (${prizeLabelText})`,
      w.rowNumber,
      displayName,
      displayPersonnel,
      displayMobile,
      amountVal,
      amountWordsVal,
      w.wonAt,
    ]);
  });

  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws['!views'] = [{ rightToLeft: true }];
  ws['!cols'] = [
    { wch: 12 },
    { wch: 25 },
    { wch: 18 },
    { wch: 10 },
    { wch: 28 },
    { wch: 20 },
    { wch: 16 },
    { wch: 22 },
    { wch: 32 },
    { wch: 16 },
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'اسامی برندگان');
  XLSX.writeFile(wb, `گزارش_برندگان_قرعه_کشی_${new Date().toISOString().slice(0, 10)}.xlsx`);
}
