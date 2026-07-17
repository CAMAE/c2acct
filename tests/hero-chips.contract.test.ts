import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { HeroChipsView } from "@/app/components/pat/HeroChipsView";
import { MEMBERSHIP_PLAN } from "@/lib/membership";

type Props = Parameters<typeof HeroChipsView>[0];
const render = (props: Props) => renderToStaticMarkup(createElement(HeroChipsView, props));

describe("HeroChips (Block 14a/b/c)", () => {
  it("14c CONTRACT: Elite never sees the upgrade-to-Elite CTA", () => {
    const html = render({
      audience: "vendor",
      plan: MEMBERSHIP_PLAN.ELITE,
      upgradeHref: "/vendor/membership/checkout?plan=elite",
    });
    expect(html).not.toContain("upgrade-to-elite-chip");
    expect(html).not.toContain("Upgrade to Elite");
    // tier flag + back chip still render
    expect(html).toContain("tier-flag-chip");
    expect(html).toContain("Elite");
    expect(html).toContain("workspace-back-chip");
  });

  it("14b/14c: Pro sees the Pro tier flag AND the upgrade CTA", () => {
    const html = render({
      audience: "firm",
      plan: MEMBERSHIP_PLAN.PRO,
      upgradeHref: "/firm/membership/checkout?plan=elite",
    });
    expect(html).toContain("upgrade-to-elite-chip");
    expect(html).toContain("Upgrade to Elite");
    expect(html).toContain('data-tier="PRO"');
  });

  it("consultant sees only the workspace back chip (no tier flag, no upgrade)", () => {
    const html = render({ audience: "consultant" });
    expect(html).toContain("workspace-back-chip");
    expect(html).not.toContain("tier-flag-chip");
    expect(html).not.toContain("upgrade-to-elite-chip");
  });

  it("FREE / no-membership shows no tier flag and no upgrade", () => {
    const html = render({ audience: "firm", plan: MEMBERSHIP_PLAN.FREE, upgradeHref: "/firm/membership/checkout?plan=elite" });
    expect(html).not.toContain("tier-flag-chip");
    expect(html).not.toContain("upgrade-to-elite-chip");
    expect(html).toContain("workspace-back-chip");
  });

  it("14a: the back chip links to the audience workspace home", () => {
    expect(render({ audience: "firm" })).toContain('href="/firm"');
    expect(render({ audience: "vendor" })).toContain('href="/vendor"');
    expect(render({ audience: "consultant" })).toContain('href="/consultants"');
  });
});
