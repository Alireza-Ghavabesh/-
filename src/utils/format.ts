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
