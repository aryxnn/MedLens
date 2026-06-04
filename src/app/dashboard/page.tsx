'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import {
  Activity,
  Plus,
  User,
  LogOut,
  AlertTriangle,
  History,
  Shield,
  Clock,
  Heart,
  Search,
  CheckCircle,
  FileText,
  TrendingUp
} from 'lucide-react';

interface Profile {
  id: string;
  age: number;
  gender: string;
  weight: number;
  medical_conditions: string[];
  active_medications: string[];
  allergies: string[];
  blood_type: string;
}

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

export default function DashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [history, setHistory] = useState<DiagnosisRecord[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [lookupQuery, setLookupQuery] = useState('');
  const [lookupResult, setLookupResult] = useState<any[]>([]);
  const [searchingLookup, setSearchingLookup] = useState(false);

  const handleLookupSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lookupQuery.trim()) return;
    setSearchingLookup(true);
    try {
      const res = await fetch(`/api/conditions?q=${encodeURIComponent(lookupQuery)}`);
      if (res.ok) {
        const data = await res.json();
        setLookupResult(data.guidelines || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSearchingLookup(false);
    }
  };

  // Onboarding Form States
  const [age, setAge] = useState('');
  const [gender, setGender] = useState('Male');
  const [weight, setWeight] = useState('');
  const [conditions, setConditions] = useState('');
  const [medications, setMedications] = useState('');
  const [allergies, setAllergies] = useState('Aspirin');
  const [bloodType, setBloodType] = useState('O+');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  // Fetch profile and history
  const fetchUserData = useCallback(async (userId: string) => {
    try {
      // 1. Fetch Profile
      const { data: profileData, error: profileErr } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (profileErr && profileErr.code !== 'PGRST116') {
        // PGRST116 is code for "no rows found", which is expected for new users
        throw profileErr;
      }

      if (profileData) {
        setProfile(profileData);
        // 2. Fetch history if profile exists
        const { data: historyData, error: historyErr } = await supabase
          .from('diagnoses')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false });

        if (historyErr) throw historyErr;
        setHistory(historyData || []);
      }
    } catch (err: any) {
      console.error('Error fetching user data:', err.message);
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
        fetchUserData(session.user.id);
      }
    };
    getSession();
  }, [router, fetchUserData]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/auth');
  };

  const handleOnboardingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!age || !weight) {
      setFormError('Please fill in age and weight.');
      return;
    }
    setSubmitting(true);
    setFormError('');

    const parsedConditions = conditions.split(',').map(s => s.trim()).filter(Boolean);
    const parsedMeds = medications.split(',').map(s => s.trim()).filter(Boolean);
    const parsedAllergies = allergies.split(',').map(s => s.trim()).filter(Boolean);

    try {
      const { error } = await supabase.from('profiles').insert([
        {
          id: user.id,
          age: parseInt(age),
          gender,
          weight: parseFloat(weight),
          medical_conditions: parsedConditions,
          active_medications: parsedMeds,
          allergies: parsedAllergies,
          blood_type: bloodType
        }
      ]);

      if (error) throw error;
      
      // Reload profile data
      fetchUserData(user.id);
    } catch (err: any) {
      setFormError(err.message || 'Failed to submit profile.');
    } finally {
      setSubmitting(false);
    }
  };

  // Filter diagnoses history by symptoms or conditions
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
          <p className="text-sm text-slate-400">Loading MedLens Dashboard...</p>
        </div>
      </div>
    );
  }

  // 1. Render Onboarding view if Profile is missing
  if (!profile) {
    return (
      <div className="min-h-screen bg-[#0b132b] text-white px-4 py-12 sm:px-6 lg:px-8 flex items-center justify-center">
        {/* Glow effects */}
        <div className="absolute top-1/4 left-1/4 h-96 w-96 rounded-full bg-cyan-500/10 blur-[128px]" />
        
        <div className="relative w-full max-w-2xl space-y-8 rounded-2xl glass-panel-glow p-8">
          <div className="text-center">
            <Shield className="mx-auto h-12 w-12 text-teal-400" />
            <h2 className="mt-4 text-3xl font-extrabold tracking-tight">Complete Medical Profile</h2>
            <p className="mt-2 text-sm text-slate-450">
              We require basic health history to run the Safety Conflict checking agent.
            </p>
          </div>

          {formError && (
            <div className="flex items-center gap-3 rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-400">
              <AlertTriangle className="h-5 w-5 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          <form onSubmit={handleOnboardingSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-slate-300">Age</label>
                <input
                  type="number"
                  required
                  value={age}
                  onChange={(e) => setAge(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-900/60 p-3 text-white focus:border-cyan-500 focus:outline-none"
                  placeholder="e.g. 28"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300">Gender</label>
                <select
                  value={gender}
                  onChange={(e) => setGender(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-900/60 p-3 text-white focus:border-cyan-500 focus:outline-none"
                >
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300">Weight (kg)</label>
                <input
                  type="number"
                  step="0.1"
                  required
                  value={weight}
                  onChange={(e) => setWeight(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-900/60 p-3 text-white focus:border-cyan-500 focus:outline-none"
                  placeholder="e.g. 70"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300">Blood Type</label>
                <select
                  value={bloodType}
                  onChange={(e) => setBloodType(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-900/60 p-3 text-white focus:border-cyan-500 focus:outline-none"
                >
                  <option value="A+">A+</option>
                  <option value="A-">A-</option>
                  <option value="B+">B+</option>
                  <option value="B-">B-</option>
                  <option value="AB+">AB+</option>
                  <option value="AB-">AB-</option>
                  <option value="O+">O+</option>
                  <option value="O-">O-</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300">
                Medical Conditions <span className="text-xs text-slate-500">(comma-separated)</span>
              </label>
              <textarea
                value={conditions}
                onChange={(e) => setConditions(e.target.value)}
                rows={2}
                className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-900/60 p-3 text-white focus:border-cyan-500 focus:outline-none"
                placeholder="Asthma, Hypertension, Diabetes..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300">
                Active Medications <span className="text-xs text-slate-500">(comma-separated)</span>
              </label>
              <textarea
                value={medications}
                onChange={(e) => setMedications(e.target.value)}
                rows={2}
                className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-900/60 p-3 text-white focus:border-cyan-500 focus:outline-none"
                placeholder="Albuterol, Metformin..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300">
                Allergies <span className="text-xs text-slate-500">(comma-separated)</span>
              </label>
              <textarea
                value={allergies}
                onChange={(e) => setAllergies(e.target.value)}
                rows={2}
                className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-900/60 p-3 text-white focus:border-cyan-500 focus:outline-none"
                placeholder="Peanuts, Aspirin, Codeine..."
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-xl bg-gradient-to-r from-cyan-500 to-teal-500 py-3 text-base font-semibold text-[#0b132b] hover:from-cyan-400 hover:to-teal-400 focus:outline-none disabled:opacity-50"
            >
              {submitting ? 'Creating Profile...' : 'Save Profile & Go to Dashboard'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // 2. Render Main Dashboard view
  return (
    <div className="flex min-h-screen bg-[#0b132b] text-white">
      {/* Sidebar navigation */}
      <aside className="w-64 border-r border-white/5 bg-[#1c2541]/40 hidden md:flex flex-col p-6 space-y-8">
        <div className="flex items-center gap-2">
          <Activity className="h-6 w-6 text-cyan-400" />
          <span className="text-lg font-bold tracking-wider">MedLens</span>
        </div>

        <nav className="flex-1 space-y-2">
          <div className="flex items-center gap-3 p-3 rounded-xl bg-cyan-500/10 text-cyan-400 font-medium">
            <Heart className="h-5 w-5" />
            <span>Dashboard</span>
          </div>
          <button
            onClick={() => router.push('/dashboard/chat')}
            className="flex w-full items-center gap-3 p-3 rounded-xl text-slate-400 hover:bg-white/5 hover:text-white transition-all text-sm font-medium"
          >
            <Plus className="h-5 w-5" />
            <span>New Assessment</span>
          </button>
          <button
            onClick={() => router.push('/dashboard/history')}
            className="flex w-full items-center gap-3 p-3 rounded-xl text-slate-400 hover:bg-white/5 hover:text-white transition-all text-sm font-medium"
          >
            <History className="h-5 w-5" />
            <span>Consultation History</span>
          </button>
          <button
            onClick={() => router.push('/metrics')}
            className="flex w-full items-center gap-3 p-3 rounded-xl text-slate-400 hover:bg-white/5 hover:text-white transition-all text-sm font-medium"
          >
            <TrendingUp className="h-5 w-5" />
            <span>RAG Live Metrics</span>
          </button>
        </nav>

        <div className="border-t border-white/5 pt-4">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-9 w-9 rounded-full bg-slate-800 flex items-center justify-center text-slate-200">
              <User className="h-5 w-5" />
            </div>
            <div className="truncate">
              <p className="text-xs text-slate-400">Logged in as</p>
              <p className="text-sm font-semibold truncate text-slate-200">{user?.email}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-3 p-2.5 rounded-xl border border-red-500/30 bg-red-500/5 text-red-400 hover:bg-red-500/10 transition-all text-sm font-medium"
          >
            <LogOut className="h-4.5 w-4.5" />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Panel */}
      <main className="flex-1 p-6 md:p-10 space-y-8 overflow-y-auto">
        {/* Mobile Header */}
        <header className="flex md:hidden items-center justify-between border-b border-white/5 pb-4">
          <div className="flex items-center gap-2">
            <Activity className="h-6 w-6 text-cyan-400" />
            <span className="font-bold text-white tracking-wider">MedLens</span>
          </div>
          <button onClick={handleLogout} className="text-slate-400 hover:text-red-400">
            <LogOut className="h-5 w-5" />
          </button>
        </header>

        {/* Dashboard Grid Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight">Clinical Dashboard</h1>
            <p className="text-slate-400 text-sm">Monitor triage evaluations and safety reports</p>
          </div>
          
          <button
            onClick={() => router.push('/dashboard/chat')}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-teal-500 px-5 py-3 text-sm font-semibold text-[#0b132b] hover:from-cyan-400 hover:to-teal-400 shadow-lg shadow-cyan-500/15"
          >
            <Plus className="h-5 w-5" />
            New Assessment
          </button>
        </div>

        {/* Info Grid (Summary metrics) */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="p-5 rounded-2xl glass-panel space-y-2">
            <p className="text-xs font-semibold text-slate-450 uppercase tracking-wider">Basic Health Info</p>
            <div className="flex justify-between items-baseline">
              <span className="text-2xl font-bold text-white">{profile.age} Yrs</span>
              <span className="text-sm text-slate-400 capitalize">{profile.gender}</span>
            </div>
            <p className="text-xs text-slate-450">Weight: {profile.weight} kg | Blood: {profile.blood_type}</p>
          </div>

          <div className="p-5 rounded-2xl glass-panel space-y-2">
            <p className="text-xs font-semibold text-slate-450 uppercase tracking-wider">Active Medications</p>
            <div className="text-2xl font-bold text-teal-400">
              {profile.active_medications.length}
            </div>
            <p className="text-xs text-slate-450 truncate">
              {profile.active_medications.join(', ') || 'None registered'}
            </p>
          </div>

          <div className="p-5 rounded-2xl glass-panel space-y-2">
            <p className="text-xs font-semibold text-slate-450 uppercase tracking-wider">Registered Allergies</p>
            <div className="text-2xl font-bold text-amber-400">
              {profile.allergies.length}
            </div>
            <p className="text-xs text-slate-450 truncate">
              {profile.allergies.join(', ') || 'No allergies listed'}
            </p>
          </div>

          <div className="p-5 rounded-2xl glass-panel space-y-2">
            <p className="text-xs font-semibold text-slate-450 uppercase tracking-wider">Total Triage Checks</p>
            <div className="text-2xl font-bold text-cyan-400">
              {history.length}
            </div>
            <p className="text-xs text-slate-450">Recorded history database logs</p>
          </div>
        </section>

        {/* NHS Condition Reference Library Lookup */}
        <section className="p-6 rounded-2xl glass-panel border border-white/5 space-y-6">
          <div className="flex items-center gap-2 border-b border-white/5 pb-3">
            <Search className="h-5 w-5 text-cyan-400" />
            <h2 className="text-xl font-bold">NHS Clinical Knowledge Base (500+ Conditions)</h2>
          </div>
          <p className="text-sm text-slate-400">
            Search our expanded database of 500 conditions instantly. Retrieve clinical descriptions, primary symptom identifiers, and suggested care guidelines directly.
          </p>

          <form onSubmit={handleLookupSearch} className="flex gap-3">
            <input
              type="text"
              placeholder="Type a condition or symptom (e.g. Bronchitis, Migraine, Cystic Fibrosis)..."
              value={lookupQuery}
              onChange={(e) => setLookupQuery(e.target.value)}
              className="flex-1 rounded-xl border border-slate-700 bg-slate-900/60 p-3.5 text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500 text-sm"
            />
            <button
              type="submit"
              disabled={searchingLookup}
              className="rounded-xl bg-gradient-to-r from-cyan-500 to-teal-500 px-6 py-3.5 text-sm font-semibold text-[#0b132b] hover:from-cyan-400 hover:to-teal-400 disabled:opacity-50 transition-all"
            >
              {searchingLookup ? 'Searching...' : 'Search Library'}
            </button>
          </form>

          {lookupResult.length > 0 && (
            <div className="space-y-4 pt-2">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400">Search Results</h3>
              <div className="grid grid-cols-1 gap-6">
                {lookupResult.map((g, idx) => (
                  <div key={idx} className="p-5 rounded-xl bg-slate-950/40 border border-white/5 space-y-3">
                    <div className="flex items-center justify-between border-b border-white/5 pb-2">
                      <h4 className="font-bold text-lg text-slate-200">{g.condition}</h4>
                      <span className="text-xs px-2.5 py-1 rounded bg-teal-500/10 text-teal-300 border border-teal-500/20">
                        {g.triageLevel} Triage
                      </span>
                    </div>
                    <div className="text-sm text-slate-350 leading-relaxed">
                      <strong>Description:</strong> {g.description}
                    </div>
                    <div className="text-sm">
                      <strong className="text-slate-400">Symptom Identifiers:</strong>
                      <div className="flex flex-wrap gap-1.5 mt-1.5">
                        {g.symptoms.map((s: string) => (
                          <span key={s} className="text-xs px-2.5 py-1 rounded bg-slate-900 border border-slate-800 text-slate-305">
                            {s}
                          </span>
                        ))}
                      </div>
                    </div>
                    {g.suggestedMeds.length > 0 && (
                      <div className="text-sm">
                        <strong className="text-teal-400">Suggested Care & Medications:</strong>
                        <p className="mt-1 text-slate-300 text-xs">
                          {g.suggestedMeds.join(', ')}
                        </p>
                      </div>
                    )}
                    {g.dangerFlags.length > 0 && (
                      <div className="p-3 rounded-lg bg-red-500/5 border border-red-500/20 text-xs text-red-300 space-y-1">
                        <strong className="text-red-400 block">Critical Warning Signals:</strong>
                        <ul className="list-disc pl-4 space-y-1">
                          {g.dangerFlags.map((flag: string, i: number) => (
                            <li key={i}>{flag}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
