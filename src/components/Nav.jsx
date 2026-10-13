"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

const PROFILERS = [
  {
    id: "web-design-2",
    label: "Semantic Taste Profiler",
    href: "/web2",
    match: (pathname) => pathname.startsWith("/web2"),
  },
  {
    id: "web-design",
    label: "Web design taste profiler",
    href: "/web",
    match: (pathname) => pathname === "/web" || pathname.startsWith("/web/"),
  },
  {
    id: "graphic-design",
    label: "Graphic Design Taste Profiler",
    href: "/graphic",
    match: (pathname) =>
      pathname === "/graphic" ||
      pathname.startsWith("/graphic/") ||
      pathname.startsWith("/catalog") ||
      pathname.startsWith("/profile"),
  },
];

function NavLink({ href, active, children }) {
  return (
    <Link
      href={href}
      className={
        active
          ? "text-black underline underline-offset-4"
          : "text-black/50 hover:text-black"
      }
    >
      {children}
    </Link>
  );
}

export default function Nav() {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const menuRef = useRef(null);

  const active = PROFILERS.find((p) => p.match(pathname)) || PROFILERS[0];
  const isGraphic = active.id === "graphic-design";
  const isWeb2 = active.id === "web-design-2";

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
    <header className="relative z-20 border-b border-black bg-white">
      <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-6">
        <div className="relative" ref={menuRef}>
          <button
            type="button"
            aria-haspopup="listbox"
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
            className="font-medium text-left hover:opacity-70 transition-opacity"
          >
            {active.label}
            <span className="ml-1.5 mono text-xs text-black/40 align-middle" aria-hidden>
              ▾
            </span>
          </button>

          {open && (
            <ul
              role="listbox"
              aria-label="Taste profilers"
              className="absolute left-0 top-full z-20 mt-1 min-w-[16rem] border border-black bg-white py-1"
            >
              {PROFILERS.map((profiler) => {
                const selected = profiler.id === active.id;
                return (
                  <li key={profiler.id} role="option" aria-selected={selected}>
                    <button
                      type="button"
                      onClick={() => selectProfiler(profiler)}
                      className={`w-full px-3 py-2 text-left text-sm hover:bg-black/5 ${
                        selected ? "font-medium text-black" : "text-black/60"
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
          <nav className="flex gap-4 text-sm">
            <NavLink href="/graphic" active={pathname === "/graphic"}>
              Upload &amp; Score
            </NavLink>
            <NavLink href="/catalog" active={pathname.startsWith("/catalog")}>
              Catalog
            </NavLink>
            <NavLink href="/profile" active={pathname.startsWith("/profile")}>
              Taste Profile
            </NavLink>
          </nav>
        ) : isWeb2 ? (
          <nav className="flex gap-4 text-sm">
            <NavLink href="/web2" active={pathname === "/web2"}>
              Add
            </NavLink>
            <NavLink href="/web2/catalog" active={pathname.startsWith("/web2/catalog")}>
              Catalog
            </NavLink>
            <NavLink href="/web2/profile" active={pathname.startsWith("/web2/profile")}>
              Profile
            </NavLink>
            <NavLink href="/web2/gallery" active={pathname.startsWith("/web2/gallery")}>
              Token Gallery
            </NavLink>
          </nav>
        ) : (
          <nav className="flex gap-4 text-sm">
            <NavLink href="/web" active={pathname === "/web"}>
              Add &amp; Score
            </NavLink>
            <NavLink href="/web/catalog" active={pathname.startsWith("/web/catalog")}>
              Catalog
            </NavLink>
            <NavLink href="/web/profile" active={pathname.startsWith("/web/profile")}>
              Taste Profile
            </NavLink>
            <NavLink href="/web/playground" active={pathname.startsWith("/web/playground")}>
              Playground
            </NavLink>
          </nav>
        )}
      </div>
    </header>
  );
}
