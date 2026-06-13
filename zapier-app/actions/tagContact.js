"use strict";

const BASE_URL = process.env.BASE_URL || "https://app.leapcreww.com";

/**
 * Add tags to an existing contact (identified by phone).
 * Under the hood this is an upsert — if no contact with that phone exists,
 * one is created so the Zap never fails silently.
 */
const perform = async (z, bundle) => {
  const tags = bundle.inputData.tags
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);

  if (tags.length === 0) {
    throw new z.errors.Error("At least one tag is required.", "InvalidInput", 400);
  }

  const response = await z.request({
    url: `${BASE_URL}/api/v1/contacts`,
    method: "POST",
    headers: {
      Authorization: `Bearer ${bundle.authData.apiKey}`,
      "Content-Type": "application/json",
    },
    body: { phone: bundle.inputData.phone, tags },
  });

  const { contact } = response.data;
  return {
    contactId: contact.id,
    phone: contact.phone,
    name: contact.name,
    tags: contact.tags,
    tagsAdded: tags,
  };
};

module.exports = {
  key: "tag_contact",
  noun: "Tag",

  display: {
    label: "Tag a Contact",
    description:
      "Add one or more tags to a LeapCreww contact (found by phone number). Tags are merged with existing ones — no duplicates are created.",
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
      {
        key: "tags",
        label: "Tags to Add",
        required: true,
        type: "string",
        helpText: "Comma-separated. Example: `paid-user, onboarded, cohort-june`",
      },
    ],

    sample: {
      contactId: "contact_sample_001",
      phone: "+919876543210",
      name: "Rahul Verma",
      tags: ["paid-user", "onboarded"],
      tagsAdded: ["paid-user", "onboarded"],
    },
    outputFields: [
      { key: "contactId", label: "Contact ID" },
      { key: "phone", label: "Phone" },
      { key: "name", label: "Name" },
      { key: "tags", label: "All Tags (after merge)" },
      { key: "tagsAdded", label: "Tags Added" },
    ],
  },
};
