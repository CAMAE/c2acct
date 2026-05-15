"use client";

import { useState, useTransition } from "react";
import { submitBriefEditChoice } from "@/app/consultants/_actions/briefEditChoice";
import type {
  BriefEditSectionKey,
  BriefKind,
} from "@/lib/briefEditChoice";

/**
 * Bounded edit control: phrasing-variant picker.
 *
 * Renders a chip strip of pre-generated phrasings for the section. User
 * clicks a chip → optimistic local state flip → server-action call. On
 * failure, revert + show inline status text. No free-text input, no
 * dangerouslySetInnerHTML — choiceValue is always a known variant id from
 * the `variants` prop.
 *
 * The discipline is bounded-by-construction (Mock v2.1 §7 + §0.7): the
 * variants prop carries the *server-pre-rendered* alternatives, so the
 * consultant can only pick among phrasings the system already produced
 * from engine data.
 */

export type PhrasingVariantOption = {
  id: string;
  tone: string;
  label: string;
  /** Server-pre-rendered text for this variant; swaps inline on chip click. */
  rendered: string;
};

export default function PhrasingVariantPicker(props: {
  briefKind: BriefKind;
  briefId: string;
  ecosystemId: string;
  sectionKey: BriefEditSectionKey;
  variants: PhrasingVariantOption[];
  activeVariantId?: string;
}) {
  const [activeId, setActiveId] = useState<string>(
    props.activeVariantId ?? props.variants[0]?.id ?? ""
  );
  const [status, setStatus] = useState<string>("");
  const [, startTransition] = useTransition();

  if (props.variants.length === 0) return null;

  const activeVariant =
    props.variants.find((v) => v.id === activeId) ?? props.variants[0];

  function pickVariant(variantId: string) {
    if (variantId === activeId) return;
    const previous = activeId;
    setActiveId(variantId);
    setStatus("");
    startTransition(async () => {
      const result = await submitBriefEditChoice({
        briefKind: props.briefKind,
        briefId: props.briefId,
        ecosystemId: props.ecosystemId,
        sectionKey: props.sectionKey,
        choiceType: "PHRASING_VARIANT",
        choiceValue: variantId,
      });
      if (!result.ok) {
        setActiveId(previous);
        setStatus(
          result.reason === "not-found"
            ? "Unable to save — refresh the page."
            : "Saved variant rejected. Refresh the page."
        );
      }
    });
  }

  return (
    <div data-testid="phrasing-variant-picker" data-section-key={props.sectionKey}>
      <p
        className="text-sm leading-6 text-[var(--shell-ink)]"
        data-testid="phrasing-variant-active-text"
      >
        {activeVariant.rendered}
      </p>
      <div className="mt-2 flex flex-wrap items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--shell-muted)]">
        <span>Tone</span>
        <div className="pat-mode-toggle">
          {props.variants.map((variant) => {
            const isActive = variant.id === activeId;
            return (
              <button
                key={variant.id}
                type="button"
                onClick={() => pickVariant(variant.id)}
                data-testid="phrasing-variant-chip"
                data-variant-id={variant.id}
                data-active={isActive ? "true" : "false"}
                aria-pressed={isActive}
                className="pat-mode-toggle__option"
              >
                <span>{variant.label}</span>
              </button>
            );
          })}
        </div>
        {status ? (
          <span role="status" className="normal-case text-[var(--brand-c2-blue)]">
            {status}
          </span>
        ) : null}
      </div>
    </div>
  );
}
