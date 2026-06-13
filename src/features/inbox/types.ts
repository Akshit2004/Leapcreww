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
  "attributes",
  "lastActiveAt",
] as const;

export interface WorkingHoursConfig {
  enabled: boolean;
  timezone: string;
  schedule: {
    [day in "monday"|"tuesday"|"wednesday"|"thursday"|"friday"|"saturday"|"sunday"]: {
      open: boolean;
      from: string; // "HH:MM"
      to: string;   // "HH:MM"
    };
  };
  awayMessage: string;
}

export const DEFAULT_WORKING_HOURS: WorkingHoursConfig = {
  enabled: false,
  timezone: "Asia/Kolkata",
  schedule: {
    monday:    { open: true,  from: "09:00", to: "18:00" },
    tuesday:   { open: true,  from: "09:00", to: "18:00" },
    wednesday: { open: true,  from: "09:00", to: "18:00" },
    thursday:  { open: true,  from: "09:00", to: "18:00" },
    friday:    { open: true,  from: "09:00", to: "18:00" },
    saturday:  { open: false, from: "09:00", to: "13:00" },
    sunday:    { open: false, from: "09:00", to: "13:00" },
  },
  awayMessage: "Thanks for reaching out! We're currently outside our working hours. We'll respond as soon as we're back.",
};
