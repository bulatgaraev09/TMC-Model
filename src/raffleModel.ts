// src/raffleModel.ts

export type TrafficLight = "GREEN" | "AMBER" | "RED";

export interface RaffleConfig {
  id: string;
  name: string;
  startDate: string; // ISO date string
  endDate: string;   // ISO date string

  targetGMV: number;
  averageTicketPrice: number;

  marketingBudgetTotal: number;
  budgetSplitNew: number; // 0..1
  budgetSplitRet: number; // 0..1

  // Baselines from history (e.g. November)
  baselineLTVNew: number;
  targetLTVToCAC: number;                // desired LTV/CAC ratio
  baselineCRR20d: number;                // customer retention rate over 20 days
  baselineGMVPerRetainedUser20d: number; // GMV per retained user over 20 days
  baseExistingCustomers: number;         // size of existing user base

  expectedAOVNew: number;
  expectedAOVRet: number;

  // Optional baseline CPA (per purchase) for acquisition
  baselineCPANew?: number;
}

export interface ForecastOutput {
  durationDays: number;

  targetCACNew: number;
  expectedNewCustomers: number;
  expectedRetainedCustomers: number;

  gmvNewWindow: number;
  gmvRetentionWindow: number;
  gmvTotalForecast: number;
}

export interface SnapshotMetrics {
  dayNumber: number;          // 1..duration
  gmvToDate: number;          // revenue so far
  spendToDate: number;        // media spend so far
  newCustomersToDate: number;
  retainedCustomersToDate: number;
  ordersToDate: number;       // purchases so far
  acquisitionSpendToDate?: number; // if not provided, use spendToDate
}

export interface HealthStatus {
  dayNumber: number;

  gmvProjected: number;
  gmvProgress: number;

  spendProjected: number;
  spendUtilisation: number;

  newCustomersProjected: number;
  newUserProgress: number;

  retainedCustomersProjected: number;
  retainedProgress: number;

  actualCPA: number | null;
  actualCACNew: number | null;

  gmvStatus: TrafficLight;
  cpaStatus: TrafficLight;
  cacStatus: TrafficLight;
  retentionStatus: TrafficLight;
  overallStatus: TrafficLight;

  notes: string[];
}

export interface EvaluationThresholds {
  gmvGreen: number;              // e.g. 0.95
  gmvAmber: number;              // e.g. 0.8
  retentionGreen: number;        // e.g. 0.95
  retentionAmber: number;        // e.g. 0.8
  cacGreenOverTarget: number;    // e.g. 1.0
  cacAmberOverTarget: number;    // e.g. 1.2
  cpaGreenOverTarget: number;    // e.g. 1.0
  cpaAmberOverTarget: number;    // e.g. 1.2
}

export const DEFAULT_THRESHOLDS: EvaluationThresholds = {
  gmvGreen: 0.95,
  gmvAmber: 0.8,
  retentionGreen: 0.95,
  retentionAmber: 0.8,
  cacGreenOverTarget: 1.0,
  cacAmberOverTarget: 1.2,
  cpaGreenOverTarget: 1.0,
  cpaAmberOverTarget: 1.2,
};

export function computeDurationDays(startDate: string, endDate: string): number {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const msPerDay = 1000 * 60 * 60 * 24;

  const diff = end.getTime() - start.getTime();
  return Math.floor(diff / msPerDay) + 1; // inclusive
}

export function forecastRaffle(config: RaffleConfig): ForecastOutput {
  const durationDays = computeDurationDays(config.startDate, config.endDate);

  // 1) New users based on budget + CAC target (from LTV and target ratio)
  const budgetNew = config.marketingBudgetTotal * config.budgetSplitNew;
  const targetCACNew = config.baselineLTVNew / config.targetLTVToCAC;

  const expectedNewCustomers = targetCACNew > 0
    ? budgetNew / targetCACNew
    : 0;

  const ordersPerNewCustomerWindow = 1; // from Nov: ~1 order per new over 20d
  const gmvNewWindow =
    expectedNewCustomers * ordersPerNewCustomerWindow * config.expectedAOVNew;

  // 2) Retention based on CRR and GMV per retained user scaled by duration
  let CRRWindow = config.baselineCRR20d * (durationDays / 20);
  // Cap CRR to avoid >100% insanity
  CRRWindow = Math.min(CRRWindow, 0.7);

  const expectedRetainedCustomers =
    config.baseExistingCustomers * CRRWindow;

  const gmvPerRetainedWindow =
    config.baselineGMVPerRetainedUser20d * (durationDays / 20);

  const gmvRetentionWindow =
    expectedRetainedCustomers * gmvPerRetainedWindow;

  const gmvTotalForecast = gmvNewWindow + gmvRetentionWindow;

  return {
    durationDays,
    targetCACNew,
    expectedNewCustomers,
    expectedRetainedCustomers,
    gmvNewWindow,
    gmvRetentionWindow,
    gmvTotalForecast,
  };
}

function statusFromProgress(
  progress: number,
  greenThreshold: number,
  amberThreshold: number
): TrafficLight {
  if (!isFinite(progress)) return "RED";
  if (progress >= greenThreshold) return "GREEN";
  if (progress >= amberThreshold) return "AMBER";
  return "RED";
}

function statusFromOverrun(
  actual: number | null,
  target: number,
  greenOver: number,
  amberOver: number
): TrafficLight {
  if (actual == null || !isFinite(actual) || target <= 0) return "RED";
  const ratio = actual / target;
  if (ratio <= greenOver) return "GREEN";
  if (ratio <= amberOver) return "AMBER";
  return "RED";
}

export function evaluateHealth(
  config: RaffleConfig,
  forecast: ForecastOutput,
  snapshot: SnapshotMetrics,
  thresholds: EvaluationThresholds = DEFAULT_THRESHOLDS
): HealthStatus {
  const { durationDays, targetCACNew, expectedNewCustomers, expectedRetainedCustomers } = forecast;
  const k = snapshot.dayNumber;

  if (k <= 0 || k > durationDays) {
    throw new Error(`dayNumber ${k} out of range 1..${durationDays}`);
  }

  const multiplier = durationDays / k;

  const gmvProjected = snapshot.gmvToDate * multiplier;
  const spendProjected = snapshot.spendToDate * multiplier;
  const newCustomersProjected = snapshot.newCustomersToDate * multiplier;
  const retainedCustomersProjected = snapshot.retainedCustomersToDate * multiplier;

  const gmvProgress = forecast.gmvTotalForecast > 0
    ? gmvProjected / forecast.gmvTotalForecast
    : 0;

  const newUserProgress = expectedNewCustomers > 0
    ? newCustomersProjected / expectedNewCustomers
    : 0;

  const retainedProgress = expectedRetainedCustomers > 0
    ? retainedCustomersProjected / expectedRetainedCustomers
    : 0;

  const spendUtilisation = config.marketingBudgetTotal > 0
    ? spendProjected / config.marketingBudgetTotal
    : 0;

  const actualCPA =
    snapshot.ordersToDate > 0
      ? snapshot.spendToDate / snapshot.ordersToDate
      : null;

  const acquisitionSpend =
    snapshot.acquisitionSpendToDate ?? snapshot.spendToDate;

  const actualCACNew =
    snapshot.newCustomersToDate > 0
      ? acquisitionSpend / snapshot.newCustomersToDate
      : null;

  const gmvStatus = statusFromProgress(
    gmvProgress,
    thresholds.gmvGreen,
    thresholds.gmvAmber
  );

  const retentionStatus = statusFromProgress(
    retainedProgress,
    thresholds.retentionGreen,
    thresholds.retentionAmber
  );

  const cpaStatus = config.baselineCPANew
    ? statusFromOverrun(
        actualCPA,
        config.baselineCPANew,
        thresholds.cpaGreenOverTarget,
        thresholds.cpaAmberOverTarget
      )
    : "AMBER";

  const cacStatus = statusFromOverrun(
    actualCACNew,
    targetCACNew,
    thresholds.cacGreenOverTarget,
    thresholds.cacAmberOverTarget
  );

  const statuses = [gmvStatus, cpaStatus, cacStatus];
  const overallStatus: TrafficLight =
    statuses.includes("RED")
      ? "RED"
      : statuses.includes("AMBER")
      ? "AMBER"
      : "GREEN";

  const notes: string[] = [];

  if (gmvStatus === "RED") {
    notes.push(
      "GMV is significantly behind target at current run-rate. Consider pushing higher bundles/upsells and reallocating spend into highest-ROAS campaigns."
    );
  } else if (gmvStatus === "AMBER") {
    notes.push(
      "GMV is slightly behind target. Small improvements in CVR/AOV or incremental budget may close the gap."
    );
  }

  if (cpaStatus === "RED") {
    notes.push(
      "CPA is materially above target. Kill underperforming ad sets, refine targeting, or adjust bids."
    );
  }

  if (cacStatus === "RED") {
    notes.push(
      "CAC is above the level required for target LTV/CAC. Revisit acquisition channels or reduce bids to protect unit economics."
    );
  }

  if (retentionStatus === "RED") {
    notes.push(
      "Retention contribution is behind forecast. Increase CRM intensity (email/SMS, site prompts) towards existing customers."
    );
  }

  return {
    dayNumber: k,
    gmvProjected,
    gmvProgress,
    spendProjected,
    spendUtilisation,
    newCustomersProjected,
    newUserProgress,
    retainedCustomersProjected,
    retainedProgress,
    actualCPA,
    actualCACNew,
    gmvStatus,
    cpaStatus,
    cacStatus,
    retentionStatus,
    overallStatus,
    notes,
  };
}
