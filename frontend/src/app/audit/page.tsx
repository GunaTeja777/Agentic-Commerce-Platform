'use client';

import React, { useState } from 'react';
import { useCommerce } from '@/context/CommerceContext';
import { History, Filter, ShieldCheck, Cpu, CreditCard, Sparkles, AlertTriangle } from 'lucide-react';

export default function AuditTrailPage() {
  const { auditEvents } = useCommerce();
  const [selectedFilter, setSelectedFilter] = useState<string>('All');

  const filters = ['All', 'Agent', 'Policy', 'Payment', 'Growth', 'Blocked'];

  const filteredEvents = auditEvents.filter((evt) => {
    if (selectedFilter === 'All') return true;
    return evt.category === selectedFilter;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Audit Trail</h1>
        <p className="text-sm text-slate-500 mt-1">
          Every important agent and money action is recorded and explainable
        </p>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-3">
        <div className="flex items-center gap-1.5 text-xs text-slate-500 font-semibold mr-2">
          <Filter className="w-3.5 h-3.5" />
          <span>Filter Events:</span>
        </div>
        {filters.map((filter) => (
          <button
            key={filter}
            onClick={() => setSelectedFilter(filter)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              selectedFilter === filter
                ? 'bg-slate-900 text-white shadow-2xs'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            {filter}
          </button>
        ))}
      </div>

      {/* Audit Log Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider">
              <tr>
                <th className="px-6 py-3.5">Time</th>
                <th className="px-6 py-3.5">Actor</th>
                <th className="px-6 py-3.5">Action</th>
                <th className="px-6 py-3.5">Reason / Explanation</th>
                <th className="px-6 py-3.5">Amount</th>
                <th className="px-6 py-3.5 text-right">Result</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {filteredEvents.map((evt) => (
                <tr key={evt.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="px-6 py-4 font-mono text-slate-500 text-[11px]">
                    {evt.timestamp}
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold ${
                        evt.actor === 'Policy Tool'
                          ? 'bg-purple-50 text-purple-700'
                          : evt.actor === 'Growth Tool'
                          ? 'bg-indigo-50 text-indigo-700'
                          : evt.actor === 'Payment Tool'
                          ? 'bg-emerald-50 text-emerald-700'
                          : 'bg-slate-100 text-slate-800'
                      }`}
                    >
                      {evt.actor}
                    </span>
                  </td>
                  <td className="px-6 py-4 font-semibold text-slate-900">{evt.action}</td>
                  <td className="px-6 py-4 text-slate-600 max-w-xs">{evt.reason}</td>
                  <td className="px-6 py-4 font-mono font-bold text-slate-900">
                    {evt.amount ? `₹${evt.amount.toLocaleString()}` : '—'}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <span
                      className={`px-2.5 py-0.5 rounded text-[10px] font-extrabold uppercase tracking-wide ${
                        evt.result === 'Allowed' || evt.result === 'Successful' || evt.result === 'Approved'
                          ? 'bg-emerald-100 text-emerald-800'
                          : evt.result === 'Blocked'
                          ? 'bg-rose-600 text-white'
                          : evt.result === 'Suggested'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {evt.result}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
