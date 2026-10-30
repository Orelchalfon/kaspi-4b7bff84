// QR-code gifts: shared constants + helpers for the scan page (/give/$token), the parent's
// QR dialog and the pending-gifts review. Server rules live in submit_gift /
// approve_gift_and_pay (supabase/migrations/20261019120000_qr_gifts.sql) — keep in sync.

export const GIFT_REASONS = ["haircut", "birthday", "holiday", "help", "school", "gift"] as const;
export type GiftReason = (typeof GIFT_REASONS)[number];

export const GIFT_REASON_LABELS: Record<GiftReason, string> = {
  haircut: "תספורת",
  birthday: "יום הולדת",
  holiday: "חג",
  help: "עזרה",
  school: "הצלחה בלימודים",
  gift: "סתם מתנה",
};

export function giftReasonLabel(reason: string): string {
  return (GIFT_REASON_LABELS as Record<string, string>)[reason] ?? "מתנה";
}

/** Per-gift ceiling, mirrors the gifts.amount CHECK and submit_gift. */
export const GIFT_MAX = 500;
export const GIFT_QUICK_AMOUNTS = [10, 20, 50, 100] as const;
export const SENDER_NAME_MAX = 40;

/** Tokens are gen_random_uuid() without dashes. */
export function isGiftToken(token: string): boolean {
  return /^[0-9a-f]{32}$/.test(token);
}

/** Formats 16 random bytes as an RFC 4122 v4 UUID (sets the version + variant bits). */
export function uuidV4FromBytes(bytes: Uint8Array): string {
  const b = Uint8Array.from(bytes);
  b[6] = (b[6] & 0x0f) | 0x40;
  b[8] = (b[8] & 0x3f) | 0x80;
  const h = Array.from(b, (x) => x.toString(16).padStart(2, "0")).join("");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

/**
 * Idempotency key for submit_gift (`_request_id uuid`). `crypto.randomUUID` only exists
 * in secure contexts, so a phone scanning a QR that points at the dev server over the
 * LAN (http://10.0.0.x) doesn't have it; `getRandomValues` works everywhere.
 */
export function newGiftRequestId(): string {
  if (typeof crypto.randomUUID === "function") return crypto.randomUUID();
  return uuidV4FromBytes(crypto.getRandomValues(new Uint8Array(16)));
}

export function giftUrl(token: string): string {
  return `${window.location.origin}/give/${token}`;
}

/** Hebrew copy for submit_gift / approve_gift_and_pay / reject_gift `{ error }` values. */
export function giftErrorMessage(error: string): string {
  switch (error) {
    case "Email not confirmed":
      return "צריך לאמת את כתובת המייל לפני ששולחים מתנה. בדקו את תיבת הדואר.";
    case "Children cannot send gifts":
      return "רק מבוגרים יכולים לשלוח מתנות.";
    case "Gift link not found":
      return "הקוד הזה כבר לא פעיל. בקשו מההורים קוד חדש.";
    case "Too many pending gifts":
      return "יש לכם כבר 3 מתנות שממתינות לאישור ההורים. נסו שוב אחרי שיאשרו אותן.";
    case "Invalid amount":
      return `הסכום חייב להיות מספר שלם בין 1 ל-${GIFT_MAX}.`;
    case "Invalid sender name":
      return "הזינו שם שיוצג להורים.";
    case "Gift is not pending":
      return "המתנה כבר טופלה.";
    default:
      return "משהו השתבש. נסו שוב.";
  }
}

// Remembers which gift link a signed-out visitor came from, so login / email
// confirmation (possibly in another tab) can send them back to it. localStorage, not a
// URL param, because the confirmation link opens a fresh tab and Supabase only redirects
// to allow-listed URLs. Expires after an hour so a later, unrelated login isn't hijacked.
const RETURN_KEY = "kasp:give-return";
const RETURN_TTL_MS = 60 * 60 * 1000;

export function rememberGiveReturn(token: string): void {
  try {
    window.localStorage.setItem(RETURN_KEY, JSON.stringify({ token, at: Date.now() }));
  } catch {
    // Storage blocked (private mode etc.): the sender just rescans the QR after login.
  }
}

/** Returns (and clears) a still-fresh remembered gift token, if any. */
export function takeGiveReturn(): string | null {
  try {
    const raw = window.localStorage.getItem(RETURN_KEY);
    if (!raw) return null;
    window.localStorage.removeItem(RETURN_KEY);
    const parsed = JSON.parse(raw) as { token?: unknown; at?: unknown };
    if (typeof parsed.token !== "string" || !isGiftToken(parsed.token)) return null;
    if (typeof parsed.at !== "number" || Date.now() - parsed.at > RETURN_TTL_MS) return null;
    return parsed.token;
  } catch {
    return null;
  }
}
