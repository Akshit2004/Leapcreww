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
  ShoppingBag,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  id: string;
  label: string;
  icon: LucideIcon;
  keywords?: string[];
}

export interface NavGroup {
  id: string;
  label: string;
  items: NavItem[];
}

export const NAV_GROUPS: NavGroup[] = [
  {
    id: "main",
    label: "Main",
    items: [
      { id: "overview", label: "Overview", icon: LayoutDashboard, keywords: ["home", "dashboard"] },
      { id: "inbox", label: "Inbox", icon: MessageSquare, keywords: ["chat", "messages", "conversations"] },
      { id: "customers", label: "Contacts", icon: Users, keywords: ["crm", "leads", "people"] },
    ],
  },
  {
    id: "marketing",
    label: "Marketing",
    items: [
      { id: "campaigns", label: "Campaigns", icon: Megaphone, keywords: ["broadcast", "blast"] },
      { id: "templates", label: "Templates", icon: FileText, keywords: ["meta", "messages"] },
      { id: "ads", label: "Ads", icon: Target, keywords: ["advertising", "marketing"] },
      { id: "launches", label: "Launches", icon: Rocket, keywords: ["flash sale", "countdown", "launch", "drop"] },
    ],
  },
  {
    id: "automation",
    label: "Automation",
    items: [
      { id: "chatbot", label: "Chatbot", icon: Cpu, keywords: ["bot", "automation", "autoresponder"] },
      { id: "flows", label: "Flows", icon: Layers, keywords: ["builder", "nodes", "forms"] },
    ],
  },
  {
    id: "commerce",
    label: "Commerce",
    items: [
      { id: "marketplace", label: "Marketplace", icon: ShoppingBag, keywords: ["products", "store", "catalog", "orders", "shop"] },
      { id: "ndr", label: "NDR", icon: Truck, keywords: ["delivery", "failed", "rto", "non-delivery", "courier", "return"] },
    ],
  },
  {
    id: "insights",
    label: "Insights",
    items: [
      { id: "analytics", label: "Analytics", icon: BarChart3, keywords: ["reports", "stats", "metrics", "roi"] },
    ],
  },
  {
    id: "platform",
    label: "Platform",
    items: [
      { id: "usecases", label: "Use Cases", icon: LayoutGrid, keywords: ["appointment", "booking", "slots", "agent"] },
      { id: "integrations", label: "Integrations", icon: Plug, keywords: ["shopify", "connect", "apps", "woocommerce"] },
    ],
  },
  {
    id: "settings",
    label: "Settings",
    items: [
      { id: "settings", label: "Settings", icon: Settings, keywords: ["preferences", "account", "whatsapp"] },
    ],
  },
];

export const NAV_ITEMS: NavItem[] = NAV_GROUPS.flatMap((g) => g.items);

export const VALID_TAB_IDS = NAV_ITEMS.map((i) => i.id);

export function isValidTab(tab: string | null | undefined): boolean {
  return !!tab && VALID_TAB_IDS.includes(tab);
}
