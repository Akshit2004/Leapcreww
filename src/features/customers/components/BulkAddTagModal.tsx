import React, { useState } from "react";
import { Tag, X } from "lucide-react";

interface BulkAddTagModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (tag: string) => void;
  selectedCount: number;
  isSubmitting?: boolean;
}

export const BulkAddTagModal: React.FC<BulkAddTagModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  selectedCount,
  isSubmitting = false,
}) => {
  const [tagValue, setTagValue] = useState("");
  const [prevIsOpen, setPrevIsOpen] = useState(isOpen);

  // Detect isOpen changes synchronously in render, before component returns
  if (isOpen !== prevIsOpen) {
    setPrevIsOpen(isOpen);
    if (isOpen) {
      setTagValue("");
    }
  }

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (tagValue.trim()) {
      onConfirm(tagValue.trim());
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-0">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-stone-900/40 backdrop-blur-sm animate-fade-in transition-opacity"
        onClick={onClose}
      />
      
      {/* Modal Dialog (Material Design Inspired Elevation & Radius) */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-slide-up sm:scale-100">
        
        <div className="px-6 py-5 border-b border-stone-100 flex items-center justify-between">
          <h3 className="text-lg font-bold text-stone-900 flex items-center gap-2 tracking-tight">
            <Tag className="w-5 h-5 text-wa-green" />
            Add Tag
          </h3>
          <button 
            onClick={onClose}
            className="text-stone-400 hover:text-stone-600 hover:bg-stone-100 p-1.5 rounded-full transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          <p className="text-sm text-stone-500 mb-4 font-medium">
            Enter a tag to assign to the <strong className="text-stone-800">{selectedCount}</strong> selected customer{selectedCount !== 1 ? 's' : ''}.
          </p>
          
          <div className="mb-6">
            <input
              autoFocus
              type="text"
              placeholder="e.g. VIP, Lead, Needs Follow-up"
              value={tagValue}
              onChange={(e) => setTagValue(e.target.value)}
              className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 text-sm text-stone-800 focus:outline-none focus:ring-2 focus:ring-wa-green/20 focus:border-wa-green transition-all shadow-sm placeholder:text-stone-400 font-medium"
            />
          </div>

          <div className="flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-sm font-bold text-stone-600 hover:bg-stone-100 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!tagValue.trim() || isSubmitting}
              className="px-5 py-2.5 rounded-xl text-sm font-bold text-white bg-wa-green hover:bg-wa-green-dark shadow-md shadow-wa-green/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? "Adding..." : "Add Tag"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
