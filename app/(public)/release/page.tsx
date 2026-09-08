import TrustSurfacePage from "@/app/components/trust/TrustSurfacePage";
import {
  getPublicReleaseFingerprintView,
  getReleaseFingerprint,
} from "@/lib/release/fingerprint";
import { getTrustSurface, TRUST_RELEASE_FIELDS } from "@/lib/trustContent";
import TrustSurfaceV7 from "@/app/components/trust/TrustSurfaceV7";
import { isNewFrontDoorEnabled } from "@/lib/frontDoor";

const RELEASE_TABLE_FIELDS = ["releaseId", "commitSha", "buildTimestamp", "authMode"] as const;


export const dynamic = "force-dynamic";

export const metadata = {
  title: "PAT Release Transparency | Patalign",
  description: "Current PAT release fingerprint, build identity, and runtime proof fields.",
};

export default function ReleaseTransparencyPage() {
  const surface = getTrustSurface("release");
  const fingerprint = getPublicReleaseFingerprintView(getReleaseFingerprint());

  // B3 (flag-on): one paragraph (the surface summary) and a mono table of
  // release id / commit / build time / auth mode. The full field set stays on
  // the flag-off page and in the data attribute the startup guard reads.
  if (isNewFrontDoorEnabled()) {
    return (
      <TrustSurfaceV7
        surface={surface}
        chips={[{ label: fingerprint.releaseId, mono: true }, { label: `Git tree: ${fingerprint.gitDirty}`, mono: true }]}
        sections={[]}
      >
        <section
          className="mt-2"
          data-release-fingerprint={fingerprint.releaseId}
          aria-label="Current PAT release fingerprint"
        >
          <div className="overflow-x-auto rounded-[var(--radius-card)] border border-[var(--shell-border)] bg-white">
            <table className="pat-mono w-full text-left">
              <tbody>
                {RELEASE_TABLE_FIELDS.map((key) => {
                  const field = TRUST_RELEASE_FIELDS.find((entry) => entry.key === key);
                  return (
                    <tr key={key} className="border-b border-[var(--shell-border)] last:border-b-0" data-release-field={key}>
                      <th scope="row" className="whitespace-nowrap px-4 py-3 align-top font-semibold text-[var(--shell-muted)]">
                        {field?.label ?? key}
                      </th>
                      <td className="break-all px-4 py-3 text-[var(--shell-ink)]">{String(fingerprint[key])}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      </TrustSurfaceV7>
    );
  }

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
