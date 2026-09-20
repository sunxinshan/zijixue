import type { ReactNode } from "react";

export function ForestBackdrop({
  children,
  compact = false,
}: {
  children: ReactNode;
  compact?: boolean;
}) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-[#eff9eb] text-[#173f2a]">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 overflow-hidden"
      >
        <div className="absolute -left-16 -top-20 h-72 w-72 rounded-full bg-[#bde9a9]/60 blur-3xl" />
        <div className="absolute -right-24 top-20 h-80 w-80 rounded-full bg-[#ffe8a9]/50 blur-3xl" />
        <div className="absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-t from-[#bce5aa]/50 to-transparent" />
        <span className="absolute left-5 top-28 text-5xl opacity-25">🌳</span>
        <span className="absolute right-7 top-44 text-4xl opacity-20">🌲</span>
        <span className="absolute bottom-8 left-1/3 text-4xl opacity-15">🍃</span>
      </div>
      <div
        className={`relative mx-auto w-full max-w-5xl px-4 ${
          compact ? "py-6" : "py-6 sm:py-10"
        }`}
      >
        {children}
      </div>
    </div>
  );
}
