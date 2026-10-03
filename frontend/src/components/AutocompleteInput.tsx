"use client";

import { useId, useLayoutEffect, useMemo, useRef, useState } from "react";

export interface AutocompleteOption {
  value: string;
  label: string;
  description?: string;
}

function findInlineSuggestion(query: string, options: AutocompleteOption[]): AutocompleteOption | null {
  const normalized = query.toLocaleLowerCase();
  if (!normalized) return null;
  return options.find(option => option.label.toLocaleLowerCase().startsWith(normalized)
    && option.label.length > query.length) || null;
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
  const inputRef = useRef<HTMLInputElement>(null);
  const [completionStyle, setCompletionStyle] = useState<{
    left: number;
    font: string;
    lineHeight: string;
    letterSpacing: string;
  } | null>(null);

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

  const inlineOption = useMemo(() => {
    if (!isOpen) return null;
    return findInlineSuggestion(value, suggestions);
  }, [isOpen, suggestions, value]);
  const completion = inlineOption ? inlineOption.label.slice(value.length) : "";

  useLayoutEffect(() => {
    const input = inputRef.current;
    if (!input || !completion) {
      setCompletionStyle(null);
      return;
    }
    const styles = window.getComputedStyle(input);
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");
    if (!context) {
      setCompletionStyle(null);
      return;
    }
    context.font = styles.font;
    const letterSpacing = Number.parseFloat(styles.letterSpacing) || 0;
    const textWidth = context.measureText(value).width + letterSpacing * Math.max(0, value.length - 1);
    const left = (Number.parseFloat(styles.borderLeftWidth) || 0)
      + (Number.parseFloat(styles.paddingLeft) || 0) + textWidth;
    setCompletionStyle({ left, font: styles.font, lineHeight: styles.lineHeight, letterSpacing: styles.letterSpacing });
  }, [className, completion, value]);

  const choose = (option: AutocompleteOption) => {
    onSelect(option);
    setIsOpen(false);
    setActiveIndex(-1);
  };

  return (
    <div className="relative">
      <input
        ref={inputRef}
        type="text"
        required={required}
        autoComplete={autoComplete}
        placeholder={placeholder}
        aria-label={ariaLabel}
        aria-autocomplete="both"
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
          } else if (event.key === "ArrowRight" && completion && event.currentTarget.selectionStart === value.length && event.currentTarget.selectionEnd === value.length) {
            event.preventDefault();
            choose(inlineOption!);
          } else if (event.key === "Tab" && completion && activeIndex < 0) {
            choose(inlineOption!);
          }
        }}
      />

      {completion && completionStyle && (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute top-0 z-10 flex h-full items-center"
          style={{ left: completionStyle.left }}
        >
          <span className="rounded-sm bg-blue-100 px-0.5 text-blue-700" style={{ font: completionStyle.font, lineHeight: completionStyle.lineHeight, letterSpacing: completionStyle.letterSpacing }}>
            {completion}
          </span>
        </span>
      )}

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
