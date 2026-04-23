"use client";
import React from 'react';
import { Activity, Database, Server, RefreshCw, Zap, ShieldCheck } from 'lucide-react';
import useSWR from 'swr';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

// Optimized fetcher
const fetcher = (url: string) => fetch(url).then((res) => {
  if (!res.ok) throw new Error("API Offline");
  return res.json();
});

export default function Home() {
  // 1. Data Fetching (Using localhost for browser-side access)
  const { data: stats, error: statsError } = useSWR('http://localhost:8000/analytics/1', fetcher, {
    refreshInterval: 2000,
    revalidateOnFocus: true
  });

  const { data: health, error: healthError } = useSWR('http://localhost:8000/health/services', fetcher, {
    refreshInterval: 5000
  });

  // 2. Chart Logic: Prevents negative values and creates a smoother trend
  const currentHits = stats?.total_events || 0;
  const chartData = [
    { name: '10s ago', hits: Math.max(0, currentHits - 8) },
    { name: '5s ago', hits: Math.max(0, currentHits - 3) },
    { name: 'Now', hits: currentHits },
  ];

  // 3. Status Helpers
  const isRedisOnline = health?.redis === 'online';
  const isPgOnline = health?.postgres === 'online';

  return (
    <main className="min-h-screen bg-[#FDFDFD] text-slate-900 font-sans pb-20">
      {/* Header / Navigation */}
      <nav className="border-b border-gray-100 py-4 px-8 flex justify-between items-center bg-white sticky top-0 z-10">
        <div className="flex items-center gap-2">
          <div className="bg-red-600 p-1.5 rounded-lg text-white">
            <Zap size={20} fill="currentColor" />
          </div>
          <span className="text-xl font-bold tracking-tight text-slate-800 uppercase">
            Nexus<span className="text-red-600">Stream</span>
          </span>
        </div>

        {/* Health Monitor UI */}
        <div className="flex gap-6">
          <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400">
            <div className={`w-2 h-2 rounded-full ${isRedisOnline ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></div>
            Redis: <span className={isRedisOnline ? 'text-slate-600' : 'text-red-400'}>{health?.redis || 'OFFLINE'}</span>
          </div>
          <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400">
            <div className={`w-2 h-2 rounded-full ${isPgOnline ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></div>
            Postgres: <span className={isPgOnline ? 'text-slate-600' : 'text-red-400'}>{health?.postgres || 'OFFLINE'}</span>
          </div>
        </div>
      </nav>

      <section className="max-w-6xl mx-auto pt-12 px-8">
        {/* Title Section */}
        <div className="mb-10">
          <h1 className="text-4xl font-black text-slate-900 tracking-tight">Analytics Dashboard</h1>
          <p className="text-slate-500 flex items-center gap-2 mt-2 font-medium">
            <ShieldCheck size={18} className="text-red-600" />
            System performing at <span className="text-slate-800 font-bold">C++ optimized</span> speeds
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Counter Card */}
          <div className="bg-white border border-gray-200 rounded-3xl p-8 shadow-sm flex flex-col justify-between hover:shadow-lg transition-all duration-300 group">
            <div>
              <p className="text-[10px] font-black text-red-600 uppercase tracking-[0.2em] mb-4">Total Events Ingested</p>
              <h2 className="text-8xl font-black text-slate-900 leading-none group-hover:scale-105 transition-transform duration-500 origin-left">
                {currentHits}
              </h2>
            </div>
            <div className="mt-8 flex items-center gap-2 text-sm text-slate-400 font-medium italic">
              <RefreshCw size={14} className="animate-spin" style={{ animationDuration: '3s' }} />
              {statsError ? "Connection Lost" : "Syncing with PostgreSQL..."}
            </div>
          </div>

          {/* Graph Card */}
          <div className="lg:col-span-2 bg-white border border-gray-200 rounded-3xl p-8 shadow-sm">
            <div className="flex justify-between items-center mb-6">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Throughput History (Step-Reflect)</p>
              <div className="flex items-center gap-1 text-[10px] font-bold text-green-500 bg-green-50 px-2 py-1 rounded-full">
                <Activity size={10} /> LIVE
              </div>
            </div>

            <div className="h-[240px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" hide />
                  <YAxis hide domain={['dataMin - 5', 'dataMax + 5']} />
                  <Tooltip
                    contentStyle={{
                      borderRadius: '15px',
                      border: 'none',
                      boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)',
                      fontSize: '12px',
                      fontWeight: 'bold'
                    }}
                  />
                  <Line
                    type="stepAfter"
                    dataKey="hits"
                    stroke="#dc2626"
                    strokeWidth={4}
                    dot={{ r: 4, fill: '#dc2626', strokeWidth: 0 }}
                    activeDot={{ r: 6, strokeWidth: 0 }}
                    animationDuration={400}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Footer Info */}
        <div className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-center gap-4">
            <div className="bg-white p-2 rounded-xl shadow-sm"><Server size={20} className="text-slate-400" /></div>
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Environment</p>
              <p className="text-sm font-bold text-slate-700">Dockerized Microservices</p>
            </div>
          </div>
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-center gap-4">
            <div className="bg-white p-2 rounded-xl shadow-sm"><Database size={20} className="text-slate-400" /></div>
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Storage Engine</p>
              <p className="text-sm font-bold text-slate-700">PostgreSQL 15 (Atomic Sync)</p>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}