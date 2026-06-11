"use strict";

const BASE_URL = process.env.BASE_URL || "https://app.wappflow.com";

const perform = async (z, bundle) => {
  const payload = { phone: bundle.inputData.phone };

  if (bundle.inputData.name) payload.name = bundle.inputData.name;
  if (bundle.inputData.email) payload.email = bundle.inputData.email;
  if (bundle.inputData.source) payload.source = bundle.inputData.source;

  if (bundle.inputData.tags) {
    payload.tags = bundle.inputData.tags
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
  }

  // Parse key:value pairs for custom attributes (one per line)
  if (bundle.inputData.attributes) {
    const attrs = {};
    for (const line of bundle.inputData.attributes.split("\n")) {
      const sep = line.indexOf(":");
      if (sep === -1) continue;
      const key = line.slice(0, sep).trim();
      const val = line.slice(sep + 1).trim();
      if (key) attrs[key] = val;
    }
    if (Object.keys(attrs).length > 0) payload.attributes = attrs;
  }

  const response = await z.request({
    url: `${BASE_URL}/api/v1/contacts`,
    method: "POST",
    headers: {
      Authorization: `Bearer ${bundle.authData.apiKey}`,
      "Content-Type": "application/json",
    },
    body: payload,
  });

  const { contact, created } = response.data;
  return { ...contact, created };
};

module.exports = {
  key: "upsert_contact",
  noun: "Contact",

  display: {
    label: "Create or Update Contact",
    description:
      "Create a new WappFlow CRM contact, or update an existing one matched by phone number. Tags are merged; attributes are shallow-merged.",
  },

  operation: {
    perform,

    inputFields: [
      {
        key: "phone",
        label: "Phone Number",
        required: true,
        type: "string",
        helpText: "E.164 format with country code, e.g. `+919876543210`.",
      },
      { key: "name", label: "Name", required: false, type: "string" },
      { key: "email", label: "Email", required: false, type: "string" },
      {
        key: "tags",
        label: "Tags",
        required: false,
        type: "string",
        helpText: "Comma-separated list. Added to any existing tags.",
      },
      {
        key: "source",
        label: "Source",
        required: false,
        type: "string",
        helpText: 'e.g. "Typeform", "Shopify", "CRM Import"',
      },
      {
        key: "attributes",
        label: "Custom Attributes",
        required: false,
        type: "text",
        helpText:
          "One `key: value` pair per line. Shallow-merged with existing attributes.",
      },
    ],

    sample: {
      id: "contact_sample_001",
      name: "Priya Mehta",
      phone: "+919999888877",
      email: "priya@example.com",
      tags: ["newsletter", "vip"],
      source: "Typeform",
      status: "Active",
      created: false,
    },
  },
};
