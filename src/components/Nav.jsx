"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

const PROFILERS = [
  {
    id: "graphic-design",
    label: "Graphic Design Taste Profiler",
    href: "/",
    match: (pathname) => !pathname.startsWith("/web"),
  },
  {
    id: "web-design",
    label: "Web design taste profiler",
    href: "/web",
    match: (pathname) => pathname.startsWith("/web"),
  },
];

export default function Nav() {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const menuRef = useRef(null);

  const active = PROFILERS.find((p) => p.match(pathname)) || PROFILERS[0];
  const isGraphic = active.id === "graphic-design";

  useEffect(() => {
    function onPointerDown(e) {
      if (!menuRef.current?.contains(e.target)) setOpen(false);
    }
    function onKeyDown(e) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  function selectProfiler(profiler) {
    setOpen(false);
    if (!profiler.match(pathname)) router.push(profiler.href);
  }

  return (
    <header className="border-b border-neutral-200 bg-white">
      <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-6">
        <div className="relative" ref={menuRef}>
          <button
            type="button"
            aria-haspopup="listbox"
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
            className="font-semibold text-left hover:text-neutral-600 transition-colors"
          >
            {active.label}
            <span className="ml-1.5 text-neutral-400 text-xs align-middle" aria-hidden>
              ▾
            </span>
          </button>

          {open && (
            <ul
              role="listbox"
              aria-label="Taste profilers"
              className="absolute left-0 top-full z-20 mt-1 min-w-[16rem] border border-neutral-200 bg-white py-1 shadow-sm"
            >
              {PROFILERS.map((profiler) => {
                const selected = profiler.id === active.id;
                return (
                  <li key={profiler.id} role="option" aria-selected={selected}>
                    <button
                      type="button"
                      onClick={() => selectProfiler(profiler)}
                      className={`w-full px-3 py-2 text-left text-sm hover:bg-neutral-50 ${
                        selected ? "font-medium text-neutral-900" : "text-neutral-600"
                      }`}
                    >
                      {profiler.label}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {isGraphic ? (
          <nav className="flex gap-4 text-sm text-neutral-600">
            <Link href="/" className="hover:text-neutral-900">
              Upload &amp; Score
            </Link>
            <Link href="/catalog" className="hover:text-neutral-900">
              Catalog
            </Link>
            <Link href="/profile" className="hover:text-neutral-900">
              Taste Profile
            </Link>
          </nav>
        ) : (
          <nav className="flex gap-4 text-sm text-neutral-600">
            <Link href="/web" className="hover:text-neutral-900">
              Add &amp; Score
            </Link>
            <Link href="/web/catalog" className="hover:text-neutral-900">
              Catalog
            </Link>
            <Link href="/web/profile" className="hover:text-neutral-900">
              Taste Profile
            </Link>
          </nav>
        )}
      </div>
    </header>
  );
}
