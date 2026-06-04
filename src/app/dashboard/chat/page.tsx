'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { 
  Activity, 
  ArrowLeft, 
  Terminal, 
  Cpu, 
  ShieldAlert, 
  Stethoscope, 
  Clock, 
  AlertTriangle,
  Play,
  Heart,
  User,
  Plus
} from 'lucide-react';

interface LogEntry {
  timestamp: string;
  node: string;
  message: string;
  type: 'info' | 'success' | 'warn' | 'system';
}

export default function DiagnosticsIntakePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [analyzing, setAnalyzing] = useState(false);

  // Form states (replacing conversational chatbot with unified interactive panel)
  const [symptoms, setSymptoms] = useState('');
  const [associated, setAssociated] = useState<string[]>([]);
  const [duration, setDuration] = useState('1-2 Days');
  const [severity, setSeverity] = useState('Moderate (Noticeable discomfort)');
  const [triggers, setTriggers] = useState<string[]>([]);
  const [lifestyle, setLifestyle] = useState<string[]>([]);
  const [additional, setAdditional] = useState('');

  // Diagnostic execution logs
  const [terminalLogs, setTerminalLogs] = useState<LogEntry[]>([
    { timestamp: new Date().toLocaleTimeString(), node: 'SYSTEM', message: 'Triage graph initialized.', type: 'system' },
    { timestamp: new Date().toLocaleTimeString(), node: 'INTAKE', message: 'Awaiting primary symptom input from dashboard controls...', type: 'info' }
  ]);

  const logEndRef = useRef<HTMLDivElement>(null);

  // Options lists for grid selections
  const ASSOCIATED_OPTIONS = ['Fever', 'Chills', 'Nausea', 'Vomiting', 'Dizziness', 'Muscle Aches', 'Sore Throat', 'Rash', 'Chest Tightness', 'Fatigue'];
  const DURATION_OPTIONS = ['Less than 24 hours', '1-2 Days', '3-5 Days', 'Over a week'];
  const SEVERITY_OPTIONS = [
    'Mild (Not disrupting activities)', 
    'Moderate (Noticeable discomfort)', 
    'Severe (Disrupting work/sleep)'
  ];
  const TRIGGER_OPTIONS = ['Worse when lying down', 'Better after resting', 'Worse after eating', 'Worse in cold air', 'Worse when moving'];
  const LIFESTYLE_OPTIONS = ['Recent travel abroad', 'Potential pregnancy', 'Exposure to sick family/colleagues', 'Active smoker'];

  // Check auth and profile
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/auth');
        return;
      }
      setUser(session.user);
      
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single();
        
      if (!profileData) {
        router.push('/dashboard');
      } else {
        setProfile(profileData);
        setLoading(false);
      }
    };
    checkAuth();
  }, [router]);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [terminalLogs]);

  const addLog = (node: string, message: string, type: 'info' | 'success' | 'warn' | 'system' = 'info') => {
    setTerminalLogs(prev => [
      ...prev,
      { timestamp: new Date().toLocaleTimeString(), node, message, type }
    ]);
  };

  // Toggle list selection helpers
  const toggleItem = (list: string[], setList: React.Dispatch<React.SetStateAction<string[]>>, item: string) => {
    if (list.includes(item)) {
      setList(list.filter(x => x !== item));
    } else {
      setList([...list, item]);
    }
  };

  const handleRunDiagnostics = async () => {
    if (!symptoms.trim()) {
      addLog('INTAKE', 'Validation failed: Primary symptoms description is required.', 'warn');
      alert('Please describe your primary symptoms.');
      return;
    }

    setAnalyzing(true);
    addLog('SYSTEM', 'Triage button pressed. Compiling selection states...', 'system');
    addLog('INTAKE', `Primary Symptoms: "${symptoms}"`, 'success');
    addLog('INTAKE', `Duration: ${duration} | Severity: ${severity}`, 'success');
    addLog('REASONER', 'Invoking local Python FastAPI RAG Service (500 conditions)...', 'info');

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          symptoms,
          associated_symptoms: associated.join(', ') || 'None',
          duration,
          severity,
          triggers: triggers.join(', ') || 'None',
          lifestyle: lifestyle.join(', ') || 'None',
          context: additional,
          profile
        })
      });

      if (!response.ok) {
        throw new Error('Agent evaluation returned status error.');
      }

      addLog('REASONER', 'RAG Context matching completed.', 'success');
      addLog('SAFETY', 'Evaluating FDA drug interactions and allergy conflicts...', 'warn');

      const diagnosisResult = await response.json();
      
      addLog('SAFETY', `${diagnosisResult.drug_warnings?.length || 0} safety warnings identified.`, diagnosisResult.drug_warnings?.length > 0 ? 'warn' : 'success');
      addLog('DATABASE', 'Writing diagnostic results record to Supabase ledger...', 'info');

      const richSymptomsDescription = `Primary: ${symptoms}. Secondary: ${associated.join(', ') || 'None'}. Triggers: ${triggers.join(', ') || 'None'}. Exposure: ${lifestyle.join(', ') || 'None'}. Notes: ${additional || 'None'}`;

      const { data: savedRecord, error: saveErr } = await supabase
        .from('diagnoses')
        .insert([
          {
            user_id: profile.id,
            symptoms: richSymptomsDescription,
            severity,
            duration,
            triage_level: diagnosisResult.triage_level || 'Self-Care',
            recommendations: diagnosisResult.diagnosis || [],
            drug_warnings: diagnosisResult.drug_warnings || [],
            urgent_attention: diagnosisResult.urgent_attention || false,
            raw_transcript: [{ sender: 'user', text: richSymptomsDescription }]
          }
        ])
        .select()
        .single();

      if (saveErr) throw saveErr;

      addLog('SYSTEM', 'Triage execution graph completed. Syncing assessment reports...', 'system');
      
      setTimeout(() => {
        router.push(`/dashboard/results?id=${savedRecord.id}`);
      }, 800);

    } catch (err: any) {
      addLog('SYSTEM', `Execution error: ${err.message}`, 'warn');
      setAnalyzing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0b132b] text-white">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-cyan-500 border-t-transparent" />
          <p className="text-sm text-slate-400">Loading Triage Dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-[#0b132b] text-white">
      {/* Header */}
      <header className="relative z-10 w-full px-6 py-4 flex items-center justify-between border-b border-white/5 bg-[#1c2541]/40">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push('/dashboard')}
            className="flex items-center justify-center p-2 rounded-xl hover:bg-white/5 text-slate-400 hover:text-white transition-all"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="flex items-center gap-2">
            <Cpu className="h-6 w-6 text-cyan-400" />
            <span className="text-lg font-bold tracking-wider">Clinical Intake Diagnostic Workspace</span>
          </div>
        </div>
        
        <div className="flex items-center gap-2 text-xs text-slate-450 bg-slate-900/40 border border-white/5 px-3 py-1.5 rounded-full">
          <div className={`h-2.5 w-2.5 rounded-full ${analyzing ? 'bg-cyan-400 animate-pulse' : 'bg-teal-400'}`} />
          <span>{analyzing ? 'Triage Pipeline Running...' : 'State: Awaiting Inputs'}</span>
        </div>
      </header>

      {/* Side-by-Side Main Container */}
      <div className="flex flex-1 overflow-hidden">
        
        {/* Left Column: Interactive Visual Form */}
        <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-8 max-w-4xl w-full mx-auto">
          <div>
            <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
              <Stethoscope className="h-6 w-6 text-cyan-400" /> Diagnostics Intake Form
            </h1>
            <p className="text-sm text-slate-400 mt-1">
              Select your symptom parameters below. Our multi-agent triage system will check clinical guidelines and cross-reference active drug/allergy alerts.
            </p>
          </div>

          <div className="space-y-6">
            {/* Primary Symptoms Text Input */}
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-slate-350">
                1. Describe your primary symptoms in detail
              </label>
              <textarea
                rows={3}
                placeholder="e.g. I have a severe throbbing headache behind my eyes, accompanied by slight nausea and light sensitivity..."
                value={symptoms}
                onChange={(e) => setSymptoms(e.target.value)}
                disabled={analyzing}
                className="w-full rounded-xl border border-slate-700 bg-slate-900/40 p-4 text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500 disabled:opacity-50 text-sm leading-relaxed"
              />
            </div>

            {/* Secondary Associated Symptoms Checklist */}
            <div className="space-y-2.5">
              <label className="block text-sm font-semibold text-slate-350">
                2. Select accompanying/secondary symptoms
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2.5">
                {ASSOCIATED_OPTIONS.map(opt => {
                  const active = associated.includes(opt);
                  return (
                    <button
                      key={opt}
                      onClick={() => toggleItem(associated, setAssociated, opt)}
                      disabled={analyzing}
                      className={`text-xs p-3 rounded-xl border font-medium transition-all ${
                        active 
                          ? 'border-cyan-500 bg-cyan-500/10 text-cyan-300' 
                          : 'border-slate-800 bg-slate-900/20 text-slate-400 hover:border-slate-700 hover:text-slate-300'
                      }`}
                    >
                      {opt}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Duration Selector */}
            <div className="space-y-2.5">
              <label className="block text-sm font-semibold text-slate-350 flex items-center gap-1.5">
                <Clock className="h-4.5 w-4.5 text-cyan-400" /> 3. Stated symptom timeline
              </label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {DURATION_OPTIONS.map(opt => (
                  <button
                    key={opt}
                    onClick={() => setDuration(opt)}
                    disabled={analyzing}
                    className={`text-xs p-3.5 rounded-xl border font-medium transition-all ${
                      duration === opt 
                        ? 'border-cyan-500 bg-cyan-500/10 text-cyan-300' 
                        : 'border-slate-800 bg-slate-900/20 text-slate-400 hover:border-slate-700 hover:text-slate-300'
                    }`}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </div>

            {/* Severity Pill Selector */}
            <div className="space-y-2.5">
              <label className="block text-sm font-semibold text-slate-350">
                4. Symptom Severity Class
              </label>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {SEVERITY_OPTIONS.map(opt => (
                  <button
                    key={opt}
                    onClick={() => setSeverity(opt)}
                    disabled={analyzing}
                    className={`text-xs p-4 rounded-xl border text-left font-medium transition-all ${
                      severity === opt 
                        ? 'border-cyan-500 bg-cyan-500/10 text-cyan-300' 
                        : 'border-slate-800 bg-slate-900/20 text-slate-400 hover:border-slate-700 hover:text-slate-300'
                    }`}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </div>

            {/* Triggers Checklist */}
            <div className="space-y-2.5">
              <label className="block text-sm font-semibold text-slate-350">
                5. What triggers or worsens the symptoms?
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {TRIGGER_OPTIONS.map(opt => {
                  const active = triggers.includes(opt);
                  return (
                    <button
                      key={opt}
                      onClick={() => toggleItem(triggers, setTriggers, opt)}
                      disabled={analyzing}
                      className={`text-xs p-3.5 rounded-xl border text-left font-medium transition-all ${
                        active 
                          ? 'border-cyan-500 bg-cyan-500/10 text-cyan-300' 
                          : 'border-slate-800 bg-slate-900/20 text-slate-400 hover:border-slate-700 hover:text-slate-300'
                      }`}
                    >
                      {opt}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Lifestyle & Exposures */}
            <div className="space-y-2.5">
              <label className="block text-sm font-semibold text-slate-350">
                6. Exposure & environmental conditions
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {LIFESTYLE_OPTIONS.map(opt => {
                  const active = lifestyle.includes(opt);
                  return (
                    <button
                      key={opt}
                      onClick={() => toggleItem(lifestyle, setLifestyle, opt)}
                      disabled={analyzing}
                      className={`text-xs p-3.5 rounded-xl border text-left font-medium transition-all ${
                        active 
                          ? 'border-cyan-500 bg-cyan-500/10 text-cyan-300' 
                          : 'border-slate-800 bg-slate-900/20 text-slate-400 hover:border-slate-700 hover:text-slate-300'
                      }`}
                    >
                      {opt}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Additional context input */}
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-slate-350">
                7. Supplementary notes / family history
              </label>
              <input
                type="text"
                placeholder="Active allergies or other details not registered in your general profile..."
                value={additional}
                onChange={(e) => setAdditional(e.target.value)}
                disabled={analyzing}
                className="w-full rounded-xl border border-slate-700 bg-slate-900/40 p-3.5 text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500 disabled:opacity-50 text-sm"
              />
            </div>

            {/* Run Triage Button */}
            <button
              onClick={handleRunDiagnostics}
              disabled={analyzing || !symptoms.trim()}
              className="w-full py-4 rounded-xl bg-gradient-to-r from-cyan-500 to-teal-500 text-[#0b132b] hover:from-cyan-400 hover:to-teal-400 font-bold transition-all flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/15 disabled:opacity-50"
            >
              <Play className="h-5 w-5 fill-current" />
              {analyzing ? 'Executing Multi-Agent Graph...' : 'Initiate Clinical Diagnostic Assessment'}
            </button>
          </div>
        </div>

        {/* Right Column: Engine Monitor Console */}
        <div className="w-96 border-l border-white/5 bg-[#1c2541]/20 hidden lg:flex flex-col p-6 space-y-6 overflow-y-auto">
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-cyan-400">Agentic Orchestrator</h3>
            <p className="text-xs text-slate-450 mt-1">Real-time execution details of LangGraph nodes</p>
          </div>

          {/* Workflow Graph visualization */}
          <div className="p-4 rounded-2xl glass-panel border border-white/5 space-y-4">
            <h4 className="text-xs font-semibold text-slate-400 flex items-center gap-2">
              <Cpu className="h-4 w-4" /> Live Node Execution Graph
            </h4>
            
            <div className="space-y-3 relative pl-4 border-l border-slate-800">
              {/* Intake Node */}
              <div className="relative flex items-center gap-3">
                <div className={`absolute -left-[21px] h-2.5 w-2.5 rounded-full border-2 border-[#0b132b] ${
                  !analyzing ? 'bg-cyan-400 shadow-[0_0_8px_rgba(0,180,216,0.8)]' : 'bg-slate-700'
                }`} />
                <span className={`text-xs font-semibold ${!analyzing ? 'text-cyan-400' : 'text-slate-500'}`}>
                  Intake Formatting Node
                </span>
              </div>

              {/* RAG Context Retrieval */}
              <div className="relative flex items-center gap-3">
                <div className={`absolute -left-[21px] h-2.5 w-2.5 rounded-full border-2 border-[#0b132b] ${
                  analyzing ? 'bg-yellow-400 shadow-[0_0_8px_rgba(234,179,8,0.8)] animate-pulse' : 'bg-slate-700'
                }`} />
                <span className={`text-xs font-semibold ${analyzing ? 'text-yellow-400' : 'text-slate-500'}`}>
                  RAG Vector Index Search
                </span>
              </div>

              {/* Reasoning Engine Node */}
              <div className="relative flex items-center gap-3">
                <div className={`absolute -left-[21px] h-2.5 w-2.5 rounded-full border-2 border-[#0b132b] ${
                  analyzing ? 'bg-teal-400 animate-pulse' : 'bg-slate-700'
                }`} />
                <span className={`text-xs font-semibold ${analyzing ? 'text-teal-400' : 'text-slate-500'}`}>
                  LLM Diagnostic Reasoning
                </span>
              </div>

              {/* Safety Conflict Validator */}
              <div className="relative flex items-center gap-3">
                <div className={`absolute -left-[21px] h-2.5 w-2.5 rounded-full border-2 border-[#0b132b] ${
                  analyzing ? 'bg-red-400' : 'bg-slate-700'
                }`} />
                <span className={`text-xs font-semibold ${analyzing ? 'text-red-400' : 'text-slate-500'}`}>
                  Safety Allergy Conflict Check
                </span>
              </div>
            </div>
          </div>

          {/* Terminal Console Logs */}
          <div className="flex-1 flex flex-col min-h-[220px]">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Terminal className="h-4 w-4" /> Graph Console Logs
              </span>
              <span className="text-[10px] bg-slate-900 border border-white/5 px-2 py-0.5 rounded text-slate-500 font-mono">
                500_RAG
              </span>
            </div>
            
            <div className="flex-1 rounded-xl bg-slate-950 p-4 border border-white/5 font-mono text-[10px] text-slate-350 space-y-2.5 overflow-y-auto max-h-[300px]">
              {terminalLogs.map((log, idx) => (
                <div key={idx} className="leading-relaxed">
                  <span className="text-slate-500">[{log.timestamp}]</span>{' '}
                  <span className={
                    log.node === 'SYSTEM' ? 'text-purple-400' :
                    log.node === 'SAFETY' ? 'text-red-400' :
                    log.node === 'REASONER' ? 'text-yellow-400' :
                    'text-cyan-400'
                  }>
                    {log.node}
                  </span>:{' '}
                  <span className={
                    log.type === 'success' ? 'text-teal-400 font-medium' :
                    log.type === 'warn' ? 'text-amber-400' :
                    log.type === 'system' ? 'text-purple-300' :
                    'text-slate-350'
                  }>
                    {log.message}
                  </span>
                </div>
              ))}
              <div ref={logEndRef} />
            </div>
          </div>

          {/* Safety Profiles Panel */}
          {profile && (
            <div className="p-4 rounded-2xl glass-panel border border-white/5 space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <ShieldAlert className="h-4 w-4 text-teal-400" /> Grounding Profile Details
              </h4>
              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-450">Active Allergies:</span>
                  <span className="font-semibold text-amber-400">{profile.allergies?.join(', ') || 'None'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-450">Active Medications:</span>
                  <span className="font-semibold text-teal-400">{profile.active_medications?.join(', ') || 'None'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-450">Stated Blood Type:</span>
                  <span className="font-semibold text-slate-300">{profile.blood_type}</span>
                </div>
              </div>
            </div>
          )}

        </div>

      </div>
    </div>
  );
}
