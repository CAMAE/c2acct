import { DEFAULT_VERTICAL_ID } from "./context";
import { accountingFirmModules, getPrimedFirmModules, primeVerticalFirmModules, resolveFirmModules, type FirmModulesContent } from "./firmModules";
import { isVerticalPacksEnabled, type VerticalEnv } from "./flag";
import { ACCOUNTING_LEXICON, getPrimedLexicon, primeVerticalLexicon, type VerticalLexicon } from "./lexicon";
import { loadVerticalPack } from "./loader";
import { loadPackProductUtilityRegistry } from "./questionBankPackLoader";
import {
  ACCOUNTING_PRODUCT_UTILITY_REGISTRY,
  getProductUtilityRegistry,
  listRegisteredVersions,
  type ProductUtilityRegistryBundle,
} from "./questionBankRegistry";
import { resolveVerticalForCompany, type VerticalSessionDeps } from "./session";

/**
 * The request/job boundary for a TENANT's vertical (legal-load, R64; audit
 * section 12 items 1, 6 and the readiness audit's resolution order).
 *
 * Every per-vertical value a surface needs — the lexicon, the firm module words,
 * the product-utility bank — is resolved here once from `Company.verticalId` and
 * handed down as plain values. Nothing below this boundary resolves a vertical
 * on its own, and no client component ever does.
 *
 * Flag off this returns {@link ACCOUNTING_COMPANY_CONTEXT} with ZERO reads: no
 * session, no company row, no filesystem. That is the byte-identity guarantee,
 * and it is testable because the deps are injectable.
 *
 * Flag on, the company's vertical is read once (resolveVerticalForCompany), the
 * pack is loaded once per process (priming is idempotent), and the values travel.
 * An accounting tenant gets the in-code constants, which are its truth.
 */
export type VerticalCompanyContext = Readonly<{
  verticalId: string;
  lexicon: VerticalLexicon;
  firmModules: FirmModulesContent;
  /** Null when the pack declares no product-utility bank (the synthetic fixture); see {@link requireRegistry}. */
  registry: ProductUtilityRegistryBundle | null;
}>;

let accountingContext: VerticalCompanyContext | null = null;
/** The flag-off context: every value is the in-code accounting constant, built once, no read. */
export function ACCOUNTING_COMPANY_CONTEXT_(): VerticalCompanyContext {
  return (accountingContext ??= Object.freeze({
    verticalId: DEFAULT_VERTICAL_ID,
    lexicon: ACCOUNTING_LEXICON,
    firmModules: accountingFirmModules(),
    registry: ACCOUNTING_PRODUCT_UTILITY_REGISTRY,
  }));
}
export { ACCOUNTING_COMPANY_CONTEXT_ as accountingCompanyContext };

export type VerticalContextDeps = VerticalSessionDeps & { env?: VerticalEnv };

/** Resolve a named vertical's context (operator/job form; flag-on only reaches the pack). */
export async function resolveVerticalContext(verticalId: string, env: VerticalEnv = process.env): Promise<VerticalCompanyContext> {
  if (!isVerticalPacksEnabled(env) || verticalId === DEFAULT_VERTICAL_ID) {
    return ACCOUNTING_COMPANY_CONTEXT_();
  }
  const pack = await loadVerticalPack(verticalId);
  const lexicon = getPrimedLexicon(verticalId) ?? primeVerticalLexicon(verticalId, pack.lexicon);
  // The in-code mirror serves first (filesystem-free readers depend on it); a pack
  // that ships a firmModules block without a mirror is primed from the block.
  const firmModules =
    getPrimedFirmModules(verticalId) ??
    (pack.firmModules ? primeVerticalFirmModules(verticalId, pack.firmModules) : resolveFirmModules({ verticalId, env }));
  let registry: ProductUtilityRegistryBundle | null = null;
  if (pack.questionBank.utilityRegistry) {
    const versions = listRegisteredVersions(verticalId);
    registry =
      (versions.length > 0 ? getProductUtilityRegistry(verticalId, versions[versions.length - 1]!) : null) ??
      (await loadPackProductUtilityRegistry(verticalId));
  }
  return Object.freeze({ verticalId, lexicon, firmModules, registry });
}

/** The tenant form: `Company.verticalId` for the named company, then {@link resolveVerticalContext}. */
export async function resolveVerticalContextForCompany(
  companyId: string | null | undefined,
  deps: VerticalContextDeps = {}
): Promise<VerticalCompanyContext> {
  const env = deps.env ?? process.env;
  if (!isVerticalPacksEnabled(env)) {
    return ACCOUNTING_COMPANY_CONTEXT_();
  }
  if (!companyId) {
    return ACCOUNTING_COMPANY_CONTEXT_();
  }
  const verticalId = await resolveVerticalForCompany(companyId, { ...deps, env });
  return resolveVerticalContext(verticalId, env);
}

/** The bank a product assessment builds from; a vertical without one cannot run an assessment. */
export function requireRegistry(context: VerticalCompanyContext): ProductUtilityRegistryBundle {
  if (context.registry) return context.registry;
  throw new Error(
    `Vertical "${context.verticalId}" declares no product-utility bank. ` +
      "A product assessment cannot be built for it; falling back to accounting's bank would " +
      "render one vertical's questions inside another vertical's assessment."
  );
}
