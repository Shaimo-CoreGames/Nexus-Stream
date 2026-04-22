"use client";
import { Activity, Database, Server, RefreshCw } from 'lucide-react';
import useSWR from 'swr';

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

// 1. The Fetcher function: Tells the dashboard how to talk to your API
const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function Home() {
  const { data, error, isLoading } = useSWR(
    'http://127.0.0.1:8000/analytics/1',
    fetcher,
    { refreshInterval: 3000 }
  );
  // Mock data for the chart based on your live total
  const chartData = [
    { name: '10s ago', hits: (data?.total_events || 0) - 15 },
    { name: '5s ago', hits: (data?.total_events || 0) - 5 },
    { name: 'Now', hits: data?.total_events || 0 },
  ];

  return (
    <main className="min-h-screen bg-white text-slate-900 font-sans pb-20">
      {/* Navbar (Keep your existing Navbar code here) */}

      <section className="max-w-6xl mx-auto pt-16 px-8">
        <div className="flex justify-between items-end">
          <div>
            <h1 className="text-5xl font-extrabold text-slate-900 tracking-tight">System <span className="text-red-600">Overview</span></h1>
            <p className="mt-2 text-slate-500">Live throughput from C++ Engine</p>
          </div>
          <button
            onClick={() => window.location.reload()}
            className="flex items-center gap-2 bg-slate-900 text-white px-4 py-2 rounded-lg font-medium hover:bg-slate-800 transition-colors"
          >
            <RefreshCw className="w-4 h-4" /> Force Refresh
          </button>
        </div>

        <div className="mt-12 grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* STATS CARD */}
          <div className="border border-gray-200 rounded-2xl p-8 shadow-sm bg-white flex flex-col justify-between">
            <div>
              <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Total Events</p>
              <h2 className="text-7xl font-black mt-4 text-slate-900">
                {data ? data.total_events : "--"}
              </h2>
            </div>
            <div className="mt-8 pt-6 border-t border-gray-50 flex items-center justify-between text-slate-400">
              <span className="flex items-center gap-2"><Server className="w-4 h-4" /> PostgreSQL Live</span>
              <span className="text-green-500 font-bold">● Synchronized</span>
            </div>
          </div>

          {/* CHART CARD */}
          <div className="lg:col-span-2 border border-gray-200 rounded-2xl p-8 shadow-sm bg-white">
            <p className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-8">Throughput Trend</p>
            <div className="h-[250px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} />
                  <YAxis hide />
                  <Tooltip
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                  />
                  <Line
                    type="monotone"
                    dataKey="hits"
                    stroke="#dc2626"
                    strokeWidth={4}
                    dot={{ r: 6, fill: '#dc2626', strokeWidth: 2, stroke: '#fff' }}
                    activeDot={{ r: 8 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
