'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { motion, animate } from 'framer-motion';

function AnimatedCounter({ value, duration = 1.2, isDecimal = false, suffix = "" }: {
  value: number;
  duration?: number;
  isDecimal?: boolean;
  suffix?: string;
}) {
  const nodeRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const node = nodeRef.current;
    if (!node) return;

    const controls = animate(0, value, {
      duration,
      ease: "easeOut",
      onUpdate(val) {
        node.textContent = isDecimal
          ? val.toFixed(3)
          : Math.floor(val).toString() + suffix;
      }
    });

    return () => controls.stop();
  }, [value, duration, isDecimal, suffix]);

  return <span ref={nodeRef}>0</span>;
}

export default function LandingPage() {
  const [demoInput, setDemoInput] = useState('');
  const [showDemoResults, setShowDemoResults] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [randomGuidelines, setRandomGuidelines] = useState<any[]>([]);

  useEffect(() => {
    const list = [
      {
        condition: 'Migraine Headache',
        symptoms: 'unilateral pain, throbbing headache, nausea, light sensitivity',
        description: 'A neurological condition causing severe, throbbing headaches, often accompanied by sensory disturbances and nausea.',
        triageLevel: 'Primary Care',
        suggestedMeds: 'Ibuprofen, Acetaminophen, Sumatriptan'
      },
      {
        condition: 'Acute Bronchitis',
        symptoms: 'cough, mucus, chest congestion, mild fever, sore throat',
        description: 'Inflammation of the lining of your bronchial tubes, which carry air to and from your lungs. Usually viral.',
        triageLevel: 'Self-Care',
        suggestedMeds: 'Dextromethorphan, Guaifenesin, Acetaminophen'
      },
      {
        condition: 'Gastroenteritis (Stomach Flu)',
        symptoms: 'stomach pain, nausea, vomiting, diarrhea, cramps',
        description: 'An intestinal infection marked by watery diarrhea, abdominal cramps, nausea or vomiting, and sometimes fever.',
        triageLevel: 'Self-Care',
        suggestedMeds: 'Oral Rehydration Salts, Loperamide'
      },
      {
        condition: 'Allergic Rhinitis (Hay Fever)',
        symptoms: 'sneezing, runny nose, itchy eyes, nasal congestion',
        description: 'An allergic response to outdoor or indoor allergens, such as pollen, dust mites, or pet dander.',
        triageLevel: 'Self-Care',
        suggestedMeds: 'Cetirizine, Loratadine, Nasal spray'
      },
      {
        condition: 'Angina / Potential Cardiac Event',
        symptoms: 'chest pain, chest tightness, shortness of breath, radiating pain',
        description: 'Reduced blood flow to the heart muscle. Can be a symptom of a coronary artery block.',
        triageLevel: 'Emergency',
        suggestedMeds: 'Aspirin, Nitroglycerin'
      },
      {
        condition: 'Streptococcal Pharyngitis (Strep Throat)',
        symptoms: 'severe sore throat, pain swallowing, swollen tonsils, fever',
        description: 'A bacterial infection of the throat and tonsils causing sudden, intense throat pain and fever.',
        triageLevel: 'Primary Care',
        suggestedMeds: 'Penicillin, Amoxicillin, Acetaminophen'
      }
    ];
    const shuffled = [...list].sort(() => 0.5 - Math.random());
    setRandomGuidelines(shuffled.slice(0, 3));
  }, []);

  useEffect(() => {
    const text = "I have a throbbing headache on one side, nausea and light hurts my eyes";
    let index = 0;
    setIsTyping(true);

    const timer = setInterval(() => {
      if (index < text.length) {
        setDemoInput(text.slice(0, index + 1));
        index++;
      } else {
        clearInterval(timer);
        setIsTyping(false);
        setTimeout(() => {
          setShowDemoResults(true);
        }, 300);
      }
    }, 30);

    return () => clearInterval(timer);
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
    >
      <h2 className="sr-only">MedLens landing page</h2>

      <div className="hero">
        <div className="hero-badge">
          <div className="badge-dot"></div>
          500+ conditions · NHS clinical knowledge base
        </div>
        
        <motion.h1
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          AI diagnosis backed by<br /><span>retrieval-grade evidence</span>
        </motion.h1>
        
        <motion.p
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          Describe your symptoms in plain language. MedLens retrieves relevant clinical knowledge and returns ranked diagnoses with confidence scores and source evidence.
        </motion.p>

        <motion.div
          className="hero-actions"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.3 }}
        >
          <Link href="/diagnose">
            <button className="btn-primary">Try MedLens</button>
          </Link>
          <Link href="/metrics">
            <button className="btn-outline">View Metrics</button>
          </Link>
        </motion.div>
      </div>

      <div className="metrics-row">
        <div className="metric">
          <div className="metric-label">MRR</div>
          <div className="metric-val">
            <AnimatedCounter value={0.975} isDecimal={true} />
          </div>
          <div className="metric-sub">Mean Reciprocal Rank</div>
        </div>
        <div className="metric">
          <div className="metric-label">nDCG</div>
          <div className="metric-val">
            <AnimatedCounter value={0.981} isDecimal={true} />
          </div>
          <div className="metric-sub">Normalized Discounted Gain</div>
        </div>
        <div className="metric">
          <div className="metric-label">Conditions</div>
          <div className="metric-val">
            <AnimatedCounter value={500} suffix="+" />
          </div>
          <div className="metric-sub">NHS-sourced</div>
        </div>
        <div className="metric">
          <div className="metric-label">Coverage</div>
          <div className="metric-val">
            <AnimatedCounter value={95} suffix="%" />
          </div>
          <div className="metric-sub">Keyword coverage</div>
        </div>
      </div>

      <div className="demo-window">
        <div className="demo-bar">
          <div className="demo-dots">
            <div className="demo-dot"></div>
            <div className="demo-dot"></div>
            <div className="demo-dot"></div>
          </div>
          <div className="demo-url">medlens.app/diagnose</div>
        </div>
        <div className="demo-body">
          <div className="input-area">
            <span>{demoInput}{isTyping && <span className="input-cursor"></span>}</span>
            <Link href={`/diagnose?symptoms=${encodeURIComponent(demoInput)}`} className="input-send" style={{ cursor: 'pointer' }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5">
                <line x1="5" y1="12" x2="19" y2="12"></line>
                <polyline points="12 5 19 12 12 19"></polyline>
              </svg>
            </Link>
          </div>

          {showDemoResults && (
            <motion.div
              className="diag-cards"
              initial="hidden"
              animate="visible"
              variants={{
                visible: {
                  transition: {
                    staggerChildren: 0.1
                  }
                }
              }}
            >
              <motion.div
                className="diag-card"
                style={{ borderColor: 'rgba(0, 180, 216, 0.3)' }}
                variants={{
                  hidden: { opacity: 0, y: 8 },
                  visible: { opacity: 1, y: 0 }
                }}
              >
                <div className="diag-top">
                  <div className="diag-name">Migraine</div>
                  <div className="diag-pct">94%</div>
                </div>
                <div className="bar-bg">
                  <motion.div
                    className="bar-fill"
                    initial={{ width: 0 }}
                    animate={{ width: "94%" }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                  ></motion.div>
                </div>
                <div className="diag-meta">source: migraine.md · section: symptoms · cross-encoder: 5.41</div>
              </motion.div>

              <motion.div
                className="diag-card"
                variants={{
                  hidden: { opacity: 0, y: 8 },
                  visible: { opacity: 1, y: 0 }
                }}
              >
                <div className="diag-top">
                  <div className="diag-name">Tension Headache</div>
                  <div className="diag-pct">61%</div>
                </div>
                <div className="bar-bg">
                  <motion.div
                    className="bar-fill"
                    initial={{ width: 0 }}
                    animate={{ width: "61%" }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                  ></motion.div>
                </div>
                <div className="diag-meta">source: headache.md · section: types of headache</div>
              </motion.div>

              <motion.div
                className="diag-card"
                variants={{
                  hidden: { opacity: 0, y: 8 },
                  visible: { opacity: 1, y: 0 }
                }}
              >
                <div className="diag-top">
                  <div className="diag-name">Cluster Headache</div>
                  <div className="diag-pct">38%</div>
                </div>
                <div className="bar-bg">
                  <motion.div
                    className="bar-fill"
                    initial={{ width: 0 }}
                    animate={{ width: "38%" }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                  ></motion.div>
                </div>
                <div className="diag-meta">source: headache.md · section: when to see a GP</div>
              </motion.div>
            </motion.div>
          )}
        </div>
      </div>

      <div className="section">
        <div className="section-label">How it works</div>
        <div className="section-title">From symptoms to evidence-backed results</div>
        <div className="section-sub">A multi-stage retrieval pipeline retrieves and ranks the most relevant clinical knowledge for every query.</div>
        <div className="how-grid">
          <div className="how-card">
            <div className="how-num">01</div>
            <div className="how-title">HyDE query expansion</div>
            <div className="how-desc">llama3.2 rewrites your symptom description as a hypothetical NHS clinical paragraph. This aligns your query with the embedding space of the knowledge base.</div>
          </div>
          <div className="how-card">
            <div className="how-num">02</div>
            <div className="how-title">hybrid retrieval</div>
            <div className="how-desc">mxbai-embed-large generates dense vectors. BM25 handles exact keyword matches. Both search the 500-condition ChromaDB corpus simultaneously, returning 50 candidates.</div>
          </div>
          <div className="how-card">
            <div className="how-num">03</div>
            <div className="how-title">cross-encoder reranking</div>
            <div className="how-desc">ms-marco-MiniLM cross-encoder scores all 50 candidate pairs jointly against your query. Top 5 chunks are selected. Keyword boost applied for distinguishing identifiers.</div>
          </div>
        </div>
      </div>

      <div className="section">
        <div className="section-label">architecture</div>
        <div className="section-title">RAG pipeline</div>
        <div style={{ border: '0.5px solid var(--color-border-tertiary)', borderRadius: 'var(--border-radius-lg)', padding: '1.25rem', background: 'var(--color-background-secondary)' }}>
          <div className="arch-row">
            <div className="arch-step">
              <div className="arch-icon">💬</div>
              <div className="arch-label">symptom input</div>
              <div className="arch-sub">natural language</div>
            </div>
            <div className="arch-step">
              <div className="arch-icon">🧠</div>
              <div className="arch-label">HyDE + embed</div>
              <div className="arch-sub">mxbai-embed-large</div>
            </div>
            <div className="arch-step">
              <div className="arch-icon">🗄️</div>
              <div className="arch-label">ChromaDB + BM25</div>
              <div className="arch-sub">500 conditions</div>
            </div>
            <div className="arch-step">
              <div className="arch-icon">📊</div>
              <div className="arch-label">cross-encoder</div>
              <div className="arch-sub">rerank top 50</div>
            </div>
            <div className="arch-step">
              <div className="arch-icon">📋</div>
              <div className="arch-label">phi3 synthesis</div>
              <div className="arch-sub">structured output</div>
            </div>
          </div>
        </div>
      </div>

      <div className="section">
        <div className="section-label">Retrieval Evaluation</div>
        <div className="section-title">Benchmarked against 170 test cases</div>
        <div className="eval-grid">
          <div className="eval-card">
            <div className="eval-top">
              <div>
                <div className="eval-metric">0.975</div>
                <div className="eval-name">Mean Reciprocal Rank (MRR)</div>
              </div>
              <div className="eval-badge">Excellent</div>
            </div>
            <div className="mini-bar-row">
              <div className="mini-bar-item">
                <div className="mini-bar-label">Neurological</div>
                <div className="mini-bar-bg"><div className="mini-bar-fill" style={{ width: '98%' }}></div></div>
                <div className="mini-bar-val">0.98</div>
              </div>
              <div className="mini-bar-item">
                <div className="mini-bar-label">Respiratory</div>
                <div className="mini-bar-bg"><div className="mini-bar-fill" style={{ width: '96%' }}></div></div>
                <div className="mini-bar-val">0.96</div>
              </div>
              <div className="mini-bar-item">
                <div className="mini-bar-label">Gastrointestinal</div>
                <div className="mini-bar-bg"><div className="mini-bar-fill" style={{ width: '97%' }}></div></div>
                <div className="mini-bar-val">0.97</div>
              </div>
              <div className="mini-bar-item">
                <div className="mini-bar-label">Infectious</div>
                <div className="mini-bar-bg"><div className="mini-bar-fill" style={{ width: '95%' }}></div></div>
                <div className="mini-bar-val">0.95</div>
              </div>
            </div>
          </div>
          <div className="eval-card">
            <div className="eval-top">
              <div>
                <div className="eval-metric">0.981</div>
                <div className="eval-name">Normalized DCG (nDCG)</div>
              </div>
              <div className="eval-badge">Excellent</div>
            </div>
            <div className="mini-bar-row">
              <div className="mini-bar-item">
                <div className="mini-bar-label">Cardiovascular</div>
                <div className="mini-bar-bg"><div className="mini-bar-fill" style={{ width: '99%' }}></div></div>
                <div className="mini-bar-val">0.99</div>
              </div>
              <div className="mini-bar-item">
                <div className="mini-bar-label">Dermatological</div>
                <div className="mini-bar-bg"><div className="mini-bar-fill" style={{ width: '97%' }}></div></div>
                <div className="mini-bar-val">0.97</div>
              </div>
              <div className="mini-bar-item">
                <div className="mini-bar-label">Musculoskeletal</div>
                <div className="mini-bar-bg"><div className="mini-bar-fill" style={{ width: '98%' }}></div></div>
                <div className="mini-bar-val">0.98</div>
              </div>
              <div className="mini-bar-item">
                <div className="mini-bar-label">Psychiatric</div>
                <div className="mini-bar-bg"><div className="mini-bar-fill" style={{ width: '96%' }}></div></div>
                <div className="mini-bar-val">0.96</div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="section">
        <div className="section-label">nhs clinical database spotlight</div>
        <div className="section-title">scraped disease spotlight (random 3)</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '12px', marginTop: '1rem' }}>
          {randomGuidelines.map((item, idx) => (
            <div key={idx} style={{ border: '0.5px solid var(--color-border-tertiary)', borderRadius: 'var(--border-radius-lg)', padding: '1rem', background: 'var(--color-background-secondary)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: '13px', fontWeight: 550, color: 'var(--color-text-primary)' }}>{item.condition}</span>
                <span className="tag" style={{ background: 'var(--color-background-success)', color: 'var(--color-text-success)', borderColor: 'transparent' }}>{item.triageLevel}</span>
              </div>
              <p style={{ fontSize: '12px', color: 'var(--color-text-secondary)', lineHeight: '1.5', marginBottom: '8px' }}>{item.description}</p>
              <div style={{ fontSize: '11px', color: 'var(--color-text-tertiary)' }}>
                <strong>Indicators:</strong> {item.symptoms}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--color-text-tertiary)', marginTop: '4px' }}>
                <strong>Suggested Care:</strong> {item.suggestedMeds}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="cta-section">
        <div style={{ fontSize: '18px', fontWeight: 500, color: 'var(--color-text-primary)', marginBottom: '8px' }}>Try MedLens</div>
        <div style={{ fontSize: '13px', color: 'var(--color-text-secondary)', marginBottom: '16px' }}>Describe your symptoms in plain language</div>
        <Link href="/diagnose">
          <button className="btn-primary">Open Diagnosis Workspace</button>
        </Link>
      </div>
    </motion.div>
  );
}
