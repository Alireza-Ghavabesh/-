import * as XLSX from 'xlsx';
import { Participant, ExcelParseReport, Winner } from '../types';

/**
 * Parses an Excel or CSV file according to the user's specific rules:
 * - Columns:
 *   1. ردیف (Row/Rank)
 *   2. نام و نام خانوادگی (Full Name)
 *   3. کد پرسنلی (Personnel Code)
 *   4. تلفن همراه (Mobile Number)
 *   5. اعتبار شارژی (Recharge Credit)
 *   6. اعتبار نسیه (Deferred Credit)
 * - Records start from Row 3 (1-based), meaning index 2 in array.
 * - The last row is NOT a person (e.g. summary/total/footer), so it excludes the final row.
 */
export async function parseParticipantsExcel(file: File): Promise<ExcelParseReport> {
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

  if (!rawRows || rawRows.length < 3) {
    throw new Error(
      `فایل اکسل دارای سطرهای کافی نیست (حداقل ۳ سطر مورد نیاز است: سطر ۱ و ۲ عناوین و سطر ۳ به بعد اطلاعات افراد). تعداد سطرهای موجود: ${rawRows?.length || 0}`
    );
  }

  // Filter out completely empty rows at the end to reliably find the true last row
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

  if (cleanedRows.length < 3) {
    throw new Error('تعداد سطرهای معتبر در فایل اکسل کمتر از حد مجاز است.');
  }

  // Excel Row 1 = cleanedRows[0]
  // Excel Row 2 = cleanedRows[1] (Headers)
  // Excel Row 3 = cleanedRows[2] (First participant)
  // Last row = cleanedRows[cleanedRows.length - 1] (Footer/Total to exclude)

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
    // Col 4: اعتبار شارژی
    // Col 5: اعتبار نسیه
    const rawRowNumber = row[0] !== undefined && row[0] !== '' ? String(row[0]).trim() : String(index + 1);
    const fullName = row[1] !== undefined ? String(row[1]).trim() : '';
    const personnelCode = row[2] !== undefined ? String(row[2]).trim() : '';
    const mobile = row[3] !== undefined ? String(row[3]).trim() : '';
    const chargeCredit = row[4] !== undefined ? String(row[4]).trim() : '';
    const creditDeferred = row[5] !== undefined ? String(row[5]).trim() : '';

    // If there is no name and no personnel code, ignore this row
    if (!fullName && !personnelCode) {
      return;
    }

    participants.push({
      id: `p-${item.originalExcelRowNumber}-${Math.random().toString(36).substring(2, 7)}`,
      rowNumber: rawRowNumber || index + 1,
      fullName: fullName || `پرسنل کد ${personnelCode}`,
      personnelCode: personnelCode || '---',
      mobile: mobile || '---',
      chargeCredit: chargeCredit || '0',
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
  };
}

/**
 * Creates and downloads a sample Excel file structured precisely as specified:
 * - Row 1: Document title
 * - Row 2: Headers (ردیف, نام و نام خانوادگی, کد پرسنلی, تلفن همراه, اعتبار شارژی, اعتبار نسیه)
 * - Row 3+: 459 participants
 * - Last row: Summary / Footer (جمع کل و پاورقی)
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
    ['ردیف', 'نام و نام خانوادگی', 'کد پرسنلی', 'تلفن همراه', 'اعتبار شارژی', 'اعتبار نسیه'],
  ];

  for (let i = 1; i <= participantCount; i++) {
    const fn = firstNames[Math.floor(Math.random() * firstNames.length)];
    const ln = lastNames[Math.floor(Math.random() * lastNames.length)];
    const code = (1000 + i).toString();
    const mobile = `09${Math.floor(10 + Math.random() * 89)}${Math.floor(1000000 + Math.random() * 8999999)}`;
    const charge = (Math.floor(Math.random() * 20) + 5) * 100000; // 500,000 to 2,500,000
    const deferred = (Math.floor(Math.random() * 15) + 2) * 200000;

    // Excel Row 3 starts with i=1
    rows.push([i, `${fn} ${ln}`, code, mobile, charge.toLocaleString('fa-IR'), deferred.toLocaleString('fa-IR')]);
  }

  // Final row (Row 462): Summary row that should be EXCLUDED as specified
  rows.push(['جمع کل / توضیحات پایانی', `مجموع ${participantCount} نفر پرسنل شاغل در سازمان`, '', '', '---', '---']);

  const ws = XLSX.utils.aoa_to_sheet(rows);

  // Set RTL on sheet
  ws['!views'] = [{ rightToLeft: true }];

  // Column widths
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
 * Generate 459 in-memory sample participants directly without downloading
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
      originalRowIndex: i + 2, // starts at Excel Row 3
    });
  }
  return participants;
}

/**
 * Export the list of winners to an Excel file (.xlsx)
 */
export function exportWinnersToExcel(winners: Winner[]): void {
  if (winners.length === 0) return;

  const rows: (string | number)[][] = [
    ['گزارش نهایی برندگان مراسم قرعه‌کشی و گردونه شانس', '', '', '', '', '', '', ''],
    ['رتبه برنده', 'عنوان جایزه', 'ردیف اکسل', 'نام و نام خانوادگی', 'کد پرسنلی', 'تلفن همراه', 'اعتبار شارژی', 'زمان ثبت'],
  ];

  winners.forEach((w) => {
    rows.push([
      w.winnerRankTitle || `برنده ${w.drawRound}`,
      w.prizeTitle,
      w.rowNumber,
      w.fullName,
      w.personnelCode,
      w.mobile,
      w.chargeCredit ?? '---',
      w.wonAt,
    ]);
  });

  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws['!views'] = [{ rightToLeft: true }];
  ws['!cols'] = [
    { wch: 10 },
    { wch: 22 },
    { wch: 10 },
    { wch: 25 },
    { wch: 15 },
    { wch: 18 },
    { wch: 16 },
    { wch: 22 },
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'اسامی برندگان');
  XLSX.writeFile(wb, `گزارش_برندگان_قرعه_کشی_${new Date().toISOString().slice(0, 10)}.xlsx`);
}
