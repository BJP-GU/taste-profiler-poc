import Link from "next/link";
import { listReferences } from "@/lib/db";
import { FACETS } from "@/lib/facets";
import DeleteReferenceButton from "@/components/DeleteReferenceButton";

// Always read the latest data from disk rather than caching the page.
export const dynamic = "force-dynamic";

export default function CatalogPage() {
  const refs = listReferences();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Catalog ({refs.length})</h1>
        <p className="text-sm text-neutral-500 mt-2 leading-relaxed">
          <span className="font-medium text-neutral-700">Collection (how cataloging works):</span>{" "}
          Claude vision writes a short neutral descriptor per facet for the poster. You score each
          facet &quot;Dislike, Neutral, Like&quot; (−1 / 0 / 1). That image + descriptors + scores is
          saved as one reference.
        </p>
      </div>

      {refs.length === 0 && (
        <p className="text-sm text-neutral-500">
          No references yet. Upload one to get started.
        </p>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {refs.map((ref) => (
          <div
            key={ref.id}
            className="border border-neutral-200 rounded overflow-hidden bg-white hover:border-neutral-400 transition-colors"
          >
            <Link href={`/catalog/${ref.id}`} className="block">
              <img src={ref.imagePath} alt="" className="w-full h-40 object-cover" />
              <div className="p-2 flex flex-wrap gap-1">
                {FACETS.map((f) => {
                  const facet = ref.facets.find((x) => x.name === f.key);
                  const score = facet?.score ?? 0;
                  const color =
                    score === 1 ? "bg-green-500" : score === -1 ? "bg-red-500" : "bg-neutral-300";
                  return (
                    <span
                      key={f.key}
                      title={`${f.label}: ${facet?.descriptor || ""}`}
                      className={`w-3 h-3 rounded-full ${color}`}
                    />
                  );
                })}
              </div>
            </Link>
            <div className="px-2 pb-2">
              <DeleteReferenceButton
                id={ref.id}
                className="text-xs text-neutral-500 hover:text-red-600 disabled:opacity-50"
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
