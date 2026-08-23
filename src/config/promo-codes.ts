/**
 * Promo code registry — SHA-256 hashes only, so plaintext codes are never
 * greppable in the bundle. Rotate by regenerating hashes:
 *   node -e 'console.log(require("crypto").createHash("sha256").update("CODE").digest("hex"))'
 *
 * Client-side limits (by design): codes are per-device single-use and the
 * trial auto-expires after PROMO_TRIAL_DAYS. True global single-use across
 * all users requires a trusted remote counter — see usePromoStore's
 * RemoteValidator seam for where to plug one in later.
 */
export const PROMO_TRIAL_DAYS = 7;

export const PROMO_CODE_HASHES: string[] = [
  // PLEXPLEX2026
  "3b40061865631a07b7d3d067c6dba7d79abc3f5b9cdf9778f9d4ef136208db3d",
  // GOLDEN777
  "c9fc245c15dde57f32cdd4313484fbb73cc114f537783189a27d6be9bfa3aa2d",
];

export async function sha256Hex(input: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Seam for a future remote validator (e.g. Upstash/Firebase KV) that would
 * enforce global single-use. Signature matches the local check so the store
 * can swap implementations without touching UI.
 */
export interface PromoValidator {
  validate(code: string): Promise<{ ok: boolean; error?: string; hash: string }>;
}

export const localValidator: PromoValidator = {
  async validate(code: string) {
    const hash = await sha256Hex(code.trim().toUpperCase());
    if (!PROMO_CODE_HASHES.includes(hash)) {
      return { ok: false, error: "Invalid or expired promo code", hash };
    }
    return { ok: true, hash };
  },
};
