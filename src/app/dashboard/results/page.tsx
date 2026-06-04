'use client';

import React, { Suspense, useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import {
  Activity,
  AlertTriangle,
  CheckCircle,
  ArrowLeft,
  Printer,
  ShieldCheck,
  Calendar,
  AlertCircle,
  User,
  HeartPulse
} from 'lucide-react';

interface Recommendation {
  condition: string;
  reason: string;
}

interface DiagnosisRecord {
  id: string;
  symptoms: string;
  severity: string;
  duration: string;
  triage_level: string;
  recommendations: Recommendation[];
  drug_warnings: string[];
  urgent_attention: boolean;
  created_at: string;
}

function ResultsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const recordId = searchParams.get('id');

  const [loading, setLoading] = useState(true);
  const [record, setRecord] = useState<DiagnosisRecord | null>(null);
  const [errorMsg, setErrorMsg] = useState('');

  const fetchRecord = useCallback(async (id: string) => {
    try {
      const { data, error } = await supabase
        .from('diagnoses')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      setRecord(data);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to fetch diagnostic results.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!recordId) {
      setErrorMsg('No diagnostic record ID was provided.');
      setLoading(false);
      return;
    }
    fetchRecord(recordId);
  }, [recordId, fetchRecord]);

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0b132b] text-white">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-cyan-500 border-t-transparent" />
          <p className="text-sm text-slate-400">Fetching Diagnostic Results...</p>
        </div>
      </div>
    );
  }

  if (errorMsg || !record) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0b132b] text-white p-6">
        <div className="max-w-md w-full rounded-2xl glass-panel-glow p-8 text-center space-y-6">
          <AlertCircle className="mx-auto h-12 w-12 text-red-400" />
          <h2 className="text-2xl font-bold">Failed to load analysis</h2>
          <p className="text-sm text-slate-400">{errorMsg || 'Record not found.'}</p>
          <button
            onClick={() => router.push('/dashboard')}
            className="w-full rounded-xl bg-slate-800 py-3 text-sm font-semibold hover:bg-slate-700"
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  // Choose colors based on triage level
  const isEmergency = record.triage_level === 'Emergency';
  const isUrgent = record.triage_level === 'Urgent';
  const triageColor = isEmergency ? 'border-red-500/30 bg-red-500/10 text-red-400' :
                      isUrgent ? 'border-amber-500/30 bg-amber-500/10 text-amber-400' :
                      'border-teal-500/30 bg-teal-500/10 text-teal-400';

  return (
    <div className="min-h-screen bg-[#0b132b] text-white pb-16">
      {/* Navigation Header (Hidden during printing) */}
      <header className="print:hidden relative z-10 w-full max-w-5xl mx-auto px-6 py-6 flex items-center justify-between border-b border-white/5">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push('/dashboard')}
            className="flex items-center justify-center p-2 rounded-xl hover:bg-white/5 text-slate-400 hover:text-white transition-all"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="flex items-center gap-2">
            <Activity className="h-6 w-6 text-cyan-400" />
            <span className="text-lg font-bold tracking-wider">Assessment Report</span>
          </div>
        </div>

        <button
          onClick={handlePrint}
          className="inline-flex items-center gap-2 rounded-xl border border-cyan-500/30 bg-cyan-500/5 px-4 py-2 text-sm font-semibold text-cyan-400 hover:bg-cyan-500/10 transition-all"
        >
          <Printer className="h-4.5 w-4.5" />
          Print Report
        </button>
      </header>

      {/* Main Print Container */}
      <main className="max-w-4xl mx-auto px-6 py-10 space-y-8 print:p-0 print:text-black">
        {/* Triage Banner Alert Card */}
        <div className={`p-6 rounded-2xl border ${triageColor} flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 print:border-black print:bg-white print:text-black`}>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <HeartPulse className="h-6 w-6 shrink-0" />
              <span className="text-xs uppercase font-bold tracking-wider">Triage Triage Category</span>
            </div>
            <h2 className="text-2xl font-extrabold">{record.triage_level}</h2>
            <p className="text-sm opacity-80">
              {isEmergency ? 'Critical conditions detected. Please seek emergency medical help immediately.' :
               isUrgent ? 'Symptoms warrant professional clinical review. Schedule a primary clinic check soon.' :
               'Self-care and resting hydration recommended. Monitor parameters for changes.'}
            </p>
          </div>
          
          {isEmergency && (
            <div className="shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-500/20 text-red-400 animate-pulse print:hidden">
              <AlertTriangle className="h-6 w-6" />
            </div>
          )}
        </div>

        {/* Symptoms Overview Panel */}
        <div className="p-6 rounded-2xl glass-panel border border-white/5 space-y-4 print:border-black print:bg-white print:text-black">
          <div className="flex items-center gap-2 border-b border-white/5 pb-3">
            <User className="h-5 w-5 text-cyan-400 print:text-black" />
            <h3 className="text-lg font-bold">Reported Profile & Timeline</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">
            <div>
              <span className="block text-xs uppercase font-semibold text-slate-450">Symptom duration</span>
              <strong className="text-slate-200 mt-1 block print:text-black">{record.duration}</strong>
            </div>
            <div>
              <span className="block text-xs uppercase font-semibold text-slate-450">Stated Severity</span>
              <strong className="text-slate-200 mt-1 block print:text-black">{record.severity}</strong>
            </div>
            <div>
              <span className="block text-xs uppercase font-semibold text-slate-450">Assessment Date</span>
              <div className="flex items-center gap-1.5 text-slate-200 mt-1 print:text-black">
                <Calendar className="h-4 w-4" />
                <span>{new Date(record.created_at).toLocaleDateString()}</span>
              </div>
            </div>
          </div>
          <div className="pt-3 border-t border-white/5">
            <span className="block text-xs uppercase font-semibold text-slate-450">Symptoms Description</span>
            <p className="text-sm text-slate-200 mt-1 print:text-black leading-relaxed">{record.symptoms}</p>
          </div>
        </div>

        {/* Diagnostic Reasoner Outputs */}
        <div className="p-6 rounded-2xl glass-panel border border-white/5 space-y-6 print:border-black print:bg-white print:text-black">
          <div className="flex items-center gap-2 border-b border-white/5 pb-3">
            <Activity className="h-5 w-5 text-cyan-400 print:text-black" />
            <h3 className="text-lg font-bold">Clinical Differential Diagnosis</h3>
          </div>

          <div className="space-y-4">
            {record.recommendations.map((rec: any, index) => (
              <div key={index} className="p-4 rounded-xl bg-slate-950/40 border border-white/5 flex gap-4 print:border-black print:bg-white">
                <div className="h-7 w-7 rounded-full bg-cyan-500/10 text-cyan-400 flex items-center justify-center text-xs font-semibold shrink-0 mt-0.5 print:text-black print:border print:border-black">
                  {index + 1}
                </div>
                <div className="space-y-2">
                  <h4 className="font-bold text-slate-200 print:text-black">{rec.condition}</h4>
                  <p className="text-xs text-slate-400 print:text-black leading-relaxed"><strong>Analysis:</strong> {rec.reason}</p>
                  {rec.treatment && (
                    <p className="text-xs text-slate-350 print:text-black leading-relaxed"><strong>Suggested Care:</strong> {rec.treatment}</p>
                  )}
                  {rec.medications && rec.medications.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      <span className="text-xs text-slate-450 font-semibold mt-0.5">Medicine Suggestions:</span>
                      {rec.medications.map((med: string) => (
                        <span key={med} className="text-xs px-2.5 py-0.5 rounded-full bg-teal-500/10 border border-teal-500/25 text-teal-350 font-medium">
                          {med}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Safety Warnings Section */}
        {record.drug_warnings && record.drug_warnings.length > 0 ? (
          <div className="p-6 rounded-2xl border border-red-500/30 bg-red-500/5 space-y-4 print:border-black print:bg-white print:text-black">
            <div className="flex items-center gap-2 text-red-400 border-b border-red-500/20 pb-3">
              <AlertTriangle className="h-5 w-5 shrink-0" />
              <h3 className="text-lg font-bold">Safety Conflict Violations</h3>
            </div>
            <ul className="space-y-3">
              {record.drug_warnings.map((warning, index) => (
                <li key={index} className="flex gap-3 text-sm text-red-300 print:text-black">
                  <span className="shrink-0 font-bold">•</span>
                  <span>{warning}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <div className="p-6 rounded-2xl border border-teal-500/30 bg-teal-500/5 flex items-center gap-3 text-teal-400 print:border-black print:bg-white print:text-black">
            <ShieldCheck className="h-6 w-6 shrink-0 text-teal-400" />
            <div className="text-sm">
              <strong>Safety Guardrail Verified:</strong> No conflicts detected against registered allergies or active medications.
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default function ResultsPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center bg-[#0b132b] text-white">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-cyan-500 border-t-transparent" />
          <p className="text-sm text-slate-400">Loading Diagnostic Results...</p>
        </div>
      </div>
    }>
      <ResultsContent />
    </Suspense>
  );
}
