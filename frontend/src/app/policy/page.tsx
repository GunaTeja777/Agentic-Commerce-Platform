'use client';

import React, { useState, useEffect } from 'react';
import { useCommerce } from '@/context/CommerceContext';
import {
  ShieldAlert,
  Lock,
  CheckCircle2,
  XCircle,
  Sliders,
  Sparkles,
  UserCheck,
  Smartphone
} from 'lucide-react';

export default function PolicyPage() {
  const { policy, updatePolicy, cumulativeSpent } = useCommerce();
  const [maxLimitInput, setMaxLimitInput] = useState(policy.maxTransactionLimit.toString());
  const [approvalThresholdInput, setApprovalThresholdInput] = useState(policy.approvalThreshold.toString());
  const [cumulativeBudgetInput, setCumulativeBudgetInput] = useState((policy.cumulativeBudgetLimit || 50000).toString());
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    setMaxLimitInput(policy.maxTransactionLimit.toString());
    setApprovalThresholdInput(policy.approvalThreshold.toString());
    setCumulativeBudgetInput((policy.cumulativeBudgetLimit || 50000).toString());
  }, [policy.maxTransactionLimit, policy.approvalThreshold, policy.cumulativeBudgetLimit]);

  const handleSaveLimits = (e: React.FormEvent) => {
    e.preventDefault();
    const newMax = Math.max(1000, Number(maxLimitInput) || 70000);
    const newThreshold = Math.max(500, Math.min(newMax, Number(approvalThresholdInput) || 5000));
    const newCumulative = Math.max(1000, Number(cumulativeBudgetInput) || 50000);
    
    updatePolicy({
      maxTransactionLimit: newMax,
      approvalThreshold: newThreshold,
      cumulativeBudgetLimit: newCumulative
    });

    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3500);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
          Policy Engine &amp; Dynamic Governance
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Define deterministic autonomous boundaries and human-in-the-loop approval thresholds.
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
              Deterministic Guardrail Principle
            </span>
            <p className="text-sm font-semibold text-slate-100">
              Policy rules execute deterministically. The LLM suggests products, but cannot bypass transaction limits.
            </p>
          </div>
        </div>
        <div className="px-3 py-1.5 rounded bg-slate-800 border border-slate-700 text-xs font-mono text-emerald-400">
          Guardrail Status: ACTIVE
        </div>
      </div>

      {/* Success Notification */}
      {savedSuccess && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-900 flex items-center justify-between animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="flex items-center gap-2.5 text-xs font-semibold">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span>
              Policy updated! Autonomous Threshold: <strong>₹{Number(approvalThresholdInput).toLocaleString()}</strong> | Maximum Limit: <strong>₹{Number(maxLimitInput).toLocaleString()}</strong>. Active across Live Demo &amp; MCP workflows.
            </span>
          </div>
          <span className="text-[10px] font-mono uppercase bg-emerald-200 text-emerald-900 px-2 py-0.5 rounded font-bold">
            Live
          </span>
        </div>
      )}

      {/* Policy Configuration Card */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-2xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-indigo-600" />
            <h3 className="text-sm font-bold text-slate-900">Merchant Policy Parameters</h3>
          </div>
          <span className="text-xs text-slate-500 font-mono">Dynamic Real-Time Settings</span>
        </div>

        <form onSubmit={handleSaveLimits} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 text-xs">
          <div className="p-3.5 rounded-lg border border-slate-200 bg-slate-50/50 space-y-1.5">
            <label className="block text-slate-800 font-bold">
              Maximum Transaction Limit (₹)
            </label>
            <p className="text-[10px] text-slate-500 leading-tight">
              Absolute ceiling. Any basket exceeding this limit is immediately blocked.
            </p>
            <input
              type="number"
              value={maxLimitInput}
              onChange={(e) => setMaxLimitInput(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
            />
          </div>

          <div className="p-3.5 rounded-lg border border-indigo-200 bg-indigo-50/30 space-y-1.5">
            <label className="block text-indigo-950 font-bold">
              Approval Threshold (₹)
            </label>
            <p className="text-[10px] text-indigo-700 leading-tight">
              Autonomous limit. Below this = Zero-touch auto-buy. Above this = Prompts user for approval.
            </p>
            <input
              type="number"
              value={approvalThresholdInput}
              onChange={(e) => setApprovalThresholdInput(e.target.value)}
              className="w-full px-3 py-2 border border-indigo-300 rounded-lg font-mono font-bold text-indigo-950 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
            />
          </div>

          <div className="p-3.5 rounded-lg border border-slate-200 bg-slate-50/50 space-y-1.5">
            <label className="block text-slate-800 font-bold">Merchant Status</label>
            <p className="text-[10px] text-slate-500 leading-tight">
              Toggle live agent policy enforcement on or off.
            </p>
            <select
              value={policy.status}
              onChange={(e) => updatePolicy({ status: e.target.value as 'Active' | 'Paused' })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg font-medium text-slate-900 focus:outline-none bg-white"
            >
              <option value="Active">Active (Policy Enforced)</option>
              <option value="Paused">Paused (Pass-through)</option>
            </select>
          </div>

          <div className="p-3.5 rounded-lg border border-purple-200 bg-purple-50/40 space-y-1.5">
            <label className="block text-purple-950 font-bold flex items-center gap-1.5">
              <Smartphone className="w-3.5 h-3.5 text-purple-600" />
              <span>Cumulative Monthly Budget (₹)</span>
            </label>
            <p className="text-[10px] text-purple-700 leading-tight">
              Spend velocity ceiling. Crossings trigger mobile push alerts &amp; pause auto-buy.
            </p>
            <input
              type="number"
              value={cumulativeBudgetInput}
              onChange={(e) => setCumulativeBudgetInput(e.target.value)}
              className="w-full px-3 py-2 border border-purple-300 rounded-lg font-mono font-bold text-purple-950 focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white"
            />
          </div>

          <div className="p-3.5 rounded-lg border border-slate-200 bg-slate-50/50 space-y-1.5 flex flex-col justify-between">
            <div>
              <label className="block text-slate-800 font-bold">Catalog Requirement</label>
              <p className="text-[10px] text-slate-500 leading-tight">
                Validates all items exist in live catalog.
              </p>
            </div>
            <div className="h-9 px-3 border border-emerald-200 rounded-lg bg-emerald-50 flex items-center justify-between text-emerald-900 font-bold">
              <span>Catalog Verification</span>
              <span className="text-emerald-700">✓ Enforced</span>
            </div>
          </div>

          <div className="lg:col-span-4 flex justify-between items-center pt-2 border-t border-slate-100">
            <div className="text-xs text-slate-600 flex items-center gap-2">
              <span className="font-medium">Current Monthly Spend:</span>
              <span className="font-mono font-bold text-slate-900">₹{(cumulativeSpent || 0).toLocaleString()}</span>
              <span className="text-slate-400">/</span>
              <span className="font-mono font-bold text-purple-700">₹{(policy.cumulativeBudgetLimit || 50000).toLocaleString()}</span>
            </div>
            <button
              type="submit"
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 active:scale-[0.99] text-white font-bold rounded-lg shadow-sm transition-all cursor-pointer"
            >
              Save &amp; Update Policy Rules
            </button>
          </div>
        </form>
      </div>

      {/* 3-TIER AGENTIC GOVERNANCE COMPARISON */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-indigo-600" />
            <h2 className="text-lg font-bold text-slate-900">3-Tier Autonomous Governance Architecture</h2>
          </div>
          <span className="text-xs text-slate-500">Live dynamic evaluation</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* TIER 1: ZERO-TOUCH AUTONOMOUS */}
          <div className="bg-white rounded-xl border-2 border-emerald-400 p-5 shadow-sm space-y-4 relative overflow-hidden flex flex-col justify-between">
            <div className="absolute top-0 right-0 bg-emerald-600 text-white text-[9px] font-bold px-2.5 py-0.5 rounded-bl-lg uppercase tracking-wider">
              Tier 1
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900">Zero-Touch Autonomous</h3>
                  <p className="text-[11px] text-slate-500">Amount &le; ₹{policy.approvalThreshold.toLocaleString()}</p>
                </div>
              </div>

              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500">Spending Rule:</span>
                  <span className="font-bold text-emerald-700 font-mono">&le; ₹{policy.approvalThreshold.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Human Approval:</span>
                  <span className="font-bold text-slate-700 font-mono">Not Required</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Action:</span>
                  <span className="font-bold text-emerald-700">Auto-Order on MCP</span>
                </div>
              </div>
            </div>

            <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 text-xs space-y-1 text-emerald-900">
              <div className="font-bold text-[11px]">Execution Behavior:</div>
              <p className="text-[11px] leading-relaxed text-emerald-800">
                AI Agent automatically books the order directly on the store website via MCP without waiting for human clicks.
              </p>
            </div>
          </div>

          {/* TIER 2: HUMAN-IN-THE-LOOP APPROVAL */}
          <div className="bg-white rounded-xl border-2 border-indigo-400 p-5 shadow-sm space-y-4 relative overflow-hidden flex flex-col justify-between">
            <div className="absolute top-0 right-0 bg-indigo-600 text-white text-[9px] font-bold px-2.5 py-0.5 rounded-bl-lg uppercase tracking-wider">
              Tier 2
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold">
                  <UserCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900">Human Approval Required</h3>
                  <p className="text-[11px] text-slate-500">₹{policy.approvalThreshold.toLocaleString()} to ₹{policy.maxTransactionLimit.toLocaleString()}</p>
                </div>
              </div>

              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500">Spending Rule:</span>
                  <span className="font-bold text-indigo-700 font-mono">&gt; Threshold</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Human Approval:</span>
                  <span className="font-bold text-indigo-700 font-mono">Explicit Required</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Action:</span>
                  <span className="font-bold text-indigo-700">Pauses for User Click</span>
                </div>
              </div>
            </div>

            <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-3 text-xs space-y-1 text-indigo-900">
              <div className="font-bold text-[11px]">Execution Behavior:</div>
              <p className="text-[11px] leading-relaxed text-indigo-800">
                Agent pauses in the Transaction box, displaying an &quot;Approve &amp; Place Order&quot; button before money can move.
              </p>
            </div>
          </div>

          {/* TIER 3: HARD POLICY BLOCK */}
          <div className="bg-white rounded-xl border-2 border-rose-400 p-5 shadow-sm space-y-4 relative overflow-hidden flex flex-col justify-between">
            <div className="absolute top-0 right-0 bg-rose-600 text-white text-[9px] font-bold px-2.5 py-0.5 rounded-bl-lg uppercase tracking-wider">
              Tier 3
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-full bg-rose-100 text-rose-700 flex items-center justify-center font-bold">
                  <XCircle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900">Hard Policy Block</h3>
                  <p className="text-[11px] text-slate-500">Amount &gt; ₹{policy.maxTransactionLimit.toLocaleString()}</p>
                </div>
              </div>

              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500">Spending Rule:</span>
                  <span className="font-bold text-rose-700 font-mono">&gt; Max Limit</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Payment Calls:</span>
                  <span className="font-bold text-rose-700 font-mono">0 (Blocked)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Audit Status:</span>
                  <span className="font-bold text-rose-700">Violation Logged</span>
                </div>
              </div>
            </div>

            <div className="bg-rose-50 border border-rose-200 rounded-lg p-3 text-xs space-y-1 text-rose-900">
              <div className="font-bold text-[11px]">Execution Behavior:</div>
              <p className="text-[11px] leading-relaxed text-rose-800">
                Payment tool call is rejected by deterministic gate. Zero Razorpay / MCP checkout calls allowed.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
