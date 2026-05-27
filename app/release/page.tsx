import TrustSurfacePage from "@/app/components/trust/TrustSurfacePage";
import {
  getPublicReleaseFingerprintView,
  getReleaseFingerprint,
} from "@/lib/release/fingerprint";
import { getTrustSurface, TRUST_RELEASE_FIELDS } from "@/lib/trustContent";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "PAT Release Transparency | C2Acct",
  description: "Current PAT release fingerprint, build identity, and runtime proof fields.",
};

export default function ReleaseTransparencyPage() {
  const surface = getTrustSurface("release");
  const fingerprint = getPublicReleaseFingerprintView(getReleaseFingerprint());

  return (
    <TrustSurfacePage surface={surface}>
      <section
        className="pat-card px-6 py-7"
        data-release-fingerprint={fingerprint.releaseId}
        aria-label="Current PAT release fingerprint"
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="pat-label">Runtime fingerprint</div>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-[var(--shell-ink)]">
              Release {fingerprint.releaseId}
            </h2>
          </div>
          <span className="rounded-full border border-[var(--shell-border)] px-4 py-2 text-sm font-semibold text-[var(--shell-ink)]">
            Git tree: {fingerprint.gitDirty}
          </span>
        </div>

        <dl className="mt-7 grid gap-4 lg:grid-cols-2">
          {TRUST_RELEASE_FIELDS.map((field) => (
            <div
              key={field.key}
              className="rounded-[22px] border border-[var(--shell-border)] bg-[var(--shell-panel-soft)] p-4"
              data-release-field={field.key}
            >
              <dt className="text-sm font-semibold text-[var(--shell-ink)]">
                {field.label}
              </dt>
              <dd className="mt-2 break-words font-mono text-xs leading-6 text-[var(--shell-muted)]">
                {String(fingerprint[field.key])}
              </dd>
              <dd className="mt-2 text-xs leading-5 text-[var(--shell-muted)]">
                {field.description}
              </dd>
            </div>
          ))}
        </dl>
      </section>
    </TrustSurfacePage>
  );
}
