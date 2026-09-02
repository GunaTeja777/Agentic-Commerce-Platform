'use client';

import React from 'react';
import {
  Bot,
  Package,
  TrendingUp,
  ShieldCheck,
  ArrowDown,
  Lock,
  Cpu,
  FileJson,
  CheckCircle2,
  XCircle,
  Sparkles
} from 'lucide-react';

export default function ArchitecturePage() {
  return (
    <div className="space-y-6 pb-12 font-sans">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
          Agentic Commerce Architecture
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          End-to-end architecture: Autonomous agent reasoning decoupled from deterministic policy enforcement &amp; Razorpay payment execution
        </p>
      </div>

      {/* Excalidraw-Inspired Diagram Container */}
      <div className="bg-slate-50/80 border-2 border-dashed border-slate-300 rounded-2xl p-8 shadow-xs space-y-8 font-mono">
        {/* 1. TOP NODE: AI BUYER */}
        <div className="flex flex-col items-center">
          <div className="bg-purple-900 text-white border-2 border-purple-400 rounded-xl px-8 py-3.5 shadow-md text-center max-w-md w-full">
            <div className="flex items-center justify-center gap-2 font-bold text-sm">
              <Bot className="w-5 h-5 text-purple-300" />
              <span>AI BUYER (External Client Agent)</span>
            </div>
            <p className="text-[11px] text-purple-200 mt-1 font-sans">
              Formulates autonomous purchase intent with budget &amp; preference constraints
            </p>
          </div>

          <div className="flex flex-col items-center my-2 text-slate-400">
            <ArrowDown className="w-5 h-5 text-purple-600" />
            <div className="flex items-center gap-1 text-[10px] bg-white px-2.5 py-0.5 rounded border border-purple-300 text-purple-900 font-sans shadow-2xs font-semibold">
              <FileJson className="w-3 h-3 text-purple-600" />
              <span>Structured Purchase Request (A2A JSON)</span>
            </div>
          </div>
        </div>

        {/* 2. MERCHANT AI AGENT & LANGGRAPH ORCHESTRATOR */}
        <div className="flex flex-col items-center">
          <div className="bg-indigo-900 text-white border-2 border-indigo-400 rounded-xl px-8 py-4 shadow-md text-center max-w-lg w-full relative">
            <div className="absolute -top-3 right-4 bg-amber-400 text-slate-950 font-sans font-bold text-[10px] px-2.5 py-0.5 rounded shadow-xs">
              Reasoning &amp; Tool Decider
            </div>
            <div className="flex items-center justify-center gap-2 font-bold text-sm">
              <Cpu className="w-5 h-5 text-indigo-300" />
              <span>MERCHANT AI AGENT (LangGraph Orchestrator)</span>
            </div>
            <p className="text-[11px] text-indigo-200 mt-1 font-sans">
              Coordinates tool invocations, candidate selection, growth opportunities, and buyer interactions
            </p>
          </div>

          <div className="my-3 text-slate-400">
            <ArrowDown className="w-5 h-5 text-indigo-600" />
          </div>
        </div>

        {/* 3. SUB-TOOL LAYER */}
        <div className="max-w-4xl mx-auto">
          <div className="text-center text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">
            Sub-Tool Execution Layer
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Catalog Tool */}
            <div className="bg-white border-2 border-slate-300 rounded-xl p-4 shadow-2xs space-y-2">
              <div className="flex items-center gap-2 font-bold text-xs text-slate-900">
                <Package className="w-4 h-4 text-indigo-600" />
                <span>Catalog Tool</span>
              </div>
              <p className="text-[11px] text-slate-600 font-sans leading-tight">
                Searches Postgres inventory &amp; returns structured product candidates (NovaBook Pro 14 — ₹65,000)
              </p>
              <span className="inline-block text-[10px] bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded font-mono font-semibold">
                Read-Only Catalog
              </span>
            </div>

            {/* Growth Tool */}
            <div className="bg-white border-2 border-slate-300 rounded-xl p-4 shadow-2xs space-y-2">
              <div className="flex items-center gap-2 font-bold text-xs text-slate-900">
                <TrendingUp className="w-4 h-4 text-blue-600" />
                <span>Growth Tool</span>
              </div>
              <p className="text-[11px] text-slate-600 font-sans leading-tight">
                Calculates data-backed cross-sells from merchant co-purchasing data (Wireless Mouse — ₹1,500)
              </p>
              <span className="inline-block text-[10px] bg-blue-50 text-blue-700 px-2 py-0.5 rounded font-mono font-semibold">
                Revenue Optimization
              </span>
            </div>

            {/* Policy Tool */}
            <div className="bg-white border-2 border-purple-400 rounded-xl p-4 shadow-2xs space-y-2 bg-purple-50/40">
              <div className="flex items-center gap-2 font-bold text-xs text-purple-950">
                <ShieldCheck className="w-4 h-4 text-purple-600" />
                <span>Policy Tool</span>
              </div>
              <p className="text-[11px] text-purple-900 font-sans leading-tight">
                Calculates server-side basket total &amp; evaluates ₹70,000 transaction limits deterministically
              </p>
              <span className="inline-block text-[10px] bg-purple-100 text-purple-800 px-2 py-0.5 rounded font-mono font-semibold">
                Fail-Closed Evaluator
              </span>
            </div>
          </div>

          <div className="flex flex-col items-center my-4 text-slate-400">
            <ArrowDown className="w-5 h-5 text-slate-600" />
          </div>
        </div>

        {/* 4. THE POLICY GATE */}
        <div className="flex flex-col items-center">
          <div className="bg-slate-900 text-white border-4 border-amber-400 rounded-2xl p-6 shadow-xl text-center max-w-xl w-full relative">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-amber-400 text-slate-950 font-sans font-extrabold text-[10px] px-3 py-0.5 rounded-full uppercase tracking-wider">
              DETERMINISTIC TRUST BOUNDARY
            </div>
            <div className="flex items-center justify-center gap-2 font-bold text-base text-amber-300">
              <Lock className="w-5 h-5" />
              <span>THE POLICY GATE</span>
            </div>
            <p className="text-xs text-slate-200 mt-2 font-sans">
              Evaluates whether Total $\le$ ₹70,000. The LLM <strong>cannot override</strong> this decision.
            </p>
          </div>
        </div>

        {/* 5. DUAL BRANCHING: ALLOW vs BLOCK */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto pt-2">
          {/* LEFT BRANCH: ALLOW */}
          <div className="bg-emerald-50 border-2 border-emerald-400 rounded-2xl p-6 shadow-sm space-y-4 text-center">
            <div className="flex items-center justify-center gap-2 font-bold text-sm text-emerald-900">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              <span>ALLOW PATH (Total $\le$ ₹70,000)</span>
            </div>

            <div className="space-y-3 font-sans text-xs">
              <div className="bg-white p-3 rounded-lg border border-emerald-200 shadow-2xs">
                <span className="font-bold text-slate-900 block font-mono">1. Payment Tool</span>
                <span className="text-slate-600">Creates DB order &amp; requests Razorpay test order</span>
              </div>

              <div className="bg-white p-3 rounded-lg border border-emerald-200 shadow-2xs">
                <span className="font-bold text-slate-900 block font-mono">2. Razorpay Test Mode</span>
                <span className="text-slate-600">Opens checkout modal &amp; receives payment signature</span>
              </div>

              <div className="bg-white p-3 rounded-lg border border-emerald-200 shadow-2xs">
                <span className="font-bold text-slate-900 block font-mono">3. HMAC Verification</span>
                <span className="text-slate-600">Backend verifies cryptographic HMAC SHA-256</span>
              </div>

              <div className="bg-white p-3 rounded-lg border border-emerald-200 shadow-2xs">
                <span className="font-bold text-emerald-800 block font-mono">4. Transaction Captured</span>
                <span className="text-slate-600">State updated to captured &amp; logged in Audit Trail</span>
              </div>
            </div>
          </div>

          {/* RIGHT BRANCH: BLOCK */}
          <div className="bg-rose-50 border-2 border-rose-400 rounded-2xl p-6 shadow-sm space-y-4 text-center">
            <div className="flex items-center justify-center gap-2 font-bold text-sm text-rose-900">
              <XCircle className="w-5 h-5 text-rose-600" />
              <span>BLOCK PATH (Total &gt; ₹70,000)</span>
            </div>

            <div className="space-y-3 font-sans text-xs">
              <div className="bg-white p-3 rounded-lg border border-rose-200 shadow-2xs">
                <span className="font-bold text-rose-800 block font-mono">1. Payment Tool NOT CALLED</span>
                <span className="text-slate-600">Hard stop at Policy Gate. Zero financial actions.</span>
              </div>

              <div className="bg-white p-3 rounded-lg border border-rose-200 shadow-2xs">
                <span className="font-bold text-slate-900 block font-mono">2. Razorpay API Calls = 0</span>
                <span className="text-slate-600">No payment order created or attempted</span>
              </div>

              <div className="bg-white p-3 rounded-lg border border-rose-200 shadow-2xs">
                <span className="font-bold text-slate-900 block font-mono">3. Rejection Explained</span>
                <span className="text-slate-600">Agent conveys exact limit violation reason</span>
              </div>

              <div className="bg-white p-3 rounded-lg border border-rose-200 shadow-2xs">
                <span className="font-bold text-rose-800 block font-mono">4. Blocked Audit Recorded</span>
                <span className="text-slate-600">Policy block event recorded in PostgreSQL audit log</span>
              </div>
            </div>
          </div>
        </div>

        {/* 6. BOTTOM NODE: RESPONSE TO AI BUYER */}
        <div className="flex flex-col items-center pt-2">
          <div className="my-2 text-slate-400">
            <ArrowDown className="w-5 h-5 text-slate-600" />
          </div>

          <div className="bg-slate-900 text-white border-2 border-slate-700 rounded-xl px-8 py-3.5 shadow-md text-center max-w-md w-full">
            <div className="font-bold text-xs text-emerald-400 flex items-center justify-center gap-2">
              <Sparkles className="w-4 h-4 text-emerald-400" />
              <span>RESPONSE BACK TO AI BUYER</span>
            </div>
            <p className="text-[11px] text-slate-300 font-sans mt-0.5">
              Structured receipt with captured payment or clear deterministic rejection explanation
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

