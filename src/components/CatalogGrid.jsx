"use client";

import { useState } from "react";
import Link from "next/link";
import { WEB_FACETS } from "@/lib/webFacets";
import { referenceValence } from "@/lib/pseudoClient";
import DeleteReferenceButton from "@/components/DeleteReferenceButton";

export default function CatalogGrid({ refs }) {
  const [hideDisliked, setHideDisliked] = useState(true);

  const visible = hideDisliked
    ? refs.filter((ref) => referenceValence(ref) !== -1)
    : refs;
  const dislikedCount = refs.filter((ref) => referenceValence(ref) === -1).length;

  return (
    <div className="space-y-4">
      {refs.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="mono text-xs text-black/40">
            Showing {visible.length}
            {hideDisliked && dislikedCount > 0
              ? ` · ${dislikedCount} disliked hidden`
              : ` of ${refs.length}`}
          </p>
          <button
            type="button"
            onClick={() => setHideDisliked((v) => !v)}
            aria-pressed={hideDisliked}
            className={`mono text-xs border border-black px-3 py-1.5 transition-colors ${
              hideDisliked
                ? "bg-black text-white"
                : "bg-white text-black hover:bg-black/5"
            }`}
          >
            {hideDisliked ? "Show disliked" : "Hide disliked"}
          </button>
        </div>
      )}

      {hideDisliked && visible.length === 0 && refs.length > 0 && (
        <p className="text-sm text-black/60">
          All references are disliked.{" "}
          <button
            type="button"
            onClick={() => setHideDisliked(false)}
            className="underline underline-offset-2"
          >
            Show disliked
          </button>
          .
        </p>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {visible.map((ref) => {
          const v = referenceValence(ref);
          return (
            <div
              key={ref.id}
              className="border border-black/20 overflow-hidden bg-white hover:border-black transition-colors"
            >
              <Link href={`/web2/catalog/${ref.id}`} className="block">
                {ref.imagePath ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={ref.imagePath}
                    alt=""
                    className="w-full h-40 object-cover object-top bg-white"
                  />
                ) : (
                  <div className="w-full h-40 border-b border-black/10 flex items-center justify-center px-3 text-center">
                    <span className="mono text-xs text-black/40 truncate w-full">
                      {ref.hostname || ref.sourceUrl}
                    </span>
                  </div>
                )}
                <div className="p-2 space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-xs font-medium truncate">
                      {ref.hostname || ref.sourceUrl}
                    </div>
                    <span className="mono text-[10px] uppercase shrink-0">
                      {v === 1 ? "like" : v === -1 ? "dislike" : "—"}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {WEB_FACETS.map((f) => {
                      const facet = ref.facets.find((x) => x.name === f.key);
                      const score = facet?.score ?? 0;
                      const fill =
                        score === 1
                          ? "bg-black"
                          : score === -1
                            ? "bg-black/30"
                            : "bg-black/10";
                      return (
                        <span
                          key={f.key}
                          title={`${f.label}: ${facet?.descriptor || ""}`}
                          className={`w-2.5 h-2.5 ${fill}`}
                        />
                      );
                    })}
                  </div>
                </div>
              </Link>
              <div className="px-2 pb-2">
                <DeleteReferenceButton
                  id={ref.id}
                  apiPath="/api/web2/references"
                  className="mono text-xs text-black/40 hover:text-black disabled:opacity-50"
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
