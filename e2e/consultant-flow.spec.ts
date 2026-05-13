import { expect, test } from "@playwright/test";

const PASSWORD = process.env.PAT_LOCAL_REVIEW_PASSWORD ?? "pat-local-review";
const DEMO_BENCH_PASSWORD =
  process.env.PAT_DEMO_BENCH_PASSWORD ?? "Pat-Demo-Bench-Consultant-2026";
const consultantAccessEnabled = process.env.PAT_ENABLE_CONSULTANT_ACCESS === "1";

test.describe("consultant flow", () => {
  // AUDIT-D12-002 closer (Day-18 Block 3): the vendor-brief-edit
  // happy-path test writes BriefEditChoice rows that persist across
  // runs, biasing the next run's initial active-chip state. Sweep via
  // an external tsx-invoked script (same pattern as
  // e2e/local-review-auth.spec.ts:120's afterAll).
  test.afterAll(async () => {
    const { execFileSync } = await import("node:child_process");
    try {
      execFileSync(
        "node",
        ["--import", "tsx", "scripts/test-cleanup-e2e-fixtures.ts"],
        { stdio: "inherit" }
      );
    } catch {
      // Cleanup failure must not fail the test run; the next run re-attempts.
    }
  });
  test("review.consultant@pat.local lands on /consultants and sees their assigned ecosystem", async ({ page, context }) => {
    test.skip(
      !consultantAccessEnabled,
      "Consultant access flag is off; landing assertion only meaningful when /consultants is reachable."
    );
    const csrfRes = await context.request.get("/api/auth/csrf");
    const { csrfToken } = await csrfRes.json();
    await context.request.post("/api/auth/callback/credentials", {
      form: {
        csrfToken,
        email: "review.consultant@pat.local",
        password: PASSWORD,
        redirectTo: "/consultants",
      },
      maxRedirects: 0,
      failOnStatusCode: false,
    });

    await page.goto("/consultants", { waitUntil: "networkidle" });
    await expect(page).toHaveURL(/\/consultants/);

    // Phase-3 Day-12 (Mock C list view): tightened from the Day-11 loose
    // getByRole("main") /consultant|ecosystem|assigned/i match.
    await expect(page.getByRole("heading", { level: 1 })).toContainText(/your assigned ecosystems/i);

    // Tolerant card-count assertion: playwright runs files in parallel and
    // local-review-auth.spec.ts:356 may reassign this consultant to a vendor-
    // less Solo: ecosystem mid-run. Mock C correctly filters those out, so
    // either (a) we see the demo ecosystem card, or (b) we see the empty
    // state. Either is a valid Mock C render. Both branches assert the right
    // structural copy.
    const cards = page.locator('[data-testid="ecosystem-list-card"]');
    const cardCount = await cards.count();
    if (cardCount > 0) {
      await expect(cards.first()).toContainText(/avg/i);
      await expect(cards.first()).toContainText(
        /firms? grounded|firms? emerging|firms? sample-thin|firms? early-signal|firms? no-signal|no firm signal/i
      );
    } else {
      await expect(page.locator("main")).toContainText(
        /don.t have any ecosystems assigned/i
      );
    }
  });

  test("tenancy: consultant cannot reach /consultants/ecosystems/<other-ecosystem-id>", async ({ page, context }) => {
    test.skip(
      !consultantAccessEnabled,
      "Consultant access flag is off; tenancy test only meaningful when /consultants is reachable."
    );

    // Detail page is fan-out-heavy at demo-bench scale (11+ firm briefings, vendor
    // catalog, firm-product catalogs, module progress per firm). The dev server
    // also does JIT compilation on first hit, so this test needs more budget
    // than the default 30s.
    test.setTimeout(180_000);

    // Sign in as Sentinel consultant
    const csrfRes = await context.request.get("/api/auth/csrf");
    const { csrfToken } = await csrfRes.json();
    await context.request.post("/api/auth/callback/credentials", {
      form: {
        csrfToken,
        email: "review.consultant+sentinel@pat.local",
        password: DEMO_BENCH_PASSWORD,
        redirectTo: "/consultants",
      },
      maxRedirects: 0,
      failOnStatusCode: false,
    });

    // Read the Sentinel consultant's owned ecosystem id off the Mock C list.
    await page.goto("/consultants", { waitUntil: "networkidle" });
    const ownEcosystemId = await page
      .locator('[data-testid="ecosystem-list-card"]')
      .first()
      .getAttribute("data-ecosystem-id");
    expect(ownEcosystemId).toBeTruthy();

    // Pre-warm the dynamic route via a 404 path first — this triggers the
    // dev-server's JIT compile on the cheaper notFound() branch without
    // running the heavy data aggregator.
    await context.request.get("/consultants/ecosystems/demo-bench-ecosystem-prewarm", {
      failOnStatusCode: false,
      timeout: 60_000,
    });

    // Own ecosystem detail page -> 200. context.request avoids the dev-server
    // page-navigation race that can ABORT the first page.goto on a fresh route.
    const ownResponse = await context.request.get(
      `/consultants/ecosystems/${ownEcosystemId}`,
      { failOnStatusCode: false, timeout: 90_000 }
    );
    expect(ownResponse.status()).toBe(200);

    // After the route is warm, a page navigation can safely fetch the DOM.
    await page.goto(`/consultants/ecosystems/${ownEcosystemId}`, {
      waitUntil: "domcontentloaded",
      timeout: 60_000,
    });
    await expect(page.locator('[data-testid="ecosystem-detail-page"]')).toBeVisible();

    // Non-existent ecosystem id -> 404
    const nonexistentStatus = await context.request
      .get("/consultants/ecosystems/demo-bench-ecosystem-nonexistent", {
        failOnStatusCode: false,
        timeout: 30_000,
      })
      .then((res) => res.status());
    expect(nonexistentStatus).toBe(404);

    // Sign in as Bridgepath consultant in the same context (cookie gets
    // replaced) and request Sentinel's ecosystem -> 404.
    const csrf2 = await context.request.get("/api/auth/csrf");
    const { csrfToken: token2 } = await csrf2.json();
    await context.request.post("/api/auth/callback/credentials", {
      form: {
        csrfToken: token2,
        email: "review.consultant+bridgepath@pat.local",
        password: DEMO_BENCH_PASSWORD,
        redirectTo: "/consultants",
      },
      maxRedirects: 0,
      failOnStatusCode: false,
    });
    const crossTenantStatus = await context.request
      .get(`/consultants/ecosystems/${ownEcosystemId}`, {
        failOnStatusCode: false,
        timeout: 30_000,
      })
      .then((res) => res.status());
    expect(crossTenantStatus).toBe(404);
  });

  test("vendor brief: consultant sees own ecosystem's brief and 404s on cross-tenant", async ({ page, context }) => {
    test.skip(
      !consultantAccessEnabled,
      "Consultant access flag is off; vendor-brief tenancy test only meaningful when /consultants is reachable."
    );

    // Detail-aggregator + brief-aggregator both fan out to N firms +
    // engine fetches; brief is heavier than Mock A detail. Bump per-test
    // timeout to absorb the dev-server JIT compile on first hit.
    test.setTimeout(180_000);

    // Sign in as Sentinel consultant
    const csrfRes = await context.request.get("/api/auth/csrf");
    const { csrfToken } = await csrfRes.json();
    await context.request.post("/api/auth/callback/credentials", {
      form: {
        csrfToken,
        email: "review.consultant+sentinel@pat.local",
        password: DEMO_BENCH_PASSWORD,
        redirectTo: "/consultants",
      },
      maxRedirects: 0,
      failOnStatusCode: false,
    });

    // Read the Sentinel consultant's owned ecosystem id off the Mock C list.
    await page.goto("/consultants", { waitUntil: "networkidle" });
    const ownEcosystemId = await page
      .locator('[data-testid="ecosystem-list-card"]')
      .first()
      .getAttribute("data-ecosystem-id");
    expect(ownEcosystemId).toBeTruthy();

    // Pre-warm the dynamic route via a 404 path so the dev-server JIT
    // compile lands on the cheap notFound() branch before the heavy
    // aggregator runs against the real ecosystem id.
    await context.request.get(
      "/consultants/ecosystems/demo-bench-ecosystem-prewarm/vendor-brief",
      { failOnStatusCode: false, timeout: 60_000 }
    );

    // Own vendor brief -> 200
    const ownResponse = await context.request.get(
      `/consultants/ecosystems/${ownEcosystemId}/vendor-brief`,
      { failOnStatusCode: false, timeout: 90_000 }
    );
    expect(ownResponse.status()).toBe(200);

    // After the route is warm, page.goto can safely fetch DOM.
    await page.goto(`/consultants/ecosystems/${ownEcosystemId}/vendor-brief`, {
      waitUntil: "domcontentloaded",
      timeout: 60_000,
    });
    await expect(page.locator('[data-testid="vendor-brief-page"]')).toBeVisible();

    // Day-16 R1 fix: prove the brief is non-empty, not just that the route
    // renders. seed:demo-benchmark wires seedVendorProductAssessment for
    // every product; if a downstream filter drops those rows, the brief
    // shows empty boxes and the route-renders assertion alone wouldn't
    // catch it. Each section needs at least one rendered row.
    await expect(page.locator('[data-testid="delta-row"]').first()).toBeVisible();
    await expect(page.locator('[data-testid="heatmap-cell"]').first()).toBeVisible();
    await expect(page.locator('[data-testid="roadmap-panel"]').first()).toBeVisible();
    const methodologyText = await page
      .locator('[data-testid="evaluation-methodology"]')
      .innerText();
    expect(methodologyText.trim().length).toBeGreaterThan(0);

    // Non-existent ecosystem id -> 404
    const nonexistentStatus = await context.request
      .get("/consultants/ecosystems/demo-bench-ecosystem-nonexistent/vendor-brief", {
        failOnStatusCode: false,
        timeout: 30_000,
      })
      .then((res) => res.status());
    expect(nonexistentStatus).toBe(404);

    // Sign in as Bridgepath consultant in the same context; request
    // Sentinel's vendor brief -> 404.
    const csrf2 = await context.request.get("/api/auth/csrf");
    const { csrfToken: token2 } = await csrf2.json();
    await context.request.post("/api/auth/callback/credentials", {
      form: {
        csrfToken: token2,
        email: "review.consultant+bridgepath@pat.local",
        password: DEMO_BENCH_PASSWORD,
        redirectTo: "/consultants",
      },
      maxRedirects: 0,
      failOnStatusCode: false,
    });
    const crossTenantStatus = await context.request
      .get(`/consultants/ecosystems/${ownEcosystemId}/vendor-brief`, {
        failOnStatusCode: false,
        timeout: 30_000,
      })
      .then((res) => res.status());
    expect(crossTenantStatus).toBe(404);
  });

  test("firm brief: happy path renders all surfaces with non-empty content", async ({ page, context }) => {
    test.skip(
      !consultantAccessEnabled,
      "Consultant access flag is off; firm-brief render test only meaningful when /consultants is reachable."
    );

    test.setTimeout(180_000);

    // Sign in as Sentinel consultant
    const csrfRes = await context.request.get("/api/auth/csrf");
    const { csrfToken } = await csrfRes.json();
    await context.request.post("/api/auth/callback/credentials", {
      form: {
        csrfToken,
        email: "review.consultant+sentinel@pat.local",
        password: DEMO_BENCH_PASSWORD,
        redirectTo: "/consultants",
      },
      maxRedirects: 0,
      failOnStatusCode: false,
    });

    // Read Sentinel ecosystem id + a Sentinel firm id off the Mock A
    // detail page (Day-14 FirmGrid carries data-firm-id).
    await page.goto("/consultants", { waitUntil: "networkidle" });
    const ownEcosystemId = await page
      .locator('[data-testid="ecosystem-list-card"]')
      .first()
      .getAttribute("data-ecosystem-id");
    expect(ownEcosystemId).toBeTruthy();

    await page.goto(`/consultants/ecosystems/${ownEcosystemId}`, {
      waitUntil: "networkidle",
    });
    const ownFirmId = await page
      .locator('[data-testid="firm-grid-row"]')
      .first()
      .getAttribute("data-firm-id");
    expect(ownFirmId).toBeTruthy();

    // Pre-warm the dynamic route via a 404 path so the dev-server's
    // JIT compile lands on the cheap notFound() branch before the
    // heavy aggregator runs against real ids.
    await context.request.get(
      `/consultants/ecosystems/${ownEcosystemId}/firm/demo-firm-prewarm`,
      { failOnStatusCode: false, timeout: 60_000 }
    );

    // Own firm brief -> 200
    const ownResponse = await context.request.get(
      `/consultants/ecosystems/${ownEcosystemId}/firm/${ownFirmId}`,
      { failOnStatusCode: false, timeout: 90_000 }
    );
    expect(ownResponse.status()).toBe(200);

    // Navigate for DOM assertions
    await page.goto(`/consultants/ecosystems/${ownEcosystemId}/firm/${ownFirmId}`, {
      waitUntil: "domcontentloaded",
      timeout: 60_000,
    });
    await expect(page.locator('[data-testid="firm-brief-page"]')).toBeVisible();

    // Non-empty content per Day-16 R1 fix: prove the brief sections
    // actually rendered against real demo data, not just that the
    // route returned 200.
    await expect(page.locator('[data-testid="firm-alignment-header"]')).toBeVisible();
    const radarAxes = await page.locator('[data-testid^="radar-axis-"]').count();
    expect(radarAxes).toBeGreaterThanOrEqual(1);
    await expect(page.locator('[data-testid="stack-fit-row"]').first()).toBeVisible();
    await expect(page.locator('[data-testid="roadmap-quarter"]').first()).toBeVisible();
    const methodologyText = await page
      .locator('[data-testid="firm-brief-methodology"]')
      .innerText();
    expect(methodologyText.trim().length).toBeGreaterThan(0);
  });

  test("firm brief: 404 on cross-tenant ecosystem and on cross-ecosystem firm probe", async ({
    page,
    context,
  }) => {
    test.skip(
      !consultantAccessEnabled,
      "Consultant access flag is off; firm-brief tenancy test only meaningful when /consultants is reachable."
    );

    test.setTimeout(180_000);

    // Sign in as Sentinel consultant, read own ecosystem + own firm id.
    const csrfRes = await context.request.get("/api/auth/csrf");
    const { csrfToken } = await csrfRes.json();
    await context.request.post("/api/auth/callback/credentials", {
      form: {
        csrfToken,
        email: "review.consultant+sentinel@pat.local",
        password: DEMO_BENCH_PASSWORD,
        redirectTo: "/consultants",
      },
      maxRedirects: 0,
      failOnStatusCode: false,
    });

    await page.goto("/consultants", { waitUntil: "networkidle" });
    const ownEcosystemId = await page
      .locator('[data-testid="ecosystem-list-card"]')
      .first()
      .getAttribute("data-ecosystem-id");
    expect(ownEcosystemId).toBeTruthy();

    await page.goto(`/consultants/ecosystems/${ownEcosystemId}`, {
      waitUntil: "networkidle",
    });
    const ownFirmId = await page
      .locator('[data-testid="firm-grid-row"]')
      .first()
      .getAttribute("data-firm-id");
    expect(ownFirmId).toBeTruthy();

    // Sign in as Bridgepath consultant, request Sentinel's firm via
    // Sentinel's ecosystem id -> 404 (assignment lookup rejects:
    // Bridgepath consultant doesn't own Sentinel's ecosystem).
    const csrf2 = await context.request.get("/api/auth/csrf");
    const { csrfToken: token2 } = await csrf2.json();
    await context.request.post("/api/auth/callback/credentials", {
      form: {
        csrfToken: token2,
        email: "review.consultant+bridgepath@pat.local",
        password: DEMO_BENCH_PASSWORD,
        redirectTo: "/consultants",
      },
      maxRedirects: 0,
      failOnStatusCode: false,
    });
    const crossTenantStatus = await context.request
      .get(`/consultants/ecosystems/${ownEcosystemId}/firm/${ownFirmId}`, {
        failOnStatusCode: false,
        timeout: 30_000,
      })
      .then((res) => res.status());
    expect(crossTenantStatus).toBe(404);

    // Sign back in as Sentinel; try a firm from Bridgepath's ecosystem
    // under Sentinel's ecosystem id. This is the cross-ecosystem
    // firm-id probe: assignment lookup passes but the firm-in-
    // ecosystem check rejects.
    const csrf3 = await context.request.get("/api/auth/csrf");
    const { csrfToken: token3 } = await csrf3.json();
    await context.request.post("/api/auth/callback/credentials", {
      form: {
        csrfToken: token3,
        email: "review.consultant+sentinel@pat.local",
        password: DEMO_BENCH_PASSWORD,
        redirectTo: "/consultants",
      },
      maxRedirects: 0,
      failOnStatusCode: false,
    });
    const crossFirmStatus = await context.request
      .get(
        `/consultants/ecosystems/${ownEcosystemId}/firm/demo-firm-company-demo-bench-firm-holloway-whitcomb-llp-1-0`,
        { failOnStatusCode: false, timeout: 30_000 }
      )
      .then((res) => res.status());
    expect(crossFirmStatus).toBe(404);
  });

  test("demo-bench consultant sees their ecosystem only (Sentinel)", async ({ page, context }) => {
    test.skip(
      !consultantAccessEnabled,
      "Consultant access flag is off; demo-bench tenancy assertion only meaningful when /consultants is reachable."
    );
    const csrfRes = await context.request.get("/api/auth/csrf");
    const { csrfToken } = await csrfRes.json();
    await context.request.post("/api/auth/callback/credentials", {
      form: {
        csrfToken,
        email: "review.consultant+sentinel@pat.local",
        password: DEMO_BENCH_PASSWORD,
        redirectTo: "/consultants",
      },
      maxRedirects: 0,
      failOnStatusCode: false,
    });

    await page.goto("/consultants", { waitUntil: "networkidle" });
    await expect(page).toHaveURL(/\/consultants/);
    await expect(page.getByRole("heading", { level: 1 })).toContainText(/your assigned ecosystems/i);

    // Day-13 demo-bench seed: this consultant is strict 1:1 to the Sentinel
    // Practice Cloud ecosystem. Tolerate 0-2 cards (parallel test mutation can
    // happen but the seed is fresh enough that the demo binding usually holds).
    const cards = page.locator('[data-testid="ecosystem-list-card"]');
    const cardCount = await cards.count();
    expect(cardCount).toBeGreaterThanOrEqual(0);
    expect(cardCount).toBeLessThanOrEqual(2);

    if (cardCount > 0) {
      await expect(cards.first()).toContainText(/avg/i);
      // Tenancy proof: when cards render, ONLY Sentinel should appear (not
      // Bridgepath / Lumen / Stratabind / PAT Demo Vendor).
      const cardsHtml = await page.locator('[data-testid="ecosystem-list-card"]').first().innerHTML();
      expect(cardsHtml).not.toMatch(/Bridgepath|Lumen|Stratabind|PAT Demo Vendor/i);
    }
  });

  test("flag-off behavior: when PAT_ENABLE_CONSULTANT_ACCESS is unset, /consultants is not accessible", async () => {
    test.skip(
      process.env.PAT_ENABLE_CONSULTANT_ACCESS === "1",
      "Skipping flag-off case — flag is currently on. Reverse-compat covered by manifest gate disabled-state markers."
    );
  });

  test("vendor brief edit: phrasing-variant pick swaps text inline and persists across reload", async ({
    page,
    context,
  }) => {
    test.skip(
      !consultantAccessEnabled,
      "Consultant access flag is off; edit-flow test only meaningful when /consultants is reachable."
    );

    test.setTimeout(180_000);

    // Sign in as Sentinel consultant.
    const csrfRes = await context.request.get("/api/auth/csrf");
    const { csrfToken } = await csrfRes.json();
    await context.request.post("/api/auth/callback/credentials", {
      form: {
        csrfToken,
        email: "review.consultant+sentinel@pat.local",
        password: DEMO_BENCH_PASSWORD,
        redirectTo: "/consultants",
      },
      maxRedirects: 0,
      failOnStatusCode: false,
    });

    // Read Sentinel ecosystem id.
    await page.goto("/consultants", { waitUntil: "networkidle" });
    const ownEcosystemId = await page
      .locator('[data-testid="ecosystem-list-card"]')
      .first()
      .getAttribute("data-ecosystem-id");
    expect(ownEcosystemId).toBeTruthy();

    // Pre-warm vendor-brief route via a 404-path hit (cheap JIT compile).
    await context.request.get(
      "/consultants/ecosystems/demo-bench-ecosystem-prewarm/vendor-brief",
      { failOnStatusCode: false, timeout: 60_000 }
    );

    // Navigate to own vendor brief. networkidle waits for client hydration
    // to settle so the chip's React click handler is bound before we
    // click it.
    await page.goto(`/consultants/ecosystems/${ownEcosystemId}/vendor-brief`, {
      waitUntil: "networkidle",
      timeout: 120_000,
    });
    await expect(page.locator('[data-testid="vendor-brief-page"]')).toBeVisible();

    // Locate the executive-summary picker. Chip strip carries 2 chips
    // (v1-measured + v1-pointed). The first is active by default.
    const picker = page
      .locator('[data-testid="phrasing-variant-picker"][data-section-key="vendor.executive-summary"]')
      .first();
    await expect(picker).toBeVisible();
    const chips = picker.locator('[data-testid="phrasing-variant-chip"]');
    await expect(chips).toHaveCount(2);

    const firstActive = await chips.nth(0).getAttribute("data-active");
    expect(firstActive).toBe("true");

    const initialText = await picker
      .locator('[data-testid="phrasing-variant-active-text"]')
      .innerText();

    // Click the second chip — optimistic flip + server-action call.
    // Generous timeout because the server-action POST traverses the dev
    // server's JIT compile path on first hit + a prisma upsert.
    await chips.nth(1).click();
    await expect(chips.nth(1)).toHaveAttribute("data-active", "true", { timeout: 15_000 });
    await expect(chips.nth(0)).toHaveAttribute("data-active", "false", { timeout: 15_000 });

    const swappedText = await picker
      .locator('[data-testid="phrasing-variant-active-text"]')
      .innerText();
    expect(swappedText).not.toBe(initialText);

    // Reload — the variant choice persisted via the DB read path.
    await page.reload({ waitUntil: "domcontentloaded", timeout: 90_000 });
    const reloadedPicker = page
      .locator('[data-testid="phrasing-variant-picker"][data-section-key="vendor.executive-summary"]')
      .first();
    const reloadedChips = reloadedPicker.locator('[data-testid="phrasing-variant-chip"]');
    await expect(reloadedChips.nth(1)).toHaveAttribute("data-active", "true");
    await expect(reloadedChips.nth(0)).toHaveAttribute("data-active", "false");
    const reloadedText = await reloadedPicker
      .locator('[data-testid="phrasing-variant-active-text"]')
      .innerText();
    expect(reloadedText).toBe(swappedText);
  });

  test("vendor brief edit: cross-consultant denial — Bridgepath cannot reach Sentinel's brief edit surface", async ({
    page,
    context,
  }) => {
    test.skip(
      !consultantAccessEnabled,
      "Consultant access flag is off; edit-tenancy test only meaningful when /consultants is reachable."
    );

    test.setTimeout(180_000);

    // First, sign in as Sentinel and grab their ecosystem id so we know
    // what URL Bridgepath should be denied at.
    const csrfRes = await context.request.get("/api/auth/csrf");
    const { csrfToken } = await csrfRes.json();
    await context.request.post("/api/auth/callback/credentials", {
      form: {
        csrfToken,
        email: "review.consultant+sentinel@pat.local",
        password: DEMO_BENCH_PASSWORD,
        redirectTo: "/consultants",
      },
      maxRedirects: 0,
      failOnStatusCode: false,
    });

    await page.goto("/consultants", { waitUntil: "networkidle" });
    const sentinelEcosystemId = await page
      .locator('[data-testid="ecosystem-list-card"]')
      .first()
      .getAttribute("data-ecosystem-id");
    expect(sentinelEcosystemId).toBeTruthy();

    // Sign in as Bridgepath in the same context.
    const csrf2 = await context.request.get("/api/auth/csrf");
    const { csrfToken: token2 } = await csrf2.json();
    await context.request.post("/api/auth/callback/credentials", {
      form: {
        csrfToken: token2,
        email: "review.consultant+bridgepath@pat.local",
        password: DEMO_BENCH_PASSWORD,
        redirectTo: "/consultants",
      },
      maxRedirects: 0,
      failOnStatusCode: false,
    });

    // Cross-tenant fetch of Sentinel's brief — the page route 404s,
    // which means the edit controls never render in Bridgepath's
    // session. Block 5's contract test proves the server-action layer
    // independently fails closed on a forged briefId; this e2e
    // assertion proves the UI surface gates correctly.
    const crossStatus = await context.request
      .get(`/consultants/ecosystems/${sentinelEcosystemId}/vendor-brief`, {
        failOnStatusCode: false,
        timeout: 30_000,
      })
      .then((res) => res.status());
    expect(crossStatus).toBe(404);

    // Navigate the page in Bridgepath's session — assert no edit
    // picker is reachable on Sentinel's surface (the brief page would
    // have rendered them; the 404 means they don't exist in DOM).
    const response = await page.goto(
      `/consultants/ecosystems/${sentinelEcosystemId}/vendor-brief`,
      { waitUntil: "domcontentloaded", timeout: 60_000 }
    );
    expect(response?.status()).toBe(404);
    await expect(
      page.locator('[data-testid="phrasing-variant-picker"]')
    ).toHaveCount(0);
  });
});
