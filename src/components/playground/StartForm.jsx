"use client";

import { useState } from "react";
import Link from "next/link";

/**
 * Kick off a playground session: text prompt + optional catalog reference.
 * Taste profile is applied automatically on the server.
 */
export default function StartForm({ onGenerated, references, loadingRefs }) {
  const [prompt, setPrompt] = useState("");
  const [referenceId, setReferenceId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!prompt.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/web/playground/wireframe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: prompt.trim(),
          referenceId: referenceId || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Wireframe generation failed");
      onGenerated(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-full max-w-xl flex-col justify-center overflow-auto px-4 py-10">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">Playground</h1>
        <p className="mt-2 text-sm leading-relaxed text-neutral-500">
          Generate a homepage wireframe from a prompt, an optional catalog reference, and your
          taste profile. Tokens start blank. Click any piece in the exploded view to base it on a
          catalog site and generate the component.
        </p>
        {!loadingRefs && (
          <p className="mt-2 text-xs text-neutral-400">
            {references.length
              ? `Taste profile from ${references.length} catalog ${references.length === 1 ? "site" : "sites"} is applied automatically.`
              : "No catalog sites yet — the wireframe will use your prompt only. Score references to ground later components."}
          </p>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-5 rounded-lg border border-neutral-200 bg-white p-5">
        <div>
          <label htmlFor="wire-prompt" className="mb-1.5 block text-sm font-medium">
            Prompt
          </label>
          <textarea
            id="wire-prompt"
            rows={4}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="e.g. A calm architectural studio homepage — sparse type, full-bleed project photography, one quiet CTA"
            className="w-full resize-none rounded border border-neutral-200 px-3 py-2 text-sm outline-none focus:border-neutral-400"
            required
          />
        </div>

        <div>
          <div className="mb-1.5 flex items-baseline justify-between">
            <span className="text-sm font-medium">Reference (optional)</span>
            <Link href="/web/catalog" className="text-xs text-neutral-500 underline hover:text-neutral-800">
              Open catalog
            </Link>
          </div>
          {loadingRefs ? (
            <p className="text-xs text-neutral-500">Loading references…</p>
          ) : references.length === 0 ? (
            <p className="rounded border border-neutral-200 bg-neutral-50 px-3 py-2 text-xs text-neutral-500">
              No scored sites yet — you can still generate a wireframe from prompt + taste profile.
            </p>
          ) : (
            <div className="grid max-h-48 grid-cols-3 gap-2 overflow-y-auto sm:grid-cols-4">
              <button
                type="button"
                onClick={() => setReferenceId("")}
                className={`rounded border px-2 py-3 text-xs ${
                  !referenceId
                    ? "border-neutral-900 bg-neutral-900 text-white"
                    : "border-neutral-200 text-neutral-600 hover:border-neutral-400"
                }`}
              >
                None
              </button>
              {references.map((ref) => {
                const active = referenceId === ref.id;
                return (
                  <button
                    key={ref.id}
                    type="button"
                    onClick={() => setReferenceId(ref.id)}
                    className={`overflow-hidden rounded border text-left ${
                      active ? "border-neutral-900 ring-1 ring-neutral-900" : "border-neutral-200"
                    }`}
                  >
                    {ref.imagePath ? (
                      <img
                        src={ref.imagePath}
                        alt=""
                        className="h-16 w-full object-cover object-top"
                      />
                    ) : (
                      <div className="flex h-16 items-center justify-center bg-neutral-100 text-[10px] text-neutral-500">
                        {ref.hostname || "site"}
                      </div>
                    )}
                    <div className="truncate px-1.5 py-1 text-[10px] text-neutral-600">
                      {ref.hostname || ref.sourceUrl}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {error && (
          <p className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading || !prompt.trim()}
          className="w-full rounded bg-neutral-900 px-4 py-2.5 text-sm font-medium text-white disabled:bg-neutral-300"
        >
          {loading ? "Generating wireframe…" : "Generate wireframe"}
        </button>
      </form>
    </div>
  );
}
