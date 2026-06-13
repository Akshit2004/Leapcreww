"use strict";

const BASE_URL = process.env.BASE_URL || "https://app.leapcreww.com";

const perform = async (z, bundle) => {
  const after = bundle.cursor || new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const response = await z.request({
    url: `${BASE_URL}/api/v1/events`,
    headers: { Authorization: `Bearer ${bundle.authData.apiKey}` },
    params: { type: "order.placed", after, limit: 25 },
  });

  const { events, nextAfter } = response.data;
  if (nextAfter) z.cursor.set(nextAfter);

  return (events || []).reverse().map((e) => ({
    id: e.id,
    orderId: e.data.orderId,
    total: e.data.total,
    currency: e.data.currency || "INR",
    status: e.data.status,
    contactId: e.data.contact?.id,
    contactName: e.data.contact?.name,
    contactPhone: e.data.contact?.phone,
    itemCount: (e.data.items || []).length,
    items: (e.data.items || []).map((i) => `${i.name} x${i.quantity}`).join(", "),
    placedAt: e.createdAt,
  }));
};

module.exports = {
  key: "new_order",
  noun: "Order",

  display: {
    label: "New Order",
    description:
      "Triggers when a customer places a new order through your LeapCreww WhatsApp store.",
  },

  operation: {
    perform,
    canPaginate: false,
    sample: {
      id: "order_sample_001",
      orderId: "WF-10042",
      total: 249900,
      currency: "INR",
      status: "pending",
      contactId: "contact_sample_001",
      contactName: "Ananya Singh",
      contactPhone: "+918800123456",
      itemCount: 2,
      items: "Blue Kurta x1, Cotton Scarf x1",
      placedAt: new Date().toISOString(),
    },
    outputFields: [
      { key: "id", label: "Event ID" },
      { key: "orderId", label: "Order ID" },
      { key: "total", label: "Total (paise)" },
      { key: "currency", label: "Currency" },
      { key: "status", label: "Status" },
      { key: "contactId", label: "Contact ID" },
      { key: "contactName", label: "Contact Name" },
      { key: "contactPhone", label: "Contact Phone" },
      { key: "itemCount", label: "Item Count" },
      { key: "items", label: "Items Summary" },
      { key: "placedAt", label: "Placed At" },
    ],
  },
};
