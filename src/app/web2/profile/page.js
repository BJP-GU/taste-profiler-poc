"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { WEB_FACETS } from "@/lib/webFacets";
import CalibrationBar from "@/components/CalibrationBar";

export default function Web2ProfilePage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch("/api/web2/profile")
      .then((res) => res.json())
      .then(setData)
      .catch(() => setError("Failed to load profile."))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <p className="mono text-xs text-black/50">Loading profile…</p>;
  }
  if (error) return <p className="text-sm">{error}</p>;

  return (
    <div className="space-y-8">
      <div>
        <p className="mono text-xs tracking-wide uppercase text-black/50 mb-2">
          Semantic taste profile
        </p>
        <h1 className="text-2xl font-medium tracking-tight">Your taste</h1>
        <p className="text-sm text-black/60 mt-2 max-w-xl leading-relaxed">
          Liked and disliked sites form a support set. Facet descriptors are contrasted
          (juxtaposition), then synthesized into prefers / avoids language an AI design
          tool can follow.
        </p>
        {data.paper && (
          <p className="mono text-xs text-black/40 mt-2">{data.paper}</p>
        )}
      </div>

      {data.calibration && <CalibrationBar calibration={data.calibration} />}

      {data.insufficientData && (
        <p className="text-sm text-black/70 border border-black/20 p-4">
          Score at least{" "}
          <span className="mono">
            {data.requiredLiked} liked + {data.requiredDisliked} disliked
          </span>{" "}
          websites before generating a profile. You have{" "}
          <span className="mono">
            {data.calibration?.likedCount ?? 0} liked ·{" "}
            {data.calibration?.dislikedCount ?? 0} disliked
          </span>
          .{" "}
          <Link href="/web2" className="underline underline-offset-2">
            Add a site
          </Link>
          .
        </p>
      )}

      {data.insufficientDescriptors && (
        <p className="text-sm border border-black p-4">
          Facet descriptions are empty across your support set, so there is nothing
          concrete to summarize. Edit descriptors in the catalog, then return here.
        </p>
      )}

      {!data.insufficientData && !data.insufficientDescriptors && (
        <>
          <div className="border border-black p-5 bg-white leading-relaxed text-sm whitespace-pre-line">
            {data.profileText}
          </div>
          {data.cached && (
            <p className="mono text-xs text-black/40">Cached · unchanged support set</p>
          )}

          <div className="space-y-3">
            <h2 className="mono text-xs uppercase tracking-wide text-black/50">
              Facet profile
            </h2>
            <div className="divide-y divide-black/15 border border-black/15">
              {WEB_FACETS.map((f) => {
                const sem = data.semanticFacets?.[f.key];
                if (!sem) return null;
                return (
                  <div key={f.key} className="p-4 grid sm:grid-cols-[10rem_1fr] gap-3">
                    <div>
                      <div className="text-sm font-medium">{f.label}</div>
                    </div>
                    <div className="text-sm space-y-1">
                      <p>
                        <span className="mono text-xs uppercase text-black mr-2">
                          Prefers
                        </span>
                        <span className="text-black/40">{sem.prefers}</span>
                      </p>
                      <p>
                        <span className="mono text-xs uppercase text-black mr-2">
                          Avoids
                        </span>
                        <span className="text-black/40">{sem.avoids}</span>
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
