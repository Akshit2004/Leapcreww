import React from "react";
import { X } from "lucide-react";

interface TagBadgeProps {
  tag: string;
  onRemove?: () => void;
  className?: string;
}

const colorPairs = [
  "bg-blue-100 text-blue-700 border-blue-200",
  "bg-emerald-100 text-emerald-700 border-emerald-200",
  "bg-amber-100 text-amber-700 border-amber-200",
  "bg-rose-100 text-rose-700 border-rose-200",
  "bg-purple-100 text-purple-700 border-purple-200",
  "bg-indigo-100 text-indigo-700 border-indigo-200",
  "bg-teal-100 text-teal-700 border-teal-200",
  "bg-fuchsia-100 text-fuchsia-700 border-fuchsia-200",
  "bg-orange-100 text-orange-700 border-orange-200",
  "bg-cyan-100 text-cyan-700 border-cyan-200",
];

export const getTagColor = (tag: string) => {
  let hash = 0;
  for (let i = 0; i < tag.length; i++) {
    hash = tag.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % colorPairs.length;
  return colorPairs[index];
};

export const TagBadge: React.FC<TagBadgeProps> = ({ tag, onRemove, className = "" }) => {
  const colorClass = getTagColor(tag);

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider border transition-all duration-200 shadow-sm ${colorClass} ${className}`}
    >
      {tag}
      {onRemove && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="hover:bg-black/10 rounded-full p-0.5 transition-colors focus:outline-none"
        >
          <X className="w-3 h-3" />
        </button>
      )}
    </span>
  );
};
