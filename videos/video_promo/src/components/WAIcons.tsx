import React from "react";

// Minimal inline WhatsApp-style glyphs (stroke uses currentColor).
type P = { size?: number; color?: string };

export const Chevron: React.FC<P> = ({ size = 24, color = "currentColor" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <path d="M15 18l-6-6 6-6" stroke={color} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const VideoIcon: React.FC<P> = ({ size = 22, color = "currentColor" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <rect x="2" y="6" width="13" height="12" rx="2.5" stroke={color} strokeWidth={1.9} />
    <path d="M16 10l5-3v10l-5-3z" fill={color} />
  </svg>
);

export const PhoneIcon: React.FC<P> = ({ size = 20, color = "currentColor" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
    <path d="M6.6 10.8c1.4 2.8 3.8 5.2 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1C10.6 21 3 13.4 3 4c0-.6.4-1 1-1h3.4c.6 0 1 .4 1 1 0 1.3.2 2.5.6 3.6.1.4 0 .8-.3 1.1l-2.1 2.1z" />
  </svg>
);

export const Dots: React.FC<P> = ({ size = 20, color = "currentColor" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
    <circle cx="12" cy="5" r="1.8" /><circle cx="12" cy="12" r="1.8" /><circle cx="12" cy="19" r="1.8" />
  </svg>
);

export const Smiley: React.FC<P> = ({ size = 24, color = "currentColor" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <circle cx="12" cy="12" r="9" stroke={color} strokeWidth={1.8} />
    <circle cx="9" cy="10" r="1.2" fill={color} /><circle cx="15" cy="10" r="1.2" fill={color} />
    <path d="M8.5 14.5c.9 1.2 2.1 1.8 3.5 1.8s2.6-.6 3.5-1.8" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
  </svg>
);

export const Attach: React.FC<P> = ({ size = 24, color = "currentColor" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <path d="M16.5 6.5l-7 7a2.5 2.5 0 003.5 3.5l7.2-7.2a4.2 4.2 0 00-6-6L6 10.8" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const Camera: React.FC<P> = ({ size = 23, color = "currentColor" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <path d="M4 8h3l1.5-2h7L17 8h3a1 1 0 011 1v9a1 1 0 01-1 1H4a1 1 0 01-1-1V9a1 1 0 011-1z" stroke={color} strokeWidth={1.7} strokeLinejoin="round" />
    <circle cx="12" cy="13" r="3.2" stroke={color} strokeWidth={1.7} />
  </svg>
);

export const Mic: React.FC<P> = ({ size = 22, color = "#FFFFFF" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
    <rect x="9" y="3" width="6" height="11" rx="3" />
    <path d="M6 11a6 6 0 0012 0M12 17v3M9 20h6" stroke={color} strokeWidth={1.8} fill="none" strokeLinecap="round" />
  </svg>
);

export const Reply: React.FC<P> = ({ size = 16, color = "currentColor" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <path d="M9 7L4 12l5 5M4 12h9a6 6 0 016 6v1" stroke={color} strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const ListIcon: React.FC<P> = ({ size = 18, color = "currentColor" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <path d="M8 7h12M8 12h12M8 17h12" stroke={color} strokeWidth={1.9} strokeLinecap="round" />
    <circle cx="4" cy="7" r="1.3" fill={color} /><circle cx="4" cy="12" r="1.3" fill={color} /><circle cx="4" cy="17" r="1.3" fill={color} />
  </svg>
);

export const CloseX: React.FC<P> = ({ size = 22, color = "currentColor" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <path d="M6 6l12 12M18 6L6 18" stroke={color} strokeWidth={2} strokeLinecap="round" />
  </svg>
);

// WhatsApp blue double-tick (read)
export const DoubleTick: React.FC<P> = ({ size = 16, color = "#53BDEB" }) => (
  <svg width={size} height={size * 0.7} viewBox="0 0 18 12" fill="none">
    <path d="M1 6.5l3 3 6.5-7" stroke={color} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" />
    <path d="M6.5 9.2l.6.6 6.4-7" stroke={color} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
