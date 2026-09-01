'use client';

import React from 'react';
import { Bell, ShieldCheck, User, Sparkles } from 'lucide-react';
import { useCommerce } from '@/context/CommerceContext';

export const Topbar: React.FC = () => {
  const { setIsFailureModalOpen } = useCommerce();

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between sticky top-0 z-20 shadow-xs">
      <div className="flex items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold text-slate-900">Demo Merchant</h2>
            <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
              Test Mode
            </span>
          </div>
          <p className="text-xs text-slate-500 font-normal">Razorpay Sandbox Connected</p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {/* Core Principle Pill Header */}
        <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-100 border border-slate-200 text-xs text-slate-700">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
          <span className="font-medium text-slate-800">Policy Engine Controls Money Movement</span>
        </div>

        <button
          onClick={() => setIsFailureModalOpen(true)}
          className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 rounded-md text-xs font-medium transition-colors"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>Failure Demo</span>
        </button>

        <button className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors relative">
          <Bell className="w-4 h-4" />
          <span className="w-2 h-2 bg-indigo-600 rounded-full absolute top-1.5 right-1.5" />
        </button>

        <div className="h-6 w-px bg-slate-200 my-auto" />

        <div className="flex items-center gap-2 pl-1 cursor-pointer">
          <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-300 flex items-center justify-center text-slate-700 font-semibold text-xs">
            DM
          </div>
          <div className="hidden md:block text-left text-xs">
            <p className="font-medium text-slate-900 leading-tight">Admin Merchant</p>
            <p className="text-[11px] text-slate-500">merchant@demo.com</p>
          </div>
        </div>
      </div>
    </header>
  );
};
