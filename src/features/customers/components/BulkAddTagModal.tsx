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
      
      {/* Modal Dialog */}
      <div className="relative kc-float rounded-2xl w-full max-w-sm overflow-hidden animate-slide-up sm:scale-100">

        <div className="border-b border-stone-100 px-6 py-4 flex items-center justify-between">
          <h3 className="text-lg font-bold text-stone-900 flex items-center gap-2 tracking-tight">
            <Tag className="w-5 h-5 text-wa-green" />
            Add Tag
          </h3>
          <button
            onClick={onClose}
            className="ds-btn ds-btn-ghost ds-btn-sm !p-1.5"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          <p className="text-sm text-stone-500 mb-4 font-medium">
            Enter a tag to assign to the <strong className="text-stone-800">{selectedCount}</strong> selected customer{selectedCount !== 1 ? "s" : ""}.
          </p>

          <div className="mb-6">
            <input
              autoFocus
              type="text"
              placeholder="e.g. VIP, Lead, Needs Follow-up"
              value={tagValue}
              onChange={(e) => setTagValue(e.target.value)}
              className="ds-input"
            />
          </div>

          <div className="border-t border-stone-100 pt-4 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="ds-btn ds-btn-secondary"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!tagValue.trim() || isSubmitting}
              className="ds-btn ds-btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? "Adding..." : "Add Tag"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
