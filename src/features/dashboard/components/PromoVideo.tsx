"use client";

import React, { useRef, useState } from "react";
import { Play, Film } from "lucide-react";

interface PromoVideoProps {
  /** Path to the promo file under /public — drop the video there later. */
  src?: string;
  /** Optional poster frame under /public. */
  poster?: string;
}

/**
 * Promotional / product-tour video card for the dashboard overview.
 *
 * Renders a custom (on-theme) play affordance over a native <video>. If the
 * source isn't present yet it falls back to a "coming soon" placeholder, so the
 * dashboard looks intentional before the asset is added to /public.
 */
export const PromoVideo: React.FC<PromoVideoProps> = ({
  src = "/promo.mp4",
  poster = "/promo-poster.jpg",
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const [errored, setErrored] = useState(false);

  const handlePlay = () => {
    const v = videoRef.current;
    if (!v) return;
    v.play()
      .then(() => setPlaying(true))
      .catch(() => setErrored(true));
  };

  return (
    <div className="bg-white border border-stone-200 flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-stone-200">
        <div className="flex items-center gap-1.5">
          <Film className="w-3.5 h-3.5 text-stone-400" />
          <span className="text-[10px] font-bold uppercase tracking-wider text-stone-500">
            Product Tour
          </span>
        </div>
        <span className="text-[10px] text-stone-400 font-semibold">30 sec watch</span>
      </div>

      {/* Video frame */}
      <div className="relative aspect-video bg-stone-950 overflow-hidden group">
        {!errored && (
          <video
            ref={videoRef}
            className="w-full h-full object-cover"
            poster={poster}
            controls={playing}
            playsInline
            preload="metadata"
            onError={() => setErrored(true)}
            onEnded={() => setPlaying(false)}
          >
            <source src={src} type="video/mp4" />
          </video>
        )}

        {/* Play affordance — hidden once playback starts */}
        {!playing && !errored && (
          <button
            type="button"
            onClick={handlePlay}
            aria-label="Play product tour"
            className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-stone-950/30 hover:bg-stone-950/20 transition-colors cursor-pointer"
          >
            <span className="w-14 h-14 bg-white flex items-center justify-center group-hover:scale-105 transition-transform">
              <Play className="w-6 h-6 text-stone-950 fill-stone-950 ml-0.5" />
            </span>
            <span className="text-[11px] font-bold uppercase tracking-wider text-white">
              Watch how LeapCreww works
            </span>
          </button>
        )}

        {/* Coming-soon placeholder when the asset isn't available yet */}
        {errored && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-center px-6">
            <span className="w-14 h-14 border border-white/20 flex items-center justify-center">
              <Film className="w-6 h-6 text-white/70" />
            </span>
            <div className="space-y-0.5">
              <p className="text-[11px] font-bold uppercase tracking-wider text-white">
                Promo video coming soon
              </p>
              <p className="text-[10px] text-stone-400">A quick walkthrough lands here shortly.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
