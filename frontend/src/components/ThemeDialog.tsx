import {
  useEffect,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";
import { createPortal } from "react-dom";

import {
  THEME_OPTIONS,
  useTheme,
  type ThemeName,
} from "./ThemeContext";
import { ThemePreview, ThemeSwatches } from "./ThemePreview";

function CloseGlyph() {
  return (
    <svg
      aria-hidden="true"
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
    >
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  );
}

function CheckGlyph() {
  return (
    <svg
      aria-hidden="true"
      width="10"
      height="10"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m4 12 5 5L20 6" />
    </svg>
  );
}

export function ThemeDialog() {
  const {
    theme,
    isThemeDialogOpen,
    closeThemeDialog,
    previewTheme,
    confirmTheme,
  } = useTheme();
  const [selected, setSelected] = useState<ThemeName>(theme);
  const dialogRef = useRef<HTMLDivElement>(null);
  const restoreFocus = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (isThemeDialogOpen) setSelected(theme);
    // Only resync when the dialog opens; previews update `theme` on purpose.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isThemeDialogOpen]);

  useEffect(() => {
    if (!isThemeDialogOpen) return;
    restoreFocus.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const focusTarget = dialogRef.current?.querySelector<HTMLElement>(
      '[data-theme-card][tabindex="0"]',
    );
    focusTarget?.focus();

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        closeThemeDialog();
        return;
      }
      if (event.key !== "Tab") return;
      const nodes = Array.from(
        dialogRef.current?.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
        ) ?? [],
      ).filter((node) => node.offsetParent !== null);
      if (nodes.length === 0) return;
      const first = nodes[0];
      const last = nodes[nodes.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
      restoreFocus.current?.focus();
    };
  }, [isThemeDialogOpen, closeThemeDialog]);

  if (!isThemeDialogOpen) return null;

  function choose(next: ThemeName) {
    setSelected(next);
    previewTheme(next);
  }

  function onCardKeyDown(
    event: ReactKeyboardEvent<HTMLButtonElement>,
    index: number,
  ) {
    const keys = ["ArrowRight", "ArrowDown", "ArrowLeft", "ArrowUp"];
    if (!keys.includes(event.key)) return;
    event.preventDefault();
    const step =
      event.key === "ArrowRight" || event.key === "ArrowDown" ? 1 : -1;
    const next =
      THEME_OPTIONS[
        (index + step + THEME_OPTIONS.length) % THEME_OPTIONS.length
      ];
    choose(next.id);
    const buttons =
      dialogRef.current?.querySelectorAll<HTMLButtonElement>("[data-theme-card]");
    buttons?.[THEME_OPTIONS.indexOf(next)]?.focus();
  }

  return createPortal(
    <div className="fixed inset-0 z-[90] flex items-end justify-center sm:items-center sm:p-6">
      <div
        aria-hidden="true"
        onClick={closeThemeDialog}
        className="absolute inset-0 animate-ink-in bg-panel/75 backdrop-blur-[2px]"
      />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="theme-dialog-title"
        aria-describedby="theme-dialog-description"
        className="relative flex max-h-[94dvh] w-full max-w-5xl animate-fade-up flex-col border-t-2 border-ink bg-paper shadow-[var(--shadow-modal)] sm:border-2"
      >
        <div className="flex items-start justify-between gap-4 border-b border-rule px-5 pb-4 pt-5 sm:px-8 sm:pb-5 sm:pt-6">
          <div className="min-w-0">
            <p className="kicker flex items-center gap-2">
              <span aria-hidden="true" className="h-2 w-2 bg-signal" />
              Appearance
            </p>
            <h2
              id="theme-dialog-title"
              className="display mt-2 text-[26px] leading-[1.08] sm:text-[34px]"
            >
              Choose how Gridbricks looks
            </h2>
            <p
              id="theme-dialog-description"
              className="prose-note mt-2 max-w-xl text-[12px] leading-6 text-ink-soft"
            >
              Pick the look you prefer. Your choice is saved on this device and
              applied every time you come back.
            </p>
          </div>
          <button
            type="button"
            aria-label="Close appearance choices"
            onClick={closeThemeDialog}
            className="grid h-9 w-9 shrink-0 place-items-center border border-ink/25 text-ink-soft transition-colors hover:border-ink hover:bg-ink hover:text-paper focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-signal"
          >
            <CloseGlyph />
          </button>
        </div>

        <div className="overflow-y-auto px-5 py-5 sm:px-8 sm:py-6">
          <div
            role="radiogroup"
            aria-label="Colour theme"
            className="grid snap-x snap-mandatory grid-flow-col auto-cols-[86%] gap-3 overflow-x-auto pb-2 sm:grid-flow-row sm:auto-cols-fr sm:grid-cols-3 sm:gap-4 sm:overflow-visible sm:pb-0"
          >
            {THEME_OPTIONS.map((option, index) => {
              const isSelected = option.id === selected;
              return (
                <button
                  key={option.id}
                  type="button"
                  role="radio"
                  aria-checked={isSelected}
                  data-theme-card
                  tabIndex={isSelected ? 0 : -1}
                  onClick={() => choose(option.id)}
                  onKeyDown={(event) => onCardKeyDown(event, index)}
                  className={`group flex snap-start flex-col border p-2.5 text-left transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-signal ${
                    isSelected
                      ? "border-ink bg-paper-raised"
                      : "border-rule-soft bg-transparent hover:border-ink/50 hover:bg-paper-raised/60"
                  }`}
                >
                  <ThemePreview theme={option.id} />
                  <span className="mt-3 flex items-start justify-between gap-3 px-0.5 pb-1">
                    <span className="min-w-0">
                      <span className="flex items-center gap-2">
                        <span className="font-serif text-[18px] leading-none tracking-[-0.02em] text-ink">
                          {option.label}
                        </span>
                        <span
                          className={`grid h-4 w-4 place-items-center border ${
                            isSelected
                              ? "border-ink bg-ink text-paper"
                              : "border-ink/30 text-transparent"
                          }`}
                        >
                          <CheckGlyph />
                        </span>
                      </span>
                      <span className="mt-1.5 block text-[11px] font-medium text-ink-soft">
                        {option.description}
                      </span>
                      <span className="mt-1 block text-[10px] leading-4 text-ink-mute">
                        {option.note}
                      </span>
                    </span>
                    <ThemeSwatches theme={option.id} />
                  </span>
                </button>
              );
            })}
          </div>
          <p className="mt-1 font-mono text-[9px] uppercase tracking-[0.12em] text-ink-mute sm:hidden">
            Swipe to compare Light and Dark
          </p>
        </div>

        <div className="flex flex-col-reverse gap-3 border-t border-rule px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <p className="text-[10px] leading-4 text-ink-mute">
            You can change this any time from the header. Keyboard: arrow keys
            choose, then Continue applies.
          </p>
          <button
            type="button"
            className="btn-primary w-full sm:w-auto"
            onClick={() => confirmTheme(selected)}
          >
            Continue with {THEME_OPTIONS.find((option) => option.id === selected)?.label}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
