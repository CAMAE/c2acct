import { headers } from "next/headers";

export default async function Outputs({
  searchParams,
}: {
  searchParams: Promise<{ companyId?: string }>;
}) {
  const params = await searchParams;
  const companyId = params?.companyId;

  if (!companyId) {
    return (
      <section className="p-10">
        <h1 className="text-2xl font-semibold">Outputs</h1>
        <p className="mt-4 text-red-500">companyId missing in query string</p>
      </section>
    );
  }

  const h = await headers();
  const host = h.get("host") ?? "localhost:3000";
  const protocol = process.env.NODE_ENV === "development" ? "http" : "https";
  const baseUrl = `${protocol}://${host}`;

  const unlockedRes = await fetch(
    `${baseUrl}/api/insights/unlocked?companyId=${companyId}`,
    { cache: "no-store" }
  );

  const unlockedJson = await unlockedRes.json();
  const insights = unlockedJson.insights ?? [];

  return (
    <section className="p-10">
      <h1 className="text-3xl font-semibold mb-8">Tier 1 Outputs</h1>

      <div className="grid gap-6 md:grid-cols-2">
        {insights.map((insight: { id: string; key: string; title: string; body: string; tier: number; unlocked: boolean }) => (
          <div
            key={insight.id}
            className={`rounded-2xl border p-6 transition ${
              insight.unlocked
                ? "bg-white border-black"
                : "bg-gray-100 border-gray-300 opacity-60"
            }`}
          >
            <h2 className="text-lg font-medium">{insight.title}</h2>

            {!insight.unlocked && (
              <p className="text-sm mt-2 text-gray-500">
                🔒 Complete required assessments to unlock
              </p>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}






