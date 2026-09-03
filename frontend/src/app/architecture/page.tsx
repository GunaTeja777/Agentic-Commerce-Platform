'use client';

import React from 'react';
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
  Globe
} from 'lucide-react';

export default function ArchitecturePage() {
  return (
    <div className="space-y-8 pb-16 font-sans max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-slate-200 pb-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-semibold mb-2">
            <Layers className="w-3.5 h-3.5" />
            <span>Dual-Agent A2A + MCP Architecture</span>
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
            Agentic Commerce Architecture
          </h1>
          <p className="text-sm text-slate-500 mt-1 max-w-2xl">
            Strict separation of concerns: Buyer-side Hugging Face curation, Merchant-side Gemini 2.5 Flash LangGraph orchestrator, Live Railway MCP E-Commerce platform, and Deterministic Policy Guardrails.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <a
            href="https://ai-growth-agentic-commerce-production.up.railway.app"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 text-emerald-800 rounded-lg text-xs font-semibold transition-colors"
          >
            <Globe className="w-3.5 h-3.5 text-emerald-600" />
            <span>Live Railway MCP Store</span>
          </a>
        </div>
      </div>

      {/* Main Diagram Container */}
      <div className="bg-slate-50/90 border-2 border-dashed border-slate-300 rounded-2xl p-6 md:p-8 shadow-xs space-y-8 font-mono">
        
        {/* 1. TOP NODE: BUYER-SIDE AI AGENT */}
        <div className="flex flex-col items-center">
          <div className="bg-gradient-to-r from-purple-900 to-indigo-950 text-white border-2 border-purple-400 rounded-xl px-6 py-4 shadow-lg text-center max-w-lg w-full relative">
            <div className="absolute -top-3 right-4 bg-purple-400 text-slate-950 font-sans font-bold text-[10px] px-2.5 py-0.5 rounded shadow-xs">
              Hugging Face Llama 3.2 3B
            </div>
            <div className="flex items-center justify-center gap-2 font-bold text-sm">
              <Bot className="w-5 h-5 text-purple-300" />
              <span>1. BUYER-SIDE AI AGENT</span>
            </div>
            <p className="text-[11px] text-purple-200 mt-1 font-sans">
              Understands natural language queries &amp; dynamically extracts buyer intent without hardcoded rules
            </p>
          </div>

          <div className="flex flex-col items-center my-3 text-slate-400">
            <ArrowDown className="w-5 h-5 text-purple-600" />
            <div className="flex items-center gap-1.5 text-[11px] bg-white px-3 py-1 rounded-lg border border-purple-300 text-purple-950 font-sans shadow-xs font-semibold mt-1">
              <FileJson className="w-3.5 h-3.5 text-purple-600" />
              <span>Structured A2A Commerce Contract: {'{ category, product_type, budget_inr }'}</span>
            </div>
          </div>
        </div>

        {/* 2. MERCHANT AI AGENT & LANGGRAPH ORCHESTRATOR */}
        <div className="flex flex-col items-center">
          <div className="bg-gradient-to-r from-indigo-900 to-slate-900 text-white border-2 border-indigo-400 rounded-xl px-6 py-4 shadow-lg text-center max-w-xl w-full relative">
            <div className="absolute -top-3 right-4 bg-amber-400 text-slate-950 font-sans font-bold text-[10px] px-2.5 py-0.5 rounded shadow-xs">
              Google Gemini 2.5 Flash
            </div>
            <div className="flex items-center justify-center gap-2 font-bold text-sm">
              <Cpu className="w-5 h-5 text-indigo-300" />
              <span>2. MERCHANT AI AGENT (LangGraph StateGraph)</span>
            </div>
            <p className="text-[11px] text-indigo-200 mt-1 font-sans">
              Receives A2A request as already-understood constraints &bull; Coordinates MCP tools &bull; Reasons over real catalog records
            </p>
          </div>

          <div className="my-3 text-slate-400">
            <ArrowDown className="w-5 h-5 text-indigo-600" />
          </div>
        </div>

        {/* 3. LIVE RAILWAY MCP & STORE LAYER */}
        <div className="max-w-5xl mx-auto">
          <div className="text-center text-xs font-bold text-slate-600 uppercase tracking-widest mb-3 flex items-center justify-center gap-2">
            <Server className="w-4 h-4 text-emerald-600" />
            <span>Live Railway MCP &amp; E-Commerce Platform (<a href="https://ai-growth-agentic-commerce-production.up.railway.app" target="_blank" rel="noopener noreferrer" className="text-emerald-700 underline">Live Store</a>)</span>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Catalog & Search Tool */}
            <div className="bg-white border-2 border-slate-300 rounded-xl p-4 shadow-2xs space-y-2">
              <div className="flex items-center gap-2 font-bold text-xs text-slate-900">
                <Package className="w-4 h-4 text-indigo-600" />
                <span>search_products / catalog</span>
              </div>
              <p className="text-[11px] text-slate-600 font-sans leading-tight">
                Queries 99 real database products via Railway API &bull; Multi-token search &bull; Real-time price conversion
              </p>
              <span className="inline-block text-[10px] bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded font-mono font-semibold">
                Single Source of Truth
              </span>
            </div>

            {/* Growth Tool */}
            <div className="bg-white border-2 border-slate-300 rounded-xl p-4 shadow-2xs space-y-2">
              <div className="flex items-center gap-2 font-bold text-xs text-slate-900">
                <TrendingUp className="w-4 h-4 text-blue-600" />
                <span>growth_recommendations</span>
              </div>
              <p className="text-[11px] text-slate-600 font-sans leading-tight">
                Natural-language personalization: <em>&ldquo;Since you&apos;re buying [X], this [Y] would be a useful addition.&rdquo;</em>
              </p>
              <span className="inline-block text-[10px] bg-blue-50 text-blue-700 px-2 py-0.5 rounded font-mono font-semibold">
                Buyer Consent Required
              </span>
            </div>

            {/* Inventory Tool */}
            <div className="bg-white border-2 border-slate-300 rounded-xl p-4 shadow-2xs space-y-2">
              <div className="flex items-center gap-2 font-bold text-xs text-slate-900">
                <Database className="w-4 h-4 text-emerald-600" />
                <span>check_inventory / stock</span>
              </div>
              <p className="text-[11px] text-slate-600 font-sans leading-tight">
                Authoritative stock verification in PostgreSQL before order booking &bull; Prevents overselling
              </p>
              <span className="inline-block text-[10px] bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded font-mono font-semibold">
                Real-time Lock
              </span>
            </div>
          </div>

          <div className="flex flex-col items-center my-4 text-slate-400">
            <ArrowDown className="w-5 h-5 text-slate-600" />
          </div>
        </div>

        {/* 4. THE POLICY GATE (DETERMINISTIC TRUST BOUNDARY) */}
        <div className="flex flex-col items-center">
          <div className="bg-slate-900 text-white border-4 border-amber-400 rounded-2xl p-6 shadow-xl text-center max-w-xl w-full relative">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-amber-400 text-slate-950 font-sans font-extrabold text-[10px] px-3.5 py-0.5 rounded-full uppercase tracking-wider">
              DETERMINISTIC TRUST BOUNDARY
            </div>
            <div className="flex items-center justify-center gap-2 font-bold text-base text-amber-300">
              <Lock className="w-5 h-5" />
              <span>THE POLICY GATE (Fail-Closed)</span>
            </div>
            <p className="text-xs text-slate-200 mt-2 font-sans">
              Authoritatively verifies whether Total $\le$ ₹70,000 transaction spending cap. The LLM <strong>cannot override</strong> this decision.
            </p>
          </div>
        </div>

        {/* 5. DUAL BRANCHING: ALLOW vs BLOCK */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto pt-2">
          {/* LEFT BRANCH: ALLOW */}
          <div className="bg-emerald-50/80 border-2 border-emerald-400 rounded-2xl p-6 shadow-sm space-y-4 text-center">
            <div className="flex items-center justify-center gap-2 font-bold text-sm text-emerald-900">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              <span>ALLOW PATH (Total $\le$ ₹70,000)</span>
            </div>

            <div className="space-y-3 font-sans text-xs text-left">
              <div className="bg-white p-3 rounded-lg border border-emerald-200 shadow-2xs">
                <span className="font-bold text-slate-900 block font-mono">1. create_order (Railway Store)</span>
                <span className="text-slate-600">Reserves live inventory on Railway Postgres DB &amp; creates internal order</span>
              </div>

              <div className="bg-white p-3 rounded-lg border border-emerald-200 shadow-2xs">
                <span className="font-bold text-slate-900 block font-mono">2. Razorpay Test Mode Order</span>
                <span className="text-slate-600">Generates test order ID (e.g. <code>order_TXVEHJ0OT0mqOj</code>) &bull; Opens checkout modal</span>
              </div>

              <div className="bg-white p-3 rounded-lg border border-emerald-200 shadow-2xs">
                <span className="font-bold text-slate-900 block font-mono">3. Server-Side HMAC SHA-256</span>
                <span className="text-slate-600">Cryptographically verifies payment signature against <code>RAZORPAY_KEY_SECRET</code></span>
              </div>

              <div className="bg-white p-3 rounded-lg border border-emerald-200 shadow-2xs">
                <span className="font-bold text-emerald-800 block font-mono">4. Transaction Captured &amp; Audited</span>
                <span className="text-slate-600">Order marked paid &bull; Logged in immutable compliance audit trail</span>
              </div>
            </div>
          </div>

          {/* RIGHT BRANCH: BLOCK */}
          <div className="bg-rose-50/80 border-2 border-rose-400 rounded-2xl p-6 shadow-sm space-y-4 text-center">
            <div className="flex items-center justify-center gap-2 font-bold text-sm text-rose-900">
              <XCircle className="w-5 h-5 text-rose-600" />
              <span>BLOCK PATH (Total &gt; ₹70,000)</span>
            </div>

            <div className="space-y-3 font-sans text-xs text-left">
              <div className="bg-white p-3 rounded-lg border border-rose-200 shadow-2xs">
                <span className="font-bold text-rose-800 block font-mono">1. Payment Tool NOT Called</span>
                <span className="text-slate-600">Hard stop at Policy Gate &bull; Money movement strictly prohibited</span>
              </div>

              <div className="bg-white p-3 rounded-lg border border-rose-200 shadow-2xs">
                <span className="font-bold text-slate-900 block font-mono">2. Razorpay Calls = 0</span>
                <span className="text-slate-600">Zero payment orders created &bull; Zero external API charges</span>
              </div>

              <div className="bg-white p-3 rounded-lg border border-rose-200 shadow-2xs">
                <span className="font-bold text-slate-900 block font-mono">3. Deterministic Explanation</span>
                <span className="text-slate-600">Agent explains exact limit violation without hallucinations</span>
              </div>

              <div className="bg-white p-3 rounded-lg border border-rose-200 shadow-2xs">
                <span className="font-bold text-rose-800 block font-mono">4. Blocked Audit Recorded</span>
                <span className="text-slate-600">Policy refusal event logged in PostgreSQL audit ledger</span>
              </div>
            </div>
          </div>
        </div>

        {/* 6. BOTTOM NODE: RECEIPT BACK TO BUYER */}
        <div className="flex flex-col items-center pt-2">
          <div className="my-2 text-slate-400">
            <ArrowDown className="w-5 h-5 text-slate-600" />
          </div>

          <div className="bg-slate-900 text-white border-2 border-slate-700 rounded-xl px-8 py-3.5 shadow-md text-center max-w-md w-full">
            <div className="font-bold text-xs text-emerald-400 flex items-center justify-center gap-2">
              <Sparkles className="w-4 h-4 text-emerald-400" />
              <span>RESPONSE BACK TO AI BUYER</span>
            </div>
            <p className="text-[11px] text-slate-300 font-sans mt-0.5">
              Structured receipt with captured payment or clear deterministic rejection explanation
            </p>
          </div>
        </div>
      </div>

      {/* Tech Stack Matrix */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs">
        <h2 className="text-base font-bold text-slate-900 mb-4 flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-indigo-600" />
          <span>Technology &amp; Security Layer Matrix</span>
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
          <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
            <div className="font-bold text-slate-900 mb-1">Buyer Curation LLM</div>
            <div className="text-slate-600">Hugging Face Llama 3.2 3B</div>
            <div className="text-[10px] text-slate-400 mt-1 font-mono">meta-llama/Llama-3.2-3B-Instruct</div>
          </div>
          <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
            <div className="font-bold text-slate-900 mb-1">Merchant Brain &amp; Agent</div>
            <div className="text-slate-600">Google Gemini 2.5 Flash</div>
            <div className="text-[10px] text-slate-400 mt-1 font-mono">LangGraph StateGraph</div>
          </div>
          <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
            <div className="font-bold text-slate-900 mb-1">E-Commerce &amp; MCP Store</div>
            <div className="text-slate-600">Live Railway Platform</div>
            <div className="text-[10px] text-slate-400 mt-1 font-mono">99 Products, Live Inventory</div>
          </div>
          <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
            <div className="font-bold text-slate-900 mb-1">Payment Gateway</div>
            <div className="text-slate-600">Razorpay Test Mode</div>
            <div className="text-[10px] text-slate-400 mt-1 font-mono">HMAC SHA-256 Verified</div>
          </div>
        </div>
      </div>
    </div>
  );
}
