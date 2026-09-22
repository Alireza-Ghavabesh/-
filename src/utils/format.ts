/**
 * Helper to convert numbers to Persian ordinal words (اول، دوم، سوم، چهارم، ...)
 */
export function getPersianOrdinal(n: number): string {
  const ordinals: Record<number, string> = {
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
    21: 'بیست و یکم',
    22: 'بیست و دوم',
    23: 'بیست و سوم',
    24: 'بیست و چهارم',
    25: 'بیست و پنجم',
    26: 'بیست و ششم',
    27: 'بیست و هفتم',
    28: 'بیست و هشتم',
    29: 'بیست و نهم',
    30: 'سی‌ام',
    31: 'سی و یکم',
    32: 'سی و دوم',
    33: 'سی و سوم',
    34: 'سی و چهارم',
    35: 'سی و پنجم',
    40: 'چهلم',
    50: 'پنجاهم',
  };

  if (ordinals[n]) return ordinals[n];
  return `${n}ـُم`;
}

export function getWinnerOrdinalTitle(rank: number): string {
  return `برنده ${getPersianOrdinal(rank)}`;
}

/**
 * Converts any number (or string with Persian/English digits) into Persian words (به حروف).
 * E.g., 50000000 -> "پنجاه میلیون"
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

  const numericValue = parseInt(cleanStr, 10);
  const formattedWithCommas = numericValue.toLocaleString('fa-IR');
  const wordsRepresentation = numberToPersianWords(numericValue);

  return {
    raw: cleanStr,
    numeric: `${formattedWithCommas} ریال`,
    words: wordsRepresentation ? `${wordsRepresentation} ریال` : '',
    hasValue: numericValue > 0,
  };
}

