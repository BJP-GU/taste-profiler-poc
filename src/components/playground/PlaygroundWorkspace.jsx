"use client";

import { useCallback, useEffect, useState } from "react";
import StartForm from "./StartForm";
import ExplodedView from "./ExplodedView";
import CondensedView from "./CondensedView";
import TokenComposer from "./TokenComposer";

export default function PlaygroundWorkspace() {
  const [references, setReferences] = useState([]);
  const [loadingRefs, setLoadingRefs] = useState(true);
  const [project, setProject] = useState(null);
  const [viewMode, setViewMode] = useState("exploded");
  const [selectedId, setSelectedId] = useState(null);
  const [composerError, setComposerError] = useState(null);
  const [generatingId, setGeneratingId] = useState(null);

  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, []);

  useEffect(() => {
    fetch("/api/web/playground/references")
      .then((res) => res.json())
      .then((data) => setReferences(data.references || []))
      .catch(() => setReferences([]))
      .finally(() => setLoadingRefs(false));
  }, []);

  const selectedToken = project?.tokens.find((t) => t.id === selectedId) || null;

  const updateToken = useCallback((tokenId, patch) => {
    setProject((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        tokens: prev.tokens.map((t) => (t.id === tokenId ? { ...t, ...patch } : t)),
      };
    });
  }, []);

  function handleSelectToken(token) {
    setComposerError(null);
    setSelectedId(token.id);
  }

  function handleDeselect() {
    setSelectedId(null);
    setComposerError(null);
  }

  async function handleGenerateToken({ referenceId, prompt }) {
    if (!selectedToken || !project) return;
    const tokenId = selectedToken.id;
    setGeneratingId(tokenId);
    setComposerError(null);
    updateToken(tokenId, { status: "generating", error: null });

    try {
      const res = await fetch("/api/web/playground/token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tokenType: selectedToken.type,
          referenceId,
          prompt,
          pageContext: [
            project.title,
            project.summary,
            project.prompt,
            ...project.tokens.map((t) => `${t.label}: ${t.wireframeLabel}`),
          ].join("\n"),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Generation failed");

      updateToken(tokenId, {
        status: "ready",
        html: data.html,
        css: data.css,
        referenceId: data.referenceId,
        prompt: data.prompt,
        error: null,
      });
    } catch (err) {
      updateToken(tokenId, { status: "error", error: err.message });
      setComposerError(err.message);
    } finally {
      setGeneratingId(null);
    }
  }

  if (!project) {
    return (
      <StartForm
        references={references}
        loadingRefs={loadingRefs}
        onGenerated={(data) => {
          setProject(data);
          setViewMode("exploded");
          setSelectedId(null);
        }}
      />
    );
  }

  const readyCount = project.tokens.filter((t) => t.status === "ready").length;

  return (
    <div className="flex h-full flex-col bg-neutral-100">
      <div className="flex flex-wrap items-center gap-3 border-b border-neutral-200 bg-white px-4 py-2.5">
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-semibold text-neutral-900">{project.title}</div>
          <div className="truncate text-xs text-neutral-500">
            {readyCount}/{project.tokens.length} tokens generated
            {project.tasteUsed ? " · taste profile applied" : ""}
            {project.warning ? ` · ${project.warning}` : ""}
          </div>
        </div>

        <div className="flex rounded border border-neutral-200 p-0.5 text-xs">
          <button
            type="button"
            onClick={() => setViewMode("exploded")}
            className={`rounded px-2.5 py-1 ${
              viewMode === "exploded" ? "bg-neutral-900 text-white" : "text-neutral-600"
            }`}
          >
            Exploded
          </button>
          <button
            type="button"
            onClick={() => setViewMode("condensed")}
            className={`rounded px-2.5 py-1 ${
              viewMode === "condensed" ? "bg-neutral-900 text-white" : "text-neutral-600"
            }`}
          >
            Condensed
          </button>
        </div>

        <button
          type="button"
          onClick={() => {
            setProject(null);
            setSelectedId(null);
            setComposerError(null);
          }}
          className="text-xs text-neutral-500 underline hover:text-neutral-800"
        >
          New wireframe
        </button>
      </div>

      <div className="relative min-h-0 flex-1" data-playground-canvas>
        {viewMode === "exploded" ? (
          <ExplodedView
            tokens={project.tokens}
            selectedId={selectedId}
            onSelectToken={handleSelectToken}
            onBackgroundClick={handleDeselect}
          />
        ) : (
          <div
            className="flex h-full items-start justify-center overflow-auto bg-neutral-200/80 p-8"
            onClick={handleDeselect}
          >
            <div className="w-full max-w-md" onClick={(e) => e.stopPropagation()}>
              <p className="mb-3 text-center text-xs text-neutral-500">
                Assembled homepage — click a region to generate its token
              </p>
              <CondensedView
                tokens={project.tokens}
                selectedId={selectedId}
                onSelectToken={handleSelectToken}
              />
            </div>
          </div>
        )}

        {selectedToken && (
          <TokenComposer
            token={selectedToken}
            references={references}
            loadingRefs={loadingRefs}
            generating={generatingId === selectedToken.id}
            error={composerError}
            layoutKey={viewMode}
            onClose={handleDeselect}
            onGenerate={handleGenerateToken}
          />
        )}
      </div>
    </div>
  );
}
