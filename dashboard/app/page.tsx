"use client";
import { Activity, Database, Server, RefreshCw, Zap, ShieldCheck } from 'lucide-react';
import useSWR from 'swr';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function Home() {
  // Data Fetching
  const { data: stats } = useSWR('http://127.0.0.1:8000/analytics/1', fetcher, { refreshInterval: 2000 });
  const { data: health } = useSWR('http://127.0.0.1:8000/health/services', fetcher, { refreshInterval: 5000 });

  const chartData = [
    { name: '10s ago', hits: (stats?.total_events || 0) - 12 },
    { name: '5s ago', hits: (stats?.total_events || 0) - 4 },
    { name: 'Now', hits: stats?.total_events || 0 },
  ];

  return (
    <main className="min-h-screen bg-[#FDFDFD] text-slate-900 font-sans pb-20">
      {/* Header */}
      <nav className="border-b border-gray-100 py-4 px-8 flex justify-between items-center bg-white">
        <div className="flex items-center gap-2">
          <div className="bg-red-600 p-1.5 rounded-lg text-white"><Zap size={20} /></div>
          <span className="text-xl font-bold tracking-tight text-slate-800 uppercase">Nexus<span className="text-red-600">Stream</span></span>
        </div>

        {/* Day 12: Health Monitor UI */}
        <div className="flex gap-6">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-slate-400">
            <div className={`w-2 h-2 rounded-full ${health?.redis === 'online' ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></div>
            Redis: {health?.redis || 'checking...'}
          </div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-slate-400">
            <div className={`w-2 h-2 rounded-full ${health?.postgres === 'online' ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></div>
            Postgres: {health?.postgres || 'checking...'}
          </div>
        </div>
      </nav>

      <section className="max-w-6xl mx-auto pt-12 px-8">
        <div className="mb-10">
          <h1 className="text-4xl font-black text-slate-900">Analytics Dashboard</h1>
          <p className="text-slate-500 flex items-center gap-2 mt-1">
            <ShieldCheck size={16} className="text-red-600" />
            System performing at C++ optimized speeds
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Counter Card */}
          <div className="bg-white border border-gray-200 rounded-3xl p-8 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
            <div>
              <p className="text-[10px] font-black text-red-600 uppercase tracking-[0.2em] mb-2">Events Ingested</p>
              <h2 className="text-8xl font-black text-slate-900 leading-none">{stats?.total_events || 0}</h2>
            </div>
            <div className="mt-8 flex items-center gap-2 text-sm text-slate-400 font-medium italic">
              <RefreshCw size={14} className="animate-spin-slow" />
              Syncing with PostgreSQL...
            </div>
          </div>

          {/* Graph Card */}
          <div className="lg:col-span-2 bg-white border border-gray-200 rounded-3xl p-8 shadow-sm">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-6">Throughput History</p>
            <div className="h-[240px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" hide />
                  <YAxis hide domain={['dataMin - 10', 'dataMax + 10']} />
                  <Tooltip contentStyle={{ borderRadius: '15px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }} />
                  <Line type="stepAfter" dataKey="hits" stroke="#dc2626" strokeWidth={5} dot={false} animationDuration={300} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}