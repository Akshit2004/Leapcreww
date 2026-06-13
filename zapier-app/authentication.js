"use strict";

const BASE_URL = process.env.BASE_URL || "https://app.leapcreww.com";

/**
 * Custom API key authentication.
 *
 * The user pastes their LeapCreww API key (wf_live_...) into Zapier once.
 * The test call hits GET /api/v1/me; a 200 confirms the key is valid and
 * the org name is returned so Zapier can label the connected account.
 */
module.exports = {
  type: "custom",

  fields: [
    {
      key: "apiKey",
      label: "API Key",
      required: true,
      type: "string",
      helpText:
        "Your LeapCreww API key. Find it in **Settings → Developer → API Keys**. " +
        "Keys look like `wf_live_...`.",
    },
  ],

  test: {
    url: `${BASE_URL}/api/v1/me`,
    method: "GET",
    headers: { Authorization: "Bearer {{bundle.authData.apiKey}}" },
  },

  // Label shown in Zapier's connected accounts list — uses the org name
  // returned by the test endpoint.
  connectionLabel: "{{bundle.inputData.name}}",
};
