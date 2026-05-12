import Link from "next/link";
import type { FirmProductCatalogItem } from "@/lib/firmPat";

type Props = {
  product: FirmProductCatalogItem;
};

export default function FirmProductAssessmentCatalogCard({ product }: Props) {
  return (
    <Link href={product.href} className="pat-card pat-card-interactive block rounded-[24px] bg-white p-6">
      <div className="text-xl font-semibold text-[var(--shell-ink)]">{product.name}</div>
      <p className="mt-3 text-sm leading-6 text-[var(--shell-muted)]">
        {product.summary ?? product.description}
      </p>
      <div className="mt-5 grid gap-2 text-sm leading-6 text-[var(--shell-muted)]">
        <div>Questions: <span className="font-semibold text-[var(--shell-ink)]">{product.questionCount}</span></div>
        <div>Progress: <span className="font-semibold text-[var(--shell-ink)]">{product.progressLabel}</span></div>
        <div>
          Latest score: <span className="font-semibold text-[var(--shell-ink)]">{product.latestScore ?? "Not started"}</span>
        </div>
      </div>
      <p className="mt-4 text-sm leading-6 text-[var(--shell-muted)]">{product.description}</p>
    </Link>
  );
}
