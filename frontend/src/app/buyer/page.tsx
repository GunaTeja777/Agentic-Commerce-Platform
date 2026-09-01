'use client';

import React, { useState } from 'react';
import { useCommerce } from '@/context/CommerceContext';
import { Transaction } from '@/lib/types';
import {
  Bot,
  CheckCircle2,
  ShieldCheck,
  Sparkles,
  CreditCard
} from 'lucide-react';

export default function AIBuyerPage() {
  const { products, policy, executeInteractiveFlow } = useCommerce();
  const [acceptedOffer, setAcceptedOffer] = useState<boolean | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [purchasedTx, setPurchasedTx] = useState<Transaction | null>(null);

  const mainProduct = products[0]; // Laptop A (65,000)
  const upsellProduct = products[3]; // Wireless Mouse (1,500)

  const subtotal = mainProduct.price; // 65,000
  const upsellPrice = acceptedOffer === true ? upsellProduct.price : 0;
  const total = subtotal + upsellPrice;
  const buyerBudget = 70000;

  const handleAuthorize = async () => {
    setIsProcessing(true);
    const result = await executeInteractiveFlow({
      buyerQuery: 'I need a laptop for work under ₹70,000 with good battery life.',
      selectedProduct: mainProduct,
      acceptedUpsell: acceptedOffer === true,
      upsellProduct: upsellProduct
    });
    setIsProcessing(false);
    setPurchasedTx(result.transaction);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            AI Buyer Simulation
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Simulating an external AI procurement buyer negotiating and purchasing from your AI agent
          </p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-semibold">
          <Bot className="w-4 h-4 text-indigo-600" />
          <span>External Agent Protocol Active</span>
        </div>
      </div>

      {/* Main Split Screen */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* LEFT COLUMN: AI Buyer Conversation & Checkout (7 cols) */}
        <div className="lg:col-span-7 bg-white rounded-xl border border-slate-200 shadow-2xs flex flex-col overflow-hidden">
          {/* Header Bar */}
          <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-purple-600 text-white flex items-center justify-center font-bold text-xs shadow-xs">
                AB
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 leading-tight">
                  External AI Buyer (Client Agent)
                </h3>
                <p className="text-[11px] text-purple-700 font-mono">Agent ID: buyer-gpt4o-9831</p>
              </div>
            </div>
            <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-purple-100 text-purple-800 border border-purple-200">
              Autonomous Session
            </span>
          </div>

          {/* Chat Conversation Box */}
          <div className="p-6 space-y-5 flex-1 overflow-y-auto bg-slate-50/50 min-h-[420px]">
            {/* 1. AI Buyer Message */}
            <div className="flex items-start gap-3">
              <div className="w-7 h-7 rounded-full bg-purple-600 text-white flex items-center justify-center text-[10px] font-bold shrink-0">
                AB
              </div>
              <div className="bg-purple-50 border border-purple-200 rounded-2xl rounded-tl-none p-3.5 max-w-md text-xs text-purple-950 shadow-2xs">
                <p className="font-semibold text-purple-900 text-[11px] mb-1">AI Buyer Prompt:</p>
                &quot;I need a laptop for work under ₹70,000 with good battery life.&quot;
              </div>
            </div>

            {/* 2. Merchant Agent Response */}
            <div className="flex items-start gap-3 justify-end">
              <div className="bg-indigo-50 border border-indigo-200 rounded-2xl rounded-tr-none p-3.5 max-w-md text-xs text-indigo-950 shadow-2xs">
                <div className="flex items-center gap-1.5 text-indigo-700 font-semibold text-[11px] mb-1">
                  <Bot className="w-3.5 h-3.5" />
                  <span>Merchant Agent:</span>
                </div>
                &quot;I found <strong>Laptop A</strong> for ₹65,000. It has the best battery rating among matching products in our catalog.&quot;
              </div>
              <div className="w-7 h-7 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[10px] font-bold shrink-0">
                MA
              </div>
            </div>

            {/* 3. Product Card */}
            <div className="mx-10 bg-white border border-slate-200 rounded-xl p-4 shadow-2xs space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="font-bold text-sm text-slate-900">{mainProduct.name}</h4>
                  <p className="text-xs text-slate-500">{mainProduct.description}</p>
                </div>
                <div className="text-right">
                  <div className="text-base font-bold text-slate-900">₹{mainProduct.price.toLocaleString()}</div>
                  <span className="inline-block text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                    {mainProduct.stock} in stock
                  </span>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 text-[11px]">
                <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-medium">Work Category</span>
                <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-medium">Battery: 14.5 Hours</span>
                <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-medium">Intel i7 / 16GB</span>
              </div>
            </div>

            {/* 4. Upsell Suggestion from Growth Engine */}
            <div className="flex items-start gap-3 justify-end">
              <div className="bg-indigo-50 border border-indigo-200 rounded-2xl rounded-tr-none p-4 max-w-md text-xs text-indigo-950 shadow-2xs space-y-3">
                <div className="flex items-center gap-1.5 text-indigo-700 font-semibold text-[11px]">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Merchant Agent (Growth Tool Recommendation):</span>
                </div>
                <p>
                  &quot;A compatible <strong>Wireless Mouse</strong> is frequently bought with this laptop and is currently in stock for ₹1,500. Add it to your basket?&quot;
                </p>

                {/* Offer Action Buttons */}
                <div className="flex items-center gap-2 pt-1">
                  <button
                    onClick={() => setAcceptedOffer(true)}
                    className={`px-3 py-1.5 rounded-lg font-semibold text-xs transition-all ${
                      acceptedOffer === true
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                    }`}
                  >
                    {acceptedOffer === true ? '✓ Added Wireless Mouse (+₹1,500)' : '[ Accept offer ]'}
                  </button>
                  <button
                    onClick={() => setAcceptedOffer(false)}
                    className={`px-3 py-1.5 rounded-lg font-semibold text-xs border transition-all ${
                      acceptedOffer === false
                        ? 'bg-slate-200 text-slate-800 border-slate-400'
                        : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-300'
                    }`}
                  >
                    {acceptedOffer === false ? 'Offer Declined' : '[ Decline ]'}
                  </button>
                </div>
              </div>
              <div className="w-7 h-7 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[10px] font-bold shrink-0">
                MA
              </div>
            </div>

            {/* Confirmation Chat pill */}
            {acceptedOffer !== null && (
              <div className="flex items-start gap-3">
                <div className="w-7 h-7 rounded-full bg-purple-600 text-white flex items-center justify-center text-[10px] font-bold shrink-0">
                  AB
                </div>
                <div className="bg-purple-50 border border-purple-200 rounded-2xl rounded-tl-none p-3 max-w-xs text-xs text-purple-950">
                  {acceptedOffer
                    ? 'AI Buyer: "Accepted. Please finalize order with mouse included."'
                    : 'AI Buyer: "Declined mouse add-on. Finalize order with Laptop A only."'}
                </div>
              </div>
            )}
          </div>

          {/* Checkout Breakdown Footer */}
          <div className="p-6 border-t border-slate-200 bg-white space-y-4">
            <div className="space-y-2 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>Subtotal ({mainProduct.name})</span>
                <span className="font-mono font-medium">₹{subtotal.toLocaleString()}</span>
              </div>
              {acceptedOffer === true && (
                <div className="flex justify-between text-indigo-700 font-medium">
                  <span>Growth Add-on ({upsellProduct.name})</span>
                  <span className="font-mono">₹{upsellProduct.price.toLocaleString()}</span>
                </div>
              )}
              <div className="pt-2 border-t border-slate-200 flex justify-between items-center text-sm">
                <span className="font-bold text-slate-900">Total Purchase Amount</span>
                <span className="font-mono font-extrabold text-slate-900 text-base">
                  ₹{total.toLocaleString()}
                </span>
              </div>
            </div>

            {/* Budget status badge */}
            <div className="flex items-center justify-between bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs">
              <span className="text-slate-600">Buyer Authorized Budget:</span>
              <div className="flex items-center gap-2">
                <span className="font-mono font-bold text-slate-900">₹{buyerBudget.toLocaleString()}</span>
                <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                  ✓ Within Budget
                </span>
              </div>
            </div>

            {/* Authorize Action Button */}
            <button
              onClick={handleAuthorize}
              disabled={isProcessing || purchasedTx !== null}
              className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white rounded-lg font-semibold text-sm shadow-sm transition-all flex items-center justify-center gap-2"
            >
              <CreditCard className="w-4 h-4" />
              <span>
                {purchasedTx
                  ? '✓ Purchase Authorized & Executed'
                  : isProcessing
                  ? 'Running Policy & Razorpay Verification...'
                  : 'Authorize Purchase'}
              </span>
            </button>
          </div>
        </div>

        {/* RIGHT COLUMN: Policy & Payment Execution Preview (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Policy Gate Box */}
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-2xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-indigo-600" />
                <h3 className="text-sm font-bold text-slate-900">Policy Gate Evaluation</h3>
              </div>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-100 text-slate-700">
                Deterministic Engine
              </span>
            </div>

            <p className="text-xs text-slate-500">
              The merchant&apos;s policy engine autonomously validates whether money is permitted to move before triggering payments.
            </p>

            <div className="space-y-3 text-xs bg-slate-50 p-4 rounded-lg border border-slate-200">
              <div className="flex justify-between items-center">
                <span className="text-slate-600">Merchant Policy Limit:</span>
                <span className="font-mono font-bold text-slate-900">₹{policy.maxTransactionLimit.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-600">Current Basket Amount:</span>
                <span className="font-mono font-bold text-indigo-700">₹{total.toLocaleString()}</span>
              </div>
              <div className="pt-2 border-t border-slate-200 flex justify-between items-center">
                <span className="text-slate-600">Gate Status:</span>
                <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold text-[11px]">
                  ✓ ALLOWED TO MOVE MONEY
                </span>
              </div>
            </div>
          </div>

          {/* Execution Result Card if Purchased */}
          {purchasedTx && (
            <div className="bg-emerald-950 text-emerald-50 rounded-xl p-6 shadow-xl space-y-4 animate-in fade-in duration-300">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
                  <CheckCircle2 className="w-5 h-5" />
                  <span>Razorpay Test Payment Successful</span>
                </div>
                <span className="text-[10px] font-mono bg-emerald-900 text-emerald-300 px-2 py-0.5 rounded">
                  {purchasedTx.id}
                </span>
              </div>

              <div className="space-y-2 text-xs text-emerald-200 border-t border-emerald-900 pt-3">
                <div className="flex justify-between">
                  <span>Razorpay Payment ID:</span>
                  <span className="font-mono font-bold text-white">{purchasedTx.razorpayPaymentId}</span>
                </div>
                <div className="flex justify-between">
                  <span>Policy Check Result:</span>
                  <span className="font-bold text-emerald-300">Approved</span>
                </div>
                <div className="flex justify-between">
                  <span>Total Amount Paid:</span>
                  <span className="font-mono font-bold text-white text-sm">₹{purchasedTx.totalAmount.toLocaleString()}</span>
                </div>
              </div>

              <div className="bg-emerald-900/60 p-3 rounded-lg text-[11px] text-emerald-300 font-mono">
                ✓ Recorded in Audit Trail & Merchant Transactions
              </div>
            </div>
          )}

          {/* Architecture Reminder Card */}
          <div className="bg-slate-900 text-white rounded-xl p-5 shadow-2xs space-y-3">
            <h4 className="text-xs font-bold text-amber-400 uppercase tracking-wider">
              Core Architecture Principle
            </h4>
            <p className="text-xs text-slate-300 leading-relaxed">
              &quot;The AI agent decides <strong>WHAT TO DO NEXT</strong>.
              <br />
              The Policy Engine decides <strong>WHETHER MONEY IS ALLOWED TO MOVE</strong>.&quot;
            </p>
            <p className="text-[11px] text-slate-400 border-t border-slate-800 pt-2">
              External AI buyers interact via structured APIs. Transactions are guaranteed safe by deterministic merchant boundaries.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
