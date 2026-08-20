"use client";

import { useEffect, useId, useRef, useState } from "react";

const DEFAULT_OPTIONS = ["1st year", "2nd year", "3rd year", "4th year", "Postgrad"];

export function CustomListbox({
  value,
  onChange,
  options = DEFAULT_OPTIONS,
  ariaLabel = "Select option",
}: {
  value: string;
  onChange: (value: string) => void;
  options?: string[];
  ariaLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(Math.max(0, options.indexOf(value)));
  const rootRef = useRef<HTMLDivElement>(null);
  const listId = useId();

  useEffect(() => {
    const close = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  const choose = (next: string) => {
    onChange(next);
    setOpen(false);
  };
  const onKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      setOpen(true);
      setActive(
        (index) => (index + (event.key === "ArrowDown" ? 1 : options.length - 1)) % options.length,
      );
    } else if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      if (open) choose(options[active]);
      else setOpen(true);
    } else if (event.key === "Escape") setOpen(false);
  };

  return (
    <div className="custom-listbox" ref={rootRef}>
      <button
        type="button"
        className="listbox-trigger"
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => setOpen((current) => !current)}
        onKeyDown={onKeyDown}
      >
        <span className={value ? "" : "listbox-placeholder"}>{value || "Select"}</span>
        <span className={`listbox-chevron ${open ? "open" : ""}`} aria-hidden="true">
          ⌄
        </span>
      </button>
      {open && (
        <div id={listId} className="listbox-options" role="listbox" aria-label={ariaLabel}>
          {options.map((option, index) => (
            <button
              key={`${option}-${index}`}
              type="button"
              role="option"
              aria-selected={value === option}
              className={`listbox-option ${value === option ? "selected" : ""}`}
              onMouseEnter={() => setActive(index)}
              onClick={() => choose(option)}
            >
              {option}
              {value === option && <span aria-hidden="true">✓</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
