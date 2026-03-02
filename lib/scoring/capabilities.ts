import { clamp01 } from "@/lib/scoring/normalize";
import type { ModuleMeasurement } from "@/lib/scoring/measurement";

export type ModuleCapabilityLink = {
  nodeId: string;
  weight: number;
};

export type CapabilityNodeScore = {
  nodeId: string;
  score: number;
};

type ComputeCapabilityScoresArgs = {
  moduleKey: string;
  measurement: ModuleMeasurement;
  answers: Record<string, unknown>;
  questions: Array<{ key: string; weight?: number }>;
  links: ModuleCapabilityLink[];
};

export function computeCapabilityScores(args: ComputeCapabilityScoresArgs): CapabilityNodeScore[] {
  const { measurement, links } = args;

  if (links.length === 0) {
    return [];
  }

  const positiveWeightSum = links.reduce((sum: number, link: ModuleCapabilityLink) => {
    return sum + Math.max(0, link.weight);
  }, 0);
  for (const link of links) {
    if (!Number.isFinite(link.weight)) {
      return [];
    }
  }

  return links.map((link: ModuleCapabilityLink) => {
    const nodeShare =
      positiveWeightSum > 0 ? Math.max(0, link.weight) / positiveWeightSum : 1 / links.length;
    const score = clamp01(measurement.moduleScoreNormalized * nodeShare);
    return { nodeId: link.nodeId, score };
  });
}
