"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  Sparkles,
  MessageSquare,
  Megaphone,
  ShoppingBag,
  Bot,
  Send,
  Loader,
  Lightbulb,
  ChevronRight,
  PanelRightClose,
  AlertCircle,
  Clock,
  TrendingUp,
  Users,
} from "lucide-react";
import { useApp, Contact, Campaign, Template } from "../../context/AppContext";

type CopilotAction = 
  | { type: "go_to_tab"; data: { tab?: string } }
  | { type: "create_campaign"; data: { name?: string; targetTag?: string; templateName?: string; delay?: number; scheduledAt?: string } }
  | { type: "send_message"; data: { contactName?: string; text?: string } }
  | { type: "add_tag"; data: { contactName?: string; tags?: string[] } };

interface Suggestion {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  priority: "high" | "medium" | "low";
  action?: CopilotAction;
}

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  suggestions?: Suggestion[];
  actionResult?: { success: boolean; message: string };
}

interface AICopilotSidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  orgId: string;
}

function generateSuggestions(
  contacts: Contact[],
  campaigns: Campaign[],
  templates: Template[],
  activeTab: string
): Suggestion[] {
  const suggestions: Suggestion[] = [];

  const unreadContacts = contacts.filter((c) => (c.unreadCount || 0) > 0);
  if (unreadContacts.length > 0 && activeTab !== "inbox") {
    const urgent = unreadContacts.filter((c) => {
      if (!c.lastMessageTime) return false;
      const [h, m] = c.lastMessageTime.split(":").map(Number);
      const msgTime = h * 60 + m;
      const now = new Date();
      const currentMin = now.getHours() * 60 + now.getMinutes();
      return currentMin - msgTime > 120;
    });
    if (urgent.length > 0) {
      suggestions.push({
        id: "urgent-unread",
        title: `${urgent.length} conversations need attention`,
        description: `Waiting over 2 hours for a reply`,
        icon: <AlertCircle className="w-4 h-4 text-red-500" />,
        priority: "high",
        action: { type: "go_to_tab", data: { tab: "inbox" } },
      });
    }
    suggestions.push({
      id: "unread",
      title: `${unreadContacts.length} unread message${unreadContacts.length > 1 ? "s" : ""}`,
      description: `Open inbox to view pending conversations`,
      icon: <MessageSquare className="w-4 h-4 text-emerald-600" />,
      priority: unreadContacts.length > 5 ? "high" : "medium",
      action: { type: "go_to_tab", data: { tab: "inbox" } },
    });
  }

  const pendingTemplates = templates.filter(
    (t) => t.metaStatus === "pending"
  );
  if (pendingTemplates.length > 0 && activeTab !== "templates") {
    suggestions.push({
      id: "pending-templates",
      title: `${pendingTemplates.length} template${pendingTemplates.length > 1 ? "s" : ""} pending approval`,
      description: `Waiting for Meta to review`,
      icon: <Clock className="w-4 h-4 text-teal-600" />,
      priority: "medium",
      action: { type: "go_to_tab", data: { tab: "templates" } },
    });
  }

  const activeCampaigns = campaigns.filter(
    (c) => c.status === "Active" || c.status === "Sending"
  );
  if (activeCampaigns.length > 0) {
    suggestions.push({
      id: "active-campaigns",
      title: `${activeCampaigns.length} campaign${activeCampaigns.length > 1 ? "s" : ""} running`,
      description: `Monitor delivery and engagement`,
      icon: <Megaphone className="w-4 h-4 text-blue-500" />,
      priority: "medium",
      action: { type: "go_to_tab", data: { tab: "campaigns" } },
    });
  }

  const completedCampaigns = campaigns.filter(
    (c) => c.status === "Completed"
  );
  for (const c of completedCampaigns) {
    if (c.sent > 0 && c.read / c.sent < 0.3) {
      suggestions.push({
        id: `low-read-${c.id}`,
        title: `"${c.name}" has low read rate`,
        description: `${Math.round((c.read / c.sent) * 100)}% read rate — consider optimizing`,
        icon: <TrendingUp className="w-4 h-4 text-purple-500" />,
        priority: "medium",
        action: { type: "go_to_tab", data: { tab: "campaigns" } },
      });
      break;
    }
  }

  if (contacts.length === 0) {
    suggestions.push({
      id: "no-contacts",
      title: "No contacts yet",
      description: "Import or add contacts to get started",
      icon: <Users className="w-4 h-4 text-stone-500" />,
      priority: "low",
      action: { type: "go_to_tab", data: { tab: "inbox" } },
    });
  }

  const hasAbandonedCart = contacts.some((c) =>
    c.tags?.includes("abandoned_cart")
  );
  if (hasAbandonedCart && activeTab !== "marketplace") {
    suggestions.push({
      id: "abandoned-carts",
      title: "Abandoned carts detected",
      description: "Follow up with customers who left items in cart",
      icon: <ShoppingBag className="w-4 h-4 text-pink-500" />,
      priority: "medium",
      action: { type: "go_to_tab", data: { tab: "marketplace" } },
    });
  }

  return suggestions.slice(0, 5);
}

export const AICopilotSidebar: React.FC<AICopilotSidebarProps> = ({
  activeTab,
  setActiveTab,
  orgId,
}) => {
  const {
    contacts,
    campaigns,
    templates,
    chatbotNodes,
    systemLogs,
    sendBroadcast,
    sendLiveChatMessage,
    updateContact,
  } = useApp();

  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [executingAction, setExecutingAction] = useState<string | null>(null);
  const [initialAnalysis, setInitialAnalysis] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const suggestions = generateSuggestions(contacts, campaigns, templates, activeTab);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  useEffect(() => {
    let mounted = true;
    if (isOpen && !initialAnalysis && contacts.length > 0) {
      const greetings = [
        {
          role: "assistant" as "user" | "assistant",
          content: "I'm analyzing your audience and latest campaign metrics...",
        },
      ];
      setTimeout(() => {
        if (!mounted) return;
        setMessages(greetings);
        setInitialAnalysis(true);
      }, 0);
    }
    return () => { mounted = false; };
  }, [isOpen, contacts, campaigns, messages, initialAnalysis]);

  const getContext = useCallback(() => {
    return {
      activeTab,
      contactsCount: contacts.length,
      unreadCount: contacts.reduce((acc, c) => acc + (c.unreadCount || 0), 0),
      contacts: contacts.map((c) => ({
        name: c.name,
        tags: c.tags,
        unreadCount: c.unreadCount,
        lastMessageTime: c.lastMessageTime,
      })),
      campaigns: campaigns.map((c) => ({
        name: c.name,
        status: c.status,
        sent: c.sent,
        delivered: c.delivered,
        read: c.read,
        clicked: c.clicked,
      })),
      templates: templates.map((t) => ({
        name: t.name,
        category: t.category,
        metaStatus: t.metaStatus,
        body: t.body,
      })),
      chatbotNodesCount: chatbotNodes.length,
      recentLogs: systemLogs.slice(0, 10).map((l) => ({
        type: l.type,
        message: l.message,
      })),
    };
  }, [activeTab, contacts, campaigns, templates, chatbotNodes, systemLogs]);

  const executeAction = async (action: CopilotAction): Promise<{ success: boolean; message: string }> => {
    switch (action.type) {
      case "go_to_tab": {
        const tab = action.data.tab;
        if (tab) {
          setActiveTab(tab);
          setIsOpen(false);
          return { success: true, message: `Navigated to ${tab}` };
        }
        return { success: false, message: "No tab specified" };
      }

      case "create_campaign": {
        const name = action.data.name || `Campaign ${new Date().toLocaleDateString()}`;
        const targetTag = action.data.targetTag || "all";
        const templateName = action.data.templateName;

        if (!templateName) {
          return { success: false, message: "No template name specified" };
        }

        const template = templates.find(
          (t) => t.name.toLowerCase() === templateName.toLowerCase()
        );
        if (!template) {
          return {
            success: false,
            message: `Template "${templateName}" not found. Available: ${templates.map((t) => t.name).join(", ") || "none"}`,
          };
        }

        const matchingContacts = targetTag === "all"
          ? contacts
          : contacts.filter((c) => c.tags?.includes(targetTag));

        if (matchingContacts.length === 0) {
          return {
            success: false,
            message: `No contacts found${targetTag !== "all" ? ` with tag "${targetTag}"` : ""}. Add contacts first, then retry.`,
          };
        }

        await sendBroadcast({
          name,
          targetTag,
          templateName: template.name,
          organizationId: orgId,
          delay: action.data.delay || 1,
          scheduledAt: action.data.scheduledAt || undefined,
        });

        return {
          success: true,
          message: `Campaign "${name}" launched — sending to ${matchingContacts.length} contact${matchingContacts.length !== 1 ? "s" : ""} using template "${template.name}"`,
        };
      }

      case "send_message": {
        const contactName = action.data.contactName;
        const text = action.data.text;

        if (!contactName || !text) {
          return { success: false, message: "Contact name and message text required" };
        }

        const contact = contacts.find(
          (c) => c.name.toLowerCase() === contactName.toLowerCase()
        );
        if (!contact) {
          return {
            success: false,
            message: `Contact "${contactName}" not found. Available: ${contacts.map((c) => c.name).join(", ") || "none"}`,
          };
        }

        sendLiveChatMessage(contact.id, text, "agent");
        return { success: true, message: `Message sent to ${contact.name}` };
      }

      case "add_tag": {
        const tagContactName = action.data.contactName;
        const tags = action.data.tags;

        if (!tagContactName || !tags || !Array.isArray(tags)) {
          return { success: false, message: "Contact name and tags array required" };
        }

        const tagContact = contacts.find(
          (c) => c.name.toLowerCase() === tagContactName.toLowerCase()
        );
        if (!tagContact) {
          return {
            success: false,
            message: `Contact "${tagContactName}" not found. Available: ${contacts.map((c) => c.name).join(", ") || "none"}`,
          };
        }

        const mergedTags = [...new Set([...(tagContact.tags || []), ...tags])];
        await updateContact(tagContact.id, { tags: mergedTags });
        return { success: true, message: `Tags ${tags.join(", ")} added to ${tagContact.name}` };
      }

      default:
        return { success: false, message: `Unknown action type: ${(action as { type: string }).type}` };
    }
  };

  const handleSend = async () => {
    const text = input.trim();
    if (!text || isLoading) return;

    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: text }]);
    setIsLoading(true);

    try {
      const res = await fetch("/api/ai/copilot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: text,
          context: getContext(),
        }),
      });

      if (!res.ok) throw new Error("API error");

      const data = await res.json();

      interface IncomingSuggestion {
        title: string;
        description: string;
        action?: CopilotAction;
      }

      const assistantSuggestions: Suggestion[] = (
        (data.suggestions || []) as IncomingSuggestion[]
      ).map((s, i: number) => ({
        id: `ai-sug-${Date.now()}-${i}`,
        title: s.title,
        description: s.description,
        icon: <Sparkles className="w-4 h-4 text-emerald-600" />,
        priority: "medium" as const,
        action: s.action,
      }));

      const msg: ChatMessage = {
        role: "assistant",
        content: data.reply,
        suggestions: assistantSuggestions,
      };

      setMessages((prev) => [...prev, msg]);

      if (data.action) {
        setExecutingAction(data.action.type);
        const result = await executeAction(data.action);
        setExecutingAction(null);

        const updatedContent = result.success
          ? `${data.reply}\n\n✅ ${result.message}`
          : `${data.reply}\n\n❌ ${result.message}`;

        setMessages((prev) => {
          const updated = [...prev];
          const last = updated[updated.length - 1];
          if (last.role === "assistant") {
            updated[updated.length - 1] = {
              ...last,
              content: updatedContent,
              actionResult: result,
            };
          }
          return updated;
        });
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Sorry, I hit a snag. Can you try again?",
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleActionClick = async (action: CopilotAction) => {
    setExecutingAction(action.type);
    const result = await executeAction(action);
    setExecutingAction(null);
    setMessages((prev) => [
      ...prev,
      {
        role: "assistant",
        content: result.success
          ? `✅ ${result.message}`
          : `❌ ${result.message}`,
        actionResult: result,
      },
    ]);
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-3 bg-emerald-600 text-white rounded-2xl shadow-xl shadow-emerald-600/30 hover:bg-emerald-500 transition-all duration-200 cursor-pointer group"
      >
        <Sparkles className="w-5 h-5" />
        <span className="text-sm font-semibold">AI Copilot</span>
        <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse ml-1" />
      </button>
    );
  }

  return (
    <>
      <div
        onClick={() => setIsOpen(false)}
        className="fixed inset-0 bg-black/20 z-40 cursor-pointer"
      />

      <aside className="fixed top-0 right-0 z-50 h-full w-[400px] max-w-[95vw] bg-white shadow-2xl border-l border-emerald-200 flex flex-col select-none animate-slide-in-left">
        <div className="shrink-0 bg-emerald-600 text-white px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-bold text-sm">AI Copilot</h2>
              <span className="text-[10px] text-emerald-200 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
                Online &middot; Can execute actions
              </span>
            </div>
          </div>
          <button
            onClick={() => setIsOpen(false)}
            className="p-1.5 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
          >
            <PanelRightClose className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar bg-slate-50">
          {messages.length === 1 && suggestions.length > 0 && (
            <div className="px-4 pt-4 pb-2">
              <div className="flex items-center gap-2 mb-3">
                <Lightbulb className="w-4 h-4 text-emerald-600" />
                <span className="text-xs font-semibold text-stone-600 uppercase tracking-wider">
                  Suggestions
                </span>
              </div>
              <div className="space-y-2">
                {suggestions.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => s.action && handleActionClick(s.action)}
                    className="w-full flex items-start gap-3 p-3 rounded-xl bg-white border border-emerald-100 hover:border-emerald-300 hover:shadow-md transition-all text-left cursor-pointer group"
                  >
                    <div className="mt-0.5 shrink-0">{s.icon}</div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-stone-800 group-hover:text-emerald-700">
                        {s.title}
                      </div>
                      <div className="text-xs text-stone-500 mt-0.5">
                        {s.description}
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-stone-400 group-hover:text-emerald-500 shrink-0 mt-0.5" />
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="px-4 py-4 space-y-4">
            {messages.map((msg, i) => (
              <div key={i}>
                <div
                  className={`flex gap-3 ${
                    msg.role === "user" ? "flex-row-reverse" : ""
                  }`}
                >
                  <div
                    className={`w-7 h-7 rounded-full shrink-0 flex items-center justify-center text-xs font-bold ${
                      msg.role === "user"
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-emerald-600 text-white"
                    }`}
                  >
                    {msg.role === "user" ? "U" : "AI"}
                  </div>
                  <div
                    className={`max-w-[85%] px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed whitespace-pre-line ${
                      msg.role === "user"
                        ? "bg-emerald-600 text-white rounded-tr-md"
                        : "bg-white border border-emerald-100 text-stone-700 rounded-tl-md shadow-sm"
                    }`}
                  >
                    {msg.content}
                  </div>
                </div>

                {msg.suggestions && msg.suggestions.length > 0 && (
                  <div className="mt-3 ml-10 space-y-1.5">
                    {msg.suggestions.map((s) => (
                      <button
                        key={s.id}
                        onClick={() => s.action && handleActionClick(s.action)}
                        disabled={executingAction !== null}
                        className="w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl bg-white border border-emerald-100 hover:border-emerald-300 hover:bg-emerald-50/20 transition-all text-left cursor-pointer group disabled:opacity-50"
                      >
                        <Sparkles className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                        <span className="text-xs text-stone-700 group-hover:text-emerald-700 flex-1">
                          {s.title}
                        </span>
                        <ChevronRight className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}

            {isLoading && (
              <div className="flex gap-3">
                <div className="w-7 h-7 rounded-full bg-emerald-600 flex items-center justify-center shrink-0">
                  <Bot className="w-3.5 h-3.5 text-white" />
                </div>
                <div className="bg-white border border-emerald-100 rounded-2xl rounded-tl-md px-4 py-3 shadow-sm">
                  <div className="flex items-center gap-2">
                    <Loader className="w-4 h-4 text-emerald-500 animate-spin" />
                    <span className="text-sm text-stone-500">
                      {executingAction ? `Executing: ${executingAction}...` : "Thinking..."}
                    </span>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        </div>

        <div className="shrink-0 border-t border-emerald-100 bg-white p-4">
          <div className="flex items-center gap-2">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask me to do something..."
              className="flex-1 px-4 py-2.5 bg-slate-50 border border-emerald-200 rounded-xl text-sm text-stone-800 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400 transition-all"
              disabled={isLoading}
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || isLoading}
              className="p-2.5 rounded-xl bg-emerald-600 text-white hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer shrink-0"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
          <div className="mt-2 flex items-center gap-3 text-[10px] text-stone-400">
            <span>I can create campaigns, send messages, add tags</span>
          </div>
        </div>
      </aside>
    </>
  );
};
