"use client";

import { useEffect, useRef, useState } from "react";
import { filterScripts, getScriptInfo, type ISOScript } from "@/lib/iso15924";
import { inputClass } from "@/components/ui";

interface ScriptComboboxProps {
  value: string;
  onChange: (code: string) => void;
}

export function ScriptCombobox({ value, onChange }: ScriptComboboxProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedInfo = getScriptInfo(value);
  const filtered = filterScripts(query);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function handleSelect(script: ISOScript) {
    onChange(script.code);
    setQuery("");
    setIsOpen(false);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!isOpen) {
      if (e.key === "ArrowDown" || e.key === "Enter") {
        setIsOpen(true);
        return;
      }
    }

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev + 1) % filtered.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev - 1 + filtered.length) % filtered.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (filtered[highlightedIndex]) {
        handleSelect(filtered[highlightedIndex]);
      }
    } else if (e.key === "Escape") {
      setIsOpen(false);
    }
  }

  const displayValue = isOpen
    ? query
    : selectedInfo
      ? `${selectedInfo.code} (${selectedInfo.name})`
      : value;

  return (
    <div ref={containerRef} className="relative w-full">
      <input
        type="text"
        className={inputClass}
        value={displayValue}
        placeholder="Search script code or name..."
        onFocus={() => {
          setIsOpen(true);
          setQuery("");
          setHighlightedIndex(0);
        }}
        onChange={(e) => {
          setQuery(e.target.value);
          setIsOpen(true);
          setHighlightedIndex(0);
        }}
        onKeyDown={handleKeyDown}
        required
      />

      {isOpen && (
        <ul className="absolute right-0 sm:right-auto left-0 z-30 mt-1 max-h-64 w-80 max-w-[90vw] overflow-y-auto overflow-x-hidden rounded-md border border-zinc-200 bg-white py-1 shadow-xl text-sm">
          {filtered.length === 0 ? (
            <li className="px-3 py-2.5 text-zinc-400">No script found</li>
          ) : (
            filtered.map((item, idx) => {
              const isSelected = item.code === value;
              const isHighlighted = idx === highlightedIndex;

              return (
                <li
                  key={item.code + "-" + idx}
                  onClick={() => handleSelect(item)}
                  onMouseEnter={() => setHighlightedIndex(idx)}
                  className={`flex cursor-pointer items-center justify-between gap-3 px-3 py-2 text-sm transition-colors ${
                    isHighlighted
                      ? "bg-zinc-100 text-zinc-900"
                      : "text-zinc-700 hover:bg-zinc-50"
                  } ${isSelected ? "font-semibold text-zinc-900 bg-zinc-50" : ""}`}
                >
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <span className="font-mono text-xs rounded bg-zinc-100 px-2 py-0.5 font-bold text-zinc-800 border border-zinc-200 shrink-0">
                      {item.code}
                    </span>
                    <span className="truncate text-zinc-800 font-medium">
                      {item.name}
                    </span>
                  </div>
                  {item.common && (
                    <span className="shrink-0 rounded bg-emerald-50 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-emerald-700 border border-emerald-200/60">
                      common
                    </span>
                  )}
                </li>
              );
            })
          )}
        </ul>
      )}
    </div>
  );
}
