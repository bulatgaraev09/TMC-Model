// Phase-based campaign tracking and health monitoring

export type PhaseId = "launch" | "mid" | "push" | "final";

export interface PhaseConfig {
  id: PhaseId;
  label: string;     // e.g. "Phase 1 – Launch"
  startDay: number;  // inclusive, 1-based
  endDay: number;    // inclusive
  targetGMV: number; // GMV this phase should deliver
  targetCAC: number; // phase-level CAC target
  expectedAOV: number;
  budget: number;    // media spend allocated to this phase
}

export interface CampaignConfig {
  durationDays: number;
  targetGMV: number;
  totalBudget: number;
  phases: PhaseConfig[];
}

export interface PhaseSnapshot {
  phaseId: PhaseId;
  dayInPhase: number;
  gmvToDate: number;
  spendToDate: number;
  newUsersToDate: number;
  returningUsersToDate: number;
  ordersToDate: number;
}

export type TrafficLight = "GREEN" | "AMBER" | "RED";

export interface PhaseHealth {
  phaseId: PhaseId;
  phaseStatus: TrafficLight;      // health vs phase target
  campaignStatus: TrafficLight;   // health vs overall target
  projectedGMVPhase: number;
  projectedGMVCampaign: number;
  notes: string[];
}

export interface PhasePlan {
  phaseId: PhaseId;
  label: string;
  plannedNewUsers: number;
  plannedOrders: number;
  plannedReturningOrders: number;
  budget: number;
  targetGMV: number;
  targetCAC: number;
  expectedAOV: number;
}

/**
 * Plans a single phase by deriving expected user and order counts from budget and targets.
 * 
 * Formula:
 * - plannedNewUsers = budget / targetCAC
 * - plannedOrders = targetGMV / expectedAOV
 * - plannedReturningOrders = max(0, plannedOrders - plannedNewUsers)
 */
export function planPhase(phase: PhaseConfig): PhasePlan {
  // Calculate how many new users we can acquire with the budget and target CAC
  const plannedNewUsers = phase.budget / phase.targetCAC;
  
  // Calculate total orders needed to hit target GMV at expected AOV
  const plannedOrders = phase.targetGMV / phase.expectedAOV;
  
  // The difference between total orders and new user orders must come from returning users
  // (assuming new users place ~1 order each)
  const plannedReturningOrders = Math.max(0, plannedOrders - plannedNewUsers);
  
  return {
    phaseId: phase.id,
    label: phase.label,
    plannedNewUsers: Math.round(plannedNewUsers),
    plannedOrders: Math.round(plannedOrders),
    plannedReturningOrders: Math.round(plannedReturningOrders),
    budget: phase.budget,
    targetGMV: phase.targetGMV,
    targetCAC: phase.targetCAC,
    expectedAOV: phase.expectedAOV,
  };
}

/**
 * Evaluates the health of a phase and overall campaign based on current snapshot data.
 * 
 * This function projects current performance to the end of the phase and campaign,
 * then compares against targets to assign traffic light statuses (GREEN/AMBER/RED).
 * 
 * @param campaign - Overall campaign configuration with all phases
 * @param snapshot - Current performance metrics for the phase being evaluated
 * @param cumulativeStatsToDate - Cumulative stats across all phases up to current point
 * @returns PhaseHealth object with statuses and recommendations
 */
export function evaluatePhaseHealth(
  campaign: CampaignConfig,
  snapshot: PhaseSnapshot,
  cumulativeStatsToDate: {
    gmvToDate: number;
    spendToDate: number;
    newUsersToDate: number;
    ordersToDate: number;
  }
): PhaseHealth {
  // Find the phase configuration
  const phase = campaign.phases.find((p) => p.id === snapshot.phaseId);
  if (!phase) {
    throw new Error(`Phase ${snapshot.phaseId} not found in campaign`);
  }
  
  // Calculate phase duration and progress factor
  const phaseDuration = phase.endDay - phase.startDay + 1;
  const progressFactor = phaseDuration / snapshot.dayInPhase;
  
  // Project phase metrics to end of phase
  // Formula: if we're X days in and have Y GMV, we'll have Y * (total_days / X) at phase end
  const gmvPhaseProjected = snapshot.gmvToDate * progressFactor;
  const spendPhaseProjected = snapshot.spendToDate * progressFactor;
  const newUsersPhaseProjected = snapshot.newUsersToDate * progressFactor;
  
  // Calculate phase-level KPIs
  const gmvPhaseProgress = gmvPhaseProjected / phase.targetGMV;
  const actualCACPhase = snapshot.spendToDate / Math.max(snapshot.newUsersToDate, 1);
  const actualCPAPhase = snapshot.spendToDate / Math.max(snapshot.ordersToDate, 1);
  
  // Collect phase issues first, then determine status
  const phaseIssues: string[] = [];
  
  // Check GMV performance
  if (gmvPhaseProgress < 0.8) {
    phaseIssues.push("gmv_red");
  } else if (gmvPhaseProgress < 0.95) {
    phaseIssues.push("gmv_amber");
  }
  
  // Check CAC performance
  const cacRatio = actualCACPhase / phase.targetCAC;
  if (cacRatio > 1.2) {
    phaseIssues.push("cac_red");
  } else if (cacRatio > 1.0) {
    phaseIssues.push("cac_amber");
  }
  
  // Determine overall phase status from issues
  let phaseStatus: TrafficLight = "GREEN";
  if (phaseIssues.some(issue => issue.includes("_red"))) {
    phaseStatus = "RED";
  } else if (phaseIssues.some(issue => issue.includes("_amber"))) {
    phaseStatus = "AMBER";
  }
  
  // Project campaign-level performance
  // Calculate how many days are left in the campaign after current phase
  const daysElapsed = phase.startDay - 1 + snapshot.dayInPhase;
  const daysRemaining = campaign.durationDays - daysElapsed;
  
  // Project cumulative performance to end of campaign
  // Using cumulative stats (across all phases so far) to project
  const campaignProgressFactor = campaign.durationDays / daysElapsed;
  const gmvCampaignProjected = cumulativeStatsToDate.gmvToDate * campaignProgressFactor;
  const spendCampaignProjected = cumulativeStatsToDate.spendToDate * campaignProgressFactor;
  const newUsersCampaignProjected = cumulativeStatsToDate.newUsersToDate * campaignProgressFactor;
  
  // Calculate campaign-level KPIs
  const gmvCampaignProgress = gmvCampaignProjected / campaign.targetGMV;
  const actualCACCampaign = cumulativeStatsToDate.spendToDate / Math.max(cumulativeStatsToDate.newUsersToDate, 1);
  
  // Derive campaign-level target CAC (weighted average from phases or use first phase as proxy)
  const campaignTargetCAC = campaign.totalBudget / (campaign.targetGMV / phase.expectedAOV * 0.7); // rough estimate
  
  // Collect campaign issues first, then determine status
  const campaignIssues: string[] = [];
  
  if (gmvCampaignProgress < 0.8) {
    campaignIssues.push("campaign_gmv_red");
  } else if (gmvCampaignProgress < 0.95) {
    campaignIssues.push("campaign_gmv_amber");
  }
  
  const campaignCACRatio = actualCACCampaign / campaignTargetCAC;
  if (campaignCACRatio > 1.2) {
    campaignIssues.push("campaign_cac_red");
  } else if (campaignCACRatio > 1.0) {
    campaignIssues.push("campaign_cac_amber");
  }
  
  // Determine overall campaign status from issues
  let campaignStatus: TrafficLight = "GREEN";
  if (campaignIssues.some(issue => issue.includes("_red"))) {
    campaignStatus = "RED";
  } else if (campaignIssues.some(issue => issue.includes("_amber"))) {
    campaignStatus = "AMBER";
  }
  
  // Generate recommendations based on the issues detected
  const notes = generateRecommendations(
    phaseIssues,
    campaignIssues,
    {
      gmvPhaseProgress,
      cacRatio,
      gmvCampaignProgress,
      campaignCACRatio,
      gmvPhaseProjected,
      phase,
    }
  );
  
  return {
    phaseId: snapshot.phaseId,
    phaseStatus,
    campaignStatus,
    projectedGMVPhase: Math.round(gmvPhaseProjected),
    projectedGMVCampaign: Math.round(gmvCampaignProjected),
    notes,
  };
}

/**
 * Generates actionable recommendations based on detected issues.
 * 
 * Rules:
 * - GMV Phase RED & CAC GREEN → increase AOV (bigger bundles, higher ticket tiers)
 * - GMV Phase RED & CAC RED → cut bad ad sets / refine targeting / adjust bids
 * - Phase GREEN but Campaign AMBER/RED → increase later-phase GMV targets or budgets
 */
function generateRecommendations(
  phaseIssues: string[],
  campaignIssues: string[],
  metrics: {
    gmvPhaseProgress: number;
    cacRatio: number;
    gmvCampaignProgress: number;
    campaignCACRatio: number;
    gmvPhaseProjected: number;
    phase: PhaseConfig;
  }
): string[] {
  const recommendations: string[] = [];
  
  const hasGMVPhaseRed = phaseIssues.includes("gmv_red");
  const hasGMVPhaseAmber = phaseIssues.includes("gmv_amber");
  const hasCACRed = phaseIssues.includes("cac_red");
  const hasCACAmber = phaseIssues.includes("cac_amber");
  const hasCampaignGMVIssue = campaignIssues.includes("campaign_gmv_red") || campaignIssues.includes("campaign_gmv_amber");
  
  // Phase-level recommendations
  if (hasGMVPhaseRed && !hasCACRed && !hasCACAmber) {
    // GMV is low but CAC is good - we're acquiring efficiently but not generating enough revenue
    recommendations.push(
      "🎯 Phase GMV is low but CAC is healthy. Focus on increasing AOV: bundle higher-value ticket tiers, offer combo deals, or promote premium entries."
    );
    const targetAOVIncrease = metrics.phase.expectedAOV * 1.2;
    recommendations.push(
      `💰 Consider boosting AOV from £${metrics.phase.expectedAOV} to £${Math.round(targetAOVIncrease)} to close the gap.`
    );
  } else if (hasGMVPhaseRed && (hasCACRed || hasCACAmber)) {
    // Both GMV and CAC are poor - we're spending inefficiently
    recommendations.push(
      "⚠️ Phase GMV and CAC both underperforming. Cut underperforming ad sets, refine targeting, and adjust bids to improve efficiency."
    );
    recommendations.push(
      "🔍 Review campaign performance: pause ads with CAC > £" + Math.round(metrics.phase.targetCAC * 1.3) + " and reallocate budget to top performers."
    );
  } else if (hasGMVPhaseAmber) {
    recommendations.push(
      `📊 Phase GMV tracking ${Math.round(metrics.gmvPhaseProgress * 100)}% of target. Monitor closely and consider small AOV or spend optimizations.`
    );
  }
  
  // Campaign-level recommendations
  if (campaignIssues.length > 0 && !hasGMVPhaseRed) {
    // Phase is doing okay but campaign overall is off track
    recommendations.push(
      "⚡ Phase performance is acceptable, but overall campaign is off track. Consider increasing targets or budgets for upcoming phases."
    );
    const shortfall = metrics.phase.targetGMV * (1 - metrics.gmvCampaignProgress);
    recommendations.push(
      `📈 Allocate an additional £${Math.round(shortfall)} in GMV across remaining phases to hit campaign target.`
    );
  }
  
  // Positive feedback
  if (phaseIssues.length === 0 && campaignIssues.length === 0) {
    recommendations.push(
      "✅ Phase and campaign are both on track! Maintain current strategy and monitor daily performance."
    );
  } else if (phaseIssues.length === 0 && campaignIssues.length > 0) {
    recommendations.push(
      "✅ Current phase is performing well. Focus on carrying this momentum into later phases."
    );
  }
  
  // Add projection summary
  recommendations.push(
    `📉 Phase projected to deliver £${Math.round(metrics.gmvPhaseProjected).toLocaleString()} GMV (target: £${metrics.phase.targetGMV.toLocaleString()}).`
  );
  
  return recommendations;
}

/**
 * Helper to create a default campaign configuration with typical phase split
 */
export function createDefaultCampaign(
  durationDays: number,
  targetGMV: number,
  totalBudget: number,
  defaultAOV: number = 40,
  defaultCAC: number = 18
): CampaignConfig {
  const phaseDuration = Math.floor(durationDays / 4);
  
  const phases: PhaseConfig[] = [
    {
      id: "launch",
      label: "Phase 1 – Launch",
      startDay: 1,
      endDay: phaseDuration,
      targetGMV: targetGMV * 0.2, // 20% in launch
      targetCAC: defaultCAC * 0.9, // slightly lower CAC in launch
      expectedAOV: defaultAOV,
      budget: totalBudget * 0.2,
    },
    {
      id: "mid",
      label: "Phase 2 – Mid",
      startDay: phaseDuration + 1,
      endDay: phaseDuration * 2,
      targetGMV: targetGMV * 0.25, // 25% in mid
      targetCAC: defaultCAC,
      expectedAOV: defaultAOV * 1.05,
      budget: totalBudget * 0.25,
    },
    {
      id: "push",
      label: "Phase 3 – Push",
      startDay: phaseDuration * 2 + 1,
      endDay: phaseDuration * 3,
      targetGMV: targetGMV * 0.3, // 30% in push
      targetCAC: defaultCAC * 1.1, // accept slightly higher CAC
      expectedAOV: defaultAOV * 1.1,
      budget: totalBudget * 0.3,
    },
    {
      id: "final",
      label: "Phase 4 – Final 48h",
      startDay: phaseDuration * 3 + 1,
      endDay: durationDays,
      targetGMV: targetGMV * 0.25, // 25% in final push
      targetCAC: defaultCAC * 1.15, // highest CAC acceptable
      expectedAOV: defaultAOV * 1.15,
      budget: totalBudget * 0.25,
    },
  ];
  
  return {
    durationDays,
    targetGMV,
    totalBudget,
    phases,
  };
}

// ============================================================================
// Ticket-based Phase Calculator
// ============================================================================

export type SpendIntensity = "none" | "low" | "normal" | "high";

export interface PhaseInput {
  id: string;
  label: string;
  days: number;
  ticketsTarget: number;
  expectedGMV: number;
  spendIntensity: SpendIntensity;
}

export interface PhaseOutput {
  id: string;
  label: string;
  days: number;
  ticketsTarget: number;
  expectedGMV: number;
  avgTicketPrice: number;
  discountPercent: number;
  approxCAC: number | null;
  marketingBudget: number;
}

export interface CampaignTicketParams {
  totalTickets: number;
  baseTicketPrice: number;
  expectedAOV: number;
}

/**
 * CAC mapping by spend intensity level
 */
export const CAC_BY_INTENSITY: Record<SpendIntensity, number | null> = {
  none:   null,
  low:    10,
  normal: 15,
  high:   25,
};

/**
 * Computes phase output metrics based on ticket targets and spend intensity.
 * 
 * @param campaign - Campaign-level ticket parameters
 * @param phase - Phase input with tickets target and spend intensity
 * @returns PhaseOutput with calculated metrics
 */
export function computePhaseOutput(
  campaign: CampaignTicketParams,
  phase: PhaseInput
): PhaseOutput {
  const avgTicketPrice = phase.expectedGMV / phase.ticketsTarget;
  const discountFrac   = 1 - avgTicketPrice / campaign.baseTicketPrice;
  const discountPercent = discountFrac * 100;

  const approxCAC = CAC_BY_INTENSITY[phase.spendIntensity];
  const paidUnits = approxCAC == null ? 0 : phase.ticketsTarget;
  const marketingBudget = approxCAC == null ? 0 : approxCAC * paidUnits;

  return {
    id: phase.id,
    label: phase.label,
    days: phase.days,
    ticketsTarget: phase.ticketsTarget,
    expectedGMV: phase.expectedGMV,
    avgTicketPrice,
    discountPercent,
    approxCAC,
    marketingBudget,
  };
}

