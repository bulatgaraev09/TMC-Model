'use client';

import { useState } from 'react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

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

export default function Home() {
  const [targetGMV, setTargetGMV] = useState('100000');
  const [expectedAOVNew, setExpectedAOVNew] = useState('40');
  const [marketingBudget, setMarketingBudget] = useState('15000');
  const [durationDays, setDurationDays] = useState('20');
  const [targetCAC, setTargetCAC] = useState('18');
  
  const [result, setResult] = useState<CalculatorResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

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
          <div className="text-center mb-12">
            <h1 className="text-5xl font-bold text-gray-900 mb-4">
              🎟️ Raffle Calculator
            </h1>
            <p className="text-xl text-gray-600">
              Plan your raffle performance targets with precision
            </p>
          </div>

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
        </div>
      </div>
    </div>
  );
}
