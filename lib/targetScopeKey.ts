type TargetScopeKeyInput = {
  companyId: string;
  productId?: string | null;
};

function normalizeRequiredPart(value: string, fieldName: string): string {
  const normalized = typeof value === "string" ? value.trim() : "";
  if (!normalized) {
    throw new Error(`${fieldName} is required`);
  }

  return normalized;
}

function normalizeOptionalPart(value?: string | null): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

export function buildTargetScopeKey(input: TargetScopeKeyInput): string {
  const companyId = normalizeRequiredPart(input.companyId, "companyId");
  const productId = normalizeOptionalPart(input.productId);

  if (!productId) {
    return `company:${companyId}`;
  }

  return `company:${companyId}:product:${productId}`;
}
