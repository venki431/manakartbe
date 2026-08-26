// Delivery scheduling policy (backend source of truth).
//
// Flow: mornings we procure fruit at the market; deliveries run in the evening
// window. Orders placed before the cutoff (IST) are delivered the SAME evening;
// after the cutoff they roll to the NEXT evening.

export const CUTOFF_HOUR_IST = 2;          // 2:00 AM India time
export const DELIVERY_SLOT = "evening";     // 4 PM – 8 PM
export const IST_OFFSET_MINUTES = 5 * 60 + 30; // UTC+5:30, no DST in India

/** Current time as an IST Date (values read via UTC getters represent IST). */
function nowIST(now = new Date()) {
  return new Date(now.getTime() + IST_OFFSET_MINUTES * 60 * 1000);
}

/**
 * Returns the scheduled delivery date as a 'YYYY-MM-DD' string (IST calendar).
 * Before 02:00 PM IST -> today; at/after -> tomorrow.
 */
export function computeDeliveryDate(now = new Date()) {
  const ist = nowIST(now);
  // Use UTC getters because `ist` is already shifted into IST.
  if (ist.getUTCHours() >= CUTOFF_HOUR_IST) {
    ist.setUTCDate(ist.getUTCDate() + 1);
  }
  const y = ist.getUTCFullYear();
  const m = String(ist.getUTCMonth() + 1).padStart(2, "0");
  const d = String(ist.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** True if the order (placed at `now`) is scheduled for the same day. */
export function isSameDayDelivery(now = new Date()) {
  return nowIST(now).getUTCHours() < CUTOFF_HOUR_IST;
}
