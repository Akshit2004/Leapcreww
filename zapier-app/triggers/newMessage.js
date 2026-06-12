"use strict";

const BASE_URL = process.env.BASE_URL || "https://app.wappflow.com";

/** Fetch inbound messages created after the given ISO timestamp. */
const perform = async (z, bundle) => {
  // On the first poll or during sample loading, look back 24 hours.
  const after = bundle.cursor || new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const response = await z.request({
    url: `${BASE_URL}/api/v1/events`,
    headers: { Authorization: `Bearer ${bundle.authData.apiKey}` },
    params: { type: "message.received", after, limit: 25 },
  });

  const { events, nextAfter } = response.data;

  // Store the cursor so the next poll fetches only newer events.
  if (nextAfter) z.cursor.set(nextAfter);

  // Zapier deduplicates by `id`; return newest-first so the most recent
  // event is at index 0 (Zapier triggers on index 0 in live mode).
  return (events || []).reverse().map((e) => ({
    id: e.id,
    messageId: e.data.messageId,
    waMessageId: e.data.waMessageId,
    text: e.data.text,
    contactId: e.data.contact?.id,
    contactName: e.data.contact?.name,
    contactPhone: e.data.contact?.phone,
    receivedAt: e.createdAt,
  }));
};

module.exports = {
  key: "new_message",
  noun: "Message",

  display: {
    label: "New Inbound Message",
    description:
      "Triggers when a customer sends a WhatsApp message to your WappFlow inbox.",
  },

  operation: {
    perform,
    canPaginate: false,
    sample: {
      id: "msg_sample_001",
      messageId: "msg_sample_001",
      waMessageId: "wamid.sample123",
      text: "Hi, I'd like to know more about your product.",
      contactId: "contact_sample_001",
      contactName: "Priya Sharma",
      contactPhone: "+919876543210",
      receivedAt: new Date().toISOString(),
    },
    outputFields: [
      { key: "id", label: "Event ID" },
      { key: "messageId", label: "Message ID" },
      { key: "waMessageId", label: "WhatsApp Message ID" },
      { key: "text", label: "Message Text" },
      { key: "contactId", label: "Contact ID" },
      { key: "contactName", label: "Contact Name" },
      { key: "contactPhone", label: "Contact Phone" },
      { key: "receivedAt", label: "Received At" },
    ],
  },
};
