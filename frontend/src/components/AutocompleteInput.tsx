"use client";

import { useId, useMemo, useState } from "react";

export interface AutocompleteOption {
  value: string;
  label: string;
  description?: string;
}

interface AutocompleteInputProps {
  value: string;
  options: AutocompleteOption[];
  onValueChange: (value: string) => void;
  onSelect: (option: AutocompleteOption) => void;
  className: string;
  placeholder?: string;
  required?: boolean;
  maxResults?: number;
  autoComplete?: string;
  "aria-label"?: string;
}

export default function AutocompleteInput({
  value,
  options,
  onValueChange,
  onSelect,
  className,
  placeholder,
  required,
  maxResults = 6,
  autoComplete = "off",
  "aria-label": ariaLabel,
}: AutocompleteInputProps) {
  const generatedId = useId();
  const listId = `${generatedId}-suggestions`;
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);

  const suggestions = useMemo(() => {
    const query = value.trim().toLocaleLowerCase();
    if (!isOpen || !query) return [];

    const matches = options.filter(option => {
      const searchable = `${option.label} ${option.description || ""}`.toLocaleLowerCase();
      return searchable.includes(query);
    });

    return [
      ...matches.filter(option => option.label.toLocaleLowerCase().startsWith(query)),
      ...matches.filter(option => !option.label.toLocaleLowerCase().startsWith(query)),
    ].slice(0, maxResults);
  }, [isOpen, maxResults, options, value]);

  const choose = (option: AutocompleteOption) => {
    onSelect(option);
    setIsOpen(false);
    setActiveIndex(-1);
  };

  return (
    <div className="relative">
      <input
        type="text"
        required={required}
        autoComplete={autoComplete}
        placeholder={placeholder}
        aria-label={ariaLabel}
        aria-autocomplete="list"
        aria-expanded={suggestions.length > 0}
        aria-controls={listId}
        aria-activedescendant={activeIndex >= 0 ? `${listId}-${activeIndex}` : undefined}
        role="combobox"
        className={className}
        value={value}
        onChange={event => {
          onValueChange(event.target.value);
          setActiveIndex(-1);
          setIsOpen(true);
        }}
        onFocus={() => {
          setActiveIndex(-1);
          setIsOpen(true);
        }}
        onBlur={() => setIsOpen(false)}
        onKeyDown={event => {
          if (event.key === "ArrowDown" && suggestions.length) {
            event.preventDefault();
            event.stopPropagation();
            setActiveIndex(index => (index + 1) % suggestions.length);
          } else if (event.key === "ArrowUp" && suggestions.length) {
            event.preventDefault();
            event.stopPropagation();
            setActiveIndex(index => (index - 1 + suggestions.length) % suggestions.length);
          } else if (event.key === "Enter" && activeIndex >= 0 && suggestions[activeIndex]) {
            event.preventDefault();
            event.stopPropagation();
            choose(suggestions[activeIndex]);
          } else if (event.key === "Escape" && isOpen) {
            event.preventDefault();
            event.stopPropagation();
            setIsOpen(false);
            setActiveIndex(-1);
          }
        }}
      />

      {suggestions.length > 0 && (
        <div
          id={listId}
          role="listbox"
          className="absolute left-0 right-0 top-full z-[60] mt-1 max-h-56 overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-xl"
        >
          {suggestions.map((option, index) => (
            <button
              id={`${listId}-${index}`}
              key={`${option.value}-${index}`}
              type="button"
              role="option"
              aria-selected={activeIndex === index}
              onPointerDown={event => event.preventDefault()}
              onClick={() => choose(option)}
              className={`block w-full border-b border-slate-100 px-3.5 py-2.5 text-left last:border-b-0 ${
                activeIndex === index
                  ? "bg-[#0B1320] text-[#E5C378]"
                  : "text-slate-700 hover:bg-slate-50"
              }`}
            >
              <span className="block text-xs font-semibold">{option.label}</span>
              {option.description && (
                <span className={`mt-0.5 block truncate text-[10px] ${activeIndex === index ? "text-amber-100" : "text-slate-500"}`}>
                  {option.description}
                </span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
