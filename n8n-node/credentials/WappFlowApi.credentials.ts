import type {
  ICredentialType,
  INodeProperties,
} from "n8n-workflow";

export class WappFlowApi implements ICredentialType {
  name = "wappFlowApi";
  displayName = "WappFlow API";
  documentationUrl = "https://wappflow.com/docs/api";

  properties: INodeProperties[] = [
    {
      displayName: "API Key",
      name: "apiKey",
      type: "string",
      typeOptions: { password: true },
      default: "",
      required: true,
      placeholder: "wf_live_...",
      description: "API key from WappFlow Settings → Developer → API Keys",
    },
    {
      displayName: "Base URL",
      name: "baseUrl",
      type: "string",
      default: "https://app.wappflow.com",
      required: true,
      description: "WappFlow instance URL. Change only for self-hosted installations.",
    },
  ];

  authenticate = {
    type: "generic" as const,
    properties: {
      headers: {
        Authorization: '=Bearer {{$credentials.apiKey}}',
      },
    },
  };

  test = {
    request: {
      baseURL: "={{$credentials.baseUrl}}",
      url: "/api/v1/me",
    },
  };
}
