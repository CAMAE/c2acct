"use client";

import { useEffect, useRef, type ReactNode } from "react";

/**
 * R30/R33 drawer shell, extracted for R37 (box 2d, 2026-09-25) so the Product Fit
 * Card opens its firm brief in the same right-hand drawer the insights use. A pure
 * move of the markup InsightSurfaceCardGrid rendered inline (R30): fixed
 * positioning takes it out of flow, so the calling grid never moves; Escape and
 * the X close it; optional Previous/Next step through siblings. The body wrapper
 * carries data-readout-drawer so app/globals.css reflows it to one column.
 */
export default function ReadoutDrawer({
  open,
  titleId,
  title,
  eyebrow = "Readout",
  testId = "insight-readout-drawer",
  closeLabel = "Close readout",
  previousLabel = "Previous insight",
  nextLabel = "Next insight",
  onClose,
  onPrevious,
  onNext,
  children,
}: {
  open: boolean;
  titleId: string;
  title: ReactNode;
  eyebrow?: string;
  testId?: string;
  closeLabel?: string;
  previousLabel?: string;
  nextLabel?: string;
  onClose: () => void;
  /** Undefined hides the Previous/Next pair; null renders it disabled. */
  onPrevious?: (() => void) | null;
  onNext?: (() => void) | null;
  children: ReactNode;
}) {
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    const previousPaddingRight = document.body.style.paddingRight;
    // Lock the page scroll without shifting the grid: keep the scrollbar's width as padding.
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    document.body.style.overflow = "hidden";
    if (scrollbarWidth > 0) document.body.style.paddingRight = `${scrollbarWidth}px`;
    closeButtonRef.current?.focus();
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.body.style.paddingRight = previousPaddingRight;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onClose]);
  if (!open) return null;
  const showNav = onPrevious !== undefined || onNext !== undefined;
  return (
    <>
                  <div
                    className="fixed inset-0 z-[70] bg-[rgba(12,33,66,0.28)]"
                    aria-hidden="true"
                    onClick={onClose}
                  />
                  <div
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby={titleId}
                    data-testid={testId}
                    className="fixed inset-0 z-[71] flex flex-col overflow-y-auto bg-white text-left md:inset-y-0 md:left-auto md:right-0 md:w-[min(44rem,100vw)] md:border-l md:border-[var(--shell-border)]"
                  >
                    <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-[var(--shell-border)] bg-white/95 px-6 py-4 backdrop-blur-[6px]">
                      <div className="min-w-0">
                        <div className="pat-label">{eyebrow}</div>
                        <h2 id={titleId} className="mt-1 text-xl font-semibold text-[var(--shell-ink)]">
                          {title}
                        </h2>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        {showNav ? (
                        <>
                        <button
                          type="button"
                          className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[var(--shell-border)] text-[var(--shell-muted)] hover:text-[var(--shell-ink)] disabled:opacity-40"
                          aria-label={previousLabel}
                          title={previousLabel}
                          disabled={!onPrevious}
                          onClick={() => onPrevious?.()}
                        >
                          <span aria-hidden="true">‹</span>
                        </button>
                        <button
                          type="button"
                          className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[var(--shell-border)] text-[var(--shell-muted)] hover:text-[var(--shell-ink)] disabled:opacity-40"
                          aria-label={nextLabel}
                          title={nextLabel}
                          disabled={!onNext}
                          onClick={() => onNext?.()}
                        >
                          <span aria-hidden="true">›</span>
                        </button>
                        </>
                        ) : null}
                        <button
                          ref={closeButtonRef}
                          type="button"
                          className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[var(--shell-border)] text-[var(--shell-ink)] hover:border-[rgba(6,54,116,0.32)] focus:outline-none focus:ring-2 focus:ring-[rgba(6,54,116,0.18)]"
                          aria-label={closeLabel}
                          title={closeLabel}
                          onClick={onClose}
                        >
                          <span aria-hidden="true">×</span>
                        </button>
                      </div>
                    </div>
                    {/* R33: inside the drawer the readout reflows to one column — the
                        bodies' lg:grid-cols-2 collapses and every pill wraps (app/globals.css
                        [data-readout-drawer]); the bodies themselves are untouched, so the
                        inline (flag-off) and full-page renders keep their layout. */}
                    <div className="px-6 py-5" data-readout-drawer="">
                      {children}
                    </div>
                  </div>
    </>
  );
}
