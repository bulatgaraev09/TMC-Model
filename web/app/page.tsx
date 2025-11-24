'use client';

import { useState } from 'react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import {
  PhaseConfig,
  CampaignConfig,
  PhaseSnapshot,
  PhaseHealth,
  PhasePlan,
  PhaseId,
  TrafficLight,
  planPhase,
  evaluatePhaseHealth,
  createDefaultCampaign,
  SpendIntensity,
  PhaseInput,
  PhaseOutput,
  CampaignTicketParams,
  computePhaseOutput,
  CAC_BY_INTENSITY,
} from '@/lib/phases';

interface QuarterlyData {
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

interface CalculatorResult {
  totalUsersNeeded: number;
  newUsersNeeded: number;
  returningUsersNeeded: number;
  totalOrdersNeeded: number;
  gmvFromNew: number;
  gmvFromReturning: number;
  targetCACNew: number;
  budgetForNew: number;
  budgetForRetention: number;
  projectedGMV: number;
  gmvGap: number;
  recommendations: string[];
  quarterlyData: QuarterlyData[];
}

type Tab = 'calculator' | 'phases';

export default function Home() {
  // Tab state
  const [activeTab, setActiveTab] = useState<Tab>('calculator');
  
  // Calculator tab state
  const [targetGMV, setTargetGMV] = useState('100000');
  const [expectedAOVNew, setExpectedAOVNew] = useState('40');
  const [marketingBudget, setMarketingBudget] = useState('15000');
  const [durationDays, setDurationDays] = useState('20');
  const [targetCAC, setTargetCAC] = useState('18');
  
  // Campaign-level ticket parameters (optional)
  const [totalTickets, setTotalTickets] = useState('');
  const [baseTicketPrice, setBaseTicketPrice] = useState('');
  const [ticketAOV, setTicketAOV] = useState('');
  
  const [result, setResult] = useState<CalculatorResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Phases tab state
  const [campaign, setCampaign] = useState<CampaignConfig>(() =>
    createDefaultCampaign(20, 100000, 15000, 40, 18)
  );
  const [selectedPhaseId, setSelectedPhaseId] = useState<PhaseId>('launch');
  const [phaseSnapshot, setPhaseSnapshot] = useState<Partial<PhaseSnapshot>>({
    dayInPhase: 1,
    gmvToDate: 0,
    spendToDate: 0,
    newUsersToDate: 0,
    returningUsersToDate: 0,
    ordersToDate: 0,
  });
  const [phaseHealth, setPhaseHealth] = useState<PhaseHealth | null>(null);

  const handleCalculate = async () => {
    setLoading(true);
    setError('');
    
    try {
      const response = await fetch('/api/calculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetGMV: Number(targetGMV),
          expectedAOVNew: Number(expectedAOVNew),
          expectedAOVRet: Number(expectedAOVNew) * 1.05,
          marketingBudget: Number(marketingBudget),
          durationDays: Number(durationDays),
          targetCAC: Number(targetCAC),
        }),
      });
      
      if (!response.ok) {
        throw new Error('Calculation failed');
      }
      
      const data = await response.json();
      setResult(data);
    } catch (err) {
      setError('Failed to calculate. Please check your inputs.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-5xl font-bold text-gray-900 mb-4">
              🎟️ Raffle Calculator
            </h1>
            <p className="text-xl text-gray-600">
              Plan your raffle performance targets with precision
            </p>
          </div>
          
          {/* Tab Navigation */}
          <div className="flex justify-center mb-8">
            <div className="bg-white rounded-xl shadow-lg p-2 inline-flex gap-2">
              <button
                onClick={() => setActiveTab('calculator')}
                className={`px-6 py-3 rounded-lg font-semibold transition-all ${
                  activeTab === 'calculator'
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                📊 Calculator
              </button>
              <button
                onClick={() => setActiveTab('phases')}
                className={`px-6 py-3 rounded-lg font-semibold transition-all ${
                  activeTab === 'phases'
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                🎯 Phases / Live Tracking
              </button>
            </div>
          </div>

          {/* Tab 1: Calculator */}
          {activeTab === 'calculator' && (
            <>
              <div className="grid md:grid-cols-2 gap-8">
                {/* Input Form */}
                <div className="bg-white rounded-2xl shadow-xl p-8">
              <h2 className="text-2xl font-bold text-gray-800 mb-6">
                Your Raffle Details
              </h2>
              
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Target GMV (£)
                  </label>
                  <input
                    type="number"
                    value={targetGMV}
                    onChange={(e) => setTargetGMV(e.target.value)}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-indigo-500 focus:outline-none text-lg"
                    placeholder="100000"
                  />
                  <p className="text-xs text-gray-500 mt-1">Total revenue target</p>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Expected AOV (£)
                  </label>
                  <input
                    type="number"
                    value={expectedAOVNew}
                    onChange={(e) => setExpectedAOVNew(e.target.value)}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-indigo-500 focus:outline-none text-lg"
                    placeholder="40"
                  />
                  <p className="text-xs text-gray-500 mt-1">Average order value</p>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Target CAC (£)
                  </label>
                  <input
                    type="number"
                    value={targetCAC}
                    onChange={(e) => setTargetCAC(e.target.value)}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-indigo-500 focus:outline-none text-lg"
                    placeholder="18"
                    step="0.5"
                  />
                  <p className="text-xs text-gray-500 mt-1">Cost to acquire each new customer</p>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Marketing Budget (£)
                  </label>
                  <input
                    type="number"
                    value={marketingBudget}
                    onChange={(e) => setMarketingBudget(e.target.value)}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-indigo-500 focus:outline-none text-lg"
                    placeholder="15000"
                  />
                  <p className="text-xs text-gray-500 mt-1">Total marketing spend</p>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Duration (days)
                  </label>
                  <input
                    type="number"
                    value={durationDays}
                    onChange={(e) => setDurationDays(e.target.value)}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-indigo-500 focus:outline-none text-lg"
                    placeholder="20"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Not sure? Try 14-21 days for optimal retention
                  </p>
                </div>

                {/* Optional Ticket Parameters */}
                <div className="pt-4 border-t border-gray-200">
                  <h3 className="text-sm font-bold text-gray-700 mb-3">
                    🎫 Optional: Ticket-Based Planning
                  </h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-2">
                        Total Tickets to Sell
                      </label>
                      <input
                        type="number"
                        value={totalTickets}
                        onChange={(e) => setTotalTickets(e.target.value)}
                        className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-indigo-500 focus:outline-none"
                        placeholder="10000"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-2">
                        Base Ticket Price (£)
                      </label>
                      <input
                        type="number"
                        value={baseTicketPrice}
                        onChange={(e) => setBaseTicketPrice(e.target.value)}
                        className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-indigo-500 focus:outline-none"
                        placeholder="10"
                        step="0.01"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-2">
                        Expected AOV (£)
                      </label>
                      <input
                        type="number"
                        value={ticketAOV}
                        onChange={(e) => setTicketAOV(e.target.value)}
                        className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-indigo-500 focus:outline-none"
                        placeholder="40"
                        step="0.01"
                      />
                    </div>
                    {totalTickets && baseTicketPrice && ticketAOV && (
                      <div className="bg-indigo-50 rounded-lg p-3">
                        <p className="text-xs text-indigo-600 font-semibold mb-1">
                          Tickets per Order
                        </p>
                        <p className="text-xl font-bold text-indigo-900">
                          {(Number(ticketAOV) / Number(baseTicketPrice)).toFixed(1)}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                <button
                  onClick={handleCalculate}
                  disabled={loading}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 px-6 rounded-lg transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed text-lg shadow-lg"
                >
                  {loading ? 'Calculating...' : 'Calculate Requirements'}
                </button>

                {error && (
                  <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                    {error}
                  </div>
                )}
              </div>
            </div>

            {/* Results */}
            <div className="bg-white rounded-2xl shadow-xl p-8">
              <h2 className="text-2xl font-bold text-gray-800 mb-6">
                What You Need
              </h2>
              
              {!result ? (
                <div className="flex items-center justify-center h-64 text-gray-400">
                  <div className="text-center">
                    <p className="text-lg">Enter your targets and click calculate</p>
                    <p className="text-sm mt-2">to see the breakdown</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Key Metrics */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-indigo-50 rounded-lg p-4">
                      <p className="text-sm text-indigo-600 font-semibold mb-1">Total Users</p>
                      <p className="text-3xl font-bold text-indigo-900">
                        {result.totalUsersNeeded.toLocaleString()}
                      </p>
                    </div>
                    
                    <div className="bg-green-50 rounded-lg p-4">
                      <p className="text-sm text-green-600 font-semibold mb-1">Total Orders</p>
                      <p className="text-3xl font-bold text-green-900">
                        {result.totalOrdersNeeded.toLocaleString()}
                      </p>
                    </div>
                  </div>

                  {/* User Breakdown */}
                  <div className="border-t pt-4">
                    <h3 className="font-semibold text-gray-700 mb-3">User Breakdown</h3>
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">New Users:</span>
                        <span className="font-bold text-lg">
                          {result.newUsersNeeded.toLocaleString()}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">Returning Users:</span>
                        <span className="font-bold text-lg">
                          {result.returningUsersNeeded.toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* GMV Breakdown */}
                  <div className="border-t pt-4">
                    <h3 className="font-semibold text-gray-700 mb-3">GMV Breakdown</h3>
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">From New:</span>
                        <span className="font-bold">
                          £{result.gmvFromNew.toLocaleString()}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">From Returning:</span>
                        <span className="font-bold">
                          £{result.gmvFromReturning.toLocaleString()}
                        </span>
                      </div>
                      <div className="flex justify-between items-center pt-2 border-t">
                        <span className="text-gray-700 font-semibold">Projected Total:</span>
                        <span className="font-bold text-lg">
                          £{result.projectedGMV.toLocaleString()}
                        </span>
                      </div>
                      {result.gmvGap !== 0 && (
                        <div className={`flex justify-between items-center ${result.gmvGap > 0 ? 'text-red-600' : 'text-green-600'}`}>
                          <span className="font-semibold">Gap to Target:</span>
                          <span className="font-bold">
                            {result.gmvGap > 0 ? '-' : '+'}£{Math.abs(result.gmvGap).toLocaleString()}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Marketing */}
                  <div className="border-t pt-4">
                    <h3 className="font-semibold text-gray-700 mb-3">Marketing Efficiency</h3>
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">Target CAC:</span>
                        <span className="font-bold">£{result.targetCACNew.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600 text-xs">LTV/CAC Ratio:</span>
                        <span className="text-sm font-semibold text-indigo-600">
                          {(45 / result.targetCACNew).toFixed(2)}x
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">Budget (New):</span>
                        <span className="font-bold">£{result.budgetForNew.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">Budget (Retention):</span>
                        <span className="font-bold">£{result.budgetForRetention.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>

                  {/* Recommendations */}
                  {result.recommendations.length > 0 && (
                    <div className="border-t pt-4">
                      <h3 className="font-semibold text-gray-700 mb-3">💡 Recommendations</h3>
                      <div className="space-y-2">
                        {result.recommendations.map((rec, idx) => (
                          <div key={idx} className="bg-yellow-50 border-l-4 border-yellow-400 p-3 text-sm">
                            {rec}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Quarterly Progression Chart */}
          {result && result.quarterlyData && (
            <div className="mt-8 bg-white rounded-2xl shadow-xl p-8">
              <h2 className="text-2xl font-bold text-gray-800 mb-6">
                📈 User Growth Over Raffle Duration
              </h2>
              
              {/* Quarterly KPI Cards */}
              <div className="grid grid-cols-4 gap-4 mb-8">
                {result.quarterlyData.map((q) => (
                  <div key={q.quarter} className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-lg p-4 border-2 border-indigo-200">
                    <div className="text-center">
                      <p className="text-sm font-bold text-indigo-600 mb-2">{q.quarter} (Day {q.day})</p>
                      <div className="space-y-1">
                        <div>
                          <p className="text-xs text-gray-600">Total Users</p>
                          <p className="text-lg font-bold text-gray-900">{q.cumulativeTotalUsers.toLocaleString()}</p>
                        </div>
                        <div className="text-xs text-gray-500 pt-1 border-t border-indigo-200">
                          <p>New: +{q.quarterlyNewUsers.toLocaleString()}</p>
                          <p>Ret: +{q.quarterlyReturningUsers.toLocaleString()}</p>
                        </div>
                        <div className="pt-1 border-t border-indigo-200">
                          <p className="text-xs text-gray-600">GMV</p>
                          <p className="text-sm font-semibold text-green-700">£{q.cumulativeGMV.toLocaleString()}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Cumulative Users Chart */}
              <div className="mb-8">
                <h3 className="text-lg font-semibold text-gray-700 mb-4">Cumulative User Growth</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={result.quarterlyData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="quarter" />
                    <YAxis />
                    <Tooltip 
                      contentStyle={{ backgroundColor: 'white', border: '1px solid #ddd', borderRadius: '8px' }}
                      formatter={(value: number) => value.toLocaleString()}
                    />
                    <Legend />
                    <Line 
                      type="monotone" 
                      dataKey="cumulativeTotalUsers" 
                      stroke="#6366f1" 
                      strokeWidth={3}
                      name="Total Users"
                      dot={{ fill: '#6366f1', r: 5 }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="cumulativeNewUsers" 
                      stroke="#10b981" 
                      strokeWidth={2}
                      name="New Users"
                      dot={{ fill: '#10b981', r: 4 }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="cumulativeReturningUsers" 
                      stroke="#f59e0b" 
                      strokeWidth={2}
                      name="Returning Users"
                      dot={{ fill: '#f59e0b', r: 4 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {/* Quarterly Increment Bar Chart */}
              <div>
                <h3 className="text-lg font-semibold text-gray-700 mb-4">Quarterly User Additions</h3>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={result.quarterlyData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="quarter" />
                    <YAxis />
                    <Tooltip 
                      contentStyle={{ backgroundColor: 'white', border: '1px solid #ddd', borderRadius: '8px' }}
                      formatter={(value: number) => value.toLocaleString()}
                    />
                    <Legend />
                    <Bar dataKey="quarterlyNewUsers" fill="#10b981" name="New Users Added" />
                    <Bar dataKey="quarterlyReturningUsers" fill="#f59e0b" name="Returning Users Added" />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* GMV Progression */}
              <div className="mt-8">
                <h3 className="text-lg font-semibold text-gray-700 mb-4">GMV Progression by Quarter</h3>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={result.quarterlyData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="quarter" />
                    <YAxis />
                    <Tooltip 
                      contentStyle={{ backgroundColor: 'white', border: '1px solid #ddd', borderRadius: '8px' }}
                      formatter={(value: number) => `£${value.toLocaleString()}`}
                    />
                    <Legend />
                    <Bar dataKey="quarterlyGMV" fill="#8b5cf6" name="Quarterly GMV" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Info Footer */}
          <div className="mt-12 bg-white rounded-xl shadow-lg p-6">
            <h3 className="font-bold text-gray-800 mb-3">How it works</h3>
            <div className="grid md:grid-cols-3 gap-4 text-sm text-gray-600">
              <div>
                <span className="font-semibold text-indigo-600">1. Forecasting</span>
                <p className="mt-1">Uses historical baselines (LTV: £45, target LTV/CAC: 2.5x) to predict user acquisition</p>
              </div>
              <div>
                <span className="font-semibold text-indigo-600">2. Retention</span>
                <p className="mt-1">Estimates returning users based on 8% CRR over 20 days from your existing base (5,000 users)</p>
              </div>
              <div>
                <span className="font-semibold text-indigo-600">3. Optimization</span>
                <p className="mt-1">Provides recommendations to close gaps in GMV, adjust budget, or optimize AOV</p>
              </div>
            </div>
          </div>
            </>
          )}

          {/* Tab 2: Phases / Live Tracking */}
          {activeTab === 'phases' && (
            <PhasesTab 
              campaign={campaign} 
              setCampaign={setCampaign}
              campaignTicketParams={
                totalTickets && baseTicketPrice && ticketAOV
                  ? {
                      totalTickets: Number(totalTickets),
                      baseTicketPrice: Number(baseTicketPrice),
                      expectedAOV: Number(ticketAOV),
                    }
                  : undefined
              }
            />
          )}
        </div>
      </div>
    </div>
  );
}

// Component for the Phases / Live Tracking tab
function PhasesTab({
  campaign,
  setCampaign,
  campaignTicketParams,
}: {
  campaign: CampaignConfig;
  setCampaign: (campaign: CampaignConfig) => void;
  campaignTicketParams?: CampaignTicketParams;
}) {
  const [selectedPhaseId, setSelectedPhaseId] = useState<PhaseId>('launch');
  const [snapshot, setSnapshot] = useState<Partial<PhaseSnapshot>>({
    dayInPhase: 1,
    gmvToDate: 0,
    spendToDate: 0,
    newUsersToDate: 0,
    returningUsersToDate: 0,
    ordersToDate: 0,
  });
  const [health, setHealth] = useState<PhaseHealth | null>(null);
  const [error, setError] = useState('');
  
  // Update phase configuration
  const updatePhase = (phaseId: PhaseId, updates: Partial<PhaseConfig>) => {
    setCampaign({
      ...campaign,
      phases: campaign.phases.map((p) =>
        p.id === phaseId ? { ...p, ...updates } : p
      ),
    });
  };
  
  // Calculate cumulative stats up to the selected phase
  const calculateCumulativeStats = () => {
    const selectedPhase = campaign.phases.find((p) => p.id === selectedPhaseId);
    if (!selectedPhase) return { gmvToDate: 0, spendToDate: 0, newUsersToDate: 0, ordersToDate: 0 };
    
    // Sum up all completed phases before current phase, plus current phase progress
    let cumulativeGMV = Number(snapshot.gmvToDate || 0);
    let cumulativeSpend = Number(snapshot.spendToDate || 0);
    let cumulativeNewUsers = Number(snapshot.newUsersToDate || 0);
    let cumulativeOrders = Number(snapshot.ordersToDate || 0);
    
    // Add completed phases (simplified - assuming we're tracking cumulative values directly)
    return {
      gmvToDate: cumulativeGMV,
      spendToDate: cumulativeSpend,
      newUsersToDate: cumulativeNewUsers,
      ordersToDate: cumulativeOrders,
    };
  };
  
  // Evaluate phase health
  const handleEvaluate = () => {
    setError('');
    
    // Validate inputs
    if (!snapshot.dayInPhase || snapshot.dayInPhase <= 0) {
      setError('Please enter a valid day in phase');
      return;
    }
    
    try {
      const phaseSnapshotComplete: PhaseSnapshot = {
        phaseId: selectedPhaseId,
        dayInPhase: Number(snapshot.dayInPhase),
        gmvToDate: Number(snapshot.gmvToDate || 0),
        spendToDate: Number(snapshot.spendToDate || 0),
        newUsersToDate: Number(snapshot.newUsersToDate || 0),
        returningUsersToDate: Number(snapshot.returningUsersToDate || 0),
        ordersToDate: Number(snapshot.ordersToDate || 0),
      };
      
      const cumulativeStats = calculateCumulativeStats();
      const result = evaluatePhaseHealth(campaign, phaseSnapshotComplete, cumulativeStats);
      setHealth(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Evaluation failed');
      console.error(err);
    }
  };
  
  // Get traffic light color
  const getStatusColor = (status: TrafficLight) => {
    switch (status) {
      case 'GREEN':
        return 'bg-green-500';
      case 'AMBER':
        return 'bg-yellow-500';
      case 'RED':
        return 'bg-red-500';
    }
  };
  
  return (
    <div className="space-y-8">
      {/* Phase Planner Section */}
      <div className="bg-white rounded-2xl shadow-xl p-8">
        <h2 className="text-2xl font-bold text-gray-800 mb-6">📋 Phase Planner</h2>
        
        <div className="space-y-6">
          {/* Campaign-level inputs */}
          <div className="grid md:grid-cols-3 gap-4 pb-6 border-b">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Campaign Duration (days)
              </label>
              <input
                type="number"
                value={campaign.durationDays}
                onChange={(e) => setCampaign({ ...campaign, durationDays: Number(e.target.value) })}
                className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-indigo-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Target GMV (£)
              </label>
              <input
                type="number"
                value={campaign.targetGMV}
                onChange={(e) => setCampaign({ ...campaign, targetGMV: Number(e.target.value) })}
                className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-indigo-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Total Budget (£)
              </label>
              <input
                type="number"
                value={campaign.totalBudget}
                onChange={(e) => setCampaign({ ...campaign, totalBudget: Number(e.target.value) })}
                className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-indigo-500 focus:outline-none"
              />
            </div>
          </div>
          
          {/* Phase cards */}
          <div className="grid gap-4">
            {campaign.phases.map((phase) => {
              const plan = planPhase(phase);
              return (
                <div
                  key={phase.id}
                  className="border-2 border-gray-200 rounded-lg p-6 hover:border-indigo-300 transition-colors"
                >
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold text-gray-800">{phase.label}</h3>
                    <span className="text-sm text-gray-500">
                      Days {phase.startDay}–{phase.endDay}
                    </span>
                  </div>
                  
                  <div className="grid md:grid-cols-4 gap-4 mb-4">
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1">
                        Target GMV (£)
                      </label>
                      <input
                        type="number"
                        value={phase.targetGMV}
                        onChange={(e) =>
                          updatePhase(phase.id, { targetGMV: Number(e.target.value) })
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-indigo-500 focus:outline-none text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1">
                        Target CAC (£)
                      </label>
                      <input
                        type="number"
                        value={phase.targetCAC}
                        onChange={(e) =>
                          updatePhase(phase.id, { targetCAC: Number(e.target.value) })
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-indigo-500 focus:outline-none text-sm"
                        step="0.5"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1">
                        Expected AOV (£)
                      </label>
                      <input
                        type="number"
                        value={phase.expectedAOV}
                        onChange={(e) =>
                          updatePhase(phase.id, { expectedAOV: Number(e.target.value) })
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-indigo-500 focus:outline-none text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1">
                        Budget (£)
                      </label>
                      <input
                        type="number"
                        value={phase.budget}
                        onChange={(e) =>
                          updatePhase(phase.id, { budget: Number(e.target.value) })
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-indigo-500 focus:outline-none text-sm"
                      />
                    </div>
                  </div>
                  
                  {/* Derived metrics */}
                  <div className="bg-indigo-50 rounded-lg p-4">
                    <div className="grid grid-cols-3 gap-4 text-center">
                      <div>
                        <p className="text-xs text-indigo-600 font-semibold mb-1">
                          Planned New Users
                        </p>
                        <p className="text-lg font-bold text-indigo-900">
                          {plan.plannedNewUsers.toLocaleString()}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-indigo-600 font-semibold mb-1">
                          Planned Orders
                        </p>
                        <p className="text-lg font-bold text-indigo-900">
                          {plan.plannedOrders.toLocaleString()}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-indigo-600 font-semibold mb-1">
                          Returning Orders
                        </p>
                        <p className="text-lg font-bold text-indigo-900">
                          {plan.plannedReturningOrders.toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
      
      {/* Live Tracking Section */}
      <div className="bg-white rounded-2xl shadow-xl p-8">
        <h2 className="text-2xl font-bold text-gray-800 mb-6">🔴 Live Tracking</h2>
        
        <div className="space-y-6">
          {/* Phase selector and inputs */}
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Current Phase
              </label>
              <select
                value={selectedPhaseId}
                onChange={(e) => setSelectedPhaseId(e.target.value as PhaseId)}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-indigo-500 focus:outline-none text-lg"
              >
                {campaign.phases.map((phase) => (
                  <option key={phase.id} value={phase.id}>
                    {phase.label}
                  </option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Day in Phase
              </label>
              <input
                type="number"
                value={snapshot.dayInPhase}
                onChange={(e) =>
                  setSnapshot({ ...snapshot, dayInPhase: Number(e.target.value) })
                }
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-indigo-500 focus:outline-none text-lg"
                min="1"
              />
            </div>
          </div>
          
          {/* Snapshot metrics */}
          <div className="grid md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                GMV to Date (£)
              </label>
              <input
                type="number"
                value={snapshot.gmvToDate}
                onChange={(e) =>
                  setSnapshot({ ...snapshot, gmvToDate: Number(e.target.value) })
                }
                className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-indigo-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Spend to Date (£)
              </label>
              <input
                type="number"
                value={snapshot.spendToDate}
                onChange={(e) =>
                  setSnapshot({ ...snapshot, spendToDate: Number(e.target.value) })
                }
                className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-indigo-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Orders to Date
              </label>
              <input
                type="number"
                value={snapshot.ordersToDate}
                onChange={(e) =>
                  setSnapshot({ ...snapshot, ordersToDate: Number(e.target.value) })
                }
                className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-indigo-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                New Users to Date
              </label>
              <input
                type="number"
                value={snapshot.newUsersToDate}
                onChange={(e) =>
                  setSnapshot({ ...snapshot, newUsersToDate: Number(e.target.value) })
                }
                className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-indigo-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Returning Users to Date
              </label>
              <input
                type="number"
                value={snapshot.returningUsersToDate}
                onChange={(e) =>
                  setSnapshot({ ...snapshot, returningUsersToDate: Number(e.target.value) })
                }
                className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-indigo-500 focus:outline-none"
              />
            </div>
          </div>
          
          <button
            onClick={handleEvaluate}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 px-6 rounded-lg transition-colors text-lg shadow-lg"
          >
            Evaluate Phase Health
          </button>
          
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}
          
          {/* Health Results */}
          {health && (
            <div className="space-y-6 pt-6 border-t-2">
              {/* Status Badges */}
              <div className="grid md:grid-cols-2 gap-4">
                <div className="bg-gray-50 rounded-lg p-6">
                  <p className="text-sm text-gray-600 font-semibold mb-3">Phase Status</p>
                  <div className="flex items-center gap-3">
                    <div className={`w-6 h-6 rounded-full ${getStatusColor(health.phaseStatus)}`} />
                    <span className="text-2xl font-bold text-gray-900">{health.phaseStatus}</span>
                  </div>
                  <p className="text-sm text-gray-500 mt-2">
                    Projected Phase GMV: £{health.projectedGMVPhase.toLocaleString()}
                  </p>
                </div>
                
                <div className="bg-gray-50 rounded-lg p-6">
                  <p className="text-sm text-gray-600 font-semibold mb-3">Campaign Status</p>
                  <div className="flex items-center gap-3">
                    <div className={`w-6 h-6 rounded-full ${getStatusColor(health.campaignStatus)}`} />
                    <span className="text-2xl font-bold text-gray-900">{health.campaignStatus}</span>
                  </div>
                  <p className="text-sm text-gray-500 mt-2">
                    Projected Campaign GMV: £{health.projectedGMVCampaign.toLocaleString()}
                  </p>
                </div>
              </div>
              
              {/* Recommendations */}
              <div>
                <h3 className="font-semibold text-gray-700 mb-3">💡 Recommendations</h3>
                <div className="space-y-2">
                  {health.notes.map((note, idx) => (
                    <div
                      key={idx}
                      className="bg-blue-50 border-l-4 border-blue-400 p-4 text-sm"
                    >
                      {note}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* Ticket-Based Phase Calculator */}
      {campaignTicketParams && (
        <TicketPhaseCalculator campaignTicketParams={campaignTicketParams} />
      )}
    </div>
  );
}

// Component for ticket-based phase calculator
function TicketPhaseCalculator({
  campaignTicketParams,
}: {
  campaignTicketParams: CampaignTicketParams;
}) {
  const [phases, setPhases] = useState<PhaseInput[]>([
    {
      id: '1',
      label: 'Phase 1',
      days: 5,
      ticketsTarget: 0,
      expectedGMV: 0,
      spendIntensity: 'normal',
    },
  ]);

  const addPhase = () => {
    const newId = (phases.length + 1).toString();
    setPhases([
      ...phases,
      {
        id: newId,
        label: `Phase ${newId}`,
        days: 5,
        ticketsTarget: 0,
        expectedGMV: 0,
        spendIntensity: 'normal',
      },
    ]);
  };

  const removePhase = (id: string) => {
    if (phases.length > 1) {
      setPhases(phases.filter((p) => p.id !== id));
    }
  };

  const updatePhase = (id: string, updates: Partial<PhaseInput>) => {
    setPhases(phases.map((p) => (p.id === id ? { ...p, ...updates } : p)));
  };

  const outputs = phases.map((p) => computePhaseOutput(campaignTicketParams, p));

  // Calculate totals
  const totalTickets = outputs.reduce((sum, p) => sum + p.ticketsTarget, 0);
  const totalGMV = outputs.reduce((sum, p) => sum + p.expectedGMV, 0);
  const totalBudget = outputs.reduce((sum, p) => sum + p.marketingBudget, 0);

  return (
    <div className="bg-white rounded-2xl shadow-xl p-8">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-800">🎫 Ticket-Based Phase Planner</h2>
        <button
          onClick={addPhase}
          className="bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
        >
          + Add Phase
        </button>
      </div>

      {/* Campaign Summary */}
      <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg p-4 mb-6 border-2 border-purple-200">
        <h3 className="text-sm font-bold text-gray-700 mb-3">Campaign Parameters</h3>
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div>
            <p className="text-gray-600">Total Tickets</p>
            <p className="text-lg font-bold text-gray-900">{campaignTicketParams.totalTickets.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-gray-600">Base Ticket Price</p>
            <p className="text-lg font-bold text-gray-900">£{campaignTicketParams.baseTicketPrice.toFixed(2)}</p>
          </div>
          <div>
            <p className="text-gray-600">Expected AOV</p>
            <p className="text-lg font-bold text-gray-900">£{campaignTicketParams.expectedAOV.toFixed(2)}</p>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {phases.map((phase, idx) => {
          const output = outputs[idx];
          return (
            <div
              key={phase.id}
              className="border-2 border-gray-200 rounded-lg p-6 hover:border-indigo-300 transition-colors"
            >
              <div className="flex items-center justify-between mb-4">
                <input
                  type="text"
                  value={phase.label}
                  onChange={(e) => updatePhase(phase.id, { label: e.target.value })}
                  className="text-lg font-bold text-gray-800 border-b-2 border-transparent hover:border-gray-300 focus:border-indigo-500 focus:outline-none px-2 py-1"
                />
                {phases.length > 1 && (
                  <button
                    onClick={() => removePhase(phase.id)}
                    className="text-red-600 hover:text-red-800 font-semibold text-sm"
                  >
                    ✕ Remove
                  </button>
                )}
              </div>

              {/* Input Row */}
              <div className="grid md:grid-cols-4 gap-4 mb-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">
                    Days
                  </label>
                  <input
                    type="number"
                    value={phase.days}
                    onChange={(e) => updatePhase(phase.id, { days: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-indigo-500 focus:outline-none text-sm"
                    min="1"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">
                    Target Tickets
                  </label>
                  <input
                    type="number"
                    value={phase.ticketsTarget}
                    onChange={(e) =>
                      updatePhase(phase.id, { ticketsTarget: Number(e.target.value) })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-indigo-500 focus:outline-none text-sm"
                    min="0"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">
                    Expected GMV (£)
                  </label>
                  <input
                    type="number"
                    value={phase.expectedGMV}
                    onChange={(e) =>
                      updatePhase(phase.id, { expectedGMV: Number(e.target.value) })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-indigo-500 focus:outline-none text-sm"
                    min="0"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">
                    Spend Intensity
                  </label>
                  <select
                    value={phase.spendIntensity}
                    onChange={(e) =>
                      updatePhase(phase.id, { spendIntensity: e.target.value as SpendIntensity })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-indigo-500 focus:outline-none text-sm"
                  >
                    <option value="none">None (Organic)</option>
                    <option value="low">Low (£{CAC_BY_INTENSITY.low})</option>
                    <option value="normal">Normal (£{CAC_BY_INTENSITY.normal})</option>
                    <option value="high">High (£{CAC_BY_INTENSITY.high})</option>
                  </select>
                </div>
              </div>

              {/* Output Row */}
              <div className="bg-indigo-50 rounded-lg p-4">
                <div className="grid grid-cols-5 gap-4 text-center">
                  <div>
                    <p className="text-xs text-indigo-600 font-semibold mb-1">Avg Ticket Price</p>
                    <p className="text-lg font-bold text-indigo-900">
                      £{output.avgTicketPrice.toFixed(2)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-indigo-600 font-semibold mb-1">
                      {output.discountPercent >= 0 ? 'Discount' : 'Surcharge'}
                    </p>
                    <p className="text-lg font-bold text-indigo-900">
                      {Math.abs(output.discountPercent).toFixed(1)}%
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-indigo-600 font-semibold mb-1">Approx. CAC</p>
                    <p className="text-lg font-bold text-indigo-900">
                      {output.approxCAC === null ? 'Organic' : `£${output.approxCAC}`}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-indigo-600 font-semibold mb-1">Marketing Budget</p>
                    <p className="text-lg font-bold text-indigo-900">
                      £{output.marketingBudget.toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-indigo-600 font-semibold mb-1">Days Duration</p>
                    <p className="text-lg font-bold text-indigo-900">{output.days}</p>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Campaign Totals */}
      <div className="mt-6 bg-gradient-to-br from-green-50 to-teal-50 rounded-lg p-6 border-2 border-green-200">
        <h3 className="text-lg font-bold text-gray-800 mb-4">📊 Campaign Totals</h3>
        <div className="grid md:grid-cols-3 gap-6">
          <div className="bg-white rounded-lg p-4">
            <p className="text-sm text-gray-600 mb-2">Total Tickets</p>
            <div className="space-y-1">
              <p className="text-2xl font-bold text-gray-900">{totalTickets.toLocaleString()}</p>
              <div className="flex justify-between text-xs">
                <span className="text-gray-500">Campaign Target:</span>
                <span className="font-semibold">{campaignTicketParams.totalTickets.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-xs pt-1 border-t">
                <span className="text-gray-500">Difference:</span>
                <span
                  className={`font-bold ${
                    totalTickets >= campaignTicketParams.totalTickets
                      ? 'text-green-600'
                      : 'text-red-600'
                  }`}
                >
                  {totalTickets >= campaignTicketParams.totalTickets ? '+' : ''}
                  {(totalTickets - campaignTicketParams.totalTickets).toLocaleString()}
                </span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg p-4">
            <p className="text-sm text-gray-600 mb-2">Total GMV</p>
            <div className="space-y-1">
              <p className="text-2xl font-bold text-gray-900">£{totalGMV.toLocaleString()}</p>
              <p className="text-xs text-gray-500">
                Sum of phase GMV targets
              </p>
            </div>
          </div>

          <div className="bg-white rounded-lg p-4">
            <p className="text-sm text-gray-600 mb-2">Total Marketing Budget</p>
            <div className="space-y-1">
              <p className="text-2xl font-bold text-gray-900">£{totalBudget.toLocaleString()}</p>
              <p className="text-xs text-gray-500">
                Sum of phase budgets
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
