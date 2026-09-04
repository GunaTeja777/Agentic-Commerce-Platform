'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Bot,
  Package,
  TrendingUp,
  ShieldCheck,
  ArrowDown,
  Lock,
  Cpu,
  FileJson,
  CheckCircle2,
  XCircle,
  Sparkles,
  Server,
  Database,
  Layers,
  Globe,
  Zap,
  CreditCard,
  UserCheck,
  AlertTriangle,
  RotateCcw,
  Search,
  Receipt,
  Terminal,
  ExternalLink,
  ChevronRight,
  ShieldAlert,
  Smartphone
} from 'lucide-react';

export default function ArchitecturePage() {
  const [activeTab, setActiveTab] = useState<'diagram' | 'spec' | 'matrix'>('diagram');

  return (
    <div className="space-y-8 pb-20 font-sans max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-slate-200 pb-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-semibold mb-2">
            <Layers className="w-3.5 h-3.5" />
            <span>Dual-Agent A2A &bull; Unified Agent Protocol (UAP) &bull; Model Context Protocol (MCP)</span>
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
            Agentic Commerce Architecture
          </h1>
          <p className="text-sm text-slate-600 mt-1.5 max-w-3xl leading-relaxed">
            Strict separation of concerns: Buyer-side Hugging Face Llama-3.3-70B intent curation, Merchant-side Groq Llama-3.3-70B orchestrator, 
            Live Railway PostgreSQL MCP E-Commerce Platform with 8 Production Tools, and Deterministic 3-Tier Financial Policy Guardrails.
          </p>
        </div>
        <div className="flex items-center gap-2.5 shrink-0">
          <Link
            href="/demo"
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold transition-colors shadow-xs"
          >
            <Zap className="w-3.5 h-3.5" />
            <span>Live Interactive Demo</span>
          </Link>
          <a
            href="https://ai-growth-agentic-commerce-production.up.railway.app"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 text-emerald-800 rounded-lg text-xs font-semibold transition-colors"
          >
            <Globe className="w-3.5 h-3.5 text-emerald-600" />
            <span>Live Railway Store</span>
            <ExternalLink className="w-3 h-3 text-emerald-600" />
          </a>
        </div>
      </div>

      {/* Navigation Pills */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-3">
        <button
          onClick={() => setActiveTab('diagram')}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
            activeTab === 'diagram'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          Visual Execution Flow
        </button>
        <button
          onClick={() => setActiveTab('spec')}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
            activeTab === 'spec'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          UAP &amp; MCP Schema Spec
        </button>
        <button
          onClick={() => setActiveTab('matrix')}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
            activeTab === 'matrix'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          Security &amp; Policy Matrix
        </button>
      </div>

      {activeTab === 'diagram' && (
        <div className="bg-slate-50/90 border-2 border-dashed border-slate-300 rounded-2xl p-6 md:p-8 shadow-xs space-y-8 font-mono">
          
          {/* ========================================================================= */}
          {/* 1. TOP NODE: BUYER-SIDE AI AGENT */}
          {/* ========================================================================= */}
          <div className="flex flex-col items-center">
            <div className="bg-gradient-to-r from-purple-900 via-purple-950 to-indigo-950 text-white border-2 border-purple-400 rounded-xl px-6 py-4 shadow-lg text-center max-w-2xl w-full relative">
              <div className="absolute -top-3 right-4 bg-purple-400 text-slate-950 font-sans font-extrabold text-[10px] px-2.5 py-0.5 rounded shadow-xs uppercase tracking-wider">
                Hugging Face &bull; Llama-3.3-70B-Instruct
              </div>
              <div className="flex items-center justify-center gap-2 font-bold text-sm">
                <Bot className="w-5 h-5 text-purple-300" />
                <span>1. BUYER-SIDE AI AGENT (Conversational Shopping Brain)</span>
              </div>
              <p className="text-xs text-purple-200 mt-1.5 font-sans leading-relaxed">
                Accepts natural language user commands (e.g. <em>&ldquo;StrikePad Gaming Mouse Pad XL order this&rdquo;</em> or <em>&ldquo;i want a mouse&rdquo;</em>). 
                Differentiates exact vs generic queries, tracks conversation context, and maps intent into deterministic protocol parameters.
              </p>
              <div className="flex flex-wrap items-center justify-center gap-1.5 mt-2.5 font-sans text-[10px]">
                <span className="bg-purple-950/80 text-purple-300 border border-purple-600/50 px-2 py-0.5 rounded">ORDER</span>
                <span className="bg-purple-950/80 text-purple-300 border border-purple-600/50 px-2 py-0.5 rounded">CATALOG_SEARCH</span>
                <span className="bg-purple-950/80 text-purple-300 border border-purple-600/50 px-2 py-0.5 rounded">LIST_ORDERS</span>
                <span className="bg-purple-950/80 text-purple-300 border border-purple-600/50 px-2 py-0.5 rounded">CANCEL_ORDER</span>
                <span className="bg-purple-950/80 text-purple-300 border border-purple-600/50 px-2 py-0.5 rounded">POLICY_INQUIRY</span>
              </div>
            </div>

            {/* A2A Handshake Connector: UNIFIED AGENT PROTOCOL (UAP) */}
            <div className="flex flex-col items-center my-3 text-slate-400">
              <ArrowDown className="w-5 h-5 text-purple-600 animate-bounce" />
              <div className="flex items-center gap-2 text-xs bg-white px-4 py-2 rounded-xl border-2 border-purple-300 text-purple-950 font-sans shadow-xs font-semibold mt-1">
                <FileJson className="w-4 h-4 text-purple-600 shrink-0" />
                <span>
                  <strong>Unified Agent Protocol (UAP) Payload:</strong> <code className="text-purple-700 font-mono text-[11px]">{'{ buyer_id, intent, category, budget_inr, preferences }'}</code>
                </span>
              </div>
              <span className="text-[10px] text-slate-500 font-sans mt-1">Machine-readable contract &bull; Zero browser scraping &bull; Standardized A2A session</span>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* 2. MERCHANT AI AGENT & GROQ ORCHESTRATOR */}
          {/* ========================================================================= */}
          <div className="flex flex-col items-center">
            <div className="bg-gradient-to-r from-indigo-900 via-slate-900 to-indigo-950 text-white border-2 border-indigo-400 rounded-xl px-6 py-4 shadow-lg text-center max-w-2xl w-full relative">
              <div className="absolute -top-3 right-4 bg-amber-400 text-slate-950 font-sans font-extrabold text-[10px] px-2.5 py-0.5 rounded shadow-xs uppercase tracking-wider">
                Groq Cloud &bull; Llama-3.3-70B-Versatile
              </div>
              <div className="flex items-center justify-center gap-2 font-bold text-sm">
                <Cpu className="w-5 h-5 text-indigo-300" />
                <span>2. MERCHANT AI AGENT (Store Brain &amp; Orchestrator)</span>
              </div>
              <p className="text-xs text-indigo-200 mt-1.5 font-sans leading-relaxed">
                Ingests UAP commerce contract &bull; Evaluates catalog availability &bull; Generates context-aware growth recommendations 
                &bull; Computes itemized totals with taxes and shipping &bull; Prepares deterministic order manifest.
              </p>
            </div>

            {/* MCP Protocol Tool Call Boundary */}
            <div className="flex flex-col items-center my-3 text-slate-400">
              <ArrowDown className="w-5 h-5 text-indigo-600" />
              <div className="flex items-center gap-2 text-xs bg-white px-4 py-1.5 rounded-lg border border-indigo-300 text-indigo-950 font-sans shadow-2xs font-semibold">
                <Terminal className="w-3.5 h-3.5 text-indigo-600" />
                <span>Anthropic Model Context Protocol (MCP) &bull; Standardized Tool Invocation</span>
              </div>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* 3. LIVE RAILWAY MCP & 8 PRODUCTION TOOLS */}
          {/* ========================================================================= */}
          <div className="max-w-5xl mx-auto w-full">
            <div className="text-center text-xs font-bold text-slate-700 uppercase tracking-widest mb-3 flex items-center justify-center gap-2">
              <Server className="w-4 h-4 text-emerald-600" />
              <span>3. LIVE RAILWAY MCP &amp; POSTGRESQL E-COMMERCE PLATFORM (<a href="https://ai-growth-agentic-commerce-production.up.railway.app" target="_blank" rel="noopener noreferrer" className="text-emerald-700 underline font-bold">LIVE STORE</a>)</span>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {/* Tool 1 */}
              <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-2xs space-y-1.5 hover:border-indigo-300 transition-colors">
                <div className="flex items-center justify-between">
                  <span className="font-mono font-bold text-xs text-indigo-700 flex items-center gap-1.5">
                    <Search className="w-3.5 h-3.5 text-indigo-600" />
                    search_products
                  </span>
                  <span className="text-[9px] bg-slate-100 px-1.5 py-0.5 rounded text-slate-600 font-mono">MCP</span>
                </div>
                <p className="text-[11px] text-slate-600 font-sans leading-tight">
                  Full-text multi-token search across 99 real database products with stock and pricing.
                </p>
              </div>

              {/* Tool 2 */}
              <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-2xs space-y-1.5 hover:border-indigo-300 transition-colors">
                <div className="flex items-center justify-between">
                  <span className="font-mono font-bold text-xs text-indigo-700 flex items-center gap-1.5">
                    <Package className="w-3.5 h-3.5 text-indigo-600" />
                    get_product
                  </span>
                  <span className="text-[9px] bg-slate-100 px-1.5 py-0.5 rounded text-slate-600 font-mono">MCP</span>
                </div>
                <p className="text-[11px] text-slate-600 font-sans leading-tight">
                  Fetches authoritative SKU details, specifications, images, and live inventory count.
                </p>
              </div>

              {/* Tool 3 */}
              <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-2xs space-y-1.5 hover:border-emerald-300 transition-colors">
                <div className="flex items-center justify-between">
                  <span className="font-mono font-bold text-xs text-emerald-700 flex items-center gap-1.5">
                    <Database className="w-3.5 h-3.5 text-emerald-600" />
                    check_inventory
                  </span>
                  <span className="text-[9px] bg-emerald-50 px-1.5 py-0.5 rounded text-emerald-700 font-mono">Atomic</span>
                </div>
                <p className="text-[11px] text-slate-600 font-sans leading-tight">
                  Real-time PostgreSQL atomic stock check preventing race conditions &amp; overselling.
                </p>
              </div>

              {/* Tool 4 */}
              <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-2xs space-y-1.5 hover:border-blue-300 transition-colors">
                <div className="flex items-center justify-between">
                  <span className="font-mono font-bold text-xs text-blue-700 flex items-center gap-1.5">
                    <TrendingUp className="w-3.5 h-3.5 text-blue-600" />
                    growth_rec...
                  </span>
                  <span className="text-[9px] bg-blue-50 px-1.5 py-0.5 rounded text-blue-700 font-mono">Consent</span>
                </div>
                <p className="text-[11px] text-slate-600 font-sans leading-tight">
                  Personalized cross-sells (e.g. Sleeve for Laptop). Explicit buyer consent required.
                </p>
              </div>

              {/* Tool 5 */}
              <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-2xs space-y-1.5 hover:border-purple-300 transition-colors">
                <div className="flex items-center justify-between">
                  <span className="font-mono font-bold text-xs text-purple-700 flex items-center gap-1.5">
                    <Receipt className="w-3.5 h-3.5 text-purple-600" />
                    create_order
                  </span>
                  <span className="text-[9px] bg-purple-50 px-1.5 py-0.5 rounded text-purple-700 font-mono">DB</span>
                </div>
                <p className="text-[11px] text-slate-600 font-sans leading-tight">
                  Reserves database inventory on Railway PostgreSQL and generates internal booking ID.
                </p>
              </div>

              {/* Tool 6 */}
              <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-2xs space-y-1.5 hover:border-emerald-300 transition-colors">
                <div className="flex items-center justify-between">
                  <span className="font-mono font-bold text-xs text-emerald-700 flex items-center gap-1.5">
                    <CreditCard className="w-3.5 h-3.5 text-emerald-600" />
                    settle_order
                  </span>
                  <span className="text-[9px] bg-emerald-50 px-1.5 py-0.5 rounded text-emerald-700 font-mono">Settle</span>
                </div>
                <p className="text-[11px] text-slate-600 font-sans leading-tight">
                  Captures payment via Razorpay Order ID or autonomous settlement token (<code className="text-[10px]">pay_agent_mcp_...</code>).
                </p>
              </div>

              {/* Tool 7 */}
              <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-2xs space-y-1.5 hover:border-rose-300 transition-colors">
                <div className="flex items-center justify-between">
                  <span className="font-mono font-bold text-xs text-rose-700 flex items-center gap-1.5">
                    <RotateCcw className="w-3.5 h-3.5 text-rose-600" />
                    cancel_order
                  </span>
                  <span className="text-[9px] bg-rose-50 px-1.5 py-0.5 rounded text-rose-700 font-mono">Rollback</span>
                </div>
                <p className="text-[11px] text-slate-600 font-sans leading-tight">
                  Cancels booking, releases reserved PostgreSQL inventory stock, and logs audit record.
                </p>
              </div>

              {/* Tool 8 */}
              <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-2xs space-y-1.5 hover:border-slate-300 transition-colors">
                <div className="flex items-center justify-between">
                  <span className="font-mono font-bold text-xs text-slate-800 flex items-center gap-1.5">
                    <FileJson className="w-3.5 h-3.5 text-slate-600" />
                    list_orders
                  </span>
                  <span className="text-[9px] bg-slate-100 px-1.5 py-0.5 rounded text-slate-600 font-mono">Query</span>
                </div>
                <p className="text-[11px] text-slate-600 font-sans leading-tight">
                  Queries multi-tenant customer order history, live fulfillment status, and items list.
                </p>
              </div>
            </div>

            <div className="flex flex-col items-center my-4 text-slate-400">
              <ArrowDown className="w-5 h-5 text-slate-600" />
            </div>
          </div>

          {/* ========================================================================= */}
          {/* 4. THE POLICY GATE (DETERMINISTIC TRUST BOUNDARY) */}
          {/* ========================================================================= */}
          <div className="flex flex-col items-center">
            <div className="bg-slate-950 text-white border-4 border-amber-400 rounded-2xl p-6 shadow-xl text-center max-w-2xl w-full relative">
              <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-amber-400 text-slate-950 font-sans font-extrabold text-[10px] px-4 py-0.5 rounded-full uppercase tracking-wider shadow-sm">
                NON-BYPASSABLE FINANCIAL TRUST BOUNDARY
              </div>
              <div className="flex items-center justify-center gap-2 font-bold text-base text-amber-300">
                <Lock className="w-5 h-5" />
                <span>4. THE DETERMINISTIC POLICY GATE (Fail-Closed)</span>
              </div>
              <p className="text-xs text-slate-200 mt-2 font-sans leading-relaxed">
                Evaluates computed total against buyer budget and financial limits in pure Python/TypeScript code. 
                The LLM <strong>CANNOT hallucinate or override</strong> this decision.
              </p>
              <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-slate-800 font-sans text-[11px]">
                <div className="bg-slate-900 p-2 rounded border border-emerald-500/40 text-emerald-300">
                  <div className="font-bold">Tier 1: Auto</div>
                  <div>&le; ₹5,000</div>
                </div>
                <div className="bg-slate-900 p-2 rounded border border-indigo-500/40 text-indigo-300">
                  <div className="font-bold">Tier 2: Approval</div>
                  <div>₹5,001 &ndash; ₹70,000</div>
                </div>
                <div className="bg-slate-900 p-2 rounded border border-rose-500/40 text-rose-300">
                  <div className="font-bold">Tier 3: Refuse</div>
                  <div>&gt; ₹70,000</div>
                </div>
              </div>

              {/* Anti-Runaway AI Spend Velocity SafeGuard */}
              <div className="mt-4 pt-3.5 border-t border-slate-800 flex flex-col md:flex-row items-center justify-between gap-3 text-left w-full">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-rose-500/20 text-rose-400 border border-rose-500/40 flex items-center justify-center shrink-0">
                    <Smartphone className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-rose-300 flex items-center gap-1.5">
                      <span>Velocity Guardrail (Anti-Runaway AI Loop)</span>
                      <span className="text-[9px] bg-rose-950 text-rose-300 border border-rose-800 px-1.5 py-0.2 rounded font-mono">Mobile Alert</span>
                    </div>
                    <p className="text-[11px] text-slate-300 font-sans leading-tight mt-0.5">
                      Tracks rolling monthly expenditures. If total spend crosses <strong>₹50,000</strong>, autonomous auto-buy is <strong>immediately suspended</strong> and a real-time mobile push alert is dispatched to the buyer.
                    </p>
                  </div>
                </div>
                <div className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-[10px] font-mono text-amber-300 shrink-0">
                  Velocity Limit: ₹50,000 / month
                </div>
              </div>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* 5. 3-TIER POLICY BRANCHING + VELOCITY SAFEGUARD */}
          {/* ========================================================================= */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-5xl mx-auto pt-2">
            
            {/* TIER 1: AUTONOMOUS ZERO-TOUCH */}
            <div className="bg-emerald-50/90 border-2 border-emerald-400 rounded-2xl p-4 shadow-xs space-y-3">
              <div className="flex items-center gap-2 font-bold text-xs text-emerald-950 pb-2 border-b border-emerald-200">
                <Zap className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>TIER 1: AUTONOMOUS (&le; ₹5,000)</span>
              </div>
              <div className="space-y-2 font-sans text-xs">
                <div className="bg-white p-2.5 rounded-lg border border-emerald-200">
                  <span className="font-bold text-slate-900 block font-mono text-[11px]">1. Zero-Touch Booking</span>
                  <span className="text-slate-600 text-[11px]">Directly invokes Railway PostgreSQL MCP tool to reserve stock.</span>
                </div>
                <div className="bg-white p-2.5 rounded-lg border border-emerald-200">
                  <span className="font-bold text-slate-900 block font-mono text-[11px]">2. Autonomous Settlement</span>
                  <span className="text-slate-600 text-[11px]">Generates settlement token <code className="text-[10px]">pay_agent_mcp_...</code> with zero human clicks.</span>
                </div>
                <div className="bg-white p-2.5 rounded-lg border border-emerald-200">
                  <span className="font-bold text-emerald-800 block font-mono text-[11px]">3. Instant Receipt</span>
                  <span className="text-slate-600 text-[11px]">Returns verified paid invoice back to the shopper in chat.</span>
                </div>
                <div className="bg-rose-50 p-2 rounded border border-rose-200 text-[10.5px] text-rose-900 font-medium">
                  <strong>SafeGuard Interceptor:</strong> Suspends to Tier 2 if Cumulative Spent &gt; ₹50,000 limit.
                </div>
              </div>
            </div>

            {/* TIER 2: HUMAN-IN-THE-LOOP */}
            <div className="bg-indigo-50/90 border-2 border-indigo-400 rounded-2xl p-4 shadow-xs space-y-3">
              <div className="flex items-center gap-2 font-bold text-xs text-indigo-950 pb-2 border-b border-indigo-200">
                <UserCheck className="w-4 h-4 text-indigo-600 shrink-0" />
                <span>TIER 2: HUMAN APPROVAL (₹5,001 &ndash; ₹70k)</span>
              </div>
              <div className="space-y-2 font-sans text-xs">
                <div className="bg-white p-2.5 rounded-lg border border-indigo-200">
                  <span className="font-bold text-slate-900 block font-mono text-[11px]">1. Execution Paused</span>
                  <span className="text-slate-600 text-[11px]">Halts at Policy Gate &bull; Presents transparent itemized breakdown.</span>
                </div>
                <div className="bg-white p-2.5 rounded-lg border border-indigo-200">
                  <span className="font-bold text-slate-900 block font-mono text-[11px]">2. Authorization Prompt</span>
                  <span className="text-slate-600 text-[11px]">User clicks <strong>&ldquo;Authorize Order&rdquo;</strong> to cryptographically sign payment.</span>
                </div>
                <div className="bg-white p-2.5 rounded-lg border border-indigo-200">
                  <span className="font-bold text-indigo-800 block font-mono text-[11px]">3. Razorpay Order Bound</span>
                  <span className="text-slate-600 text-[11px]">Generates <code className="text-[10px]">order_...</code> with HMAC SHA-256 validation.</span>
                </div>
                <div className="bg-purple-50 p-2 rounded border border-purple-200 text-[10.5px] text-purple-900 font-medium flex items-center gap-1.5">
                  <Smartphone className="w-3.5 h-3.5 text-purple-700 shrink-0" />
                  <span><strong>Mobile Push Alert:</strong> Dispatches notification if monthly limit breached.</span>
                </div>
              </div>
            </div>

            {/* TIER 3: HARD POLICY BLOCK */}
            <div className="bg-rose-50/90 border-2 border-rose-400 rounded-2xl p-4 shadow-xs space-y-3">
              <div className="flex items-center gap-2 font-bold text-xs text-rose-950 pb-2 border-b border-rose-200">
                <XCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>TIER 3: HARD REFUSAL (&gt; ₹70,000)</span>
              </div>
              <div className="space-y-2 font-sans text-xs">
                <div className="bg-white p-2.5 rounded-lg border border-rose-200">
                  <span className="font-bold text-rose-800 block font-mono text-[11px]">1. Payment Tool Disabled</span>
                  <span className="text-slate-600 text-[11px]">Hard fail-closed &bull; Money movement strictly prohibited.</span>
                </div>
                <div className="bg-white p-2.5 rounded-lg border border-rose-200">
                  <span className="font-bold text-slate-900 block font-mono text-[11px]">2. Zero External Calls</span>
                  <span className="text-slate-600 text-[11px]">Zero Razorpay API charges &bull; Zero inventory locks.</span>
                </div>
                <div className="bg-white p-2.5 rounded-lg border border-rose-200">
                  <span className="font-bold text-rose-800 block font-mono text-[11px]">3. Compliance Audit</span>
                  <span className="text-slate-600 text-[11px]">Policy breach logged in immutable PostgreSQL compliance ledger.</span>
                </div>
              </div>
            </div>

          </div>

          {/* ========================================================================= */}
          {/* 6. BOTTOM NODE: UAP SETTLEMENT RECEIPT TO BUYER */}
          {/* ========================================================================= */}
          <div className="flex flex-col items-center pt-2">
            <div className="my-2 text-slate-400">
              <ArrowDown className="w-5 h-5 text-slate-600" />
            </div>

            <div className="bg-slate-950 text-white border-2 border-emerald-500/60 rounded-xl px-8 py-4 shadow-md text-center max-w-xl w-full">
              <div className="font-bold text-xs text-emerald-400 flex items-center justify-center gap-2">
                <Sparkles className="w-4 h-4 text-emerald-400" />
                <span>5. UAP VERIFIED SETTLEMENT RECEIPT (BACK TO AI BUYER)</span>
              </div>
              <p className="text-xs text-slate-300 font-sans mt-1 leading-relaxed">
                Structured agent-to-agent receipt returning Store Booking ID (<code className="text-indigo-300 text-[11px]">cmtm...</code>), 
                Razorpay Order ID (<code className="text-indigo-300 text-[11px]">order_...</code>), and Settlement Proof (<code className="text-amber-300 text-[11px]">pay_agent_mcp_...</code>) 
                directly to the conversational shopper interface.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: SPECIFICATION & CODE DETAILS */}
      {/* ========================================================================= */}
      {activeTab === 'spec' && (
        <div className="space-y-6 font-sans">
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-4">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <FileJson className="w-5 h-5 text-purple-600" />
              <span>Unified Agent Protocol (UAP) Payload Schema</span>
            </h2>
            <p className="text-xs text-slate-600">
              The standardized JSON schema exchanged between the Buyer-side Agent and Merchant-side Agent during A2A negotiation:
            </p>
            <pre className="bg-slate-950 text-emerald-300 p-4 rounded-lg text-xs font-mono overflow-x-auto border border-slate-800 leading-relaxed">
{`{
  "protocol": "UAP/1.0",
  "buyer_session_id": "session_a8f9c1d2e3",
  "buyer_id": "demo-ai-buyer",
  "intent": "ORDER",                      // "ORDER" | "CATALOG_SEARCH" | "CANCEL_ORDER" | "LIST_ORDERS"
  "query": "StrikePad Gaming Mouse Pad XL order this",
  "exact_product_match": true,            // true = direct checkout; false = recommend catalog list
  "product_id": 4,
  "category": "Accessories",
  "budget_inr": 60000,
  "cumulative_budget_limit_inr": 50000,   // Velocity ceiling to prevent runaway AI spending loops
  "preferences": {
    "speed": "express",
    "delivery_pincode": "560001",
    "growth_recommendations_allowed": true
  },
  "timestamp": "2026-09-04T21:40:23Z"
}`}
            </pre>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-4">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Terminal className="w-5 h-5 text-indigo-600" />
              <span>Model Context Protocol (MCP) Settlement Response</span>
            </h2>
            <p className="text-xs text-slate-600">
              Deterministic result produced after Policy Gate &amp; Velocity evaluation:
            </p>
            <pre className="bg-slate-950 text-indigo-300 p-4 rounded-lg text-xs font-mono overflow-x-auto border border-slate-800 leading-relaxed">
{`{
  "success": true,
  "status": "CONFIRMED & PAID",
  "store_booking_id": "cmtmuhbor0005wgj4mhpzewv3",
  "razorpay_order_id": "order_TXw6PIVNUZYcfo",
  "agent_settlement_id": "pay_agent_mcp_aojklcam",
  "checkout_mode": "Autonomous Zero-Touch MCP Booking (UAP Flow)",
  "basket_total_inr": 500,
  "currency": "INR",
  "policy_evaluation": {
    "policy_gate": "APPROVED",
    "tier": 1,
    "is_autonomous": true,
    "limit_inr": 70000,
    "rule": "Autonomous approval: total <= 5000"
  },
  "velocity_evaluation": {
    "cumulative_spent_inr": 500,
    "monthly_budget_limit_inr": 50000,
    "is_velocity_exceeded": false,
    "safeguard_mobile_push_fired": false
  },
  "database_audit": {
    "table": "orders",
    "audit_ledger_id": "audit_89127391823",
    "host": "railway-postgres-production"
  }
}`}
            </pre>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: MATRIX & SECURITY SPEC */}
      {/* ========================================================================= */}
      {activeTab === 'matrix' && (
        <div className="space-y-6 font-sans">
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-4">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-600" />
              <span>Deterministic Financial Policy &amp; Velocity Governance Matrix</span>
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border border-slate-200 rounded-lg">
                <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                  <tr>
                    <th className="p-3">Spending Bracket</th>
                    <th className="p-3">Governance Tier</th>
                    <th className="p-3">Human Intervention</th>
                    <th className="p-3">Payment Settlement Mode</th>
                    <th className="p-3">DB &amp; Inventory Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  <tr className="bg-emerald-50/40">
                    <td className="p-3 font-mono font-bold text-emerald-800">&le; ₹5,000</td>
                    <td className="p-3 font-semibold text-emerald-700">Tier 1: Autonomous</td>
                    <td className="p-3 text-slate-600">Zero-touch (No user click needed unless velocity exceeded)</td>
                    <td className="p-3 font-mono text-[11px] text-emerald-900">Agent Settlement Token (<code>pay_agent_mcp_...</code>)</td>
                    <td className="p-3 text-slate-600">Auto-reserved &amp; marked PAID in live PostgreSQL</td>
                  </tr>
                  <tr className="bg-indigo-50/40">
                    <td className="p-3 font-mono font-bold text-indigo-800">₹5,001 &ndash; ₹70,000</td>
                    <td className="p-3 font-semibold text-indigo-700">Tier 2: Human-in-the-Loop</td>
                    <td className="p-3 text-slate-600">Mandatory user click on <strong>&ldquo;Authorize Order&rdquo;</strong></td>
                    <td className="p-3 font-mono text-[11px] text-indigo-900">Razorpay Test Mode Order ID (<code>order_...</code>)</td>
                    <td className="p-3 text-slate-600">Reserved upon approval; HMAC SHA-256 verified</td>
                  </tr>
                  <tr className="bg-purple-50/50">
                    <td className="p-3 font-mono font-bold text-purple-900">&gt; ₹50,000 Cumulative</td>
                    <td className="p-3 font-semibold text-purple-700 flex items-center gap-1">
                      <Smartphone className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                      <span>SafeGuard Velocity Gate</span>
                    </td>
                    <td className="p-3 text-purple-950 font-medium">
                      Auto-suspended; <strong>Mobile Push Alert</strong> fired to buyer device
                    </td>
                    <td className="p-3 font-mono text-[11px] text-purple-900">Mandatory Human Authorization Signature</td>
                    <td className="p-3 text-slate-600">SafeGuard velocity event logged in compliance audit trail</td>
                  </tr>
                  <tr className="bg-rose-50/40">
                    <td className="p-3 font-mono font-bold text-rose-800">&gt; ₹70,000 Single Tx</td>
                    <td className="p-3 font-semibold text-rose-700">Tier 3: Hard Block</td>
                    <td className="p-3 text-slate-600">Strict refusal (Non-overridable by user or LLM)</td>
                    <td className="p-3 font-mono text-[11px] text-rose-900">Payment Tools NOT Executed (0 Calls)</td>
                    <td className="p-3 text-slate-600">Zero inventory locks; logged in compliance ledger</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TECH STACK & SECURITY MATRIX (FOOTER) */}
      {/* ========================================================================= */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs">
        <h2 className="text-base font-bold text-slate-900 mb-4 flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-indigo-600" />
          <span>Technology &amp; Security Layer Matrix</span>
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 text-xs">
          
          <div className="p-3.5 bg-slate-50 rounded-lg border border-slate-200 space-y-1">
            <div className="font-bold text-slate-900 flex items-center gap-1.5">
              <Bot className="w-3.5 h-3.5 text-purple-600" />
              <span>Buyer Curation LLM</span>
            </div>
            <div className="text-slate-700 font-semibold text-[11px]">Hugging Face Inference</div>
            <div className="text-[10px] text-slate-500 font-mono">meta-llama/Llama-3.3-70B-Instruct</div>
          </div>

          <div className="p-3.5 bg-slate-50 rounded-lg border border-slate-200 space-y-1">
            <div className="font-bold text-slate-900 flex items-center gap-1.5">
              <Cpu className="w-3.5 h-3.5 text-indigo-600" />
              <span>Merchant Brain</span>
            </div>
            <div className="text-slate-700 font-semibold text-[11px]">Groq Cloud Fast Inference</div>
            <div className="text-[10px] text-slate-500 font-mono">llama-3.3-70b-versatile</div>
          </div>

          <div className="p-3.5 bg-slate-50 rounded-lg border border-slate-200 space-y-1">
            <div className="font-bold text-slate-900 flex items-center gap-1.5">
              <Server className="w-3.5 h-3.5 text-emerald-600" />
              <span>Protocol Standards</span>
            </div>
            <div className="text-slate-700 font-semibold text-[11px]">UAP + Anthropic MCP</div>
            <div className="text-[10px] text-slate-500 font-mono">8 Live Production Tools</div>
          </div>

          <div className="p-3.5 bg-slate-50 rounded-lg border border-slate-200 space-y-1">
            <div className="font-bold text-slate-900 flex items-center gap-1.5">
              <Database className="w-3.5 h-3.5 text-blue-600" />
              <span>Live Railway Store</span>
            </div>
            <div className="text-slate-700 font-semibold text-[11px]">PostgreSQL 16 + Prisma</div>
            <div className="text-[10px] text-slate-500 font-mono">99 Real Active Products</div>
          </div>

          <div className="p-3.5 bg-slate-50 rounded-lg border border-slate-200 space-y-1">
            <div className="font-bold text-slate-900 flex items-center gap-1.5">
              <CreditCard className="w-3.5 h-3.5 text-emerald-600" />
              <span>Payment &amp; Guardrails</span>
            </div>
            <div className="text-slate-700 font-semibold text-[11px]">3-Tier Gate + Velocity SafeGuard</div>
            <div className="text-[10px] text-slate-500 font-mono">Mobile Push Alerts + Razorpay HMAC</div>
          </div>

        </div>
      </div>
    </div>
  );
}
