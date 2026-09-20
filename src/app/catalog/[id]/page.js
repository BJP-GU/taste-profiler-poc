"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { FACETS } from "@/lib/facets";
import DeleteReferenceButton from "@/components/DeleteReferenceButton";

const SCORE_OPTIONS = [
  { value: -1, label: "Dislike" },
  { value: 0, label: "Neutral" },
  { value: 1, label: "Like" },
];

export default function EditReferencePage() {
  const { id } = useParams();
  const router = useRouter();
  const [ref, setRef] = useState(null);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch(`/api/references/${id}`)
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
      const res = await fetch(`/api/references/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ facets: ref.facets, conceptNote: ref.conceptNote }),
      });
      if (!res.ok) throw new Error("Save failed");
      router.push("/catalog");
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  if (error) return <p className="text-red-600 text-sm">{error}</p>;
  if (!ref) return <p className="text-sm text-neutral-500">Loading...</p>;

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Edit reference</h1>
      <img
        src={ref.imagePath}
        alt=""
        className="max-h-96 rounded border border-neutral-200"
      />

      <div className="space-y-4">
        {FACETS.map((f, i) => (
          <div key={f.key} className="border border-neutral-200 rounded p-3 space-y-2 bg-white">
            <div className="font-medium text-sm">{f.label}</div>
            <input
              type="text"
              value={ref.facets[i].descriptor}
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
                    ref.facets[i].score === opt.value
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
            redirectTo="/catalog"
            label="Remove from catalog"
            className="text-sm text-neutral-500 hover:text-red-600 disabled:opacity-50"
          />
        </div>
      </div>
    </div>
  );
}
