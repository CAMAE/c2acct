import Link from "next/link";

const cards = [
  ["Firm insights", "/firm/insights", "Locked and unlocked firm-intelligence entry points with Tier 1 live and Tier 2 clearly deferred."],
  ["Firm modules", "/firm/modules", "Baseline self-assessment modules and invited-user learning entry points."],
  ["Firm users", "/firm/users", "Invited-user learning roster and firm-scoped oversight."],
  ["Grading view", "/firm/users/grading", "Firm-only grading and completion summary."],
  ["Executive brief", "/briefs/executive", "Current board-ready build summary and operating posture."],
  ["Badge explainer", "/badges", "Tier 1 unlock semantics, evidence requirements, and Tier 2 status."],
];

export default function FirmHomePage() {
  return (
    <section className="grid gap-6">
      <div>
        <div className="text-xs uppercase tracking-[0.2em] text-white/50">Firm home</div>
        <h1 className="mt-3 text-4xl font-semibold">Firm Operating Surface</h1>
        <p className="mt-3 max-w-3xl text-sm text-white/70">
          This overview preserves the current self-owned lane, keeps sponsor/private-network seams intact, and links only to firm-side surfaces that exist now.
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {cards.map(([title, href, body]) => (
          <Link key={href} href={href} className="rounded-3xl border border-white/10 bg-white/5 p-6 hover:bg-white/10">
            <div className="text-xl font-semibold">{title}</div>
            <div className="mt-2 text-sm text-white/70">{body}</div>
          </Link>
        ))}
      </div>
    </section>
  );
}
