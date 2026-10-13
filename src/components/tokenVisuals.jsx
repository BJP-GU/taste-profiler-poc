"use client";

import { useState } from "react";
import CtaFrame from "@/components/CtaFrame";

export function looksLikeCssColor(value) {
  if (!value || typeof value !== "string") return false;
  const v = value.trim();
  return (
    /^#([0-9a-f]{3}|[0-9a-f]{4}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(v) ||
    /^(rgb|rgba|hsl|hsla)\(/i.test(v)
  );
}

export function svgToDataUrl(svg) {
  if (!svg || typeof svg !== "string") return null;
  let markup = svg.trim();
  if (!/\sxmlns=/i.test(markup)) {
    markup = markup.replace(
      /<svg\b/i,
      '<svg xmlns="http://www.w3.org/2000/svg"'
    );
  }
  if (!/style=/i.test(markup)) {
    markup = markup.replace(/<svg\b/i, '<svg style="color:#000000"');
  }
  try {
    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(markup)}`;
  } catch {
    return null;
  }
}

export function iconSrc(token) {
  return (token.svg ? svgToDataUrl(token.svg) : null) || token.previewUrl || null;
}

export function typeStyle(token) {
  const family = token.family || undefined;
  const weight = token.weight || undefined;
  return {
    fontFamily: family,
    fontWeight: weight && /^\d+$/.test(String(weight)) ? Number(weight) : weight,
  };
}

function kebabToCamel(prop) {
  return String(prop).replace(/-([a-z])/g, (_, c) => c.toUpperCase());
}

function styleMapToCss(map) {
  if (!map || typeof map !== "object") return "";
  return Object.entries(map)
    .map(([k, v]) => {
      const prop = k.includes("-") ? k : k.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);
      return `${prop}: ${v};`;
    })
    .join(" ");
}

function styleMapToReact(map) {
  if (!map || typeof map !== "object") return {};
  const out = {};
  for (const [k, v] of Object.entries(map)) {
    out[kebabToCamel(k)] = v;
  }
  return out;
}

let ctaStyleSeq = 0;

/** Live button preview with real :hover / :active / :focus-visible from token styles. */
export function CtaPreview({ token, className = "", interactive = true }) {
  const [uid] = useState(() => {
    ctaStyleSeq += 1;
    return `cta-tok-${ctaStyleSeq}`;
  });
  const styles = token.styles || {};
  const defaultCss = styleMapToCss(styles.default);
  const hoverCss = styleMapToCss(styles.hover);
  const activeCss = styleMapToCss(styles.active);
  const focusCss = styleMapToCss(styles.focus);

  const fallbackStyle = styleMapToReact(
    styles.default || {
      "background-color": "#111",
      color: "#fff",
      "border-radius": "0.375rem",
      padding: "0.75rem 1.25rem",
      "font-weight": "500",
      display: "inline-flex",
      "align-items": "center",
      "justify-content": "center",
      gap: "0.5rem",
      "text-decoration": "none",
      border: "none",
      cursor: "pointer",
    }
  );

  const icon = token.iconSvg ? (
    <span
      className="inline-flex shrink-0 [&>svg]:w-4 [&>svg]:h-4"
      aria-hidden
      dangerouslySetInnerHTML={{ __html: token.iconSvg }}
    />
  ) : null;

  const label = token.text || token.value || token.label || "CTA";
  const pos = token.iconPosition || (icon ? "left" : undefined);

  return (
    <div className={`inline-flex max-w-full ${className}`}>
      {(defaultCss || hoverCss || activeCss || focusCss) && (
        <style>{`
          .${uid} {
            ${defaultCss}
            ${interactive ? "cursor: pointer;" : "cursor: default;"}
            box-sizing: border-box;
            max-width: 100%;
            white-space: nowrap;
          }
          ${
            interactive && hoverCss
              ? `.${uid}:hover { ${hoverCss} }`
              : ""
          }
          ${
            interactive && activeCss
              ? `.${uid}:active { ${activeCss} }`
              : ""
          }
          ${
            interactive && focusCss
              ? `.${uid}:focus-visible { ${focusCss} }`
              : interactive
                ? `.${uid}:focus-visible { outline: 2px solid currentColor; outline-offset: 2px; }`
                : ""
          }
        `}</style>
      )}
      <span
        className={uid}
        style={defaultCss ? undefined : fallbackStyle}
        tabIndex={interactive ? 0 : undefined}
        role="presentation"
      >
        {pos === "left" || pos === "only" ? icon : null}
        {pos !== "only" ? <span>{label}</span> : null}
        {pos === "right" ? icon : null}
      </span>
    </div>
  );
}

export function CtaStateStrip({ token }) {
  const states = [
    { key: "default", label: "Default" },
    { key: "hover", label: "Hover" },
    { key: "active", label: "Active" },
    { key: "focus", label: "Focus" },
  ].filter(({ key }) => key === "default" || token.styles?.[key]);

  const base = token.styles?.default || {};

  return (
    <div
      className={`grid gap-3 ${
        states.length >= 4
          ? "grid-cols-2 sm:grid-cols-4"
          : states.length === 3
            ? "grid-cols-3"
            : "grid-cols-2"
      }`}
    >
      {states.map(({ key, label }) => {
        const merged = {
          ...base,
          ...(key !== "default" ? token.styles?.[key] || {} : {}),
        };
        const fake = {
          ...token,
          styles: { default: merged },
        };
        return (
          <div key={key} className="space-y-2">
            <p className="mono text-[10px] uppercase tracking-wide text-black/40">
              {label}
            </p>
            <div className="flex min-h-16 items-center justify-center border border-black/10 bg-[#fafafa] p-3">
              <CtaPreview token={fake} interactive={false} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

const SNAPSHOT_STATES = [
  { key: null, label: "Default" },
  { key: "hover", label: "Hover" },
  { key: "active", label: "Pressed" },
  { key: "focus", label: "Keyboard focus" },
];

export function SnapshotStateStrip({ snapshot }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {SNAPSHOT_STATES.map(({ key, label }) => (
        <div key={label} className="space-y-2">
          <p className="mono text-[10px] uppercase tracking-wide text-black/40">{label}</p>
          <div className="border border-black/10 overflow-hidden">
            <CtaFrame
              snapshot={snapshot}
              forceState={key || "none"}
              minHeight={72}
              padding={12}
              title={`${label} state`}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

/** Interactive CTA: live site snapshot when captured, style-map fallback otherwise. */
export function CtaSurface({ token, minHeight, padding }) {
  if (token.snapshot) {
    return (
      <CtaFrame
        snapshot={token.snapshot}
        minHeight={minHeight}
        padding={padding}
        title={`${token.text || token.label} preview`}
      />
    );
  }
  return (
    <div
      className="flex items-center justify-center bg-[#fafafa]"
      style={{ minHeight, padding }}
    >
      <CtaPreview token={token} />
    </div>
  );
}

export function IconPreview({ token, className = "w-10 h-10" }) {
  const src = iconSrc(token);

  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt=""
        className={`${className} border border-black/15 object-contain bg-white shrink-0 p-1`}
      />
    );
  }

  return (
    <div
      className={`${className} border border-dashed border-black/25 flex items-center justify-center mono text-[10px] text-black/40 shrink-0`}
    >
      icon
    </div>
  );
}
