import { notFound } from "next/navigation";
import PublicChatClient from "@/app/components/publicchat/PublicChatClient";
import { PatLogoLockup } from "@/app/components/brand/BrandMarks";
import { publicTierAvailability } from "@/lib/patAssistant/public/usage";

export const dynamic = "force-dynamic";

/**
 * The public Pat chat page (BOX 3).
 *
 * Renders NOTHING without the tier being available — flag on AND an IP-hash salt
 * configured. notFound() rather than a disabled-looking page, matching every
 * other flag-dark surface in the app: a `display:none` page is still a served
 * route, and a 404 does not confirm that the surface exists.
 *
 * The availability check is the SAME function the route uses, so page and
 * endpoint cannot disagree about whether the tier is live. A page that rendered
 * while its endpoint refused would be a chat box that silently never answers.
 *
 * Server component: it resolves availability and hands the interactive shell to
 * a client child. No session is read here — this surface is anonymous by
 * construction, exactly like the route behind it.
 */
export default async function PublicAskPage() {
  if (!publicTierAvailability().available) {
    notFound();
  }

  return (
    <main className="pat-shell-main mx-auto w-full max-w-5xl px-4 py-10">
      <header className="mb-6">
        <PatLogoLockup mode="hero" tone="light" />
        <h1 className="pat-label-emphasis mt-4" style={{ fontSize: "var(--pat-hero-title-size)" }}>
          Ask Pat
        </h1>
        <p className="pat-dark-copy-soft mt-2 max-w-2xl text-sm">
          Pat answers from Patalign&apos;s public library — what the platform is, how alignment is
          measured, and what the numbers mean. When it doesn&apos;t have an answer it says so and
          points you to sign in, rather than guessing.
        </p>
      </header>

      <PublicChatClient signInHref="/sign-in" />
    </main>
  );
}
