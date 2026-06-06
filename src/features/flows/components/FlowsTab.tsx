"use client";

import React, { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { Plus, RefreshCw, Layers, LayoutTemplate, Settings2, Code, Share2, ShieldAlert, Lock, Play } from "lucide-react";

export const FlowsTab: React.FC = () => {
  const params = useParams();
  const orgId = params.orgId as string;

  const [flows, setFlows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedFlow, setSelectedFlow] = useState<any | null>(null);
  const [flowJsonStr, setFlowJsonStr] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isEncryptionSetup, setIsEncryptionSetup] = useState(true);
  const [isSettingUp, setIsSettingUp] = useState(false);
  const [showBroadcastModal, setShowBroadcastModal] = useState(false);
  const [campaignName, setCampaignName] = useState("");
  const [targetTag, setTargetTag] = useState("all");
  const [messageTitle, setMessageTitle] = useState("Please fill out this form.");
  const [ctaText, setCtaText] = useState("Open Form");
  const [messageFooter, setMessageFooter] = useState("WappFlow Broadcast");
  const [isBroadcasting, setIsBroadcasting] = useState(false);
  const [activeTab, setActiveTab] = useState<"editor" | "submissions">("editor");
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [loadingSubmissions, setLoadingSubmissions] = useState(false);

  useEffect(() => {
    // Fetch Flows
    const fetchFlows = async () => {
      try {
        const res = await fetch(`/api/org/${orgId}/flows`);
        if (res.ok) {
          const data = await res.json();
          setFlows(data.flows || []);
          setIsEncryptionSetup(data.encryptionSetup ?? true);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchFlows();
  }, [orgId]);

  const fetchSubmissions = async (flowId: string) => {
    setLoadingSubmissions(true);
    try {
      const res = await fetch(`/api/org/${orgId}/flows/${flowId}/responses`);
      if (res.ok) {
        const data = await res.json();
        setSubmissions(data.responses || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingSubmissions(false);
    }
  };

  const handleSelectFlow = (flow: any) => {
    setSelectedFlow(flow);
    setFlowJsonStr(JSON.stringify(flow.flowJson || {}, null, 2));
    setActiveTab("editor");
  };

  const handleSave = async () => {
    if (!selectedFlow) return;
    setIsSaving(true);
    try {
      let parsedJson = {};
      try {
        parsedJson = JSON.parse(flowJsonStr);
      } catch (e) {
        alert("Invalid JSON format");
        return;
      }

      const res = await fetch(`/api/org/${orgId}/flows/${selectedFlow.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ flowJson: parsedJson, name: selectedFlow.name }),
      });
      if (!res.ok) throw new Error("Failed to save to database");

      const updatedFlows = flows.map(f => f.id === selectedFlow.id ? { ...f, flowJson: parsedJson, name: selectedFlow.name } : f);
      setFlows(updatedFlows);
      alert("Flow JSON updated successfully!");
    } catch (err) {
      console.error(err);
      alert("Failed to save flow JSON");
    } finally {
      setIsSaving(false);
    }
  };

  const handlePublish = async () => {
    if (!selectedFlow) return;
    setIsSaving(true);
    try {
      const res = await fetch(`/api/org/${orgId}/flows/${selectedFlow.id}/publish`, {
        method: "POST"
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to publish");
      alert(`Successfully published to Meta. Flow ID: ${data.metaFlowId}`);
      
      const updatedFlows = flows.map(f => f.id === selectedFlow.id ? { ...f, status: "published", metaFlowId: data.metaFlowId } : f);
      setFlows(updatedFlows);
      setSelectedFlow({ ...selectedFlow, status: "published", metaFlowId: data.metaFlowId });
    } catch (err: any) {
      alert(err.message || "Failed to publish");
    } finally {
      setIsSaving(false);
    }
  };

  const handleOpenBroadcastModal = () => {
    if (!selectedFlow) return;
    setCampaignName(`${selectedFlow.name} Campaign - ${new Date().toLocaleDateString()}`);
    setTargetTag("all");
    setMessageTitle("Hey there! Please take a moment to fill out our form.");
    setCtaText("Open Form");
    setMessageFooter("WappFlow Broadcast");
    setShowBroadcastModal(true);
  };

  const handleBroadcastFlow = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFlow) return;

    setIsBroadcasting(true);
    try {
      const res = await fetch(`/api/org/${orgId}/flows/${selectedFlow.id}/broadcast`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: campaignName,
          targetTag,
          title: messageTitle,
          ctaText,
          footer: messageFooter
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to launch broadcast");
      alert(`Broadcast Campaign successfully launched! Active leads will be messaged in the background.`);
      setShowBroadcastModal(false);
    } catch (err: any) {
      alert(err.message || "Failed to launch broadcast");
    } finally {
      setIsBroadcasting(false);
    }
  };

  const handleCreateFlow = async () => {
    setIsSaving(true);
    try {
      const defaultFlowJson = {
        version: "7.3",
        screens: [
          {
            id: "WELCOME_SCREEN",
            title: "Welcome",
            terminal: true,
            layout: { type: "SingleColumnLayout", children: [] },
            data: {}
          }
        ]
      };

      const res = await fetch(`/api/org/${orgId}/flows`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: `New Flow ${flows.length + 1}`,
          category: "LEAD_GENERATION",
          flowJson: defaultFlowJson,
        }),
      });
      
      if (!res.ok) throw new Error("Failed to create flow");
      const data = await res.json();
      
      setFlows([data.flow, ...flows]);
      handleSelectFlow(data.flow);
    } catch (err) {
      console.error(err);
      alert("Failed to create flow");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSetupEncryption = async () => {
    setIsSettingUp(true);
    try {
      const res = await fetch(`/api/org/${orgId}/flows-encryption`, { method: "POST" });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to setup keys");
      }
      setIsEncryptionSetup(true);
      alert("Keys successfully generated and uploaded to Meta!");
    } catch (err: any) {
      console.error(err);
      alert(err.message || "Failed to setup encryption keys");
    } finally {
      setIsSettingUp(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden relative select-none bg-[#fafaf9]">
      {/* Encryption Overlay */}
      {!loading && !isEncryptionSetup && (
        <div className="absolute inset-0 z-50 backdrop-blur-sm bg-white/70 flex items-center justify-center">
          <div className="bg-white border border-stone-200 p-8 shadow-sm max-w-md text-center">
            <ShieldAlert className="w-12 h-12 text-wa-green mx-auto mb-4" />
            <h2 className="text-lg font-bold text-stone-900 mb-2">Automate Security Setup</h2>
            <p className="text-sm text-stone-500 mb-6">
              Meta requires an RSA Public Key to encrypt your form submissions. Click the button below to generate a secure keypair and upload it automatically.
            </p>
            <button
              onClick={handleSetupEncryption}
              disabled={isSettingUp}
              className="bg-wa-green hover:bg-wa-green-dark text-white font-bold py-2 px-6 rounded-none w-full flex justify-center items-center gap-2 transition-all cursor-pointer shadow-none active:scale-95 disabled:opacity-50"
            >
              {isSettingUp ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
              {isSettingUp ? "Setting up keys..." : "Generate & Upload Keys"}
            </button>
          </div>
        </div>
      )}

      {/* Top Header */}
      <header className="h-16 border-b border-stone-200 bg-[#fafaf9] px-6 flex items-center justify-between shrink-0 select-none">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-stone-950 rounded-none flex items-center justify-center border border-stone-950">
            <Layers className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="font-bold text-sm tracking-tight text-stone-900 uppercase">WhatsApp Flows</h1>
            <p className="text-[10px] text-stone-500">Native Meta Forms for Lead Capture & Surveys</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {selectedFlow && (
            <>
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="flex items-center gap-1.5 border border-stone-200 hover:border-stone-400 text-stone-700 bg-white px-3 py-1.5 rounded-none text-xs font-semibold cursor-pointer transition-all shadow-none"
              >
                <Settings2 className="w-3.5 h-3.5" />
                <span>Save JSON</span>
              </button>
              <button
                onClick={handlePublish}
                disabled={isSaving || selectedFlow.status === "published"}
                className={`flex items-center gap-1.5 text-xs font-bold px-4 py-1.5 rounded-none transition-all cursor-pointer border select-none ${
                  selectedFlow.status === "published"
                    ? "bg-stone-200 border-stone-300 text-stone-500 cursor-not-allowed"
                    : "bg-wa-green border-wa-green hover:bg-wa-green-dark text-white active:scale-95"
                }`}
              >
                {isSaving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Share2 className="w-3.5 h-3.5" />}
                <span>{selectedFlow.status === "published" ? "Published" : "Publish to Meta"}</span>
              </button>
              {selectedFlow.status === "published" && (
                <button
                  onClick={handleOpenBroadcastModal}
                  className="flex items-center gap-1.5 bg-[#121b22] border border-[#121b22] hover:bg-stone-900 text-white text-xs font-bold px-4 py-1.5 rounded-none transition-all cursor-pointer active:scale-95 animate-fade-in"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  <span>Broadcast Flow</span>
                </button>
              )}
            </>
          )}
          <button
            className="flex items-center gap-1.5 bg-stone-950 hover:bg-stone-900 border border-stone-950 text-white text-xs font-bold px-4 py-1.5 rounded-none transition-all cursor-pointer active:scale-95"
            onClick={handleCreateFlow}
            disabled={isSaving}
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Flow</span>
          </button>
        </div>
      </header>

      {/* Main Content Split */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Side: Flows List */}
        <div className="w-80 border-r border-stone-200 bg-[#fafaf9] flex flex-col overflow-y-auto">
          <div className="p-4 border-b border-stone-200 bg-stone-50">
            <h3 className="text-xs font-bold text-stone-900 uppercase tracking-wider">Your Flows</h3>
          </div>
          {loading ? (
            <div className="p-8 text-center text-stone-500">
              <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2" />
              <span className="text-xs">Loading flows...</span>
            </div>
          ) : flows.length === 0 ? (
            <div className="p-8 text-center text-stone-500 flex flex-col items-center">
              <LayoutTemplate className="w-8 h-8 mb-3 opacity-30" />
              <span className="text-xs font-semibold">No flows found.</span>
              <p className="text-[10px] mt-1 text-stone-400">Create one to start capturing data.</p>
            </div>
          ) : (
            flows.map((flow) => {
              const isSelected = selectedFlow?.id === flow.id;
              return (
                <div
                  key={flow.id}
                  className={`border-b border-stone-100 transition-colors ${
                    isSelected ? "bg-stone-50/50" : "hover:bg-stone-50"
                  }`}
                >
                  {/* Clickable Header */}
                  <button
                    onClick={() => handleSelectFlow(flow)}
                    className={`w-full text-left p-4 flex flex-col border-l-2 ${
                      isSelected ? "border-l-stone-900 bg-stone-50" : "border-l-transparent"
                    }`}
                  >
                    <div className="flex justify-between items-start mb-1 w-full">
                      <span className="font-bold text-sm text-stone-900 truncate pr-2">{flow.name}</span>
                      <span className={`text-[9px] uppercase font-bold px-1.5 py-0.5 border ${
                        flow.status === "published" ? "bg-wa-green-light border-wa-green text-wa-green-dark" : "bg-stone-200 border-stone-300 text-stone-600"
                      }`}>
                        {flow.status}
                      </span>
                    </div>
                    <div className="text-[10px] text-stone-500 flex justify-between items-center w-full">
                      <span>{flow.category}</span>
                      {flow.metaFlowId && <span className="font-mono bg-stone-200 px-1 rounded-none text-stone-700">{flow.metaFlowId}</span>}
                    </div>
                  </button>

                  {/* Sub-menu (Displays only when selected) */}
                  {isSelected && (
                    <div className="bg-stone-100/60 border-t border-stone-200 px-4 py-2 flex flex-col gap-1 select-none animate-slide-up">
                      <button
                        onClick={() => setActiveTab("editor")}
                        className={`w-full text-left py-1.5 px-3 text-xs font-semibold rounded-none flex items-center gap-2 transition-all ${
                          activeTab === "editor"
                            ? "bg-stone-200 text-stone-900"
                            : "text-stone-600 hover:text-stone-900 hover:bg-stone-200/50"
                        }`}
                      >
                        <Code className="w-3.5 h-3.5" />
                        <span>Configure & Edit</span>
                      </button>
                      <button
                        onClick={() => {
                          setActiveTab("submissions");
                          fetchSubmissions(flow.id);
                        }}
                        className={`w-full text-left py-1.5 px-3 text-xs font-semibold rounded-none flex items-center gap-2 transition-all ${
                          activeTab === "submissions"
                            ? "bg-stone-200 text-stone-900"
                            : "text-stone-600 hover:text-stone-900 hover:bg-stone-200/50"
                        }`}
                      >
                        <LayoutTemplate className="w-3.5 h-3.5" />
                        <span>Captured Submissions</span>
                      </button>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Right Side: JSON Editor */}
        <div className="flex-1 bg-white flex flex-col">
          {selectedFlow ? (
            activeTab === "editor" ? (
              <>
                <div className="h-12 border-b border-stone-200 bg-stone-50 flex items-center px-4 justify-between">
                  <div className="flex items-center gap-2">
                    <Code className="w-4 h-4 text-stone-500" />
                    <span className="text-xs font-bold text-stone-700 uppercase tracking-wider hidden sm:inline">Flow JSON Definition</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-stone-500 font-semibold uppercase tracking-wider">Name</span>
                    <input
                      type="text"
                      value={selectedFlow.name}
                      onChange={(e) => setSelectedFlow({ ...selectedFlow, name: e.target.value })}
                      className="bg-white border border-stone-200 text-xs text-stone-900 px-2 py-1 focus:outline-none focus:border-stone-400 focus:ring-0 w-48 rounded-none"
                      disabled={selectedFlow.status === "published"}
                    />
                  </div>
                </div>
                <div className="flex-1 p-4">
                  <textarea
                    value={flowJsonStr}
                    onChange={(e) => setFlowJsonStr(e.target.value)}
                    className="w-full h-full bg-[#fafaf9] text-stone-900 font-mono text-xs p-4 focus:outline-none border border-stone-200 resize-none"
                    spellCheck={false}
                  />
                </div>
              </>
            ) : (
              <div className="flex-1 flex flex-col overflow-hidden bg-white">
                {/* Header */}
                <div className="h-12 border-b border-stone-200 bg-stone-50 flex items-center px-6 shrink-0 justify-between select-none">
                  <div className="flex items-center gap-2">
                    <LayoutTemplate className="w-4 h-4 text-stone-500" />
                    <h3 className="text-xs font-bold text-stone-700 uppercase tracking-wider">
                      Captured Form Submissions
                    </h3>
                  </div>
                  <div className="text-[10px] bg-stone-200 text-stone-700 font-semibold px-2 py-0.5 rounded-none uppercase">
                    {submissions.length} {submissions.length === 1 ? "Response" : "Responses"}
                  </div>
                </div>

                {/* Table Body */}
                {loadingSubmissions ? (
                  <div className="flex-1 flex flex-col items-center justify-center text-stone-500">
                    <RefreshCw className="w-6 h-6 animate-spin mb-2" />
                    <span className="text-xs font-semibold">Retrieving submissions...</span>
                  </div>
                ) : submissions.length === 0 ? (
                  <div className="flex-1 flex flex-col items-center justify-center text-center p-8 select-none animate-fade-in">
                    <div className="w-12 h-12 bg-stone-50 border border-stone-200 flex items-center justify-center text-stone-400 mb-4 animate-bounce">
                      <LayoutTemplate className="w-6 h-6 opacity-30" />
                    </div>
                    <h4 className="font-bold text-stone-900 text-sm">No Submissions Recorded</h4>
                    <p className="text-stone-500 text-xs mt-1.5 max-w-[280px] leading-relaxed">
                      Once users start completing forms, their responses will show up here in real-time.
                    </p>
                  </div>
                ) : (
                  <div className="flex-1 overflow-auto custom-scrollbar animate-fade-in">
                    <table className="w-full text-left border-collapse text-xs select-text">
                      <thead>
                        <tr className="bg-stone-50 border-b border-stone-200 text-stone-500 select-none font-bold uppercase text-[9px] tracking-wider">
                          <th className="p-4 pl-6 font-bold">Contact</th>
                          {Array.from(new Set(submissions.flatMap((sub) => Object.keys(sub.submittedData || {})))).map((key) => (
                            <th key={key} className="p-4 font-bold">{key.replace(/_/g, " ")}</th>
                          ))}
                          <th className="p-4 pr-6 font-bold text-right">Submitted At</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-stone-100 font-medium text-stone-700">
                        {submissions.map((sub) => {
                          const keys = Array.from(new Set(submissions.flatMap((s) => Object.keys(s.submittedData || {}))));
                          return (
                            <tr key={sub.id} className="hover:bg-stone-50/50 transition-colors">
                              <td className="p-4 pl-6">
                                <div className="font-bold text-stone-900">{sub.contact?.name || "Unknown"}</div>
                                <div className="text-[10px] text-stone-400 font-mono mt-0.5">{sub.contact?.phone}</div>
                              </td>
                              {keys.map((key) => (
                                <td key={key} className="p-4 text-stone-950 font-semibold">
                                  {sub.submittedData?.[key] !== undefined
                                    ? String(sub.submittedData[key])
                                    : <span className="text-stone-300 font-normal">—</span>}
                                </td>
                              ))}
                              <td className="p-4 pr-6 text-right text-stone-500 text-[10px] font-mono">
                                {new Date(sub.createdAt).toLocaleString()}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-stone-400">
              <Layers className="w-12 h-12 mb-4 opacity-20" />
              <p className="text-sm font-semibold text-stone-500">Select a flow to edit</p>
              <p className="text-xs mt-1">Or create a new flow from the header</p>
            </div>
          )}
        </div>
      </div>

      {/* Broadcast Flow Configuration Modal */}
      {showBroadcastModal && selectedFlow && (
        <div className="fixed inset-0 z-[100] backdrop-blur-sm bg-stone-950/50 flex items-center justify-center animate-fade-in">
          <form
            onSubmit={handleBroadcastFlow}
            className="bg-white border border-stone-200 p-8 shadow-xl max-w-lg w-full flex flex-col gap-5 rounded-none animate-slide-up"
          >
            <div>
              <h2 className="text-sm font-bold text-stone-900 uppercase tracking-wider mb-1">Launch Flow Campaign</h2>
              <p className="text-[10px] text-stone-500">Mass broadcast this interactive WhatsApp Flow to a target tag segment.</p>
            </div>

            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-stone-700 uppercase tracking-wide">Campaign Name</label>
                <input
                  type="text"
                  required
                  value={campaignName}
                  onChange={(e) => setCampaignName(e.target.value)}
                  placeholder="e.g. Lead Capture Form Campaign"
                  className="w-full bg-stone-50 border border-stone-200 rounded-none px-3.5 py-2 text-xs font-semibold focus:outline-none focus:border-stone-900 focus:bg-white transition-all placeholder:text-stone-400"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-stone-700 uppercase tracking-wide">Target CRM Tag</label>
                <input
                  type="text"
                  required
                  value={targetTag}
                  onChange={(e) => setTargetTag(e.target.value)}
                  placeholder="e.g. VIP, Inbound, or 'all'"
                  className="w-full bg-stone-50 border border-stone-200 rounded-none px-3.5 py-2 text-xs font-semibold focus:outline-none focus:border-stone-900 focus:bg-white transition-all placeholder:text-stone-400"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-stone-700 uppercase tracking-wide">Message Body Text</label>
                <textarea
                  required
                  rows={3}
                  value={messageTitle}
                  onChange={(e) => setMessageTitle(e.target.value)}
                  placeholder="This text appears above the trigger button inside the WhatsApp chat."
                  className="w-full bg-stone-50 border border-stone-200 rounded-none px-3.5 py-2 text-xs font-semibold focus:outline-none focus:border-stone-900 focus:bg-white transition-all placeholder:text-stone-400 resize-none h-20"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-stone-700 uppercase tracking-wide">CTA Button Label</label>
                  <input
                    type="text"
                    required
                    value={ctaText}
                    onChange={(e) => setCtaText(e.target.value)}
                    placeholder="e.g. Open Form"
                    className="w-full bg-stone-50 border border-stone-200 rounded-none px-3.5 py-2 text-xs font-semibold focus:outline-none focus:border-stone-900 focus:bg-white transition-all placeholder:text-stone-400"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-stone-700 uppercase tracking-wide">Footer Text</label>
                  <input
                    type="text"
                    value={messageFooter}
                    onChange={(e) => setMessageFooter(e.target.value)}
                    placeholder="e.g. Powered by WappFlow"
                    className="w-full bg-stone-50 border border-stone-200 rounded-none px-3.5 py-2 text-xs font-semibold focus:outline-none focus:border-stone-900 focus:bg-white transition-all placeholder:text-stone-400"
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-2 shrink-0">
              <button
                type="button"
                onClick={() => setShowBroadcastModal(false)}
                className="flex-1 border border-stone-200 hover:border-stone-400 text-stone-700 bg-white px-4 py-2 text-xs font-bold cursor-pointer transition-all shadow-none rounded-none text-center"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isBroadcasting}
                className="flex-1 bg-wa-green hover:bg-wa-green-dark disabled:opacity-50 text-white font-bold py-2 px-6 rounded-none flex justify-center items-center gap-2 transition-all cursor-pointer active:scale-95 text-xs border border-wa-green hover:border-wa-green-dark"
              >
                {isBroadcasting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5 fill-current" />}
                <span>{isBroadcasting ? "Launching..." : "Launch Campaign"}</span>
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
