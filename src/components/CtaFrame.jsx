"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

// Live selector vs. forced-attribute selector for each captured state.
// Order matters: later rules win at equal specificity (press beats hover).
const STATE_RULES = [
  { key: "hover", live: ":hover", force: "hover" },
  { key: "focus", live: ":focus", force: "focus" },
  { key: "focusVisible", live: ":focus-visible", force: "focus-visible" },
  { key: "active", live: ":active", force: "active" },
];

const FORCE_ATTR = {
  hover: "hover",
  active: "hover active",
  focus: "focus focus-visible",
};

function propsToCss(map) {
  return Object.entries(map || {})
    .map(([prop, value]) => `${prop}:${value}`)
    .join(";");
}

function selectorFor(k, pe, stateSel) {
  const self = `[data-tp-k="${k}"]`;
  if (!stateSel) return `${self}${pe}`;
  if (k === "0") return `[data-tp-cta]${stateSel}${pe}`;
  return `[data-tp-cta]${stateSel} ${self}${pe}`;
}

function emitState(stateMap, stateSel, out) {
  for (const [k, entry] of Object.entries(stateMap || {})) {
    for (const [pe, props] of Object.entries(entry || {})) {
      const body = propsToCss(props);
      if (body) out.push(`${selectorFor(k, pe, stateSel)}{${body}}`);
    }
  }
}

function buildCss(styles, forced) {
  const out = [];
  emitState(styles?.default, "", out);
  for (const rule of STATE_RULES) {
    const sel = forced ? `[data-tp-force~="${rule.force}"]` : rule.live;
    emitState(styles?.[rule.key], sel, out);
  }
  return out.join("\n");
}

function noCloseTag(text) {
  return String(text || "").replace(/<\/(style|script)/gi, "<\\/$1");
}

function backdropCss(backdrop) {
  const color = backdrop?.color || "#ffffff";
  const image = backdrop?.image
    ? `background-image:${backdrop.image};background-size:cover;background-position:center;`
    : "";
  return `background-color:${color};${image}`;
}

export default function CtaFrame({
  snapshot,
  forceState = null,
  minHeight = 88,
  padding = 20,
  title = "CTA preview",
}) {
  const frameRef = useRef(null);
  const [height, setHeight] = useState(() =>
    Math.max(minHeight, Math.ceil((snapshot?.height || 40) + padding * 2))
  );

  const srcDoc = useMemo(() => {
    if (!snapshot?.html) return "";
    let html = snapshot.html;
    if (forceState && FORCE_ATTR[forceState]) {
      html = html.replace(
        "data-tp-cta",
        `data-tp-cta data-tp-force="${FORCE_ATTR[forceState]}"`
      );
    }
    const css = buildCss(snapshot.styles, Boolean(forceState));
    return `<!doctype html><html><head><meta charset="utf-8">
<style>${noCloseTag(snapshot.fonts)}${noCloseTag(snapshot.keyframes)}</style>
<style>html,body{margin:0;height:100%}body{display:flex;align-items:center;justify-content:center;box-sizing:border-box;padding:0 ${padding}px;overflow:hidden;${noCloseTag(backdropCss(snapshot.backdrop))}}</style>
<style>${noCloseTag(css)}</style>
</head><body>${html}</body></html>`;
  }, [snapshot, forceState, padding]);

  const fit = useCallback(() => {
    const frame = frameRef.current;
    const doc = frame?.contentDocument;
    const root = doc?.querySelector("[data-tp-cta]");
    if (!frame || !root) return;
    root.style.zoom = "1";
    const rect = root.getBoundingClientRect();
    const avail = frame.clientWidth - padding * 2;
    const scale = avail > 0 && rect.width > avail ? avail / rect.width : 1;
    if (scale < 1) root.style.zoom = String(scale);
    setHeight(Math.max(minHeight, Math.ceil(rect.height * scale + padding * 2)));
  }, [minHeight, padding]);

  const handleLoad = useCallback(() => {
    const doc = frameRef.current?.contentDocument;
    if (doc) {
      // srcdoc resolves href="#" against the parent URL, so a click would
      // otherwise load this app inside the preview.
      const block = (e) => {
        if (e.type === "submit" || e.target.closest?.("a, [data-tp-cta]")) e.preventDefault();
      };
      doc.addEventListener("click", block, true);
      doc.addEventListener("submit", block, true);
    }
    fit();
    doc?.fonts?.ready?.then(fit).catch(() => {});
  }, [fit]);

  useEffect(() => {
    const frame = frameRef.current;
    if (!frame || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => fit());
    ro.observe(frame);
    return () => ro.disconnect();
  }, [fit]);

  if (!srcDoc) return null;

  return (
    <iframe
      ref={frameRef}
      title={title}
      srcDoc={srcDoc}
      sandbox="allow-same-origin"
      onLoad={handleLoad}
      tabIndex={forceState ? -1 : undefined}
      className={`block w-full border-0 ${forceState ? "pointer-events-none" : ""}`}
      style={{ height }}
    />
  );
}
