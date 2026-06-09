/**
 * metaTemplateService.ts — Submit message templates to Meta and persist them.
 *
 * Extracted verbatim from the old create-template route so the route stays thin.
 * Includes the Resumable Upload dance required for media header example handles.
 */
import { ApiError } from "@/shared/lib/api";
import * as repo from "../repositories/templateRepo";
import { formatTemplateName, type CreateTemplateInput } from "../types";

const WHATSAPP_API_VERSION = process.env.WHATSAPP_API_VERSION || "v21.0";

const hhmm = (d = new Date()) =>
  `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;

/**
 * Meta requires a media HEADER to carry an example asset handle at template
 * creation time. Obtain it via the Resumable Upload API and return the `h` handle.
 */
async function uploadMediaForHeaderHandle(
  mediaUrl: string,
  systemToken: string,
  appId: string
): Promise<string> {
  const fileRes = await fetch(mediaUrl);
  if (!fileRes.ok) throw new ApiError(`Could not fetch sample media from URL (HTTP ${fileRes.status}).`, 400);
  const contentType = fileRes.headers.get("content-type") || "application/octet-stream";
  const buffer = Buffer.from(await fileRes.arrayBuffer());
  if (buffer.byteLength === 0) throw new ApiError("The sample media URL returned an empty file.", 400);

  const sessionUrl =
    `https://graph.facebook.com/${WHATSAPP_API_VERSION}/${appId}/uploads` +
    `?file_length=${buffer.byteLength}&file_type=${encodeURIComponent(contentType)}` +
    `&access_token=${systemToken}`;
  const sessionRes = await fetch(sessionUrl, { method: "POST" });
  const sessionData = await sessionRes.json();
  if (!sessionRes.ok || !sessionData.id) {
    throw new ApiError(sessionData.error?.message || "Failed to open a Meta upload session.", 400);
  }

  const uploadRes = await fetch(`https://graph.facebook.com/${WHATSAPP_API_VERSION}/${sessionData.id}`, {
    method: "POST",
    headers: { Authorization: `OAuth ${systemToken}`, file_offset: "0", "Content-Type": contentType },
    body: buffer,
  });
  const uploadData = await uploadRes.json();
  if (!uploadRes.ok || !uploadData.h) {
    throw new ApiError(uploadData.error?.message || "Failed to upload sample media to Meta.", 400);
  }
  return uploadData.h;
}

/**
 * Look up a template by its exact name on Meta. Used to adopt a name that already
 * exists on Meta (error_subcode 2388024) instead of failing the whole flow.
 */
async function fetchMetaTemplateByName(
  name: string,
  wabaId: string,
  systemToken: string
): Promise<{ metaId: string; metaStatus: string } | null> {
  try {
    const url =
      `https://graph.facebook.com/${WHATSAPP_API_VERSION}/${wabaId}/message_templates` +
      `?name=${encodeURIComponent(name)}&fields=name,status,id&limit=50`;
    const res = await fetch(url, { headers: { Authorization: `Bearer ${systemToken}` } });
    const data = await res.json();
    if (!res.ok || !Array.isArray(data?.data)) return null;
    const match = data.data.find((t: { name?: string }) => t.name === name) || data.data[0] || null;
    if (!match?.id) return null;
    return { metaId: match.id as string, metaStatus: (match.status || "PENDING").toLowerCase() };
  } catch (err) {
    console.error("[fetchMetaTemplateByName] lookup failed:", err);
    return null;
  }
}

/** Build Meta `components`, submit the template, persist it, and log. */
export async function createTemplate(input: CreateTemplateInput) {
  const { category, body, buttons = [], mediaType = "none", mediaUrl = null, organizationId } = input;
  const hasMediaHeader = !!mediaType && mediaType !== "none";

  if (hasMediaHeader && (!mediaUrl || !String(mediaUrl).trim())) {
    throw new ApiError("A sample media URL is required when an optional media header is selected.", 400);
  }

  const formattedName = formatTemplateName(input.name);
  if (!formattedName) throw new ApiError("Invalid template name format", 400);

  const org = await repo.findOrgWaba(organizationId);
  const systemToken = process.env.WHATSAPP_SYSTEM_USER_TOKEN;
  const wabaId = org?.whatsappBusinessAccountId;

  if (!systemToken || !wabaId || !org?.whatsappConnected) {
    throw new ApiError("WhatsApp not configured. Complete Embedded Signup first.", 400);
  }

  // Build components: HEADER (optional) → BODY → BUTTONS (optional).
  const varRegex = /\{\{(\d+)\}\}/g;
  const matches = (Array.from(body.matchAll(varRegex)) as RegExpExecArray[]).map((m) => parseInt(m[1]));
  const uniqueVarCount = new Set(matches).size;

  interface BodyComponent {
    type: string;
    text: string;
    example?: { body_text: string[][] };
  }
  const bodyComponent: BodyComponent = { type: "BODY", text: body };
  if (uniqueVarCount > 0) {
    bodyComponent.example = {
      body_text: [Array.from({ length: uniqueVarCount }, (_, i) => `[Sample ${i + 1}]`)],
    };
  }

  const components: unknown[] = [];
  if (hasMediaHeader) {
    const appId = process.env.META_APP_ID || process.env.NEXT_PUBLIC_META_APP_ID;
    if (!appId) throw new ApiError("Media headers require META_APP_ID to be configured on the server.", 500);
    const headerHandle = await uploadMediaForHeaderHandle(mediaUrl as string, systemToken, appId);
    components.push({ type: "HEADER", format: mediaType.toUpperCase(), example: { header_handle: [headerHandle] } });
  }
  components.push(bodyComponent);
  if (buttons.length > 0) {
    components.push({
      type: "BUTTONS",
      buttons: buttons.map((text: string) => ({ type: "QUICK_REPLY", text })),
    });
  }

  let metaId: string | null = null;
  let metaStatus = "pending";
  try {
    const url = `https://graph.facebook.com/${WHATSAPP_API_VERSION}/${wabaId}/message_templates`;
    const metaRes = await fetch(url, {
      method: "POST",
      headers: { Authorization: `Bearer ${systemToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({ name: formattedName, category: category.toUpperCase(), language: "en_US", components }),
    });
    const metaData = await metaRes.json();
    if (metaRes.ok && metaData.id) {
      metaId = metaData.id;
      metaStatus = metaData.status?.toLowerCase() || "pending";
    } else if (
      metaData.error?.error_subcode === 2388024 ||
      /already exists/i.test(metaData.error?.error_user_title || "")
    ) {
      // The name already has en_US content on Meta but our local mirror is missing
      // it (deleted record, prior environment, etc.). Adopt the existing Meta
      // template instead of failing so the strategist's reuse/park flow proceeds.
      const adopted = await fetchMetaTemplateByName(formattedName, wabaId, systemToken);
      if (!adopted) {
        throw new ApiError(
          `A template named "${formattedName}" already exists on Meta but could not be retrieved. Please choose a different name.`,
          409
        );
      }
      metaId = adopted.metaId;
      metaStatus = adopted.metaStatus;
      console.warn(`[createTemplate] Adopted existing Meta template "${formattedName}" (status: ${metaStatus}).`);
    } else {
      console.error("Meta message template registration failed:", JSON.stringify(metaData, null, 2));
      const details = metaData.error?.error_data?.details || JSON.stringify(metaData.error);
      throw new ApiError(`Meta rejected template: ${metaData.error?.message || "Unknown error"} (Details: ${details})`, 400);
    }
  } catch (err) {
    if (err instanceof ApiError) throw err;
    console.error("Meta communications error:", err);
    throw new ApiError("Failed to communicate with Meta API", 502);
  }

  // Upsert by (organizationId, name): adopting an existing Meta template — or
  // re-submitting a previously rejected one — must update the local row rather
  // than create a duplicate.
  const persistData = {
    name: formattedName,
    body,
    category,
    buttons,
    mediaType,
    mediaUrl: hasMediaHeader ? String(mediaUrl).trim() : null,
    metaStatus,
    metaId,
    organizationId,
  };
  const existingLocal = await repo.findByNameForOrg(organizationId, formattedName);
  const template = existingLocal
    ? await repo.updateTemplate(existingLocal.id, persistData)
    : await repo.createTemplate(persistData);

  await repo.createLog({
    timestamp: hhmm(),
    type: "crm",
    message: `Template submitted for approval: "${formattedName}" (${category}) - Status: ${metaStatus}`,
    organizationId,
  });

  return template;
}
