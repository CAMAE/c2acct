import Link from "next/link";

const cards = [
  ["Learning progression", "/user/learning", "Reading, quiz, final-test, and progress runtime for invited users."],
  ["User modules", "/user/modules", "Runtime module entry points for internal professional learning and current self-assessment."],
  ["User insights", "/user/insights", "Current user-facing insight, badge, and executive-brief entry points."],
  ["Badge explainer", "/badges", "Tier 1 unlock semantics and evidence expectations."],
  ["Executive brief", "/briefs/executive", "Current operating summary and learning posture."],
];

export default function UserHomePage() {
  return (
    <section className="grid gap-6">
      <div>
        <div className="text-xs uppercase tracking-[0.2em] text-white/50">User home</div>
        <h1 className="mt-3 text-4xl font-semibold">Invited User Surface</h1>
        <p className="mt-3 max-w-3xl text-sm text-white/70">
          This hub scopes invited-user learning and intelligence to runtime surfaces that are actually present in the repo now.
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
