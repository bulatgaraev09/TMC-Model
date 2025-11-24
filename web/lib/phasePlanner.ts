/**
 * Phase Planner - Campaign and phase-level planning calculator
 * 
 * This module provides types and pure functions for calculating phase-level
 * marketing metrics based on campaign-level targets.
 */

export type CACLevel = "none" | "low" | "medium" | "high";

export interface PhaseInput {
  id: string;
  label: string;        // e.g. "Phase 1 – Launch"
  ticketsTarget: number;
  gmvTarget: number;
  cacLevel: CACLevel;   // "none" | "low" | "medium" | "high"
}

export interface PhaseOutput {
  id: string;
  label: string;

  ticketsTarget: number;
  gmvTarget: number;

  ticketPrice: number;     // gmvTarget / ticketsTarget
  ordersTarget: number;    // gmvTarget / AOV_total (campaign-level)

  cacNominal: number;      // 0 / 10 / 15 / 20
  budgetRaw: number;       // cacNominal * ordersTarget

  budgetFinal: number;     // scaled budget to align with total campaign marketing spend
  cacEffective: number;    // budgetFinal / ordersTarget
}

export interface CampaignInputs {
  GMV_total: number;
  AOV_total: number;
  Budget_total: number;
  CAC_target: number;
  durationDays: number;
}

export interface PhasesCalculationResult {
  phases: PhaseOutput[];
  GMV_phases_sum: number;
  tickets_phases_sum: number;
  orders_phases_sum: number;
  budget_final_sum: number;
  CAC_effective_overall: number; // budget_final_sum / orders_phases_sum
}

/**
 * CAC (Customer Acquisition Cost) mapping by spend intensity level.
 * - none: £0 (organic, no paid marketing)
 * - low: £10 CAC
 * - medium: £15 CAC
 * - high: £20 CAC
 */
export const CAC_BY_LEVEL: Record<CACLevel, number> = {
  none:   0,
  low:    10,
  medium: 15,
  high:   20,
};

/**
 * Calculates phase-level outputs based on campaign inputs and phase targets.
 * 
 * Algorithm:
 * 1. For each phase, compute raw metrics (ticket price, orders target, raw budget)
 * 2. Sum up all raw budgets across phases
 * 3. Scale each phase's budget proportionally to match the total campaign budget
 * 4. Compute effective CAC for each phase after scaling
 * 
 * @param campaign - Campaign-level inputs (total GMV, AOV, budget, CAC target, duration)
 * @param phaseInputs - Array of phase inputs (tickets, GMV targets, CAC level)
 * @returns Complete calculation result with scaled budgets and effective CACs
 * @throws Error if campaign inputs are invalid
 */
export function calculatePhases(
  campaign: CampaignInputs,
  phaseInputs: PhaseInput[]
): PhasesCalculationResult {
  // Guard rails: validate campaign inputs
  if (campaign.GMV_total <= 0 || campaign.AOV_total <= 0 || campaign.Budget_total < 0) {
    throw new Error('Campaign inputs must be positive numbers (GMV_total, AOV_total, Budget_total)');
  }

  // Step 1: Compute raw metrics for each phase
  const phaseOutputs: PhaseOutput[] = phaseInputs.map((phase) => {
    // Ticket price: average price per ticket in this phase
    // Formula: GMV ÷ number of tickets
    const ticketPrice = phase.ticketsTarget > 0 
      ? phase.gmvTarget / phase.ticketsTarget 
      : 0;

    // Orders target: number of orders needed to hit GMV at campaign AOV
    // Formula: Phase GMV ÷ Campaign AOV
    const ordersTarget = campaign.AOV_total > 0 
      ? phase.gmvTarget / campaign.AOV_total 
      : 0;

    // Nominal CAC: the "list price" CAC for this intensity level
    const cacNominal = CAC_BY_LEVEL[phase.cacLevel];

    // Raw budget: what we'd spend if we applied nominal CAC to all orders
    // Formula: Nominal CAC × Orders Target
    const budgetRaw = cacNominal * ordersTarget;

    return {
      id: phase.id,
      label: phase.label,
      ticketsTarget: phase.ticketsTarget,
      gmvTarget: phase.gmvTarget,
      ticketPrice,
      ordersTarget,
      cacNominal,
      budgetRaw,
      budgetFinal: 0,      // Will be computed in step 3
      cacEffective: 0,     // Will be computed in step 3
    };
  });

  // Step 2: Compute aggregate sums
  const budget_raw_sum = phaseOutputs.reduce((sum, p) => sum + p.budgetRaw, 0);
  const GMV_phases_sum = phaseOutputs.reduce((sum, p) => sum + p.gmvTarget, 0);
  const tickets_phases_sum = phaseOutputs.reduce((sum, p) => sum + p.ticketsTarget, 0);
  const orders_phases_sum = phaseOutputs.reduce((sum, p) => sum + p.ordersTarget, 0);

  // Step 3: Scale budgets to match total campaign budget
  let budget_final_sum = 0;

  if (budget_raw_sum <= 0) {
    // All phases are "no spend" (organic only)
    // No scaling needed; budgets and effective CACs remain at 0
    phaseOutputs.forEach((phase) => {
      phase.budgetFinal = 0;
      phase.cacEffective = 0;
    });
    budget_final_sum = 0;
  } else {
    // Compute scaling factor: how much to multiply each raw budget
    // to make the sum equal the total campaign budget
    // Formula: Total Budget ÷ Sum of Raw Budgets
    const scale = campaign.Budget_total / budget_raw_sum;

    phaseOutputs.forEach((phase) => {
      // Apply scaling to get final budget for this phase
      phase.budgetFinal = phase.budgetRaw * scale;

      // Effective CAC: actual CAC after budget scaling
      // Formula: Final Budget ÷ Orders Target
      phase.cacEffective = phase.ordersTarget > 0 
        ? phase.budgetFinal / phase.ordersTarget 
        : 0;
    });

    // Sum of final budgets should equal campaign budget (within rounding)
    budget_final_sum = phaseOutputs.reduce((sum, p) => sum + p.budgetFinal, 0);
  }

  // Step 4: Compute overall effective CAC across all phases
  // This represents the blended CAC across all phases after budget allocation
  // Formula: Total Final Budget ÷ Total Orders
  const CAC_effective_overall = orders_phases_sum > 0 
    ? budget_final_sum / orders_phases_sum 
    : 0;

  return {
    phases: phaseOutputs,
    GMV_phases_sum,
    tickets_phases_sum,
    orders_phases_sum,
    budget_final_sum,
    CAC_effective_overall,
  };
}

