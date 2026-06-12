import { requireOrg, ok, route } from "@/shared/lib/api";
import { prisma } from "@/shared/lib/prisma";

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

const DEFAULT_HOURS: WorkingHoursConfig = {
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

export const GET = route(async (_req, ctx) => {
  const orgId = ctx.params!.orgId;
  await requireOrg(orgId);
  const org = await prisma.organization.findUnique({
    where: { id: orgId },
    select: { workingHours: true },
  });
  const config = (org?.workingHours as WorkingHoursConfig | null) ?? DEFAULT_HOURS;
  return ok(config);
});

export const PUT = route(async (req, ctx) => {
  const orgId = ctx.params!.orgId;
  await requireOrg(orgId, "ADMIN");
  const body = await req.json() as Partial<WorkingHoursConfig>;
  await prisma.organization.update({
    where: { id: orgId },
    data: { workingHours: body as object },
  });
  return ok(body);
});
