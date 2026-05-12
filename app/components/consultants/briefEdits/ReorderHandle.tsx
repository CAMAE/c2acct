"use client";

import { useState, useTransition, type ReactNode } from "react";
import { submitBriefEditChoice } from "@/app/consultants/_actions/briefEditChoice";
import type {
  BriefEditSectionKey,
  BriefKind,
} from "@/lib/briefEditChoice";

/**
 * Bounded edit control: drag-handle reorder.
 *
 * HTML5 native drag-and-drop — no third-party library. Items carry stable
 * ids from the `items` prop; on drop the new order is committed to the
 * server action as a comma-joined string of ids.
 *
 * Items not in a stored ORDERING choice fall back to their original
 * relative order on the server-side composition path (Block 4) — that
 * protects against stale ids after a brief regen.
 */

export type ReorderItem = {
  id: string;
  label: string;
  content: ReactNode;
};

export default function ReorderHandle(props: {
  briefKind: BriefKind;
  briefId: string;
  ecosystemId: string;
  sectionKey: BriefEditSectionKey;
  items: ReorderItem[];
  activeOrder?: readonly string[];
}) {
  // Apply the consultant's active order to the items prop. Ids in items
  // but not in activeOrder slot to the end in their original order.
  const orderedIds = computeOrderedIds(
    props.items.map((i) => i.id),
    props.activeOrder
  );
  const [order, setOrder] = useState<string[]>(orderedIds);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [status, setStatus] = useState<string>("");
  const [, startTransition] = useTransition();

  const itemsById = new Map(props.items.map((i) => [i.id, i]));

  function commitOrder(nextOrder: string[]) {
    const previous = order;
    setOrder(nextOrder);
    setStatus("");
    const choiceValue = nextOrder.join(",");
    startTransition(async () => {
      const result = await submitBriefEditChoice({
        briefKind: props.briefKind,
        briefId: props.briefId,
        ecosystemId: props.ecosystemId,
        sectionKey: props.sectionKey,
        choiceType: "ORDERING",
        choiceValue,
      });
      if (!result.ok) {
        setOrder(previous);
        setStatus(
          result.reason === "not-found"
            ? "Unable to save — refresh the page."
            : "Reorder rejected. Refresh the page."
        );
      }
    });
  }

  function onDragStart(itemId: string) {
    setDraggingId(itemId);
  }

  function onDragOver(event: React.DragEvent<HTMLLIElement>) {
    event.preventDefault();
  }

  function onDrop(targetId: string) {
    if (!draggingId || draggingId === targetId) return;
    const next = [...order];
    const fromIdx = next.indexOf(draggingId);
    const toIdx = next.indexOf(targetId);
    if (fromIdx < 0 || toIdx < 0) return;
    next.splice(fromIdx, 1);
    next.splice(toIdx, 0, draggingId);
    setDraggingId(null);
    commitOrder(next);
  }

  return (
    <div
      data-testid="reorder-handle-container"
      data-section-key={props.sectionKey}
    >
      <ul className="flex flex-col gap-2">
        {order.map((itemId, position) => {
          const item = itemsById.get(itemId);
          if (!item) return null;
          return (
            <li
              key={itemId}
              draggable
              onDragStart={() => onDragStart(itemId)}
              onDragOver={onDragOver}
              onDrop={() => onDrop(itemId)}
              data-testid="reorder-item"
              data-item-id={itemId}
              data-position={position}
              className="flex items-start gap-2"
            >
              <span
                aria-label={`Reorder ${item.label}`}
                data-testid="reorder-handle"
                className="mt-1 cursor-grab select-none text-[var(--shell-muted)]"
              >
                {"≡"}
              </span>
              <div className="flex-1">{item.content}</div>
            </li>
          );
        })}
      </ul>
      {status ? (
        <p role="status" className="mt-2 text-xs text-[var(--brand-accent)]">
          {status}
        </p>
      ) : null}
    </div>
  );
}

function computeOrderedIds(
  itemIds: readonly string[],
  activeOrder: readonly string[] | undefined
): string[] {
  if (!activeOrder || activeOrder.length === 0) return [...itemIds];
  const knownSet = new Set(itemIds);
  // Filter the activeOrder to ids that still exist, preserving the
  // consultant's chosen sequence.
  const ordered = activeOrder.filter((id) => knownSet.has(id));
  // Append any items not in activeOrder at the end, preserving original
  // relative order — defense against stale choices after a brief regen.
  const orderedSet = new Set(ordered);
  for (const id of itemIds) {
    if (!orderedSet.has(id)) ordered.push(id);
  }
  return ordered;
}
