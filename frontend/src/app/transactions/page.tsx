'use client';

import React, { useState } from 'react';
import { useCommerce } from '@/context/CommerceContext';
import { Transaction } from '@/lib/types';
import {
  CheckCircle2,
  XCircle,
  Eye,
  X
} from 'lucide-react';

export default function TransactionsPage() {
  const { transactions } = useCommerce();
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Transactions</h1>
          <p className="text-sm text-slate-500 mt-1">
            Razorpay test mode transaction ledger executed by agentic buyer calls
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-3 py-1 rounded bg-amber-50 text-amber-700 border border-amber-200 text-xs font-bold font-mono">
            Razorpay Test Mode
          </span>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider">
              <tr>
                <th className="px-6 py-3.5">Order ID</th>
                <th className="px-6 py-3.5">Buyer Agent</th>
                <th className="px-6 py-3.5">Items</th>
                <th className="px-6 py-3.5">Amount</th>
                <th className="px-6 py-3.5">Policy Check</th>
                <th className="px-6 py-3.5">Payment</th>
                <th className="px-6 py-3.5">Time</th>
                <th className="px-6 py-3.5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {transactions.map((tx) => (
                <tr key={tx.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="px-6 py-4 font-mono font-bold text-slate-900">{tx.id}</td>
                  <td className="px-6 py-4">
                    <span className="text-slate-800 font-medium">{tx.buyer}</span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="space-y-0.5">
                      {tx.items.map((item, idx) => (
                        <div key={idx} className="flex items-center gap-1.5">
                          <span className="text-slate-800">{item.productName}</span>
                          {item.isUpsell && (
                            <span className="px-1.5 py-0.2 rounded bg-indigo-50 text-indigo-700 text-[10px] font-bold">
                              Upsell
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </td>
                  <td className="px-6 py-4 font-mono font-bold text-slate-900 text-sm">
                    ₹{tx.totalAmount.toLocaleString()}
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[11px] font-bold ${
                        tx.policyStatus === 'Approved'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-rose-50 text-rose-700 border border-rose-200'
                      }`}
                    >
                      {tx.policyStatus === 'Approved' ? (
                        <CheckCircle2 className="w-3.5 h-3.5" />
                      ) : (
                        <XCircle className="w-3.5 h-3.5" />
                      )}
                      <span>{tx.policyStatus}</span>
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded text-[11px] font-bold ${
                        tx.paymentStatus === 'Captured' || tx.paymentStatus === 'Successful'
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                          : tx.paymentStatus === 'Pending'
                          ? 'bg-amber-100 text-amber-800 border border-amber-300'
                          : tx.paymentStatus === 'Failed'
                          ? 'bg-rose-100 text-rose-800 border border-rose-300'
                          : 'bg-slate-100 text-slate-600 border border-slate-200'
                      }`}
                    >
                      {tx.paymentStatus === 'Not Attempted' ? 'Not attempted' : tx.paymentStatus}
                    </span>
                  </td>
                  <td className="px-6 py-4 font-mono text-slate-500 text-[11px]">
                    {tx.timestamp}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => setSelectedTx(tx)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md font-semibold text-[11px] transition-colors"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Details</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Transaction Detail Drawer */}
      {selectedTx && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-end p-4">
          <div className="bg-white rounded-xl border border-slate-200 w-full max-w-lg shadow-2xl p-6 space-y-6 animate-in slide-in-from-right duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <span className="text-xs text-slate-400 font-mono">Transaction Breakdown</span>
                <h3 className="text-base font-bold text-slate-900">{selectedTx.id}</h3>
              </div>
              <button
                onClick={() => setSelectedTx(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Item Breakdown */}
            <div className="space-y-3">
              <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Line Items
              </h4>
              <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 space-y-2 text-xs">
                {selectedTx.items.map((item, idx) => (
                  <div key={idx} className="flex justify-between items-center text-slate-800">
                    <div>
                      <span className="font-semibold">{item.productName}</span>
                      {item.isUpsell && (
                        <span className="ml-2 text-[10px] font-bold text-indigo-700 bg-indigo-100 px-1.5 py-0.2 rounded">
                          Growth Upsell
                        </span>
                      )}
                    </div>
                    <span className="font-mono">₹{item.price.toLocaleString()}</span>
                  </div>
                ))}

                <div className="pt-2 border-t border-slate-200 space-y-1 font-mono text-[11px]">
                  <div className="flex justify-between text-slate-500">
                    <span>Subtotal:</span>
                    <span>₹{selectedTx.subtotal.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-indigo-600">
                    <span>Upsell Add-on:</span>
                    <span>₹{selectedTx.upsellTotal.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-slate-900 font-bold text-xs pt-1 border-t border-slate-200">
                    <span>Total Amount:</span>
                    <span>₹{selectedTx.totalAmount.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Policy Audit Trace */}
            <div className="space-y-2">
              <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Policy Gate Decision
              </h4>
              <div className="bg-slate-900 text-white p-4 rounded-lg text-xs space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Result:</span>
                  <span
                    className={`font-bold px-2 py-0.5 rounded text-[10px] ${
                      selectedTx.policyStatus === 'Approved' ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white'
                    }`}
                  >
                    {selectedTx.policyStatus}
                  </span>
                </div>
                <p className="text-[11px] text-slate-300 font-mono">{selectedTx.policyReason}</p>
                <div className="flex justify-between text-[11px] text-slate-400 border-t border-slate-800 pt-2 font-mono">
                  <span>Razorpay API Calls:</span>
                  <span className="font-bold text-amber-400">{selectedTx.razorpayApiCalls}</span>
                </div>
              </div>
            </div>

            <div className="pt-2 flex justify-between items-center">
              <a
                href="https://ai-growth-agentic-commerce-production.up.railway.app"
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-lg text-xs font-semibold"
              >
                ↗ View Live Store (Railway)
              </a>
              <button
                onClick={() => setSelectedTx(null)}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold"
              >
                Close Details
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
