/**
 * datetime.ts — IST (Asia/Kolkata) date/time formatting, shared by the
 * appointment bot (server) and the Use Cases console (client). Pure functions
 * with no Prisma/Node dependency so they import cleanly on both sides.
 *
 * The product is India-first (₹, en-IN), so all slot times are entered and
 * displayed in IST while stored as absolute UTC instants.
 */
export const IST_TZ = "Asia/Kolkata";

/** "Fri, 13 Jun" — short day label. */
export function formatSlotDay(value: string | Date): string {
  return new Date(value).toLocaleDateString("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: IST_TZ,
  });
}

/** "Friday, 13 Jun" — long weekday, used for grouping slots into list sections. */
export function formatSlotDayLong(value: string | Date): string {
  return new Date(value).toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "short",
    timeZone: IST_TZ,
  });
}

/** "10:30 AM" — time of day. */
export function formatSlotTime(value: string | Date): string {
  return new Date(value).toLocaleTimeString("en-IN", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: IST_TZ,
  });
}

/** "Fri, 13 Jun · 10:30 AM" — full slot label. */
export function formatSlotDateTime(value: string | Date): string {
  return `${formatSlotDay(value)} · ${formatSlotTime(value)}`;
}

/**
 * Build a UTC instant from an IST calendar date + wall-clock time.
 * `dateStr` is "yyyy-mm-dd"; `time` is "HH:MM" (24h). The +05:30 offset makes
 * the parse interpret the wall-clock time as IST regardless of server timezone.
 */
export function istDateTimeToUtc(dateStr: string, time: string): Date {
  return new Date(`${dateStr}T${time}:00+05:30`);
}
