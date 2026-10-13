"use client";

const TABS = [
  { id: "facets", label: "Facets" },
  { id: "tokens", label: "Tokens" },
];

export default function ReferenceDetailTabs({
  active,
  onChange,
  tokensEnabled = true,
}) {
  return (
    <div
      role="tablist"
      aria-label="Reference details"
      className="flex gap-1 border-b border-black"
    >
      {TABS.map((tab) => {
        const selected = active === tab.id;
        const disabled = tab.id === "tokens" && !tokensEnabled;
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={selected}
            aria-disabled={disabled}
            disabled={disabled}
            title={
              disabled
                ? "Token breakdown is only available for liked sites"
                : undefined
            }
            onClick={() => {
              if (!disabled) onChange(tab.id);
            }}
            className={`px-3 py-2 text-sm border-b-2 -mb-px transition-colors ${
              disabled
                ? "border-transparent text-black/25 cursor-not-allowed"
                : selected
                  ? "border-black text-black font-medium"
                  : "border-transparent text-black/40 hover:text-black"
            }`}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
