/**
 * يحوّل أرقام عربية (٠–٩) وفارسية (۰–۹) إلى إنجليزية، ثم يبقي الأرقام فقط.
 * بدون هذا، `replace(/\D/g,'')` يحذف الأرقام العربية فيصير الرقم «فارغاً» فيظهر خطأ رغم إدخال الرقم.
 */
export function normalizePhoneDigits(raw: string): string {
  if (raw == null || typeof raw !== 'string') return '';
  const map: Record<string, string> = {
    '٠': '0',
    '١': '1',
    '٢': '2',
    '٣': '3',
    '٤': '4',
    '٥': '5',
    '٦': '6',
    '٧': '7',
    '٨': '8',
    '٩': '9',
    '۰': '0',
    '۱': '1',
    '۲': '2',
    '۳': '3',
    '۴': '4',
    '۵': '5',
    '۶': '6',
    '۷': '7',
    '۸': '8',
    '۹': '9',
  };
  let s = '';
  for (const ch of raw.trim()) {
    s += map[ch] ?? ch;
  }
  return s.replace(/\D/g, '');
}

/**
 * أشكال شائعة لنفس خط عراقي (07… / 9647… / 7… بدون صفر) للبحث في قاعدة البيانات.
 */
export function iraqMobileLookupCandidates(normalizedDigits: string): string[] {
  const p = normalizedDigits;
  const out = new Set<string>();
  if (!p) return [];
  out.add(p);

  if (p.startsWith('07')) {
    const rest = p.slice(1);
    out.add('964' + rest);
    if (rest.length === 10) out.add(rest);
  }

  if (p.startsWith('964')) {
    const rest = p.slice(3);
    if (rest.startsWith('7')) {
      out.add('0' + rest);
      out.add(rest);
    }
  }

  if (/^7\d{9}$/.test(p)) {
    out.add('0' + p);
    out.add('964' + p);
  }

  return [...out];
}

/** شكل واحد للتخزين (يتوافق مع seed: 07xxxxxxxxx) */
export function canonicalizeIraqMobileForStorage(normalizedDigits: string): string {
  const p = normalizedDigits;
  if (p.startsWith('964')) {
    const rest = p.slice(3);
    if (rest.startsWith('7') && rest.length >= 9) {
      return '0' + rest;
    }
  }
  if (/^7\d{9}$/.test(p)) {
    return '0' + p;
  }
  return p;
}
