import React, { useRef } from "react";
import { Battery, Wifi, Signal, ChevronLeft, MoreVertical } from "lucide-react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";

interface Field {
  id: string;
  type: string;
  label: string;
  required: boolean;
  options?: string[];
}

interface Screen {
  id: string;
  title: string;
  fields: Field[];
}

interface MobileFlowPreviewProps {
  screens: Screen[];
  activeScreenIndex: number;
}

export const MobileFlowPreview: React.FC<MobileFlowPreviewProps> = ({ screens, activeScreenIndex }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const activeScreen = screens[activeScreenIndex] || null;

  useGSAP(() => {
    if (!containerRef.current) return;
    
    // Animate screen transition
    gsap.fromTo(
      ".mobile-screen-content",
      { opacity: 0, x: 20 },
      { opacity: 1, x: 0, duration: 0.3, ease: "power2.out", clearProps: "all" }
    );
  }, [activeScreenIndex]);

  useGSAP(() => {
    // Animate new fields being added
    gsap.fromTo(
      ".field-item",
      { opacity: 0, y: 10 },
      { opacity: 1, y: 0, duration: 0.3, stagger: 0.05, ease: "power2.out" }
    );
  }, [activeScreen?.fields.length]);

  return (
    <div className="flex-1 bg-stone-100 flex items-center justify-center p-8 relative overflow-hidden" ref={containerRef}>
      {/* Decorative background elements */}
      <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-wa-green/5 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-stone-900/5 rounded-full blur-3xl pointer-events-none"></div>

      {/* Mobile Device Frame */}
      <div className="w-[280px] h-[580px] bg-white rounded-[36px] shadow-2xl border-[6px] border-stone-900 relative overflow-hidden flex flex-col z-10 shrink-0">
        
        {/* Dynamic Island / Notch */}
        <div className="absolute top-0 inset-x-0 h-5 flex justify-center z-50">
          <div className="w-28 h-5 bg-stone-900 rounded-b-2xl"></div>
        </div>

        {/* Status Bar */}
        <div className="h-12 bg-[#075E54] w-full flex items-end justify-between px-6 pb-2 text-white/90 z-40 shrink-0">
          <span className="text-[10px] font-semibold tracking-wider">9:41</span>
          <div className="flex items-center gap-1.5">
            <Signal className="w-3 h-3" />
            <Wifi className="w-3 h-3" />
            <Battery className="w-4 h-4" />
          </div>
        </div>

        {/* WhatsApp Header */}
        <div className="h-14 bg-[#075E54] w-full flex items-center justify-between px-3 text-white shadow-sm shrink-0 z-40">
          <div className="flex items-center gap-2">
            <ChevronLeft className="w-6 h-6" />
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
                <span className="text-xs font-bold">WF</span>
              </div>
              <span className="font-semibold text-sm">LeapCreww</span>
            </div>
          </div>
          <MoreVertical className="w-5 h-5 opacity-80" />
        </div>

        {/* Chat / Flow Area */}
        <div className="flex-1 bg-[#E5DDD5] relative overflow-y-auto custom-scrollbar flex flex-col p-4">
          {/* Chat Background Pattern (Simulated) */}
          <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: "url('data:image/svg+xml,%3Csvg width=\"20\" height=\"20\" xmlns=\"http://www.w3.org/2000/svg\"%3E%3Cpath d=\"M0 0h20v20H0z\" fill=\"none\"/%3E%3Cpath d=\"M10 10l5-5-5-5-5 5 5 5z\" fill=\"%23000\"/%3E%3C/svg%3E')" }}></div>
          
          <div className="flex-1"></div>

          {/* Flow Container */}
          {activeScreen ? (
            <div className="bg-white rounded-xl shadow-sm overflow-hidden flex flex-col mt-4 mobile-screen-content w-full relative z-10">
              {/* Screen Header */}
              <div className="bg-[#f0f2f5] px-4 py-3 border-b border-stone-200">
                <h3 className="font-bold text-stone-900 text-sm">{activeScreen.title || "Untitled Screen"}</h3>
              </div>

              {/* Form Content */}
              <div className="p-4 flex flex-col gap-4">
                {activeScreen.fields.length === 0 ? (
                  <div className="text-center py-6 text-stone-400 text-xs italic">
                    No fields added to this screen yet.
                  </div>
                ) : (
                  activeScreen.fields.map((field) => (
                    <div key={field.id} className="flex flex-col gap-1.5 field-item">
                      <label className="text-[11px] font-bold text-stone-700">
                        {field.label || "Untitled Field"} {field.required && <span className="text-red-500">*</span>}
                      </label>
                      
                      {field.type === "TextInput" && (
                        <input 
                          type="text" 
                          disabled 
                          placeholder="Text response..." 
                          className="w-full border-b border-stone-300 bg-stone-50 px-3 py-2 text-xs focus:outline-none focus:border-[#00A884]"
                        />
                      )}

                      {field.type === "Dropdown" && (
                        <select disabled className="w-full border border-stone-300 bg-stone-50 px-3 py-2 text-xs text-stone-500 rounded-lg appearance-none">
                          <option>Select an option...</option>
                        </select>
                      )}

                      {field.type === "CheckboxGroup" && (
                        <div className="flex flex-col gap-2 mt-1">
                          {(field.options || ["Option 1", "Option 2"]).map((opt, i) => (
                            <div key={i} className="flex items-center gap-2">
                              <div className="w-4 h-4 rounded border border-stone-300 bg-white"></div>
                              <span className="text-[11px] text-stone-600">{opt}</span>
                            </div>
                          ))}
                        </div>
                      )}

                      {field.type === "RadioButtons" && (
                        <div className="flex flex-col gap-2 mt-1">
                          {(field.options || ["Option 1", "Option 2"]).map((opt, i) => (
                            <div key={i} className="flex items-center gap-2">
                              <div className="w-4 h-4 rounded-full border border-stone-300 bg-white"></div>
                              <span className="text-[11px] text-stone-600">{opt}</span>
                            </div>
                          ))}
                        </div>
                      )}

                      {field.type === "DatePicker" && (
                        <div className="w-full border-b border-stone-300 bg-stone-50 px-3 py-2 text-xs text-stone-500 flex justify-between items-center">
                          <span>Select date</span>
                          <div className="w-3 h-3 border border-stone-400 rounded-sm"></div>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>

              {/* Action Button */}
              <div className="px-4 pb-4">
                <button disabled className="w-full bg-[#00A884] text-white font-bold text-xs py-3 rounded-lg opacity-90">
                  Continue
                </button>
              </div>
            </div>
          ) : (
             <div className="bg-white rounded-xl shadow-sm p-6 text-center text-stone-400 text-xs italic w-full">
               Create a screen to preview
             </div>
          )}
        </div>
      </div>
    </div>
  );
};
