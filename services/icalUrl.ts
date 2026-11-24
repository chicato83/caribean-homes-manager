/**
 * Only public Airbnb iCal feeds are accepted. The proxy that fetches these
 * feeds runs on our server, so restricting the host prevents it from being
 * used as a generic open proxy.
 */
const AIRBNB_HOST = /^([a-z0-9-]+\.)*airbnb\.(?:[a-z]{2,10}|(?:com|co|net)\.[a-z]{2,3})$/i;

export const normalizeIcalUrl = (raw: string): string => raw.trim();

export function isAllowedIcalUrl(raw: string): boolean {
  const value = normalizeIcalUrl(raw);
  if (!value || value.length > 2000) return false;

  try {
    const url = new URL(value);
    if (url.protocol !== 'https:') return false;
    if (url.username || url.password) return false;
    return AIRBNB_HOST.test(url.hostname.toLowerCase());
  } catch {
    return false;
  }
}
