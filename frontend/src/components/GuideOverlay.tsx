import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import { createPortal } from "react-dom";
import { useLocation, useNavigate } from "react-router-dom";

import { GUIDE_STEPS } from "../lib/guide";
import { useGuide } from "./GuideContext";

interface Box {
  top: number;
  left: number;
  width: number;
  height: number;
}

interface ViewportSize {
  width: number;
  height: number;
}

interface MeasuredPanel {
  key: string;
  height: number;
}

type CardLayout =
  | { mode: "center"; maxHeight: number }
  | { mode: "sheet"; maxHeight: number }
  | { mode: "anchored"; top: number; left: number; maxHeight: number };

type TargetStatus = "centered" | "pending" | "found" | "missing";

interface TargetSnapshot {
  step: number;
  status: TargetStatus;
  rect: Box | null;
  settled: boolean;
}

const CARD_WIDTH = 420;
const EDGE = 16;
const GAP = 20;
const MOBILE_EDGE = 12;
const SPOTLIGHT_PAD = 10;
const MIN_CARD_HEIGHT = 240;
const MIN_SHEET_HEIGHT = 160;

const PAGE_LABELS: Record<string, string> = {
  "/": "Overview",
  "/forecasts": "Forecast explorer",
  "/accuracy": "Accuracy analysis",
  "/data": "Data table",
};

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), Math.max(min, max));
}

/**
 * The hole is clipped to the viewport, and only capped when an oversized
 * section would leave no room for the card. Short and medium targets always
 * get their full outline so the spotlight never cuts a section in half.
 */
function computeHole(rect: Box, viewport: ViewportSize, maxHeight = Infinity): Box {
  const edge = 8;
  const minWidth = Math.min(72, viewport.width - edge * 2);

  const width = Math.min(
    Math.max(rect.width + SPOTLIGHT_PAD * 2, minWidth),
    viewport.width - edge * 2,
  );
  const height = Math.min(
    Math.max(rect.height + SPOTLIGHT_PAD * 2, 48),
    viewport.height - edge * 2,
    maxHeight,
  );

  return {
    left: clamp(rect.left - SPOTLIGHT_PAD, edge, viewport.width - edge - width),
    top: clamp(rect.top - SPOTLIGHT_PAD, edge, viewport.height - edge - height),
    width,
    height,
  };
}

function isCropped(rect: Box, hole: Box) {
  return rect.top + rect.height + SPOTLIGHT_PAD > hole.top + hole.height + 0.5;
}

/**
 * Places the card in the first direction with enough room. When nothing fits
 * completely, it uses the roomier side and lets the card body scroll instead of
 * covering the highlighted control. Returns null when the hole is too large
 * for any clear placement, so the caller can cap the hole and retry.
 */
function computeCardLayout(
  hole: Box | null,
  viewport: ViewportSize,
  cardHeight: number,
  isNarrow: boolean,
  cardWidth: number,
): CardLayout | null {
  const centeredMax = Math.max(MIN_CARD_HEIGHT, viewport.height - EDGE * 2);

  if (!hole) {
    return { mode: "center", maxHeight: centeredMax };
  }

  if (isNarrow) {
    const spaceBelow = viewport.height - MOBILE_EDGE - (hole.top + hole.height) - GAP;
    if (spaceBelow < MIN_SHEET_HEIGHT) return null;
    return {
      mode: "sheet",
      maxHeight: Math.min(cardHeight, spaceBelow, viewport.height - MOBILE_EDGE * 2),
    };
  }

  const fullHeight = Math.min(
    cardHeight || centeredMax,
    viewport.height - EDGE * 2,
  );
  const holeBottom = hole.top + hole.height;
  const holeRight = hole.left + hole.width;
  const spaceBelow = viewport.height - EDGE - holeBottom - GAP;
  const spaceAbove = hole.top - GAP - EDGE;
  const spaceRight = viewport.width - EDGE - holeRight - GAP;
  const spaceLeft = hole.left - GAP - EDGE;

  const alignedLeft =
    hole.width > cardWidth * 1.4
      ? clamp(hole.left, EDGE, viewport.width - EDGE - cardWidth)
      : clamp(
          hole.left + hole.width / 2 - cardWidth / 2,
          EDGE,
          viewport.width - EDGE - cardWidth,
        );

  if (spaceBelow >= fullHeight) {
    return {
      mode: "anchored",
      top: holeBottom + GAP,
      left: alignedLeft,
      maxHeight: fullHeight,
    };
  }

  if (spaceAbove >= fullHeight) {
    return {
      mode: "anchored",
      top: hole.top - GAP - fullHeight,
      left: alignedLeft,
      maxHeight: fullHeight,
    };
  }

  if (spaceRight >= cardWidth) {
    return {
      mode: "anchored",
      top: clamp(
        hole.top + hole.height / 2 - fullHeight / 2,
        EDGE,
        viewport.height - EDGE - fullHeight,
      ),
      left: holeRight + GAP,
      maxHeight: fullHeight,
    };
  }

  if (spaceLeft >= cardWidth) {
    return {
      mode: "anchored",
      top: clamp(
        hole.top + hole.height / 2 - fullHeight / 2,
        EDGE,
        viewport.height - EDGE - fullHeight,
      ),
      left: hole.left - GAP - cardWidth,
      maxHeight: fullHeight,
    };
  }

  if (spaceBelow >= MIN_CARD_HEIGHT || spaceAbove >= MIN_CARD_HEIGHT) {
    if (spaceBelow >= spaceAbove) {
      const maxHeight = Math.min(fullHeight, spaceBelow);
      return {
        mode: "anchored",
        top: holeBottom + GAP,
        left: alignedLeft,
        maxHeight,
      };
    }
    const maxHeight = Math.min(fullHeight, spaceAbove);
    return {
      mode: "anchored",
      top: Math.max(EDGE, hole.top - GAP - maxHeight),
      left: alignedLeft,
      maxHeight,
    };
  }

  return null;
}

function CloseGlyph() {
  return (
    <svg
      aria-hidden="true"
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    >
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  );
}

function ArrowGlyph({ direction }: { direction: "left" | "right" }) {
  return (
    <svg
      aria-hidden="true"
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {direction === "right" ? (
        <path d="M4 12h15M13 6l6 6-6 6" />
      ) : (
        <path d="M20 12H5M11 18l-6-6 6-6" />
      )}
    </svg>
  );
}

export function GuideOverlay() {
  const {
    isGuideOpen,
    stepIndex,
    stepCount,
    exitGuide,
    nextStep,
    previousStep,
  } = useGuide();
  const navigate = useNavigate();
  const location = useLocation();
  const locationRef = useRef(location);
  locationRef.current = location;

  const [target, setTarget] = useState<TargetSnapshot>({
    step: -1,
    status: "centered",
    rect: null,
    settled: false,
  });
  const [viewport, setViewport] = useState<ViewportSize>(() => ({
    width: typeof window === "undefined" ? 1280 : window.innerWidth,
    height: typeof window === "undefined" ? 800 : window.innerHeight,
  }));
  const [measured, setMeasured] = useState<MeasuredPanel | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const lastLayoutRef = useRef<CardLayout | null>(null);

  const step = GUIDE_STEPS[stepIndex];
  const isLast = stepIndex >= stepCount - 1;
  const isNarrow = viewport.width < 640;

  // Snapshots from the previous step are ignored the moment the step changes,
  // so new copy never reuses an old spotlight position even for one frame.
  const snapshot = target.step === stepIndex ? target : null;
  const targetState: TargetStatus =
    snapshot?.status ?? (step.target ? "pending" : "centered");
  const rect = snapshot?.rect ?? null;
  const settled = snapshot?.settled ?? false;

  const measureKey = `${stepIndex}:${viewport.width}:${viewport.height}`;
  const panelHeight =
    measured?.key === measureKey ? measured.height : 0;

  const finishGuide = useCallback(() => {
    exitGuide();
    navigate(
      { pathname: "/", search: locationRef.current.search },
      { replace: true },
    );
  }, [exitGuide, navigate]);

  const goNext = useCallback(() => {
    if (isLast) {
      finishGuide();
      return;
    }
    nextStep();
  }, [finishGuide, isLast, nextStep]);

  useEffect(() => {
    function onResize() {
      setViewport({ width: window.innerWidth, height: window.innerHeight });
    }
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  /*
   * Freeze the page: stop the document scrolling, compensate for the removed
   * scrollbar so nothing shifts, and make the app shell inert so neither the
   * mouse nor the keyboard can reach it while the guide is open.
   */
  useEffect(() => {
    if (!isGuideOpen) return;
    const root = document.getElementById("root");
    const html = document.documentElement;
    const body = document.body;
    const previousFocus =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;

    const previous = {
      htmlOverflow: html.style.overflow,
      htmlOverscroll: html.style.overscrollBehavior,
      bodyOverflow: body.style.overflow,
      bodyPaddingRight: body.style.paddingRight,
    };

    const scrollbar = window.innerWidth - html.clientWidth;
    html.style.overflow = "hidden";
    html.style.overscrollBehavior = "none";
    body.style.overflow = "hidden";
    if (scrollbar > 0) body.style.paddingRight = `${scrollbar}px`;
    root?.setAttribute("inert", "");

    return () => {
      html.style.overflow = previous.htmlOverflow;
      html.style.overscrollBehavior = previous.htmlOverscroll;
      body.style.overflow = previous.bodyOverflow;
      body.style.paddingRight = previous.bodyPaddingRight;
      root?.removeAttribute("inert");
      previousFocus?.focus({ preventScroll: true });
    };
  }, [isGuideOpen]);

  useEffect(() => {
    if (!isGuideOpen) return;
    let cancelled = false;
    let retry: number | undefined;
    let frame = 0;
    let detach: (() => void) | null = null;

    setTarget({
      step: stepIndex,
      status: step.target ? "pending" : "centered",
      rect: null,
      settled: false,
    });

    if (step.route && locationRef.current.pathname !== step.route) {
      navigate(
        { pathname: step.route, search: locationRef.current.search },
        { replace: true },
      );
    }

    if (!step.target) {
      setTarget({
        step: stepIndex,
        status: "centered",
        rect: null,
        settled: true,
      });
      return () => {
        cancelled = true;
      };
    }

    const update = (next: Partial<TargetSnapshot>) => {
      setTarget((current) =>
        current.step === stepIndex ? { ...current, ...next } : current,
      );
    };

    const reduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    const deadline = performance.now() + 9000;

    const attach = (element: HTMLElement) => {
      const narrow = window.innerWidth < 640;
      const viewportHeight = window.innerHeight;
      const box = element.getBoundingClientRect();
      const header = document.querySelector<HTMLElement>("header");
      const headerHeight =
        window.innerWidth >= 1024 && header
          ? header.getBoundingClientRect().height
          : 0;
      const offset = narrow ? 20 : headerHeight + 12;

      /*
       * Medium and tall sections are parked just under the sticky header so the
       * whole outline, plus the card, fits on screen. Small controls stay
       * centred where they read most naturally.
       */
      if (narrow || box.height > viewportHeight * 0.28) {
        window.scrollTo({
          top: Math.max(0, window.scrollY + box.top - offset),
          behavior: reduced ? "auto" : "smooth",
        });
      } else {
        element.scrollIntoView({
          block: "center",
          inline: "nearest",
          behavior: reduced ? "auto" : "smooth",
        });
      }

      update({
        status: "found",
        rect: {
          top: box.top,
          left: box.left,
          width: box.width,
          height: box.height,
        },
      });

      let last = box;
      let stableFrames = 0;
      const startedAt = performance.now();

      const tick = () => {
        if (cancelled) return;
        const current = element.getBoundingClientRect();
        const moving =
          Math.abs(current.top - last.top) > 0.25 ||
          Math.abs(current.left - last.left) > 0.25 ||
          Math.abs(current.width - last.width) > 0.25 ||
          Math.abs(current.height - last.height) > 0.25;

        if (moving) {
          last = current;
          stableFrames = 0;
          update({
            rect: {
              top: current.top,
              left: current.left,
              width: current.width,
              height: current.height,
            },
          });
        } else {
          stableFrames += 1;
        }

        const elapsed = performance.now() - startedAt;
        if ((elapsed > 220 && stableFrames >= 4) || elapsed > 1800) {
          update({
            rect: {
              top: current.top,
              left: current.left,
              width: current.width,
              height: current.height,
            },
            settled: true,
          });
          return;
        }
        frame = requestAnimationFrame(tick);
      };
      frame = requestAnimationFrame(tick);

      const onResize = () => {
        const current = element.getBoundingClientRect();
        update({
          rect: {
            top: current.top,
            left: current.left,
            width: current.width,
            height: current.height,
          },
          settled: true,
        });
      };
      window.addEventListener("resize", onResize);

      detach = () => {
        cancelAnimationFrame(frame);
        window.removeEventListener("resize", onResize);
      };
    };

    const attempt = () => {
      if (cancelled) return;
      const element = document.querySelector<HTMLElement>(
        `[data-tour="${step.target}"]`,
      );
      if (element) {
        attach(element);
        return;
      }
      if (performance.now() > deadline) {
        update({ status: "missing", settled: true });
        return;
      }
      retry = window.setTimeout(attempt, 120);
    };
    attempt();

    return () => {
      cancelled = true;
      if (retry) window.clearTimeout(retry);
      detach?.();
    };
  }, [isGuideOpen, stepIndex, step.target, step.route, navigate]);

  useLayoutEffect(() => {
    const node = panelRef.current;
    if (!isGuideOpen || !node) return;
    const height = node.offsetHeight;
    if (height <= 0) return;
    setMeasured((current) =>
      current?.key === measureKey && Math.abs(current.height - height) < 0.5
        ? current
        : { key: measureKey, height },
    );
  }, [isGuideOpen, measureKey]);

  useEffect(() => {
    if (!isGuideOpen) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        exitGuide();
        return;
      }
      if (
        !event.altKey &&
        !event.ctrlKey &&
        !event.metaKey &&
        (event.key === "ArrowRight" || event.key === "ArrowLeft")
      ) {
        const tag = (event.target as HTMLElement | null)?.tagName;
        if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
        event.preventDefault();
        if (event.key === "ArrowRight") goNext();
        else previousStep();
        return;
      }
      if (event.key !== "Tab") return;
      const nodes = Array.from(
        panelRef.current?.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], [tabindex]:not([tabindex="-1"])',
        ) ?? [],
      ).filter((node) => node.offsetParent !== null);
      if (nodes.length === 0) return;
      const first = nodes[0];
      const last = nodes[nodes.length - 1];
      if (document.activeElement === panelRef.current) {
        event.preventDefault();
        (event.shiftKey ? last : first).focus();
        return;
      }
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [isGuideOpen, exitGuide, goNext, previousStep]);

  const hasTarget = Boolean(step.target);
  const ready =
    panelHeight > 0 &&
    (!hasTarget ||
      targetState === "missing" ||
      (targetState === "found" && settled && rect !== null));

  const cardWidth = isNarrow
    ? Math.max(240, viewport.width - MOBILE_EDGE * 2)
    : Math.min(CARD_WIDTH, viewport.width - EDGE * 2);
  const cardEstimate = panelHeight || (isNarrow ? 360 : 300);

  /*
   * Try the full outline first. Only sections too tall for any clear card
   * placement get capped, and the card then sits directly beneath them, so the
   * two boxes never overlap and the highlight is never cut for no reason.
   */
  const { hole, layout, cropped } = useMemo(() => {
    if (!ready || targetState !== "found" || !rect) {
      return {
        hole: null as Box | null,
        layout: computeCardLayout(
          null,
          viewport,
          cardEstimate,
          isNarrow,
          cardWidth,
        ) as CardLayout,
        cropped: false,
      };
    }

    const full = computeHole(rect, viewport);
    const fit = computeCardLayout(
      full,
      viewport,
      cardEstimate,
      isNarrow,
      cardWidth,
    );
    if (fit) {
      return { hole: full, layout: fit, cropped: isCropped(rect, full) };
    }

    const reserve = clamp(cardEstimate, 240, isNarrow ? 360 : 320);
    const holeTop = clamp(
      rect.top - SPOTLIGHT_PAD,
      8,
      viewport.height - EDGE * 2 - 96,
    );
    const room = isNarrow
      ? viewport.height - MOBILE_EDGE - GAP
      : viewport.height - EDGE - GAP;
    const capped = computeHole(
      rect,
      viewport,
      Math.max(96, room - reserve - holeTop),
    );
    const cappedLayout = computeCardLayout(
      capped,
      viewport,
      reserve,
      isNarrow,
      cardWidth,
    ) ?? {
      mode: "center" as const,
      maxHeight: Math.max(MIN_CARD_HEIGHT, viewport.height - EDGE * 2),
    };
    return { hole: capped, layout: cappedLayout, cropped: isCropped(rect, capped) };
  }, [
    ready,
    targetState,
    rect,
    viewport,
    cardEstimate,
    isNarrow,
    cardWidth,
  ]);

  /*
   * While the next target scrolls into place, keep the card exactly where it
   * was. It moves once, when the spotlight is ready, instead of blinking out.
   */
  const activeLayout =
    ready || !hasTarget ? layout : (lastLayoutRef.current ?? layout);

  useLayoutEffect(() => {
    if (isGuideOpen && ready) lastLayoutRef.current = layout;
    if (!isGuideOpen) lastLayoutRef.current = null;
  }, [isGuideOpen, ready, layout]);

  useEffect(() => {
    if (!isGuideOpen || !ready) return;
    const frame = requestAnimationFrame(() =>
      panelRef.current?.focus({ preventScroll: true }),
    );
    return () => cancelAnimationFrame(frame);
  }, [isGuideOpen, ready, stepIndex]);

  if (!isGuideOpen || !step) return null;

  const pageLabel = PAGE_LABELS[step.route ?? "/"] ?? "Overview";

  let wrapperClass = "fixed inset-0 flex items-center justify-center p-4";
  let wrapperStyle: CSSProperties = {};

  if (activeLayout.mode === "anchored") {
    wrapperClass = "fixed";
    wrapperStyle = {
      top: activeLayout.top,
      left: activeLayout.left,
      width: cardWidth,
    };
  } else if (activeLayout.mode === "sheet") {
    wrapperClass = "fixed inset-x-3";
    wrapperStyle = {
      bottom: "max(12px, env(safe-area-inset-bottom))",
    };
  }

  return createPortal(
    <div className="fixed inset-0 z-[85]" data-guide-overlay role="presentation">
      {hole ? (
        <>
          <div
            aria-hidden="true"
            className="guide-scrim pointer-events-none fixed left-0 right-0 top-0 animate-guide-fade"
            style={{ height: hole.top }}
          />
          <div
            aria-hidden="true"
            className="guide-scrim pointer-events-none fixed bottom-0 left-0 right-0 animate-guide-fade"
            style={{ top: hole.top + hole.height }}
          />
          <div
            aria-hidden="true"
            className="guide-scrim pointer-events-none fixed left-0 animate-guide-fade"
            style={{
              top: hole.top,
              width: hole.left,
              height: hole.height,
            }}
          />
          <div
            aria-hidden="true"
            className="guide-scrim pointer-events-none fixed right-0 animate-guide-fade"
            style={{
              top: hole.top,
              left: hole.left + hole.width,
              height: hole.height,
            }}
          />

          {cropped ? (
            <div
              aria-hidden="true"
              className="pointer-events-none fixed"
              style={{
                top: hole.top + hole.height - 56,
                left: hole.left,
                width: hole.width,
                height: 56,
                background:
                  "linear-gradient(to bottom, rgb(8 8 9 / 0) 0%, rgb(8 8 9 / 0.55) 100%)",
              }}
            />
          ) : null}

          <div
            aria-hidden="true"
            data-guide-spotlight
            className={`guide-spotlight animate-guide-fade pointer-events-none fixed ${
              cropped ? "guide-spotlight-open" : ""
            }`}
            style={{
              top: hole.top,
              left: hole.left,
              width: hole.width,
              height: hole.height,
              borderTop: "1px solid rgb(var(--color-signal))",
              borderLeft: "1px solid rgb(var(--color-signal))",
              borderRight: "1px solid rgb(var(--color-signal))",
              borderBottom: cropped
                ? "none"
                : "1px solid rgb(var(--color-signal))",
            }}
          >
            {hole.top >= 40 ? (
              <span className="absolute -top-3 left-3 bg-ink px-2 py-0.5 font-mono text-[8px] font-medium uppercase tracking-[0.16em] text-paper">
                {String(stepIndex + 1).padStart(2, "0")} / {stepCount}
              </span>
            ) : null}
            <span
              aria-hidden="true"
              className={`absolute -inset-1.5 animate-guide-pulse border border-signal/60 ${
                cropped ? "border-b-0" : ""
              }`}
            />
            <span className="guide-corner absolute -left-[5px] -top-[5px] h-3.5 w-3.5 border-l-2 border-t-2 border-signal" />
            <span className="guide-corner absolute -right-[5px] -top-[5px] h-3.5 w-3.5 border-r-2 border-t-2 border-signal" />
            {cropped ? null : (
              <>
                <span className="guide-corner absolute -bottom-[5px] -left-[5px] h-3.5 w-3.5 border-b-2 border-l-2 border-signal" />
                <span className="guide-corner absolute -bottom-[5px] -right-[5px] h-3.5 w-3.5 border-b-2 border-r-2 border-signal" />
              </>
            )}
          </div>
        </>
      ) : (
        <div
          aria-hidden="true"
          className="guide-scrim pointer-events-none fixed inset-0 animate-guide-fade"
        />
      )}

      <div className={wrapperClass} style={wrapperStyle}>
        <div
          ref={panelRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby="guide-title"
          aria-describedby="guide-body"
          tabIndex={-1}
          data-guide-panel
          className="pointer-events-auto flex w-full animate-guide-fade flex-col overflow-hidden border-2 border-ink bg-paper shadow-[var(--shadow-modal)] focus:outline-none"
          style={{ maxHeight: activeLayout.maxHeight, width: cardWidth }}
        >
          <div aria-hidden="true" className="flex shrink-0 gap-[2px]">
            {Array.from({ length: stepCount }, (_, index) => (
              <span
                key={index}
                className={`h-[3px] flex-1 ${
                  index <= stepIndex ? "bg-signal" : "bg-ink/10"
                }`}
              />
            ))}
          </div>

          <div className="flex shrink-0 items-start justify-between gap-3 px-5 pb-3 pt-3.5">
            <p className="kicker flex min-w-0 items-center gap-2 text-ink">
              <span aria-hidden="true" className="h-2 w-2 shrink-0 bg-signal" />
              <span className="truncate">Site guide · {pageLabel}</span>
            </p>
            <p className="shrink-0 font-mono text-[9px] uppercase tracking-[0.14em] text-ink-mute">
              Step {stepIndex + 1} of {stepCount}
            </p>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-4">
            <p aria-live="polite" className="sr-only">
              Step {stepIndex + 1} of {stepCount}: {step.title}
            </p>
            <div key={stepIndex} className="animate-guide-step">
              <h2
                id="guide-title"
                className="display text-[24px] leading-[1.1] tracking-[-0.025em] sm:text-[26px]"
              >
                {step.title}
              </h2>
              <p
                id="guide-body"
                className="prose-note mt-2.5 text-[12.5px] leading-6 text-ink-soft"
              >
                {step.body}
              </p>
              {step.tip ? (
                <div className="mt-4 border-l-2 border-signal bg-signal-soft/45 px-3 py-2.5">
                  <p className="font-mono text-[8px] font-medium uppercase tracking-[0.16em] text-ink-mute">
                    Good to know
                  </p>
                  <p className="prose-note mt-1 text-[11px] leading-5 text-ink-soft">
                    {step.tip}
                  </p>
                </div>
              ) : null}
            </div>
          </div>

          <div className="shrink-0 border-t border-rule bg-paper-raised/60 px-5 py-3">
            <div className="flex items-center justify-between gap-3">
              <button type="button" onClick={exitGuide} className="btn-ghost">
                <CloseGlyph />
                Exit
              </button>
              <div className="flex items-center gap-2">
                {stepIndex > 0 ? (
                  <button
                    type="button"
                    onClick={previousStep}
                    className="btn-ghost"
                  >
                    <ArrowGlyph direction="left" />
                    Back
                  </button>
                ) : null}
                <button type="button" onClick={goNext} className="btn-primary">
                  {isLast ? "Finish" : "Continue"}
                  <ArrowGlyph direction="right" />
                </button>
              </div>
            </div>
            <p className="mt-2 hidden text-[8px] uppercase tracking-[0.14em] text-ink-mute sm:block">
              Arrow keys move between steps · Esc exits
            </p>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
