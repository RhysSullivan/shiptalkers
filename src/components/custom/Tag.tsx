import React from "react";
import { cn } from "../../lib/utils";
const Tag = ({
  tagline,
  className,
}: {
  tagline: string;
  className?: string;
}) => {
  return (
    <div
      className={cn(
        "relative mb-1 inline-flex w-fit animate-spin-around items-center rounded-full bg-gradient-to-r from-purple-500 to-pink-500 px-3 py-1 text-xs font-semibold text-white",
        className,
      )}
    >
      <span className="relative z-10">{tagline}</span>
      <div className="absolute left-0 top-0 h-full animate-ping rounded-full bg-gradient-to-r from-purple-500 to-pink-500 opacity-30 blur-sm"></div>
    </div>
  );
};

export default Tag;
