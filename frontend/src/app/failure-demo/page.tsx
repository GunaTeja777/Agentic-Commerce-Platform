'use client';

import React, { useState } from 'react';
import { useCommerce } from '@/context/CommerceContext';
import {
  ShieldX,
  Play,
  CheckCircle2,
  Lock,
  AlertTriangle,
  Cpu
} from 'lucide-react';

export default function FailureDemoPage() {
  const { policy, addTransaction, addAuditEvent } = useCommerce();
  const [step, setStep] = useState<number>(0);
  const [isRunning, setIsRunning] = useState(false);

  const runSimulation = () => {
    setIsRunning(true);
    setStep(1);

    setTimeout(() => setStep(2), 1000);
    setTimeout(() => setStep(3), 2200);
    setTimeout(() => {
      setStep(4);
      setIsRunning(false);

      const timestamp = new Date().toLocaleTimeString('en-US', { hour12: false });
      addTransaction({
        id: `order_fail_${Math.floor(100 + Math.random() * 900)}`,
        buyer: 'AI Buyer (High Budget Request)',
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
        action: 'Transaction Limit Check',
        reason: `Purchase ₹75,000 exceeds ₹${policy.maxTransactionLimit.toLocaleString()} limit. Blocked deterministically.`,
        amount: 75000,
        result: 'Blocked',
        category: 'Blocked'
      });
    }, 3400);
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Failure Scenario Demo
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Demonstrating deterministic policy blockage when purchase amount exceeds ₹70,000
          </p>
        </div>
        <button
          onClick={runSimulation}
          disabled={isRunning}
          className="flex items-center gap-2 px-5 py-2.5 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white rounded-lg font-semibold text-xs shadow-sm transition-all"
        >
          <Play className="w-4 h-4 fill-current" />
          <span>{isRunning ? 'Running Trace...' : step === 0 ? 'Run Failure Demo' : 'Re-run Demo'}</span>
        </button>
      </div>

      {/* Scenario Parameters Banner */}
      <div className="bg-slate-900 text-white p-5 rounded-xl border border-slate-800 space-y-3 font-mono">
        <div className="flex items-center justify-between text-xs">
          <span className="text-amber-400 font-bold uppercase">Test Case Configuration</span>
          <span className="text-slate-400">Target Item: Pro Studio Laptop C</span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs pt-2 border-t border-slate-800">
          <div>
            <span className="text-slate-400 block text-[10px]">PURCHASE REQUEST:</span>
            <span className="text-white font-bold">₹75,000</span>
          </div>
          <div>
            <span className="text-slate-400 block text-[10px]">MERCHANT POLICY MAX:</span>
            <span className="text-emerald-400 font-bold">₹{policy.maxTransactionLimit.toLocaleString()}</span>
          </div>
          <div>
            <span className="text-slate-400 block text-[10px]">POLICY RESULT:</span>
            <span className="text-rose-400 font-bold">✕ BLOCKED</span>
          </div>
          <div>
            <span className="text-slate-400 block text-[10px]">RAZORPAY API CALLS:</span>
            <span className="text-amber-400 font-bold">0</span>
          </div>
        </div>
      </div>

      {/* Execution Stepper */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-2xs space-y-4">
        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
          Execution Trace Steps
        </h3>

        <div className="space-y-3">
          {/* Step 1 */}
          <div
            className={`p-4 rounded-xl border text-xs flex items-center justify-between transition-all ${
              step >= 1 ? 'border-slate-300 bg-slate-50 text-slate-900' : 'border-slate-200 bg-slate-50/40 text-slate-400'
            }`}
          >
            <div className="flex items-center gap-3">
              <Cpu className="w-5 h-5 text-indigo-600" />
              <div>
                <span className="font-bold text-sm">1. Purchase Request Received</span>
                <p className="text-xs text-slate-500">AI Buyer sends request for Pro Studio Laptop C (₹75,000)</p>
              </div>
            </div>
            {step >= 1 && <span className="px-2.5 py-1 rounded bg-indigo-100 text-indigo-700 font-bold text-[10px]">Received</span>}
          </div>

          {/* Step 2 */}
          <div
            className={`p-4 rounded-xl border text-xs flex items-center justify-between transition-all ${
              step >= 2 ? 'border-rose-300 bg-rose-50 text-rose-950' : 'border-slate-200 bg-slate-50/40 text-slate-400'
            }`}
          >
            <div className="flex items-center gap-3">
              <Lock className="w-5 h-5 text-rose-600" />
              <div>
                <span className="font-bold text-sm text-rose-900">2. Policy Tool Evaluation</span>
                <p className="text-xs text-rose-700">₹75,000 exceeds maximum transaction limit ₹{policy.maxTransactionLimit.toLocaleString()}</p>
              </div>
            </div>
            {step >= 2 && <span className="px-3 py-1 rounded bg-rose-600 text-white font-extrabold text-[11px]">✕ BLOCKED</span>}
          </div>

          {/* Step 3 */}
          <div
            className={`p-4 rounded-xl border text-xs flex items-center justify-between transition-all ${
              step >= 3 ? 'border-slate-300 bg-slate-100 text-slate-800' : 'border-slate-200 bg-slate-50/40 text-slate-400'
            }`}
          >
            <div className="flex items-center gap-3">
              <ShieldX className="w-5 h-5 text-slate-600" />
              <div>
                <span className="font-bold text-sm">3. Payment Execution Bypassed</span>
                <p className="text-xs text-slate-600">Razorpay API was skipped deterministically</p>
              </div>
            </div>
            {step >= 3 && (
              <span className="px-3 py-1 rounded bg-slate-900 text-amber-300 font-mono font-bold text-xs">
                Razorpay API Calls: 0
              </span>
            )}
          </div>

          {/* Step 4 */}
          <div
            className={`p-4 rounded-xl border text-xs flex items-center justify-between transition-all ${
              step >= 4 ? 'border-emerald-300 bg-emerald-50 text-emerald-950' : 'border-slate-200 bg-slate-50/40 text-slate-400'
            }`}
          >
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              <div>
                <span className="font-bold text-sm">4. Audit Logged &amp; Response Returned</span>
                <p className="text-xs text-slate-600">Recorded block reason into merchant audit trail</p>
              </div>
            </div>
            {step >= 4 && <span className="px-2.5 py-1 rounded bg-emerald-100 text-emerald-800 font-bold text-[10px]">Complete</span>}
          </div>
        </div>
      </div>

      {/* Output Banner */}
      {step >= 4 && (
        <div className="bg-rose-50 border border-rose-200 rounded-xl p-6 space-y-3 animate-in fade-in duration-300 text-xs">
          <div className="flex items-center gap-2 font-bold text-rose-800 text-sm">
            <AlertTriangle className="w-5 h-5 text-rose-600" />
            <span>Response Returned to AI Buyer:</span>
          </div>
          <p className="font-mono bg-white p-3 rounded-lg border border-rose-200 text-slate-900 text-xs font-semibold">
            &quot;Purchase blocked because the transaction (₹75,000) exceeds the merchant&apos;s ₹{policy.maxTransactionLimit.toLocaleString()} maximum limit.&quot;
          </p>
          <div className="flex items-center justify-between text-slate-600 font-mono text-[11px] pt-1">
            <span>Guaranteed Security Enforcement</span>
            <span className="font-bold text-slate-900">Razorpay Calls Executed: 0</span>
          </div>
        </div>
      )}
    </div>
  );
}
