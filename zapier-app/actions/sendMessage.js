"use strict";

const BASE_URL = process.env.BASE_URL || "https://app.wappflow.com";

const perform = async (z, bundle) => {
  const payload = { to: bundle.inputData.to };

  if (bundle.inputData.templateName) {
    payload.template = {
      name: bundle.inputData.templateName,
      language: bundle.inputData.templateLanguage || "en_US",
    };
    if (bundle.inputData.templateVariables) {
      payload.template.variables = bundle.inputData.templateVariables
        .split(",")
        .map((v) => v.trim())
        .filter(Boolean);
    }
  } else if (bundle.inputData.mediaUrl) {
    payload.media = {
      type: bundle.inputData.mediaType || "image",
      url: bundle.inputData.mediaUrl,
      caption: bundle.inputData.mediaCaption || undefined,
    };
  } else {
    payload.text = bundle.inputData.text;
  }

  const headers = {
    Authorization: `Bearer ${bundle.authData.apiKey}`,
    "Content-Type": "application/json",
  };
  if (bundle.inputData.idempotencyKey) {
    headers["Idempotency-Key"] = bundle.inputData.idempotencyKey;
  }

  const response = await z.request({
    url: `${BASE_URL}/api/v1/messages`,
    method: "POST",
    headers,
    body: payload,
  });

  return response.data;
};

module.exports = {
  key: "send_message",
  noun: "Message",

  display: {
    label: "Send WhatsApp Message",
    description:
      "Send a WhatsApp message to a phone number — free-text, an approved template, or media.",
  },

  operation: {
    perform,

    inputFields: [
      {
        key: "to",
        label: "To (Phone Number)",
        required: true,
        type: "string",
        helpText: "Phone number with country code, e.g. `+919876543210`.",
      },
      {
        key: "text",
        label: "Message Text",
        required: false,
        type: "text",
        helpText: "Plain text message. Required unless using a template or media.",
      },
      {
        key: "templateName",
        label: "Template Name",
        required: false,
        type: "string",
        helpText:
          "Name of a Meta-approved WappFlow template (e.g. `order_confirmation`). Overrides Text.",
      },
      {
        key: "templateLanguage",
        label: "Template Language Code",
        required: false,
        type: "string",
        default: "en_US",
        helpText: "BCP-47 language code for the template.",
      },
      {
        key: "templateVariables",
        label: "Template Variables",
        required: false,
        type: "string",
        helpText:
          "Comma-separated list of variable values for `{{1}}`, `{{2}}`, etc. in the template body.",
      },
      {
        key: "mediaUrl",
        label: "Media URL",
        required: false,
        type: "string",
        helpText: "HTTPS URL of an image, video, or document to attach. Overrides Text.",
      },
      {
        key: "mediaType",
        label: "Media Type",
        required: false,
        choices: ["image", "video", "document"],
        default: "image",
      },
      {
        key: "mediaCaption",
        label: "Media Caption",
        required: false,
        type: "string",
      },
      {
        key: "idempotencyKey",
        label: "Idempotency Key",
        required: false,
        type: "string",
        helpText:
          "Pass a unique string to prevent duplicate sends if Zapier retries. Any string under 255 chars.",
      },
    ],

    sample: {
      ok: true,
      waMessageId: "wamid.sample_abc123",
      error: null,
    },
    outputFields: [
      { key: "ok", label: "Sent Successfully" },
      { key: "waMessageId", label: "WhatsApp Message ID" },
      { key: "error", label: "Error (if any)" },
    ],
  },
};
