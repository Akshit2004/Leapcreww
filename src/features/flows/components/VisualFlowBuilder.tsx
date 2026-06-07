import React, { useState, useEffect, useRef } from "react";
import { Plus, Trash2, Settings2, GripVertical, Type, List, CheckSquare, CircleDot, Calendar, LayoutTemplate } from "lucide-react";
import { MobileFlowPreview } from "./MobileFlowPreview";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";

interface VisualFlowBuilderProps {
  flowJsonStr: string;
  onChange: (jsonStr: string) => void;
}

interface Field {
  id: string;
  type: string;
  label: string;
  name: string;
  required: boolean;
  options?: string[];
}

interface Screen {
  id: string;
  title: string;
  fields: Field[];
}

const FIELD_TYPES = [
  { id: "TextInput", label: "Text Input", icon: Type },
  { id: "Dropdown", label: "Dropdown", icon: List },
  { id: "CheckboxGroup", label: "Checkboxes", icon: CheckSquare },
  { id: "RadioButtons", label: "Radio Buttons", icon: CircleDot },
  { id: "DatePicker", label: "Date Picker", icon: Calendar },
];

const generateId = () => Math.random().toString(36).substr(2, 9);

export const VisualFlowBuilder: React.FC<VisualFlowBuilderProps> = ({ flowJsonStr, onChange }) => {
  const [screens, setScreens] = useState<Screen[]>([]);
  const [activeScreenIndex, setActiveScreenIndex] = useState(0);
  const [isInitializing, setIsInitializing] = useState(true);

  // Initialize state from existing JSON
  useEffect(() => {
    if (!isInitializing) return;
    
    try {
      const parsed = JSON.parse(flowJsonStr || "{}");
      if (parsed.screens && Array.isArray(parsed.screens)) {
        const parsedScreens: Screen[] = parsed.screens.map((s: any) => {
          const fields: Field[] = [];
          
          // Basic attempt to parse layout children into our Field model
          if (s.layout?.children) {
            s.layout.children.forEach((child: any) => {
              if (child.type === "Form" && child.children) {
                child.children.forEach((formChild: any) => {
                  if (formChild.type !== "Footer") {
                    fields.push({
                      id: generateId(),
                      type: formChild.type,
                      label: formChild.label || "",
                      name: formChild.name || "",
                      required: formChild.required || false,
                      options: formChild.dataSource?.map((d: any) => d.title) || ["Option 1", "Option 2"]
                    });
                  }
                });
              }
            });
          }
          
          return {
            id: s.id || generateId(),
            title: s.title || "Untitled Screen",
            fields
          };
        });
        setScreens(parsedScreens.length > 0 ? parsedScreens : [{ id: generateId(), title: "Welcome", fields: [] }]);
      } else {
        setScreens([{ id: "WELCOME_SCREEN", title: "Welcome", fields: [] }]);
      }
    } catch (e) {
      console.error("Failed to parse flow JSON", e);
      setScreens([{ id: "WELCOME_SCREEN", title: "Welcome", fields: [] }]);
    } finally {
      setIsInitializing(false);
    }
  }, [flowJsonStr, isInitializing]);

  // Sync state back to JSON
  useEffect(() => {
    if (isInitializing) return;
    
    const flowJson = {
      version: "7.3",
      screens: screens.map((screen, idx) => {
        const formChildren = screen.fields.map(f => {
          const base: any = {
            type: f.type,
            label: f.label,
            name: f.name || f.label.toLowerCase().replace(/\s+/g, '_'),
            required: f.required
          };
          if (f.type === "Dropdown" || f.type === "RadioButtons" || f.type === "CheckboxGroup") {
            base.dataSource = (f.options || []).map(opt => ({ id: opt.toLowerCase().replace(/\s+/g, '_'), title: opt }));
          }
          return base;
        });

        // Add footer button
        formChildren.push({
          type: "Footer",
          label: idx === screens.length - 1 ? "Submit" : "Next",
          "on-click-action": {
            name: idx === screens.length - 1 ? "complete" : "navigate",
            payload: idx === screens.length - 1 ? {} : { next: screens[idx + 1]?.id }
          }
        } as any);

        return {
          id: screen.id,
          title: screen.title,
          terminal: idx === screens.length - 1,
          data: {},
          layout: {
            type: "SingleColumnLayout",
            children: [
              {
                type: "Form",
                name: `form_${screen.id}`,
                children: formChildren
              }
            ]
          }
        };
      })
    };

    const newJsonStr = JSON.stringify(flowJson, null, 2);
    if (newJsonStr !== flowJsonStr) {
      onChange(newJsonStr);
    }
  }, [screens, isInitializing]);

  const activeScreen = screens[activeScreenIndex];

  const handleAddField = (type: string) => {
    if (!activeScreen) return;
    const newField: Field = {
      id: generateId(),
      type,
      label: `New ${type}`,
      name: `field_${generateId()}`,
      required: false,
      options: ["Option 1", "Option 2"]
    };
    
    const updatedScreens = [...screens];
    updatedScreens[activeScreenIndex].fields.push(newField);
    setScreens(updatedScreens);
  };

  const updateField = (fieldId: string, updates: Partial<Field>) => {
    const updatedScreens = [...screens];
    const fieldIndex = updatedScreens[activeScreenIndex].fields.findIndex(f => f.id === fieldId);
    if (fieldIndex > -1) {
      updatedScreens[activeScreenIndex].fields[fieldIndex] = { ...updatedScreens[activeScreenIndex].fields[fieldIndex], ...updates };
      setScreens(updatedScreens);
    }
  };

  const deleteField = (fieldId: string) => {
    const updatedScreens = [...screens];
    updatedScreens[activeScreenIndex].fields = updatedScreens[activeScreenIndex].fields.filter(f => f.id !== fieldId);
    setScreens(updatedScreens);
  };

  const addScreen = () => {
    setScreens([...screens, { id: `SCREEN_${generateId()}`, title: `Screen ${screens.length + 1}`, fields: [] }]);
    setActiveScreenIndex(screens.length);
  };

  if (isInitializing) return null;

  return (
    <div className="flex-1 flex overflow-hidden">
      {/* Left Panel: Builder Controls */}
      <div className="w-[450px] border-r border-stone-200 bg-white flex flex-col overflow-y-auto custom-scrollbar shadow-[4px_0_24px_rgba(0,0,0,0.02)] z-10 shrink-0">
        
        {/* Screen Selector */}
        <div className="p-4 border-b border-stone-100 bg-stone-50/50">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-bold text-stone-900 uppercase tracking-wider">Flow Screens</h3>
            <button 
              onClick={addScreen}
              className="p-1 hover:bg-stone-200 rounded-none transition-colors text-stone-600"
              title="Add Screen"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-2 custom-scrollbar">
            {screens.map((screen, idx) => (
              <button
                key={screen.id}
                onClick={() => setActiveScreenIndex(idx)}
                className={`px-3 py-1.5 text-xs font-semibold whitespace-nowrap transition-all border ${
                  idx === activeScreenIndex 
                    ? "bg-wa-green text-white border-wa-green shadow-sm" 
                    : "bg-white text-stone-600 border-stone-200 hover:border-stone-300"
                }`}
              >
                {screen.title}
              </button>
            ))}
          </div>
        </div>

        {activeScreen && (
          <div className="p-5 flex-1 flex flex-col">
            <div className="mb-6">
              <label className="text-[10px] font-bold text-stone-500 uppercase tracking-wider mb-1 block">Screen Title</label>
              <input 
                type="text" 
                value={activeScreen.title}
                onChange={(e) => {
                  const updated = [...screens];
                  updated[activeScreenIndex].title = e.target.value;
                  setScreens(updated);
                }}
                className="w-full text-lg font-bold text-stone-900 bg-transparent border-b border-stone-200 focus:border-wa-green focus:outline-none pb-1 transition-colors"
              />
            </div>

            <div className="flex items-center justify-between mb-4">
              <h4 className="text-xs font-bold text-stone-900 uppercase tracking-wider">Form Fields</h4>
            </div>

            {/* Field List */}
            <div className="flex flex-col gap-3 mb-8 min-h-[100px]">
              {activeScreen.fields.length === 0 ? (
                <div className="text-center p-6 border border-dashed border-stone-300 bg-stone-50/50 text-stone-500 flex flex-col items-center">
                  <LayoutTemplate className="w-6 h-6 mb-2 opacity-30" />
                  <span className="text-xs font-semibold">No fields on this screen.</span>
                  <span className="text-[10px] mt-1">Add a field from below to get started.</span>
                </div>
              ) : (
                activeScreen.fields.map((field) => (
                  <div key={field.id} className="border border-stone-200 bg-white group hover:border-wa-green/50 transition-colors shadow-sm">
                    <div className="flex items-center p-3 bg-stone-50 border-b border-stone-100">
                      <GripVertical className="w-4 h-4 text-stone-400 cursor-grab mr-2 opacity-50 group-hover:opacity-100" />
                      <div className="flex-1 text-xs font-bold text-stone-700 flex items-center gap-2">
                        {FIELD_TYPES.find(t => t.id === field.type)?.icon && React.createElement(FIELD_TYPES.find(t => t.id === field.type)!.icon, { className: "w-3.5 h-3.5 text-wa-green" })}
                        {field.type}
                      </div>
                      <button 
                        onClick={() => deleteField(field.id)}
                        className="p-1 text-stone-400 hover:text-red-500 hover:bg-red-50 transition-colors opacity-0 group-hover:opacity-100"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    
                    <div className="p-4 flex flex-col gap-3">
                      <div className="flex flex-col gap-1">
                        <label className="text-[10px] font-bold text-stone-500 uppercase tracking-wider">Field Label</label>
                        <input 
                          type="text" 
                          value={field.label}
                          onChange={(e) => updateField(field.id, { label: e.target.value })}
                          className="w-full border border-stone-200 bg-stone-50 px-2 py-1.5 text-xs focus:outline-none focus:border-stone-900 focus:bg-white transition-colors"
                        />
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <input 
                          type="checkbox" 
                          id={`req-${field.id}`}
                          checked={field.required}
                          onChange={(e) => updateField(field.id, { required: e.target.checked })}
                          className="accent-wa-green w-3.5 h-3.5"
                        />
                        <label htmlFor={`req-${field.id}`} className="text-xs font-semibold text-stone-700 select-none cursor-pointer">
                          Required Field
                        </label>
                      </div>

                      {(field.type === "Dropdown" || field.type === "CheckboxGroup" || field.type === "RadioButtons") && (
                        <div className="flex flex-col gap-1 mt-2 border-t border-stone-100 pt-3">
                          <label className="text-[10px] font-bold text-stone-500 uppercase tracking-wider">Options (Comma separated)</label>
                          <input 
                            type="text" 
                            value={field.options?.join(", ")}
                            onChange={(e) => updateField(field.id, { options: e.target.value.split(",").map(s => s.trim()).filter(Boolean) })}
                            className="w-full border border-stone-200 bg-stone-50 px-2 py-1.5 text-xs focus:outline-none focus:border-stone-900 focus:bg-white transition-colors"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Add Field Palette */}
            <div className="mt-auto pt-6 border-t border-stone-200">
              <h4 className="text-[10px] font-bold text-stone-500 uppercase tracking-wider mb-3 block">Add Field</h4>
              <div className="grid grid-cols-2 gap-2">
                {FIELD_TYPES.map((type) => {
                  const Icon = type.icon;
                  return (
                    <button
                      key={type.id}
                      onClick={() => handleAddField(type.id)}
                      className="flex items-center gap-2 p-2 border border-stone-200 bg-stone-50 hover:bg-white hover:border-wa-green hover:shadow-sm transition-all text-left group"
                    >
                      <div className="w-6 h-6 bg-white border border-stone-200 flex items-center justify-center group-hover:border-wa-green/30 transition-colors">
                        <Icon className="w-3.5 h-3.5 text-stone-500 group-hover:text-wa-green transition-colors" />
                      </div>
                      <span className="text-xs font-semibold text-stone-700 group-hover:text-stone-900">{type.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

          </div>
        )}
      </div>

      {/* Right Panel: Live Preview */}
      <MobileFlowPreview screens={screens} activeScreenIndex={activeScreenIndex} />

    </div>
  );
};
