'use client';

import React, { useEffect, useState } from 'react';
import { ShieldAlert, X, Smartphone, AlertTriangle, ArrowRight, ShieldCheck } from 'lucide-react';

interface MobileNotificationToastProps {
  isOpen: boolean;
  onClose: () => void;
  orderAmount: number;
  currentSpent: number;
  projectedTotal: number;
  budgetLimit: number;
  onAuthorizeClick?: () => void;
}

export const MobileNotificationToast: React.FC<MobileNotificationToastProps> = ({
  isOpen,
  onClose,
  orderAmount,
  currentSpent,
  projectedTotal,
  budgetLimit,
  onAuthorizeClick
}) => {
  const [isVibrating, setIsVibrating] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsVibrating(true);
      const timer = setTimeout(() => setIsVibrating(false), 800);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const excess = Math.max(0, projectedTotal - budgetLimit);
  const percentage = Math.min(100, Math.round((currentSpent / budgetLimit) * 100));
  const projectedPercentage = Math.round((projectedTotal / budgetLimit) * 100);

  return (
    <div className="fixed top-5 right-5 z-50 max-w-sm sm:max-w-md w-full animate-in slide-in-from-top-5 duration-300 pointer-events-auto">
      <div
        className={`rounded-2xl bg-slate-950/95 text-white shadow-2xl border-2 border-rose-500/80 backdrop-blur-md overflow-hidden transition-transform ${
          isVibrating ? 'scale-[1.02] translate-y-[-2px]' : 'scale-100'
        }`}
        style={{
          boxShadow: '0 20px 40px -15px rgba(225, 29, 72, 0.4), 0 0 20px rgba(225, 29, 72, 0.2)'
        }}
      >
        {/* Mobile Status Bar Simulation */}
        <div className="bg-slate-900/90 px-4 py-2 border-b border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-md bg-rose-600 text-white flex items-center justify-center font-bold text-[10px] shadow-sm">
              <ShieldAlert className="w-3.5 h-3.5" />
            </div>
            <span className="font-bold tracking-wider uppercase text-slate-200 text-[10px]">
              Razorpay SafeGuard &bull; Mobile Push Alert
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-rose-400 font-mono font-bold animate-pulse">JUST NOW</span>
            <button
              onClick={onClose}
              className="p-1 hover:bg-slate-800 rounded-md text-slate-400 hover:text-white transition-colors ml-1"
              title="Dismiss notification"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Notification Body */}
        <div className="p-4 space-y-3">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-xl bg-rose-500/20 text-rose-400 border border-rose-500/40 shrink-0 mt-0.5">
              <Smartphone className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <h4 className="text-xs font-extrabold text-rose-300 flex items-center gap-1.5">
                <span>⚠️ Cumulative Budget Limit Exceeded</span>
              </h4>
              <p className="text-[11.5px] text-slate-300 leading-relaxed font-sans">
                This purchase of <strong className="text-white font-mono">₹{orderAmount.toLocaleString()}</strong> pushes your total monthly spending to <strong className="text-rose-300 font-mono">₹{projectedTotal.toLocaleString()}</strong>, crossing your <strong className="text-white font-mono">₹{budgetLimit.toLocaleString()}</strong> budget by <strong className="text-rose-400 font-mono">₹{excess.toLocaleString()}</strong>.
              </p>
            </div>
          </div>

          {/* Velocity Progress Meter */}
          <div className="bg-slate-900 rounded-lg p-2.5 border border-slate-800 space-y-1.5 font-mono text-[10px]">
            <div className="flex justify-between text-slate-400">
              <span>Cumulative Spend:</span>
              <span className="text-rose-400 font-bold">{projectedPercentage}% of Budget</span>
            </div>
            <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden flex">
              <div
                className="bg-indigo-500 h-full transition-all duration-500"
                style={{ width: `${Math.min(100, percentage)}%` }}
                title={`Already spent: ₹${currentSpent}`}
              />
              <div
                className="bg-rose-500 h-full transition-all duration-500 animate-pulse"
                style={{ width: `${Math.min(100 - percentage, Math.max(5, projectedPercentage - percentage))}%` }}
                title={`Exceeding amount: ₹${excess}`}
              />
            </div>
            <div className="flex justify-between text-[9.5px] text-slate-400 pt-0.5">
              <span>Current: ₹{currentSpent.toLocaleString()}</span>
              <span>Limit: ₹{budgetLimit.toLocaleString()}</span>
            </div>
          </div>

          {/* Action Footer */}
          <div className="pt-1 flex items-center justify-between gap-2 text-xs font-sans">
            <span className="text-[10px] text-amber-300 font-medium">
              Autonomous purchase suspended &bull; Human verification mandated.
            </span>
            {onAuthorizeClick && (
              <button
                onClick={() => {
                  onAuthorizeClick();
                  onClose();
                }}
                className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-bold transition-all shadow-md shrink-0 flex items-center gap-1 cursor-pointer"
              >
                <span>Authorize</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
