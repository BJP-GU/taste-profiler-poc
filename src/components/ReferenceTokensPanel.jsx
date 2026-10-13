"use client";

import { useEffect, useRef, useState } from "react";
import { TOKEN_CATEGORIES } from "@/lib/designTokens";
import {
  looksLikeCssColor,
  iconSrc,
  typeStyle,
  CtaStateStrip,
  SnapshotStateStrip,
  CtaSurface,
  IconPreview,
} from "@/components/tokenVisuals";

function IncludeGalleryButton({ included, onToggle, className = "" }) {
  return (
    <button
      type="button"
      aria-pressed={included}
      onClick={(e) => {
        e.stopPropagation();
        onToggle(!included);
      }}
      className={`mono text-xs border border-black px-2.5 py-1.5 shrink-0 ${
        included ? "bg-black text-white" : "bg-white hover:bg-black/5"
      } ${className}`}
    >
      {included ? "Included in Token Gallery" : "Include in Token Gallery"}
    </button>
  );
}

function ColorToken({ token, onToggle, onExpand }) {
  const swatch = looksLikeCssColor(token.value) ? token.value : null;
  return (
    <li className="border border-black/15 bg-white hover:border-black transition-colors">
      <button
        type="button"
        onClick={onExpand}
        className="w-full min-w-0 flex items-center gap-3 px-3 py-2 text-left cursor-pointer"
      >
        <span
          className="w-10 h-10 border border-black/20 shrink-0"
          style={swatch ? { backgroundColor: swatch } : { backgroundColor: "#f5f5f5" }}
          title={token.value}
          aria-hidden
        />
        <div className="min-w-0 flex-1">
          <div className="text-sm font-medium truncate">{token.label}</div>
          <div className="mono text-xs text-black/50 truncate">{token.value}</div>
          {token.role && token.role !== token.label ? (
            <div className="text-xs text-black/40 truncate">{token.role}</div>
          ) : null}
        </div>
      </button>
      <div className="flex justify-end border-t border-black/10 px-3 py-2">
        <IncludeGalleryButton included={token.inGallery} onToggle={onToggle} />
      </div>
    </li>
  );
}

function TypographyToken({ token, onToggle, onExpand }) {
  return (
    <li className="border border-black/15 bg-white hover:border-black transition-colors">
      <button
        type="button"
        onClick={onExpand}
        className="w-full min-w-0 px-3 py-3 text-left space-y-2 cursor-pointer"
      >
        <div className="text-sm font-medium">{token.label}</div>
        <div className="mono text-xs text-black/50 space-y-0.5">
          <div>{token.family || token.value || "Unknown family"}</div>
          <div>
            {[
              token.weight ? `Weight ${token.weight}` : null,
              token.size ? `Size ${token.size}` : null,
            ]
              .filter(Boolean)
              .join(" · ") || "—"}
          </div>
        </div>
        <p
          className="text-xl leading-snug text-black truncate"
          style={typeStyle(token)}
        >
          Ag The quick brown fox
        </p>
      </button>
      <div className="flex justify-end border-t border-black/10 px-3 py-2">
        <IncludeGalleryButton included={token.inGallery} onToggle={onToggle} />
      </div>
    </li>
  );
}

function IconToken({ token, onToggle, onExpand }) {
  return (
    <li className="border border-black/15 bg-white hover:border-black transition-colors">
      <button
        type="button"
        onClick={onExpand}
        className="w-full min-w-0 flex items-center gap-3 px-3 py-2 text-left cursor-pointer"
      >
        <IconPreview token={token} />
        <div className="min-w-0 flex-1">
          <div className="text-sm font-medium truncate">{token.label}</div>
          <div className="mono text-xs text-black/50 truncate">
            {[token.style, token.source].filter(Boolean).join(" · ") || token.value}
          </div>
        </div>
      </button>
      <div className="flex justify-end border-t border-black/10 px-3 py-2">
        <IncludeGalleryButton included={token.inGallery} onToggle={onToggle} />
      </div>
    </li>
  );
}

function CtaToken({ token, onToggle, onExpand }) {
  return (
    <li className="border border-black/15 bg-white hover:border-black transition-colors">
      <div className="border-b border-black/10 overflow-hidden">
        <CtaSurface token={token} minHeight={88} padding={20} />
      </div>
      <button
        type="button"
        onClick={onExpand}
        className="w-full min-w-0 px-3 py-2 text-left cursor-pointer"
      >
        <div className="text-sm font-medium truncate">{token.label}</div>
        <div className="mono text-xs text-black/50 truncate">
          {[token.role, token.shape, token.source].filter(Boolean).join(" · ") ||
            token.text ||
            token.value}
        </div>
      </button>
      <div className="flex justify-end border-t border-black/10 px-3 py-2">
        <IncludeGalleryButton included={token.inGallery} onToggle={onToggle} />
      </div>
    </li>
  );
}

function TokenExpandModal({ category, token, onClose, onToggle }) {
  useEffect(() => {
    function onKey(e) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  const swatch = looksLikeCssColor(token.value) ? token.value : null;
  const categoryLabel =
    TOKEN_CATEGORIES.find((c) => c.key === category)?.label || category;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40"
      role="dialog"
      aria-modal="true"
      aria-label={`${token.label} expanded`}
      onClick={onClose}
    >
      <div
        className={`w-full bg-white border border-black shadow-none max-h-[90vh] overflow-y-auto ${
          category === "ctas" ? "max-w-2xl" : "max-w-lg"
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 border-b border-black px-4 py-3">
          <div className="min-w-0">
            <p className="mono text-xs uppercase tracking-wide text-black/50">
              {categoryLabel}
            </p>
            <h2 className="text-lg font-medium mt-0.5 truncate">{token.label}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="mono text-xs border border-black px-2 py-1 shrink-0 hover:bg-black hover:text-white"
          >
            Close
          </button>
        </div>

        <div className="p-5 space-y-5">
          {category === "colors" && (
            <>
              <div
                className="w-full h-48 border border-black/20"
                style={
                  swatch
                    ? { backgroundColor: swatch }
                    : { backgroundColor: "#f5f5f5" }
                }
              />
              <dl className="space-y-2 text-sm">
                <div>
                  <dt className="mono text-xs uppercase text-black/40">Value</dt>
                  <dd className="mono">{token.value}</dd>
                </div>
                {token.role ? (
                  <div>
                    <dt className="mono text-xs uppercase text-black/40">Role</dt>
                    <dd>{token.role}</dd>
                  </div>
                ) : null}
              </dl>
            </>
          )}

          {category === "typography" && (
            <>
              <p
                className="text-5xl leading-tight text-black break-words"
                style={typeStyle(token)}
              >
                Ag
              </p>
              <p
                className="text-2xl leading-snug text-black"
                style={typeStyle(token)}
              >
                The quick brown fox jumps over the lazy dog
              </p>
              <p
                className="text-base leading-relaxed text-black"
                style={typeStyle(token)}
              >
                ABCDEFGHIJKLMNOPQRSTUVWXYZ
                <br />
                abcdefghijklmnopqrstuvwxyz
                <br />
                0123456789
              </p>
              <dl className="space-y-2 text-sm border-t border-black/15 pt-4">
                <div>
                  <dt className="mono text-xs uppercase text-black/40">Family</dt>
                  <dd className="mono">{token.family || token.value || "—"}</dd>
                </div>
                <div>
                  <dt className="mono text-xs uppercase text-black/40">Weight</dt>
                  <dd className="mono">{token.weight || "—"}</dd>
                </div>
                <div>
                  <dt className="mono text-xs uppercase text-black/40">Size</dt>
                  <dd className="mono">{token.size || "—"}</dd>
                </div>
              </dl>
            </>
          )}

          {category === "icons" && (
            <>
              <div className="flex items-center justify-center border border-black/15 bg-white p-8 min-h-48">
                {iconSrc(token) ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={iconSrc(token)}
                    alt={token.label}
                    className="max-w-full max-h-56 object-contain"
                  />
                ) : (
                  <span className="mono text-sm text-black/40">No preview</span>
                )}
              </div>
              <dl className="space-y-2 text-sm">
                {token.style ? (
                  <div>
                    <dt className="mono text-xs uppercase text-black/40">Style</dt>
                    <dd>{token.style}</dd>
                  </div>
                ) : null}
                {token.source ? (
                  <div>
                    <dt className="mono text-xs uppercase text-black/40">Source</dt>
                    <dd className="mono break-all">{token.source}</dd>
                  </div>
                ) : null}
                {token.value ? (
                  <div>
                    <dt className="mono text-xs uppercase text-black/40">Detail</dt>
                    <dd className="mono break-all text-xs">{token.value}</dd>
                  </div>
                ) : null}
              </dl>
            </>
          )}

          {category === "ctas" && (
            <>
              <div className="space-y-2">
                <p className="mono text-xs uppercase text-black/40">
                  Live — hover, press, or Tab to it
                </p>
                <div className="border border-black/15 overflow-hidden">
                  <CtaSurface token={token} minHeight={160} padding={32} />
                </div>
              </div>
              <div className="space-y-2">
                <p className="mono text-xs uppercase text-black/40">Interaction states</p>
                {token.snapshot ? (
                  <SnapshotStateStrip snapshot={token.snapshot} />
                ) : (
                  <CtaStateStrip token={token} />
                )}
              </div>
              <dl className="space-y-2 text-sm border-t border-black/15 pt-4">
                {token.href ? (
                  <div>
                    <dt className="mono text-xs uppercase text-black/40">Links to</dt>
                    <dd className="mono text-xs break-all">{token.href}</dd>
                  </div>
                ) : null}
                {token.text ? (
                  <div>
                    <dt className="mono text-xs uppercase text-black/40">Label</dt>
                    <dd>{token.text}</dd>
                  </div>
                ) : null}
                {token.role ? (
                  <div>
                    <dt className="mono text-xs uppercase text-black/40">Role</dt>
                    <dd className="capitalize">{token.role}</dd>
                  </div>
                ) : null}
                {token.shape ? (
                  <div>
                    <dt className="mono text-xs uppercase text-black/40">Shape</dt>
                    <dd>{token.shape}</dd>
                  </div>
                ) : null}
                {token.source ? (
                  <div>
                    <dt className="mono text-xs uppercase text-black/40">Placement</dt>
                    <dd className="capitalize">{token.source}</dd>
                  </div>
                ) : null}
                {token.iconSvg ? (
                  <div>
                    <dt className="mono text-xs uppercase text-black/40">Icon</dt>
                    <dd className="flex items-center gap-2 mt-1">
                      <span
                        className="inline-flex border border-black/15 bg-white p-2 [&>svg]:w-5 [&>svg]:h-5"
                        dangerouslySetInnerHTML={{ __html: token.iconSvg }}
                      />
                      <span className="mono text-xs text-black/50">
                        {token.iconPosition || "left"}
                      </span>
                    </dd>
                  </div>
                ) : null}
              </dl>
            </>
          )}

          <div className="flex items-center justify-end gap-3 border-t border-black/15 pt-4">
            <IncludeGalleryButton included={token.inGallery} onToggle={onToggle} />
          </div>
        </div>
      </div>
    </div>
  );
}

function CategoryBlock({ categoryKey, label, items, onToggleToken, onExpand }) {
  if (!items?.length) {
    return (
      <section className="space-y-2">
        <h3 className="mono text-xs uppercase tracking-wide text-black/50">{label}</h3>
        <p className="text-xs text-black/40">No {label.toLowerCase()} found on this homepage.</p>
      </section>
    );
  }

  return (
    <section className="space-y-2">
      <h3 className="mono text-xs uppercase tracking-wide text-black/50">
        {label} <span className="text-black/30">({items.length})</span>
      </h3>
      <ul className="grid gap-2">
        {items.map((token, i) => {
          const key = `${categoryKey}-${i}-${token.label}-${(token.value || "").slice(0, 40)}`;
          const onToggle = (included) => onToggleToken(categoryKey, i, included);
          const expand = () => onExpand(categoryKey, i, token);
          if (categoryKey === "colors") {
            return (
              <ColorToken key={key} token={token} onToggle={onToggle} onExpand={expand} />
            );
          }
          if (categoryKey === "typography") {
            return (
              <TypographyToken
                key={key}
                token={token}
                onToggle={onToggle}
                onExpand={expand}
              />
            );
          }
          if (categoryKey === "ctas") {
            return (
              <CtaToken key={key} token={token} onToggle={onToggle} onExpand={expand} />
            );
          }
          return (
            <IconToken key={key} token={token} onToggle={onToggle} onExpand={expand} />
          );
        })}
      </ul>
    </section>
  );
}

function iconsNeedVisuals(tokens) {
  const icons = tokens?.icons || [];
  if (!icons.length) return true;
  return icons.some((icon) => !icon.svg && !icon.previewUrl);
}

function ctasNeedPreviews(tokens) {
  const ctas = tokens?.ctas || [];
  if (!ctas.length) return true;
  return ctas.every((cta) => !cta.snapshot);
}

// Auto-pulls are attempted once per site per browser session, so switching
// tabs doesn't restart a slow homepage capture that already ran.
const autoRefreshedKeys = new Set();

function AutoRefresh({ enabled, onRefresh, refreshKey }) {
  const ran = useRef(false);
  useEffect(() => {
    if (!enabled || ran.current || !onRefresh) return;
    if (refreshKey && autoRefreshedKeys.has(refreshKey)) return;
    ran.current = true;
    if (refreshKey) autoRefreshedKeys.add(refreshKey);
    onRefresh();
  }, [enabled, onRefresh, refreshKey]);
  return null;
}

export default function ReferenceTokensPanel({
  tokens,
  facets: _facets,
  onChange,
  onIncludePersist,
  onRefresh,
  refreshing = false,
  autoRefresh = false,
  refreshKey,
}) {
  const data = tokens || { colors: [], typography: [], icons: [], ctas: [] };
  const dataRef = useRef(data);
  dataRef.current = data;
  const missingPreviews =
    iconsNeedVisuals(data) || ctasNeedPreviews(data);
  const [expanded, setExpanded] = useState(null);

  const total =
    (data.colors?.length || 0) +
    (data.typography?.length || 0) +
    (data.icons?.length || 0) +
    (data.ctas?.length || 0);

  function handleToggle(categoryKey, index, included) {
    if (!onChange) return;
    const current = dataRef.current || data;
    const next = {
      colors: [...(current.colors || [])],
      typography: [...(current.typography || [])],
      icons: [...(current.icons || [])],
      ctas: [...(current.ctas || [])],
    };
    const list = next[categoryKey];
    if (!list?.[index]) return;
    const nextToken = { ...list[index] };
    if (included) nextToken.inGallery = true;
    else delete nextToken.inGallery;
    list[index] = nextToken;
    dataRef.current = next;
    onChange(next);
    onIncludePersist?.(next);
    setExpanded((prev) =>
      prev && prev.category === categoryKey && prev.index === index
        ? { ...prev, token: list[index] }
        : prev
    );
  }

  return (
    <div className="space-y-6">
      <AutoRefresh
        enabled={autoRefresh && Boolean(onRefresh) && missingPreviews && !refreshing}
        onRefresh={onRefresh}
        refreshKey={refreshKey}
      />
      <div className="flex flex-wrap items-start justify-between gap-3">
        <p className="text-xs text-black/50 leading-relaxed max-w-md">
          Tokens from the site homepage only. Click a token to enlarge it. Use
          Include in Token Gallery to collect it on the Token Gallery page.
        </p>
        {onRefresh && (
          <button
            type="button"
            onClick={onRefresh}
            disabled={refreshing}
            className="mono text-xs border border-black px-2 py-1.5 disabled:opacity-40 shrink-0"
          >
            {refreshing ? "Pulling…" : "Refresh from homepage"}
          </button>
        )}
      </div>

      {refreshing && (
        <p className="mono text-xs text-black/50">
          Pulling logos, icons, and CTAs from homepage…
        </p>
      )}

      {!total && !refreshing && (
        <p className="text-sm text-black/50">
          No design tokens yet. Use Refresh from homepage.
        </p>
      )}

      {TOKEN_CATEGORIES.map((cat) => (
        <CategoryBlock
          key={cat.key}
          categoryKey={cat.key}
          label={cat.label}
          items={data[cat.key]}
          onToggleToken={handleToggle}
          onExpand={(category, index, token) =>
            setExpanded({ category, index, token })
          }
        />
      ))}

      {expanded && (
        <TokenExpandModal
          category={expanded.category}
          token={
            data[expanded.category]?.[expanded.index] || expanded.token
          }
          onClose={() => setExpanded(null)}
          onToggle={(included) =>
            handleToggle(expanded.category, expanded.index, included)
          }
        />
      )}
    </div>
  );
}
