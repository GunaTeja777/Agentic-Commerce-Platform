'use client';

import React, { useState } from 'react';
import { useCommerce } from '@/context/CommerceContext';
import {
  Activity,
  Cpu,
  Package,
  TrendingUp,
  ShieldCheck,
  CreditCard,
  Clock,
  Info,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

export default function AgentActivityPage() {
  const { agentEvents } = useCommerce();
  const [expandedId, setExpandedId] = useState<string | null>('evt_4');

  const toolIconMap = {
    ORCHESTRATOR: Cpu,
    'CATALOG TOOL': Package,
    'GROWTH TOOL': TrendingUp,
    'POLICY TOOL': ShieldCheck,
    'PAYMENT TOOL': CreditCard
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Agent Activity & Observability
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Real-time execution log of agent reasoning, tool invocation, and deterministic guardrails
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-xs font-semibold text-slate-700">Agent Active</span>
        </div>
      </div>

      {/* Explicit Principle Banner */}
      <div className="bg-gradient-to-r from-slate-900 to-indigo-950 text-white p-4 rounded-xl shadow-xs flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-indigo-600/60 text-indigo-200">
            <Info className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-indigo-300 uppercase tracking-wider">
              System Architecture Rule
            </h3>
            <p className="text-sm font-semibold text-slate-100">
              &quot;AI decides the next tool. Tools execute deterministic actions.&quot;
            </p>
          </div>
        </div>
        <div className="hidden md:block text-right text-xs text-slate-300 font-mono">
          <div>Engine: LangGraph Orchestrator</div>
          <div className="text-emerald-400 font-bold">Policy Enforcement: 100% Guaranteed</div>
        </div>
      </div>

      {/* Current Active Request Summary */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs space-y-3">
        <div className="flex flex-wrap items-center justify-between text-xs gap-2">
          <span className="text-slate-500 font-medium">Active Intent Trace:</span>
          <span className="font-mono text-indigo-600 font-semibold">Session ID: sess_99014a</span>
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
          <div>
            <span className="text-xs text-slate-400">Current Buyer Request:</span>
            <div className="text-base font-bold text-slate-900">
              &quot;Buy a work laptop under ₹70,000&quot;
            </div>
          </div>
          <div className="flex items-center gap-3 text-xs">
            <div className="bg-indigo-50 text-indigo-700 px-3 py-1.5 rounded-lg border border-indigo-200 font-medium">
              Agent Status: <span className="font-bold">Planning Next Action</span>
            </div>
          </div>
        </div>
      </div>

      {/* Execution Timeline */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-6 space-y-6">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <h3 className="text-sm font-bold text-slate-900">Execution Timeline</h3>
          <span className="text-xs text-slate-500 font-mono">5 Steps Executed</span>
        </div>

        <div className="relative pl-6 space-y-6 border-l-2 border-slate-200">
          {agentEvents.map((evt) => {
            const Icon = toolIconMap[evt.toolName] || Activity;
            const isExpanded = expandedId === evt.id;

            return (
              <div key={evt.id} className="relative group">
                {/* Timeline node icon */}
                <span className="absolute -left-[35px] top-0 w-6 h-6 rounded-full bg-white border-2 border-indigo-600 flex items-center justify-center text-indigo-600 shadow-xs">
                  <Icon className="w-3.5 h-3.5" />
                </span>

                <div className="bg-slate-50 rounded-lg border border-slate-200 p-4 space-y-3 transition-all hover:border-slate-300">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <span className="font-bold text-xs text-slate-900 tracking-wide font-mono">
                        {evt.toolName}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          evt.status === 'Completed'
                            ? 'bg-indigo-100 text-indigo-800'
                            : evt.status === 'Approved'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {evt.status}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-slate-400 font-mono">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {evt.timestamp}
                      </span>
                      <button
                        onClick={() => setExpandedId(isExpanded ? null : evt.id)}
                        className="text-slate-500 hover:text-slate-800"
                      >
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <p className="text-xs text-slate-700 font-medium leading-relaxed">
                    &quot;{evt.explanation}&quot;
                  </p>

                  {/* Expanded Data payload */}
                  {isExpanded && (evt.inputData || evt.outputData) && (
                    <div className="pt-3 border-t border-slate-200 grid grid-cols-1 md:grid-cols-2 gap-3 text-[11px] font-mono">
                      {evt.inputData && (
                        <div className="bg-white p-2.5 rounded border border-slate-200 text-slate-700">
                          <span className="text-[10px] text-slate-400 block font-semibold">TOOL INPUT:</span>
                          {evt.inputData}
                        </div>
                      )}
                      {evt.outputData && (
                        <div className="bg-indigo-50/60 p-2.5 rounded border border-indigo-200 text-indigo-950">
                          <span className="text-[10px] text-indigo-600 block font-semibold">TOOL OUTPUT:</span>
                          {evt.outputData}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
