import { NextResponse } from 'next/server';
import { StateGraph, Annotation } from '@langchain/langgraph';
import { retrieveGuidelines, Guideline } from '@/lib/medicalGuidelines';

const AgentStateAnnotation = Annotation.Root({
  symptoms: Annotation<string>(),
  associated_symptoms: Annotation<string>(),
  duration: Annotation<string>(),
  severity: Annotation<string>(),
  triggers: Annotation<string>(),
  lifestyle: Annotation<string>(),
  context: Annotation<string>(),
  profile: Annotation<{
    allergies: string[];
    active_medications: string[];
    age: number;
    gender: string;
  }>(),
  guidelines: Annotation<Guideline[]>(),
  diagnosis: Annotation<{ condition: string; reason: string; treatment: string; medications: string[] }[]>(),
  drug_warnings: Annotation<string[]>(),
  triage_level: Annotation<string>(),
  urgent_attention: Annotation<boolean>(),
  follow_ups: Annotation<string[]>()
});

type AgentStateType = typeof AgentStateAnnotation.State;

function getLlmConfigs() {
  const configs: any[] = [];
  const geminiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  const groqKey = process.env.GROQ_API_KEY;

  if (geminiKey && geminiKey !== 'your_gemini_api_key' && geminiKey !== 'your_google_api_key') {
    configs.push({
      provider: 'gemini',
      apiKey: geminiKey,
      baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai',
      model: 'gemini-2.5-flash'
    });
  }
  if (groqKey && groqKey !== 'your_groq_api_key') {
    configs.push({
      provider: 'groq',
      apiKey: groqKey,
      baseUrl: 'https://api.groq.com/openai/v1',
      model: 'llama-3.3-70b-versatile'
    });
  }
  return configs;
}

async function callLlm(systemPrompt: string, userPrompt: string): Promise<string> {
  const configs = getLlmConfigs();
  if (configs.length === 0) {
    throw new Error('No LLM credentials found');
  }

  let lastError: any = null;
  for (const config of configs) {
    try {
      const response = await fetch(`${config.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${config.apiKey}`
        },
        body: JSON.stringify({
          model: config.model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ],
          temperature: 0.1,
          response_format: { type: 'json_object' }
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`LLM Error (${config.provider}): ${errorText}`);
      }

      const json = await response.json();
      return json.choices[0].message.content;
    } catch (err: any) {
      console.warn(`Provider ${config.provider} failed: ${err.message}. Trying next provider...`);
      lastError = err;
    }
  }

  throw new Error(`All LLM providers failed. Last error: ${lastError?.message}`);
}

const intakeNode = async (state: AgentStateType) => {
  const richQuery = `${state.symptoms} ${state.associated_symptoms || ''} ${state.triggers || ''}`.trim();
  const matchedGuidelines = await retrieveGuidelines(richQuery);
  
  return {
    guidelines: matchedGuidelines
  };
};

const reasoningNode = async (state: AgentStateType) => {
  const configs = getLlmConfigs();
  
  if (configs.length === 0) {
    const diagnosis: { condition: string; reason: string; treatment: string; medications: string[] }[] = [];
    let triageLevel = 'Self-Care';
    let urgentAttention = false;

    if (state.guidelines.length > 0) {
      state.guidelines.forEach(g => {
        diagnosis.push({
          condition: g.condition,
          reason: `${g.description} Matches reported symptoms.`,
          treatment: `Self-care notes: ${g.description}`,
          medications: g.suggestedMeds
        });
        if (g.triageLevel === 'Emergency') {
          triageLevel = 'Emergency';
          urgentAttention = true;
        } else if (g.triageLevel === 'Urgent' && triageLevel !== 'Emergency') {
          triageLevel = 'Urgent';
        } else if (g.triageLevel === 'Primary Care' && triageLevel === 'Self-Care') {
          triageLevel = 'Primary Care';
        }
      });
    } else {
      diagnosis.push({
        condition: 'General Symptom Discomfort',
        reason: 'Symptom matching did not map to specific guidelines.',
        treatment: 'Advise rest, fluid hydration, and monitoring symptoms.',
        medications: ['Rest & Hydration']
      });
    }

    return {
      diagnosis,
      triage_level: triageLevel,
      urgent_attention: urgentAttention
    };
  }

  const guidelinesContext = state.guidelines.map(g => 
    `Condition: ${g.condition}\nSuggested Meds: ${g.suggestedMeds.join(', ')}\nTriage Level: ${g.triageLevel}\nDescription: ${g.description}`
  ).join('\n\n');

  const systemPrompt = `You are a professional medical reasoning agent. Based on the retrieved clinical guidelines, output a valid JSON object matching the schema below. Make sure to populate the "treatment" and "medications" fields for each condition detailing standard OTC medicines and resting guidelines from the context. Also, generate 3 highly specific conversational follow-up questions that the patient can ask a chat assistant about their matched conditions (e.g. detailed triggers, medication interactions, or specific warning signs to look out for).
  
  {
    "diagnosis": [
      { 
        "condition": "Condition Name", 
        "reason": "Explanation grounding this in guidelines",
        "treatment": "Recommended care and resting guidelines.",
        "medications": ["MedName1", "MedName2"]
      }
    ],
    "suggested_medications": ["MedName1", "MedName2"],
    "triage_level": "Emergency" | "Urgent" | "Primary Care" | "Self-Care",
    "urgent_attention": true | false,
    "follow_ups": [
      "Question 1?",
      "Question 2?",
      "Question 3?"
    ]
  }`;

  const userPrompt = `Patient Primary Symptom: "${state.symptoms}"
  Associated Symptoms: "${state.associated_symptoms}"
  Duration: "${state.duration}"
  Severity: "${state.severity}"
  Triggers/Relieving Factors: "${state.triggers}"
  Lifestyle/Environmental Exposure: "${state.lifestyle}"
  Additional Stated Context: "${state.context}"

  Retrieved Guidelines Reference Context:
  ${guidelinesContext}`;

  try {
    const responseText = await callLlm(systemPrompt, userPrompt);
    const result = JSON.parse(responseText);

    return {
      diagnosis: result.diagnosis || [],
      triage_level: result.triage_level || 'Self-Care',
      urgent_attention: !!result.urgent_attention,
      follow_ups: result.follow_ups || [
        "what are common triggers I should avoid?",
        "when should I seek emergency care for these symptoms?",
        "are there standard OTC medications recommended?"
      ]
    };
  } catch (err: any) {
    console.error('LLM Reasoning Node error, falling back:', err.message);
    return {
      diagnosis: [{ 
        condition: 'LLM is not responding', 
        reason: 'LLM failed to respond. Please schedule a human medical review.',
        treatment: 'Please rest and speak to a healthcare provider.'
      }],
      triage_level: 'Primary Care',
      urgent_attention: false,
      follow_ups: [
        "what warning signs should I watch out for?",
        "who is the best healthcare professional to consult?",
        "how can I safely manage my symptoms at home?"
      ]
    };
  }
};

const safetyNode = async (state: AgentStateType) => {
  const warnings: string[] = [];
  const allergies = state.profile.allergies.map(a => a.toLowerCase());
  const activeMeds = state.profile.active_medications.map(m => m.toLowerCase());

  const suggestedMedicines: string[] = [];
  state.guidelines.forEach(g => {
    g.suggestedMeds.forEach(med => {
      suggestedMedicines.push(med.toLowerCase());
    });
  });

  suggestedMedicines.forEach(med => {
    allergies.forEach(allergen => {
      if (med.includes(allergen) || allergen.includes(med)) {
        warnings.push(`Medication warning: Patient lists allergy to '${allergen}', conflicting with suggested treatment '${med}'.`);
      }
    });
  });

  if (activeMeds.includes('aspirin') && suggestedMedicines.includes('ibuprofen')) {
    warnings.push(`Interaction warning: Active use of 'Aspirin' combined with suggested 'Ibuprofen' increases bleeding risks.`);
  }

  try {
    for (const med of suggestedMedicines) {
      for (const active of activeMeds) {
        const res = await fetch(`https://rxnav.nlm.nih.gov/REST/interaction/list.json?rxcuis=207106+1191`, {
          signal: AbortSignal.timeout(1500)
        });
        if (res.ok) {
        }
      }
    }
  } catch {
  }

  return {
    drug_warnings: warnings
  };
};

const buildWorkflow = () => {
  const workflow = new StateGraph(AgentStateAnnotation)
    .addNode('intake', intakeNode)
    .addNode('reasoning', reasoningNode)
    .addNode('safety', safetyNode)
    .addEdge('__start__', 'intake')
    .addEdge('intake', 'reasoning')
    .addEdge('reasoning', 'safety')
    .addEdge('safety', '__end__');

  return workflow.compile();
};

export async function POST(req: Request) {
  try {
    const { symptoms, associated_symptoms, duration, severity, triggers, lifestyle, context, profile } = await req.json();

    if (!symptoms) {
      return NextResponse.json({ error: 'Symptoms are required' }, { status: 400 });
    }

    const appGraph = buildWorkflow();
    const result = await appGraph.invoke({
      symptoms,
      associated_symptoms: associated_symptoms || '',
      duration,
      severity,
      triggers: triggers || '',
      lifestyle: lifestyle || '',
      context: context || '',
      profile: {
        allergies: profile?.allergies || [],
        active_medications: profile?.active_medications || [],
        age: profile?.age || 30,
        gender: profile?.gender || 'Male'
      },
      guidelines: [],
      diagnosis: [],
      drug_warnings: [],
      triage_level: 'Self-Care',
      urgent_attention: false,
      follow_ups: []
    });

    return NextResponse.json({
      diagnosis: result.diagnosis,
      triage_level: result.triage_level,
      urgent_attention: result.urgent_attention,
      drug_warnings: result.drug_warnings,
      follow_ups: result.follow_ups || []
    });

  } catch (error: any) {
    console.error('Agent Engine endpoint error:', error);
    return NextResponse.json({ error: error.message || 'Internal Triage Engine Error' }, { status: 500 });
  }
}
