"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

/**
 * WS10-A Block J: click-feedback band-aid for slow route transitions.
 * Sets `cursor: progress` on the document body while a route transition
 * is in flight, cleared once the new pathname is committed. Without it,
 * dev-mode renders of 4-6 seconds leave the user unsure whether their
 * click registered, prompting double-clicks that pop the history stack.
 *
 * Safety timeout: cursor releases after 10 seconds if a navigation
 * hangs (404, redirect loop) so the page does not get stuck.
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
      }, 10000);
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
        startLoading();
        return;
      }

      if (button) {
        if (button.type === "submit") {
          startLoading();
          return;
        }
        if (button.dataset.nav === "true") {
          startLoading();
          return;
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
