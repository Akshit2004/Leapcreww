"use client";

import React, { useState, useEffect, useRef } from "react";
import { useParams } from "next/navigation";
import {
  Search,
  Send,
  Check,
  CheckCheck,
  User,
  Phone,
  Mail,
  Tag,
  Plus,
  X,
  Bot,
  MessageSquareOff,
  ShoppingBag,
  ExternalLink,
  Laptop,
  ArrowLeft,
  Sparkles,
  Copy,
  Zap,
  StickyNote,
  UserCheck
} from "lucide-react";
import { useApp, Message } from "@/shared/context/AppContext";
import { notify } from "@/shared/lib/toast";
import { parseSystemEventString } from "@/shared/lib/parseSystemEventString";
import { useSession } from "next-auth/react";

export const InboxTab: React.FC = () => {
  const params = useParams();
  const orgId = params.orgId as string;
  const { data: session } = useSession();
  const {
    contacts,
    chatHistory,
    activeContactId,
    setActiveContactId,
    sendLiveChatMessage,
    updateContact,
    deleteContact,
    members,
    lockSync,
    unlockSync,
    refreshWorkspace,
    orders
  } = useApp();

  const [searchQuery, setSearchQuery] = useState("");
  const [inputText, setInputText] = useState("");
  const [newTagInput, setNewTagInput] = useState("");
  const [showMobileProfile, setShowMobileProfile] = useState(false);
  const [showSimulate, setShowSimulate] = useState(false);
  const [simMessage, setSimMessage] = useState("");
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [replySuggestions, setReplySuggestions] = useState<string[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);

  // ─── Team inbox additions (P1-6) ───────────────────────────────────
  type InboxFilter = "all" | "mine" | "unassigned" | "bot";
  interface CannedReplyItem { id: string; shortcut: string; title: string; body: string }
  interface InternalNoteItem { id: string; body: string; authorName: string; createdAt: string }

  const [inboxFilter, setInboxFilter] = useState<InboxFilter>("all");
  const [cannedReplies, setCannedReplies] = useState<CannedReplyItem[]>([]);
  const [showCannedPicker, setShowCannedPicker] = useState(false);
  const [noteMode, setNoteMode] = useState(false);
  const [contactNotes, setContactNotes] = useState<Record<string, InternalNoteItem[]>>({});

  const fetchReplySuggestions = React.useCallback(async () => {
    if (!activeContactId || !orgId) return;
    setLoadingSuggestions(true);
    try {
      const res = await fetch(`/api/ai/reply-suggestions?contactId=${activeContactId}&orgId=${orgId}`);
      if (res.ok) {
        const data = await res.json();
        setReplySuggestions(data.suggestions || []);
      }
    } catch (err) {
      console.error("Suggestions error:", err);
    } finally {
      setLoadingSuggestions(false);
    }
  }, [activeContactId, orgId]);

  useEffect(() => {
    if (activeContactId) {
      fetchReplySuggestions();
    } else {
      setReplySuggestions([]);
    }
  }, [activeContactId, fetchReplySuggestions]);

  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => refreshWorkspace(orgId), 5000);
    return () => clearInterval(interval);
  }, [autoRefresh, orgId, refreshWorkspace]);

  // Fetch canned replies once per org
  useEffect(() => {
    if (!orgId) return;
    fetch(`/api/org/${orgId}/canned-replies`)
      .then((r) => r.ok ? r.json() : null)
      .then((d) => d?.cannedReplies && setCannedReplies(d.cannedReplies))
      .catch(() => {/* ignore — non-critical */});
  }, [orgId]);

  // Fetch internal notes for the active contact
  const fetchNotes = React.useCallback(async (contactId: string) => {
    if (!orgId) return;
    try {
      const res = await fetch(`/api/org/${orgId}/contacts/${contactId}/notes`);
      if (res.ok) {
        const data = await res.json();
        setContactNotes((prev) => ({ ...prev, [contactId]: data.notes || [] }));
      }
    } catch {/* ignore */}
  }, [orgId]);

  useEffect(() => {
    if (activeContactId) fetchNotes(activeContactId);
  }, [activeContactId, fetchNotes]);

  // Auto-open canned picker when input starts with "/"
  useEffect(() => {
    if (inputText.startsWith("/")) {
      setShowCannedPicker(true);
    } else {
      setShowCannedPicker(false);
    }
  }, [inputText]);

  const chatEndRef = useRef<HTMLDivElement>(null);

  // Active contact details
  const activeContact = contacts.find((c) => c.id === activeContactId) || null;
  const activeChat = activeContactId ? chatHistory[activeContactId] || [] : [];

  // Filter contacts
  const agentName = session?.user?.name || "";
  const filteredContacts = contacts.filter((c) => {
    const matchesSearch =
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.phone.includes(searchQuery) ||
      c.tags.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase()));
    if (!matchesSearch) return false;
    if (inboxFilter === "mine") return c.assignedAgent === agentName;
    if (inboxFilter === "unassigned") return c.assignedAgent === "None";
    if (inboxFilter === "bot") return c.assignedAgent === "Bot";
    return true;
  });

  const filteredCannedReplies = cannedReplies.filter((r) => {
    const q = inputText.startsWith("/") ? inputText.slice(1).toLowerCase() : "";
    return !q || r.shortcut.startsWith(q) || r.title.toLowerCase().includes(q);
  });

  // Scroll to bottom on new message
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });

    // Mark as read when active contact is loaded
    if (activeContactId && activeContact && (activeContact.unreadCount || 0) > 0) {
      updateContact(activeContactId, { unreadCount: 0 });
    }
  }, [activeChat.length, activeContactId, activeContact, updateContact]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (noteMode) { await handleSubmitNote(); return; }
    if (!inputText.trim() || !activeContactId || !orgId) return;

    const text = inputText.trim();
    const contact = contacts.find(c => c.id === activeContactId);

    if (!contact) return;

    lockSync();

    // Send live chat message locally for instant snappy UI response
    sendLiveChatMessage(activeContactId, text, "agent");
    setInputText("");

    if (contact.assignedAgent === "Bot") {
      const agentName = session?.user?.name || "Agent";
      updateContact(activeContactId, { assignedAgent: agentName });
    }

    try {
      const phone = contact.phone.replace(/[^0-9]/g, "");
      await fetch("/api/whatsapp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: phone,
          text,
          contactId: activeContactId,
          orgId: orgId
        }),
      });
      setTimeout(() => fetchReplySuggestions(), 800);
    } catch (err) {
      console.error("Failed to sync live chat message with backend:", err);
    } finally {
      unlockSync();
    }
  };

  const handleSubmitNote = async () => {
    if (!inputText.trim() || !activeContactId || !orgId) return;
    const noteBody = inputText.trim();
    setInputText("");
    setNoteMode(false);
    const author = session?.user?.name || "Agent";
    try {
      const res = await fetch(`/api/org/${orgId}/contacts/${activeContactId}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: noteBody }),
      });
      if (res.ok) {
        const { note } = await res.json();
        setContactNotes((prev) => ({
          ...prev,
          [activeContactId]: [...(prev[activeContactId] || []), { ...note, createdAt: note.createdAt || new Date().toISOString() }],
        }));
      }
    } catch {
      // optimistic fallback
      const optimistic: InternalNoteItem = {
        id: `note-${Date.now()}`,
        body: noteBody,
        authorName: author,
        createdAt: new Date().toISOString(),
      };
      setContactNotes((prev) => ({
        ...prev,
        [activeContactId]: [...(prev[activeContactId] || []), optimistic],
      }));
    }
  };

  const handleAddTag = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTagInput.trim() || !activeContact) return;

    const trimmed = newTagInput.trim();
    if (activeContact.tags.includes(trimmed)) return;

    const updatedTags = [...activeContact.tags, trimmed];
    updateContact(activeContact.id, { tags: updatedTags });
    setNewTagInput("");
  };

  const handleRemoveTag = (tagToRemove: string) => {
    if (!activeContact) return;
    const updatedTags = activeContact.tags.filter(t => t !== tagToRemove);
    updateContact(activeContact.id, { tags: updatedTags });
  };

  const handleAgentChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    if (!activeContact) return;
    updateContact(activeContact.id, { assignedAgent: e.target.value });
  };

  const closeMobileProfile = () => {
    setShowMobileProfile(false);
  };

  const openMobileProfile = () => {
    setShowMobileProfile(true);
  };

  // Simulate inbound message handler
  const handleSimulateInbound = async () => {
    if (!simMessage.trim() || !activeContact) return;
    const text = simMessage.trim();
    setSimMessage("");
    setShowSimulate(false);

    lockSync();
    sendLiveChatMessage(activeContact.id, text, "user");

    try {
      await fetch("/api/webhooks/whatsapp/process", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          from: activeContact.phone,
          text,
          msgId: `sim-${Date.now()}`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        })
      });
      setTimeout(() => {
        refreshWorkspace(orgId);
        fetchReplySuggestions();
      }, 800);
    } catch (err) {
      console.error(err);
    } finally {
      unlockSync();
    }
  };

  // Render ticks
  const renderMessageStatus = (status: Message["status"]) => {
    if (!status) return null;
    if (status === "sent") {
      return <Check className="w-3.5 h-3.5 text-stone-500" />;
    }
    if (status === "delivered") {
      return <CheckCheck className="w-3.5 h-3.5 text-stone-600" />;
    }
    if (status === "read") {
      return <CheckCheck className="w-3.5 h-3.5 text-wa-green" />;
    }
    return null;
  };

  // Hash-based avatar background color
  const avatarBg = (name: string) => {
    const palette = ["bg-violet-500","bg-blue-500","bg-teal-500","bg-amber-500","bg-red-500","bg-pink-500","bg-indigo-500","bg-emerald-600"];
    let h = 0;
    for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
    return palette[Math.abs(h) % palette.length];
  };

  // ─── Determine which mobile pane to show ────────────────────────
  // On mobile (<1024px): show contact list OR chat, never both
  // On desktop (>=1024px): show all three columns
  const mobileShowChat = !!activeContactId;

  return (
    <div className="flex-1 flex h-full overflow-hidden animate-slide-up relative bg-stone-100">
      <style>{`
        @media (max-width: 1023px) {
          .inbox-contact-list-pane[data-mobile-hidden="true"] { display: none !important; }
          .inbox-chat-pane[data-mobile-hidden="true"] { display: none !important; }
          .inbox-profile-drawer {
            transform: translateX(100%);
            transition: transform 0.3s ease-in-out;
          }
          .inbox-profile-drawer[data-mobile-open="true"] {
            transform: translateX(0);
          }
        }
      `}</style>

      {/* ═══════════════════════════════════════════════════════════════
          COLUMN 1 — Contact List
          Desktop: always visible (w-80)
          Mobile: visible only when NO contact is selected
       ═══════════════════════════════════════════════════════════════ */}
      <div
        className="w-full lg:w-72 border-r border-stone-200 flex flex-col h-full bg-[#fafaf9] shrink-0 inbox-contact-list-pane"
        data-mobile-hidden={mobileShowChat ? "true" : "false"}
        style={{ display: mobileShowChat ? undefined : "flex" }}
      >
        {/* ── Header ── */}
        <div className="px-4 pt-4 pb-3 shrink-0 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-black text-stone-900 tracking-tight">Inbox</h3>
              <p className="text-[10px] text-stone-400 font-medium mt-0.5">{filteredContacts.length} conversation{filteredContacts.length !== 1 ? "s" : ""}</p>
            </div>
            <button
              onClick={() => setAutoRefresh((p) => !p)}
              className={`inline-flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-1.5 rounded-lg border transition-all cursor-pointer ${
                autoRefresh
                  ? "bg-wa-green/10 text-wa-green border-wa-green/30"
                  : "bg-white text-stone-400 border-stone-200 hover:border-stone-300"
              }`}
              title={autoRefresh ? "Auto-refresh on" : "Auto-refresh off"}
            >
              <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${autoRefresh ? "bg-wa-green animate-pulse" : "bg-stone-300"}`} />
              {autoRefresh ? "Live" : "Paused"}
            </button>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Search by name, phone or tag…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white border border-stone-200 rounded-xl pl-8 pr-3 py-2 text-xs focus:outline-none focus:border-wa-green transition-colors shadow-sm placeholder:text-stone-400"
            />
          </div>

          {/* Filter pills */}
          <div className="flex items-center gap-1 bg-stone-200/60 rounded-xl p-1">
            {(["all", "mine", "unassigned", "bot"] as const).map((f) => {
              const labels = { all: "All", mine: "Mine", unassigned: "Open", bot: "Bot" };
              const counts: Record<string, number> = {
                all: contacts.length,
                mine: contacts.filter(c => c.assignedAgent === agentName).length,
                unassigned: contacts.filter(c => c.assignedAgent === "None").length,
                bot: contacts.filter(c => c.assignedAgent === "Bot").length,
              };
              return (
                <button
                  key={f}
                  onClick={() => setInboxFilter(f)}
                  className={`flex-1 py-1.5 text-[10px] font-bold rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1 ${
                    inboxFilter === f
                      ? "bg-white text-stone-900 shadow-sm"
                      : "text-stone-500 hover:text-stone-700"
                  }`}
                >
                  {labels[f]}
                  {counts[f] > 0 && (
                    <span className={`text-[9px] font-black px-1 rounded-full leading-tight ${
                      inboxFilter === f ? "text-wa-green" : "text-stone-400"
                    }`}>
                      {counts[f]}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Contact List ── */}
        <div className="flex-1 overflow-y-auto custom-scrollbar px-2 pb-2 space-y-0.5">
          {filteredContacts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-4 text-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-stone-100 flex items-center justify-center">
                <Search className="w-5 h-5 text-stone-300" />
              </div>
              <p className="text-xs text-stone-400 font-medium">No conversations match your filter</p>
            </div>
          ) : (
            filteredContacts.map((c) => {
              const isSelected = c.id === activeContactId;
              const hasUnread = (c.unreadCount || 0) > 0 && !isSelected;
              const initials = c.name.split(" ").map(n => n[0]).filter(Boolean).slice(0, 2).join("").toUpperCase();

              return (
                <button
                  key={c.id}
                  onClick={() => setActiveContactId(c.id)}
                  className={`w-full px-3 py-3 flex items-center gap-3 rounded-xl transition-all duration-150 text-left relative group ${
                    isSelected
                      ? "bg-white shadow-sm border border-stone-200"
                      : "hover:bg-white/70 border border-transparent"
                  }`}
                >
                  {/* Avatar */}
                  <div className="relative shrink-0">
                    <div className={`w-10 h-10 flex items-center justify-center font-black text-xs rounded-2xl text-white ring-2 transition-all ${
                      isSelected ? "bg-wa-green ring-wa-green/20" : `${avatarBg(c.name)} ring-transparent`
                    }`}>
                      {initials}
                    </div>
                    <span className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 border-2 border-[#fafaf9] rounded-full ${
                      c.status === "Active" ? "bg-emerald-500" : "bg-stone-300"
                    }`} />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-0.5">
                      <h4 className={`text-xs font-bold truncate ${isSelected ? "text-wa-green" : "text-stone-900"}`}>
                        {c.name}
                      </h4>
                      <span className="text-[10px] text-stone-400 shrink-0 tabular-nums">{c.lastMessageTime}</span>
                    </div>
                    <p className="text-[11px] text-stone-500 truncate leading-normal">
                      {c.lastMessage || <span className="italic text-stone-300">No messages yet</span>}
                    </p>
                    {/* Source + tag chips — only show if assigned agent is notable */}
                    {c.assignedAgent && c.assignedAgent !== "None" && (
                      <div className="flex items-center gap-1 mt-1.5">
                        <span className={`inline-flex items-center text-[9px] font-bold px-1.5 py-0.5 rounded-full border ${
                          c.assignedAgent === "Bot"
                            ? "bg-violet-50 text-violet-600 border-violet-200"
                            : "bg-stone-100 text-stone-500 border-stone-200"
                        }`}>
                          {c.assignedAgent === "Bot" ? "🤖 Bot" : `👤 ${c.assignedAgent}`}
                        </span>
                        {c.tags.slice(0, 1).map((t, idx) => (
                          <span key={idx} className="inline-flex items-center text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-wa-green/10 text-wa-green border border-wa-green/20 truncate max-w-[64px]">
                            {t}
                          </span>
                        ))}
                        {c.tags.length > 1 && (
                          <span className="text-[9px] text-stone-400">+{c.tags.length - 1}</span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Unread badge */}
                  {hasUnread && (
                    <span className="w-5 h-5 rounded-full bg-wa-green text-white text-[9px] font-black flex items-center justify-center shrink-0">
                      {c.unreadCount}
                    </span>
                  )}
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════
          COLUMN 2 — Chat Stream
          Desktop: always visible (flex-1)
          Mobile: visible only when a contact IS selected
       ═══════════════════════════════════════════════════════════════ */}
      <div
        className="flex-1 flex flex-col h-full relative overflow-hidden inbox-chat-pane"
        data-mobile-hidden={!mobileShowChat ? "true" : "false"}
      >
        {activeContact ? (
          <>
            {/* ─── Chat Header ─── */}
            <div className="h-14 lg:h-16 px-3 lg:px-6 bg-white border-b border-stone-200 flex items-center justify-between shrink-0 relative z-10 select-none">
              <div className="flex items-center gap-2.5 min-w-0">
                {/* Back button — mobile only */}
                <button
                  type="button"
                  onClick={() => setActiveContactId("")}
                  className="lg:hidden w-9 h-9 flex items-center justify-center rounded-full hover:bg-stone-100 text-stone-700 cursor-pointer shrink-0 transition-colors active:scale-95"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>

                <div className={`w-9 h-9 text-white flex items-center justify-center font-bold text-xs shrink-0 uppercase rounded-full ${avatarBg(activeContact.name)}`}>
                  {activeContact.name.split(" ").map(n => n[0]).join("")}
                </div>
                <div className="min-w-0">
                  <h4 className="text-xs font-bold text-stone-900 leading-none truncate">{activeContact.name}</h4>
                  <span className="text-[10px] text-stone-400 font-medium flex items-center gap-1 mt-0.5 truncate">
                    <span className="truncate">{activeContact.phone}</span>
                    <span>·</span>
                    <span className="truncate text-stone-500">{activeContact.source}</span>
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                {/* Simulate button — dev-only sandbox utility */}
                {process.env.NODE_ENV !== "production" && (
                  <button
                    type="button"
                    onClick={() => setShowSimulate(!showSimulate)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-bold border border-stone-200 bg-white hover:bg-stone-50 text-stone-600 rounded-lg transition-all cursor-pointer select-none shrink-0"
                    title="Simulate Inbound Customer Message"
                  >
                    <Bot className="w-3.5 h-3.5" />
                    <span className="max-sm:hidden">Simulate</span>
                  </button>
                )}

                {/* Agent badge — desktop */}
                <span className="max-sm:hidden inline-flex items-center gap-1 px-2 py-1 text-[10px] font-bold bg-stone-100 text-stone-600 border border-stone-200 rounded-lg shrink-0">
                  <Laptop className="w-3 h-3" />
                  Agent: <strong className="text-stone-800">{activeContact.assignedAgent}</strong>
                </span>

                {/* Assign to me quick-action */}
                {activeContact.assignedAgent !== agentName && (
                  <button
                    type="button"
                    onClick={() => updateContact(activeContact.id, { assignedAgent: agentName })}
                    className="max-sm:hidden inline-flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-bold border border-stone-200 bg-white hover:bg-stone-50 text-stone-600 rounded-lg transition-all cursor-pointer shrink-0"
                    title="Assign this conversation to yourself"
                  >
                    <UserCheck className="w-3.5 h-3.5" />
                    <span>Claim</span>
                  </button>
                )}

                {/* Profile panel toggle — mobile only (desktop panel is always visible) */}
                <button
                  type="button"
                  onClick={openMobileProfile}
                  className="lg:hidden w-9 h-9 flex items-center justify-center rounded-full hover:bg-stone-100 text-stone-700 cursor-pointer shrink-0 transition-colors active:scale-95"
                  title="View Customer Profile"
                >
                  <User className="w-[18px] h-[18px]" />
                </button>
              </div>
            </div>

            {/* ─── Inbound Customer Simulator Banner ─── */}
            {showSimulate && (
              <div className="bg-stone-50 border-b border-stone-200 px-4 lg:px-6 py-3 flex items-center justify-between gap-3 z-20 relative select-none animate-slide-up">
                <div className="flex items-center gap-2 text-[10px] font-bold text-stone-900 shrink-0 uppercase tracking-wider max-sm:hidden">
                  <Bot className="w-4 h-4" />
                  <span>Simulate from {activeContact.name}:</span>
                </div>
                <div className="flex items-center gap-2 flex-1">
                  <input
                    type="text"
                    placeholder="Type simulated customer response..."
                    value={simMessage}
                    onChange={(e) => setSimMessage(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleSimulateInbound();
                    }}
                    className="flex-1 bg-white border border-stone-200 rounded-lg px-3 py-2 text-xs font-medium focus:outline-none focus:border-stone-900"
                  />
                  <button
                    type="button"
                    onClick={handleSimulateInbound}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-bold bg-stone-900 hover:bg-stone-800 text-white rounded-lg transition-all cursor-pointer shrink-0"
                  >
                    Send
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowSimulate(false)}
                    className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-stone-200 text-stone-500 cursor-pointer shrink-0 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* ─── Live Message History ─── */}
            <div className="flex-1 overflow-y-auto px-4 lg:px-6 py-4 space-y-3 custom-scrollbar relative bg-[#f0ece4]">
              {activeChat.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center text-xs text-stone-500 gap-2.5">
                  <Bot className="w-8 h-8 text-stone-300" />
                  <p className="max-w-xs leading-relaxed font-medium">No messages yet. Send a message to start the conversation.</p>
                </div>
              ) : (
                activeChat.map((msg) => {
                  if (msg.sender === "system") {
                    return (
                      <div key={msg.id} className="flex justify-center my-3 animate-slide-up select-none">
                        <div className="bg-stone-100 text-[10px] font-medium text-stone-500 px-3.5 py-1.5 rounded-full max-w-[85%] text-center border border-stone-200">
                          {parseSystemEventString(msg.text) || msg.text}
                        </div>
                      </div>
                    );
                  }

                  const isAgent = msg.sender === "agent";

                  return (
                    <div
                      key={msg.id}
                      className={`flex ${isAgent ? "justify-end" : "justify-start"} animate-slide-up`}
                    >
                      <div className={`max-w-[75%] px-4 py-3 text-[13px] leading-relaxed relative ${
                        isAgent
                          ? "bg-[#dcf8c6] text-stone-900 border border-[#b7e5a0] rounded-2xl rounded-br-sm shadow-sm"
                          : "bg-white text-stone-900 border border-stone-200 rounded-2xl rounded-bl-sm shadow-sm"
                      }`}>
                        {/* Text */}
                        <p className="whitespace-pre-line select-text">{parseSystemEventString(msg.text) || msg.text}</p>

                        {/* Interactive Buttons (e.g. CTA Quick Replies) */}
                        {msg.buttons && msg.buttons.length > 0 && (
                          <div className="mt-3 border-t border-stone-200/30 pt-2.5 space-y-1.5 select-none">
                            {msg.buttons.map((btn, bIdx) => (
                              <button
                                key={bIdx}
                                onClick={() => {
                                  sendLiveChatMessage(
                                    activeContact.id,
                                    `Clicked action button: "${btn}"`,
                                    "system"
                                  );
                                  setTimeout(() => {
                                    sendLiveChatMessage(
                                      activeContact.id,
                                      `Simulated choice response regarding: ${btn}`,
                                      "user"
                                    );
                                  }, 1500);
                                }}
                                className="w-full flex items-center justify-center gap-1.5 py-2 px-4 rounded-xl bg-white/10 border border-stone-200/30 hover:bg-white/20 text-current font-semibold transition-all text-[10px] uppercase tracking-wider cursor-pointer"
                              >
                                <span>{btn}</span>
                                <ExternalLink className="w-3 h-3 opacity-50" />
                              </button>
                            ))}
                          </div>
                        )}

                        {/* Footer */}
                        <div className="flex items-center justify-end gap-1 mt-2 text-[9px] opacity-60 font-medium select-none">
                          <span>{msg.timestamp}</span>
                          {isAgent && renderMessageStatus(msg.status)}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
              {/* ─── Internal Notes ─── */}
              {(contactNotes[activeContactId ?? ""] || []).length > 0 && (
                <>
                  <div className="flex items-center gap-3 my-3 select-none">
                    <div className="flex-1 border-t border-amber-200" />
                    <span className="text-[9px] font-bold text-amber-600 uppercase tracking-widest flex items-center gap-1">
                      <StickyNote className="w-3 h-3" />
                      Internal Notes
                    </span>
                    <div className="flex-1 border-t border-amber-200" />
                  </div>
                  {(contactNotes[activeContactId ?? ""] || []).map((note: InternalNoteItem) => (
                    <div key={note.id} className="flex justify-start animate-slide-up">
                      <div className="max-w-[78%] px-4 py-3 bg-amber-50 border border-amber-200 rounded-2xl rounded-bl-sm">
                        <div className="flex items-center gap-1.5 mb-1.5 select-none">
                          <StickyNote className="w-3 h-3 text-amber-500 shrink-0" />
                          <span className="text-[9px] font-bold text-amber-700 uppercase tracking-wider">{note.authorName}</span>
                          <span className="text-[9px] text-amber-400">· Only visible to your team</span>
                        </div>
                        <p className="text-[13px] leading-relaxed whitespace-pre-line select-text text-stone-800">{note.body}</p>
                      </div>
                    </div>
                  ))}
                </>
              )}

              <div ref={chatEndRef} />
            </div>

            {/* AI Reply Suggestions Bar — only shown when loading or suggestions exist */}
            {(loadingSuggestions || replySuggestions.length > 0) && (
              <div className="px-4 py-2 bg-stone-50 border-t border-stone-200 flex items-center gap-3 shrink-0 relative z-10 overflow-x-auto custom-scrollbar select-none">
                <span className="text-[10px] font-bold text-stone-500 uppercase tracking-widest flex items-center gap-1 shrink-0">
                  <Sparkles className="w-3 h-3 text-emerald-600 animate-pulse" />
                  AI Assist:
                </span>
                {loadingSuggestions ? (
                  <div className="flex gap-1.5 items-center">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-bounce" style={{ animationDelay: "0ms" }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-bounce" style={{ animationDelay: "150ms" }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-bounce" style={{ animationDelay: "300ms" }} />
                    <span className="text-[10px] text-stone-400 font-semibold uppercase tracking-wider">Drafting Suggestions...</span>
                  </div>
                ) : (
                  replySuggestions.map((sug, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setInputText(sug)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-bold border border-stone-200 bg-white hover:bg-stone-50 text-stone-700 rounded-lg transition-all cursor-pointer shrink-0 whitespace-nowrap active:scale-95"
                    >
                      {sug}
                    </button>
                  ))
                )}
              </div>
            )}

            {/* ─── Canned Replies Picker ─── */}
            {showCannedPicker && (
              <div className="bg-white border-t border-stone-200 px-4 py-2 shrink-0 animate-slide-up z-10 relative max-h-52 overflow-y-auto custom-scrollbar select-none">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[9px] font-bold text-stone-400 uppercase tracking-widest flex items-center gap-1">
                    <Zap className="w-3 h-3 text-amber-500" />
                    Canned Replies
                  </span>
                  <button
                    type="button"
                    onClick={() => { setShowCannedPicker(false); setInputText(""); }}
                    className="w-5 h-5 flex items-center justify-center rounded-full hover:bg-stone-100 cursor-pointer transition-colors"
                  >
                    <X className="w-3 h-3 text-stone-400" />
                  </button>
                </div>
                {filteredCannedReplies.length === 0 ? (
                  <p className="text-xs text-stone-400 py-2">No matching canned replies. Type a shortcut like <span className="font-mono">/thanks</span>.</p>
                ) : (
                  <div className="space-y-1">
                    {filteredCannedReplies.map((r) => (
                      <button
                        key={r.id}
                        type="button"
                        onClick={() => { setInputText(r.body); setShowCannedPicker(false); }}
                        className="w-full flex items-center gap-3 px-3 py-2.5 bg-stone-50 hover:bg-stone-100 border border-stone-100 rounded-xl text-left transition-all cursor-pointer group"
                      >
                        <span className="text-[10px] font-mono font-bold text-amber-600 bg-amber-50 border border-amber-100 px-2 py-0.5 rounded shrink-0">/{r.shortcut}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-stone-800 truncate">{r.title}</p>
                          <p className="text-[10px] text-stone-400 truncate mt-0.5">{r.body}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ─── Input Bar ─── */}
            <form onSubmit={handleSendMessage}
              className={`px-4 py-3 border-t flex items-end gap-2 shrink-0 relative z-10 transition-colors ${
                noteMode ? "bg-amber-50 border-amber-200" : "bg-white border-stone-200"
              }`}>
              <button type="button" onClick={() => setShowCannedPicker(p => !p)}
                className="w-8 h-8 rounded-xl flex items-center justify-center hover:bg-stone-100 text-stone-400 hover:text-amber-600 cursor-pointer transition-colors shrink-0 mb-1"
                title="Canned replies">
                <Zap className="w-4 h-4" />
              </button>
              <div className="flex-1 relative">
                <textarea
                  rows={1}
                  placeholder={noteMode ? "Write internal note…" : "Type a message…"}
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSendMessage(e as unknown as React.FormEvent); } }}
                  className={`w-full border rounded-2xl py-2.5 px-4 text-sm font-medium focus:outline-none transition-all placeholder:text-stone-400 resize-none max-h-32 overflow-y-auto ${
                    noteMode ? "bg-amber-50 border-amber-300 focus:border-amber-500 text-amber-900" : "bg-stone-50 border-stone-200 focus:border-stone-400"
                  }`}
                />
              </div>
              <button type="button" onClick={() => setNoteMode(p => !p)}
                className={`w-8 h-8 rounded-xl flex items-center justify-center cursor-pointer transition-colors shrink-0 mb-1 ${
                  noteMode ? "bg-amber-500 text-white" : "hover:bg-stone-100 text-stone-400 hover:text-amber-600"
                }`}
                title="Toggle note mode">
                <StickyNote className="w-4 h-4" />
              </button>
              <button type="submit" disabled={!inputText.trim()}
                className={`w-9 h-9 rounded-full flex items-center justify-center disabled:opacity-30 transition-all cursor-pointer shrink-0 mb-0.5 shadow-sm ${
                  noteMode ? "bg-amber-500 hover:bg-amber-600 text-white" : "bg-wa-green hover:bg-wa-green-dark text-white"
                }`}>
                <Send className="w-4 h-4" />
              </button>
            </form>
          </>
        ) : (
          /* ─── Empty State ─── */
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8 space-y-4 select-none">
            <div className="w-16 h-16 bg-stone-100 rounded-2xl flex items-center justify-center text-stone-300">
              <MessageSquareOff className="w-7 h-7" />
            </div>
            <div>
              <h4 className="font-black text-stone-900 text-sm">No Conversation Selected</h4>
              <p className="text-stone-500 text-xs mt-1.5 max-w-[280px] leading-relaxed">Select a contact from the list to view their conversation.</p>
            </div>
          </div>
        )}
      </div>

      {/* ═══════════════════════════════════════════════════════════════
          COLUMN 3 — CRM Profile Panel
          ALWAYS a fixed overlay drawer (slide from right), all screen sizes.
          Triggered via showMobileProfile state on the profile button in chat header.
       ═══════════════════════════════════════════════════════════════ */}
      {activeContact && (
        <>
          {/* Backdrop overlay — mobile only */}
          {showMobileProfile && (
            <div
              className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[60] animate-fade-in lg:hidden"
              onClick={closeMobileProfile}
              role="button"
              tabIndex={0}
              aria-label="Close profile panel"
            />
          )}

          {/* Profile drawer — fixed overlay on all screen sizes */}
          <div
            data-mobile-open={showMobileProfile ? "true" : "false"}
            className="max-lg:fixed max-lg:inset-y-0 max-lg:right-0 max-lg:z-[70] max-lg:shadow-2xl max-lg:w-[85%] lg:static lg:w-72 lg:shrink-0 flex flex-col h-full bg-white border-l border-stone-200 overflow-y-auto custom-scrollbar inbox-profile-drawer"
          >
            {/* ─── Drawer Content ─── */}
            <div className="flex-1 overflow-y-auto custom-scrollbar">
              <div className="p-4 space-y-4">

                {/* Drawer close header */}
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-stone-400">Customer Profile</span>
                  <button
                    type="button"
                    onClick={closeMobileProfile}
                    className="w-10 h-10 flex items-center justify-center rounded-full bg-stone-100 hover:bg-stone-200 text-stone-600 cursor-pointer transition-colors active:scale-95"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Profile avatar & status */}
                <div className="rounded-2xl overflow-hidden border border-stone-100 shadow-sm select-none">
                  <div className={`${avatarBg(activeContact.name)} rounded-t-2xl px-4 py-5 flex items-center gap-3`}>
                    <div className="w-14 h-14 bg-white/20 text-white flex items-center justify-center text-lg font-black rounded-xl ring-2 ring-white/30 shrink-0">
                      {activeContact.name.split(" ").map(n => n[0]).join("")}
                    </div>
                    <div className="text-left min-w-0">
                      <h3 className="font-black text-white text-sm truncate">{activeContact.name}</h3>
                      <p className="text-[10px] text-white/60 font-medium mt-0.5 truncate">{activeContact.phone}</p>
                      <span className={`inline-flex items-center px-2 py-0.5 mt-1.5 text-[9px] font-bold rounded-md border ${activeContact.status === "Active" ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-stone-100 text-stone-500 border-stone-200"}`}>
                        {activeContact.status} lead
                      </span>
                    </div>
                  </div>
                </div>

                {/* Lead Metadata */}
                <div className="p-4 rounded-2xl space-y-3 border border-stone-100 bg-stone-50/50">
                  <h4 className="text-[9px] font-black uppercase tracking-widest text-stone-400">Lead Metadata</h4>
                  <div className="space-y-3 text-xs font-medium text-stone-600 select-text">
                    <div className="flex items-center gap-3">
                      <Phone className="w-4 h-4 text-stone-400 shrink-0" />
                      <span className="truncate">{activeContact.phone}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Mail className="w-4 h-4 text-stone-400 shrink-0" />
                      <span className="truncate">{activeContact.email}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <ShoppingBag className="w-4 h-4 text-stone-400 shrink-0" />
                      <span>Source: <strong className="text-stone-900">{activeContact.source}</strong></span>
                    </div>
                  </div>
                </div>

                {/* Form Submissions / Custom Attributes */}
                {activeContact.attributes && Object.keys(activeContact.attributes).length > 0 && (
                  <div className="p-4 rounded-2xl space-y-3 border border-stone-100 bg-stone-50/50">
                    <h4 className="text-[9px] font-black uppercase tracking-widest text-stone-400 select-none">
                      Form Submissions
                    </h4>
                    <div className="space-y-2.5 select-text text-xs">
                      {Object.entries(activeContact.attributes).map(([key, val]) => (
                        <div key={key} className="flex justify-between items-start">
                          <span className="font-bold text-stone-500 uppercase text-[9px] tracking-wider pt-0.5 truncate max-w-[120px]">
                            {key.replace(/_/g, " ")}
                          </span>
                          <span className="text-stone-900 text-right font-semibold break-all pl-2">
                            {String(val)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Unified E-Commerce Integration Panel (Shopify + WhatsApp Marketplace) */}
                {(() => {
                  const attrs = (activeContact.attributes as Record<string, unknown>) || {};
                  const isWhatsAppCart = activeContact.tags.includes("WhatsApp-Cart");
                  const isShopifyCart = activeContact.tags.includes("Shopify-Cart");
                  const checkoutUrl = String(attrs.shopify_checkout_url || attrs.cart_checkout_url || "");
                  const isCartAbandoned = (isShopifyCart || isWhatsAppCart) && checkoutUrl && !attrs.cart_recovered;
                  const cartSource = isWhatsAppCart ? "WhatsApp Marketplace" : "Shopify";
                  const customerOrders = (orders || []).filter(
                    (o) => o.contactId === activeContact.id || o.phone === activeContact.phone
                  );

                  if (!isCartAbandoned && customerOrders.length === 0) return null;

                  return (
                    <div className="p-4 rounded-2xl space-y-3 border border-stone-100 bg-stone-50/50">
                      <h4 className="text-[9px] font-black uppercase tracking-widest text-stone-400 select-none flex items-center gap-1">
                        <ShoppingBag className="w-3.5 h-3.5 text-stone-400" />
                        E-Commerce
                      </h4>

                      {/* 1. Abandoned Checkout Alert */}
                      {isCartAbandoned && (
                        <div className="bg-amber-50/50 border border-amber-200/60 p-4 rounded-2xl space-y-3 shadow-sm select-text text-xs relative overflow-hidden">
                          <div className="absolute top-0 right-0 w-24 h-24 bg-amber-100/10 rounded-full blur-2xl pointer-events-none" />
                          <div className="flex items-center justify-between">
                            <span className="text-[8px] font-black tracking-widest uppercase bg-amber-100 text-amber-800 px-2 py-0.5 border border-amber-200 rounded-md">
                              🛒 {cartSource} Cart
                            </span>
                            <span className="text-[10px] font-bold text-stone-900">
                              ₹{String(attrs.cart_total || "0.00")}
                            </span>
                          </div>

                          <div className="text-[11px] text-stone-600 font-medium">
                            <p className="font-bold text-stone-850 truncate max-w-[220px]" title={String(attrs.cart_items || "")}>
                              {String(attrs.cart_items || "Line items missing")}
                            </p>
                            <p className="text-[9px] text-stone-400 mt-1 uppercase tracking-wide">
                              Abandoned: {String(attrs.cart_abandoned_at || "Recent")}
                            </p>
                          </div>

                          <div className="flex items-center gap-2 pt-1.5 select-none">
                            <button
                              type="button"
                              onClick={() => {
                                navigator.clipboard.writeText(checkoutUrl);
                                notify.success("Link copied", "Checkout URL copied to your clipboard.");
                              }}
                              className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 border border-amber-200 bg-white hover:bg-amber-50/60 text-[9px] font-black uppercase tracking-wider text-amber-800 transition-all cursor-pointer rounded-xl active:scale-[0.97]"
                            >
                              <Copy className="w-3 h-3" />
                              Copy Link
                            </button>
                            <button
                              type="button"
                              onClick={async () => {
                                const phoneNum = activeContact.phone.replace(/[^0-9]/g, "");
                                try {
                                  await fetch("/api/whatsapp/send", {
                                    method: "POST",
                                    headers: { "Content-Type": "application/json" },
                                    body: JSON.stringify({
                                      to: phoneNum,
                                      text: `Hi ${activeContact.name}, we noticed you left some items in your cart (total value: ₹${String(attrs.cart_total)}). You can complete your checkout here: ${checkoutUrl}`,
                                      contactId: activeContact.id,
                                      orgId: orgId,
                                    }),
                                  });
                                  notify.success("Reminder sent", "The recovery reminder is on its way to the customer.");
                                  refreshWorkspace(orgId);
                                } catch (err) {
                                  notify.error("Couldn't send reminder", "Please try again in a moment.");
                                }
                              }}
                              className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 bg-amber-600 hover:bg-amber-700 text-white text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer rounded-xl active:scale-[0.97]"
                            >
                              <Send className="w-3 h-3" />
                              Remind
                            </button>
                          </div>
                        </div>
                      )}

                      {/* 2. Customer Order History */}
                      {customerOrders.length > 0 && (
                        <div className="space-y-2.5">
                          <span className="text-[9px] font-bold text-stone-400 uppercase tracking-wider block">
                            Recent Orders ({customerOrders.length})
                          </span>
                          <div className="space-y-2 max-h-44 overflow-y-auto pr-1 custom-scrollbar">
                            {customerOrders.map((order: { id: string; orderId: string; status: string; createdAt: string; total: number; contactId?: string; phone?: string }) => {
                              const orderStatus = order.status || "pending";
                              let badgeColor = "bg-stone-50 text-stone-600 border-stone-200";
                              if (orderStatus === "confirmed") badgeColor = "bg-indigo-50 text-indigo-700 border-indigo-200";
                              if (orderStatus === "shipped") badgeColor = "bg-amber-50 text-amber-700 border-amber-200";
                              if (orderStatus === "delivered") badgeColor = "bg-emerald-50 text-emerald-700 border-emerald-200";

                              return (
                                <div key={order.id} className="border border-stone-200 p-3 bg-stone-50/20 rounded-xl flex items-center justify-between gap-3 text-xs">
                                  <div className="min-w-0">
                                    <p className="font-bold text-stone-900 uppercase text-[10px] tracking-wide truncate max-w-[120px]">
                                      {order.orderId}
                                    </p>
                                    <p className="text-[9px] text-stone-400 mt-0.5">
                                      {new Date(order.createdAt).toLocaleDateString()}
                                    </p>
                                  </div>
                                  <div className="text-right shrink-0 flex flex-col items-end gap-1">
                                    <span className="font-bold text-stone-900">
                                      ₹{(order.total / 100).toFixed(2)}
                                    </span>
                                    <span className={`text-[7px] font-black tracking-widest uppercase px-1.5 py-0.5 border ${badgeColor}`}>
                                      {orderStatus}
                                    </span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* Agent Assignment */}
                <div className="p-4 rounded-2xl space-y-2.5 border border-stone-100 bg-stone-50/50 select-none">
                  <h4 className="text-[9px] font-black uppercase tracking-widest text-stone-400">Assigned Agent</h4>
                  <select
                    value={activeContact.assignedAgent}
                    onChange={handleAgentChange}
                    className="w-full bg-white border border-stone-200 rounded-xl px-3 py-2.5 text-xs font-semibold focus:outline-none focus:border-wa-green transition-colors cursor-pointer"
                  >
                    {members.map((m) => (
                      <option key={m.id} value={m.name}>{m.name}</option>
                    ))}
                    <option value="Bot">Bot (Auto AI)</option>
                    <option value="None">Unassigned</option>
                  </select>
                </div>

                {/* Segmentation Tags */}
                <div className="p-4 rounded-2xl space-y-3 border border-stone-100 bg-stone-50/50">
                  <h4 className="text-[9px] font-black uppercase tracking-widest text-stone-400 flex items-center gap-2 select-none">
                    <Tag className="w-3.5 h-3.5" />
                    Segmentation Tags
                  </h4>

                  <div className="flex flex-wrap gap-2 select-none">
                    {activeContact.tags.length === 0 ? (
                      <span className="text-xs text-stone-400 font-medium">No tags yet</span>
                    ) : (
                      activeContact.tags.map((t, idx) => (
                        <span
                          key={idx}
                          className="inline-flex items-center gap-1.5 pl-3 pr-2 py-1 text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg hover:opacity-80 transition-opacity cursor-default"
                        >
                          <span>{t}</span>
                          <button
                            onClick={() => handleRemoveTag(t)}
                            className="w-4 h-4 flex items-center justify-center rounded-full hover:bg-emerald-100 cursor-pointer transition-colors"
                          >
                            <X className="w-3 h-3 text-emerald-600" />
                          </button>
                        </span>
                      ))
                    )}
                  </div>

                  {/* Add tag form */}
                  <form onSubmit={handleAddTag} className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Create tag..."
                      value={newTagInput}
                      onChange={(e) => setNewTagInput(e.target.value)}
                      className="flex-1 bg-white border border-stone-200 rounded-xl px-3 py-2 text-xs font-medium focus:outline-none focus:border-wa-green transition-colors"
                    />
                    <button
                      type="submit"
                      className="w-9 h-9 flex items-center justify-center bg-wa-green hover:bg-wa-green-dark text-white rounded-xl transition-all cursor-pointer shrink-0"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </form>
                </div>

                {/* Delete Contact */}
                <div className="pt-4 border-t border-stone-100 select-none">
                  <button
                    onClick={() => {
                      deleteContact(activeContact.id);
                      closeMobileProfile();
                    }}
                    className="w-full flex items-center justify-center px-4 py-2.5 text-xs font-bold border border-red-200 bg-red-50 hover:bg-red-100 text-red-700 rounded-xl transition-all cursor-pointer"
                  >
                    Delete Lead Profile
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
