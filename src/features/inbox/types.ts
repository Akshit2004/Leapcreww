/** Inbox / CRM feature types. */

export interface SendMessageInput {
  to: string;
  text: string;
  contactId: string;
  orgId: string;
}

export interface ImportContactRow {
  name?: string;
  phone: string;
  email?: string;
  source?: string;
  tags?: string[];
  status?: string;
}

export const CONTACT_EDITABLE_FIELDS = [
  "name",
  "email",
  "status",
  "tags",
  "assignedAgent",
  "unreadCount",
] as const;
