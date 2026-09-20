"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function DeleteReferenceButton({
  id,
  apiPath = "/api/references",
  redirectTo = null,
  className = "",
  label = "Remove",
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function handleDelete(e) {
    e.preventDefault();
    e.stopPropagation();
    if (busy) return;
    if (!window.confirm("Remove this reference from your catalog?")) return;

    setBusy(true);
    try {
      const res = await fetch(`${apiPath}/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Delete failed");
      if (redirectTo) router.push(redirectTo);
      else router.refresh();
    } catch {
      window.alert("Could not remove this reference. Try again.");
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleDelete}
      disabled={busy}
      className={className}
    >
      {busy ? "Removing…" : label}
    </button>
  );
}
