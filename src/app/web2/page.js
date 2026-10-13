"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { WEB_FACETS } from "@/lib/webFacets";
import {
  emptyDesignTokens,
  applyFacetDefaultsToTokens,
  preserveTokenSelections,
} from "@/lib/designTokens";
import CalibrationBar from "@/components/CalibrationBar";
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

export default function Web2UploadPage() {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [sourceUrl, setSourceUrl] = useState(null);
  const [hostname, setHostname] = useState(null);
  const [imagePath, setImagePath] = useState(null);
  const [facets, setFacets] = useState(null);
  const [tokens, setTokens] = useState(emptyDesignTokens());
  const [conceptNote, setConceptNote] = useState("");
  const [valence, setValence] = useState(0);
  const [tab, setTab] = useState("facets");
  const [analyzing, setAnalyzing] = useState(false);
  const [pullingTokens, setPullingTokens] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [warning, setWarning] = useState(null);
  const [calibration, setCalibration] = useState(null);

  useEffect(() => {
    fetch("/api/web2/profile")
      .then((r) => r.json())
      .then((d) => setCalibration(d.calibration || null))
      .catch(() => {});
  }, []);

  const pullSeq = useRef(0);
  const pendingPull = useRef(null);
  const valenceRef = useRef(0);
  const tokensRef = useRef(tokens);
  useEffect(() => {
    valenceRef.current = valence;
  }, [valence]);
  useEffect(() => {
    tokensRef.current = tokens;
  }, [tokens]);

  const pullTokensForLiked = useCallback(
    (pageUrl, nextFacets) => {
      if (!pageUrl) return Promise.resolve(null);
      const seq = ++pullSeq.current;
      setPullingTokens(true);
      setError(null);
      const promise = (async () => {
        try {
          const res = await fetch("/api/web2/extract-tokens", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ url: pageUrl }),
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error || "Token extract failed");
          // Ignore results from superseded pulls or if the site is no longer liked.
          if (seq !== pullSeq.current || valenceRef.current !== 1) return null;
          const next = preserveTokenSelections(
            tokensRef.current,
            applyFacetDefaultsToTokens(
              data.tokens || emptyDesignTokens(),
              nextFacets || facets || []
            )
          );
          setTokens(next);
          return next;
        } catch (err) {
          if (seq === pullSeq.current) setError(err.message);
          return null;
        } finally {
          if (seq === pullSeq.current) {
            setPullingTokens(false);
            pendingPull.current = null;
          }
        }
      })();
      pendingPull.current = promise;
      return promise;
    },
    [facets]
  );

  async function handleAnalyze(e) {
    e.preventDefault();
    if (!url.trim()) return;

    setFacets(null);
    setTokens(emptyDesignTokens());
    setSourceUrl(null);
    setHostname(null);
    setImagePath(null);
    setValence(0);
    setTab("facets");
    setError(null);
    setWarning(null);
    setAnalyzing(true);

    try {
      const res = await fetch("/api/web2/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Analysis failed");

      const nextFacets = WEB_FACETS.map((f) => ({
        name: f.key,
        descriptor: data.descriptors?.[f.key] || "",
        score: 0,
      }));

      setSourceUrl(data.sourceUrl);
      setHostname(data.hostname);
      setImagePath(data.imagePath || null);
      setFacets(nextFacets);
      setTokens(emptyDesignTokens());

      const warnings = [];
      if (!data.descriptors) {
        warnings.push(
          "Automatic tagging didn't return a result. Check .env.local, or type a short description into each facet below."
        );
      }
      if (!data.imagePath) {
        warnings.push(
          "Could not capture a screenshot. You can still score from the URL."
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
    setFacets((prev) => {
      const next = prev.map((f, i) => (i === index ? { ...f, ...patch } : f));
      if (valence === 1) {
        setTokens((tok) => applyFacetDefaultsToTokens(tok, next));
      }
      return next;
    });
  }

  async function handleValence(next) {
    setValence(next);
    valenceRef.current = next;
    if (next === -1) {
      pullSeq.current += 1;
      pendingPull.current = null;
      setPullingTokens(false);
      setTokens(emptyDesignTokens());
      if (tab === "tokens") setTab("facets");
      return;
    }
    if (next === 1 && sourceUrl && tokenCount(tokens) === 0 && !pendingPull.current) {
      await pullTokensForLiked(sourceUrl, facets);
    }
  }

  async function handleSave() {
    if (!sourceUrl || !facets) return;
    if (valence !== 1 && valence !== -1) {
      setError("Mark the whole site as Like or Dislike before saving.");
      return;
    }
    setSaving(true);
    setError(null);

    try {
      let tokensToSave = tokens;
      if (valence === 1 && pendingPull.current) {
        tokensToSave = (await pendingPull.current) || tokens;
      }
      const res = await fetch("/api/web2/references", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sourceUrl,
          hostname,
          imagePath,
          facets,
          // Only persist token breakdown for liked sites.
          tokens:
            valence === 1
              ? applyFacetDefaultsToTokens(tokensToSave, facets)
              : emptyDesignTokens(),
          conceptNote,
          valence,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Save failed");
      router.push("/web2/catalog");
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  const tokensEnabled = valence === 1;

  return (
    <div className="space-y-8">
      <div>
        <p className="mono text-xs tracking-wide uppercase text-black/50 mb-2">
          Support set · PseudoClient protocol
        </p>
        <h1 className="text-2xl font-medium tracking-tight">Add a website</h1>
        <p className="text-sm text-black/60 mt-2 max-w-xl leading-relaxed">
          Paste a homepage URL. Mark Like or Dislike for the whole site, then score
          facets. Color / type / icon / CTA tokens only break out for{" "}
          <span className="mono">liked</span> sites. Calibration needs at least{" "}
          <span className="mono">5 liked</span> and{" "}
          <span className="mono">5 disliked</span> — add as many as you like
          beyond that; every reference feeds the profile.
        </p>
      </div>

      {calibration && <CalibrationBar calibration={calibration} />}

      <form onSubmit={handleAnalyze} className="flex flex-col sm:flex-row gap-2">
        <input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://example.com"
          required
          className="flex-1 border border-black px-3 py-2 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-black"
        />
        <button
          type="submit"
          disabled={analyzing || !url.trim()}
          className="bg-black text-white px-4 py-2 text-sm disabled:opacity-40 shrink-0"
        >
          {analyzing ? "Reading…" : "Analyze"}
        </button>
      </form>

      {error && <p className="text-sm text-black underline decoration-black/40">{error}</p>}
      {warning && (
        <p className="text-sm border border-black/20 bg-white px-3 py-2 text-black/70">
          {warning}
        </p>
      )}

      {analyzing && (
        <p className="mono text-xs text-black/50">
          Fetching page · screenshot · facet tags…
        </p>
      )}

      {sourceUrl && (
        <div className="space-y-3 border border-black/15 p-4">
          {imagePath ? (
            <img
              src={imagePath}
              alt={`Screenshot of ${hostname || sourceUrl}`}
              className="w-full max-h-[28rem] object-cover object-top border border-black/10 bg-white"
            />
          ) : (
            <div className="w-full h-40 border border-dashed border-black/30 flex items-center justify-center text-sm text-black/40">
              No screenshot
            </div>
          )}
          <div className="text-sm">
            <div className="font-medium">{hostname || sourceUrl}</div>
            <a
              href={sourceUrl}
              target="_blank"
              rel="noreferrer"
              className="mono text-xs text-black/50 hover:text-black break-all"
            >
              {sourceUrl}
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
                  className={`px-4 py-2 text-sm border border-black transition-colors disabled:opacity-40 ${
                    valence === opt.value
                      ? "bg-black text-white"
                      : "bg-white text-black hover:bg-black/5"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            {pullingTokens && (
              <p className="mono text-xs text-black/50 mt-2">
                Pulling tokens for liked site…
              </p>
            )}
          </div>
        </div>
      )}

      {facets && (
        <div className="space-y-4">
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
                    <div className="text-sm font-medium">{f.label}</div>
                    {f.hint && (
                      <div className="mono text-xs text-black/40 mt-0.5">{f.hint}</div>
                    )}
                  </div>
                  <input
                    type="text"
                    value={facets[i].descriptor}
                    onChange={(e) => updateFacet(i, { descriptor: e.target.value })}
                    placeholder="Descriptor"
                    className="w-full border border-black/25 px-2 py-1.5 text-sm focus:outline-none focus:border-black"
                  />
                  <div className="flex gap-2">
                    {SCORE_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => updateFacet(i, { score: opt.value })}
                        className={`px-3 py-1 text-sm border border-black transition-colors ${
                          facets[i].score === opt.value
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
                <label className="text-sm font-medium block mb-1">
                  Anything else? (optional)
                </label>
                <textarea
                  value={conceptNote}
                  onChange={(e) => setConceptNote(e.target.value)}
                  rows={2}
                  className="w-full border border-black/25 px-2 py-1.5 text-sm focus:outline-none focus:border-black"
                />
              </div>
            </div>
          )}

          {tab === "tokens" && tokensEnabled && (
            <ReferenceTokensPanel
              tokens={tokens}
              facets={facets}
              onChange={setTokens}
              onRefresh={() => pullTokensForLiked(sourceUrl, facets)}
              refreshing={pullingTokens}
              autoRefresh
              refreshKey={sourceUrl}
            />
          )}

          <button
            type="button"
            onClick={handleSave}
            disabled={saving || (valence !== 1 && valence !== -1)}
            className="bg-black text-white px-4 py-2 text-sm disabled:opacity-40"
          >
            {saving
              ? pullingTokens
                ? "Saving… finishing tokens"
                : "Saving…"
              : "Save to support set"}
          </button>
        </div>
      )}
    </div>
  );
}
