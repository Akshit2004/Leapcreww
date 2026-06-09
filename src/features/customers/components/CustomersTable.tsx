import React, { useState } from "react";
import { Contact } from "@/shared/context/types";
import { TagBadge } from "./TagBadge";
import { Check, Plus, Mail, Phone, Clock, User } from "lucide-react";

interface CustomersTableProps {
  contacts: Contact[];
  selectedIds: Set<string>;
  onToggleSelect: (id: string) => void;
  onToggleSelectAll: () => void;
  onUpdateTags: (id: string, tags: string[]) => void;
  onUpdateName?: (id: string, name: string) => void;
}

export const CustomersTable: React.FC<CustomersTableProps> = ({
  contacts,
  selectedIds,
  onToggleSelect,
  onToggleSelectAll,
  onUpdateTags,
  onUpdateName,
}) => {
  const [editingTagContactId, setEditingTagContactId] = useState<string | null>(null);
  const [newTagValue, setNewTagValue] = useState("");
  
  const [editingNameContactId, setEditingNameContactId] = useState<string | null>(null);
  const [newNameValue, setNewNameValue] = useState("");

  const allSelected = contacts.length > 0 && selectedIds.size === contacts.length;
  const isIndeterminate = selectedIds.size > 0 && selectedIds.size < contacts.length;

  const handleAddTag = (id: string, currentTags: string[]) => {
    if (!newTagValue.trim()) {
      setEditingTagContactId(null);
      return;
    }
    const cleanTag = newTagValue.trim();
    if (!currentTags.includes(cleanTag)) {
      onUpdateTags(id, [...currentTags, cleanTag]);
    }
    setNewTagValue("");
    setEditingTagContactId(null);
  };

  const handleRemoveTag = (id: string, currentTags: string[], tagToRemove: string) => {
    onUpdateTags(
      id,
      currentTags.filter((t) => t !== tagToRemove)
    );
  };

  const handleUpdateNameSubmit = (id: string) => {
    if (newNameValue.trim() && onUpdateName) {
      onUpdateName(id, newNameValue.trim());
    }
    setEditingNameContactId(null);
  };

  if (contacts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 bg-white rounded-2xl border border-stone-200/60 shadow-sm animate-fade-in">
        <div className="w-16 h-16 bg-stone-100 rounded-full flex items-center justify-center text-stone-400 mb-4">
          <User className="w-8 h-8" />
        </div>
        <h3 className="text-stone-900 font-bold text-lg">No customers found</h3>
        <p className="text-stone-500 text-sm mt-1">Try adjusting your filters or search query.</p>
      </div>
    );
  }

  return (
    <div className="bg-white border border-stone-200/60 rounded-2xl shadow-sm overflow-hidden animate-fade-in flex flex-col">
      <div className="overflow-x-auto flex-1 custom-scrollbar">
        <table className="w-full text-left border-collapse min-w-[800px]">
          <thead>
            <tr className="bg-stone-50/80 border-b border-stone-200/80 text-[10px] uppercase font-black text-stone-500 tracking-wider">
              <th className="p-4 w-12 text-center">
                <button
                  onClick={onToggleSelectAll}
                  className={`w-4 h-4 rounded-[4px] border flex items-center justify-center transition-colors ${
                    allSelected
                      ? "bg-wa-green border-wa-green text-white"
                      : isIndeterminate
                      ? "bg-wa-green border-wa-green text-white"
                      : "border-stone-300 hover:border-wa-green"
                  }`}
                >
                  {(allSelected || isIndeterminate) && <Check className="w-3 h-3" />}
                </button>
              </th>
              <th className="p-4 font-black">Customer</th>
              <th className="p-4 font-black">Contact Info</th>
              <th className="p-4 font-black">Tags</th>
              <th className="p-4 font-black">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100 text-sm">
            {contacts.map((contact) => {
              const isSelected = selectedIds.has(contact.id);
              return (
                <tr
                  key={contact.id}
                  className={`group transition-colors hover:bg-stone-50/50 ${
                    isSelected ? "bg-wa-green/5 hover:bg-wa-green/10" : ""
                  }`}
                >
                  <td className="p-4 text-center">
                    <button
                      onClick={() => onToggleSelect(contact.id)}
                      className={`w-4 h-4 rounded-[4px] border flex items-center justify-center transition-colors ${
                        isSelected
                          ? "bg-wa-green border-wa-green text-white"
                          : "border-stone-300 group-hover:border-wa-green bg-white"
                      }`}
                    >
                      {isSelected && <Check className="w-3 h-3" />}
                    </button>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-stone-100 border border-stone-200 flex items-center justify-center text-stone-600 font-bold uppercase text-xs">
                        {contact.name.charAt(0)}
                      </div>
                      <div>
                        {editingNameContactId === contact.id ? (
                          <input
                            autoFocus
                            type="text"
                            value={newNameValue}
                            onChange={(e) => setNewNameValue(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") handleUpdateNameSubmit(contact.id);
                              if (e.key === "Escape") setEditingNameContactId(null);
                            }}
                            onBlur={() => handleUpdateNameSubmit(contact.id)}
                            className="font-bold text-stone-900 border-b-2 border-wa-green focus:outline-none bg-transparent w-full"
                          />
                        ) : (
                          <div 
                            className="font-bold text-stone-900 cursor-pointer hover:text-wa-green transition-colors border-b-2 border-transparent hover:border-wa-green/30"
                            onClick={() => {
                              setEditingNameContactId(contact.id);
                              setNewNameValue(contact.name);
                            }}
                            title="Click to edit name"
                          >
                            {contact.name}
                          </div>
                        )}
                        <div className="text-xs text-stone-500 flex items-center gap-1 mt-0.5">
                          <Clock className="w-3 h-3" />
                          <span>Last msg: {contact.lastMessageTime || "Never"}</span>
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5 text-stone-600 text-xs">
                        <Phone className="w-3.5 h-3.5 text-stone-400" />
                        {contact.phone}
                      </div>
                      {contact.email && (
                        <div className="flex items-center gap-1.5 text-stone-600 text-xs">
                          <Mail className="w-3.5 h-3.5 text-stone-400" />
                          <span className="truncate max-w-[150px]">{contact.email}</span>
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="flex flex-wrap items-center gap-1.5">
                      {contact.tags && contact.tags.length > 0 ? (
                        contact.tags.map((tag) => (
                          <TagBadge
                            key={tag}
                            tag={tag}
                            onRemove={() => handleRemoveTag(contact.id, contact.tags, tag)}
                          />
                        ))
                      ) : (
                        <span className="text-xs text-stone-400 italic">No tags</span>
                      )}

                      {editingTagContactId === contact.id ? (
                        <div className="flex items-center gap-1 animate-fade-in">
                          <input
                            autoFocus
                            type="text"
                            value={newTagValue}
                            onChange={(e) => setNewTagValue(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") handleAddTag(contact.id, contact.tags || []);
                              if (e.key === "Escape") setEditingTagContactId(null);
                            }}
                            onBlur={() => handleAddTag(contact.id, contact.tags || [])}
                            className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 w-20 border-b-2 border-wa-green focus:outline-none bg-transparent"
                            placeholder="NEW TAG..."
                          />
                        </div>
                      ) : (
                        <button
                          onClick={() => {
                            setEditingTagContactId(contact.id);
                            setNewTagValue("");
                          }}
                          className="w-5 h-5 rounded-full border border-dashed border-stone-300 text-stone-400 hover:text-wa-green hover:border-wa-green flex items-center justify-center transition-colors opacity-0 group-hover:opacity-100"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </td>
                  <td className="p-4">
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                        contact.status === "Active"
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          : "bg-stone-50 text-stone-600 border border-stone-200"
                      }`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          contact.status === "Active" ? "bg-emerald-500" : "bg-stone-400"
                        }`}
                      />
                      {contact.status}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
