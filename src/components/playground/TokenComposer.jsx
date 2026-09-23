"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Floating gallery + composer anchored next to the selected token.
 * Requires a catalog reference + prompt before generating.
 */
export default function TokenComposer({
  token,
  references,
  loadingRefs,
  onClose,
  onGenerate,
  generating,
  error,
  layoutKey,
}) {
  const [referenceId, setReferenceId] = useState(token?.referenceId || "");
  const [prompt, setPrompt] = useState(token?.prompt || "");
  const panelRef = useRef(null);
  const [position, setPosition] = useState({ top: 80, left: 80 });

  useEffect(() => {
    setReferenceId(token?.referenceId || "");
    setPrompt(token?.prompt || "");
  }, [token?.id, token?.referenceId, token?.prompt]);

  useEffect(() => {
    if (!token) return;

    function place() {
      const el =
        document.getElementById(`token-explode-${token.id}`) ||
        document.getElementById(`token-slot-${token.id}`);
      const canvas = el?.closest("[data-playground-canvas]");
      if (!el || !canvas) {
        setPosition({ top: 96, left: 96 });
        return;
      }
      const er = el.getBoundingClientRect();
      const cr = canvas.getBoundingClientRect();
      const panelW = 320;
      const panelH = 440;
      const gap = 12;

      const condensed = canvas.querySelector("[data-playground-condensed]");
      const condensedBox = condensed
        ? (() => {
            const r = condensed.getBoundingClientRect();
            return {
              left: r.left - cr.left,
              top: r.top - cr.top,
              right: r.right - cr.left,
              bottom: r.bottom - cr.top,
            };
          })()
        : null;

      const candidates = [
        { left: er.right - cr.left + gap, top: er.top - cr.top },
        { left: er.left - cr.left - panelW - gap, top: er.top - cr.top },
        { left: er.left - cr.left, top: er.bottom - cr.top + gap },
        { left: er.left - cr.left, top: er.top - cr.top - panelH - gap },
        { left: er.right - cr.left + gap, top: er.bottom - cr.top - panelH },
        { left: 16, top: cr.height - panelH - 16 },
      ];

      function inCanvas(p) {
        return (
          p.left >= 12 &&
          p.top >= 12 &&
          p.left + panelW <= cr.width - 12 &&
          p.top + panelH <= cr.height - 12
        );
      }

      function hitsCondensed(p) {
        if (!condensedBox) return false;
        return !(
          p.left + panelW < condensedBox.left ||
          p.left > condensedBox.right ||
          p.top + panelH < condensedBox.top ||
          p.top > condensedBox.bottom
        );
      }

      const pick =
        candidates.find((p) => inCanvas(p) && !hitsCondensed(p)) ||
        candidates.find((p) => inCanvas(p)) ||
        { left: 12, top: 12 };

      setPosition({ top: pick.top, left: pick.left });
    }

    place();
    const timer = window.setTimeout(place, 80);
    window.addEventListener("resize", place);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("resize", place);
    };
  }, [token, layoutKey]);

  useEffect(() => {
    function onKey(e) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  if (!token) return null;

  const selectedRef = references.find((r) => r.id === referenceId);

  return (
    <div
      ref={panelRef}
      className="absolute z-50 w-[320px] overflow-hidden rounded-md border border-neutral-200 bg-white shadow-2xl"
      style={{ top: position.top, left: position.left }}
      role="dialog"
      aria-label={`Compose ${token.label}`}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex items-center justify-between border-b border-neutral-100 px-3 py-2">
        <div>
          <div className="text-sm font-semibold text-neutral-900">{token.label}</div>
          <div className="text-[11px] text-neutral-500">Pick a reference, then prompt</div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="text-neutral-400 hover:text-neutral-700"
          aria-label="Close composer"
        >
          ✕
        </button>
      </div>

      <div className="space-y-3 p-3">
        <div>
          <div className="mb-1.5 text-[11px] font-medium uppercase tracking-wide text-neutral-500">
            Catalog reference
          </div>
          {loadingRefs ? (
            <p className="text-xs text-neutral-500">Loading catalog…</p>
          ) : references.length === 0 ? (
            <p className="rounded border border-amber-200 bg-amber-50 px-2 py-1.5 text-xs text-amber-800">
              No references yet. Score sites in Add &amp; Score, then return here.
            </p>
          ) : (
            <div className="grid max-h-40 grid-cols-3 gap-1.5 overflow-y-auto pr-0.5">
              {references.map((ref) => {
                const active = referenceId === ref.id;
                return (
                  <button
                    key={ref.id}
                    type="button"
                    onClick={() => setReferenceId(ref.id)}
                    className={`overflow-hidden rounded border text-left transition ${
                      active
                        ? "border-neutral-900 ring-1 ring-neutral-900"
                        : "border-neutral-200 hover:border-neutral-400"
                    }`}
                  >
                    {ref.imagePath ? (
                      <img
                        src={ref.imagePath}
                        alt=""
                        className="h-14 w-full object-cover object-top bg-neutral-50"
                      />
                    ) : (
                      <div className="flex h-14 items-center justify-center bg-neutral-100 px-1 text-center text-[9px] text-neutral-500">
                        {ref.hostname || "site"}
                      </div>
                    )}
                    <div className="truncate px-1 py-0.5 text-[9px] text-neutral-600">
                      {ref.hostname || ref.sourceUrl}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
          {selectedRef && (
            <p className="mt-1.5 truncate text-[11px] text-neutral-500">
              Basing on {selectedRef.hostname || selectedRef.sourceUrl}
            </p>
          )}
        </div>

        <div>
          <label
            htmlFor="token-prompt"
            className="mb-1.5 block text-[11px] font-medium uppercase tracking-wide text-neutral-500"
          >
            Prompt
          </label>
          <textarea
            id="token-prompt"
            rows={3}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder={`Describe how to build the ${token.label.toLowerCase()}…`}
            className="w-full resize-none rounded border border-neutral-200 px-2.5 py-2 text-sm outline-none focus:border-neutral-400"
          />
        </div>

        {error && (
          <p className="rounded border border-red-200 bg-red-50 px-2 py-1.5 text-xs text-red-700">
            {error}
          </p>
        )}

        <button
          type="button"
          disabled={generating || !referenceId || !prompt.trim()}
          onClick={() => onGenerate({ referenceId, prompt: prompt.trim() })}
          className="w-full rounded bg-neutral-900 px-3 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:bg-neutral-300"
        >
          {generating ? "Generating…" : "Generate component"}
        </button>
      </div>
    </div>
  );
}
