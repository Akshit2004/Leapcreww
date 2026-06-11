"use strict";

const BASE_URL = process.env.BASE_URL || "https://app.wappflow.com";

const perform = async (z, bundle) => {
  const after = bundle.cursor || new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const response = await z.request({
    url: `${BASE_URL}/api/v1/events`,
    headers: { Authorization: `Bearer ${bundle.authData.apiKey}` },
    params: { type: "contact.created", after, limit: 25 },
  });

  const { events, nextAfter } = response.data;
  if (nextAfter) z.cursor.set(nextAfter);

  return (events || []).reverse().map((e) => ({
    id: e.id,
    contactId: e.data.contactId,
    name: e.data.name,
    phone: e.data.phone,
    email: e.data.email,
    tags: (e.data.tags || []).join(", "),
    source: e.data.source,
    status: e.data.status,
    createdAt: e.createdAt,
  }));
};

module.exports = {
  key: "new_contact",
  noun: "Contact",

  display: {
    label: "New Contact",
    description:
      "Triggers when a new contact is added to your WappFlow CRM — via WhatsApp, Shopify sync, CSV import, or the API.",
  },

  operation: {
    perform,
    canPaginate: false,
    sample: {
      id: "contact_sample_001",
      contactId: "contact_sample_001",
      name: "Rahul Verma",
      phone: "+919123456789",
      email: "rahul@example.com",
      tags: "shopify, vip",
      source: "Shopify",
      status: "Active",
      createdAt: new Date().toISOString(),
    },
    outputFields: [
      { key: "id", label: "Event ID" },
      { key: "contactId", label: "Contact ID" },
      { key: "name", label: "Name" },
      { key: "phone", label: "Phone" },
      { key: "email", label: "Email" },
      { key: "tags", label: "Tags (comma-separated)" },
      { key: "source", label: "Source" },
      { key: "status", label: "Status" },
      { key: "createdAt", label: "Created At" },
    ],
  },
};
