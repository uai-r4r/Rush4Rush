"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { departments, coreTeam, photos, type Department } from "@/data/departments";

const NEON_TEXT =
  "bg-[linear-gradient(120deg,#ff2fd0,#8b3dff,#3b6bff)] bg-clip-text text-transparent";

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("");
}

function PersonTile({ name, role }: { name: string; role: string }) {
  const photo = photos[name];
  return (
    <figure className="w-full">
      <div className="relative aspect-square w-full overflow-hidden rounded-sm border border-white/15 bg-white/5">
        {photo ? (
          <img src={photo} alt={name} loading="lazy" className="h-full w-full object-cover object-top" />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-[radial-gradient(120%_100%_at_0%_0%,rgba(255,47,208,.22),transparent_60%),radial-gradient(120%_100%_at_100%_100%,rgba(59,107,255,.26),transparent_60%)]">
            <span className="text-3xl font-light tracking-[0.15em] text-white/60">{initials(name)}</span>
          </div>
        )}
      </div>
      <figcaption className="mt-3">
        <p className={`text-[0.65rem] uppercase tracking-[0.25em] ${NEON_TEXT}`}>{role}</p>
        <p className="mt-1 text-base text-white">{name}</p>
      </figcaption>
    </figure>
  );
}

function DepartmentWindow({ dept, onOpen }: { dept: Department; onOpen: () => void }) {
  return (
    <button
      onClick={onOpen}
      className="group relative w-[72vw] max-w-[19rem] shrink-0 snap-start overflow-hidden rounded-sm border border-white/15 bg-white/[0.04] text-left transition-all duration-300 hover:-translate-y-1.5 hover:shadow-[0_0_40px_-8px_rgba(139,61,255,.7)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fuchsia-500 sm:w-[17rem] lg:w-[19rem]"
    >
      <div className="relative flex aspect-square items-center justify-center overflow-hidden bg-[radial-gradient(120%_100%_at_0%_0%,rgba(255,47,208,.22),transparent_60%),radial-gradient(120%_100%_at_100%_100%,rgba(59,107,255,.26),transparent_60%)]">
        <span className={`text-[5rem] font-light leading-none tracking-tight transition-transform duration-500 group-hover:scale-110 ${NEON_TEXT}`}>
          {initials(dept.name)}
        </span>
      </div>
      <div className="p-4 sm:p-5">
        <p className="text-[0.6rem] uppercase tracking-[0.3em] text-white/50">Department</p>
        <h3 className="mt-2 truncate text-xl font-light tracking-tight text-white sm:text-2xl">{dept.name}</h3>
        <p className="mt-3 line-clamp-2 text-sm text-white/60">
          Lead{dept.leaders.length > 1 ? "s" : ""}: {dept.leaders.join(" · ")}
        </p>
        <p className="mt-1 text-xs text-white/40">{dept.members.length} members</p>
      </div>
    </button>
  );
}

export default function DepartmentGallery() {
  const [active, setActive] = useState<Department | null>(null);
  const scroller = useRef<HTMLDivElement>(null);
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(false);

  const update = useCallback(() => {
    const el = scroller.current;
    if (!el) return;
    setAtStart(el.scrollLeft <= 4);
    setAtEnd(el.scrollLeft + el.clientWidth >= el.scrollWidth - 4);
  }, []);

  useEffect(() => {
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, [update]);

  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setActive(null);
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [active]);

  const scrollBy = (dir: 1 | -1) => {
    const el = scroller.current;
    if (!el) return;
    el.scrollBy({ left: dir * Math.max(el.clientWidth * 0.8, 260), behavior: "smooth" });
  };

  return (
    <section id="team" className="relative overflow-hidden bg-[#0b0714] py-14 sm:py-20">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-cover bg-center opacity-40"
        style={{ backgroundImage: "url(/team/r4r-bg.png)" }}
      />
      <div aria-hidden className="pointer-events-none absolute inset-0 bg-gradient-to-b from-[#0b0714]/80 via-[#0b0714]/60 to-[#0b0714]" />

      <div className="relative mx-auto max-w-6xl px-4 sm:px-6">
        <img src="/team/image.png" alt="R4R" className="mb-8 h-14 w-auto object-contain sm:h-20" />
        <p className="text-[0.65rem] uppercase tracking-[0.35em] text-white/50">About us</p>
        <h2 className={`mt-4 text-3xl font-light tracking-tight sm:text-5xl ${NEON_TEXT}`}>The people behind it</h2>
        <p className="mt-4 max-w-xl text-sm leading-relaxed text-white/60">
          Scroll through the departments and open any one to meet its leaders and members.
        </p>
      </div>

      <div className="relative mx-auto mt-10 max-w-6xl px-4 sm:px-6">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 sm:gap-6 lg:grid-cols-5">
          {coreTeam.map((p) => (
            <PersonTile key={p.role} name={p.name} role={p.role} />
          ))}
        </div>
      </div>

      <div className="relative mt-12 sm:mt-16">
        <div
          ref={scroller}
          onScroll={update}
          className="flex snap-x snap-mandatory gap-4 overflow-x-auto overscroll-x-contain scroll-smooth px-4 pb-6 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:gap-6 sm:px-6 lg:px-[max(1.5rem,calc((100vw-72rem)/2))]"
        >
          {departments.map((d) => (
            <DepartmentWindow key={d.name} dept={d} onOpen={() => setActive(d)} />
          ))}
        </div>

        <div aria-hidden className={`pointer-events-none absolute inset-y-0 left-0 w-16 bg-gradient-to-r from-[#0b0714] to-transparent transition-opacity ${atStart ? "opacity-0" : "opacity-100"}`} />
        <div aria-hidden className={`pointer-events-none absolute inset-y-0 right-0 w-16 bg-gradient-to-l from-[#0b0714] to-transparent transition-opacity ${atEnd ? "opacity-0" : "opacity-100"}`} />

        <button
          aria-label="Scroll left"
          onClick={() => scrollBy(-1)}
          disabled={atStart}
          className="absolute left-2 top-1/2 hidden -translate-y-1/2 rounded-full border border-white/15 bg-black/60 p-2 text-white backdrop-blur transition-opacity disabled:opacity-0 sm:block"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <button
          aria-label="Scroll right"
          onClick={() => scrollBy(1)}
          disabled={atEnd}
          className="absolute right-2 top-1/2 hidden -translate-y-1/2 rounded-full border border-white/15 bg-black/60 p-2 text-white backdrop-blur transition-opacity disabled:opacity-0 sm:block"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>

      {active && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/80 backdrop-blur-sm sm:items-center sm:p-6" onClick={() => setActive(null)}>
          <div
            className="max-h-[88vh] w-full max-w-3xl overflow-y-auto rounded-t-lg border border-white/15 bg-[#120d1f] p-5 sm:rounded-lg sm:p-8"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-4">
              <div>
                <p className="text-[0.6rem] uppercase tracking-[0.3em] text-white/50">Department</p>
                <h3 className="mt-2 truncate text-2xl font-light tracking-tight text-white sm:text-3xl">{active.name}</h3>
              </div>
              <button aria-label="Close" onClick={() => setActive(null)} className="shrink-0 rounded-full border border-white/15 p-2 text-white/60 hover:text-white">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-4 sm:mt-8 sm:grid-cols-3 sm:gap-6">
              {active.leaders.map((l) => (
                <PersonTile key={l} name={l} role="Leader" />
              ))}
            </div>

            <p className="mt-10 text-[0.6rem] uppercase tracking-[0.3em] text-white/50">Members</p>
            <ul className="mt-4 grid grid-cols-1 gap-x-8 gap-y-2 sm:grid-cols-2 lg:grid-cols-3">
              {active.members.map((m) => (
                <li key={m} className="border-b border-white/10 py-2 text-sm text-white/85">
                  {m}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </section>
  );
}
