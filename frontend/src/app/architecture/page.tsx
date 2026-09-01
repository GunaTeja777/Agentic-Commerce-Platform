'use client';

import React from 'react';
import {
  Bot,
  Package,
  TrendingUp,
  ShieldCheck,
  CreditCard,
  History,
  ArrowDown,
  Lock,
  Cpu
} from 'lucide-react';

export default function ArchitecturePage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
          Agentic Commerce Architecture
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Conceptual architecture illustrating autonomous agent reasoning decoupled from deterministic policy enforcement
        </p>
      </div>

      {/* Excalidraw / Diagram Visual Box */}
      <div className="bg-slate-50 border-2 border-dashed border-slate-300 rounded-2xl p-8 shadow-xs space-y-8 font-mono">
        {/* Top Node: AI Buyer */}
        <div className="flex flex-col items-center">
          <div className="bg-purple-900 text-white border-2 border-purple-400 rounded-xl px-6 py-3 shadow-md text-center max-w-sm w-full">
            <div className="flex items-center justify-center gap-2 font-bold text-sm">
              <Bot className="w-5 h-5 text-purple-300" />
              <span>AI BUYER (External Agent)</span>
            </div>
            <p className="text-[11px] text-purple-200 mt-1 font-sans">
              Sends autonomous purchase requests on buyer&apos;s behalf
            </p>
          </div>

          <div className="flex flex-col items-center my-2 text-slate-400">
            <ArrowDown className="w-5 h-5 animate-bounce" />
            <span className="text-[10px] bg-white px-2 py-0.5 rounded border border-slate-300 text-slate-600 font-sans">
              Purchase Request payload
            </span>
          </div>
        </div>

        {/* Node 2: Merchant AI Agent Orchestrator */}
        <div className="flex flex-col items-center">
          <div className="bg-indigo-900 text-white border-2 border-indigo-400 rounded-xl px-8 py-4 shadow-md text-center max-w-md w-full relative">
            <div className="absolute -top-3 right-4 bg-amber-400 text-slate-950 font-sans font-bold text-[10px] px-2 py-0.5 rounded">
              &quot;Decides next action&quot;
            </div>
            <div className="flex items-center justify-center gap-2 font-bold text-sm">
              <Cpu className="w-5 h-5 text-indigo-300" />
              <span>MERCHANT AI AGENT / ORCHESTRATOR</span>
            </div>
            <p className="text-[11px] text-indigo-200 mt-1 font-sans">
              LangGraph orchestration evaluating intent &amp; tools needed
            </p>
          </div>

          <div className="my-3 text-slate-400">
            <ArrowDown className="w-5 h-5" />
          </div>
        </div>

        {/* Node 3: Tools Grid */}
        <div className="max-w-4xl mx-auto">
          <div className="text-center text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">
            Sub-Tool Execution Layer
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Catalog Tool */}
            <div className="bg-white border-2 border-slate-300 rounded-xl p-4 shadow-2xs space-y-2 relative">
              <div className="flex items-center gap-2 font-bold text-xs text-slate-900">
                <Package className="w-4 h-4 text-indigo-600" />
                <span>Catalog Tool</span>
              </div>
              <p className="text-[11px] text-slate-600 font-sans leading-tight">
                &quot;Reads product data &amp; checks inventory stock&quot;
              </p>
              <span className="inline-block text-[10px] bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded font-mono font-semibold">
                Read-Only
              </span>
            </div>

            {/* Growth Tool */}
            <div className="bg-white border-2 border-slate-300 rounded-xl p-4 shadow-2xs space-y-2 relative">
              <div className="flex items-center gap-2 font-bold text-xs text-slate-900">
                <TrendingUp className="w-4 h-4 text-blue-600" />
                <span>Growth Tool</span>
              </div>
              <p className="text-[11px] text-slate-600 font-sans leading-tight">
                &quot;Finds data-backed cross-sell / upsell pairs&quot;
              </p>
              <span className="inline-block text-[10px] bg-blue-50 text-blue-700 px-2 py-0.5 rounded font-mono font-semibold">
                Revenue Boost
              </span>
            </div>

            {/* Policy Tool */}
            <div className="bg-white border-2 border-purple-400 rounded-xl p-4 shadow-2xs space-y-2 relative bg-purple-50/40">
              <div className="flex items-center gap-2 font-bold text-xs text-purple-950">
                <ShieldCheck className="w-4 h-4 text-purple-600" />
                <span>Policy Tool</span>
              </div>
              <p className="text-[11px] text-purple-900 font-sans leading-tight">
                &quot;Deterministic limit &amp; merchant rule check&quot;
              </p>
              <span className="inline-block text-[10px] bg-purple-100 text-purple-800 px-2 py-0.5 rounded font-mono font-semibold">
                Non-LLM Rule
              </span>
            </div>

            {/* Payment Tool */}
            <div className="bg-white border-2 border-emerald-400 rounded-xl p-4 shadow-2xs space-y-2 relative bg-emerald-50/40">
              <div className="flex items-center gap-2 font-bold text-xs text-emerald-950">
                <CreditCard className="w-4 h-4 text-emerald-600" />
                <span>Payment Tool</span>
              </div>
              <p className="text-[11px] text-emerald-900 font-sans leading-tight">
                &quot;Calls Razorpay test payment API&quot;
              </p>
              <span className="inline-block text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded font-mono font-semibold">
                Executes Money
              </span>
            </div>
          </div>

          <div className="flex flex-col items-center my-4 text-slate-400">
            <ArrowDown className="w-5 h-5" />
          </div>
        </div>

        {/* Node 4: THE POLICY GATE (Deterministic Gateway) */}
        <div className="flex flex-col items-center">
          <div className="bg-rose-950 text-white border-4 border-rose-500 rounded-2xl p-6 shadow-xl text-center max-w-xl w-full relative">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-rose-500 text-white font-sans font-extrabold text-[10px] px-3 py-0.5 rounded-full uppercase tracking-wider">
              CRITICAL GATEKEEPER
            </div>
            <div className="flex items-center justify-center gap-2 font-bold text-base text-rose-300">
              <Lock className="w-5 h-5" />
              <span>THE POLICY GATE (DETERMINISTIC ENGINE)</span>
            </div>
            <p className="text-xs text-slate-200 mt-2 font-sans">
              Evaluates if amount ≤ ₹70,000 max limit. If BLOCKED, Payment Tool is <strong>NEVER CALLED</strong>.
            </p>
          </div>

          <div className="my-3 text-slate-400">
            <ArrowDown className="w-5 h-5" />
          </div>
        </div>

        {/* Node 5: Razorpay Test API & Audit Log */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl mx-auto">
          <div className="bg-white border-2 border-emerald-500 rounded-xl p-4 shadow-sm text-center space-y-1">
            <div className="font-bold text-xs text-slate-900 flex items-center justify-center gap-1.5">
              <CreditCard className="w-4 h-4 text-emerald-600" />
              <span>Razorpay Test API</span>
            </div>
            <p className="text-[11px] text-slate-500 font-sans">Executes test payment order</p>
          </div>

          <div className="bg-white border-2 border-amber-500 rounded-xl p-4 shadow-sm text-center space-y-1">
            <div className="font-bold text-xs text-slate-900 flex items-center justify-center gap-1.5">
              <History className="w-4 h-4 text-amber-600" />
              <span>Audit &amp; Explanation</span>
            </div>
            <p className="text-[11px] text-slate-500 font-sans">Logs who, what, when, why</p>
          </div>
        </div>

        {/* Bottom Node: Response to AI Buyer */}
        <div className="flex flex-col items-center pt-2">
          <div className="bg-slate-900 text-white border-2 border-slate-700 rounded-xl px-6 py-3 shadow-md text-center max-w-sm w-full">
            <div className="font-bold text-xs text-emerald-400">
              RESPONSE BACK TO AI BUYER
            </div>
            <p className="text-[11px] text-slate-300 font-sans mt-0.5">
              Returns order confirmation or exact policy rejection reason
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
