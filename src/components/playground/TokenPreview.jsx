"use client";

/**
 * Renders a generated token inside a sandboxed iframe so token CSS
 * cannot leak into the app shell.
 */
export default function TokenPreview({ html, css, className = "" }) {
  if (!html) return null;

  const srcdoc = `<!DOCTYPE html><html><head><meta charset="utf-8"/><style>
    html,body{margin:0;padding:0;width:100%;height:100%;background:transparent;overflow:hidden}
    ${css || ""}
  </style></head><body>${html}</body></html>`;

  return (
    <iframe
      title="Token preview"
      sandbox=""
      srcDoc={srcdoc}
      className={`pointer-events-none h-full w-full border-0 bg-white ${className}`}
    />
  );
}
