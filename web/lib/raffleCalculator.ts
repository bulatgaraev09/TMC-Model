// Shared calculation logic for the web UI
// This uses the core model from the parent directory

export interface CalculatorInput {
  targetGMV: number;
  expectedAOVNew: number;
  expectedAOVRet: number;
  marketingBudget: number;
  durationDays: number;
  targetCAC?: number; // Optional: if provided, use directly; otherwise calculate from LTV ratio
  
  // Baselines (from XML or defaults)
  baselineLTVNew: number;
  targetLTVToCAC: number;
  baselineCRR20d: number;
  baselineGMVPerRetainedUser20d: number;
  baseExistingCustomers: number;
  
  budgetSplitNew: number; // 0..1
}

export interface QuarterlyData {
  quarter: string;
  day: number;
  cumulativeNewUsers: number;
  cumulativeReturningUsers: number;
  cumulativeTotalUsers: number;
  cumulativeGMV: number;
  cumulativeOrders: number;
  quarterlyNewUsers: number;
  quarterlyReturningUsers: number;
  quarterlyGMV: number;
}

export interface CalculatorOutput {
  // What you need to hit your target
  totalUsersNeeded: number;
  newUsersNeeded: number;
  returningUsersNeeded: number;
  totalOrdersNeeded: number;
  
  // Financial breakdown
  gmvFromNew: number;
  gmvFromReturning: number;
  
  // Marketing efficiency
  targetCACNew: number;
  budgetForNew: number;
  budgetForRetention: number;
  
  // Projections
  projectedGMV: number;
  gmvGap: number; // difference from target
  
  // Recommendations
  recommendations: string[];
  
  // Quarterly breakdown
  quarterlyData: QuarterlyData[];
}

export function calculateRaffleNeeds(input: CalculatorInput): CalculatorOutput {
  const {
    targetGMV,
    expectedAOVNew,
    expectedAOVRet,
    marketingBudget,
    durationDays,
    targetCAC,
    baselineLTVNew,
    targetLTVToCAC,
    baselineCRR20d,
    baselineGMVPerRetainedUser20d,
    baseExistingCustomers,
    budgetSplitNew,
  } = input;
  
  // 1) Use provided CAC or calculate from LTV and desired ratio
  const targetCACNew = targetCAC ?? (baselineLTVNew / targetLTVToCAC);
  
  // 2) Budget allocation
  const budgetForNew = marketingBudget * budgetSplitNew;
  const budgetForRetention = marketingBudget * (1 - budgetSplitNew);
  
  // 3) Expected new users from budget
  const expectedNewUsers = budgetForNew / targetCACNew;
  
  // 4) Expected returning users from CRR scaled by duration
  let CRRWindow = baselineCRR20d * (durationDays / 20);
  CRRWindow = Math.min(CRRWindow, 0.7); // cap at 70%
  
  const expectedReturningUsers = baseExistingCustomers * CRRWindow;
  
  // 5) GMV forecast from our expected users
  const ordersPerNewUser = 1; // assume 1 order per new user over window
  const gmvFromNew = expectedNewUsers * ordersPerNewUser * expectedAOVNew;
  
  const gmvPerRetainedWindow = baselineGMVPerRetainedUser20d * (durationDays / 20);
  const gmvFromReturning = expectedReturningUsers * gmvPerRetainedWindow;
  
  const projectedGMV = gmvFromNew + gmvFromReturning;
  const gmvGap = targetGMV - projectedGMV;
  
  // 6) Calculate what we NEED to hit target
  // Work backwards: if we need more GMV, how many more users do we need?
  let adjustedNewUsers = expectedNewUsers;
  let adjustedReturningUsers = expectedReturningUsers;
  
  if (gmvGap > 0) {
    // We're short - need more users
    // Allocate the gap proportionally or focus on new users
    const additionalFromNew = gmvGap * 0.7; // 70% from new
    const additionalFromReturning = gmvGap * 0.3; // 30% from returning
    
    adjustedNewUsers += additionalFromNew / (ordersPerNewUser * expectedAOVNew);
    adjustedReturningUsers += additionalFromReturning / gmvPerRetainedWindow;
  }
  
  const totalUsersNeeded = adjustedNewUsers + adjustedReturningUsers;
  const totalOrdersNeeded = (adjustedNewUsers * ordersPerNewUser) + 
                            (adjustedReturningUsers * (gmvPerRetainedWindow / expectedAOVRet));
  
  // 7) Generate recommendations
  const recommendations: string[] = [];
  
  if (gmvGap > 0) {
    recommendations.push(
      `You're projected to be £${Math.round(gmvGap).toLocaleString()} short of your target with current budget and AOV.`
    );
    
    if (gmvGap > targetGMV * 0.2) {
      recommendations.push(
        `Consider increasing marketing budget by £${Math.round(gmvGap / 5).toLocaleString()} or boosting AOV to £${Math.round(expectedAOVNew * 1.2)}.`
      );
    }
    
    recommendations.push(
      `To close the gap: acquire ${Math.round(adjustedNewUsers - expectedNewUsers)} more new users or increase CRM for ${Math.round(adjustedReturningUsers - expectedReturningUsers)} more returning users.`
    );
  } else if (gmvGap < 0) {
    recommendations.push(
      `You're on track to exceed your target by £${Math.round(Math.abs(gmvGap)).toLocaleString()}! Consider reallocating excess budget or setting a higher target.`
    );
  } else {
    recommendations.push(
      `Your targets are well-balanced. Monitor daily progress to ensure you stay on track.`
    );
  }
  
  const ticketsNeeded = targetGMV / expectedAOVNew;
  const suggestedTicketPrice = expectedAOVNew / 2; // assume ~2 tickets per order
  recommendations.push(
    `Estimated ${Math.round(ticketsNeeded)} tickets needed at £${expectedAOVNew} AOV. Consider ticket price of £${suggestedTicketPrice.toFixed(2)}.`
  );
  
  const daysRecommendation = durationDays < 14 
    ? "14-21 days recommended for retention momentum"
    : durationDays > 30
    ? "Consider splitting into multiple shorter raffles"
    : "Duration looks good for retention window";
  recommendations.push(daysRecommendation);
  
  // 8) Generate quarterly progression data
  const quarterlyData: QuarterlyData[] = [];
  const quartersCount = 4;
  const daysPerQuarter = durationDays / quartersCount;
  
  for (let q = 1; q <= quartersCount; q++) {
    const dayInCampaign = Math.round(q * daysPerQuarter);
    const progressRatio = dayInCampaign / durationDays;
    
    // Assume linear acquisition for new users
    const cumulativeNew = adjustedNewUsers * progressRatio;
    
    // Retention builds up non-linearly (CRR increases over time)
    const crrAtDay = Math.min(baselineCRR20d * (dayInCampaign / 20), 0.7);
    const cumulativeReturning = baseExistingCustomers * crrAtDay;
    
    const cumulativeTotal = cumulativeNew + cumulativeReturning;
    
    // GMV calculation
    const cumulativeGMVNew = cumulativeNew * ordersPerNewUser * expectedAOVNew;
    const gmvPerRetAtDay = baselineGMVPerRetainedUser20d * (dayInCampaign / 20);
    const cumulativeGMVRet = cumulativeReturning * gmvPerRetAtDay;
    const cumulativeGMV = cumulativeGMVNew + cumulativeGMVRet;
    
    const cumulativeOrders = (cumulativeNew * ordersPerNewUser) + 
                              (cumulativeReturning * (gmvPerRetAtDay / expectedAOVRet));
    
    // Quarterly increments (vs previous quarter)
    const prevNew = q > 1 ? adjustedNewUsers * ((q - 1) * daysPerQuarter / durationDays) : 0;
    const prevCrrDay = q > 1 ? Math.round((q - 1) * daysPerQuarter) : 0;
    const prevCrr = Math.min(baselineCRR20d * (prevCrrDay / 20), 0.7);
    const prevReturning = q > 1 ? baseExistingCustomers * prevCrr : 0;
    const prevGMVNew = prevNew * ordersPerNewUser * expectedAOVNew;
    const prevGmvPerRet = baselineGMVPerRetainedUser20d * (prevCrrDay / 20);
    const prevGMVRet = prevReturning * prevGmvPerRet;
    const prevGMV = prevGMVNew + prevGMVRet;
    
    quarterlyData.push({
      quarter: `Q${q}`,
      day: dayInCampaign,
      cumulativeNewUsers: Math.round(cumulativeNew),
      cumulativeReturningUsers: Math.round(cumulativeReturning),
      cumulativeTotalUsers: Math.round(cumulativeTotal),
      cumulativeGMV: Math.round(cumulativeGMV),
      cumulativeOrders: Math.round(cumulativeOrders),
      quarterlyNewUsers: Math.round(cumulativeNew - prevNew),
      quarterlyReturningUsers: Math.round(cumulativeReturning - prevReturning),
      quarterlyGMV: Math.round(cumulativeGMV - prevGMV),
    });
  }
  
  return {
    totalUsersNeeded: Math.round(totalUsersNeeded),
    newUsersNeeded: Math.round(adjustedNewUsers),
    returningUsersNeeded: Math.round(adjustedReturningUsers),
    totalOrdersNeeded: Math.round(totalOrdersNeeded),
    gmvFromNew: Math.round(gmvFromNew),
    gmvFromReturning: Math.round(gmvFromReturning),
    targetCACNew: Math.round(targetCACNew * 100) / 100,
    budgetForNew: Math.round(budgetForNew),
    budgetForRetention: Math.round(budgetForRetention),
    projectedGMV: Math.round(projectedGMV),
    gmvGap: Math.round(gmvGap),
    recommendations,
    quarterlyData,
  };
}

// Default baselines from the XML
export const DEFAULT_BASELINES = {
  baselineLTVNew: 45,
  targetLTVToCAC: 2.5,
  baselineCRR20d: 0.08,
  baselineGMVPerRetainedUser20d: 35,
  baseExistingCustomers: 5000,
  budgetSplitNew: 0.75,
};

