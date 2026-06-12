import {
  LayoutDashboard,
  MessageSquare,
  Megaphone,
  FileText,
  Cpu,
  LayoutGrid,
  Settings,
  BarChart3,
  Users,
  Plug,
  Target,
  Layers,
  Rocket,
  Truck,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  id: string;
  label: string;
  icon: LucideIcon;
  /** Search synonyms for the command palette. */
  keywords?: string[];
}

/**
 * Canonical tab registry. The sidebar, command palette, and URL `?tab=`
 * routing all derive from this list so tab IDs never drift apart.
 */
export const NAV_ITEMS: NavItem[] = [
  { id: "overview", label: "Overview", icon: LayoutDashboard, keywords: ["home", "dashboard"] },
  { id: "inbox", label: "Inbox", icon: MessageSquare, keywords: ["chat", "messages", "conversations"] },
  { id: "customers", label: "Contacts", icon: Users, keywords: ["crm", "leads", "people"] },
  { id: "campaigns", label: "Campaigns", icon: Megaphone, keywords: ["broadcast", "blast"] },
  { id: "templates", label: "Templates", icon: FileText, keywords: ["meta", "messages"] },
  { id: "chatbot", label: "Chatbot", icon: Cpu, keywords: ["bot", "automation", "autoresponder"] },
  { id: "flows", label: "Flows", icon: Layers, keywords: ["builder", "nodes"] },
  { id: "analytics", label: "Analytics", icon: BarChart3, keywords: ["reports", "stats", "metrics"] },
  { id: "ads", label: "Ads", icon: Target, keywords: ["advertising", "marketing"] },
  { id: "integrations", label: "Integrations", icon: Plug, keywords: ["shopify", "connect", "apps"] },
  { id: "ndr", label: "NDR", icon: Truck, keywords: ["delivery", "failed", "rto", "non-delivery", "courier", "return"] },
  { id: "usecases", label: "Use Cases", icon: LayoutGrid, keywords: ["marketplace", "products", "store", "catalog", "orders", "appointment", "booking", "slots", "agent", "bot"] },
  { id: "launches", label: "Launches", icon: Rocket, keywords: ["flash sale", "countdown", "launch", "drop", "sequence"] },
  { id: "settings", label: "Settings", icon: Settings, keywords: ["preferences", "account", "whatsapp"] },
];

export const VALID_TAB_IDS = NAV_ITEMS.map((i) => i.id);

export function isValidTab(tab: string | null | undefined): boolean {
  return !!tab && VALID_TAB_IDS.includes(tab);
}
