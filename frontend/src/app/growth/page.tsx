'use client';

import React from 'react';
import { useCommerce } from '@/context/CommerceContext';
import { formatINR } from '@/lib/format';
import {
  ArrowRight,
  Database,
  ToggleLeft,
  ToggleRight
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend
} from 'recharts';

const GROWTH_CHART_DATA = [
  { category: 'Laptops', standardRevenue: 65000, upsellRevenue: 12500 },
  { category: 'Accessories', standardRevenue: 18000, upsellRevenue: 8500 },
  { category: 'Peripherals', standardRevenue: 24000, upsellRevenue: 9800 },
  { category: 'Monitors', standardRevenue: 42000, upsellRevenue: 11700 }
];

export default function GrowthPage() {
  const { growthOpportunities, toggleGrowthOpportunity, transactions } = useCommerce();

  const capturedTxns = transactions.filter(t => t.paymentStatus === 'Captured' || t.paymentStatus === 'Successful');
  const upsellTxns = capturedTxns.filter(t => (t.upsellTotal || 0) > 0);
  const conversionRate = capturedTxns.length > 0 ? ((upsellTxns.length / capturedTxns.length) * 100).toFixed(1) : '68.4';
  const dynamicUpsellRevenue = capturedTxns.reduce((sum, t) => sum + (t.upsellTotal || 0), 0);
  const displayAiRevenue = dynamicUpsellRevenue > 0 ? dynamicUpsellRevenue : 42500;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Growth Engine</h1>
          <p className="text-sm text-slate-500 mt-1">
            Data-driven upsell and cross-sell opportunities backed by merchant catalog relationship rules
          </p>
        </div>
        <div>
          <span className="px-3 py-1 rounded-md text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300 shadow-2xs font-mono">
            Test Mode Metrics
          </span>
        </div>
      </div>

      {/* Critical Principle Notice */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start gap-3 text-xs text-blue-900 shadow-2xs">
        <Database className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
        <div>
          <h3 className="font-bold text-blue-950 text-sm">Deterministic Data-Backed Intelligence</h3>
          <p className="mt-0.5 text-blue-800 leading-relaxed">
            Recommendations do <strong>not</strong> rely on speculative AI guessing. Every cross-sell offer presented by your agent stems from hard merchant catalog relationships, stock validation, and historical co-purchase correlation.
          </p>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs space-y-2">
          <span className="text-xs font-semibold text-slate-500">AI-assisted revenue</span>
          <div className="text-2xl font-bold text-slate-900" suppressHydrationWarning>₹{formatINR(displayAiRevenue)}</div>
          <p className="text-[11px] text-emerald-600 font-medium">Generated via agent growth tool</p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs space-y-2">
          <span className="text-xs font-semibold text-slate-500">Upsell Conversion Rate</span>
          <div className="text-2xl font-bold text-slate-900">{conversionRate}%</div>
          <p className="text-[11px] text-emerald-600 font-medium">Acceptance rate on add-on recommendations</p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs space-y-2">
          <span className="text-xs font-semibold text-slate-500">Average Basket Uplift</span>
          <div className="text-2xl font-bold text-indigo-700">+₹1,500 / order</div>
          <p className="text-[11px] text-indigo-600 font-medium">+21.4% increase over standard checkout</p>
        </div>
      </div>

      {/* Upsell Opportunities Grid */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-900">Configured Upsell Opportunities</h2>
          <span className="text-xs text-slate-500 font-mono">
            {growthOpportunities.filter((g) => g.enabled).length} Active Rules
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {growthOpportunities.map((opp) => (
            <div
              key={opp.id}
              className={`bg-white p-5 rounded-xl border transition-all shadow-2xs space-y-4 ${
                opp.enabled ? 'border-slate-200 hover:border-indigo-300' : 'border-slate-200 opacity-60'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
                  <span>{opp.mainProductName}</span>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                  <span className="text-indigo-600">{opp.recommendedProductName}</span>
                </div>
                <button
                  onClick={() => toggleGrowthOpportunity(opp.id)}
                  className="text-slate-500 hover:text-indigo-600 transition-colors"
                >
                  {opp.enabled ? (
                    <ToggleRight className="w-6 h-6 text-indigo-600" />
                  ) : (
                    <ToggleLeft className="w-6 h-6 text-slate-400" />
                  )}
                </button>
              </div>

              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs space-y-1.5">
                <div className="flex justify-between text-slate-600">
                  <span>Reasoning:</span>
                  <span className="font-semibold text-slate-900">{opp.reason}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Price:</span>
                  <span className="font-mono font-bold text-slate-900">₹{opp.price.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Stock Availability:</span>
                  <span className="font-mono text-emerald-700 font-bold">{opp.stock} in stock</span>
                </div>
              </div>

              <div className="text-[11px] text-slate-500 border-t border-slate-100 pt-2 flex items-center justify-between">
                <span>Proof: {opp.dataProof}</span>
                <span className="font-mono font-bold text-indigo-700">
                  {(opp.confidenceScore * 100).toFixed(0)}% Score
                </span>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <button className="flex-1 py-1.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition-colors">
                  View Data Trace
                </button>
                <button
                  onClick={() => toggleGrowthOpportunity(opp.id)}
                  className={`py-1.5 px-3 text-xs font-semibold rounded-lg transition-colors ${
                    opp.enabled
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : 'bg-indigo-600 text-white'
                  }`}
                >
                  {opp.enabled ? 'Enabled' : 'Enable'}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Revenue Impact Chart (Recharts) */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-2xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Growth Engine Revenue Contribution</h3>
            <p className="text-xs text-slate-500">
              Breakdown of standard basket revenue vs growth tool upsell contribution
            </p>
          </div>
        </div>

        <div className="h-64 w-full pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={GROWTH_CHART_DATA}>
              <XAxis dataKey="category" stroke="#94a3b8" fontSize={12} tickLine={false} />
              <YAxis
                stroke="#94a3b8"
                fontSize={12}
                tickLine={false}
                tickFormatter={(v) => `₹${v / 1000}k`}
              />
              <Tooltip
                formatter={(val: unknown) => [`₹${Number(val).toLocaleString()}`, '']}
                contentStyle={{ backgroundColor: '#1e293b', color: '#fff', borderRadius: '8px' }}
              />
              <Legend wrapperStyle={{ fontSize: '12px' }} />
              <Bar dataKey="standardRevenue" name="Base Basket Revenue" fill="#cbd5e1" radius={[4, 4, 0, 0]} />
              <Bar dataKey="upsellRevenue" name="Growth Tool Upsell Revenue" fill="#4f46e5" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
