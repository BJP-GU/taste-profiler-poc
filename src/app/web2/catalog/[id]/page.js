"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { WEB_FACETS } from "@/lib/webFacets";
import { emptyDesignTokens } from "@/lib/designTokens";
import DeleteReferenceButton from "@/components/DeleteReferenceButton";
import ReferenceDetailTabs from "@/components/ReferenceDetailTabs";
import ReferenceTokensPanel from "@/components/ReferenceTokensPanel";

const SCORE_OPTIONS = [
  { value: -1, label: "Dislike" },
  { value: 0, label: "Neutral" },
  { value: 1, label: "Like" },
];

export default function EditWeb2ReferencePage() {
  const { id } = useParams();
  const router = useRouter();
  const [ref, setRef] = useState(null);
  const [tab, setTab] = useState("facets");
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch(`/api/web2/references/${id}`)
      .then((res) => {
        if (!res.ok) throw new Error("Not found");
        return res.json();
      })
      .then(setRef)
      .catch(() => setError("Failed to load this reference."));
  }, [id]);

  function updateFacet(index, patch) {
    setRef((prev) => ({
      ...prev,
      facets: prev.facets.map((f, i) => (i === index ? { ...f, ...patch } : f)),
    }));
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/web2/references/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          facets: ref.facets,
          conceptNote: ref.conceptNote,
          tokens: ref.tokens || emptyDesignTokens(),
        }),
      });
      if (!res.ok) throw new Error("Save failed");
      router.push("/web2/catalog");
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  if (error && !ref) return <p className="text-red-600 text-sm">{error}</p>;
  if (!ref) return <p className="text-sm text-neutral-500">Loading...</p>;

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Edit reference</h1>

      {ref.imagePath ? (
        <img
          src={ref.imagePath}
          alt={`Screenshot of ${ref.hostname || ref.sourceUrl}`}
          className="w-full max-h-[28rem] object-cover object-top rounded border border-neutral-200 bg-neutral-50"
        />
      ) : null}

      <div className="border border-neutral-200 rounded p-3 bg-white text-sm">
        <div className="font-medium">{ref.hostname || ref.sourceUrl}</div>
        <a
          href={ref.sourceUrl}
          target="_blank"
          rel="noreferrer"
          className="text-neutral-500 hover:text-neutral-800 break-all"
        >
          {ref.sourceUrl}
        </a>
      </div>

      <ReferenceDetailTabs active={tab} onChange={setTab} />

      {tab === "facets" && (
        <div className="space-y-4">
          {WEB_FACETS.map((f, i) => (
            <div
              key={f.key}
              className="border border-neutral-200 rounded p-3 space-y-2 bg-white"
            >
              <div>
                <div className="font-medium text-sm">{f.label}</div>
                {f.hint && <div className="text-xs text-neutral-400 mt-0.5">{f.hint}</div>}
              </div>
              <input
                type="text"
                value={ref.facets[i]?.descriptor || ""}
                onChange={(e) => updateFacet(i, { descriptor: e.target.value })}
                className="w-full border border-neutral-300 rounded px-2 py-1 text-sm"
              />
              <div className="flex gap-2">
                {SCORE_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => updateFacet(i, { score: opt.value })}
                    className={`px-3 py-1 rounded text-sm border transition-colors ${
                      ref.facets[i]?.score === opt.value
                        ? "bg-neutral-900 text-white border-neutral-900"
                        : "bg-white border-neutral-300 hover:border-neutral-500"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          ))}

          <div>
            <label className="text-sm font-medium block mb-1">Notes</label>
            <textarea
              value={ref.conceptNote || ""}
              onChange={(e) => setRef((prev) => ({ ...prev, conceptNote: e.target.value }))}
              rows={2}
              className="w-full border border-neutral-300 rounded px-2 py-1 text-sm"
            />
          </div>
        </div>
      )}

      {tab === "tokens" && (
        <ReferenceTokensPanel tokens={ref.tokens || emptyDesignTokens()} />
      )}

      {error && <p className="text-red-600 text-sm">{error}</p>}

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="bg-neutral-900 text-white px-4 py-2 rounded text-sm disabled:opacity-50"
        >
          {saving ? "Saving..." : "Save changes"}
        </button>
        <DeleteReferenceButton
          id={id}
          apiPath="/api/web2/references"
          redirectTo="/web2/catalog"
          label="Remove from catalog"
          className="text-sm text-neutral-500 hover:text-red-600 disabled:opacity-50"
        />
      </div>
    </div>
  );
}
