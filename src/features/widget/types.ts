/** Widget feature types — embeddable website chat button. */

/** Fields an ADMIN may update from the configurator UI. */
export interface UpdateWidgetInput {
  enabled?: boolean;
  phoneNumber?: string;
  position?: "bottom-right" | "bottom-left";
  color?: string;
  greeting?: string;
  prefilledText?: string;
  showGreeting?: boolean;
}

/** What the public embed script is allowed to see. No org id, no counters. */
export interface PublicWidgetConfig {
  enabled: boolean;
  phoneNumber: string;
  position: string;
  color: string;
  greeting: string;
  prefilledText: string;
  showGreeting: boolean;
  brandName: string;
}
