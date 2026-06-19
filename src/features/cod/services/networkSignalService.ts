/**
 * networkSignalService.ts — Shared RTO fraud network (the cross-merchant moat).
 *
 * Every time a customer RTOs, ghosts a COD token, cancels a COD order, or
 * triggers a 2nd+ NDR attempt, we write an anonymized signal keyed by
 * sha256(phone). No raw phone number, name, or order detail ever lands in the
 * network table. Across many merchants this becomes a shared blocklist that no
 * single store could build alone — a serial RTO offender flagged by Store A
 * raises the risk score at Store B the first time they order.
 *
 * Two reads power the COD risk scorer (see codRiskScorer.ts):
 *   - ownCount   : prior signals THIS brand reported for this phone
 *                  ("you already had an RTO with this customer")
 *   - networkCount: prior signals OTHER brands reported for this phone
 *                  ("3 other stores flagged this number")
 *
 * Writes are best-effort and must never break the calling flow.
 */
import { createHash } from "crypto";
import { prisma } from "@/shared/lib/prisma";

export type NetworkSignalType = "rto" | "token_unpaid" | "cod_cancel" | "ndr_2plus";

/** Normalize then sha256-hash a phone number. Stable across merchants. */
function hashPhone(phone: string): string {
  const normalized = phone.replace(/[^0-9]/g, "");
  return createHash("sha256").update(normalized).digest("hex");
}

/**
 * Record one anonymized risk signal in the shared network.
 * Best-effort: logs and swallows errors so the caller's flow is never broken.
 */
export async function recordNetworkSignal(
  phone: string,
  signal: NetworkSignalType,
  organizationId: string,
  category?: string | null,
): Promise<void> {
  try {
    if (!phone) return;
    await prisma.networkSignal.create({
      data: {
        phoneHash: hashPhone(phone),
        signal,
        organizationId,
        category: category ?? null,
      },
    });
  } catch (err) {
    console.warn("[NetworkSignal] recordNetworkSignal failed:", err);
  }
}

/**
 * Count the brand's EXISTING historical RTO indicators for a contact, read
 * straight from the operational tables (not the network table). This makes the
 * own-history score work from day one — before the NetworkSignal table has
 * accumulated anything — by surfacing RTO data the brand already has:
 *   - Orders this contact cancelled (codStatus / status "cancelled")
 *   - NDR events with a 2nd+ delivery attempt or a cancelled/RTO outcome
 *
 * Keyed by contactId (org-scoped) to avoid phone-format mismatches between the
 * Contact, Order, and NdrEvent tables. Never throws — returns 0 on error.
 */
export async function getBrandHistoricalRtoCount(
  organizationId: string,
  contactId: string,
): Promise<number> {
  try {
    const [cancelledOrders, ndrEvents] = await Promise.all([
      prisma.order.count({
        where: {
          contactId,
          organizationId,
          OR: [{ codStatus: "cancelled" }, { status: "cancelled" }],
        },
      }),
      prisma.ndrEvent.count({
        where: {
          contactId,
          organizationId,
          OR: [{ attempt: { gte: 2 } }, { status: "cancelled" }],
        },
      }),
    ]);
    return cancelledOrders + ndrEvents;
  } catch (err) {
    console.warn("[NetworkSignal] getBrandHistoricalRtoCount failed:", err);
    return 0;
  }
}

export interface NetworkRiskCounts {
  /** Signals THIS brand previously reported for this phone. */
  ownCount: number;
  /** Signals OTHER brands reported for this phone (the cross-merchant moat). */
  networkCount: number;
}

/**
 * Look up prior risk signals for a phone, split into this brand's own history
 * and the rest of the network. Reads both the brand's existing RTO data and
 * the shared cross-merchant dataset. Never throws — returns zeros on error.
 */
export async function getNetworkRiskCounts(
  phone: string,
  organizationId: string,
): Promise<NetworkRiskCounts> {
  try {
    if (!phone) return { ownCount: 0, networkCount: 0 };
    const phoneHash = hashPhone(phone);

    const [ownCount, totalCount] = await Promise.all([
      prisma.networkSignal.count({ where: { phoneHash, organizationId } }),
      prisma.networkSignal.count({ where: { phoneHash } }),
    ]);

    return { ownCount, networkCount: Math.max(0, totalCount - ownCount) };
  } catch (err) {
    console.warn("[NetworkSignal] getNetworkRiskCounts failed:", err);
    return { ownCount: 0, networkCount: 0 };
  }
}
