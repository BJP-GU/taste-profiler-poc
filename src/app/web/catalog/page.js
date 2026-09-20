import Link from "next/link";
import { listWebReferences } from "@/lib/webDb";
import { WEB_FACETS } from "@/lib/webFacets";
import DeleteReferenceButton from "@/components/DeleteReferenceButton";

export const dynamic = "force-dynamic";

export default function WebCatalogPage() {
  const refs = listWebReferences();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Catalog ({refs.length})</h1>
        <p className="text-sm text-neutral-500 mt-2 leading-relaxed">
          <span className="font-medium text-neutral-700">Collection (how cataloging works):</span>{" "}
          Claude reads the landing-page HTML and writes a short neutral descriptor per facet. A
          screenshot is saved with the reference. You score each facet &quot;Dislike, Neutral,
          Like&quot; (−1 / 0 / 1). That URL + screenshot + descriptors + scores is one reference.
        </p>
      </div>

      {refs.length === 0 && (
        <p className="text-sm text-neutral-500">
          No references yet.{" "}
          <Link href="/web" className="underline hover:text-neutral-800">
            Add a website
          </Link>{" "}
          to get started.
        </p>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {refs.map((ref) => (
          <div
            key={ref.id}
            className="border border-neutral-200 rounded overflow-hidden bg-white hover:border-neutral-400 transition-colors"
          >
            <Link href={`/web/catalog/${ref.id}`} className="block">
              {ref.imagePath ? (
                <img
                  src={ref.imagePath}
                  alt=""
                  className="w-full h-40 object-cover object-top bg-neutral-50"
                />
              ) : (
                <div className="w-full h-40 bg-neutral-100 flex items-center justify-center px-3 text-center">
                  <span className="text-xs text-neutral-500 truncate w-full">
                    {ref.hostname || ref.sourceUrl}
                  </span>
                </div>
              )}
              <div className="p-2 space-y-1">
                <div className="text-xs font-medium truncate">
                  {ref.hostname || ref.sourceUrl}
                </div>
                <div className="flex flex-wrap gap-1">
                  {WEB_FACETS.map((f) => {
                    const facet = ref.facets.find((x) => x.name === f.key);
                    const score = facet?.score ?? 0;
                    const color =
                      score === 1
                        ? "bg-green-500"
                        : score === -1
                          ? "bg-red-500"
                          : "bg-neutral-300";
                    return (
                      <span
                        key={f.key}
                        title={`${f.label}: ${facet?.descriptor || ""}`}
                        className={`w-3 h-3 rounded-full ${color}`}
                      />
                    );
                  })}
                </div>
              </div>
            </Link>
            <div className="px-2 pb-2">
              <DeleteReferenceButton
                id={ref.id}
                apiPath="/api/web/references"
                className="text-xs text-neutral-500 hover:text-red-600 disabled:opacity-50"
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
