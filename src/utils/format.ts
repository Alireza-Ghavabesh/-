/**
 * Converts any number (or string with Persian/English digits) into Persian cardinal words (به حروف).
 * E.g., 50000000 -> "پنجاه میلیون", 36 -> "سی و شش"
 */
export function numberToPersianWords(input: number | string | null | undefined): string {
  if (input === null || input === undefined || input === '') return '';

  const persianDigits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
  const arabicDigits = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];

  let str = String(input).trim();
  for (let i = 0; i < 10; i++) {
    str = str.replaceAll(persianDigits[i], String(i)).replaceAll(arabicDigits[i], String(i));
  }
  str = str.replace(/[^\d]/g, '');

  if (!str) return '';
  const num = parseInt(str, 10);
  if (isNaN(num)) return '';
  if (num === 0) return 'صفر';

  const units = ['', 'یک', 'دو', 'سه', 'چهار', 'پنج', 'شش', 'هفت', 'هشت', 'نه'];
  const teens = ['ده', 'یازده', 'دوازده', 'سیزده', 'چهارده', 'پانزده', 'شانزده', 'هفده', 'هجده', 'نوزده'];
  const tens = ['', '', 'بیست', 'سی', 'چهل', 'پنجاه', 'شصت', 'هفتاد', 'هشتاد', 'نود'];
  const hundreds = ['', 'یکصد', 'دویست', 'سیصد', 'چهارصد', 'پانصد', 'ششصد', 'هفتصد', 'هشتصد', 'نهصد'];
  const scales = ['', 'هزار', 'میلیون', 'میلیارد', 'تریلیون'];

  while (str.length % 3 !== 0) {
    str = '0' + str;
  }

  const chunks: string[] = [];
  for (let i = 0; i < str.length; i += 3) {
    chunks.push(str.substring(i, i + 3));
  }

  const parts: string[] = [];
  const totalChunks = chunks.length;

  for (let i = 0; i < totalChunks; i++) {
    const chunkNum = parseInt(chunks[i], 10);
    if (chunkNum === 0) continue;

    const scaleIndex = totalChunks - 1 - i;
    const scaleName = scales[scaleIndex] || '';

    const h = parseInt(chunks[i][0], 10);
    const t = parseInt(chunks[i][1], 10);
    const u = parseInt(chunks[i][2], 10);

    const chunkWords: string[] = [];
    if (h > 0) {
      chunkWords.push(hundreds[h]);
    }

    if (t === 1) {
      chunkWords.push(teens[u]);
    } else {
      if (t > 1) {
        chunkWords.push(tens[t]);
      }
      if (u > 0) {
        chunkWords.push(units[u]);
      }
    }

    let chunkText = chunkWords.join(' و ');
    if (scaleName) {
      chunkText += ' ' + scaleName;
    }
    parts.push(chunkText);
  }

  return parts.join(' و ');
}

/**
 * Converts cardinal Persian words into ordinal form:
 * E.g.,
 * 1 -> اول
 * 2 -> دوم
 * 3 -> سوم
 * 20 -> بیستم
 * 30 -> سی‌ام
 * 36 -> سی و ششم
 * 100 -> صدم
 * 101 -> یکصد و یکم
 * 320 -> سیصد و بیستم
 */
export function cardinalToOrdinal(cardinal: string): string {
  if (!cardinal) return '';

  const trimmed = cardinal.trim();

  // If ends with "یک" (e.g. "یک", "بیست و یک", "سی و یک", "یکصد و یک")
  if (trimmed === 'یک') {
    return 'اول';
  }
  if (trimmed.endsWith(' یک')) {
    return trimmed.slice(0, -3) + ' یکم';
  }

  // If ends with "سه" (e.g. "سه", "بیست و سه", "سی و سه")
  if (trimmed.endsWith('سه')) {
    return trimmed.slice(0, -2) + 'سوم';
  }

  // If ends with "سی" (e.g. "سی", "یکصد و سی")
  if (trimmed.endsWith('سی')) {
    return trimmed + '‌ام'; // نیم‌فاصله + ام -> سی‌ام
  }

  // If ends with "صد" (e.g. "یکصد", "دویست و ...") -> "صدم"
  if (trimmed.endsWith('صد')) {
    return trimmed + 'م';
  }

  // Standard case: add "م" to the end (e.g. "دو" -> "دوم", "چهار" -> "چهارم", "شش" -> "ششم", "بیست" -> "بیستم")
  return trimmed + 'م';
}

/**
 * Helper to convert ANY number to Persian ordinal words (اول، دوم، سوم ... سی و ششم ... صدم ... هزارم)
 * Works systematically for 1 to millions!
 */
export function getPersianOrdinal(n: number): string {
  if (!n || n <= 0) return '';

  // Fast exact map for common base numbers
  const fastMap: Record<number, string> = {
    1: 'اول',
    2: 'دوم',
    3: 'سوم',
    4: 'چهارم',
    5: 'پنجم',
    6: 'ششم',
    7: 'هفتم',
    8: 'هشتم',
    9: 'نهم',
    10: 'دهم',
    11: 'یازدهم',
    12: 'دوازدهم',
    13: 'سیزدهم',
    14: 'چهاردهم',
    15: 'پانزدهم',
    16: 'شانزدهم',
    17: 'هفدهم',
    18: 'هجدهم',
    19: 'نوزدهم',
    20: 'بیستم',
    30: 'سی‌ام',
    40: 'چهلم',
    50: 'پنجاهم',
    60: 'شصتم',
    70: 'هفتادم',
    80: 'هشتادم',
    90: 'نودم',
    100: 'صدم',
  };

  if (fastMap[n]) {
    return fastMap[n];
  }

  const cardinal = numberToPersianWords(n);
  return cardinalToOrdinal(cardinal);
}

export function getWinnerOrdinalTitle(rank: number): string {
  return `برنده ${getPersianOrdinal(rank)}`;
}

/**
 * Formats a loan amount (from creditDeferred/نسیه) into:
 * - numeric: "۵۰,۰۰۰,۰۰۰ ریال"
 * - words: "پنجاه میلیون ریال"
 */
export function formatLoanAmount(amount: number | string | null | undefined): {
  raw: string;
  numeric: string;
  words: string;
  hasValue: boolean;
} {
  if (amount === null || amount === undefined || amount === '' || amount === '---') {
    return {
      raw: '0',
      numeric: '۰ ریال',
      words: 'صفر ریال',
      hasValue: false,
    };
  }

  const persianDigits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
  const arabicDigits = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];

  let cleanStr = String(amount).trim();
  for (let i = 0; i < 10; i++) {
    cleanStr = cleanStr.replaceAll(persianDigits[i], String(i)).replaceAll(arabicDigits[i], String(i));
  }
  cleanStr = cleanStr.replace(/[^\d]/g, '');

  if (!cleanStr) {
    return {
      raw: '0',
      numeric: '۰ ریال',
      words: 'صفر ریال',
      hasValue: false,
    };
  }

  const num = parseInt(cleanStr, 10);
  const words = numberToPersianWords(num);

  return {
    raw: cleanStr,
    numeric: `${num.toLocaleString('fa-IR')} ریال`,
    words: `${words} ریال`,
    hasValue: true,
  };
}
