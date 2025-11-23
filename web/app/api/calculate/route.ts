import { NextRequest, NextResponse } from 'next/server';
import { calculateRaffleNeeds, DEFAULT_BASELINES } from '@/lib/raffleCalculator';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const {
      targetGMV,
      expectedAOVNew,
      expectedAOVRet,
      marketingBudget,
      durationDays,
      targetCAC,
    } = body;
    
    // Validate inputs
    if (!targetGMV || !expectedAOVNew || !marketingBudget || !durationDays) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }
    
    // Use defaults for AOV returning if not provided
    const aovRet = expectedAOVRet || expectedAOVNew * 1.05;
    
    // Calculate
    const result = calculateRaffleNeeds({
      targetGMV: Number(targetGMV),
      expectedAOVNew: Number(expectedAOVNew),
      expectedAOVRet: Number(aovRet),
      marketingBudget: Number(marketingBudget),
      durationDays: Number(durationDays),
      targetCAC: targetCAC ? Number(targetCAC) : undefined,
      ...DEFAULT_BASELINES,
    });
    
    return NextResponse.json(result);
  } catch (error) {
    console.error('Calculation error:', error);
    return NextResponse.json(
      { error: 'Calculation failed' },
      { status: 500 }
    );
  }
}

