/**
 * Türkiye telefonlarını E.164 (+90…) formatına çevirir.
 * Geçersiz / çok kısa numaralarda null döner.
 */
export function normalizePhoneE164(
  input?: string | null,
  defaultCountry = 'TR',
): string | null {
  if (!input) return null;
  let digits = input.replace(/\D/g, '');
  if (!digits) return null;

  if (defaultCountry === 'TR') {
    if (digits.startsWith('00')) digits = digits.slice(2);
    if (digits.startsWith('90') && digits.length >= 12) {
      return `+${digits}`;
    }
    if (digits.startsWith('0') && digits.length === 11) {
      return `+90${digits.slice(1)}`;
    }
    if (digits.length === 10 && digits.startsWith('5')) {
      return `+90${digits}`;
    }
  }

  if (digits.length >= 10 && digits.length <= 15) {
    return `+${digits}`;
  }
  return null;
}
