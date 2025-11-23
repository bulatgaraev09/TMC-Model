// src/xmlConfig.ts
import fs from "fs";
import { XMLParser } from "fast-xml-parser";
import {
  RaffleConfig,
  EvaluationThresholds,
} from "./raffleModel";

export interface LoadedModel {
  raffles: Map<string, RaffleConfig>;
  thresholds: EvaluationThresholds;
}

export function loadModelFromXml(path: string): LoadedModel {
  const xml = fs.readFileSync(path, "utf-8");
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "",
  });
  const doc = parser.parse(xml);

  const root = doc.raffleHealthModel;
  if (!root) {
    throw new Error("Invalid XML: missing <raffleHealthModel>");
  }

  const baselines = root.baselines;
  const thresholdsRaw = root.thresholds;
  const rafflesNode = root.raffles?.raffle;

  if (!baselines || !thresholdsRaw || !rafflesNode) {
    throw new Error("Invalid XML: missing baselines/thresholds/raffles");
  }

  const newBase = baselines.newCustomers;
  const retBase = baselines.retention;

  const baseConfigFields = {
    baselineLTVNew: parseFloat(newBase.ltv),
    targetLTVToCAC: parseFloat(newBase.targetLtvToCac),
    baselineCRR20d: parseFloat(retBase.crr20d),
    baselineGMVPerRetainedUser20d: parseFloat(retBase.gmvPerRetainedUser20d),
    baseExistingCustomers: parseFloat(retBase.baseExistingCustomers),
  };

  const thresholds: EvaluationThresholds = {
    gmvGreen: parseFloat(thresholdsRaw.gmv.green),
    gmvAmber: parseFloat(thresholdsRaw.gmv.amber),
    retentionGreen: parseFloat(thresholdsRaw.retentionProgress.green),
    retentionAmber: parseFloat(thresholdsRaw.retentionProgress.amber),
    cacGreenOverTarget: parseFloat(thresholdsRaw.cacOverTarget.green),
    cacAmberOverTarget: parseFloat(thresholdsRaw.cacOverTarget.amber),
    cpaGreenOverTarget: parseFloat(thresholdsRaw.cpaOverTarget.green),
    cpaAmberOverTarget: parseFloat(thresholdsRaw.cpaOverTarget.amber),
  };

  const raffleArray = Array.isArray(rafflesNode)
    ? rafflesNode
    : [rafflesNode];

  const raffleMap = new Map<string, RaffleConfig>();

  for (const r of raffleArray) {
    const meta = r.meta;
    const targets = r.targets;
    const budget = r.budget;

    const cfg: RaffleConfig = {
      id: r.id,
      name: meta.name,
      startDate: meta.startDate,
      endDate: meta.endDate,
      targetGMV: parseFloat(targets.targetGmv),
      averageTicketPrice: parseFloat(targets.averageTicketPrice),
      marketingBudgetTotal: parseFloat(budget.total),
      budgetSplitNew: parseFloat(budget.newSplit),
      budgetSplitRet: parseFloat(budget.retSplit),
      expectedAOVNew: parseFloat(targets.expectedAovNew),
      expectedAOVRet: parseFloat(targets.expectedAovRet),
      ...baseConfigFields,
      baselineCPANew: undefined,
    };

    raffleMap.set(cfg.id, cfg);
  }

  return {
    raffles: raffleMap,
    thresholds,
  };
}
