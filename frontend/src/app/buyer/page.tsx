'use client';

import React, { useState } from 'react';
import { useCommerce } from '@/context/CommerceContext';
import { Transaction } from '@/lib/types';
import {
  Bot,
  CheckCircle2,
  XCircle,
  ShieldCheck,
  ShieldAlert,
  Sparkles,
  CreditCard,
  RefreshCw,
  AlertTriangle
} from 'lucide-react';

export default function AIBuyerPage() {
  const { products, policy, executeInteractiveFlow, payWithRazorpay } = useCommerce();
  const [scenario, setScenario] = useState<'success' | 'blocked'>('success');
  const [acceptedOffer, setAcceptedOffer] = useState<boolean | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [purchasedTx, setPurchasedTx] = useState<Transaction | null>(null);
  const [createdRazorpayOrder, setCreatedRazorpayOrder] = useState<any>(null);
  const [paymentError, setPaymentError] = useState<string | null>(null);

  // Products
  const laptopProduct = products.find(p => p.id === '1' || p.name.includes('Laptop') || p.name.includes('NovaBook')) || products[0] || {
    id: '1',
    name: 'NovaBook Pro 14',
    category: 'Laptops',
    price: 65000,
    stock: 8,
    description: '14-inch OLED, Intel Core Ultra 7, 32GB RAM, 1TB SSD',
    agentReadableStatus: 'Available',
    compatibleProducts: ['4', '5'],
    frequentlyBoughtWith: ['4'],
    specifications: {}
  };

  const mouseProduct = products.find(p => p.id === '4' || p.name.includes('Mouse') || p.name.includes('AeroMouse')) || products[3] || {
    id: '4',
    name: 'AeroMouse X1',
    category: 'Peripherals',
    price: 1500,
    stock: 25,
    description: 'Ergonomic wireless mouse with silent clicks',
    agentReadableStatus: 'Available',
    compatibleProducts: [],
    frequentlyBoughtWith: [],
    specifications: {}
  };

  const monitorProduct = products.find(p => p.id === '5' || p.name.includes('Monitor')) || products[4] || {
    id: '5',
    name: 'UltraView 27 4K Monitor',
    category: 'Peripherals',
    price: 12000,
    stock: 5,
    description: '27-inch 4K UHD IPS Display',
    agentReadableStatus: 'Available',
    compatibleProducts: [],
    frequentlyBoughtWith: [],
    specifications: {}
  };

  const upsellProduct = scenario === 'success' ? mouseProduct : monitorProduct;

  const subtotal = laptopProduct.price;
  const upsellPrice = acceptedOffer === true ? upsellProduct.price : 0;
  const total = subtotal + upsellPrice;
  const buyerBudget = 70000;
  const isOverPolicy = total > policy.maxTransactionLimit;

  const handleReset = () => {
    setAcceptedOffer(null);
    setPurchasedTx(null);
    setCreatedRazorpayOrder(null);
    setPaymentError(null);
  };

  const handleScenarioChange = (newScenario: 'success' | 'blocked') => {
    setScenario(newScenario);
    handleReset();
  };

  const handleAuthorize = async () => {
    setIsProcessing(true);
    setPaymentError(null);

    const result = await executeInteractiveFlow({
      buyerQuery: scenario === 'success'
        ? 'I need a laptop for work under ₹70,000 with good battery life.'
        : 'I need a high-end workstation laptop with an external 4K monitor.',
      selectedProduct: laptopProduct,
      acceptedUpsell: acceptedOffer === true,
      upsellProduct: upsellProduct
    });

    setIsProcessing(false);
    setPurchasedTx(result.transaction);

    if (result.allowed && result.razorpayOrder) {
      setCreatedRazorpayOrder(result.razorpayOrder);
    } else if (!result.allowed) {
      setCreatedRazorpayOrder(null);
    }
  };

  const handleOpenRazorpayCheckout = async () => {
    if (!purchasedTx || !purchasedTx.orderId) return;

    try {
      setIsProcessing(true);
      await payWithRazorpay({
        orderId: purchasedTx.orderId,
        amountInr: purchasedTx.totalAmount,
        description: `Agentic Commerce Order #${purchasedTx.orderId} (Test Mode)`,
        onSuccess: (verifyData) => {
          setIsProcessing(false);
          setPurchasedTx(prev => prev ? {
            ...prev,
            paymentStatus: 'Captured',
            razorpayPaymentId: verifyData.razorpay_payment_id
          } : null);
        },
        onFailure: (err) => {
          setIsProcessing(false);
          setPaymentError(err.message || 'Payment was not completed');
          setPurchasedTx(prev => prev ? {
            ...prev,
            paymentStatus: 'Failed'
          } : null);
        }
      });
    } catch (err: any) {
      setIsProcessing(false);
      setPaymentError(err.message || 'Payment initiation failed');
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              AI Buyer Simulation
            </h1>
            <span className="px-2.5 py-0.5 rounded text-[11px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
              Razorpay Test Mode
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Simulating an external AI buyer purchasing from the AI Merchant Agent with deterministic Policy Gate guardrails.
          </p>
        </div>

        {/* Demo Scenario Selector */}
        <div className="flex items-center gap-2 bg-white p-1 rounded-lg border border-slate-200 shadow-2xs">
          <button
            onClick={() => handleScenarioChange('success')}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
              scenario === 'success'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            Scenario 1: Success (≤ ₹70k)
          </button>
          <button
            onClick={() => handleScenarioChange('blocked')}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
              scenario === 'blocked'
                ? 'bg-rose-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            Scenario 2: Blocked (&gt; ₹70k)
          </button>
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
                  External AI Buyer (Autonomous Client)
                </h3>
                <p className="text-[11px] text-purple-700 font-mono">Agent ID: buyer-gpt4o-9831</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleReset}
                className="flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] text-slate-600 hover:bg-slate-200 transition-colors"
                title="Reset simulation"
              >
                <RefreshCw className="w-3 h-3" />
                <span>Reset</span>
              </button>
              <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-purple-100 text-purple-800 border border-purple-200">
                Active Session
              </span>
            </div>
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
                {scenario === 'success'
                  ? '“I need a laptop for work under ₹70,000 with good battery life.”'
                  : '“I need a laptop and 4K external monitor for professional video editing.”'}
              </div>
            </div>

            {/* 2. Merchant Agent Response */}
            <div className="flex items-start gap-3 justify-end">
              <div className="bg-indigo-50 border border-indigo-200 rounded-2xl rounded-tr-none p-3.5 max-w-md text-xs text-indigo-950 shadow-2xs">
                <div className="flex items-center gap-1.5 text-indigo-700 font-semibold text-[11px] mb-1">
                  <Bot className="w-3.5 h-3.5" />
                  <span>Merchant AI Agent:</span>
                </div>
                “I located <strong>{laptopProduct.name}</strong> for ₹{laptopProduct.price.toLocaleString()}. It matches your performance and battery requirements.”
              </div>
              <div className="w-7 h-7 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[10px] font-bold shrink-0">
                MA
              </div>
            </div>

            {/* 3. Product Card */}
            <div className="mx-10 bg-white border border-slate-200 rounded-xl p-4 shadow-2xs space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="font-bold text-sm text-slate-900">{laptopProduct.name}</h4>
                  <p className="text-xs text-slate-500">{laptopProduct.description}</p>
                </div>
                <div className="text-right">
                  <div className="text-base font-bold text-slate-900">₹{laptopProduct.price.toLocaleString()}</div>
                  <span className="inline-block text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                    {laptopProduct.stock} in stock
                  </span>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 text-[11px]">
                <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-medium">Laptops Category</span>
                <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-medium">Battery: 14.5 Hours</span>
                <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-medium">Intel i7 / 16GB</span>
              </div>
            </div>

            {/* 4. Upsell Suggestion from Growth Engine */}
            <div className="flex items-start gap-3 justify-end">
              <div className="bg-indigo-50 border border-indigo-200 rounded-2xl rounded-tr-none p-4 max-w-md text-xs text-indigo-950 shadow-2xs space-y-3">
                <div className="flex items-center gap-1.5 text-indigo-700 font-semibold text-[11px]">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Growth Tool (Data-Backed Recommendation):</span>
                </div>
                <p>
                  “Based on co-purchasing data, <strong>{upsellProduct.name}</strong> is frequently added with this laptop for ₹{upsellProduct.price.toLocaleString()}. Add it to your basket?”
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
                    {acceptedOffer === true ? `✓ Added ${upsellProduct.name} (+₹${upsellProduct.price.toLocaleString()})` : '[ Accept offer ]'}
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
                    ? `AI Buyer: "Accepted. Finalize order with ${upsellProduct.name} included."`
                    : 'AI Buyer: "Declined add-on. Finalize order with Laptop only."'}
                </div>
              </div>
            )}
          </div>

          {/* Checkout Breakdown Footer */}
          <div className="p-6 border-t border-slate-200 bg-white space-y-4">
            <div className="space-y-2 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>Base Item ({laptopProduct.name})</span>
                <span className="font-mono font-medium">₹{subtotal.toLocaleString()}</span>
              </div>
              {acceptedOffer === true && (
                <div className="flex justify-between text-indigo-700 font-medium">
                  <span>Growth Add-on ({upsellProduct.name})</span>
                  <span className="font-mono">₹{upsellProduct.price.toLocaleString()}</span>
                </div>
              )}
              <div className="pt-2 border-t border-slate-200 flex justify-between items-center text-sm">
                <span className="font-bold text-slate-900">Total Calculated Basket</span>
                <span className={`font-mono font-extrabold text-base ${isOverPolicy ? 'text-rose-600' : 'text-slate-900'}`}>
                  ₹{total.toLocaleString()}
                </span>
              </div>
            </div>

            {/* Policy Status Badge */}
            <div className="flex items-center justify-between bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs">
              <span className="text-slate-600">Merchant Policy Limit (₹{policy.maxTransactionLimit.toLocaleString()}):</span>
              <div className="flex items-center gap-2">
                {isOverPolicy ? (
                  <span className="px-2 py-0.5 rounded bg-rose-100 text-rose-800 text-[10px] font-bold flex items-center gap-1">
                    <XCircle className="w-3 h-3 text-rose-600" />
                    ✕ EXCEEDS LIMIT (Blocked)
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[10px] font-bold flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                    ✓ Policy Approved
                  </span>
                )}
              </div>
            </div>

            {/* Error banner if any */}
            {paymentError && (
              <div className="bg-rose-50 border border-rose-200 text-rose-800 text-xs p-3 rounded-lg flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{paymentError}</span>
              </div>
            )}

            {/* Authorize Action Button */}
            {!purchasedTx ? (
              <button
                onClick={handleAuthorize}
                disabled={isProcessing}
                className={`w-full py-3 px-4 rounded-lg font-semibold text-sm shadow-sm transition-all flex items-center justify-center gap-2 ${
                  isOverPolicy
                    ? 'bg-rose-600 hover:bg-rose-700 text-white'
                    : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                } disabled:bg-slate-300`}
              >
                <CreditCard className="w-4 h-4" />
                <span>
                  {isProcessing
                    ? 'Evaluating Policy Pipeline...'
                    : isOverPolicy
                    ? 'Test Policy Gate (Will Block)'
                    : 'Authorize & Create Order'}
                </span>
              </button>
            ) : purchasedTx.policyStatus === 'Approved' ? (
              <div className="space-y-2">
                {purchasedTx.paymentStatus === 'Captured' ? (
                  <div className="w-full py-3 px-4 bg-emerald-600 text-white rounded-lg font-semibold text-sm flex items-center justify-center gap-2 shadow-xs">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>✓ Payment Captured & Verified in Test Mode</span>
                  </div>
                ) : (
                  <button
                    onClick={handleOpenRazorpayCheckout}
                    disabled={isProcessing}
                    className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-semibold text-sm shadow-md transition-all flex items-center justify-center gap-2"
                  >
                    <CreditCard className="w-4 h-4" />
                    <span>
                      {isProcessing ? 'Opening Razorpay Modal...' : 'Pay with Razorpay (Test Mode)'}
                    </span>
                  </button>
                )}
              </div>
            ) : (
              <div className="w-full py-3 px-4 bg-rose-100 border border-rose-300 text-rose-900 rounded-lg font-semibold text-xs flex items-center justify-center gap-2">
                <XCircle className="w-4 h-4 text-rose-600" />
                <span>Payment Blocked by Policy Gate — Razorpay was NOT called</span>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: Policy & Payment Execution Preview (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Policy Gate Box */}
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-2xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                {isOverPolicy ? (
                  <ShieldAlert className="w-5 h-5 text-rose-600" />
                ) : (
                  <ShieldCheck className="w-5 h-5 text-emerald-600" />
                )}
                <h3 className="text-sm font-bold text-slate-900">Deterministic Policy Gate</h3>
              </div>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-100 text-slate-700">
                Server-Side Truth
              </span>
            </div>

            <p className="text-xs text-slate-500">
              The LLM can propose actions, but only the deterministic Policy Engine gates financial transactions.
            </p>

            <div className="space-y-3 text-xs bg-slate-50 p-4 rounded-lg border border-slate-200">
              <div className="flex justify-between items-center">
                <span className="text-slate-600">Merchant Policy Limit:</span>
                <span className="font-mono font-bold text-slate-900">₹{policy.maxTransactionLimit.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-600">Basket Total:</span>
                <span className={`font-mono font-bold ${isOverPolicy ? 'text-rose-700 font-extrabold' : 'text-indigo-700'}`}>
                  ₹{total.toLocaleString()}
                </span>
              </div>
              <div className="pt-2 border-t border-slate-200 flex justify-between items-center">
                <span className="text-slate-600">Gate Decision:</span>
                {isOverPolicy ? (
                  <span className="px-2 py-0.5 rounded bg-rose-100 text-rose-800 font-bold text-[11px]">
                    ✕ BLOCKED (Payment Tool Not Called)
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold text-[11px]">
                    ✓ ALLOWED TO EXECUTE PAYMENT
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Execution Result Card if Processed */}
          {purchasedTx && (
            <div className={`rounded-xl p-6 shadow-xl space-y-4 animate-in fade-in duration-300 ${
              purchasedTx.policyStatus === 'Approved'
                ? 'bg-slate-900 text-white'
                : 'bg-rose-950 text-rose-50'
            }`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 font-bold text-sm">
                  {purchasedTx.policyStatus === 'Approved' ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                  ) : (
                    <XCircle className="w-5 h-5 text-rose-400" />
                  )}
                  <span>
                    {purchasedTx.policyStatus === 'Approved'
                      ? 'Policy Approved — Order Created'
                      : 'Transaction Strictly Blocked'}
                  </span>
                </div>
                <span className="text-[10px] font-mono bg-white/10 px-2 py-0.5 rounded">
                  {purchasedTx.id}
                </span>
              </div>

              <div className="space-y-2 text-xs border-t border-white/10 pt-3">
                <div className="flex justify-between">
                  <span className="text-slate-400">Order ID:</span>
                  <span className="font-mono font-bold">{purchasedTx.id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Policy Status:</span>
                  <span className={purchasedTx.policyStatus === 'Approved' ? 'font-bold text-emerald-400' : 'font-bold text-rose-400'}>
                    {purchasedTx.policyStatus}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Payment Status:</span>
                  <span className="font-bold text-amber-400">
                    {purchasedTx.paymentStatus}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Razorpay Test Order:</span>
                  <span className="font-mono text-[11px] text-indigo-300">
                    {purchasedTx.razorpayOrderId || createdRazorpayOrder?.razorpay_order_id || 'None (Not Called)'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Amount:</span>
                  <span className="font-mono font-bold text-white text-sm">
                    ₹{purchasedTx.totalAmount.toLocaleString()}
                  </span>
                </div>
              </div>

              <div className="bg-white/5 p-3 rounded-lg text-[11px] font-mono text-slate-300">
                {purchasedTx.policyStatus === 'Approved'
                  ? '✓ Stored in PostgreSQL & logged in Audit Trail'
                  : '✕ Razorpay API was NOT called. Block event recorded in Audit Trail.'}
              </div>
            </div>
          )}

          {/* Architecture Trust Boundary Reminder Card */}
          <div className="bg-slate-900 text-white rounded-xl p-5 shadow-2xs space-y-3">
            <h4 className="text-xs font-bold text-amber-400 uppercase tracking-wider">
              Security Trust Boundary
            </h4>
            <p className="text-xs text-slate-300 leading-relaxed">
              • <strong>AI Agent:</strong> Proposes candidate and upsell products.<br />
              • <strong>Policy Engine:</strong> Authoritative check for transaction limits.<br />
              • <strong>Payment Service:</strong> Executes test order only when Policy = Allowed.<br />
              • <strong>Frontend:</strong> Cannot override calculated amount or payment state.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
