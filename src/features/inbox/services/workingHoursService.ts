/** workingHoursService.ts — Org working-hours / away-message configuration. */
import * as repo from "../repositories/workingHoursRepo";
import { DEFAULT_WORKING_HOURS, type WorkingHoursConfig } from "../types";

export async function getWorkingHours(organizationId: string): Promise<WorkingHoursConfig> {
  const org = await repo.getWorkingHours(organizationId);
  return (org?.workingHours as WorkingHoursConfig | null) ?? DEFAULT_WORKING_HOURS;
}

export async function updateWorkingHours(
  organizationId: string,
  config: Partial<WorkingHoursConfig>
): Promise<Partial<WorkingHoursConfig>> {
  await repo.updateWorkingHours(organizationId, config as object);
  return config;
}
