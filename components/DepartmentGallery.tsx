"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  departments,
  coreTeam,
  higherAuthority,
  deanSom,
  photos,
  type Department,
} from "@/data/departments";

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]!.toUpperCase())
    .join("");
}

function ChevronLeftIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M15 18 9 12l6-6" />
    </svg>
  );
}

function ChevronRightIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="m9 18 6-6-6-6" />
    </svg>
  );
}

function PersonCard({ name, role }: { name: string; role: string }) {
  const photo = photos[name];

  return (
    <article className="team-card">
      {photo ? (
        <div className="team-avatar team-avatar-photo">
          <Image
            src={photo}
            alt={name}
            fill
            sizes="(max-width: 700px) 100vw, (max-width: 950px) 50vw, 260px"
            style={{ objectFit: "cover", objectPosition: "top" }}
          />
        </div>
      ) : (
        <div className="team-avatar" aria-hidden="true">
          {initials(name)}
        </div>
      )}
      <h3 className="team-name">{name}</h3>
      <p className="team-role">{role}</p>
    </article>
  );
}

function DepartmentCard({
  dept,
  onOpen,
}: {
  dept: Department;
  onOpen: () => void;
}) {
  return (
    <button className="dept-card" type="button" onClick={onOpen}>
      <span className="dept-monogram" aria-hidden="true">
        {initials(dept.name)}
      </span>
      <span className="dept-card-body">
        <span className="dept-kicker">Department</span>
        <span className="dept-name">{dept.name}</span>
        <span className="dept-leads">
          {dept.leaders.length > 1 ? "Heads" : "Head"}: {dept.leaders.join(" · ")}
        </span>
        <span className="dept-count">{dept.members.length} members</span>
      </span>
    </button>
  );
}

export default function DepartmentGallery() {
  const [active, setActive] = useState<Department | null>(null);
  const rail = useRef<HTMLDivElement>(null);
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(false);

  const updateArrows = useCallback(() => {
    const el = rail.current;
    if (!el) return;
    setAtStart(el.scrollLeft <= 4);
    setAtEnd(el.scrollLeft + el.clientWidth >= el.scrollWidth - 4);
  }, []);

  useEffect(() => {
    updateArrows();
    window.addEventListener("resize", updateArrows);
    return () => window.removeEventListener("resize", updateArrows);
  }, [updateArrows]);

  useEffect(() => {
    document.body.classList.toggle("menu-open", Boolean(active));
    return () => document.body.classList.remove("menu-open");
  }, [active]);

  useEffect(() => {
    if (!active) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setActive(null);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [active]);

  const scrollRail = (direction: 1 | -1) => {
    const el = rail.current;
    if (!el) return;
    el.scrollBy({
      left: direction * Math.max(el.clientWidth * 0.8, 260),
      behavior: "smooth",
    });
  };

  return (
    <>
      <section className="about-section" aria-labelledby="dean-som-title">
        <p className="eyebrow" id="dean-som-title">
          Dean SOM
        </p>
        <div className="team-grid team-grid-core">
          {deanSom.map((person) => (
            <PersonCard key={person.role} name={person.name} role={person.role} />
          ))}
        </div>
      </section>

      <section className="about-section" aria-labelledby="higher-authority-title">
        <p className="eyebrow" id="higher-authority-title">
          Higher Authority
        </p>
        <div className="team-grid team-grid-core">
          {higherAuthority.map((person) => (
            <PersonCard key={person.role} name={person.name} role={person.role} />
          ))}
        </div>
      </section>

      <section className="about-section" aria-labelledby="core-team-title">
        <p className="eyebrow" id="core-team-title">
          Core Team
        </p>
        <div className="team-grid team-grid-core">
          {coreTeam.map((person) => (
            <PersonCard key={person.role} name={person.name} role={person.role} />
          ))}
        </div>
      </section>

      <section className="about-section" aria-labelledby="departments-title">
        <p className="eyebrow" id="departments-title">
          Departments
        </p>
        <p className="dept-intro">
          Ten departments run the fest. Open any one to meet its heads and crew.
        </p>

        <div className="dept-rail-wrap">
          <div className="dept-rail" ref={rail} onScroll={updateArrows}>
            {departments.map((dept) => (
              <DepartmentCard
                key={dept.name}
                dept={dept}
                onOpen={() => setActive(dept)}
              />
            ))}
          </div>

          <button
            className="dept-arrow dept-arrow-left"
            type="button"
            onClick={() => scrollRail(-1)}
            disabled={atStart}
            aria-label="Scroll departments left"
          >
            <ChevronLeftIcon />
          </button>
          <button
            className="dept-arrow dept-arrow-right"
            type="button"
            onClick={() => scrollRail(1)}
            disabled={atEnd}
            aria-label="Scroll departments right"
          >
            <ChevronRightIcon />
          </button>
        </div>
      </section>

      {active && (
        <div
          className="dept-modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-label={`${active.name} department`}
          onClick={() => setActive(null)}
        >
          <div className="dept-modal" onClick={(event) => event.stopPropagation()}>
            <button
              className="dept-modal-close"
              type="button"
              onClick={() => setActive(null)}
              aria-label="Close"
            >
              ×
            </button>

            <p className="eyebrow">Department</p>
            <h2>{active.name}</h2>

            <div className="team-grid dept-leader-grid">
              {active.leaders.map((leader) => (
                <PersonCard key={leader} name={leader} role="Head" />
              ))}
            </div>

            <p className="eyebrow dept-members-label">Members</p>
            <ul className="dept-members">
              {active.members.map((member) => (
                <li key={member}>{member}</li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </>
  );
}
