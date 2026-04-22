"use client";
import { Activity, Database, Server, RefreshCw } from 'lucide-react';
import useSWR from 'swr';

// 1. The Fetcher function: Tells the dashboard how to talk to your API
const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function Home() {
  // 2. SWR Hook: Automatically calls your API every 3 seconds
  const { data, error, isLoading } = useSWR(
    'http://127.0.0.1:8000/analytics/1',
    fetcher,
    { refreshInterval: 3000 }
  );

  return (
    <main className="min-h-screen bg-white text-slate-900 font-sans">
      {/* Navbar */}
      <nav className="border-b border-gray-100 py-4 px-8 flex justify-between items-center bg-white sticky top-0 z-10">
        <div className="flex items-center gap-2">
          <div className="bg-red-600 p-1.5 rounded-lg">
            <Database className="text-white w-6 h-6" />
          </div>
          <span className="text-2xl font-bold tracking-tight">
            NEXUS<span className="text-red-600">STREAM</span>
          </span>
        </div>
        <div className="flex gap-4 items-center">
          <span className="flex items-center gap-2 text-sm font-medium text-green-600 bg-green-50 px-3 py-1 rounded-full">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            C++ Engine Active
          </span>
        </div>
      </nav>

      {/* Content */}
      <section className="max-w-6xl mx-auto pt-16 px-8">
        <h1 className="text-5xl font-extrabold text-slate-900 leading-tight">
          Real-time <span className="text-red-600">Analytics</span> <br />
          at C++ Speed.
        </h1>

        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* THE LIVE DATA CARD */}
          <div className="border border-gray-200 rounded-xl p-6 hover:border-red-200 transition-all shadow-sm bg-white">
            <div className="flex justify-between items-start">
              <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Total Events</p>
              <Activity className={isLoading ? "animate-spin text-gray-400" : "text-red-600 w-5 h-5"} />
            </div>

            {/* Displaying the Data from PostgreSQL */}
            <h2 className="text-6xl font-bold mt-4 tracking-tighter">
              {error ? "Error" : data ? data.total_events : "--"}
            </h2>

            <div className="flex items-center gap-2 mt-6 text-xs text-slate-400">
              <RefreshCw className="w-3 h-3 animate-spin-slow" />
              <span>
                {data ? `Last synced: ${new Date(data.last_updated).toLocaleTimeString()}` : "Syncing..."}
              </span>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}