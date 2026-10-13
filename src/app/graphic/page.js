"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FACETS } from "@/lib/facets";

const SCORE_OPTIONS = [
  { value: -1, label: "Dislike" },
  { value: 0, label: "Neutral" },
  { value: 1, label: "Like" },
];

export default function UploadPage() {
  const router = useRouter();
  const [preview, setPreview] = useState(null);
  const [imagePath, setImagePath] = useState(null);
  const [facets, setFacets] = useState(null); // [{ name, descriptor, score }]
  const [conceptNote, setConceptNote] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [warning, setWarning] = useState(null);

  async function handleFileChange(e) {
    const selected = e.target.files?.[0];
    if (!selected) return;

    setPreview(URL.createObjectURL(selected));
    setFacets(null);
    setImagePath(null);
    setError(null);
    setWarning(null);
    setAnalyzing(true);

    try {
      const formData = new FormData();
      formData.append("image", selected);
      const res = await fetch("/api/analyze", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Analysis failed");

      setImagePath(data.imagePath);
      setFacets(
        FACETS.map((f) => ({
          name: f.key,
          descriptor: data.descriptors?.[f.key] || "",
          score: 0,
        }))
      );

      // Automatic tagging can fail silently (bad/missing API key, rate
      // limit, wrong model name) and still return a 200 with no
      // descriptors. Surface that loudly rather than letting someone score
      // six blank text fields without noticing.
      if (!data.descriptors) {
        setWarning(
          "Automatic tagging didn't return a result, probably an API key or model issue. Check your .env.local, or just type a short description into each facet below before scoring."
        );
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setAnalyzing(false);
    }
  }

  function updateFacet(index, patch) {
    setFacets((prev) => prev.map((f, i) => (i === index ? { ...f, ...patch } : f)));
  }

  async function handleSave() {
    if (!imagePath || !facets) return;
    setSaving(true);
    setError(null);

    try {
      const res = await fetch("/api/references", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imagePath, facets, conceptNote }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Save failed");
      router.push("/catalog");
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Upload a reference</h1>
        <p className="text-sm text-neutral-500 mt-1">
          Upload a poster. Claude will suggest a short description for each facet based on
          what it sees; edit any of them, then score whether that facet is part of why you
          like or dislike the piece.
        </p>
      </div>

      <input
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="text-sm"
      />

      {error && <p className="text-red-600 text-sm">{error}</p>}
      {warning && (
        <p className="text-amber-700 text-sm bg-amber-50 border border-amber-200 rounded px-3 py-2">
          {warning}
        </p>
      )}

      {preview && (
        <img
          src={preview}
          alt="Preview"
          className="max-h-96 rounded border border-neutral-200"
        />
      )}

      {analyzing && <p className="text-sm text-neutral-500">Analyzing image...</p>}

      {facets && (
        <div className="space-y-4">
          {FACETS.map((f, i) => (
            <div key={f.key} className="border border-neutral-200 rounded p-3 space-y-2 bg-white">
              <div className="font-medium text-sm">{f.label}</div>
              <input
                type="text"
                value={facets[i].descriptor}
                onChange={(e) => updateFacet(i, { descriptor: e.target.value })}
                placeholder="Descriptor"
                className="w-full border border-neutral-300 rounded px-2 py-1 text-sm"
              />
              <div className="flex gap-2">
                {SCORE_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => updateFacet(i, { score: opt.value })}
                    className={`px-3 py-1 rounded text-sm border transition-colors ${
                      facets[i].score === opt.value
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
            <label className="text-sm font-medium block mb-1">
              Anything else driving your reaction to this piece? (optional)
            </label>
            <textarea
              value={conceptNote}
              onChange={(e) => setConceptNote(e.target.value)}
              rows={2}
              className="w-full border border-neutral-300 rounded px-2 py-1 text-sm"
            />
          </div>

          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="bg-neutral-900 text-white px-4 py-2 rounded text-sm disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save reference"}
          </button>
        </div>
      )}
    </div>
  );
}
