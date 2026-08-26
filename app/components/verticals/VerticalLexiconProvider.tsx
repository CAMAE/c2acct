"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { LexiconKey, VerticalLexicon } from "@/lib/verticals/lexicon";

/**
 * The client half of the display-layer lexicon (class d).
 *
 * The rule this component exists to enforce: a client component receives the
 * lexicon, it never resolves one. Resolution needs the request's tenant and the
 * pack on disk — neither exists in a browser, and a `process.env` read in
 * client code is inlined at build time, so it cannot vary per tenant no matter
 * how it is written.
 *
 * Usage — the server resolves, the client consumes:
 *
 *   // page.tsx (server component)
 *   const lexicon = await resolveLexiconForRequest();
 *   return (
 *     <VerticalLexiconProvider value={lexicon}>
 *       <SomeInteractiveThing />
 *     </VerticalLexiconProvider>
 *   );
 *
 *   // SomeInteractiveThing.tsx ("use client")
 *   const t = useLexicon();
 *   <h2>Built for {t("firmPlural")}</h2>
 *
 * Prefer plain props for a single component. Reach for the provider when the
 * value would otherwise be threaded through several layers of client children.
 *
 * There is deliberately NO default value. A missing provider throws instead of
 * quietly rendering accounting nouns — the same reasoning as an unprimed
 * non-accounting lexicon on the server: copy that reads as correct and is not
 * is worse than copy that fails.
 */
const VerticalLexiconContext = createContext<VerticalLexicon | null>(null);

export function VerticalLexiconProvider({
  value,
  children,
}: {
  value: VerticalLexicon;
  children: ReactNode;
}) {
  return <VerticalLexiconContext.Provider value={value}>{children}</VerticalLexiconContext.Provider>;
}

/**
 * The client-side counterpart of `lexicon(key)`. Same call shape, same keys —
 * the only difference is where the values came from.
 */
export function useLexicon(): (key: LexiconKey) => string {
  const value = useContext(VerticalLexiconContext);
  if (!value) {
    throw new Error(
      "useLexicon() was called outside <VerticalLexiconProvider>. Resolve the lexicon " +
        "server-side with resolveLexiconForRequest() and pass it down — a client component " +
        "cannot resolve a vertical (no tenant, no pack, and a build-time process.env read)."
    );
  }
  return (key: LexiconKey) => value[key];
}

/** The whole map, for a client component that needs more than one term. */
export function useVerticalLexicon(): VerticalLexicon {
  const value = useContext(VerticalLexiconContext);
  if (!value) {
    throw new Error(
      "useVerticalLexicon() was called outside <VerticalLexiconProvider>. See useLexicon()."
    );
  }
  return value;
}
