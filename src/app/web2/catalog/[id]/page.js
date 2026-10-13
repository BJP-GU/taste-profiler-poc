"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { WEB_FACETS } from "@/lib/webFacets";
import {
  emptyDesignTokens,
  applyFacetDefaultsToTokens,
  preserveTokenSelections,
} from "@/lib/designTokens";
import DeleteReferenceButton from "@/components/DeleteReferenceButton";
import ReferenceDetailTabs from "@/components/ReferenceDetailTabs";
import ReferenceTokensPanel from "@/components/ReferenceTokensPanel";

const SCORE_OPTIONS = [
  { value: -1, label: "Dislike" },
  { value: 0, label: "Neutral" },
  { value: 1, label: "Like" },
];

function tokenCount(tokens) {
  return (
    (tokens?.colors?.length || 0) +
    (tokens?.typography?.length || 0) +
    (tokens?.icons?.length || 0) +
    (tokens?.ctas?.length || 0)
  );
}

export default function EditWeb2ReferencePage() {
  const { id } = useParams();
  const router = useRouter();
  const [ref, setRef] = useState(null);
  const [tab, setTab] = useState("facets");
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [reanalyzing, setReanalyzing] = useState(false);

  useEffect(() => {
    fetch(`/api/web2/references/${id}`)
      .then((res) => {
        if (!res.ok) throw new Error("Not found");
        return res.json();
      })
      .then((data) => {
        const facets = data.facets || [];
        const liked = data.valence === 1;
        const tokens = liked
          ? applyFacetDefaultsToTokens(data.tokens || emptyDesignTokens(), facets)
          : emptyDesignTokens();
        setRef({ ...data, facets, tokens });
      })
      .catch(() => setError("Failed to load this reference."));
  }, [id]);

  function updateFacet(index, patch) {
    setRef((prev) => {
      const facets = prev.facets.map((f, i) => (i === index ? { ...f, ...patch } : f));
      const tokens =
        prev.valence === 1
          ? applyFacetDefaultsToTokens(prev.tokens, facets)
          : emptyDesignTokens();
      return { ...prev, facets, tokens };
    });
  }

  const handleRefreshTokens = useCallback(async () => {
    if (!ref?.sourceUrl) return;
    setRefreshing(true);
    setError(null);
    try {
      const res = await fetch("/api/web2/extract-tokens", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: ref.sourceUrl }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Refresh failed");
      setRef((prev) => ({
        ...prev,
        tokens: preserveTokenSelections(
          prev.tokens,
          applyFacetDefaultsToTokens(data.tokens, prev.facets)
        ),
      }));
    } catch (err) {
      setError(err.message);
    } finally {
      setRefreshing(false);
    }
  }, [ref?.sourceUrl]);

  async function handleReanalyze() {
    if (!id || reanalyzing) return;
    setReanalyzing(true);
    setError(null);
    try {
      const res = await fetch(`/api/web2/references/${id}/reanalyze`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Reanalyze failed");
      const next = data.reference;
      const facets = next.facets || [];
      const liked = next.valence === 1;
      setRef({
        ...next,
        facets,
        tokens: liked
          ? applyFacetDefaultsToTokens(next.tokens || emptyDesignTokens(), facets)
          : emptyDesignTokens(),
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setReanalyzing(false);
    }
  }

  async function handleValence(next) {
    if (next === -1) {
      if (tab === "tokens") setTab("facets");
      setRef((prev) => ({
        ...prev,
        valence: next,
        tokens: emptyDesignTokens(),
      }));
      return;
    }

    const needsPull = tokenCount(ref.tokens) === 0;
    setRef((prev) => ({ ...prev, valence: next }));
    if (needsPull) {
      setRefreshing(true);
      setError(null);
      try {
        const res = await fetch("/api/web2/extract-tokens", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: ref.sourceUrl }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Token extract failed");
        setRef((prev) => ({
          ...prev,
          valence: 1,
          tokens: applyFacetDefaultsToTokens(data.tokens, prev.facets),
        }));
      } catch (err) {
        setError(err.message);
      } finally {
        setRefreshing(false);
      }
    }
  }

  async function handleSave() {
    if (ref.valence !== 1 && ref.valence !== -1) {
      setError("Mark the site as Like or Dislike before saving.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/web2/references/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          facets: ref.facets,
          conceptNote: ref.conceptNote,
          tokens:
            ref.valence === 1
              ? ref.tokens || emptyDesignTokens()
              : emptyDesignTokens(),
          valence: ref.valence,
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

  if (error && !ref) return <p className="text-sm">{error}</p>;
  if (!ref) return <p className="mono text-xs text-black/50">Loading…</p>;

  const tokensEnabled = ref.valence === 1;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <h1 className="text-2xl font-medium tracking-tight">Edit reference</h1>
        <button
          type="button"
          onClick={handleReanalyze}
          disabled={reanalyzing || refreshing || saving}
          className="mono text-xs border border-black px-3 py-2 disabled:opacity-40 shrink-0"
        >
          {reanalyzing ? "Reanalyzing…" : "Reanalyze page"}
        </button>
      </div>

      {reanalyzing && (
        <p className="mono text-xs text-black/50">
          Re-fetching page · updating facet descriptors
          {ref.valence === 1 ? " · tokens" : ""} · screenshot…
        </p>
      )}

      {ref.imagePath ? (
        <img
          src={ref.imagePath}
          alt={`Screenshot of ${ref.hostname || ref.sourceUrl}`}
          className="w-full max-h-[28rem] object-cover object-top border border-black/15 bg-white"
        />
      ) : null}

      <div className="border border-black/15 p-3 bg-white text-sm">
        <div className="font-medium">{ref.hostname || ref.sourceUrl}</div>
        <a
          href={ref.sourceUrl}
          target="_blank"
          rel="noreferrer"
          className="mono text-xs text-black/50 hover:text-black break-all"
        >
          {ref.sourceUrl}
        </a>
      </div>

      <div>
        <div className="mono text-xs uppercase tracking-wide text-black/50 mb-2">
          Whole-site judgment
        </div>
        <div className="flex gap-2">
          {[
            { value: 1, label: "Like" },
            { value: -1, label: "Dislike" },
          ].map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => handleValence(opt.value)}
              disabled={refreshing || reanalyzing}
              className={`px-4 py-2 text-sm border border-black disabled:opacity-40 ${
                ref.valence === opt.value
                  ? "bg-black text-white"
                  : "bg-white hover:bg-black/5"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
        <p className="text-xs text-black/50 mt-2">
          Tokens (colors, type, icons, CTAs) only break out for liked sites.
        </p>
      </div>

      <ReferenceDetailTabs
        active={tab}
        onChange={setTab}
        tokensEnabled={tokensEnabled}
      />

      {tab === "facets" && (
        <div className="space-y-4">
          {WEB_FACETS.map((f, i) => (
            <div key={f.key} className="border border-black/15 p-3 space-y-2 bg-white">
              <div>
                <div className="font-medium text-sm">{f.label}</div>
                {f.hint && (
                  <div className="mono text-xs text-black/40 mt-0.5">{f.hint}</div>
                )}
              </div>
              <input
                type="text"
                value={ref.facets[i]?.descriptor || ""}
                onChange={(e) => updateFacet(i, { descriptor: e.target.value })}
                className="w-full border border-black/25 px-2 py-1.5 text-sm focus:outline-none focus:border-black"
              />
              <div className="flex gap-2">
                {SCORE_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => updateFacet(i, { score: opt.value })}
                    className={`px-3 py-1 text-sm border border-black ${
                      ref.facets[i]?.score === opt.value
                        ? "bg-black text-white"
                        : "bg-white hover:bg-black/5"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          ))}

          <div>
            <label className="text-sm font-medium block mb-1">Anything else? (optional)</label>
            <textarea
              value={ref.conceptNote || ""}
              onChange={(e) => setRef((prev) => ({ ...prev, conceptNote: e.target.value }))}
              rows={2}
              className="w-full border border-black/25 px-2 py-1.5 text-sm focus:outline-none focus:border-black"
            />
          </div>
        </div>
      )}

      {tab === "tokens" && tokensEnabled && (
        <ReferenceTokensPanel
          tokens={ref.tokens || emptyDesignTokens()}
          facets={ref.facets}
          onChange={(tokens) => setRef((prev) => ({ ...prev, tokens }))}
          onIncludePersist={async (tokens) => {
            try {
              await fetch(`/api/web2/references/${id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ tokens }),
              });
            } catch {
              // Local state still updates; Save will persist later.
            }
          }}
          onRefresh={handleRefreshTokens}
          refreshing={refreshing || reanalyzing}
          autoRefresh
          refreshKey={ref.id}
        />
      )}

      {error && <p className="text-sm">{error}</p>}

      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving || reanalyzing}
          className="bg-black text-white px-4 py-2 text-sm disabled:opacity-40"
        >
          {saving ? "Saving…" : "Save"}
        </button>
        <DeleteReferenceButton
          id={id}
          apiPath="/api/web2/references"
          redirectTo="/web2/catalog"
          className="mono text-xs text-black/40 hover:text-black disabled:opacity-50"
        />
      </div>
    </div>
  );
}
