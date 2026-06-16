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
  CalendarCheck,
  Zap,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  id: string;
  label: string;
  icon: LucideIcon;
  keywords?: string[];
  /** Tabs only relevant to a specific business vertical — hidden for other verticals (unless navShowAllTabs is set). */
  vertical?: "ecommerce" | "appointment";
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
      { id: "ads", label: "Ads", icon: Target, keywords: ["advertising", "marketing"], vertical: "ecommerce" },
      { id: "launches", label: "Launches", icon: Rocket, keywords: ["flash sale", "countdown", "launch", "drop"], vertical: "ecommerce" },
    ],
  },
  {
    id: "automation",
    label: "Automation",
    items: [
      { id: "chatbot", label: "Chatbot", icon: Cpu, keywords: ["bot", "automation", "autoresponder"] },
      { id: "flows", label: "Flows", icon: Layers, keywords: ["builder", "nodes", "forms"] },
      { id: "recipes", label: "Automations", icon: Zap, keywords: ["automation", "workflow", "use cases", "prebuilt", "recipes"] },
    ],
  },
  {
    id: "commerce",
    label: "Commerce",
    items: [
      { id: "marketplace", label: "Marketplace", icon: ShoppingBag, keywords: ["products", "store", "catalog", "orders", "shop"], vertical: "ecommerce" },
      { id: "ndr", label: "NDR", icon: Truck, keywords: ["delivery", "failed", "rto", "non-delivery", "courier", "return"], vertical: "ecommerce" },
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
    id: "bookings",
    label: "Bookings",
    items: [
      { id: "bookingcustomers", label: "Customers", icon: CalendarCheck, keywords: ["slot booking", "appointment", "clients", "patients", "guests", "attendees", "directory"], vertical: "appointment" },
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

/** Tab IDs that are valid routing destinations but not shown in the sidebar. */
export const HIDDEN_VALID_TABS = ["ai-workspace"];

export function isValidTab(tab: string | null | undefined): boolean {
  return !!tab && (VALID_TAB_IDS.includes(tab) || HIDDEN_VALID_TABS.includes(tab));
}

export type BusinessVertical = "ECOMMERCE" | "APPOINTMENT" | "GENERAL";

/**
 * Filters NAV_GROUPS down to the tabs relevant to an org's business vertical,
 * dropping any group left with no items. ECOMMERCE/GENERAL hide
 * appointment-only tabs; APPOINTMENT/GENERAL hide ecommerce-only tabs.
 * showAll bypasses filtering entirely (org-level escape hatch).
 */
export function getVisibleNavGroups(
  businessVertical: BusinessVertical | string | null | undefined,
  showAll: boolean | null | undefined
): NavGroup[] {
  if (showAll) return NAV_GROUPS;

  // GENERAL (and unset) hides both specialty groups by default.
  const keepVertical: NavItem["vertical"] | null =
    businessVertical === "ECOMMERCE" ? "ecommerce" : businessVertical === "APPOINTMENT" ? "appointment" : null;

  return NAV_GROUPS.map((group) => ({
    ...group,
    items: group.items.filter((item) => !item.vertical || item.vertical === keepVertical),
  })).filter((group) => group.items.length > 0);
}
