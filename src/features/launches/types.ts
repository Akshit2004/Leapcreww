/** launches/types.ts — DTOs for the Flash Sale / Launch Countdown feature. */

export interface LaunchInput {
  name: string;
  description?: string;
  productUrl?: string;
  launchAt: string; // ISO-8601 string from the API caller
  targetTag?: string;
}

export interface LaunchUpdateInput {
  name?: string;
  description?: string;
  productUrl?: string;
  launchAt?: string;
  targetTag?: string;
}
