'use client';

import React from 'react';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { FailureScenarioModal } from '../common/FailureScenarioModal';
import { CommerceProvider } from '@/context/CommerceContext';

export const AppShell: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <CommerceProvider>
      <div className="min-h-screen bg-slate-50 flex font-sans antialiased text-slate-900">
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
