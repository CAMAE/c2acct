import Link from "next/link";

const cards = [
  ["Learning runtime", "/user/learning", "Internal professional-learning runtime with reading, quiz, final, and progress tracking."],
  ["Current assessment entry", "/survey", "Current self-assessment entry surface remains available where user scope overlaps with firm context."],
  ["Badge and brief context", "/badges", "Unlock semantics and executive framing for current learning and intelligence paths."],
];

export default function UserModulesPage() {
  return (
    <section className="grid gap-6">
      <div>
        <div className="text-xs uppercase tracking-[0.2em] text-white/50">User modules</div>
        <h1 className="mt-3 text-4xl font-semibold">User module entry points</h1>
        <p className="mt-3 max-w-3xl text-sm text-white/70">
          User modules stay focused on the invited-user learning runtime plus the currently available shared assessment surfaces. Quiz and review paging remains five questions per page.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
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
