export interface Guideline {
  condition: string;
  symptoms: string[];
  description: string;
  triageLevel: 'Self-Care' | 'Primary Care' | 'Urgent' | 'Emergency';
  suggestedMeds: string[];
  dangerFlags: string[];
}

export const medicalGuidelines: Guideline[] = [
  {
    condition: 'Migraine Headache',
    symptoms: ['throbbing headache', 'nausea', 'sensitivity to light', 'visual aura', 'one-sided pain'],
    description: 'A neurological condition causing severe, throbbing headaches, often accompanied by sensory disturbances and nausea.',
    triageLevel: 'Primary Care',
    suggestedMeds: ['Ibuprofen', 'Acetaminophen', 'Sumatriptan'],
    dangerFlags: ['sudden thunderclap onset', 'numbness or weakness', 'difficulty speaking']
  },
  {
    condition: 'Acute Bronchitis',
    symptoms: ['cough', 'mucus production', 'chest congestion', 'mild fever', 'sore throat'],
    description: 'Inflammation of the lining of your bronchial tubes, which carry air to and from your lungs. Usually viral.',
    triageLevel: 'Self-Care',
    suggestedMeds: ['Dextromethorphan', 'Guaifenesin', 'Acetaminophen'],
    dangerFlags: ['shortness of breath', 'blood in mucus', 'fever above 102F']
  },
  {
    condition: 'Gastroenteritis (Stomach Flu)',
    symptoms: ['stomach pain', 'nausea', 'vomiting', 'diarrhea', 'abdominal cramps', 'mild fever'],
    description: 'An intestinal infection marked by watery diarrhea, abdominal cramps, nausea or vomiting, and sometimes fever.',
    triageLevel: 'Self-Care',
    suggestedMeds: ['Loperamide', 'Oral Rehydration Salts', 'Bismuth Subsalicylate'],
    dangerFlags: ['severe dehydration', 'inability to keep fluids down for 24h', 'high fever', 'blood in stool']
  },
  {
    condition: 'Allergic Rhinitis (Hay Fever)',
    symptoms: ['sneezing', 'runny nose', 'itchy eyes', 'nasal congestion', 'watery eyes'],
    description: 'An allergic response to outdoor or indoor allergens, such as pollen, dust mites, or pet dander.',
    triageLevel: 'Self-Care',
    suggestedMeds: ['Cetirizine', 'Loratadine', 'Fluticasone nasal spray'],
    dangerFlags: ['difficulty breathing', 'wheezing', 'facial swelling']
  },
  {
    condition: 'Angina / Potential Cardiac Event',
    symptoms: ['chest pain', 'chest tightness', 'shortness of breath', 'pain radiating to arm or jaw', 'sweating', 'dizziness'],
    description: 'A type of chest pain caused by reduced blood flow to the heart muscle. Can be a symptom of a coronary artery block or myocardial infarction.',
    triageLevel: 'Emergency',
    suggestedMeds: ['Aspirin', 'Nitroglycerin'],
    dangerFlags: ['pain lasting more than 5 minutes', 'crushing pressure sensation', 'loss of consciousness']
  },
  {
    condition: 'Streptococcal Pharyngitis (Strep Throat)',
    symptoms: ['severe sore throat', 'pain swallowing', 'swollen tonsils', 'white patches on throat', 'fever'],
    description: 'A bacterial infection of the throat and tonsils causing sudden, intense throat pain and fever.',
    triageLevel: 'Primary Care',
    suggestedMeds: ['Penicillin', 'Amoxicillin', 'Acetaminophen'],
    dangerFlags: ['difficulty breathing', 'drooling', 'inability to open mouth wide']
  }
];

// Helper to determine triage level based on text cues
function determineTriageLevel(text: string): 'Self-Care' | 'Primary Care' | 'Urgent' | 'Emergency' {
  const normalized = text.toLowerCase();
  if (normalized.includes("999") || normalized.includes("emergency department") || normalized.includes("a&e") || normalized.includes("call 999 immediately")) {
    return 'Emergency';
  }
  if (normalized.includes("urgent treatment centre") || normalized.includes("call 111") || normalized.includes("111 online") || normalized.includes("go to a&e or call 999")) {
    return 'Urgent';
  }
  if (normalized.includes("see a gp") || normalized.includes("doctor") || normalized.includes("pharmacist") || normalized.includes("general practitioner")) {
    return 'Primary Care';
  }
  return 'Self-Care';
}

// Helper to parse suggested OTC medications from text content
function extractSuggestedMeds(text: string): string[] {
  const commonMeds = [
    'paracetamol', 'ibuprofen', 'aspirin', 'acetaminophen', 'cetirizine',
    'loratadine', 'sumatriptan', 'loperamide', 'gaviscon', 'pepto-bismol',
    'amoxicillin', 'penicillin', 'codeine', 'morphine', 'antihistamine', 'cough syrup'
  ];
  const found = new Set<string>();
  const normalized = text.toLowerCase();
  
  commonMeds.forEach(med => {
    if (normalized.includes(med)) {
      found.add(med.charAt(0).toUpperCase() + med.slice(1));
    }
  });
  
  return Array.from(found);
}

// Dynamic RAG retriever querying the Python FastAPI server
export async function retrieveGuidelines(query: string): Promise<Guideline[]> {
  try {
    const response = await fetch("http://127.0.0.1:8000/query", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ question: query }),
      // Timeout after 3 seconds to avoid blocking the user query if backend is slow
      signal: AbortSignal.timeout(3000)
    });

    if (response.ok) {
      const data = await response.json();
      const chunks = data.chunks || [];
      
      if (chunks.length === 0) {
        return retrieveFallbackGuidelines(query);
      }

      // Group chunks by condition source
      const grouped: { [source: string]: { page_content: string; metadata: any }[] } = {};
      chunks.forEach((c: any) => {
        const source = c.metadata?.source || "general.md";
        if (!grouped[source]) {
          grouped[source] = [];
        }
        grouped[source].push(c);
      });

      const dynamicGuidelines: Guideline[] = [];

      for (const [source, chunkList] of Object.entries(grouped)) {
        const firstChunk = chunkList[0];
        const combinedText = chunkList.map(c => c.page_content).join("\n\n");
        const conditionName = source.replace(".md", "").replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
        const distinguishingStr = firstChunk.metadata?.distinguishing_keywords || "";
        const symptomsList = distinguishingStr.split(",").map((s: string) => s.trim()).filter((s: string) => s.length > 0);
        
        // Extract basic danger flags from text sections containing "call 999" or warning signs
        const dangerFlags: string[] = [];
        const lines = combinedText.split("\n");
        lines.forEach(line => {
          if (line.includes("999") || line.includes("A&E") || line.includes("emergency") || line.includes("urgent")) {
            const cleanLine = line.replace(/^- /, "").trim();
            if (cleanLine.length > 10 && cleanLine.length < 150) {
              dangerFlags.push(cleanLine);
            }
          }
        });

        dynamicGuidelines.push({
          condition: conditionName,
          symptoms: symptomsList.length > 0 ? symptomsList : [query.toLowerCase()],
          description: firstChunk.page_content.split("\n\n").slice(1).join("\n\n").slice(0, 300) + "...",
          triageLevel: determineTriageLevel(combinedText),
          suggestedMeds: extractSuggestedMeds(combinedText),
          dangerFlags: dangerFlags.slice(0, 3)
        });
      }

      return dynamicGuidelines;
    }
  } catch (err) {
    console.warn("FastAPI query failed, using offline fallback: ", err);
  }

  return retrieveFallbackGuidelines(query);
}

// Offline keyword matcher fallback
function retrieveFallbackGuidelines(query: string): Guideline[] {
  const normalizedQuery = query.toLowerCase();
  
  const ranked = medicalGuidelines.map(g => {
    let score = 0;
    
    if (g.condition.toLowerCase().includes(normalizedQuery)) {
      score += 10;
    }
    
    g.symptoms.forEach(s => {
      if (normalizedQuery.includes(s) || s.split(' ').some(word => word.length > 3 && normalizedQuery.includes(word))) {
        score += 3;
      }
    });

    return { guideline: g, score };
  });

  return ranked
    .filter(item => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .map(item => item.guideline);
}
