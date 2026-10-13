"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { TOKEN_CATEGORIES } from "@/lib/designTokens";
import {
  looksLikeCssColor,
  typeStyle,
  CtaSurface,
  IconPreview,
} from "@/components/tokenVisuals";

function ColorCard({ token }) {
  const swatch = looksLikeCssColor(token.value) ? token.value : null;
  return (
    <div className="space-y-2">
      <div
        className="w-full h-24 border border-black/15"
        style={swatch ? { backgroundColor: swatch } : { backgroundColor: "#f5f5f5" }}
        title={token.value}
      />
      <div className="min-w-0">
        <div className="text-sm font-medium truncate">{token.label}</div>
        <div className="mono text-xs text-black/50 truncate">{token.value}</div>
      </div>
    </div>
  );
}

function TypeCard({ token }) {
  return (
    <div className="space-y-2">
      <p className="text-2xl leading-snug text-black truncate" style={typeStyle(token)}>
        Ag The quick brown fox
      </p>
      <div className="min-w-0">
        <div className="text-sm font-medium truncate">{token.label}</div>
        <div className="mono text-xs text-black/50 truncate">
          {[token.family || token.value, token.weight, token.size]
            .filter(Boolean)
            .join(" · ")}
        </div>
      </div>
    </div>
  );
}

function IconCard({ token }) {
  return (
    <div className="flex items-center gap-3">
      <IconPreview token={token} className="w-12 h-12" />
      <div className="min-w-0">
        <div className="text-sm font-medium truncate">{token.label}</div>
        <div className="mono text-xs text-black/50 truncate">
          {[token.style, token.source].filter(Boolean).join(" · ") || token.value}
        </div>
      </div>
    </div>
  );
}

function CtaCard({ token }) {
  return (
    <div className="space-y-2">
      <div className="border border-black/10 overflow-hidden">
        <CtaSurface token={token} minHeight={88} padding={20} />
      </div>
      <div className="min-w-0">
        <div className="text-sm font-medium truncate">{token.label}</div>
        <div className="mono text-xs text-black/50 truncate">
          {[token.role, token.shape, token.text].filter(Boolean).join(" · ") ||
            token.value}
        </div>
      </div>
    </div>
  );
}

function GalleryCard({ item, onRemove, removing }) {
  const { token, category } = item;
  return (
    <li className="border border-black/15 bg-white p-3 space-y-3">
      {category === "colors" && <ColorCard token={token} />}
      {category === "typography" && <TypeCard token={token} />}
      {category === "icons" && <IconCard token={token} />}
      {category === "ctas" && <CtaCard token={token} />}
      <div className="flex items-center justify-between gap-2 pt-1 border-t border-black/10">
        {item.referenceId ? (
          <Link
            href={`/web2/catalog/${item.referenceId}`}
            className="mono text-xs text-black/50 hover:text-black truncate"
          >
            {item.hostname || item.sourceUrl || "Source"}
          </Link>
        ) : (
          <span className="mono text-xs text-black/40 truncate">
            {item.hostname || "Source"}
          </span>
        )}
        <button
          type="button"
          onClick={() => onRemove(item)}
          disabled={removing}
          className="mono text-xs text-black/40 hover:text-black disabled:opacity-40 shrink-0"
        >
          {removing ? "Removing…" : "Remove"}
        </button>
      </div>
    </li>
  );
}

export default function TokenGallery() {
  const [groups, setGroups] = useState(null);
  const [error, setError] = useState(null);
  const [removingId, setRemovingId] = useState(null);

  useEffect(() => {
    fetch("/api/web2/gallery")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load gallery");
        return res.json();
      })
      .then((data) => setGroups(data.groups || []))
      .catch(() => setError("Failed to load Token Gallery."));
  }, []);

  async function handleRemove(item) {
    setRemovingId(item.id);
    setError(null);
    try {
      const res = await fetch("/api/web2/gallery", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          referenceId: item.referenceId,
          category: item.category,
          index: item.index,
          inGallery: false,
        }),
      });
      if (!res.ok) throw new Error("Remove failed");
      setGroups((prev) =>
        (prev || []).map((group) =>
          group.key === item.category
            ? { ...group, items: group.items.filter((entry) => entry.id !== item.id) }
            : group
        )
      );
    } catch (err) {
      setError(err.message || "Could not remove token.");
    } finally {
      setRemovingId(null);
    }
  }

  if (error && !groups) return <p className="text-sm">{error}</p>;
  if (!groups) {
    return <p className="mono text-xs text-black/50">Loading gallery…</p>;
  }

  const total = groups.reduce((sum, group) => sum + (group.items?.length || 0), 0);
  const visible = groups.filter((group) => group.items?.length);

  return (
    <div className="space-y-8">
      <div>
        <p className="mono text-xs tracking-wide uppercase text-black/50 mb-2">
          Collected tokens
        </p>
        <h1 className="text-2xl font-medium tracking-tight">
          Token Gallery{" "}
          <span className="mono text-base text-black/40">({total})</span>
        </h1>
        <p className="text-sm text-black/60 mt-2 max-w-xl leading-relaxed">
          Tokens you marked Include in Token Gallery from cataloged sites, grouped
          by type.
        </p>
      </div>

      {error && <p className="text-sm">{error}</p>}

      {total === 0 && (
        <p className="text-sm text-black/60">
          No tokens in your gallery yet. Open a liked site in the{" "}
          <Link href="/web2/catalog" className="underline underline-offset-2">
            catalog
          </Link>{" "}
          and click Include in Token Gallery.
        </p>
      )}

      {visible.map((group) => (
        <section key={group.key} className="space-y-3">
          <h2 className="mono text-xs uppercase tracking-wide text-black/50">
            {group.label}{" "}
            <span className="text-black/30">({group.items.length})</span>
          </h2>
          <ul
            className={
              group.key === "ctas" || group.key === "typography"
                ? "grid gap-3"
                : "grid grid-cols-2 gap-3"
            }
          >
            {group.items.map((item) => (
              <GalleryCard
                key={item.id}
                item={item}
                onRemove={handleRemove}
                removing={removingId === item.id}
              />
            ))}
          </ul>
        </section>
      ))}

      {total > 0 && visible.length < TOKEN_CATEGORIES.length && (
        <p className="mono text-xs text-black/40">
          Empty types are hidden until you include a token of that kind.
        </p>
      )}
    </div>
  );
}
