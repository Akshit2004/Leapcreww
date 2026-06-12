import { prisma } from "@/shared/lib/prisma";
import { sendWhatsAppMessage, formatPhoneNumber } from "@/shared/lib/whatsapp";
import type { Contact } from "@prisma/client";

// ── Size recommendation ──────────────────────────────────────────────────────

function parseHeightCm(raw: string): number | null {
  const s = raw.trim().toLowerCase();
  // "5'5"" or "5'5" or "5 5"
  const ft = s.match(/(\d+)['']?\s*(\d+)?[""']?/);
  if (ft && parseInt(ft[1]) <= 7) {
    const feet = parseInt(ft[1]);
    const inches = ft[2] ? parseInt(ft[2]) : 0;
    return Math.round((feet * 30.48) + (inches * 2.54));
  }
  const cm = s.match(/(\d+\.?\d*)\s*cm?/);
  if (cm) return Math.round(parseFloat(cm[1]));
  const plain = s.match(/^(\d{3})$/);
  if (plain) return parseInt(plain[1]);
  return null;
}

function parseWeightKg(raw: string): number | null {
  const s = raw.trim().toLowerCase();
  const kg = s.match(/(\d+\.?\d*)\s*kg?/);
  if (kg) return Math.round(parseFloat(kg[1]));
  const lbs = s.match(/(\d+\.?\d*)\s*l[bi]/);
  if (lbs) return Math.round(parseFloat(lbs[1]) * 0.453592);
  const plain = s.match(/^(\d{2,3})$/);
  if (plain) return parseInt(plain[1]);
  return null;
}

function recommendSize(gender: string, heightCm: number, weightKg: number): string {
  if (gender === "women") {
    if (weightKg < 46 || heightCm < 155)            return "XS";
    if (weightKg < 56 && heightCm < 165)             return "S";
    if (weightKg < 66 && heightCm < 170)             return "M";
    if (weightKg < 78 && heightCm < 177)             return "L";
    return "XL";
  }
  if (gender === "men") {
    if (weightKg < 58 || heightCm < 165)             return "S";
    if (weightKg < 72 && heightCm < 178)             return "M";
    if (weightKg < 85 && heightCm < 183)             return "L";
    if (weightKg < 98 && heightCm < 190)             return "XL";
    return "XXL";
  }
  // kids — by height only
  if (heightCm < 100) return "3-4Y";
  if (heightCm < 110) return "5-6Y";
  if (heightCm < 122) return "7-8Y";
  if (heightCm < 134) return "9-10Y";
  return "11-12Y";
}

// ── Shade recommendation ─────────────────────────────────────────────────────

const SHADE_MAP: Record<string, Record<string, string>> = {
  "1": { "1": "Porcelain / N05", "2": "Ivory / W05", "3": "Vanilla / NC10" },
  "2": { "1": "Shell / NC15",    "2": "Nude / NW10", "3": "Sand / NC20"    },
  "3": { "1": "Natural / NC25",  "2": "Honey / NW25","3": "Beige / NC30"   },
  "4": { "1": "Warm Olive / N35","2": "Caramel / W35","3":"Golden / NC40"  },
  "5": { "1": "Mahogany / N45",  "2": "Mocha / W45", "3": "Espresso / NC50"},
  "6": { "1": "Ebony / N55",     "2": "Bronze / W55","3": "Onyx / NC60"    },
};

function recommendShade(skinTone: string, undertone: string): string {
  return SHADE_MAP[skinTone]?.[undertone] ?? "Natural / NC25";
}

// ── Attribute helpers ────────────────────────────────────────────────────────

async function getAttrs(contactId: string): Promise<Record<string, any>> {
  const c = await prisma.contact.findUnique({ where: { id: contactId }, select: { attributes: true } });
  return (c?.attributes as Record<string, any>) ?? {};
}

async function setAttrs(contactId: string, patch: Record<string, unknown>) {
  const attrs = await getAttrs(contactId);
  await prisma.contact.update({
    where: { id: contactId },
    data: { attributes: { ...attrs, ...patch } },
  });
}

async function send(contact: Contact, orgId: string, text: string) {
  await sendWhatsAppMessage({ to: formatPhoneNumber(contact.phone), text }, orgId);
}

// ── Size finder state machine ────────────────────────────────────────────────

export async function handleSizeFinderReply(
  text: string,
  contact: Contact,
  orgId: string
): Promise<boolean> {
  const attrs = (contact.attributes as Record<string, any>) ?? {};
  const state: string | undefined = attrs.size_finder_state;
  if (!state || state === "done") return false;

  const t = text.trim();

  if (state === "awaiting_gender") {
    const up = t.toUpperCase();
    let gender: string | null = null;
    if (["1", "W", "WOMEN", "WOMAN", "FEMALE", "F"].includes(up)) gender = "women";
    else if (["2", "M", "MEN", "MAN", "MALE"].includes(up)) gender = "men";
    else if (["3", "K", "KID", "KIDS", "CHILD", "CHILDREN"].includes(up)) gender = "kids";

    if (!gender) {
      await send(contact, orgId, "Please reply *1* for Women, *2* for Men, or *3* for Kids.");
      return true;
    }
    await setAttrs(contact.id, { size_finder_state: "awaiting_height", size_finder_gender: gender });
    await send(contact, orgId, `Got it! What's your *height*? (e.g. 165cm or 5'5")`);
    return true;
  }

  if (state === "awaiting_height") {
    const heightCm = parseHeightCm(t);
    if (!heightCm || heightCm < 60 || heightCm > 250) {
      await send(contact, orgId, "I couldn't read that. Please try again — e.g. *165cm* or *5'5\"*");
      return true;
    }
    await setAttrs(contact.id, { size_finder_state: "awaiting_weight", size_finder_height: heightCm });
    await send(contact, orgId, `And your *weight*? (e.g. 60kg or 132lbs)`);
    return true;
  }

  if (state === "awaiting_weight") {
    const weightKg = parseWeightKg(t);
    if (!weightKg || weightKg < 20 || weightKg > 300) {
      await send(contact, orgId, "I couldn't read that. Please try — e.g. *60kg* or *132lbs*");
      return true;
    }
    const gender = attrs.size_finder_gender ?? "women";
    const height = attrs.size_finder_height ?? 165;
    const size = recommendSize(gender, height, weightKg);

    await setAttrs(contact.id, {
      size_finder_state: "done",
      size_finder_result: size,
      size_finder_gender: null,
      size_finder_height: null,
    });

    await send(
      contact, orgId,
      `Based on your measurements, we recommend *Size ${size}* for you 🎉\n\nThis is a general guide — sizes may vary by brand. Try on a size up if you prefer a relaxed fit.\n\nNeed help with anything else?`
    );
    return true;
  }

  return false;
}

// ── Shade finder state machine ───────────────────────────────────────────────

const SKIN_LABELS: Record<string, string> = {
  "1": "Fair", "2": "Light", "3": "Medium",
  "4": "Olive", "5": "Dark", "6": "Deep",
};
const TONE_LABELS: Record<string, string> = { "1": "Cool", "2": "Warm", "3": "Neutral" };

export async function handleShadeFinderReply(
  text: string,
  contact: Contact,
  orgId: string
): Promise<boolean> {
  const attrs = (contact.attributes as Record<string, any>) ?? {};
  const state: string | undefined = attrs.shade_finder_state;
  if (!state || state === "done") return false;

  const t = text.trim();

  if (state === "awaiting_skin_tone") {
    const n = t.replace(/[^1-6]/g, "");
    if (!n || !SKIN_LABELS[n]) {
      await send(contact, orgId, "Please reply a number 1–6:\n*1* Fair  *2* Light  *3* Medium\n*4* Olive  *5* Dark  *6* Deep");
      return true;
    }
    await setAttrs(contact.id, { shade_finder_state: "awaiting_undertone", shade_finder_skin: n });
    await send(
      contact, orgId,
      `Great — ${SKIN_LABELS[n]} skin noted 👍\n\nWhat's your *undertone*?\n*1* — Cool (pinkish veins)\n*2* — Warm (greenish veins)\n*3* — Neutral (mix)`
    );
    return true;
  }

  if (state === "awaiting_undertone") {
    const up = t.toUpperCase();
    let undertone: string | null = null;
    if (["1", "COOL", "PINK", "BLUE", "ROSY"].includes(up)) undertone = "1";
    else if (["2", "WARM", "YELLOW", "GOLDEN", "GREEN"].includes(up)) undertone = "2";
    else if (["3", "NEUTRAL", "MIX"].includes(up)) undertone = "3";

    if (!undertone) {
      await send(contact, orgId, "Please reply *1* for Cool, *2* for Warm, or *3* for Neutral.");
      return true;
    }

    const skinTone = attrs.shade_finder_skin ?? "3";
    const shade = recommendShade(skinTone, undertone);

    await setAttrs(contact.id, {
      shade_finder_state: "done",
      shade_finder_result: shade,
      shade_finder_skin: null,
    });

    await send(
      contact, orgId,
      `Based on your ${SKIN_LABELS[skinTone]} skin with ${TONE_LABELS[undertone].toLowerCase()} undertones, your ideal shades are:\n\n💄 *Foundation:* ${shade}\n✨ *Concealer:* 1-2 shades lighter\n💋 *Lip:* Nudes & mauves work beautifully on you\n\nVisit our store to explore — need help finding specific products?`
    );
    return true;
  }

  return false;
}
