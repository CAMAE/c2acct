import Link from "next/link";

const cards = [
  ["Baseline self-assessment", "/survey", "Canonical self-owned assessment entry path with 5-question paging preserved in runtime."],
  ["Invited-user learning modules", "/user/learning", "Reading, quizzes, final test, and progress runtime for firm-subset invited users."],
  ["Firm grading oversight", "/firm/users/grading", "Firm-scoped grading and completion summary across invited users."],
];

export default function FirmModulesPage() {
  return (
    <section className="grid gap-6">
      <div>
        <div className="text-xs uppercase tracking-[0.2em] text-white/50">Firm modules</div>
        <h1 className="mt-3 text-4xl font-semibold">Firm module entry points</h1>
        <p className="mt-3 max-w-3xl text-sm text-white/70">
          Firm module access stays anchored to the self-owned assessment lane and the invited-user learning runtime. Assessment paging remains five questions per page.
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
