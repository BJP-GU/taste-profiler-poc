"use client";

import { useEffect, useState } from "react";
import { FACETS } from "@/lib/facets";
import FacetScorePlot from "@/components/FacetScorePlot";

export default function ProfilePage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch("/api/profile")
      .then((res) => res.json())
      .then(setData)
      .catch(() => setError("Failed to load profile."))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="text-sm text-neutral-500">Loading...</p>;
  if (error) return <p className="text-red-600 text-sm">{error}</p>;

  const howProfileWorks = (
    <p className="text-sm text-neutral-500 mt-2 leading-relaxed">
      <span className="font-medium text-neutral-700">
        Semantic profile (how profile generation works):
      </span>{" "}
      Once you have enough references, the app aggregates per facet: average score plus the
      descriptor phrases tied to your likes and dislikes. That structured bundle is sent to Claude
      once (then cached) to write the plain-language taste summary.
    </p>
  );

  if (data.insufficientData) {
    return (
      <div className="space-y-4">
        <div>
          <h1 className="text-xl font-semibold">Your taste profile</h1>
          {howProfileWorks}
        </div>
        <p className="text-sm text-neutral-500">
          Score at least {data.required} references before generating a taste profile. You
          currently have {data.count}.
        </p>
      </div>
    );
  }

  if (data.insufficientDescriptors) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-xl font-semibold">Your taste profile</h1>
          {howProfileWorks}
        </div>
        <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded px-3 py-2">
          Every scored facet across your {data.count} references has an empty description, so
          there's nothing concrete to summarize yet. Go back into the catalog and add a short
          description to a few of your liked and disliked facets, then come back here.
        </p>
        {data.placements?.length > 0 && (
          <FacetScorePlot facets={FACETS} placements={data.placements} />
        )}
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-semibold">Your taste profile</h1>
        <p className="text-sm text-neutral-500 mt-1">
          Based on {data.count} scored references
          {data.cached ? " · saved profile" : ""}.
        </p>
        {howProfileWorks}
      </div>

      <div className="border border-neutral-200 rounded p-4 bg-white leading-relaxed text-sm whitespace-pre-line">
        {data.profileText}
      </div>

      {data.placements?.length > 0 && (
        <FacetScorePlot facets={FACETS} placements={data.placements} />
      )}
    </div>
  );
}
