"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { WEB_FACETS } from "@/lib/webFacets";

const SCORE_OPTIONS = [
  { value: -1, label: "Dislike" },
  { value: 0, label: "Neutral" },
  { value: 1, label: "Like" },
];

export default function WebUploadPage() {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [sourceUrl, setSourceUrl] = useState(null);
  const [hostname, setHostname] = useState(null);
  const [imagePath, setImagePath] = useState(null);
  const [facets, setFacets] = useState(null);
  const [conceptNote, setConceptNote] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [warning, setWarning] = useState(null);

  async function handleAnalyze(e) {
    e.preventDefault();
    if (!url.trim()) return;

    setFacets(null);
    setSourceUrl(null);
    setHostname(null);
    setImagePath(null);
    setError(null);
    setWarning(null);
    setAnalyzing(true);

    try {
      const res = await fetch("/api/web/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Analysis failed");

      setSourceUrl(data.sourceUrl);
      setHostname(data.hostname);
      setImagePath(data.imagePath || null);
      setFacets(
        WEB_FACETS.map((f) => ({
          name: f.key,
          descriptor: data.descriptors?.[f.key] || "",
          score: 0,
        }))
      );

      const warnings = [];
      if (!data.descriptors) {
        warnings.push(
          "Automatic tagging didn't return a result, probably an API key or model issue. Check your .env.local, or just type a short description into each facet below before scoring."
        );
      }
      if (!data.imagePath) {
        warnings.push(
          "Could not capture a screenshot of this page. You can still score it from the URL; try again later if you want a preview."
        );
      }
      if (warnings.length) setWarning(warnings.join(" "));
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
    if (!sourceUrl || !facets) return;
    setSaving(true);
    setError(null);

    try {
      const res = await fetch("/api/web/references", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sourceUrl, hostname, imagePath, facets, conceptNote }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Save failed");
      router.push("/web/catalog");
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Add a website reference</h1>
        <p className="text-sm text-neutral-500 mt-1">
          Paste a landing-page URL. Claude reads the page HTML and suggests a short
          description for each facet; a screenshot is saved so you can see the site while
          scoring. Edit any descriptors, then score whether that facet is part of why you
          like or dislike the site.
        </p>
      </div>

      <form onSubmit={handleAnalyze} className="flex flex-col sm:flex-row gap-2">
        <input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://example.com"
          required
          className="flex-1 border border-neutral-300 rounded px-3 py-2 text-sm"
        />
        <button
          type="submit"
          disabled={analyzing || !url.trim()}
          className="bg-neutral-900 text-white px-4 py-2 rounded text-sm disabled:opacity-50 shrink-0"
        >
          {analyzing ? "Reading page..." : "Analyze"}
        </button>
      </form>

      {error && <p className="text-red-600 text-sm">{error}</p>}
      {warning && (
        <p className="text-amber-700 text-sm bg-amber-50 border border-amber-200 rounded px-3 py-2">
          {warning}
        </p>
      )}

      {analyzing && (
        <p className="text-sm text-neutral-500">
          Fetching landing page, capturing screenshot, and tagging facets...
        </p>
      )}

      {sourceUrl && (
        <div className="space-y-3">
          {imagePath ? (
            <img
              src={imagePath}
              alt={`Screenshot of ${hostname || sourceUrl}`}
              className="w-full max-h-[28rem] object-cover object-top rounded border border-neutral-200 bg-neutral-50"
            />
          ) : (
            <div className="w-full h-40 rounded border border-dashed border-neutral-300 bg-neutral-50 flex items-center justify-center text-sm text-neutral-400">
              No screenshot available
            </div>
          )}
          <div className="text-sm">
            <div className="font-medium">{hostname || sourceUrl}</div>
            <a
              href={sourceUrl}
              target="_blank"
              rel="noreferrer"
              className="text-neutral-500 hover:text-neutral-800 break-all"
            >
              {sourceUrl}
            </a>
          </div>
        </div>
      )}

      {facets && (
        <div className="space-y-4">
          {WEB_FACETS.map((f, i) => (
            <div key={f.key} className="border border-neutral-200 rounded p-3 space-y-2 bg-white">
              <div>
                <div className="font-medium text-sm">{f.label}</div>
                {f.hint && <div className="text-xs text-neutral-400 mt-0.5">{f.hint}</div>}
              </div>
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
              Anything else driving your reaction to this site? (optional)
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
