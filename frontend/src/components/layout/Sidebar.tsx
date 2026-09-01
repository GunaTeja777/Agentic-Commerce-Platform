'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Bot,
  Activity,
  Package,
  TrendingUp,
  CreditCard,
  ShieldAlert,
  History,
  GitFork,
  AlertTriangle
} from 'lucide-react';
import { useCommerce } from '@/context/CommerceContext';

const NAV_ITEMS = [
  { name: 'Overview', href: '/', icon: LayoutDashboard },
  { name: 'AI Buyer', href: '/buyer', icon: Bot },
  { name: 'Agent Activity', href: '/activity', icon: Activity },
  { name: 'Catalog', href: '/catalog', icon: Package },
  { name: 'Growth', href: '/growth', icon: TrendingUp },
  { name: 'Transactions', href: '/transactions', icon: CreditCard },
  { name: 'Policy & Limits', href: '/policy', icon: ShieldAlert },
  { name: 'Audit Trail', href: '/audit', icon: History },
  { name: 'Architecture', href: '/architecture', icon: GitFork }
];

export const Sidebar: React.FC = () => {
  const pathname = usePathname();
  const { setIsFailureModalOpen } = useCommerce();

  return (
    <aside className="w-64 bg-slate-900 border-r border-slate-800 text-slate-300 flex flex-col justify-between h-screen sticky top-0 shrink-0 select-none">
      <div>
        {/* Brand Header */}
        <div className="h-16 px-6 flex items-center gap-3 border-b border-slate-800 bg-slate-950/40">
          <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center font-bold text-white shadow-sm shadow-indigo-500/30">
            AC
          </div>
          <div>
            <h1 className="font-semibold text-white text-sm leading-tight tracking-tight">
              Agentic Commerce
            </h1>
            <p className="text-[11px] text-slate-400 font-medium">Merchant Growth OS</p>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="p-3 space-y-1">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2 rounded-md text-xs font-medium transition-colors ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/60'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Failure Demo Quick Launcher */}
      <div className="p-3 border-t border-slate-800/80 bg-slate-950/30">
        <button
          onClick={() => setIsFailureModalOpen(true)}
          className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-md bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 border border-rose-800/50 text-xs font-medium transition-all shadow-sm group"
        >
          <AlertTriangle className="w-4 h-4 text-rose-400 group-hover:scale-110 transition-transform" />
          <span>Failure Scenario Demo</span>
        </button>
        <p className="text-[10px] text-slate-500 text-center mt-2 px-1">
          Test ₹75,000 policy block & 0 Razorpay API calls
        </p>
      </div>
    </aside>
  );
};
