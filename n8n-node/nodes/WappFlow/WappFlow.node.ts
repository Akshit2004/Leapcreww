import type {
  IExecuteFunctions,
  INodeExecutionData,
  INodeType,
  INodeTypeDescription,
  IDataObject,
} from "n8n-workflow";
import { NodeConnectionType, NodeOperationError } from "n8n-workflow";

export class WappFlow implements INodeType {
  description: INodeTypeDescription = {
    displayName: "WappFlow",
    name: "wappFlow",
    icon: "file:wappflow.svg",
    group: ["output"],
    version: 1,
    subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
    description: "Send WhatsApp messages and manage CRM contacts via WappFlow",
    defaults: { name: "WappFlow" },
    inputs: [NodeConnectionType.Main],
    outputs: [NodeConnectionType.Main],
    credentials: [{ name: "wappFlowApi", required: true }],
    properties: [
      // Resource selector
      {
        displayName: "Resource",
        name: "resource",
        type: "options",
        noDataExpression: true,
        options: [
          { name: "Message", value: "message" },
          { name: "Contact", value: "contact" },
        ],
        default: "message",
      },

      // Message operations
      {
        displayName: "Operation",
        name: "operation",
        type: "options",
        noDataExpression: true,
        displayOptions: { show: { resource: ["message"] } },
        options: [{ name: "Send", value: "send", description: "Send a WhatsApp message", action: "Send a message" }],
        default: "send",
      },
      {
        displayName: "To (Phone Number)",
        name: "to",
        type: "string",
        required: true,
        displayOptions: { show: { resource: ["message"], operation: ["send"] } },
        default: "",
        placeholder: "+919876543210",
        description: "Recipient phone number in E.164 format",
      },
      {
        displayName: "Message Type",
        name: "messageType",
        type: "options",
        displayOptions: { show: { resource: ["message"], operation: ["send"] } },
        options: [
          { name: "Text", value: "text" },
          { name: "Template", value: "template" },
        ],
        default: "text",
      },
      {
        displayName: "Text",
        name: "text",
        type: "string",
        typeOptions: { rows: 4 },
        displayOptions: { show: { resource: ["message"], operation: ["send"], messageType: ["text"] } },
        default: "",
        description: "Free-form text message (requires active 24h session)",
      },
      {
        displayName: "Template Name",
        name: "templateName",
        type: "string",
        displayOptions: { show: { resource: ["message"], operation: ["send"], messageType: ["template"] } },
        default: "",
        description: "Exact name of the approved WhatsApp template",
      },

      // Contact operations
      {
        displayName: "Operation",
        name: "operation",
        type: "options",
        noDataExpression: true,
        displayOptions: { show: { resource: ["contact"] } },
        options: [
          { name: "Upsert", value: "upsert", description: "Create or update a contact", action: "Create or update a contact" },
          { name: "Get Many", value: "getMany", description: "List contacts", action: "Get many contacts" },
          { name: "Tag", value: "tag", description: "Add tags to a contact", action: "Tag a contact" },
        ],
        default: "upsert",
      },
      {
        displayName: "Phone Number",
        name: "phone",
        type: "string",
        required: true,
        displayOptions: { show: { resource: ["contact"], operation: ["upsert", "tag"] } },
        default: "",
        placeholder: "+919876543210",
      },
      {
        displayName: "Name",
        name: "name",
        type: "string",
        displayOptions: { show: { resource: ["contact"], operation: ["upsert"] } },
        default: "",
      },
      {
        displayName: "Email",
        name: "email",
        type: "string",
        displayOptions: { show: { resource: ["contact"], operation: ["upsert"] } },
        default: "",
      },
      {
        displayName: "Tags",
        name: "tags",
        type: "string",
        displayOptions: { show: { resource: ["contact"], operation: ["upsert", "tag"] } },
        default: "",
        placeholder: "vip, newsletter",
        description: "Comma-separated list of tags to add",
      },
      {
        displayName: "Search",
        name: "search",
        type: "string",
        displayOptions: { show: { resource: ["contact"], operation: ["getMany"] } },
        default: "",
        description: "Filter by name or phone",
      },
      {
        displayName: "Limit",
        name: "limit",
        type: "number",
        typeOptions: { minValue: 1, maxValue: 200 },
        displayOptions: { show: { resource: ["contact"], operation: ["getMany"] } },
        default: 50,
      },
    ],
  };

  async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
    const items = this.getInputData();
    const returnData: IDataObject[] = [];
    const credentials = await this.getCredentials("wappFlowApi");
    const baseUrl = (credentials.baseUrl as string).replace(/\/$/, "");
    const apiUrl = `${baseUrl}/api/v1`;

    const request = async (method: string, path: string, body?: IDataObject) => {
      const response = await this.helpers.request({
        method,
        uri: `${apiUrl}${path}`,
        headers: { Authorization: `Bearer ${credentials.apiKey}` },
        body,
        json: true,
      });
      return response;
    };

    for (let i = 0; i < items.length; i++) {
      const resource = this.getNodeParameter("resource", i) as string;
      const operation = this.getNodeParameter("operation", i) as string;

      try {
        if (resource === "message" && operation === "send") {
          const to = this.getNodeParameter("to", i) as string;
          const messageType = this.getNodeParameter("messageType", i) as string;
          const body: IDataObject = { to };
          if (messageType === "text") {
            body.text = this.getNodeParameter("text", i) as string;
          } else {
            body.template = this.getNodeParameter("templateName", i) as string;
          }
          const result = await request("POST", "/messages", body);
          returnData.push(result as IDataObject);

        } else if (resource === "contact" && operation === "upsert") {
          const phone = this.getNodeParameter("phone", i) as string;
          const body: IDataObject = { phone };
          const name = this.getNodeParameter("name", i) as string;
          const email = this.getNodeParameter("email", i) as string;
          const tagsStr = this.getNodeParameter("tags", i) as string;
          if (name) body.name = name;
          if (email) body.email = email;
          if (tagsStr) body.tags = tagsStr.split(",").map((t) => t.trim()).filter(Boolean);
          const result = await request("POST", "/contacts", body);
          returnData.push(result as IDataObject);

        } else if (resource === "contact" && operation === "tag") {
          const phone = this.getNodeParameter("phone", i) as string;
          const tagsStr = this.getNodeParameter("tags", i) as string;
          const tags = tagsStr.split(",").map((t) => t.trim()).filter(Boolean);
          const result = await request("POST", "/contacts", { phone, tags });
          returnData.push(result as IDataObject);

        } else if (resource === "contact" && operation === "getMany") {
          const limit = this.getNodeParameter("limit", i) as number;
          const search = this.getNodeParameter("search", i) as string;
          const qs = new URLSearchParams({ limit: String(limit) });
          if (search) qs.set("search", search);
          const result = await request("GET", `/contacts?${qs}`);
          const contacts = (result as { contacts: IDataObject[] }).contacts ?? [];
          returnData.push(...contacts);
        }
      } catch (error) {
        if (this.continueOnFail()) {
          returnData.push({ error: (error as Error).message });
          continue;
        }
        throw new NodeOperationError(this.getNode(), error as Error, { itemIndex: i });
      }
    }

    return [this.helpers.returnJsonArray(returnData)];
  }
}
