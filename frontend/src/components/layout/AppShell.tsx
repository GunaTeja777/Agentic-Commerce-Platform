'use client';

import React from 'react';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { FailureScenarioModal } from '../common/FailureScenarioModal';
import { CommerceProvider } from '@/context/CommerceContext';

export const AppShell: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <CommerceProvider>
      {/* Prominent Test Mode Banner */}
      <div className="bg-amber-600 text-white text-xs font-semibold py-1.5 px-4 text-center tracking-wide flex items-center justify-center gap-2 shadow-xs sticky top-0 z-30">
        <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
        <span>TEST MODE — No real money is moved. Razorpay Sandbox active.</span>
      </div>
      <div className="min-h-[calc(100vh-32px)] bg-slate-50 flex font-sans antialiased text-slate-900">
        <Sidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <Topbar />
          <main className="flex-1 p-6 md:p-8 overflow-y-auto">
            <div className="max-w-7xl mx-auto space-y-6">
              {children}
            </div>
          </main>
        </div>
        <FailureScenarioModal />
      </div>
    </CommerceProvider>
  );
};
