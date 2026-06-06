import * as repo from "../repositories/flowRepo";
import type { FlowInput } from "../types";
import { ApiError } from "@/shared/lib/api";
import { getWhatsAppConfig } from "@/shared/lib/whatsapp";
import * as crypto from "crypto";
import { prisma } from "@/shared/lib/prisma";

export function listFlows(organizationId: string) {
  return repo.listFlows(organizationId);
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
    await prisma.flow.update({
      where: { id: flowId },
      data: { metaFlowId }
    });
  }

  // 2. Upload Flow JSON as an asset
  // Sanitize: force latest version, strip dynamic-flow fields to avoid endpoint_uri requirement
  const sanitizedJson = { ...(flow.flowJson as Record<string, unknown>) };
  sanitizedJson.version = "7.3";
  delete sanitizedJson.data_api_version;
  delete sanitizedJson.routing_model;

  const formData = new FormData();
  formData.append("file", new Blob([JSON.stringify(sanitizedJson)], { type: "application/json" }), "flow.json");
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
  await prisma.organization.update({
    where: { id: orgId },
    data: {
      flowsPrivateKey: privateKey,
      flowsPublicKeyUploaded: true,
    },
  });

  return { success: true };
}
