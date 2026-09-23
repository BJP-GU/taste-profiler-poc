"use client";

import TokenFace from "./TokenFace";

/**
 * Condensed (assembled) homepage — the lime-outlined center of the explode.
 */
export default function CondensedView({
  tokens,
  selectedId,
  onSelectToken,
  fill = false,
}) {
  const byType = Object.fromEntries(tokens.map((t) => [t.type, t]));
  const header = byType.header;
  const headline = byType.headline;
  const hero = byType.hero_image;
  const cta = byType.cta;

  return (
    <div
      className={`${fill ? "h-full w-full" : "w-full max-w-[340px]"} flex flex-col gap-2 rounded-sm border-[3px] border-lime-400 bg-neutral-100 p-2 shadow-[0_0_0_1px_rgba(163,230,53,0.35)]`}
      data-playground-condensed
    >
      {header && (
        <TokenSlot
          token={header}
          selected={selectedId === header.id}
          onSelect={onSelectToken}
          className={fill ? "h-11" : "h-11"}
        />
      )}
      {headline && (
        <TokenSlot
          token={headline}
          selected={selectedId === headline.id}
          onSelect={onSelectToken}
          className={fill ? "h-14" : "h-14"}
        />
      )}
      <div className={`relative ${fill ? "min-h-0 flex-1" : "h-44"}`}>
        {hero && (
          <TokenSlot
            token={hero}
            selected={selectedId === hero.id}
            onSelect={onSelectToken}
            className="absolute inset-0"
          />
        )}
        {cta && (
          <div className="absolute bottom-2 right-2 z-10 w-[40%]">
            <TokenSlot
              token={cta}
              selected={selectedId === cta.id}
              onSelect={onSelectToken}
              className="h-9"
            />
          </div>
        )}
      </div>
    </div>
  );
}

function TokenSlot({ token, selected, onSelect, className = "" }) {
  return (
    <button
      type="button"
      id={`token-slot-${token.id}`}
      onClick={(e) => {
        e.stopPropagation();
        onSelect?.(token);
      }}
      className={`group relative overflow-hidden rounded-[2px] bg-white text-left transition ${
        selected ? "ring-2 ring-lime-300" : "hover:ring-1 hover:ring-neutral-400"
      } ${className}`}
      aria-label={`Edit ${token.label}`}
    >
      <TokenFace token={token} />
      {token.status === "generating" && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/70 text-[10px] font-medium text-neutral-600">
          Generating…
        </div>
      )}
    </button>
  );
}
