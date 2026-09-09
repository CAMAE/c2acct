/**
 * V3 box 7.1: after the suite, remove every row the specs created so the
 * shared local database (and :3000) never shows a test fixture.
 */
import { removeE2eFixtures } from "../scripts/dev/reset-demo";

export default async function globalTeardown() {
  const removed = await removeE2eFixtures();
  console.log(`[e2e teardown] removed fixtures: products=${removed.products} companies=${removed.companies} users=${removed.users}`);
}
