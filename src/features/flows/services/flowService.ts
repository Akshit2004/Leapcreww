import * as repo from "../repositories/flowRepo";
import type { FlowInput } from "../types";
import { ApiError } from "@/shared/lib/api";
import { getWhatsAppConfig } from "@/shared/lib/whatsapp";
import * as crypto from "crypto";

export function listFlows(organizationId: string) {
  return repo.listFlows(organizationId);
}

/** Fetch a flow's submitted responses, scoped to the org. */
export async function getFlowResponses(flowId: string, organizationId: string) {
  const flow = await repo.getFlowById(flowId, organizationId);
  if (!flow) {
    throw new ApiError("Flow not found", 404);
  }

  const responses = await repo.findFlowResponses(flowId, organizationId);
  return { responses };
}

/** Assert a flow exists, belongs to the org, and is published before broadcasting against it. */
export async function assertFlowPublished(flowId: string, organizationId: string) {
  const flow = await repo.getFlowById(flowId, organizationId);
  if (!flow) {
    throw new ApiError("Flow not found", 404);
  }
  if (flow.status !== "published") {
    throw new ApiError("Flow has unpublished changes. Publish it to Meta before broadcasting.", 400);
  }
  return flow;
}

/** List flows alongside whether Meta Flows encryption has been set up for this org. */
export async function listFlowsWithEncryptionStatus(organizationId: string) {
  const [flows, org] = await Promise.all([
    repo.listFlows(organizationId),
    repo.getFlowsEncryptionStatus(organizationId),
  ]);

  return {
    flows,
    encryptionSetup: org?.flowsPublicKeyUploaded || false,
  };
}

/**
 * Update a flow's definition. Editing the flow invalidates whatever was last
 * published to Meta — the live asset on Meta's side won't reflect these
 * changes (e.g. screen ids/names) until the flow is republished. Drop status
 * back to "draft" so the UI flags it and broadcasts/tests can't run against a
 * stale Meta asset (which fails with errors like #131009 "Specified screen
 * ... is not allowed as first screen of this flow").
 */
export async function updateFlow(flowId: string, organizationId: string, input: Partial<FlowInput>) {
  const existing = await repo.getFlowById(flowId, organizationId);
  if (!existing) {
    throw new ApiError("Flow not found", 404);
  }

  const flowJsonChanged = input.flowJson !== undefined &&
    JSON.stringify(input.flowJson) !== JSON.stringify(existing.flowJson);

  const result = await repo.updateFlow(flowId, organizationId, {
    flowJson: input.flowJson as object,
    name: input.name,
    category: input.category,
    ...(flowJsonChanged && existing.status === "published" ? { status: "draft" } : {}),
  });

  if (result.count === 0) {
    throw new ApiError("Flow not found", 404);
  }

  return { success: true };
}

export async function deleteFlow(flowId: string, organizationId: string) {
  const result = await repo.deleteFlow(flowId, organizationId);
  if (result.count === 0) {
    throw new ApiError("Flow not found", 404);
  }
  return { success: true };
}

export function createFlow(input: FlowInput) {
  return repo.createFlow({
    name: input.name,
    category: input.category ?? "LEAD_GENERATION",
    flowJson: input.flowJson as object,
    organizationId: input.organizationId,
  });
}

/** Publish to Meta Flows API and store the returned metaFlowId. */
export async function publishToMeta(flowId: string, orgId: string) {
  const flow = await repo.getFlowById(flowId, orgId);
  if (!flow) {
    throw new ApiError("Flow not found", 404);
  }

  const config = await getWhatsAppConfig(orgId);
  if (!config) {
    throw new ApiError("WhatsApp not configured for this organization.", 400);
  }

  const { businessAccountId, accessToken, apiVersion } = config;
  let metaFlowId = flow.metaFlowId;

  // 1. Create flow if no metaFlowId exists
  console.log(`[FlowService] Publishing flow ${flowId} for WABA ${businessAccountId}`);
  if (!metaFlowId) {
    console.log(`[FlowService] Creating Meta Flow for name: ${flow.name}`);
    const createRes = await fetch(`https://graph.facebook.com/${apiVersion}/${businessAccountId}/flows`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: `${flow.name.replace(/[^a-zA-Z0-9_]/g, "_").substring(0, 21)}_${flow.id.split('-')[0]}`,
        categories: [flow.category],
      }),
    });
    const createData = await createRes.json();
    console.log(`[FlowService] Create Response:`, createRes.status, createData);
    if (!createRes.ok) {
      throw new ApiError(createData.error?.message || "Failed to create Meta Flow", 500);
    }
    metaFlowId = createData.id;
    
    // Save it immediately so if upload/publish fails, we don't try to recreate it
    await repo.setMetaFlowId(flowId, metaFlowId as string);
  }

  // 2. Upload Flow JSON as an asset
  // Sanitize: force latest version, strip dynamic-flow fields to avoid endpoint_uri requirement
  const sanitizedJson = { ...(flow.flowJson as Record<string, unknown>) };
  sanitizedJson.version = "7.3";
  delete sanitizedJson.data_api_version;
  delete sanitizedJson.routing_model;

  // Deep-sanitize all 'id' and 'name' properties — Meta requires alphabets and underscores only
  function sanitizeIds(obj: any): any {
    if (Array.isArray(obj)) return obj.map(sanitizeIds);
    if (obj && typeof obj === "object") {
      const result: any = {};
      for (const [key, value] of Object.entries(obj)) {
        if ((key === "id" || key === "name") && typeof value === "string") {
          // Strip anything that isn't a letter or underscore
          let sanitized = value.replace(/[^a-zA-Z_]/g, "_").replace(/_+/g, "_").replace(/^_|_$/g, "");
          if (!sanitized) sanitized = "field_default";
          result[key] = sanitized;
        } else {
          result[key] = sanitizeIds(value);
        }
      }
      return result;
    }
    return obj;
  }

  const finalJson = sanitizeIds(sanitizedJson);

  const formData = new FormData();
  formData.append("file", new Blob([JSON.stringify(finalJson)], { type: "application/json" }), "flow.json");
  formData.append("name", "flow.json");
  formData.append("asset_type", "FLOW_JSON");

  const uploadRes = await fetch(`https://graph.facebook.com/${apiVersion}/${metaFlowId as string}/assets`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    body: formData,
  });

  const uploadData = await uploadRes.json();
  console.log(`[FlowService] Upload Response:`, uploadRes.status, uploadData);
  if (!uploadRes.ok) {
    throw new ApiError(uploadData.error?.message || "Failed to upload Flow JSON", 500);
  }

  // 3. Publish Flow
  const publishRes = await fetch(`https://graph.facebook.com/${apiVersion}/${metaFlowId as string}/publish`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  const publishData = await publishRes.json();
  console.log(`[FlowService] Publish Response:`, publishRes.status, publishData);
  if (!publishRes.ok) {
    throw new ApiError(publishData.error?.message || "Failed to publish Flow", 500);
  }

  // Update DB
  await repo.setPublished(flowId, metaFlowId as string);
  return { success: true, metaFlowId };
}

/** Automate RSA Keypair generation and Meta Public Key upload */
export async function setupFlowsEncryption(orgId: string) {
  const config = await getWhatsAppConfig(orgId);
  if (!config) {
    throw new ApiError("WhatsApp not configured for this organization.", 400);
  }

  const { phoneNumberId, accessToken, apiVersion } = config;

  // 1. Generate 2048-bit RSA keypair
  const { publicKey, privateKey } = crypto.generateKeyPairSync("rsa", {
    modulusLength: 2048,
    publicKeyEncoding: {
      type: "spki",
      format: "pem",
    },
    privateKeyEncoding: {
      type: "pkcs8",
      format: "pem",
    },
  });

  // 2. Upload Public Key to Meta
  const formData = new FormData();
  formData.append("business_public_key", publicKey);

  const uploadRes = await fetch(
    `https://graph.facebook.com/${apiVersion}/${phoneNumberId}/whatsapp_business_encryption`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      body: formData,
    }
  );

  const uploadData = await uploadRes.json();
  if (!uploadRes.ok) {
    throw new ApiError(uploadData.error?.message || "Failed to upload Public Key to Meta", 500);
  }

  // 3. Save Private Key securely to our DB and set flag
  await repo.setFlowsEncryptionUploaded(orgId, privateKey);

  return { success: true };
}
