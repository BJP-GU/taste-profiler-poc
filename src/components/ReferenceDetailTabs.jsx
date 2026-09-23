"use client";

const TABS = [
  { id: "facets", label: "Facets" },
  { id: "tokens", label: "Tokens" },
];

export default function ReferenceDetailTabs({ active, onChange }) {
  return (
    <div
      role="tablist"
      aria-label="Reference details"
      className="flex gap-1 border-b border-neutral-200"
    >
      {TABS.map((tab) => {
        const selected = active === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={selected}
            onClick={() => onChange(tab.id)}
            className={`px-3 py-2 text-sm border-b-2 -mb-px transition-colors ${
              selected
                ? "border-neutral-900 text-neutral-900 font-medium"
                : "border-transparent text-neutral-500 hover:text-neutral-800"
            }`}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
