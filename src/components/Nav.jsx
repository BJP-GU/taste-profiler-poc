"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

const PROFILERS = [
  {
    id: "graphic-design",
    label: "Graphic Design Taste Profiler",
    href: "/",
    match: (pathname) =>
      !(
        pathname === "/web" ||
        pathname.startsWith("/web/") ||
        pathname.startsWith("/web2")
      ),
  },
  {
    id: "web-design",
    label: "Web design taste profiler",
    href: "/web",
    // Avoid matching /web2 — path must be /web or under /web/
    match: (pathname) => pathname === "/web" || pathname.startsWith("/web/"),
  },
  {
    id: "web-design-2",
    label: "Web design taste profiler 2.0",
    href: "/web2",
    match: (pathname) => pathname.startsWith("/web2"),
  },
];

function NavLink({ href, active, children }) {
  return (
    <Link href={href} className={active ? "text-neutral-900" : "hover:text-neutral-900"}>
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
    <header className="relative z-20 border-b border-neutral-200 bg-white">
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
            <NavLink href="/" active={pathname === "/"}>
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
          <nav className="flex gap-4 text-sm text-neutral-600">
            <NavLink href="/web2" active={pathname === "/web2"}>
              Add &amp; Score
            </NavLink>
            <NavLink href="/web2/catalog" active={pathname.startsWith("/web2/catalog")}>
              Catalog
            </NavLink>
            <NavLink href="/web2/profile" active={pathname.startsWith("/web2/profile")}>
              Taste Profile
            </NavLink>
          </nav>
        ) : (
          <nav className="flex gap-4 text-sm text-neutral-600">
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
