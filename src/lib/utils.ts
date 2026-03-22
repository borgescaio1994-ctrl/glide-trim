export function cn(...inputs: (string | undefined | false)[]): string {
  return inputs.filter(Boolean).join(' ');
}

/** Número BR ou já com DDI → URL wa.me */
export function whatsAppMeUrl(phone: string | null | undefined): string | null {
  if (!phone?.trim()) return null;
  const d = phone.replace(/\D/g, '');
  if (!d) return null;
  const withCountry = d.length <= 11 && !d.startsWith('55') ? `55${d}` : d;
  return `https://wa.me/${withCountry}`;
}
