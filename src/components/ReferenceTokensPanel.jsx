"use client";

import { TOKEN_CATEGORIES } from "@/lib/designTokens";

function looksLikeCssColor(value) {
  if (!value || typeof value !== "string") return false;
  const v = value.trim();
  return (
    /^#([0-9a-f]{3}|[0-9a-f]{4}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(v) ||
    /^(rgb|rgba|hsl|hsla)\(/i.test(v)
  );
}

function ColorToken({ token }) {
  const swatch = looksLikeCssColor(token.value) ? token.value : null;
  return (
    <li className="flex items-center gap-3 border border-neutral-200 rounded px-3 py-2 bg-white">
      <span
        className="w-8 h-8 rounded border border-neutral-200 shrink-0"
        style={swatch ? { backgroundColor: swatch } : { backgroundColor: "#e5e5e5" }}
        title={token.value}
        aria-hidden
      />
      <div className="min-w-0">
        <div className="text-sm font-medium truncate">{token.label}</div>
        <div className="text-xs text-neutral-500 font-mono truncate">{token.value}</div>
        {token.role && token.role !== token.label ? (
          <div className="text-xs text-neutral-400 truncate">{token.role}</div>
        ) : null}
      </div>
    </li>
  );
}

function TypographyToken({ token }) {
  return (
    <li className="border border-neutral-200 rounded px-3 py-2 bg-white space-y-0.5">
      <div className="text-sm font-medium">{token.label}</div>
      <div
        className="text-base text-neutral-800 truncate"
        style={token.family ? { fontFamily: token.family } : undefined}
      >
        {token.family || token.value}
      </div>
      <div className="text-xs text-neutral-500">
        {[token.weight, token.size].filter(Boolean).join(" · ") || token.value}
      </div>
    </li>
  );
}

function IconToken({ token }) {
  return (
    <li className="border border-neutral-200 rounded px-3 py-2 bg-white space-y-0.5">
      <div className="text-sm font-medium">{token.label}</div>
      <div className="text-xs text-neutral-500">{token.value}</div>
      {(token.style || token.source) && (
        <div className="text-xs text-neutral-400">
          {[token.style, token.source].filter(Boolean).join(" · ")}
        </div>
      )}
    </li>
  );
}

function CategoryBlock({ categoryKey, label, items }) {
  if (!items?.length) {
    return (
      <section className="space-y-2">
        <h3 className="text-sm font-semibold">{label}</h3>
        <p className="text-xs text-neutral-400">No {label.toLowerCase()} tokens extracted.</p>
      </section>
    );
  }

  return (
    <section className="space-y-2">
      <h3 className="text-sm font-semibold">
        {label}{" "}
        <span className="font-normal text-neutral-400">({items.length})</span>
      </h3>
      <ul className="grid gap-2 sm:grid-cols-2">
        {items.map((token, i) => {
          const key = `${categoryKey}-${i}-${token.label}-${token.value}`;
          if (categoryKey === "colors") return <ColorToken key={key} token={token} />;
          if (categoryKey === "typography")
            return <TypographyToken key={key} token={token} />;
          return <IconToken key={key} token={token} />;
        })}
      </ul>
    </section>
  );
}

export default function ReferenceTokensPanel({ tokens }) {
  const data = tokens || { colors: [], typography: [], icons: [] };
  const total =
    (data.colors?.length || 0) +
    (data.typography?.length || 0) +
    (data.icons?.length || 0);

  if (!total) {
    return (
      <p className="text-sm text-neutral-500">
        No design tokens were extracted for this reference.
      </p>
    );
  }

  return (
    <div className="space-y-6">
      {TOKEN_CATEGORIES.map((cat) => (
        <CategoryBlock
          key={cat.key}
          categoryKey={cat.key}
          label={cat.label}
          items={data[cat.key]}
        />
      ))}
    </div>
  );
}
