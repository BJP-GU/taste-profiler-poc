"use client";

import { useEffect, useRef, useState } from "react";
import CondensedView from "./CondensedView";
import TokenFace from "./TokenFace";

const SCENE = { w: 1280, h: 800 };
const CENTER = { x: 490, y: 190, w: 300, h: 400 };

const SLOTS = {
  header: { x: 880, y: 70, w: 280, h: 52 },
  headline: { x: 940, y: 200, w: 240, h: 80 },
  hero_image: { x: 70, y: 390, w: 340, h: 200 },
  cta: { x: 90, y: 630, w: 150, h: 56 },
};

function attachPoint(token) {
  if (token.depth === "background") {
    return {
      x: CENTER.x + CENTER.w * 0.82,
      y: CENTER.y + (token.type === "header" ? 28 : 96),
    };
  }
  return {
    x: CENTER.x + 28,
    y: CENTER.y + (token.type === "hero_image" ? 270 : 350),
  };
}

/**
 * Exploded industrial-design view: assembled homepage in the center (lime),
 * tokens pulled along a diagonal depth axis — background up-right, foreground down-left.
 */
export default function ExplodedView({ tokens, selectedId, onSelectToken, onBackgroundClick }) {
  const viewportRef = useRef(null);
  const [scale, setScale] = useState(0.7);
  const [exploded, setExploded] = useState(false);

  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      setScale(Math.min(width / SCENE.w, height / SCENE.h) * 0.96);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const id = requestAnimationFrame(() => setExploded(true));
    return () => cancelAnimationFrame(id);
  }, []);

  return (
    <div
      ref={viewportRef}
      className="relative h-full w-full overflow-hidden bg-[#1c1c1c]"
      onClick={onBackgroundClick}
    >
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at 50% 42%, transparent 38%, rgba(0,0,0,0.4) 100%)",
        }}
      />
      <span className="pointer-events-none absolute right-6 top-5 text-[11px] uppercase tracking-[0.22em] text-neutral-500">
        Background
      </span>
      <span className="pointer-events-none absolute bottom-5 left-6 text-[11px] uppercase tracking-[0.22em] text-neutral-500">
        Foreground
      </span>

      <div className="absolute inset-0 flex items-center justify-center">
        <div style={{ width: SCENE.w * scale, height: SCENE.h * scale, position: "relative" }}>
          <div
            className="absolute left-0 top-0"
            style={{
              width: SCENE.w,
              height: SCENE.h,
              transform: `scale(${scale})`,
              transformOrigin: "top left",
            }}
          >
            <svg
              className="pointer-events-none absolute inset-0"
              width={SCENE.w}
              height={SCENE.h}
              aria-hidden
            >
              <line
                x1="50"
                y1="760"
                x2="1230"
                y2="50"
                stroke="rgba(255,255,255,0.1)"
                strokeWidth="1"
              />
              {tokens.map((token) => {
                const slot = SLOTS[token.type];
                if (!slot) return null;
                const from = attachPoint(token);
                return (
                  <line
                    key={token.id}
                    x1={from.x}
                    y1={from.y}
                    x2={slot.x + slot.w * 0.12}
                    y2={slot.y + slot.h * 0.45}
                    stroke="rgba(255,255,255,0.3)"
                    strokeWidth="1"
                  />
                );
              })}
            </svg>

            <div
              className="absolute z-20"
              style={{ left: CENTER.x, top: CENTER.y, width: CENTER.w, height: CENTER.h }}
              onClick={(e) => e.stopPropagation()}
            >
              <CondensedView
                tokens={tokens}
                selectedId={selectedId}
                onSelectToken={onSelectToken}
                fill
              />
            </div>

            {tokens.map((token, index) => {
              const slot = SLOTS[token.type];
              if (!slot) return null;
              const selected = selectedId === token.id;
              return (
                <button
                  key={token.id}
                  type="button"
                  id={`token-explode-${token.id}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectToken(token);
                  }}
                  className={`absolute overflow-hidden bg-white text-left shadow-[0_14px_40px_rgba(0,0,0,0.4)] ${
                    selected ? "ring-2 ring-lime-400" : "ring-1 ring-white/15 hover:ring-white/70"
                  }`}
                  style={{
                    left: exploded ? slot.x : CENTER.x + 24,
                    top: exploded ? slot.y : CENTER.y + 90,
                    width: slot.w,
                    height: slot.h,
                    zIndex: selected ? 40 : token.depth === "foreground" ? 30 : 10,
                    transition: `left 720ms cubic-bezier(0.22, 1, 0.36, 1) ${70 + index * 70}ms, top 720ms cubic-bezier(0.22, 1, 0.36, 1) ${70 + index * 70}ms`,
                  }}
                  aria-label={`Edit ${token.label} token`}
                >
                  <div className="pointer-events-none absolute left-1.5 top-1 z-10 rounded bg-black/55 px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wide text-white">
                    {token.label}
                  </div>
                  <TokenFace token={token} />
                  {token.status === "generating" && (
                    <div className="absolute inset-0 flex items-center justify-center bg-white/75 text-[10px] font-medium text-neutral-600">
                      Generating…
                    </div>
                  )}
                  {token.status === "blank" && (
                    <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/35 to-transparent px-2 pb-1.5 pt-4 text-[9px] text-white/90">
                      Click to generate
                    </div>
                  )}
                  {token.status === "ready" && (
                    <div className="pointer-events-none absolute right-1.5 top-1.5 z-10 h-1.5 w-1.5 rounded-full bg-lime-400" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
