'use client';

import React from 'react';
import { useCommerce } from '@/context/CommerceContext';
import {
  TrendingUp,
  DollarSign,
  ShoppingCart,
  ShieldCheck,
  ArrowUpRight,
  Sparkles,
  ChevronRight
} from 'lucide-react';
import Link from 'next/link';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip
} from 'recharts';

const CHART_DATA = [
  { day: 'Mon', normal: 12000, aiAssisted: 18500 },
  { day: 'Tue', normal: 15000, aiAssisted: 22400 },
  { day: 'Wed', normal: 11000, aiAssisted: 19800 },
  { day: 'Thu', normal: 14500, aiAssisted: 24000 },
  { day: 'Fri', normal: 18000, aiAssisted: 31000 },
  { day: 'Sat', normal: 22000, aiAssisted: 38500 },
  { day: 'Sun', normal: 19000, aiAssisted: 34200 }
];

export default function OverviewPage() {
  const { policy } = useCommerce();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
          Good morning, Demo Merchant
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Your AI agent is helping buyers discover, purchase and transact safely.
        </p>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Test Revenue */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Total Test Revenue</span>
            <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-bold text-slate-900">₹1,24,500</div>
            <div className="flex items-center gap-1 text-[11px] font-medium text-emerald-600 mt-1">
              <ArrowUpRight className="w-3.5 h-3.5" />
              <span>+18.4% from last week</span>
            </div>
          </div>
        </div>

        {/* AI-assisted Revenue */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">AI-assisted Revenue</span>
            <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600">
              <Sparkles className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-bold text-slate-900">₹42,500</div>
            <div className="flex items-center gap-1 text-[11px] font-medium text-emerald-600 mt-1">
              <ArrowUpRight className="w-3.5 h-3.5" />
              <span>34.1% of total sales</span>
            </div>
          </div>
        </div>

        {/* Upsell Revenue */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Upsell Revenue</span>
            <div className="p-2 rounded-lg bg-blue-50 text-blue-600">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-bold text-slate-900">₹8,500</div>
            <div className="flex items-center gap-1 text-[11px] font-medium text-emerald-600 mt-1">
              <ArrowUpRight className="w-3.5 h-3.5" />
              <span>+₹1,500 avg per cross-sell</span>
            </div>
          </div>
        </div>

        {/* Average Order Value */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Average Order Value</span>
            <div className="p-2 rounded-lg bg-purple-50 text-purple-600">
              <ShoppingCart className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-bold text-slate-900">₹5,100</div>
            <div className="flex items-center gap-1 text-[11px] font-medium text-purple-600 mt-1">
              <span>+₹900 vs normal basket</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Charts & Overview Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Recharts Revenue Chart */}
        <div className="lg:col-span-2 bg-white p-6 rounded-xl border border-slate-200 shadow-2xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Revenue from AI-assisted commerce
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Comparison of standard purchases vs merchant AI growth agent assisted transactions
              </p>
            </div>
            <div className="flex items-center gap-4 text-xs">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-slate-300" />
                <span className="text-slate-600">Normal</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-indigo-600" />
                <span className="font-semibold text-indigo-700">AI-Assisted</span>
              </div>
            </div>
          </div>

          <div className="h-64 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={CHART_DATA}>
                <defs>
                  <linearGradient id="colorAi" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#4f46e5" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="day" stroke="#94a3b8" fontSize={12} tickLine={false} />
                <YAxis
                  stroke="#94a3b8"
                  fontSize={12}
                  tickLine={false}
                  tickFormatter={(v) => `₹${v / 1000}k`}
                />
                <Tooltip
                  formatter={(value: unknown) => [`₹${Number(value).toLocaleString()}`, '']}
                  contentStyle={{ backgroundColor: '#1e293b', borderRadius: '8px', color: '#fff' }}
                />
                <Area
                  type="monotone"
                  dataKey="aiAssisted"
                  stroke="#4f46e5"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorAi)"
                  name="AI-Assisted Revenue"
                />
                <Area
                  type="monotone"
                  dataKey="normal"
                  stroke="#cbd5e1"
                  strokeWidth={2}
                  fill="transparent"
                  name="Normal Revenue"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Basket comparison summary bar */}
          <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 flex flex-wrap items-center justify-between text-xs gap-3">
            <span className="text-slate-600 font-medium">Average Order Size Comparison:</span>
            <div className="flex items-center gap-6">
              <div>
                Normal basket: <span className="font-bold text-slate-800">₹4,200</span>
              </div>
              <div className="h-4 w-px bg-slate-300" />
              <div>
                AI-assisted basket: <span className="font-bold text-indigo-700">₹5,100</span>
              </div>
              <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-semibold text-[10px]">
                +21.4% Basket Uplift
              </span>
            </div>
          </div>
        </div>

        {/* Right: Policy Status Card */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-2xs space-y-5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-600" />
              <h3 className="text-sm font-bold text-slate-900">Policy Status</h3>
            </div>
            <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
              Active
            </span>
          </div>

          <p className="text-xs text-slate-500">
            Deterministic limits enforced on every transaction before Razorpay payments are initialized.
          </p>

          <div className="space-y-3 divide-y divide-slate-100 text-xs">
            <div className="pt-2 flex justify-between items-center">
              <span className="text-slate-500">Maximum transaction:</span>
              <span className="font-mono font-bold text-slate-900">₹{policy.maxTransactionLimit.toLocaleString()}</span>
            </div>
            <div className="pt-3 flex justify-between items-center">
              <span className="text-slate-500">Approval required above:</span>
              <span className="font-mono font-bold text-slate-900">₹{policy.approvalThreshold.toLocaleString()}</span>
            </div>
            <div className="pt-3 flex justify-between items-center">
              <span className="text-slate-500">Merchant status:</span>
              <span className="font-semibold text-emerald-600">{policy.status}</span>
            </div>
            <div className="pt-3 flex justify-between items-center">
              <span className="text-slate-500">Catalog required:</span>
              <span className="font-semibold text-slate-800">{policy.catalogRequired ? 'Yes' : 'No'}</span>
            </div>
          </div>

          <div className="pt-2">
            <Link
              href="/policy"
              className="w-full flex items-center justify-center gap-1.5 py-2.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition-colors"
            >
              <span>Configure Policy & Limits</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>

      {/* Agent Activity Timeline Section */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-2xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Agent Activity Timeline</h3>
            <p className="text-xs text-slate-500">
              Live step-by-step trace of AI buyer requests and tool execution
            </p>
          </div>
          <Link
            href="/activity"
            className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold flex items-center gap-1"
          >
            <span>View Execution Engine</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="relative pl-6 space-y-4 border-l-2 border-slate-200 py-1 text-xs">
          <div className="relative">
            <span className="absolute -left-[31px] top-0.5 w-3 h-3 rounded-full bg-indigo-600 ring-4 ring-white" />
            <div className="flex flex-wrap items-center gap-3">
              <span className="font-mono text-slate-400">09:42:01</span>
              <span className="font-semibold text-slate-800">Buyer request received</span>
              <span className="text-slate-500 font-mono text-[11px]">&quot;I need a laptop for work under ₹70,000...&quot;</span>
            </div>
          </div>

          <div className="relative">
            <span className="absolute -left-[31px] top-0.5 w-3 h-3 rounded-full bg-indigo-500 ring-4 ring-white" />
            <div className="flex flex-wrap items-center gap-3">
              <span className="font-mono text-slate-400">09:42:02</span>
              <span className="font-semibold text-slate-800">Catalog searched</span>
              <span className="text-slate-500">Query matched Electronics category</span>
            </div>
          </div>

          <div className="relative">
            <span className="absolute -left-[31px] top-0.5 w-3 h-3 rounded-full bg-indigo-500 ring-4 ring-white" />
            <div className="flex flex-wrap items-center gap-3">
              <span className="font-mono text-slate-400">09:42:03</span>
              <span className="font-semibold text-slate-800">Laptop selected</span>
              <span className="font-bold text-slate-900">Laptop A (₹65,000)</span>
            </div>
          </div>

          <div className="relative">
            <span className="absolute -left-[31px] top-0.5 w-3 h-3 rounded-full bg-blue-500 ring-4 ring-white" />
            <div className="flex flex-wrap items-center gap-3">
              <span className="font-mono text-slate-400">09:42:04</span>
              <span className="font-semibold text-slate-800">Growth opportunity found</span>
              <span className="text-blue-700 bg-blue-50 px-2 py-0.5 rounded font-mono">Wireless Mouse (+₹1,500)</span>
            </div>
          </div>

          <div className="relative">
            <span className="absolute -left-[31px] top-0.5 w-3 h-3 rounded-full bg-blue-600 ring-4 ring-white" />
            <div className="flex flex-wrap items-center gap-3">
              <span className="font-mono text-slate-400">09:42:07</span>
              <span className="font-semibold text-slate-800">Buyer accepted recommendation</span>
              <span className="text-slate-600">Basket subtotal updated to ₹66,500</span>
            </div>
          </div>

          <div className="relative">
            <span className="absolute -left-[31px] top-0.5 w-3 h-3 rounded-full bg-emerald-500 ring-4 ring-white" />
            <div className="flex flex-wrap items-center gap-3">
              <span className="font-mono text-slate-400">09:42:08</span>
              <span className="font-semibold text-emerald-700">Policy approved</span>
              <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-semibold">
                Total ₹66,500 ≤ ₹70,000 limit
              </span>
            </div>
          </div>

          <div className="relative">
            <span className="absolute -left-[31px] top-0.5 w-3 h-3 rounded-full bg-emerald-600 ring-4 ring-white" />
            <div className="flex flex-wrap items-center gap-3">
              <span className="font-mono text-slate-400">09:42:09</span>
              <span className="font-semibold text-slate-800">Razorpay test order created</span>
              <span className="font-mono text-slate-500 text-[11px]">order_123</span>
            </div>
          </div>

          <div className="relative">
            <span className="absolute -left-[31px] top-0.5 w-3 h-3 rounded-full bg-emerald-700 ring-4 ring-white" />
            <div className="flex flex-wrap items-center gap-3">
              <span className="font-mono text-slate-400">09:42:15</span>
              <span className="font-semibold text-emerald-800">Payment successful</span>
              <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-mono font-bold text-[10px]">
                pay_Nz82XyL19aK001
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
