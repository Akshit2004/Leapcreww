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
  ArrowLeft
} from "lucide-react";
import { useApp, Message } from "../../context/AppContext";
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
    refreshWorkspace
  } = useApp();

  const [searchQuery, setSearchQuery] = useState("");
  const [inputText, setInputText] = useState("");
  const [newTagInput, setNewTagInput] = useState("");
  const [showMobileProfile, setShowMobileProfile] = useState(false);
  const [showSimulate, setShowSimulate] = useState(false);
  const [simMessage, setSimMessage] = useState("");
  const [autoRefresh, setAutoRefresh] = useState(false);

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

  // Render ticks
  const renderMessageStatus = (status: Message["status"]) => {
    if (!status) return null;
    if (status === "sent") {
      return <Check className="w-3.5 h-3.5 text-zinc-400" />;
    }
    if (status === "delivered") {
      return <CheckCheck className="w-3.5 h-3.5 text-zinc-400" />;
    }
    if (status === "read") {
      return <CheckCheck className="w-3.5 h-3.5 text-blue-500" />;
    }
    return null;
  };

  return (
    <div className="flex-1 flex h-full overflow-hidden animate-slide-up relative bg-[#f4f6f5]">
      {/* 1. Left Contact List Pane */}
      <div className={`w-full md:w-80 border-r border-slate-200/50 flex flex-col h-full bg-white shrink-0 ${
        activeContactId ? "hidden md:flex" : "flex"
      }`}>
        {/* Search */}
        <div className="p-4 border-b border-slate-100 shrink-0 space-y-3 bg-gradient-to-b from-slate-50/50 to-transparent">
          <div className="flex items-center justify-between">
            <h3 className="font-extrabold text-slate-900 text-sm tracking-tight">Active Conversations</h3>
            <button
              onClick={() => setAutoRefresh((p) => !p)}
              className={`text-[9px] font-extrabold uppercase tracking-widest px-2.5 py-1.5 rounded-lg border transition-all cursor-pointer ${
                autoRefresh
                  ? "bg-emerald-600 text-white border-emerald-650 shadow-sm shadow-emerald-600/10 animate-glow-pulse"
                  : "bg-white text-stone-400 border-slate-200 hover:border-emerald-300 hover:text-emerald-700 shadow-xs"
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
              placeholder="Search leads, phone, tags..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 pl-9 pr-4 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 transition-all"
            />
          </div>
        </div>

        {/* Contacts Stream */}
        <div className="flex-1 overflow-y-auto custom-scrollbar divide-y divide-slate-100/60">
          {filteredContacts.length === 0 ? (
            <div className="p-8 text-center text-xs text-stone-500 font-semibold italic">
              No matching active leads.
            </div>
          ) : (
            filteredContacts.map((c) => {
              const isSelected = c.id === activeContactId;
              const hasUnread = (c.unreadCount || 0) > 0 && !isSelected;
              return (
                <button
                  key={c.id}
                  onClick={() => setActiveContactId(c.id)}
                  className={`w-full p-4 flex items-start gap-3 transition-all duration-200 hover:bg-slate-50/50 text-left relative ${
                    isSelected ? "bg-emerald-50/40" : ""
                  }`}
                >
                  <div className="relative shrink-0 mt-0.5 select-none">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-100 to-teal-50 flex items-center justify-center font-extrabold text-emerald-700 text-xs shadow-sm border border-emerald-250/20 uppercase">
                      {c.name.split(" ").map(n => n[0]).join("")}
                    </div>
                    {c.status === "Active" ? (
                      <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-500 border-2 border-white ring-1 ring-emerald-500/10 animate-pulse" />
                    ) : (
                      <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-stone-300 border-2 border-white" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center justify-between">
                      <h4 className={`text-xs font-bold truncate ${isSelected ? "text-emerald-800" : "text-stone-900"}`}>
                        {c.name}
                      </h4>
                      <span className="text-[9px] text-stone-400 font-semibold tracking-wide shrink-0">{c.lastMessageTime}</span>
                    </div>

                    <p className="text-[11px] text-stone-500 truncate font-semibold leading-normal">
                      {c.lastMessage || "No messages yet"}
                    </p>

                    {/* Meta Info */}
                    <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                      <span className="text-[8px] font-extrabold text-stone-450 uppercase tracking-widest bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded leading-none shrink-0">
                        {c.source.includes("Shopify") ? "Shopify" : c.source.includes("Woo") ? "Woo" : "Ad"}
                      </span>
                      {c.tags.slice(0, 1).map((t, idx) => (
                        <span key={idx} className="text-[9px] font-bold bg-emerald-500/10 text-emerald-600 px-2 py-0.5 rounded leading-none truncate max-w-[80px]">
                          {t}
                        </span>
                      ))}
                      {c.tags.length > 1 && (
                        <span className="text-[9px] text-stone-400 font-semibold">+{c.tags.length - 1}</span>
                      )}
                    </div>
                  </div>

                  {hasUnread && (
                    <span className="bg-emerald-500 text-white text-[9px] font-extrabold w-5 h-5 rounded-full flex items-center justify-center shrink-0 animate-pulse-soft mt-1.5 shadow-sm shadow-emerald-500/20">
                      {c.unreadCount}
                    </span>
                  )}

                  {isSelected && (
                    <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-emerald-600" />
                  )}
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* 2. Middle Chat Stream Window */}
      <div className={`flex-1 flex flex-col h-full relative overflow-hidden ${
        activeContactId ? "flex" : "hidden md:flex"
      }`}>
        {activeContact ? (
          <>
            {/* Active Contact Header */}
            <div className="h-16 px-4 md:px-6 bg-white/95 backdrop-blur-sm border-b border-slate-200/50 flex items-center justify-between shrink-0 relative z-10 select-none shadow-sm shadow-slate-100/50">
              <div className="flex items-center gap-2 md:gap-3 min-w-0">
                {/* Back button for mobile view */}
                <button
                  type="button"
                  onClick={() => setActiveContactId("")}
                  className="md:hidden p-1.5 rounded-xl hover:bg-slate-50 text-stone-750 cursor-pointer shrink-0 transition-colors"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>

                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center font-bold text-white text-xs shadow-md shadow-emerald-600/10 shrink-0 uppercase border border-white/10">
                  {activeContact.name.split(" ").map(n => n[0]).join("")}
                </div>
                <div className="min-w-0">
                  <h4 className="text-xs font-bold text-stone-900 leading-none truncate">{activeContact.name}</h4>
                  <span className="text-[10px] text-stone-400 font-semibold flex items-center gap-1 mt-1 truncate">
                    <span className="truncate">{activeContact.phone}</span>
                    <span>•</span>
                    <span className="capitalize truncate text-emerald-650">{activeContact.source}</span>
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowSimulate(!showSimulate)}
                  className="text-[9px] px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-250/20 text-emerald-700 font-extrabold uppercase tracking-wide flex items-center gap-1.5 select-none transition-all shadow-sm shrink-0 cursor-pointer hover:shadow-md"
                  title="Simulate Inbound Customer Message"
                >
                  <Bot className="w-3.5 h-3.5 text-emerald-600" />
                  Simulate
                </button>

                <span className="hidden sm:inline-flex text-[10px] px-3 py-1.5 rounded-xl bg-slate-50 text-stone-500 font-bold items-center gap-1.5 shrink-0 border border-slate-200/60 shadow-xs">
                  <Laptop className="w-3.5 h-3.5 text-stone-400" />
                  Agent: <span className="font-extrabold text-stone-850">{activeContact.assignedAgent}</span>
                </span>
                
                {/* Profile panel toggle button */}
                <button
                  type="button"
                  onClick={() => setShowMobileProfile(!showMobileProfile)}
                  className="lg:hidden p-2 rounded-xl hover:bg-slate-50 text-stone-700 cursor-pointer shrink-0 transition-colors"
                  title="View Customer Profile"
                >
                  <User className="w-4.5 h-4.5" />
                </button>
              </div>
            </div>

            {/* Inbound Customer Simulator Banner */}
            {showSimulate && (
              <div className="bg-white/90 backdrop-blur-md border-b border-emerald-100 px-6 py-3.5 flex items-center justify-between gap-4 z-20 relative select-none animate-slide-up shadow-sm">
                <div className="flex items-center gap-2 text-xs font-bold text-emerald-800 shrink-0">
                  <Bot className="w-4.5 h-4.5 text-emerald-600 animate-bounce" />
                  <span>Simulate from {activeContact.name}:</span>
                </div>
                <div className="flex items-center gap-2.5 flex-1 max-w-md">
                  <input
                    type="text"
                    placeholder="Type simulated customer response..."
                    value={simMessage}
                    onChange={(e) => setSimMessage(e.target.value)}
                    onKeyDown={async (e) => {
                      if (e.key === "Enter" && simMessage.trim()) {
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
                        } catch (err) {
                          console.error(err);
                        } finally {
                          unlockSync();
                        }
                      }
                    }}
                    className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-450"
                  />
                  <button
                    type="button"
                    onClick={async () => {
                      if (!simMessage.trim()) return;
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
                      } catch (err) {
                        console.error(err);
                      } finally {
                        unlockSync();
                      }
                    }}
                    className="bg-emerald-600 hover:bg-emerald-555 text-white font-bold text-xs px-4 py-2 rounded-xl transition-all cursor-pointer shrink-0 shadow-sm hover:shadow-md"
                  >
                    Simulate Inbound
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowSimulate(false)}
                    className="p-2 rounded-xl hover:bg-emerald-50 text-emerald-700 cursor-pointer shrink-0 transition-colors"
                  >
                    <X className="w-4.5 h-4.5" />
                  </button>
                </div>
              </div>
            )}

            {/* Live Message History Scroll with WhatsApp Wallpaper */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar relative wa-chat-doodle">
              {activeChat.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center text-xs text-stone-500 font-semibold gap-2.5 relative z-10">
                  <Bot className="w-9 h-9 text-emerald-650 animate-bounce" />
                  <p className="max-w-xs">Live channel is active. Send a message or template trigger below to initiate customer support.</p>
                </div>
              ) : (
                activeChat.map((msg) => {
                  if (msg.sender === "system") {
                    return (
                      <div key={msg.id} className="flex justify-center my-3.5 animate-slide-up relative z-10 select-none">
                        <div className="bg-white/80 backdrop-blur-md text-[10px] font-extrabold text-stone-500 px-3.5 py-2 rounded-xl shadow-sm max-w-[85%] text-center uppercase tracking-wide border border-slate-200/50">
                          {msg.text}
                        </div>
                      </div>
                    );
                  }

                  const isAgent = msg.sender === "agent";

                  return (
                    <div 
                      key={msg.id} 
                      className={`flex ${isAgent ? "justify-end" : "justify-start"} animate-slide-up relative z-10`}
                    >
                      <div className={`max-w-[70%] rounded-2xl px-4 py-3.5 shadow-sm text-[12.5px] leading-relaxed relative ${
                        isAgent 
                          ? "wa-bubble-sent-bg text-stone-800 rounded-tr-none border border-emerald-200/20" 
                          : "wa-bubble-received-bg text-stone-900 rounded-tl-none border border-slate-200/50"
                      }`}>
                        {/* Text */}
                        <p className="whitespace-pre-line select-text font-medium">{msg.text}</p>
                        
                        {/* Interactive Buttons (e.g. CTA Quick Replies) */}
                        {msg.buttons && msg.buttons.length > 0 && (
                          <div className="mt-3.5 border-t border-stone-250/30 pt-2.5 space-y-2 select-none">
                            {msg.buttons.map((btn, bIdx) => (
                              <button
                                key={bIdx}
                                onClick={() => {
                                  // Click simulation
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
                                className="w-full flex items-center justify-center gap-1.5 py-2 px-4 rounded-xl bg-white/95 border border-slate-200 hover:border-emerald-300 text-emerald-600 font-bold hover:bg-emerald-50/50 active:scale-98 transition-all shadow-xs"
                              >
                                <span>{btn}</span>
                                <ExternalLink className="w-3 h-3" />
                              </button>
                            ))}
                          </div>
                        )}

                        {/* Footer Details */}
                        <div className="flex items-center justify-end gap-1 mt-1 text-[9px] text-stone-400 font-semibold select-none">
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

            {/* Input Bar Form (Frosted Glassmorphic inputs) */}
            <form 
              onSubmit={handleSendMessage}
              className="p-4 bg-white border-t border-slate-200/60 flex items-center gap-3 shrink-0 relative z-10 bg-gradient-to-t from-slate-50/50 to-white"
            >
              <input
                type="text"
                placeholder="Type your secure WhatsApp response here..."
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                className="flex-1 bg-slate-50 border border-slate-250 rounded-xl py-3 px-4 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-450 transition-all placeholder:text-stone-400"
              />
              <button
                type="submit"
                disabled={!inputText.trim()}
                className="w-11 h-11 rounded-full bg-emerald-600 text-white flex items-center justify-center hover:bg-emerald-505 disabled:opacity-40 disabled:hover:bg-emerald-600 transition-all shadow-md shadow-emerald-600/10 hover:shadow-lg cursor-pointer shrink-0 active:scale-95"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8 space-y-4 select-none relative z-10">
            <div className="w-16 h-16 rounded-3xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 shadow-sm shadow-emerald-500/5">
              <MessageSquareOff className="w-7 h-7" />
            </div>
            <div>
              <h4 className="font-extrabold text-stone-800 text-sm tracking-tight">No Active Conversation</h4>
              <p className="text-stone-500 text-xs mt-1.5 max-w-[280px] font-semibold leading-relaxed">Select a lead from the left active panel to load customer messages and perform live-chat automation.</p>
            </div>
          </div>
        )}
      </div>

      {/* 3. Right CRM Profile Panel Drawer */}
      {activeContact && (
        <>
          {/* Backdrop for mobile CRM drawer */}
          {showMobileProfile && (
            <div 
              onClick={() => setShowMobileProfile(false)}
              className="fixed inset-0 bg-black/35 z-30 lg:hidden backdrop-blur-xs transition-opacity duration-300 cursor-pointer"
            />
          )}

          <div className={`fixed inset-y-0 right-0 z-40 lg:static w-80 lg:w-72 border-l border-slate-200/50 bg-white flex flex-col h-full overflow-y-auto custom-scrollbar shrink-0 p-6 space-y-6 transition-transform duration-350 ease-in-out lg:translate-x-0 ${
            showMobileProfile ? "translate-x-0" : "translate-x-full lg:translate-x-0"
          }`}>
            {/* Header close button inside mobile CRM drawer */}
            <div className="flex items-center justify-between pb-3.5 border-b border-slate-100 lg:hidden select-none">
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-stone-400">Customer Profile</span>
              <button
                type="button"
                onClick={() => setShowMobileProfile(false)}
                className="p-1.5 rounded-xl hover:bg-slate-50 text-stone-600 cursor-pointer transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="text-center pb-4 border-b border-slate-150">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 text-white flex items-center justify-center text-xl font-bold mx-auto mb-3 shadow-md shadow-emerald-600/10 border border-white/10 uppercase">
                {activeContact.name.split(" ").map(n => n[0]).join("")}
              </div>
              <h3 className="font-extrabold text-stone-900 tracking-tight text-sm">{activeContact.name}</h3>
              <span className="text-[9px] font-extrabold uppercase tracking-widest bg-blue-50 text-blue-600 pl-2.5 pr-2.5 py-1.5 rounded-lg border border-blue-200 mt-2 inline-block shadow-sm shadow-blue-500/5">
                {activeContact.status} lead
              </span>
            </div>

            {/* CRM Info Fields */}
            <div className="space-y-4">
              <h4 className="text-[10px] font-extrabold uppercase tracking-widest text-stone-400">Lead Metadata</h4>
              <div className="space-y-3 text-xs text-stone-600 font-semibold select-text">
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
                  <span>Source: <strong className="text-emerald-700 capitalize font-bold">{activeContact.source}</strong></span>
                </div>
              </div>
            </div>

            {/* Agent Assignment */}
            <div className="space-y-2">
              <h4 className="text-[10px] font-extrabold uppercase tracking-widest text-stone-400">Assigned Agent</h4>
              <select
                value={activeContact.assignedAgent}
                onChange={handleAgentChange}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 transition-all select-none"
              >
                {members.map((m) => (
                  <option key={m.id} value={m.name}>{m.name}</option>
                ))}
                <option value="Bot">Bot (Auto AI)</option>
                <option value="None">Unassigned</option>
              </select>
            </div>

            {/* Custom Tags Manager */}
            <div className="space-y-4 pt-2">
              <h4 className="text-[10px] font-extrabold uppercase tracking-widest text-stone-400 flex items-center gap-2">
                <Tag className="w-3.5 h-3.5" />
                Segmentation Tags
              </h4>
              
              {/* Tag pills */}
              <div className="flex flex-wrap gap-1.5 select-none">
                {activeContact.tags.length === 0 ? (
                  <span className="text-[11px] text-stone-400 font-semibold italic">No active segment tags.</span>
                ) : (
                  activeContact.tags.map((t, idx) => (
                    <span 
                      key={idx} 
                      className="text-[10px] font-bold bg-emerald-500/10 text-emerald-600 pl-2.5 pr-1.5 py-1.5 rounded-full flex items-center gap-1.5 shadow-xs border border-emerald-500/5 hover:bg-emerald-500/25 duration-200"
                    >
                      <span>{t}</span>
                      <button 
                        onClick={() => handleRemoveTag(t)}
                        className="hover:bg-emerald-500/20 p-0.5 rounded-full cursor-pointer transition-colors"
                      >
                        <X className="w-2.5 h-2.5 text-emerald-650" />
                      </button>
                    </span>
                  ))
                )}
              </div>

              {/* Add tag form */}
              <form onSubmit={handleAddTag} className="flex gap-2">
                <input
                  type="text"
                  placeholder="Create segment tag..."
                  value={newTagInput}
                  onChange={(e) => setNewTagInput(e.target.value)}
                  className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 transition-all"
                />
                <button
                  type="submit"
                  className="bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl px-3 py-2 hover:scale-[1.03] active:scale-95 transition-all shadow-sm cursor-pointer shrink-0"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </form>
            </div>

            {/* Delete Contact */}
            <div className="pt-6 border-t border-slate-150 select-none">
              <button
                onClick={() => {
                  deleteContact(activeContact.id);
                  setShowMobileProfile(false);
                }}
                className="w-full text-center py-3.5 text-xs font-extrabold uppercase tracking-wider text-red-500 hover:bg-red-500/5 hover:text-red-600 border border-red-200 rounded-xl transition-all cursor-pointer hover:shadow-xs"
              >
                Delete Lead Profile
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
