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
          className="border rounded-2xl p-10 hover:shadow-lg transition"
        >
          <h2 className="text-2xl font-bold mb-4">Profiles</h2>
          <p className="text-gray-600">
            Institutional capability scoring and firm visibility.
          </p>
        </Link>

        <Link
          href="/outputs"
          className="border rounded-2xl p-10 hover:shadow-lg transition"
        >
          <h2 className="text-2xl font-bold mb-4">Top Seven Outputs</h2>
          <p className="text-gray-600">
            Core institutional deliverables of aligned firms.
          </p>
        </Link>

        <Link
          href="/survey"
          className="border rounded-2xl p-10 hover:shadow-lg transition"
        >
          <h2 className="text-2xl font-bold mb-4">Start Survey</h2>
          <p className="text-gray-600">
            Generate your institutional alignment profile.
          </p>
        </Link>
      </section>
    </main>
  );
}

