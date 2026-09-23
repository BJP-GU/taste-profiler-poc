"use client";

import TokenPreview from "./TokenPreview";

/**
 * Token surface: generated HTML when ready, otherwise a wireframe glyph.
 */
export default function TokenFace({ token }) {
  if (token.html) {
    return <TokenPreview html={token.html} css={token.css} />;
  }
  return <WireframeGlyph type={token.type} label={token.wireframeLabel} />;
}

function WireframeGlyph({ type, label }) {
  if (type === "header") {
    return (
      <div className="flex h-full w-full items-center gap-1.5 bg-white px-2.5">
        <div className="h-3.5 w-11 shrink-0 rounded-[2px] bg-neutral-200" />
        <div className="min-w-0 flex-1 truncate text-[9px] text-neutral-400">{label}</div>
        <div className="h-3.5 w-8 shrink-0 rounded-[2px] bg-neutral-200" />
        <div className="h-3.5 w-8 shrink-0 rounded-[2px] bg-neutral-200" />
      </div>
    );
  }

  if (type === "cta") {
    return (
      <div className="flex h-full w-full items-center justify-center bg-white">
        <span className="rounded-[2px] border border-neutral-300 px-2.5 py-1 text-[10px] font-medium tracking-wide text-neutral-500">
          {label}
        </span>
      </div>
    );
  }

  return (
    <div className="flex h-full w-full items-center justify-center bg-white px-3">
      <span className="text-center text-[11px] font-medium tracking-wide text-neutral-400">
        {label}
      </span>
    </div>
  );
}
