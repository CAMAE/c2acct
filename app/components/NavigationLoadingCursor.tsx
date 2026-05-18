"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

/**
 * WS10-A Block J + WS10-B Block H: click-feedback band-aid for slow route
 * transitions. Sets `cursor: progress` on the document body while a route
 * transition is in flight, cleared once the new pathname is committed.
 *
 * WS10-B Block H tightens the click filter:
 *   - same-URL anchor clicks (pathname + search both match current) do not
 *     fire a navigation, so the cursor would otherwise sit in progress
 *     state until the safety timeout. Skipped.
 *   - form-submit buttons are dropped: nearly every form-like interaction
 *     in this app is React state (filter chips, toggles), not a real form
 *     POST + redirect. The pat-stat-number useEffect on usePathname never
 *     fires for those, so the cursor sat on. Now only opt-in via
 *     `data-nav="true"` triggers the cursor for buttons.
 *   - safety timeout dropped from 10s to 5s.
 */
export default function NavigationLoadingCursor() {
  const pathname = usePathname();

  useEffect(() => {
    document.body.classList.remove("nav-loading");
  }, [pathname]);

  useEffect(() => {
    let safetyTimeout: ReturnType<typeof setTimeout> | null = null;

    function startLoading() {
      document.body.classList.add("nav-loading");
      if (safetyTimeout) clearTimeout(safetyTimeout);
      safetyTimeout = setTimeout(() => {
        document.body.classList.remove("nav-loading");
      }, 5000);
    }

    function onClick(event: MouseEvent) {
      if (event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

      const target = event.target as HTMLElement | null;
      if (!target) return;
      const anchor = target.closest("a") as HTMLAnchorElement | null;
      const button = target.closest("button") as HTMLButtonElement | null;
      const interactive = anchor ?? button;
      if (!interactive) return;

      if (interactive.hasAttribute("disabled")) return;
      if (interactive.getAttribute("aria-disabled") === "true") return;

      if (anchor) {
        const href = anchor.getAttribute("href");
        if (!href) return;
        if (href.startsWith("#")) return;
        if (href.startsWith("mailto:") || href.startsWith("tel:")) return;
        if (anchor.target === "_blank") return;

        // WS10-B Block H: skip same-URL clicks. They don't fire a navigation
        // and the cursor would otherwise hang until the safety timeout.
        // Search-param changes (e.g. /vendor → /vendor?panel=admin) still
        // trigger correctly because url.search will differ.
        try {
          const url = new URL(anchor.href, window.location.href);
          if (
            url.pathname === window.location.pathname &&
            url.search === window.location.search
          ) {
            return;
          }
        } catch {
          // Malformed href — fall through and let startLoading() run; the
          // safety timeout will release if no navigation occurs.
        }

        startLoading();
        return;
      }

      if (button) {
        // WS10-B Block H: form-submit branch removed; only buttons that
        // explicitly opt into navigation feedback via data-nav="true"
        // trigger the cursor.
        if (button.dataset.nav === "true") {
          startLoading();
        }
      }
    }

    document.addEventListener("click", onClick, { capture: true });
    return () => {
      document.removeEventListener("click", onClick, { capture: true });
      if (safetyTimeout) clearTimeout(safetyTimeout);
    };
  }, []);

  return null;
}
