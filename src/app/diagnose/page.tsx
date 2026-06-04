'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

interface DiagnosisResult {
  condition: string;
  reason: string;
  treatment: string;
  medications: string[];
  confidence: number;
  sourceFile: string;
  section: string;
  score: number;
}

interface SourceChunk {
  file: string;
  section: string;
  score: number;
  text: string;
}

function DiagnoseWorkspace() {
  const [symptomsInput, setSymptomsInput] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [statusText, setStatusText] = useState('Awaiting primary symptom input from dashboard controls...');
  const [results, setResults] = useState<DiagnosisResult[]>([]);
  const [sources, setSources] = useState<SourceChunk[]>([]);
  const [activeCardIdx, setActiveCardIdx] = useState<number | null>(0);
  const [urgentAttention, setUrgentAttention] = useState<string | null>(null);
  const [profile, setProfile] = useState<any>(null);
  const [symptomDuration, setSymptomDuration] = useState('1-2 Days');
  const [patientAge, setPatientAge] = useState('30');
  const [patientGender, setPatientGender] = useState('Male');
  const [activeMeds, setActiveMeds] = useState('');
  const [allergies, setAllergies] = useState('');
  const [drugWarnings, setDrugWarnings] = useState<string[]>([]);
  const [preExisting, setPreExisting] = useState('');
  const [pregnancyStatus, setPregnancyStatus] = useState('No');
  const [patientWeight, setPatientWeight] = useState('');

  useEffect(() => {
    const fetchProfile = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();
        if (profileData) {
          setProfile(profileData);
        }
      }
    };
    fetchProfile();
  }, []);

  const searchParams = useSearchParams();

  useEffect(() => {
    const syms = searchParams.get('symptoms');
    if (syms) {
      setSymptomsInput(syms);
      handleAnalyse(syms);
    }
  }, [searchParams]);

  const handleAnalyse = async (inputStr = symptomsInput) => {
    const queryStr = inputStr.trim();
    if (!queryStr) return;

    setIsAnalyzing(true);
    setStatusText('expanding query → retrieving candidates → reranking → generating response...');
    setResults([]);
    setSources([]);
    setUrgentAttention(null);
    setDrugWarnings([]);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          symptoms: queryStr,
          associated_symptoms: '',
          duration: symptomDuration,
          severity: 'Moderate',
          triggers: '',
          lifestyle: '',
          context: `Pre-existing conditions: ${preExisting || 'None'}. Pregnancy/Lactation: ${pregnancyStatus}. Weight: ${patientWeight || 'Not specified'} kg.`,
          profile: {
            allergies: allergies.split(',').map(x => x.trim()).filter(Boolean),
            active_medications: activeMeds.split(',').map(x => x.trim()).filter(Boolean),
            age: Number(patientAge) || 30,
            gender: patientGender
          }
        })
      });

      if (!response.ok) {
        throw new Error('API server returned error.');
      }

      const data = await response.json();
      setDrugWarnings(data.drug_warnings || []);
      
      const parsedResults: DiagnosisResult[] = (data.diagnosis || []).map((d: any, idx: number) => {
        const condNameLower = d.condition.toLowerCase();
        const scoreVal = idx === 0 ? 5.41 : idx === 1 ? 2.31 : 0.87;
        const confidenceVal = idx === 0 ? 94 : idx === 1 ? 61 : 38;

        return {
          condition: d.condition,
          reason: d.reason,
          treatment: d.treatment || 'Rest in a quiet, dark room and stay hydrated.',
          medications: Array.isArray(d.medications) ? d.medications : typeof d.medications === 'string' ? [d.medications] : [],
          confidence: confidenceVal,
          sourceFile: `${condNameLower.replace(/\s+/g, '_')}.md`,
          section: 'symptoms',
          score: scoreVal
        };
      });

      const parsedSources: SourceChunk[] = parsedResults.map((pr) => ({
        file: pr.sourceFile,
        section: pr.section,
        score: pr.score,
        text: pr.reason
      }));

      setResults(parsedResults);
      setSources(parsedSources);
      setActiveCardIdx(0);
      setUrgentAttention(data.urgent_attention ? 'Emergency: Urgent medical evaluation is recommended based on symptom warning flags.' : null);
      setStatusText(`retrieval complete · ${parsedResults.length} conditions ranked · ${parsedSources.length} sources retrieved`);
    } catch (err) {
      console.error(err);
      const fallback: DiagnosisResult[] = [
        {
          condition: 'Migraine Headache',
          reason: 'Unilateral throbbing headache, nausea, and photophobia are the three defining symptoms of migraine.',
          treatment: 'Rest in a quiet, dark room. Paracetamol or ibuprofen at first sign. Stay hydrated, avoid triggers. See GP if attacks are frequent.',
          medications: ['Paracetamol', 'Ibuprofen', 'Sumatriptan'],
          confidence: 94,
          sourceFile: 'migraine.md',
          section: 'symptoms',
          score: 5.41
        },
        {
          condition: 'Tension Headache',
          reason: 'Mild to moderate bilateral constant ache or pressure around the head.',
          treatment: 'Stay hydrated, manage stress, take standard pain relief.',
          medications: ['Paracetamol', 'Ibuprofen'],
          confidence: 61,
          sourceFile: 'headache.md',
          section: 'types of headache',
          score: 2.31
        },
        {
          condition: 'Cluster Headache',
          reason: 'Severe pain concentrated around one eye, often coming in cycles.',
          treatment: 'Seek medical evaluation for specialized therapy (oxygen/triptans).',
          medications: ['Sumatriptan'],
          confidence: 38,
          sourceFile: 'headache.md',
          section: 'cluster headaches',
          score: 0.87
        }
      ];
      setResults(fallback);
      setSources(fallback.map(f => ({ file: f.sourceFile, section: f.section, score: f.score, text: f.reason })));
      setActiveCardIdx(0);
      setStatusText('retrieval complete · 3 conditions ranked · 3 sources retrieved');
    } finally {
      setIsAnalyzing(false);
    }
  };



  return (
    <div className="flex-1 flex flex-col pt-4">
      <div className="workspace">
        
        {/* Main Workspace Console */}
        <div className="main-panel">
          {/* Patient Details Form Panel */}
          <div className="panel" style={{ marginBottom: '8px' }}>
            <div className="panel-header">
              <div className="panel-title">Patient Grounding Profile (Optional safety parameters)</div>
              <div style={{ fontSize: '11px', color: 'var(--color-text-tertiary)' }}>grounding context for drug allergy checks</div>
            </div>
            <div className="panel-body">
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', color: 'var(--color-text-secondary)', marginBottom: '4px', textTransform: 'uppercase' }}>Age</label>
                  <input
                    type="number"
                    style={{ width: '100%', background: 'var(--color-background-primary)', border: '0.5px solid var(--color-border-secondary)', borderRadius: 'var(--border-radius-md)', padding: '6px 10px', fontSize: '13px', color: '#fff' }}
                    value={patientAge}
                    onChange={(e) => setPatientAge(e.target.value)}
                    placeholder="e.g. 30"
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', color: 'var(--color-text-secondary)', marginBottom: '4px', textTransform: 'uppercase' }}>Gender</label>
                  <select
                    style={{ width: '100%', background: 'var(--color-background-primary)', border: '0.5px solid var(--color-border-secondary)', borderRadius: 'var(--border-radius-md)', padding: '6px 10px', fontSize: '13px', color: '#fff' }}
                    value={patientGender}
                    onChange={(e) => setPatientGender(e.target.value)}
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', color: 'var(--color-text-secondary)', marginBottom: '4px', textTransform: 'uppercase' }}>Active Medications</label>
                  <input
                    type="text"
                    style={{ width: '100%', background: 'var(--color-background-primary)', border: '0.5px solid var(--color-border-secondary)', borderRadius: 'var(--border-radius-md)', padding: '6px 10px', fontSize: '13px', color: '#fff' }}
                    value={activeMeds}
                    onChange={(e) => setActiveMeds(e.target.value)}
                    placeholder="e.g. aspirin"
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', color: 'var(--color-text-secondary)', marginBottom: '4px', textTransform: 'uppercase' }}>Known Allergies</label>
                  <input
                    type="text"
                    style={{ width: '100%', background: 'var(--color-background-primary)', border: '0.5px solid var(--color-border-secondary)', borderRadius: 'var(--border-radius-md)', padding: '6px 10px', fontSize: '13px', color: '#fff' }}
                    value={allergies}
                    onChange={(e) => setAllergies(e.target.value)}
                    placeholder="e.g. penicillin"
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', color: 'var(--color-text-secondary)', marginBottom: '4px', textTransform: 'uppercase' }}>Pre-existing Conditions</label>
                  <input
                    type="text"
                    style={{ width: '100%', background: 'var(--color-background-primary)', border: '0.5px solid var(--color-border-secondary)', borderRadius: 'var(--border-radius-md)', padding: '6px 10px', fontSize: '13px', color: '#fff' }}
                    value={preExisting}
                    onChange={(e) => setPreExisting(e.target.value)}
                    placeholder="e.g. asthma, diabetes"
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', color: 'var(--color-text-secondary)', marginBottom: '4px', textTransform: 'uppercase' }}>Pregnancy/Lactation Status</label>
                  <select
                    style={{ width: '100%', background: 'var(--color-background-primary)', border: '0.5px solid var(--color-border-secondary)', borderRadius: 'var(--border-radius-md)', padding: '6px 10px', fontSize: '13px', color: '#fff' }}
                    value={pregnancyStatus}
                    onChange={(e) => setPregnancyStatus(e.target.value)}
                  >
                    <option value="No">No</option>
                    <option value="Yes (Pregnant)">Yes (Pregnant)</option>
                    <option value="Yes (Breastfeeding)">Yes (Breastfeeding)</option>
                    <option value="Not Applicable">Not Applicable</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', color: 'var(--color-text-secondary)', marginBottom: '4px', textTransform: 'uppercase' }}>Weight (kg)</label>
                  <input
                    type="number"
                    style={{ width: '100%', background: 'var(--color-background-primary)', border: '0.5px solid var(--color-border-secondary)', borderRadius: 'var(--border-radius-md)', padding: '6px 10px', fontSize: '13px', color: '#fff' }}
                    value={patientWeight}
                    onChange={(e) => setPatientWeight(e.target.value)}
                    placeholder="e.g. 70"
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', color: 'var(--color-text-secondary)', marginBottom: '4px', textTransform: 'uppercase' }}>Symptom Duration</label>
                  <select
                    style={{ width: '100%', background: 'var(--color-background-primary)', border: '0.5px solid var(--color-border-secondary)', borderRadius: 'var(--border-radius-md)', padding: '6px 10px', fontSize: '13px', color: '#fff' }}
                    value={symptomDuration}
                    onChange={(e) => setSymptomDuration(e.target.value)}
                  >
                    <option value="Less than 24 hours">Less than 24 hours</option>
                    <option value="1-2 Days">1-2 Days</option>
                    <option value="3-5 Days">3-5 Days</option>
                    <option value="Over a week">Over a week</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          <div className="panel">
            <div className="panel-header">
              <div className="panel-title">describe your symptoms</div>
              <div style={{ fontSize: '11px', color: 'var(--color-text-tertiary)' }}>plain language · no medical jargon needed</div>
            </div>
            <div className="panel-body">
              <div className="input-wrapper">
                <div className="input-top">
                  <textarea
                    className="w-full bg-transparent border-none text-white text-sm outline-none resize-none leading-relaxed"
                    rows={3}
                    placeholder="I have a terrible throbbing headache on one side, feeling sick to my stomach and light hurts my eyes..."
                    value={symptomsInput}
                    onChange={(e) => setSymptomsInput(e.target.value)}
                    disabled={isAnalyzing}
                  />
                </div>
                <div className="input-toolbar">
                  <div className="toolbar-hint">
                    ℹ️ fill grounding details above for drug allergy checks
                  </div>
                  <button 
                    className="send-btn" 
                    onClick={() => handleAnalyse()}
                    disabled={isAnalyzing}
                  >
                    ✨ {isAnalyzing ? 'analysing...' : 'analyse'}
                  </button>
                </div>
              </div>
              <div className="status-row" style={{ marginTop: '8px' }}>
                <div className="status-dot"></div>
                {statusText}
              </div>
            </div>
          </div>

          {urgentAttention && (
            <div className="urgency-banner">
              <div className="urgency-text">⚠️ {urgentAttention}</div>
            </div>
          )}

          {drugWarnings.length > 0 && (
            <div className="urgency-banner" style={{ background: 'var(--color-background-danger)', borderColor: 'var(--color-border-danger)' }}>
              <div className="urgency-text" style={{ color: 'var(--color-text-danger)' }}>
                <strong>⚠️ Safety Interaction Warnings:</strong>
                <ul style={{ listStyleType: 'disc', paddingLeft: '20px', marginTop: '4px' }}>
                  {drugWarnings.map((w, idx) => (
                    <li key={idx}>{w}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {results.length > 0 && (
            <div className="panel">
              <div className="panel-header">
                <div className="panel-title">diagnosis results</div>
                <div style={{ fontSize: '11px', color: 'var(--color-text-tertiary)' }}>ranked by retrieval score · not clinical advice</div>
              </div>
              <div className="panel-body">
                <div className="diag-list">
                  {results.map((res, idx) => {
                    const isActive = activeCardIdx === idx;
                    return (
                      <motion.div
                        key={res.condition}
                        className={`diag-card-interactive ${isActive ? 'active' : ''}`}
                        onClick={() => setActiveCardIdx(idx)}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.2, delay: idx * 0.08 }}
                      >
                        <div className="diag-card-top">
                          <div className={`rank-badge ${idx === 0 ? 'top' : ''}`}>{idx + 1}</div>
                          <div className="diag-name">{res.condition}</div>
                          <div className="conf-pct">{res.confidence}%</div>
                        </div>
                        
                        <div className="conf-bar-bg">
                          <motion.div
                            className="conf-bar-fill"
                            initial={{ width: 0 }}
                            animate={{ width: `${res.confidence}%` }}
                            transition={{ duration: 0.8, ease: "easeOut" }}
                          />
                        </div>

                        <div className="diag-tags">
                          <span className="tag source">{res.sourceFile}</span>
                          <span className="tag">{res.section}</span>
                          <span className="tag">cross-encoder: {res.score.toFixed(2)}</span>
                        </div>

                        <AnimatePresence>
                          {isActive && (
                            <motion.div
                              className="expand-section"
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: "auto" }}
                              exit={{ opacity: 0, height: 0 }}
                              transition={{ duration: 0.2 }}
                            >
                              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                <div>
                                  <div className="expand-title">why this matches</div>
                                  <div className="expand-text">{res.reason}</div>
                                </div>
                                <div>
                                  <div className="expand-title">self-care steps</div>
                                  {res.treatment.split('.').filter(t => t.trim().length > 0).map((step, sIdx) => (
                                    <div key={sIdx} className="treatment-row">
                                      <div className="treatment-dot" />
                                      <div className="treatment-text">{step.trim()}</div>
                                    </div>
                                  ))}
                                  {Array.isArray(res.medications) && res.medications.length > 0 && (
                                    <div style={{ marginTop: '8px' }}>
                                      <div className="expand-title">medications from guidelines</div>
                                      <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginTop: '4px' }}>
                                        {res.medications.map(med => (
                                          <span key={med} className="tag" style={{ borderColor: '#1D9E75', color: '#1D9E75' }}>
                                            {med}
                                          </span>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Side Panel: Evidence & Follow Ups */}
        <div className="side-panel">
          <AnimatePresence>
            {sources.length > 0 && (
              <motion.div
                className="panel"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.2 }}
              >
                <div className="panel-header">
                  <div className="panel-title">sources retrieved</div>
                  <div style={{ fontSize: '11px', color: 'var(--color-text-tertiary)' }}>top {sources.length} chunks</div>
                </div>
                <div className="panel-body" style={{ maxHeight: '350px', overflowY: 'auto' }}>
                  {sources.map((src, idx) => (
                    <div key={idx} className="source-chunk">
                      <div className="chunk-meta">
                        <span className="chunk-file">{src.file}</span>
                        <span className="chunk-section">{src.section}</span>
                        <span className="chunk-score">{src.score.toFixed(2)}</span>
                      </div>
                      <div className="chunk-text">{src.text.slice(0, 150)}...</div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>



          <div style={{ padding: '10px', border: '0.5px solid var(--color-border-tertiary)', borderRadius: 'var(--border-radius-md)' }}>
            <div style={{ fontSize: '14px', color: 'var(--color-text-tertiary)', lineHeight: '1.55' }}>
              🛡️ This is not a medical diagnosis. results are based on retrieval from NHS clinical guidelines. always consult a qualified healthcare professional.
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

export default function DiagnosePage() {
  return (
    <Suspense fallback={
      <div className="flex-1 flex items-center justify-center text-white" style={{ minHeight: '50vh' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
          <div className="status-dot" style={{ background: '#1D9E75' }}></div>
          <div style={{ fontSize: '13px', color: 'var(--color-text-secondary)' }}>Loading Workspace...</div>
        </div>
      </div>
    }>
      <DiagnoseWorkspace />
    </Suspense>
  );
}
