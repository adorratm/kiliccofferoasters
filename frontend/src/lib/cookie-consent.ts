export const COOKIE_CONSENT_KEY = "kilic_cookie_consent";
export const COOKIE_CONSENT_EVENT = "kilic-cookie-consent";

export type CookieConsent = {
  necessary: boolean;
  analytics: boolean;
  marketing: boolean;
  sessionId?: string;
};

export function readCookieConsent(): CookieConsent | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(COOKIE_CONSENT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CookieConsent;
    return {
      necessary: true,
      analytics: !!parsed.analytics,
      marketing: !!parsed.marketing,
      sessionId: parsed.sessionId,
    };
  } catch {
    return null;
  }
}

export function writeCookieConsent(consent: CookieConsent): void {
  window.localStorage.setItem(COOKIE_CONSENT_KEY, JSON.stringify(consent));
  window.dispatchEvent(
    new CustomEvent(COOKIE_CONSENT_EVENT, { detail: consent }),
  );
}
