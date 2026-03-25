import fs from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "crypto";
import type { PrismaClient } from "@prisma/client";
import {
  ProductCapabilityCoverage,
  ProductTaxonomyFit,
  ResearchConfidence,
  ResearchSourceStatus,
  ResearchSourceType,
  TaxonomyBucketKind,
  VendorStatus,
} from "@prisma/client";

export type AccountingTaxonomyArtifact = {
  version: number;
  source: {
    key: string;
    title: string;
    sourceType: keyof typeof ResearchSourceType;
    status: keyof typeof ResearchSourceStatus;
    artifactPath?: string | null;
    notes?: string | null;
  };
  taxonomyBuckets: Array<{
    key: string;
    title: string;
    kind: keyof typeof TaxonomyBucketKind;
    description?: string | null;
    parentKey?: string | null;
  }>;
  bucketCapabilityMappings: Array<{
    bucketKey: string;
    capabilityKey: string;
    coverage: keyof typeof ProductCapabilityCoverage;
    confidence: keyof typeof ResearchConfidence;
    notes?: string | null;
  }>;
  vendors: Array<{
    key: string;
    displayName: string;
    website?: string | null;
    status?: keyof typeof VendorStatus;
    notes?: string | null;
    companyName?: string | null;
  }>;
  products: Array<{
    key: string;
    vendorKey: string;
    name: string;
    slug?: string | null;
    website?: string | null;
    summary?: string | null;
    deploymentModel?: "CLOUD" | "DESKTOP" | "HYBRID" | "MANAGED_SERVICE" | null;
    notes?: string | null;
    taxonomy: Array<{
      bucketKey: string;
      fit: keyof typeof ProductTaxonomyFit;
      confidence: keyof typeof ResearchConfidence;
      notes?: string | null;
    }>;
    capabilities: Array<{
      capabilityKey: string;
      coverage: keyof typeof ProductCapabilityCoverage;
      confidence: keyof typeof ResearchConfidence;
      notes?: string | null;
    }>;
    signals: Array<{
      signalKey: string;
      valueText?: string | null;
      valueNumber?: number | null;
      confidence: keyof typeof ResearchConfidence;
      notes?: string | null;
    }>;
  }>;
  vendorSignals: Array<{
    vendorKey: string;
    signalKey: string;
    valueText?: string | null;
    valueNumber?: number | null;
    confidence: keyof typeof ResearchConfidence;
    notes?: string | null;
  }>;
};

export type ImportAccountingTaxonomyOptions = {
  prisma: PrismaClient;
  artifact: AccountingTaxonomyArtifact;
  apply?: boolean;
  logger?: Pick<Console, "log" | "warn">;
};

export async function loadAccountingTaxonomyArtifact(
  artifactPath: string
): Promise<AccountingTaxonomyArtifact> {
  const absolute = path.resolve(artifactPath);
  const raw = await fs.readFile(absolute, "utf8");
  return JSON.parse(raw) as AccountingTaxonomyArtifact;
}

export async function importAccountingTaxonomy({
  prisma,
  artifact,
  apply = false,
  logger = console,
}: ImportAccountingTaxonomyOptions) {
  const summary = {
    sourceKey: artifact.source.key,
    taxonomyBuckets: artifact.taxonomyBuckets.length,
    bucketCapabilityMappings: artifact.bucketCapabilityMappings.length,
    vendors: artifact.vendors.length,
    products: artifact.products.length,
    vendorSignals: artifact.vendorSignals.length,
    unresolvedCapabilityKeys: [] as string[],
    unresolvedCompanies: [] as string[],
    mode: apply ? "apply" : "dry-run",
  };

  if (!apply) {
    summary.unresolvedCapabilityKeys = [
      ...new Set(artifact.bucketCapabilityMappings.map((mapping) => mapping.capabilityKey)),
    ];
    summary.unresolvedCompanies = artifact.vendors
      .map((vendor) => vendor.companyName ?? null)
      .filter((value): value is string => Boolean(value));

    logger.log("Accounting taxonomy dry run", summary);
    return summary;
  }

  const source = await prisma.researchSource.upsert({
    where: { key: artifact.source.key },
    update: {
      title: artifact.source.title,
      sourceType: ResearchSourceType[artifact.source.sourceType],
      status: ResearchSourceStatus[artifact.source.status],
      artifactPath: artifact.source.artifactPath ?? null,
      notes: artifact.source.notes ?? null,
    },
    create: {
      id: randomUUID(),
      key: artifact.source.key,
      title: artifact.source.title,
      sourceType: ResearchSourceType[artifact.source.sourceType],
      status: ResearchSourceStatus[artifact.source.status],
      artifactPath: artifact.source.artifactPath ?? null,
      notes: artifact.source.notes ?? null,
    },
    select: { id: true },
  });

  for (const bucket of artifact.taxonomyBuckets) {
    await prisma.taxonomyBucket.upsert({
      where: { key: bucket.key },
      update: {
        title: bucket.title,
        description: bucket.description ?? null,
        kind: TaxonomyBucketKind[bucket.kind],
        active: true,
      },
      create: {
        id: randomUUID(),
        key: bucket.key,
        title: bucket.title,
        description: bucket.description ?? null,
        kind: TaxonomyBucketKind[bucket.kind],
      },
    });
  }

  for (const bucket of artifact.taxonomyBuckets) {
    const parentKey = bucket.parentKey ?? null;
    if (!parentKey) continue;

    const parent = await prisma.taxonomyBucket.findUnique({
      where: { key: parentKey },
      select: { id: true },
    });
    const current = await prisma.taxonomyBucket.findUnique({
      where: { key: bucket.key },
      select: { id: true },
    });
    if (!parent || !current) continue;

    await prisma.taxonomyBucket.update({
      where: { id: current.id },
      data: { parentId: parent.id },
    });
  }

  for (const mapping of artifact.bucketCapabilityMappings) {
    const bucket = await prisma.taxonomyBucket.findUnique({
      where: { key: mapping.bucketKey },
      select: { id: true },
    });
    if (!bucket) continue;

    const node = await prisma.capabilityNode.findUnique({
      where: { key: mapping.capabilityKey },
      select: { id: true },
    });
    if (!node) {
      summary.unresolvedCapabilityKeys.push(mapping.capabilityKey);
    }

    await prisma.taxonomyBucketCapability.upsert({
      where: {
        bucketId_capabilityKey: {
          bucketId: bucket.id,
          capabilityKey: mapping.capabilityKey,
        },
      },
      update: {
        nodeId: node?.id ?? null,
        coverage: ProductCapabilityCoverage[mapping.coverage],
        confidence: ResearchConfidence[mapping.confidence],
        sourceId: source.id,
        notes: mapping.notes ?? null,
      },
      create: {
        id: randomUUID(),
        bucketId: bucket.id,
        nodeId: node?.id ?? null,
        capabilityKey: mapping.capabilityKey,
        coverage: ProductCapabilityCoverage[mapping.coverage],
        confidence: ResearchConfidence[mapping.confidence],
        sourceId: source.id,
        notes: mapping.notes ?? null,
      },
    });
  }

  const vendorIds = new Map<string, string>();
  for (const vendor of artifact.vendors) {
    const company = vendor.companyName
      ? await prisma.company.findFirst({
          where: { name: vendor.companyName },
          select: { id: true },
        })
      : null;

    if (vendor.companyName && !company) {
      summary.unresolvedCompanies.push(vendor.companyName);
      logger.warn(`Vendor company binding missing for ${vendor.key}: ${vendor.companyName}`);
    }

    const profile = await prisma.vendorProfile.upsert({
      where: { key: vendor.key },
      update: {
        displayName: vendor.displayName,
        website: vendor.website ?? null,
        status: VendorStatus[vendor.status ?? "ACTIVE"],
        researchStatus: ResearchSourceStatus.REVIEW_REQUIRED,
        notes: vendor.notes ?? null,
        companyId: company?.id ?? null,
      },
      create: {
        id: randomUUID(),
        key: vendor.key,
        displayName: vendor.displayName,
        website: vendor.website ?? null,
        status: VendorStatus[vendor.status ?? "ACTIVE"],
        researchStatus: ResearchSourceStatus.REVIEW_REQUIRED,
        notes: vendor.notes ?? null,
        companyId: company?.id ?? null,
      },
      select: { id: true },
    });

    vendorIds.set(vendor.key, profile.id);
  }

  for (const signal of artifact.vendorSignals) {
    const vendorId = vendorIds.get(signal.vendorKey);
    if (!vendorId) continue;

    await prisma.vendorSignal.upsert({
      where: {
        vendorId_signalKey: {
          vendorId,
          signalKey: signal.signalKey,
        },
      },
      update: {
        valueText: signal.valueText ?? null,
        valueNumber: signal.valueNumber ?? null,
        confidence: ResearchConfidence[signal.confidence],
        sourceId: source.id,
        notes: signal.notes ?? null,
      },
      create: {
        id: randomUUID(),
        vendorId,
        signalKey: signal.signalKey,
        valueText: signal.valueText ?? null,
        valueNumber: signal.valueNumber ?? null,
        confidence: ResearchConfidence[signal.confidence],
        sourceId: source.id,
        notes: signal.notes ?? null,
      },
    });
  }

  for (const product of artifact.products) {
    const vendorId = vendorIds.get(product.vendorKey) ?? null;
    const productRow = await prisma.product.upsert({
      where: { slug: product.slug ?? `${product.vendorKey}-${product.key}` },
      update: {
        vendorId,
        name: product.name,
        slug: product.slug ?? `${product.vendorKey}-${product.key}`,
        website: product.website ?? null,
        summary: product.summary ?? null,
        deploymentModel: product.deploymentModel ?? null,
        active: true,
      },
      create: {
        id: randomUUID(),
        vendorId,
        name: product.name,
        slug: product.slug ?? `${product.vendorKey}-${product.key}`,
        website: product.website ?? null,
        summary: product.summary ?? null,
        deploymentModel: product.deploymentModel ?? null,
        active: true,
        updatedAt: new Date(),
      },
      select: { id: true },
    });

    for (const taxonomy of product.taxonomy) {
      const bucket = await prisma.taxonomyBucket.findUnique({
        where: { key: taxonomy.bucketKey },
        select: { id: true },
      });
      if (!bucket) continue;

      await prisma.productTaxonomyAssignment.upsert({
        where: {
          productId_bucketId: {
            productId: productRow.id,
            bucketId: bucket.id,
          },
        },
        update: {
          fit: ProductTaxonomyFit[taxonomy.fit],
          confidence: ResearchConfidence[taxonomy.confidence],
          sourceId: source.id,
          notes: taxonomy.notes ?? null,
        },
        create: {
          id: randomUUID(),
          productId: productRow.id,
          bucketId: bucket.id,
          fit: ProductTaxonomyFit[taxonomy.fit],
          confidence: ResearchConfidence[taxonomy.confidence],
          sourceId: source.id,
          notes: taxonomy.notes ?? null,
        },
      });
    }

    for (const capability of product.capabilities) {
      const node = await prisma.capabilityNode.findUnique({
        where: { key: capability.capabilityKey },
        select: { id: true },
      });
      if (!node) {
        summary.unresolvedCapabilityKeys.push(capability.capabilityKey);
      }

      await prisma.productCapabilityMap.upsert({
        where: {
          productId_capabilityKey: {
            productId: productRow.id,
            capabilityKey: capability.capabilityKey,
          },
        },
        update: {
          nodeId: node?.id ?? null,
          coverage: ProductCapabilityCoverage[capability.coverage],
          confidence: ResearchConfidence[capability.confidence],
          sourceId: source.id,
          notes: capability.notes ?? null,
        },
        create: {
          id: randomUUID(),
          productId: productRow.id,
          nodeId: node?.id ?? null,
          capabilityKey: capability.capabilityKey,
          coverage: ProductCapabilityCoverage[capability.coverage],
          confidence: ResearchConfidence[capability.confidence],
          sourceId: source.id,
          notes: capability.notes ?? null,
        },
      });
    }

    for (const signal of product.signals) {
      await prisma.productSignal.upsert({
        where: {
          productId_signalKey: {
            productId: productRow.id,
            signalKey: signal.signalKey,
          },
        },
        update: {
          valueText: signal.valueText ?? null,
          valueNumber: signal.valueNumber ?? null,
          confidence: ResearchConfidence[signal.confidence],
          sourceId: source.id,
          notes: signal.notes ?? null,
        },
        create: {
          id: randomUUID(),
          productId: productRow.id,
          signalKey: signal.signalKey,
          valueText: signal.valueText ?? null,
          valueNumber: signal.valueNumber ?? null,
          confidence: ResearchConfidence[signal.confidence],
          sourceId: source.id,
          notes: signal.notes ?? null,
        },
      });
    }
  }

  logger.log("Accounting taxonomy import complete", summary);
  return summary;
}
