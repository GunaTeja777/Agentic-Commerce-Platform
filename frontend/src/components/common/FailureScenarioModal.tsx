'use client';

import React, { useState } from 'react';
import { useCommerce } from '@/context/CommerceContext';
import { X, Play, ShieldX, CheckCircle2, ArrowRight, Lock, AlertTriangle, Cpu } from 'lucide-react';

export const FailureScenarioModal: React.FC = () => {
  const { isFailureModalOpen, setIsFailureModalOpen, policy, addTransaction, addAuditEvent } = useCommerce();
  const [isRunning, setIsRunning] = useState(false);
  const [step, setStep] = useState<number>(0);

  if (!isFailureModalOpen) return null;

  const runSimulation = () => {
    setIsRunning(true);
    setStep(1);

    setTimeout(() => setStep(2), 1000);
    setTimeout(() => setStep(3), 2200);
    setTimeout(() => {
      setStep(4);
      setIsRunning(false);

      // Record to audit & transactions store
      const timestamp = new Date().toLocaleTimeString('en-US', { hour12: false });
      addTransaction({
        id: `order_fail_${Math.floor(100 + Math.random() * 900)}`,
        buyer: 'AI Buyer (Failure Demo Runner)',
        items: [{ productId: 'prod_lap_c', productName: 'Pro Studio Laptop C', price: 75000, quantity: 1 }],
        subtotal: 75000,
        upsellTotal: 0,
        totalAmount: 75000,
        policyStatus: 'Blocked',
        paymentStatus: 'Not Attempted',
        timestamp: `Today, ${timestamp}`,
        policyReason: `Blocked: ₹75,000 exceeds merchant maximum limit of ₹${policy.maxTransactionLimit.toLocaleString()}`,
        razorpayApiCalls: 0
      });

      addAuditEvent({
        id: `aud_fail_${Date.now()}`,
        timestamp,
        actor: 'Policy Tool',
        action: 'Transaction Check',
        reason: `Purchase ₹75,000 exceeds ₹${policy.maxTransactionLimit.toLocaleString()} limit. Blocked deterministically.`,
        amount: 75000,
        result: 'Blocked',
        category: 'Blocked'
      });
    }, 3400);
  };

  const handleClose = () => {
    setIsFailureModalOpen(false);
    setStep(0);
    setIsRunning(false);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white border border-slate-200 rounded-xl shadow-2xl max-w-2xl w-full overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-rose-100 text-rose-700">
              <ShieldX className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-slate-900 leading-tight">
                Failure Scenario Demo
              </h3>
              <p className="text-xs text-slate-500">
                Demonstrating deterministic policy guardrails blocking illegal money movement
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-6">
          {/* Context Banner */}
          <div className="bg-slate-900 text-white rounded-lg p-4 text-xs space-y-2">
            <div className="flex items-center justify-between text-slate-300 font-medium">
              <span>Test Case Parameters</span>
              <span className="text-amber-400 font-mono">HIGH BUDGET REQUEST</span>
            </div>
            <div className="grid grid-cols-2 gap-3 pt-1 border-t border-slate-800 text-slate-300 font-mono">
              <div>Requested Item: <span className="text-white font-bold">Pro Studio Laptop C</span></div>
              <div>Item Price: <span className="text-rose-400 font-bold">₹75,000</span></div>
              <div>Merchant Policy Max Limit: <span className="text-emerald-400 font-bold">₹{policy.maxTransactionLimit.toLocaleString()}</span></div>
              <div>Expected Outcome: <span className="text-rose-400 font-bold">HARD POLICY BLOCK</span></div>
            </div>
          </div>

          {/* Interactive Simulation Stepper */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Execution Pipeline Trace
            </h4>

            <div className="space-y-2">
              {/* Step 1: Buyer Request */}
              <div
                className={`p-3 rounded-lg border text-xs flex items-center justify-between transition-all ${
                  step >= 1 ? 'border-slate-300 bg-slate-50 text-slate-800' : 'border-slate-200 bg-slate-50/40 text-slate-400'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Cpu className="w-4 h-4 text-indigo-600" />
                  <div>
                    <span className="font-semibold">1. Purchase Request</span>
                    <p className="text-[11px] text-slate-500">AI Buyer asks to order Pro Studio Laptop C (₹75,000)</p>
                  </div>
                </div>
                {step >= 1 && <span className="px-2 py-0.5 rounded bg-indigo-100 text-indigo-700 text-[10px] font-semibold">Received</span>}
              </div>

              {/* Step 2: Policy Engine Check */}
              <div
                className={`p-3 rounded-lg border text-xs flex items-center justify-between transition-all ${
                  step >= 2 ? 'border-rose-300 bg-rose-50 text-rose-900' : 'border-slate-200 bg-slate-50/40 text-slate-400'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Lock className="w-4 h-4 text-rose-600" />
                  <div>
                    <span className="font-semibold">2. Policy Tool Evaluation</span>
                    <p className="text-[11px] text-rose-700 font-medium">Checking: ₹75,000 {'>'} ₹{policy.maxTransactionLimit.toLocaleString()} Policy Maximum</p>
                  </div>
                </div>
                {step >= 2 && <span className="px-2 py-0.5 rounded bg-rose-600 text-white text-[10px] font-bold">✕ BLOCKED</span>}
              </div>

              {/* Step 3: Payment Tool Bypass */}
              <div
                className={`p-3 rounded-lg border text-xs flex items-center justify-between transition-all ${
                  step >= 3 ? 'border-slate-300 bg-slate-100 text-slate-700' : 'border-slate-200 bg-slate-50/40 text-slate-400'
                }`}
              >
                <div className="flex items-center gap-3">
                  <ShieldX className="w-4 h-4 text-slate-500" />
                  <div>
                    <span className="font-semibold">3. Payment Execution</span>
                    <p className="text-[11px] text-slate-600">Razorpay API skipped due to policy blockage</p>
                  </div>
                </div>
                {step >= 3 && (
                  <span className="px-2 py-0.5 rounded bg-slate-900 text-amber-300 font-mono text-[10px] font-bold">
                    Razorpay Calls: 0
                  </span>
                )}
              </div>

              {/* Step 4: Audit & Response */}
              <div
                className={`p-3 rounded-lg border text-xs flex items-center justify-between transition-all ${
                  step >= 4 ? 'border-emerald-300 bg-emerald-50 text-emerald-900' : 'border-slate-200 bg-slate-50/40 text-slate-400'
                }`}
              >
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <div>
                    <span className="font-semibold">4. Audit Log & AI Response</span>
                    <p className="text-[11px] text-slate-600">Logged to audit trail & response returned to AI Buyer</p>
                  </div>
                </div>
                {step >= 4 && <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-700 text-[10px] font-semibold">Completed</span>}
              </div>
            </div>
          </div>

          {/* Outcome Summary Box */}
          {step >= 4 && (
            <div className="p-4 rounded-lg bg-rose-50 border border-rose-200 text-xs space-y-2 text-rose-900 animate-in fade-in duration-300">
              <div className="flex items-center gap-2 font-bold text-rose-700">
                <AlertTriangle className="w-4 h-4" />
                <span>Final Output Delivered to AI Buyer:</span>
              </div>
              <p className="font-mono bg-white p-2.5 rounded border border-rose-200 text-[11px] text-slate-800">
                "Purchase blocked because the transaction (₹75,000) exceeds the merchant's ₹{policy.maxTransactionLimit.toLocaleString()} maximum limit."
              </p>
              <div className="flex items-center justify-between text-[11px] text-rose-800 pt-1">
                <span>Deterministic Result: Guaranteed Safety</span>
                <span className="font-bold text-slate-900">Razorpay API Calls: 0</span>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <span className="text-xs text-slate-500 font-medium">
            Principle: AI decides action, Policy decides money movement.
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={runSimulation}
              disabled={isRunning}
              className="flex items-center gap-1.5 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-semibold shadow-xs disabled:opacity-50 transition-colors"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>{isRunning ? 'Executing Trace...' : step === 0 ? 'Run Scenario' : 'Re-run Scenario'}</span>
            </button>
            <button
              onClick={handleClose}
              className="px-3 py-2 bg-white border border-slate-300 text-slate-700 rounded-lg text-xs font-medium hover:bg-slate-50"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
