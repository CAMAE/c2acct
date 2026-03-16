import Link from "next/link";

export default function Home() {
  return (
    <main>
      <section className="mb-24">
        <h1 className="text-6xl font-bold mb-6">AAE</h1>
        <p className="text-2xl text-gray-600">
          Autonomous Alignment Infrastructure for Accounting Firms.
        </p>
      </section>

      <section className="grid md:grid-cols-3 gap-10">
        <Link
          href="/profiles"
          title="Open Profiles and review the current profile surface for the demo environment. This destination is still staged and does not alter the assessment or insights flow."
          className="border rounded-2xl p-10 hover:shadow-lg transition"
        >
          <h2 className="text-2xl font-bold mb-4">Profiles</h2>
          <p className="text-gray-600">
            Institutional capability scoring and firm visibility.
          </p>
        </Link>

        <Link
          href="/outputs"
          title="Open Insights and review the current unlocked intelligence experience. This destination is the primary post-results page in the current demo path."
          className="border rounded-2xl p-10 hover:shadow-lg transition"
        >
          <h2 className="text-2xl font-bold mb-4">Insights</h2>
          <p className="text-gray-600">
            Current unlocked intelligence for the active firm or product context.
          </p>
        </Link>

        <Link
          href="/survey"
          title="Open Assessment and choose the current demo entry path. This is the protected starting point for submissions, results, and insights."
          className="border rounded-2xl p-10 hover:shadow-lg transition"
        >
          <h2 className="text-2xl font-bold mb-4">Start Assessment</h2>
          <p className="text-gray-600">
            Generate your institutional alignment profile.
          </p>
        </Link>
      </section>
    </main>
  );
}

