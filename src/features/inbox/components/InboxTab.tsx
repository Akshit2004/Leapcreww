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
  Copy
} from "lucide-react";
import { useApp, Message } from "@/shared/context/AppContext";
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
  
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Active contact details
  const activeContact = contacts.find((c) => c.id === activeContactId) || null;
  const activeChat = activeContactId ? chatHistory[activeContactId] || [] : [];

  // Filter contacts
  const filteredContacts = contacts.filter((c) => 
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.phone.includes(searchQuery) ||
    c.tags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase()))
  );

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
      setTimeout(() => fetchReplySuggestions(), 800);
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
      return <Check className="w-3.5 h-3.5 text-stone-400" />;
    }
    if (status === "delivered") {
      return <CheckCheck className="w-3.5 h-3.5 text-stone-500" />;
    }
    if (status === "read") {
      return <CheckCheck className="w-3.5 h-3.5 text-stone-900" />;
    }
    return null;
  };

  // ─── Determine which mobile pane to show ────────────────────────
  // On mobile (<1024px): show contact list OR chat, never both
  // On desktop (>=1024px): show all three columns
  const mobileShowChat = !!activeContactId;

  return (
    <div className="flex-1 flex h-full overflow-hidden animate-slide-up relative bg-[#fafaf9]">
      <style>{`
        @media (max-width: 1023px) {
          .inbox-contact-list-pane[data-mobile-hidden="true"] { display: none !important; }
          .inbox-chat-pane[data-mobile-hidden="true"] { display: none !important; }
          .inbox-profile-drawer {
            transform: translateX(100%) !important;
          }
          .inbox-profile-drawer[data-mobile-open="true"] {
            transform: translateX(0) !important;
          }
        }
      `}</style>

      {/* ═══════════════════════════════════════════════════════════════
          COLUMN 1 — Contact List
          Desktop: always visible (w-80)
          Mobile: visible only when NO contact is selected
       ═══════════════════════════════════════════════════════════════ */}
      <div
        className="w-full lg:w-80 border-r border-stone-200 flex flex-col h-full bg-white shrink-0 inbox-contact-list-pane"
        data-mobile-hidden={mobileShowChat ? "true" : "false"}
        style={{ display: mobileShowChat ? undefined : "flex" }}
      >
          {/* Search Header */}
          <div className="p-4 border-b border-stone-200 shrink-0 space-y-3 bg-[#fafaf9]">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-stone-900 text-xs tracking-wider uppercase">Active Conversations</h3>
              <button
                onClick={() => setAutoRefresh((p) => !p)}
                className={`text-[9px] font-bold uppercase tracking-wider px-2.5 py-1.5 rounded-lg border transition-all cursor-pointer ${
                  autoRefresh
                    ? "bg-stone-950 text-white border-stone-950"
                    : "bg-white text-stone-400 border-stone-200 hover:border-stone-950 hover:text-stone-950"
                }`}
                title={autoRefresh ? "Auto-refresh on" : "Auto-refresh off"}
              >
                {autoRefresh ? "Live" : "Paused"}
              </button>
            </div>
            <div className="relative">
              <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search contacts..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-stone-50 border border-stone-200 rounded-lg py-2.5 pl-9 pr-4 text-xs font-medium focus:outline-none focus:border-stone-900 focus:bg-white transition-all placeholder:text-stone-400"
              />
            </div>
          </div>

          {/* Contacts Stream */}
          <div className="flex-1 overflow-y-auto custom-scrollbar">
            {filteredContacts.length === 0 ? (
              <div className="p-8 text-center text-xs text-stone-400 font-bold uppercase tracking-wider">
                No matching contacts found
              </div>
            ) : (
              filteredContacts.map((c) => {
                const isSelected = c.id === activeContactId;
                const hasUnread = (c.unreadCount || 0) > 0 && !isSelected;
                return (
                  <button
                    key={c.id}
                    onClick={() => setActiveContactId(c.id)}
                    className={`w-full p-4 flex items-start gap-3 transition-all duration-150 hover:bg-stone-50 text-left relative border-b border-stone-100 ${
                      isSelected ? "bg-stone-50" : ""
                    }`}
                  >
                    {/* Avatar */}
                    <div className="relative shrink-0 mt-0.5">
                      <div className="w-11 h-11 bg-stone-100 text-stone-700 flex items-center justify-center font-bold text-sm rounded-full">
                        {c.name.split(" ").map(n => n[0]).join("")}
                      </div>
                      <span className={`absolute bottom-0 right-0 w-3 h-3 border-2 border-white rounded-full ${
                        c.status === "Active" ? "bg-emerald-500" : "bg-stone-300"
                      }`} />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-bold truncate text-stone-900">{c.name}</h4>
                        <span className="text-[10px] text-stone-400 font-medium shrink-0 ml-2">{c.lastMessageTime}</span>
                      </div>
                      <p className="text-xs text-stone-500 truncate leading-normal">
                        {c.lastMessage || "No messages yet"}
                      </p>
                      <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                        <span className="text-[8px] font-bold text-stone-500 uppercase tracking-wider bg-stone-100 border border-stone-200 px-1.5 py-0.5 rounded-full leading-none shrink-0">
                          {c.source.includes("Shopify") ? "Shopify" : c.source.includes("Woo") ? "Woo" : "Ad"}
                        </span>
                        {c.tags.slice(0, 1).map((t, idx) => (
                          <span key={idx} className="text-[9px] font-semibold bg-stone-100 text-stone-700 px-2 py-0.5 border border-stone-200 leading-none truncate max-w-[80px] rounded-full">
                            {t}
                          </span>
                        ))}
                        {c.tags.length > 1 && (
                          <span className="text-[9px] text-stone-400 font-medium">+{c.tags.length - 1}</span>
                        )}
                      </div>
                    </div>

                    {/* Unread badge */}
                    {hasUnread && (
                      <span className="bg-emerald-600 text-white text-[9px] font-bold min-w-[20px] h-5 rounded-full flex items-center justify-center shrink-0 mt-1.5 px-1.5">
                        {c.unreadCount}
                      </span>
                    )}

                    {/* Active indicator */}
                    {isSelected && (
                      <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-stone-950 rounded-r-full" />
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

                <div className="w-9 h-9 bg-gradient-to-br from-stone-700 to-stone-900 text-white flex items-center justify-center font-bold text-xs shrink-0 uppercase rounded-full">
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
                {/* Simulate button */}
                <button
                  type="button"
                  onClick={() => setShowSimulate(!showSimulate)}
                  className="text-[9px] px-2.5 py-1.5 bg-stone-950 text-white hover:bg-stone-800 border border-stone-950 font-bold uppercase tracking-wider flex items-center gap-1.5 select-none transition-all shrink-0 cursor-pointer rounded-lg"
                  title="Simulate Inbound Customer Message"
                >
                  <Bot className="w-3.5 h-3.5" />
                  <span className="max-sm:hidden">Simulate</span>
                </button>

                {/* Agent badge — desktop */}
                <span className="max-sm:hidden text-[9px] px-3 py-1.5 bg-stone-50 text-stone-500 font-bold flex items-center gap-1.5 shrink-0 border border-stone-200 uppercase tracking-wider rounded-lg">
                  <Laptop className="w-3.5 h-3.5 text-stone-400" />
                  Agent: <span className="font-bold text-stone-800">{activeContact.assignedAgent}</span>
                </span>
                
                {/* Profile panel toggle — mobile only */}
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
                    className="bg-stone-950 text-white border border-stone-950 font-bold text-[9px] tracking-wider uppercase px-3 py-2 rounded-lg transition-all cursor-pointer shrink-0 hover:bg-stone-800"
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
            <div className="flex-1 overflow-y-auto px-4 lg:px-6 py-4 space-y-3 custom-scrollbar relative bg-[#fafaf9]">
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
                          {msg.text}
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
                          ? "bg-stone-900 text-stone-50 rounded-2xl rounded-br-sm shadow-md" 
                          : "bg-white text-stone-900 border border-stone-200 rounded-2xl rounded-bl-sm shadow-sm"
                      }`}>
                        {/* Text */}
                        <p className="whitespace-pre-line select-text">{msg.text}</p>
                        
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
                                className="w-full flex items-center justify-center gap-1.5 py-2 px-4 rounded-xl bg-white/10 border border-stone-200/30 hover:bg-white/20 text-current font-semibold transition-all text-[10px] uppercase tracking-wider"
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
              <div ref={chatEndRef} />
            </div>

            {/* AI Reply Suggestions Bar */}
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
              ) : replySuggestions.length === 0 ? (
                <span className="text-[10px] text-stone-400 font-semibold uppercase tracking-wider">No suggestions available</span>
              ) : (
                replySuggestions.map((sug, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setInputText(sug)}
                    className="text-xs font-semibold bg-white hover:bg-stone-100 border border-stone-200 px-3.5 py-1.5 whitespace-nowrap cursor-pointer rounded-lg text-stone-700 transition-all hover:border-stone-300 shadow-sm active:scale-95 shrink-0"
                  >
                    {sug}
                  </button>
                ))
              )}
            </div>

            {/* ─── Input Bar ─── */}
            <form 
              onSubmit={handleSendMessage}
              className="p-3 lg:p-4 bg-white border-t border-stone-200 flex items-center gap-2.5 shrink-0 relative z-10"
            >
              <input
                type="text"
                placeholder="Type a message..."
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                className="flex-1 bg-stone-50 border border-stone-200 rounded-2xl py-3 px-4 text-sm font-medium focus:outline-none focus:border-stone-400 transition-all placeholder:text-stone-400"
              />
              <button
                type="submit"
                disabled={!inputText.trim()}
                className="w-11 h-11 rounded-full bg-stone-950 text-white hover:bg-stone-800 flex items-center justify-center disabled:opacity-30 transition-all shadow-sm cursor-pointer shrink-0 active:scale-95"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </>
        ) : (
          /* ─── Empty State ─── */
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8 space-y-4 select-none">
            <div className="w-16 h-16 bg-stone-100 border border-stone-200 flex items-center justify-center text-stone-400 rounded-2xl">
              <MessageSquareOff className="w-7 h-7" />
            </div>
            <div>
              <h4 className="font-bold text-stone-900 text-sm">No Conversation Selected</h4>
              <p className="text-stone-500 text-xs mt-1.5 max-w-[280px] leading-relaxed">Select a contact from the list to view their conversation.</p>
            </div>
          </div>
        )}
      </div>

      {/* ═══════════════════════════════════════════════════════════════
          COLUMN 3 — CRM Profile Panel / Drawer
          Desktop: static sidebar (w-72, always visible)
          Mobile: full-screen overlay drawer, toggled via showMobileProfile
       ═══════════════════════════════════════════════════════════════ */}
      {activeContact && (
        <>
          {/* Mobile backdrop overlay */}
          {showMobileProfile && (
            <div 
              className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[60] lg:hidden animate-fade-in"
              onClick={closeMobileProfile}
              role="button"
              tabIndex={0}
              aria-label="Close profile panel"
            />
          )}

          {/* Profile panel container */}
          <div
            className="lg:relative lg:z-auto"
            style={{
              // Desktop: render inline as a static sidebar
              // Mobile: render as a fixed overlay drawer
            }}
          >
            <div
              data-mobile-open={showMobileProfile ? "true" : "false"}
              className={[
                // Desktop: static sidebar
                "max-lg:fixed max-lg:inset-y-0 max-lg:right-0 max-lg:z-[70]",
                "lg:static lg:flex",
                // Sizing
                "w-[85%] sm:w-96 lg:w-72",
                // Common styling
                "flex flex-col h-full bg-white border-l border-stone-200 overflow-y-auto custom-scrollbar shrink-0",
                // Mobile transition
                "transition-transform duration-300 ease-in-out",
                "inbox-profile-drawer",
                "lg:translate-x-0",
              ].join(" ")}
            >
              {/* ─── Drawer Content ─── */}
              <div className="p-6 space-y-6">

                {/* Mobile close header */}
                <div className="flex items-center justify-between lg:hidden">
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
                <div className="text-center pb-4 border-b border-stone-100 select-none">
                  <div className="w-20 h-20 bg-gradient-to-br from-stone-700 to-stone-900 text-white flex items-center justify-center text-2xl font-bold mx-auto mb-3 rounded-full shadow-lg">
                    {activeContact.name.split(" ").map(n => n[0]).join("")}
                  </div>
                  <h3 className="font-bold text-stone-900 text-sm">{activeContact.name}</h3>
                  <span className="text-[10px] font-semibold uppercase tracking-wider bg-stone-50 text-stone-700 px-3 py-1 border border-stone-200 mt-2 inline-block rounded-full">
                    {activeContact.status} lead
                  </span>
                </div>

                 {/* Lead Metadata */}
                <div className="space-y-4">
                  <h4 className="text-[10px] font-bold uppercase tracking-wider text-stone-400">Lead Metadata</h4>
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
                  <div className="space-y-2.5 pt-1">
                    <h4 className="text-[10px] font-bold uppercase tracking-wider text-stone-400 select-none">
                      Form Submissions
                    </h4>
                    <div className="bg-stone-50 border border-stone-200 p-3 space-y-2.5 rounded-xl select-text text-xs">
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
                  const attrs = (activeContact.attributes as Record<string, any>) || {};
                  const isWhatsAppCart = activeContact.tags.includes("WhatsApp-Cart");
                  const isShopifyCart = activeContact.tags.includes("Shopify-Cart");
                  const checkoutUrl = attrs.shopify_checkout_url || attrs.cart_checkout_url || "";
                  const isCartAbandoned = (isShopifyCart || isWhatsAppCart) && checkoutUrl && !attrs.cart_recovered;
                  const cartSource = isWhatsAppCart ? "WhatsApp Marketplace" : "Shopify";
                  const customerOrders = (orders || []).filter(
                    (o) => o.contactId === activeContact.id || o.phone === activeContact.phone
                  );

                  if (!isCartAbandoned && customerOrders.length === 0) return null;

                  return (
                    <div className="space-y-4 pt-1">
                      <h4 className="text-[10px] font-bold uppercase tracking-wider text-stone-400 select-none flex items-center gap-1">
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
                              ₹{attrs.cart_total || "0.00"}
                            </span>
                          </div>
                          
                          <div className="text-[11px] text-stone-600 font-medium">
                            <p className="font-bold text-stone-850 truncate max-w-[220px]" title={attrs.cart_items}>
                              {attrs.cart_items || "Line items missing"}
                            </p>
                            <p className="text-[9px] text-stone-400 mt-1 uppercase tracking-wide">
                              Abandoned: {attrs.cart_abandoned_at || "Recent"}
                            </p>
                          </div>

                          <div className="flex items-center gap-2 pt-1.5 select-none">
                            <button
                              type="button"
                              onClick={() => {
                                navigator.clipboard.writeText(checkoutUrl);
                                alert("Checkout URL copied to clipboard!");
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
                                      text: `Hi ${activeContact.name}, we noticed you left some items in your cart (total value: ₹${attrs.cart_total}). You can complete your checkout here: ${checkoutUrl}`,
                                      contactId: activeContact.id,
                                      orgId: orgId,
                                    }),
                                  });
                                  alert("Recovery reminder dispatched!");
                                  refreshWorkspace(orgId);
                                } catch (err) {
                                  alert("Failed to send reminder.");
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
                            {customerOrders.map((order: any) => {
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
                <div className="space-y-2 select-none">
                  <h4 className="text-[10px] font-bold uppercase tracking-wider text-stone-400">Assigned Agent</h4>
                  <select
                    value={activeContact.assignedAgent}
                    onChange={handleAgentChange}
                    className="w-full bg-stone-50 border border-stone-200 rounded-xl p-3 text-xs font-semibold focus:outline-none focus:border-stone-900 transition-all"
                  >
                    {members.map((m) => (
                      <option key={m.id} value={m.name}>{m.name}</option>
                    ))}
                    <option value="Bot">Bot (Auto AI)</option>
                    <option value="None">Unassigned</option>
                  </select>
                </div>

                {/* Segmentation Tags */}
                <div className="space-y-3 pt-2">
                  <h4 className="text-[10px] font-bold uppercase tracking-wider text-stone-400 flex items-center gap-2 select-none">
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
                          className="text-[11px] font-semibold bg-stone-50 text-stone-700 pl-3 pr-2 py-1.5 flex items-center gap-1.5 border border-stone-200 rounded-full hover:bg-stone-100 transition-colors"
                        >
                          <span>{t}</span>
                          <button 
                            onClick={() => handleRemoveTag(t)}
                            className="w-5 h-5 flex items-center justify-center rounded-full hover:bg-stone-200 cursor-pointer transition-colors"
                          >
                            <X className="w-3 h-3 text-stone-500" />
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
                      className="flex-1 bg-stone-50 border border-stone-200 rounded-xl px-3 py-2.5 text-xs font-medium focus:outline-none focus:border-stone-900 placeholder:text-stone-400"
                    />
                    <button
                      type="submit"
                      className="bg-stone-950 text-white border border-stone-950 rounded-xl px-3 py-2.5 transition-all cursor-pointer shrink-0 flex items-center justify-center hover:bg-stone-800 active:scale-95"
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
                    className="w-full text-center py-3 text-xs font-bold text-red-500 hover:bg-red-50 border border-red-200 rounded-xl transition-all duration-200 cursor-pointer active:scale-[0.98]"
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