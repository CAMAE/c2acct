import { redirect } from "next/navigation";

/**
 * Depth box 9 (2026-09-09, APPROVED flag-off): the firm user-insight surface is
 * not built. It has no entry in any menu or card; a direct hit lands on the firm
 * workspace with a one-line notice. (The previous placeholder page is gone.)
 */
export const dynamic = "force-dynamic";

export default function FirmUserInsightPage() {
  redirect("/firm?panel=admin&notice=user-insight");
}
