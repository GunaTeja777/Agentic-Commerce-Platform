'use client';

import React, { useState } from 'react';
import { useCommerce } from '@/context/CommerceContext';
import {
  ShieldAlert,
  Lock,
  CheckCircle2,
  XCircle,
  ArrowRight,
  Sliders
} from 'lucide-react';

export default function PolicyPage() {
  const { policy, updatePolicy } = useCommerce();
  const [maxLimitInput, setMaxLimitInput] = useState(policy.maxTransactionLimit.toString());
  const [approvalThresholdInput, setApprovalThresholdInput] = useState(policy.approvalThreshold.toString());

  const handleSaveLimits = (e: React.FormEvent) => {
    e.preventDefault();
    updatePolicy({
      maxTransactionLimit: Number(maxLimitInput),
      approvalThreshold: Number(approvalThresholdInput)
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
          Policy Engine & Transaction Limits
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          The AI can recommend actions, but it cannot override these rules.
        </p>
      </div>

      {/* Core Principle Alert */}
      <div className="bg-slate-900 text-white p-5 rounded-xl border border-slate-800 shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-emerald-600 text-white">
            <Lock className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs font-bold text-amber-400 uppercase tracking-wider block">
              Core Security Principle
            </span>
            <p className="text-sm font-semibold text-slate-100">
              Policy decisions are 100% deterministic and are NOT decided by the LLM.
            </p>
          </div>
        </div>
        <div className="px-3 py-1.5 rounded bg-slate-800 border border-slate-700 text-xs font-mono text-emerald-400">
          Guardrail Status: ACTIVE
        </div>
      </div>

      {/* Policy Configuration Card */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-2xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-indigo-600" />
            <h3 className="text-sm font-bold text-slate-900">Merchant Policy Parameters</h3>
          </div>
          <span className="text-xs text-slate-500 font-mono">Live Configuration</span>
        </div>

        <form onSubmit={handleSaveLimits} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
          <div>
            <label className="block text-slate-600 font-semibold mb-1">
              Maximum Transaction Limit (₹)
            </label>
            <input
              type="number"
              value={maxLimitInput}
              onChange={(e) => setMaxLimitInput(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-slate-600 font-semibold mb-1">
              Approval Threshold (₹)
            </label>
            <input
              type="number"
              value={approvalThresholdInput}
              onChange={(e) => setApprovalThresholdInput(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-slate-600 font-semibold mb-1">Merchant Status</label>
            <select
              value={policy.status}
              onChange={(e) => updatePolicy({ status: e.target.value as 'Active' | 'Paused' })}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg font-medium text-slate-900 focus:outline-none"
            >
              <option value="Active">Active</option>
              <option value="Paused">Paused</option>
            </select>
          </div>

          <div>
            <label className="block text-slate-600 font-semibold mb-1">Catalog Requirement</label>
            <div className="h-9 px-3 border border-slate-200 rounded-lg bg-slate-50 flex items-center justify-between text-slate-700 font-medium">
              <span>Catalog Verification Required</span>
              <span className="font-bold text-emerald-600">Yes</span>
            </div>
          </div>

          <div className="lg:col-span-4 flex justify-end">
            <button
              type="submit"
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg shadow-xs transition-colors"
            >
              Update Policy Rules
            </button>
          </div>
        </form>
      </div>

      {/* THE GATE: Side-by-Side Comparison Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-indigo-600" />
            <h2 className="text-lg font-bold text-slate-900">THE GATE — Policy Enforcement Comparison</h2>
          </div>
          <span className="text-xs text-slate-500">Side-by-side execution trace</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* SCENARIO 1: ALLOWED */}
          <div className="bg-white rounded-xl border-2 border-emerald-300 p-6 shadow-sm space-y-5 relative overflow-hidden">
            <div className="absolute top-0 right-0 bg-emerald-600 text-white text-[10px] font-bold px-3 py-1 rounded-bl-lg uppercase tracking-wider">
              Scenario A: Valid
            </div>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-base text-slate-900">ALLOWED TRANSACTION</h3>
                <p className="text-xs text-slate-500">Order total is within merchant policy boundary</p>
              </div>
            </div>

            <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 space-y-3 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Purchase Total:</span>
                <span className="font-mono font-bold text-slate-900 text-sm">₹66,500</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Policy Limit:</span>
                <span className="font-mono font-bold text-slate-700">Maximum ₹{policy.maxTransactionLimit.toLocaleString()}</span>
              </div>
              <div className="pt-2 border-t border-slate-200 flex justify-between items-center">
                <span className="text-slate-500">Policy Result:</span>
                <span className="px-2.5 py-1 rounded bg-emerald-100 text-emerald-800 font-bold text-xs">
                  ✓ ALLOWED
                </span>
              </div>
            </div>

            <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 text-xs space-y-2 text-emerald-900">
              <div className="font-bold text-emerald-800">Action Executed:</div>
              <div className="flex items-center gap-2 font-mono font-semibold text-emerald-950">
                <ArrowRight className="w-4 h-4 text-emerald-600" />
                <span>Proceed to Razorpay Payment API</span>
              </div>
              <p className="text-[11px] text-emerald-700">
                Test order order_123 successfully initialized and payment authorized.
              </p>
            </div>
          </div>

          {/* SCENARIO 2: BLOCKED */}
          <div className="bg-white rounded-xl border-2 border-rose-300 p-6 shadow-sm space-y-5 relative overflow-hidden">
            <div className="absolute top-0 right-0 bg-rose-600 text-white text-[10px] font-bold px-3 py-1 rounded-bl-lg uppercase tracking-wider">
              Scenario B: Violation
            </div>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-rose-100 text-rose-700 flex items-center justify-center font-bold">
                <XCircle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-base text-slate-900">BLOCKED TRANSACTION</h3>
                <p className="text-xs text-slate-500">Order total exceeds merchant policy boundary</p>
              </div>
            </div>

            <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 space-y-3 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Purchase Total:</span>
                <span className="font-mono font-bold text-rose-700 text-sm">₹75,000</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Policy Limit:</span>
                <span className="font-mono font-bold text-slate-700">Maximum ₹{policy.maxTransactionLimit.toLocaleString()}</span>
              </div>
              <div className="pt-2 border-t border-slate-200 flex justify-between items-center">
                <span className="text-slate-500">Policy Result:</span>
                <span className="px-2.5 py-1 rounded bg-rose-600 text-white font-bold text-xs">
                  ✕ BLOCKED
                </span>
              </div>
            </div>

            <div className="bg-rose-50 border border-rose-200 rounded-lg p-4 text-xs space-y-2 text-rose-900">
              <div className="font-bold text-rose-800">Action Executed:</div>
              <div className="flex items-center gap-2 font-mono font-semibold text-rose-950">
                <XCircle className="w-4 h-4 text-rose-600" />
                <span>Razorpay will NOT be called</span>
              </div>
              <p className="text-[11px] text-rose-700">
                Razorpay API calls count: <strong>0</strong>. Audit log updated with rejection reason.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
