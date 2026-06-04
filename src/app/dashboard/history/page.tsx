'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import {
  Activity,
  History,
  Search,
  CheckCircle,
  AlertTriangle,
  Clock,
  ArrowLeft,
  FileText,
  TrendingUp,
  Plus
} from 'lucide-react';

interface DiagnosisRecord {
  id: string;
  symptoms: string;
  severity: string;
  duration: string;
  triage_level: string;
  recommendations: { condition: string; reason: string }[];
  drug_warnings: string[];
  urgent_attention: boolean;
  created_at: string;
}

export default function HistoryPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [history, setHistory] = useState<DiagnosisRecord[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchHistory = useCallback(async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('diagnoses')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setHistory(data || []);
    } catch (err: any) {
      console.error('Error fetching history:', err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const getSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/auth');
      } else {
        setUser(session.user);
        fetchHistory(session.user.id);
      }
    };
    getSession();
  }, [router, fetchHistory]);

  const filteredHistory = history.filter((item) => {
    const searchLower = searchQuery.toLowerCase();
    const matchesSymptom = item.symptoms.toLowerCase().includes(searchLower);
    const matchesConditions = item.recommendations.some(rec => 
      rec.condition.toLowerCase().includes(searchLower)
    );
    return matchesSymptom || matchesConditions;
  });

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0b132b] text-white">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-cyan-500 border-t-transparent" />
          <p className="text-sm text-slate-400">Loading Consultations History...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-[#0b132b] text-white">
      {/* Sidebar navigation */}
      <aside className="w-64 border-r border-white/5 bg-[#1c2541]/40 hidden md:flex flex-col p-6 space-y-8">
        <div className="flex items-center gap-2">
          <Activity className="h-6 w-6 text-cyan-400" />
          <span className="text-lg font-bold tracking-wider">MedLens</span>
        </div>

        <nav className="flex-1 space-y-2">
          <button
            onClick={() => router.push('/dashboard')}
            className="flex w-full items-center gap-3 p-3 rounded-xl text-slate-400 hover:bg-white/5 hover:text-white transition-all text-sm font-medium"
          >
            <Activity className="h-5 w-5" />
            <span>Dashboard</span>
          </button>
          <button
            onClick={() => router.push('/dashboard/chat')}
            className="flex w-full items-center gap-3 p-3 rounded-xl text-slate-400 hover:bg-white/5 hover:text-white transition-all text-sm font-medium"
          >
            <Plus className="h-5 w-5" />
            <span>New Assessment</span>
          </button>
          <div className="flex items-center gap-3 p-3 rounded-xl bg-cyan-500/10 text-cyan-400 font-medium">
            <History className="h-5 w-5" />
            <span>Consultation History</span>
          </div>
          <button
            onClick={() => router.push('/metrics')}
            className="flex w-full items-center gap-3 p-3 rounded-xl text-slate-400 hover:bg-white/5 hover:text-white transition-all text-sm font-medium"
          >
            <TrendingUp className="h-5 w-5" />
            <span>RAG Live Metrics</span>
          </button>
        </nav>
      </aside>

      {/* Main panel */}
      <main className="flex-1 p-6 md:p-10 space-y-8 overflow-y-auto">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push('/dashboard')}
            className="flex items-center justify-center p-2 rounded-xl hover:bg-white/5 text-slate-400 hover:text-white transition-all md:hidden"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight">Assessment History</h1>
            <p className="text-slate-400 text-sm">Review your past clinical RAG evaluations and drug warnings logs</p>
          </div>
        </div>

        {/* History Search */}
        <section className="space-y-6">
          <div className="relative w-full max-w-md">
            <Search className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
            <input
              type="text"
              placeholder="Search symptoms or conditions..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-xl border border-slate-700 bg-slate-900/40 py-2.5 pl-10 pr-4 text-sm text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
            />
          </div>

          {filteredHistory.length === 0 ? (
            <div className="text-center py-16 rounded-2xl border border-dashed border-white/5 bg-slate-900/10 max-w-3xl">
              <FileText className="mx-auto h-12 w-12 text-slate-500 mb-3" />
              <h3 className="font-semibold text-slate-350">No records found</h3>
              <p className="text-sm text-slate-500 mt-1">
                {searchQuery ? 'Adjust your search string.' : 'Perform an assessment from the intake form.'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-6xl">
              {filteredHistory.map((item) => (
                <div key={item.id} className="p-6 rounded-2xl glass-panel space-y-4 flex flex-col justify-between border border-white/5 hover:border-cyan-500/20 transition-all">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                        item.triage_level === 'Emergency' ? 'bg-red-500/10 text-red-400 border border-red-500/20' :
                        item.triage_level === 'Urgent' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                        'bg-teal-500/10 text-teal-400 border border-teal-500/20'
                      }`}>
                        Triage: {item.triage_level}
                      </span>
                      <div className="flex items-center gap-1 text-xs text-slate-450">
                        <Clock className="h-3.5 w-3.5" />
                        <span>{new Date(item.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>

                    <div>
                      <h4 className="text-xs uppercase font-semibold text-slate-450 tracking-wider">Symptoms Stated</h4>
                      <p className="text-sm font-medium text-slate-200 mt-1 line-clamp-2">{item.symptoms}</p>
                    </div>

                    <div>
                      <h4 className="text-xs uppercase font-semibold text-slate-450 tracking-wider">RAG Diagnosis Matches</h4>
                      <ul className="mt-1.5 space-y-1">
                        {item.recommendations.slice(0, 2).map((rec, i) => (
                          <li key={i} className="flex items-start gap-2 text-xs text-slate-350">
                            <CheckCircle className="h-4 w-4 text-cyan-400 shrink-0 mt-0.5" />
                            <span><strong>{rec.condition}</strong> - {rec.reason}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {item.drug_warnings && item.drug_warnings.length > 0 && (
                      <div className="p-2.5 rounded-lg bg-red-500/5 border border-red-500/20 text-xs text-red-300 flex gap-2">
                        <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5 text-red-400" />
                        <div>
                          <strong>Safety Alerts Flagged:</strong> {item.drug_warnings.length} conflict(s).
                        </div>
                      </div>
                    )}
                  </div>
                  
                  <div className="pt-2 border-t border-white/5 flex justify-end">
                    <button
                      onClick={() => router.push(`/dashboard/results?id=${item.id}`)}
                      className="text-xs font-semibold text-cyan-400 hover:text-cyan-300 transition-all"
                    >
                      View Full Analysis &rarr;
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
