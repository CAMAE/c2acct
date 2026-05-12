import Link from "next/link";
import PortalPanelSelector from "@/app/components/pat/PortalPanelSelector";
import type { VendorProductStatus } from "@/lib/vendorPat";

export type VendorProductAssessmentDashboardProduct = {
  id: string;
  name: string;
  summary: string | null;
  website: string | null;
  utilityCount: number;
  status: VendorProductStatus;
};

type Props = {
  activePanel: "completed" | "new" | "help";
  products: VendorProductAssessmentDashboardProduct[];
  signedIntoVendor: boolean;
  createProduct: (formData: FormData) => Promise<void>;
};

function getPanelHref(panel: "completed" | "new" | "help") {
  return panel === "completed"
    ? "/vendor/product-assessment"
    : `/vendor/product-assessment?panel=${panel}`;
}

const helpCards = [
  {
    title: "What this page is for",
    body: "Use this workspace to manage product-level vendor PAT assessments. It separates product inventory, live assessment state, and workflow guidance so product evidence does not get buried inside a generic vendor form.",
  },
  {
    title: "Why utilities matter",
    body: "Utilities define the scope PAT is allowed to assess. Each declared utility adds its own scored question clusters, so the page only implies coverage the question bank can actually support.",
  },
  {
    title: "What completed means",
    body: "Completed shows products already in the workspace, including utility declaration state, generated question count, current progress framing, and the latest recorded score when one exists.",
  },
  {
    title: "What new does",
    body: "New creates the product record, then routes into the utility-driven assessment flow. Product creation is the entry point, not a separate dead-end admin step.",
  },
  {
    title: "How the loops connect",
    body: "The workflow is: create product, declare utilities, complete the vendor product assessment, then review product insight. Product insight reads the current vendor self-signal and keeps later firm-reviewed signal separate.",
  },
] as const;

export default function VendorProductAssessmentDashboard({
  activePanel,
  products,
  signedIntoVendor,
  createProduct,
}: Props) {
  const options = [
    { key: "completed", label: "Completed", href: getPanelHref("completed") },
    { key: "new", label: "New", href: getPanelHref("new") },
    { key: "help", label: "Help", href: getPanelHref("help") },
  ] as const;

  return (
    <div className="space-y-8">
      <section className="pat-card p-8">
        <div className="pat-label">Vendor product assessment</div>
        <h1 className="mt-4 text-4xl font-semibold tracking-tight text-[var(--shell-ink)]">
          Product-level PAT workspace
        </h1>
        <p className="mt-4 max-w-3xl text-base leading-7 text-[var(--shell-muted)]">
          Build product-specific PAT evidence instead of collapsing products into one generic vendor form. Utilities define the scope, the runtime generates the question plan, and product insight reads the resulting vendor signal honestly.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link className="pat-button-secondary" href="/vendor">
            Back to vendor home
          </Link>
          {!signedIntoVendor ? (
            <Link className="pat-button-primary" href="/sign-in/vendor">
              Sign in as vendor
            </Link>
          ) : null}
        </div>
        <div className="mt-6">
          <PortalPanelSelector activeKey={activePanel} options={options} />
        </div>
      </section>

      {!signedIntoVendor ? (
        <section className="pat-card p-6 text-sm leading-6 text-[var(--shell-muted)]">
          Sign in with a vendor-linked account to create products, declare utilities, and save product assessments.
        </section>
      ) : activePanel === "completed" ? (
        <section className="space-y-4">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 className="text-2xl font-semibold text-[var(--shell-ink)]">Completed</h2>
              <p className="mt-1 text-sm leading-6 text-[var(--shell-muted)]">
                Review current vendor products, see their live assessment state, and jump straight back into the actual product assessment runtime.
              </p>
            </div>
            <Link className="pat-button-primary" href={getPanelHref("new")}>
              Add new product
            </Link>
          </div>

          {products.length === 0 ? (
            <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
              <div className="pat-card p-6 text-sm leading-6 text-[var(--shell-muted)]">
                No vendor products are registered yet. Open the New panel to create the first product, then continue into utility declaration and the live product assessment runtime.
              </div>
              <div className="pat-card p-6">
                <div className="pat-label">Next step</div>
                <h3 className="mt-4 text-xl font-semibold text-[var(--shell-ink)]">Start with a product record</h3>
                <p className="mt-3 text-sm leading-6 text-[var(--shell-muted)]">
                  Product creation stays visible here so the empty completed state does not hide the real entry point.
                </p>
                <div className="mt-5">
                  <Link className="pat-button-primary" href={getPanelHref("new")}>
                    Create first product
                  </Link>
                </div>
              </div>
            </div>
          ) : (
            <div className="grid gap-5 md:grid-cols-2">
              {products.map((product) => (
                <article
                  key={product.id}
                  className="rounded-[24px] border border-[var(--shell-border)] bg-white p-6 shadow-[0_24px_60px_rgba(15,23,42,0.06)]"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="text-xl font-semibold text-[var(--shell-ink)]">{product.name}</div>
                      <p className="mt-2 text-sm leading-6 text-[var(--shell-muted)]">
                        {product.summary ?? "No product summary added yet."}
                      </p>
                    </div>
                    <span className="rounded-full bg-[var(--shell-accent)]/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--shell-accent)]">
                      {product.status.statusLabel}
                    </span>
                  </div>
                  <div className="mt-5 grid gap-3 md:grid-cols-2 text-sm leading-6 text-[var(--shell-muted)]">
                    <div>
                      Utilities declared:{" "}
                      <span className="font-semibold text-[var(--shell-ink)]">{product.utilityCount}</span>
                    </div>
                    <div>
                      Status: <span className="font-semibold text-[var(--shell-ink)]">{product.status.statusLabel}</span>
                    </div>
                    <div>
                      Question count:{" "}
                      <span className="font-semibold text-[var(--shell-ink)]">{product.status.questionCount}</span>
                    </div>
                    <div>
                      Latest score:{" "}
                      <span className="font-semibold text-[var(--shell-ink)]">{product.status.latestScore ?? "--"}</span>
                    </div>
                    <div>
                      Progress state:{" "}
                      <span className="font-semibold text-[var(--shell-ink)]">{product.status.progressLabel}</span>
                    </div>
                  </div>
                  <p className="mt-4 text-sm leading-6 text-[var(--shell-muted)]">
                    {product.status.assessmentSummary}
                  </p>
                  <div className="mt-5 flex flex-wrap gap-3">
                    <Link className="pat-button-primary" href={`/vendor/product-assessment/${product.id}`}>
                      Open assessment
                    </Link>
                    <Link className="pat-button-secondary" href={`/vendor/product-insight/${product.id}`}>
                      Open product insight
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      ) : activePanel === "new" ? (
        <section className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
          <div className="pat-card p-6">
            <div className="pat-label">New</div>
            <h2 className="mt-4 text-2xl font-semibold tracking-tight text-[var(--shell-ink)]">
              Create a product
            </h2>
            <p className="mt-3 text-sm leading-6 text-[var(--shell-muted)]">
              Add the product first. The assessment itself happens after creation, where PAT asks for the product profile, utility declaration, scored utility pages, and the final narrative layer.
            </p>
            <form action={createProduct} className="mt-6 grid gap-4">
              <input name="name" className="pat-input" placeholder="Product name" required />
              <input name="website" className="pat-input" placeholder="Product website" />
              <textarea
                name="summary"
                className="pat-textarea"
                rows={4}
                placeholder="Grounded product summary"
              />
              <div>
                <button type="submit" className="pat-button-primary">
                  Create product
                </button>
              </div>
            </form>
          </div>

          <div className="pat-card p-6">
            <div className="pat-label">Utility declaration entry point</div>
            <h2 className="mt-4 text-2xl font-semibold tracking-tight text-[var(--shell-ink)]">
              What happens next
            </h2>
            <div className="mt-4 space-y-3 text-sm leading-6 text-[var(--shell-muted)]">
              <p>The next step is utility declaration. Utilities are not marketing labels; they define which question clusters PAT is allowed to ask for this product.</p>
              <p>Each declared utility adds 20 scored questions, grouped into four 5-question sections so evidence stays explainable by subcategory instead of collapsing into a single opaque score.</p>
              <p>After utilities are chosen, PAT opens the product profile page, utility-aligned scored pages, and the final narrative page for the same product record.</p>
              <p>The finished vendor product assessment feeds the product insight loop. PAT keeps vendor self-report separate from later firm-reviewed signal.</p>
            </div>
          </div>
        </section>
      ) : (
        <section className="space-y-6">
          <div className="pat-card p-6">
            <div className="pat-label">Help</div>
            <h2 className="mt-4 text-2xl font-semibold tracking-tight text-[var(--shell-ink)]">
              How this workspace works
            </h2>
            <p className="mt-4 max-w-3xl text-sm leading-6 text-[var(--shell-muted)]">
              This help view explains the workflow in product terms: what this page manages, why utilities change the live scope, and how the assessment and insight loops connect without overstating current coverage.
            </p>
          </div>

          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {helpCards.map((card) => (
              <article key={card.title} className="pat-card p-6">
                <div className="text-lg font-semibold text-[var(--shell-ink)]">{card.title}</div>
                <p className="mt-3 text-sm leading-6 text-[var(--shell-muted)]">{card.body}</p>
              </article>
            ))}
          </section>

          <section className="pat-card p-6">
            <div className="pat-label">Operator notes</div>
            <div className="mt-4 grid gap-4 md:grid-cols-3">
              <div className="pat-soft-panel p-4 text-sm leading-6 text-[var(--shell-muted)]">
                PAT does not silently cap utility coverage on this page. Question counts rise with declared utility scope.
              </div>
              <div className="pat-soft-panel p-4 text-sm leading-6 text-[var(--shell-muted)]">
                Coverage remains limited to the current utility question bank and generated assessment plan.
              </div>
              <div className="pat-soft-panel p-4 text-sm leading-6 text-[var(--shell-muted)]">
                Product insight uses current PAT evidence only. It does not imply unsupported benchmarks, forecasts, or AI-derived coverage.
              </div>
            </div>
          </section>
        </section>
      )}
    </div>
  );
}
